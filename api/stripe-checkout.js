// api/stripe-checkout.js — create a Stripe Checkout session for monthly subscription
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

const SITE_URL = process.env.SITE_URL || 'https://intelist.pro'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { userId, email } = req.body ?? {}
  if (!userId || !email) {
    return res.status(400).json({ error: 'userId and email required' })
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: email,
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID, // set in Vercel env vars
          quantity: 1,
        },
      ],
      success_url: `${SITE_URL}/?payment=success`,
      cancel_url:  `${SITE_URL}/`,
      metadata: { user_id: userId },
      subscription_data: {
        metadata: { user_id: userId },
      },
      allow_promotion_codes: true,
    })

    return res.status(200).json({ url: session.url })
  } catch (err) {
    console.error('[Stripe Checkout] Error:', err)
    return res.status(500).json({ error: 'Failed to create checkout session' })
  }
}
