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

    const { org_id, budget_type, amount = 1 } = await req.json()

    if (!org_id || !budget_type) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: org_id, budget_type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get budget
    const { data: budget } = await supabase
      .from('budgets')
      .select('*')
      .eq('org_id', org_id)
      .eq('budget_type', budget_type)
      .single()

    if (!budget) {
      // No budget set - allow operation
      return new Response(
        JSON.stringify({ 
          allowed: true, 
          message: 'No budget configured for this operation type',
          budget: null
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (budget.is_frozen) {
      return new Response(
        JSON.stringify({ 
          allowed: false, 
          message: 'Budget is frozen',
          budget: {
            type: budget.budget_type,
            limit: budget.limit_amount,
            consumed: budget.consumed_amount,
            remaining: 0,
            percentage: 100,
            is_frozen: true,
          }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const remaining = budget.limit_amount - budget.consumed_amount
    const wouldExceed = budget.consumed_amount + amount > budget.limit_amount
    const percentage = Math.round((budget.consumed_amount / budget.limit_amount) * 100)

    return new Response(
      JSON.stringify({ 
        allowed: !wouldExceed,
        message: wouldExceed 
          ? `Operation would exceed budget (${remaining} remaining, ${amount} requested)`
          : 'Budget check passed',
        budget: {
          type: budget.budget_type,
          limit: budget.limit_amount,
          consumed: budget.consumed_amount,
          remaining,
          percentage,
          is_frozen: budget.is_frozen,
          reset_at: budget.reset_at,
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Budget check error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
