import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-shopify-hmac-sha256, x-etsy-hmac-sha256, x-printify-hmac-sha256, x-gumroad-signature',
}

// Signature verification for different platforms
async function verifyShopifySignature(body: string, signature: string, secret: string): Promise<boolean> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const mac = await crypto.subtle.sign('HMAC', key, encoder.encode(body))
  const computed = btoa(String.fromCharCode(...new Uint8Array(mac)))
  return computed === signature
}

async function verifyEtsySignature(body: string, signature: string, secret: string): Promise<boolean> {
  return verifyShopifySignature(body, signature, secret) // Same HMAC-SHA256 pattern
}

async function verifyPrintifySignature(body: string, signature: string, secret: string): Promise<boolean> {
  return verifyShopifySignature(body, signature, secret)
}

async function verifyGumroadSignature(body: string, signature: string, secret: string): Promise<boolean> {
  // Gumroad uses a simple hash comparison
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const mac = await crypto.subtle.sign('HMAC', key, encoder.encode(body))
  const computed = Array.from(new Uint8Array(mac)).map(b => b.toString(16).padStart(2, '0')).join('')
  return computed === signature
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const url = new URL(req.url)
    const platform = url.searchParams.get('platform')
    const orgId = url.searchParams.get('org_id')

    if (!platform || !orgId) {
      return new Response(
        JSON.stringify({ error: 'Missing platform or org_id parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body = await req.text()
    let payload: Record<string, unknown>
    
    try {
      payload = JSON.parse(body)
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Extract signature from headers based on platform
    let signature: string | null = null
    let isVerified = false
    
    switch (platform) {
      case 'shopify':
        signature = req.headers.get('x-shopify-hmac-sha256')
        break
      case 'etsy':
        signature = req.headers.get('x-etsy-hmac-sha256')
        break
      case 'printify':
        signature = req.headers.get('x-printify-hmac-sha256')
        break
      case 'gumroad':
        signature = req.headers.get('x-gumroad-signature')
        break
    }

    // Get webhook secret from store credentials
    const { data: store } = await supabase
      .from('stores')
      .select('credentials')
      .eq('org_id', orgId)
      .eq('platform', platform)
      .eq('is_active', true)
      .single()

    if (store?.credentials) {
      const credentials = store.credentials as Record<string, string>
      const webhookSecret = credentials.webhook_secret

      if (webhookSecret && signature) {
        switch (platform) {
          case 'shopify':
            isVerified = await verifyShopifySignature(body, signature, webhookSecret)
            break
          case 'etsy':
            isVerified = await verifyEtsySignature(body, signature, webhookSecret)
            break
          case 'printify':
            isVerified = await verifyPrintifySignature(body, signature, webhookSecret)
            break
          case 'gumroad':
            isVerified = await verifyGumroadSignature(body, signature, webhookSecret)
            break
        }
      }
    }

    // Generate event ID for replay protection
    const eventId = (payload as any).id || 
                   (payload as any).event_id || 
                   `${platform}_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`
    
    const eventType = (payload as any).type || 
                     (payload as any).event || 
                     (payload as any).topic || 
                     'unknown'

    // Check for replay (idempotency)
    const { data: existing } = await supabase
      .from('webhook_events')
      .select('id')
      .eq('event_id', eventId)
      .eq('org_id', orgId)
      .maybeSingle()

    if (existing) {
      return new Response(
        JSON.stringify({ message: 'Event already processed', event_id: eventId }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get plugin_id for this platform
    const { data: plugin } = await supabase
      .from('plugins')
      .select('id')
      .eq('slug', platform)
      .single()

    // Insert webhook event
    const { data: webhookEvent, error: insertError } = await supabase
      .from('webhook_events')
      .insert({
        org_id: orgId,
        plugin_id: plugin?.id,
        event_id: eventId,
        event_type: eventType,
        payload,
        signature,
        is_verified: isVerified,
        is_processed: false,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Failed to insert webhook event:', insertError)
      return new Response(
        JSON.stringify({ error: 'Failed to store webhook event' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Enqueue processing job
    const idempotencyKey = `webhook_process_${eventId}`
    await supabase.from('jobs').insert({
      org_id: orgId,
      idempotency_key: idempotencyKey,
      job_type: `webhook_${platform}_${eventType}`,
      payload: { webhook_event_id: webhookEvent.id, event_type: eventType },
      priority: 5,
    })

    // Log to audit
    await supabase.from('audit_logs').insert({
      org_id: orgId,
      action: 'webhook.received',
      entity_type: 'webhook_event',
      entity_id: webhookEvent.id,
      metadata: { platform, event_type: eventType, is_verified: isVerified },
      soc2_tags: ['availability'],
    })

    return new Response(
      JSON.stringify({ 
        success: true, 
        event_id: eventId,
        is_verified: isVerified,
        webhook_event_id: webhookEvent.id,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Webhook ingestion error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
