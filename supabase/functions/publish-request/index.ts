import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    })

    const token = authHeader.replace('Bearer ', '')
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token)
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    const userId = claimsData.claims.sub

    const { org_id, product_ids, store_ids, action = 'publish' } = await req.json()

    if (!org_id || !product_ids?.length || !store_ids?.length) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: org_id, product_ids, store_ids' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify user has access to org
    const { data: hasAccess } = await supabase.rpc('has_org_access', { 
      org_id_param: org_id, 
      required_role: 'operator' 
    })

    if (!hasAccess) {
      return new Response(
        JSON.stringify({ error: 'Access denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get store details with plugin info
    const { data: stores } = await supabase
      .from('stores')
      .select('id, name, platform')
      .eq('org_id', org_id)
      .in('id', store_ids)

    // Check budget constraints
    const { data: budgets } = await supabase
      .from('budgets')
      .select('*')
      .eq('org_id', org_id)
      .eq('is_frozen', false)

    const publishBudget = budgets?.find(b => b.budget_type === 'publish_operations')
    if (publishBudget && publishBudget.consumed_amount >= publishBudget.limit_amount) {
      return new Response(
        JSON.stringify({ 
          error: 'Budget limit reached', 
          details: 'Publishing operations budget is exhausted. Wait for reset or increase limit.' 
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check for platform-specific constraints
    const platformChecks: Record<string, { requires_approval: boolean; reason?: string }> = {}
    
    for (const store of stores || []) {
      // Get plugin contracts for this platform
      const { data: plugin } = await supabase
        .from('plugins')
        .select('id, plugin_contracts(*)')
        .eq('slug', store.platform)
        .single()

      const contracts = plugin?.plugin_contracts || []
      const publishCapability = contracts.find((c: any) => c.capability === 'publish_product')

      if (!publishCapability || publishCapability.level === 'unsupported') {
        platformChecks[store.platform] = { 
          requires_approval: false, 
          reason: `Publishing not supported for ${store.platform}. Manual upload required.` 
        }
      } else if (publishCapability.level === 'workaround') {
        platformChecks[store.platform] = { 
          requires_approval: true, 
          reason: `${store.platform} requires manual verification before publishing` 
        }
      } else {
        platformChecks[store.platform] = { requires_approval: false }
      }
    }

    // Determine if approval is needed
    const requiresApproval = Object.values(platformChecks).some(p => p.requires_approval) ||
                            product_ids.length > 10 // Bulk operations need approval

    const serviceClient = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    if (requiresApproval) {
      // Create approval request
      const { data: approval, error: approvalError } = await serviceClient
        .from('approvals')
        .insert({
          org_id,
          entity_type: 'publish_batch',
          entity_id: crypto.randomUUID(),
          action,
          payload: {
            product_ids,
            store_ids,
            platform_checks: platformChecks,
            requested_by: userId,
          },
          requested_by: userId,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        })
        .select()
        .single()

      if (approvalError) {
        console.error('Failed to create approval:', approvalError)
        return new Response(
          JSON.stringify({ error: 'Failed to create approval request' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Log to audit
      await serviceClient.from('audit_logs').insert({
        org_id,
        user_id: userId,
        action: 'publish.approval_requested',
        entity_type: 'approval',
        entity_id: approval.id,
        metadata: { product_count: product_ids.length, store_count: store_ids.length },
        soc2_tags: ['change', 'processing_integrity'],
      })

      return new Response(
        JSON.stringify({
          status: 'pending_approval',
          approval_id: approval.id,
          message: 'Publishing request requires approval',
          platform_checks: platformChecks,
        }),
        { status: 202, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // No approval needed - enqueue jobs directly
    const jobs = []
    for (const productId of product_ids) {
      for (const storeId of store_ids) {
        const store = stores?.find(s => s.id === storeId)
        if (platformChecks[store?.platform || '']?.reason?.includes('not supported')) {
          continue // Skip unsupported platforms
        }

        jobs.push({
          org_id,
          idempotency_key: `publish_${productId}_${storeId}_${Date.now()}`,
          job_type: `publish_to_${store?.platform}`,
          payload: { product_id: productId, store_id: storeId, action },
          priority: 3,
        })
      }
    }

    if (jobs.length > 0) {
      await serviceClient.from('jobs').insert(jobs)

      // Update budget consumption
      if (publishBudget) {
        await serviceClient.from('budgets').update({
          consumed_amount: publishBudget.consumed_amount + jobs.length,
        }).eq('id', publishBudget.id)
      }
    }

    // Log to audit
    await serviceClient.from('audit_logs').insert({
      org_id,
      user_id: userId,
      action: 'publish.jobs_enqueued',
      entity_type: 'job_batch',
      metadata: { job_count: jobs.length, product_count: product_ids.length, store_count: store_ids.length },
      soc2_tags: ['change'],
    })

    return new Response(
      JSON.stringify({
        status: 'processing',
        jobs_created: jobs.length,
        message: `${jobs.length} publishing jobs enqueued`,
        platform_checks: platformChecks,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Publish request error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
