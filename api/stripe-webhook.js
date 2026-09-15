// api/stripe-webhook.js — handle Stripe subscription lifecycle events
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Vercel: disable body parsing so we get the raw body for signature verification
export const config = { api: { bodyParser: false } }

function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (chunk) => chunks.push(chunk))
    req.on('end',  ()      => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const sig     = req.headers['stripe-signature']
  const rawBody = await getRawBody(req)

  let event
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('[Stripe Webhook] Signature verification failed:', err.message)
    return res.status(400).json({ error: `Webhook error: ${err.message}` })
  }

  const obj = event.data.object

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const userId = obj.metadata?.user_id
        if (!userId) break
        await supabase.from('subscriptions').upsert(
          {
            user_id:                userId,
            stripe_customer_id:     typeof obj.customer === 'string' ? obj.customer : obj.customer?.id,
            stripe_subscription_id: obj.id,
            stripe_price_id:        obj.items?.data?.[0]?.price?.id ?? null,
            status:                 obj.status,
            current_period_end:     new Date(obj.current_period_end * 1000).toISOString(),
            updated_at:             new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        )
        break
      }

      case 'customer.subscription.deleted': {
        const userId = obj.metadata?.user_id
        if (!userId) break
        await supabase.from('subscriptions')
          .update({ status: 'canceled', updated_at: new Date().toISOString() })
          .eq('user_id', userId)
        break
      }

      case 'invoice.payment_failed': {
        const customerId = typeof obj.customer === 'string' ? obj.customer : obj.customer?.id
        if (!customerId) break
        await supabase.from('subscriptions')
          .update({ status: 'past_due', updated_at: new Date().toISOString() })
          .eq('stripe_customer_id', customerId)
        break
      }

      case 'customer.subscription.paused': {
        const userId = obj.metadata?.user_id
        if (!userId) break
        await supabase.from('subscriptions')
          .update({ status: 'paused', updated_at: new Date().toISOString() })
          .eq('user_id', userId)
        break
      }

      default:
        break
    }
  } catch (err) {
    console.error('[Stripe Webhook] DB update error:', err)
    // Return 200 anyway so Stripe doesn't retry — handle manually
  }

  return res.status(200).json({ received: true })
}
