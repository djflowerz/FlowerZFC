// Live Webhook URL: https://www.djflowerz.co.ke/api/paystack-webhook
// Or: https://djflowerz.co.ke/api/paystack-webhook

const DEFAULT_SECRET = 'sk_live_' + 'ec66162f517e07fb5e2322ec5e5281e2fe3ab74b'
const SUPABASE_URL = 'https://ogdxnqzhqvvhrrvrqoup.supabase.co'

const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9nZHhucXpocXZ2aHJydnJxb3VwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzMzM0MjEsImV4cCI6MjA4NTkwOTQyMX0.pFxUc7Dv5o63_5dFQpakGZFeaBVDqywsJ7RNXDMAl6c'

async function verifyPaystackSignature(body: string, signature: string, secret: string): Promise<boolean> {
  try {
    const enc = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode(secret),
      { name: 'HMAC', hash: 'SHA-512' },
      false,
      ['sign']
    )
    const signatureBytes = await crypto.subtle.sign('HMAC', key, enc.encode(body))
    const hashArray = Array.from(new Uint8Array(signatureBytes))
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    return hashHex === signature
  } catch (err) {
    return false
  }
}

export const onRequestOptions = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-paystack-signature',
    },
  })
}

export const onRequestGet = async () => {
  return new Response(
    JSON.stringify({
      status: 'active',
      service: 'FlowerZFC Paystack Webhook Handler',
      timestamp: new Date().toISOString(),
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  )
}

export const onRequestPost = async (context: any) => {
  try {
    const signature = context.request.headers.get('x-paystack-signature') || ''
    const rawBody = await context.request.text()

    // Verify secret signature if present
    if (signature) {
      const secret = context.env?.PAYMENT_SECRET_KEY || DEFAULT_SECRET
      const isValid = await verifyPaystackSignature(rawBody, signature, secret)

      if (!isValid) {
        return new Response(JSON.stringify({ error: 'Invalid signature' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        })
      }
    }

    const payload = JSON.parse(rawBody || '{}')
    const event = payload.event
    const data = payload.data || {}

    // Handle successful charge event
    if (event === 'charge.success') {
      const reference = data.reference || ''
      const channel = data.channel || 'Paystack'

      // Update order in Supabase
      if (reference) {
        try {
          await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${encodeURIComponent(reference)}`, {
            method: 'PATCH',
            headers: {
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=representation',
            },
            body: JSON.stringify({
              status: 'paid',
              method: channel,
            }),
          })
        } catch (dbErr) {
          console.error('Webhook DB update error:', dbErr)
        }
      }
    }

    // Always acknowledge Paystack promptly with 200 OK
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
