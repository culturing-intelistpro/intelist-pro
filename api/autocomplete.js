// Server-only key — never prefixed with VITE_, so Vite never inlines it into the client bundle.
const GOOGLE_PLACES_URL = 'https://places.googleapis.com/v1/places:autocomplete'
const MAX_INPUT_LENGTH = 200

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { input } = req.body || {}
  if (typeof input !== 'string' || !input.trim() || input.length > MAX_INPUT_LENGTH) {
    return res.status(400).json({ error: 'Invalid input' })
  }

  try {
    const googleRes = await fetch(GOOGLE_PLACES_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': process.env.GOOGLE_MAPS_API_KEY,
        'X-Goog-FieldMask': 'suggestions.placePrediction.text',
      },
      body: JSON.stringify({ input, includedRegionCodes: ['us'], languageCode: 'en' }),
    })
    const data = await googleRes.json()
    return res.status(googleRes.status).json(data)
  } catch (err) {
    console.error('[api/autocomplete] Google Places error:', err)
    return res.status(502).json({ error: 'Upstream error', debug: `${err.name}: ${err.message}` })
  }
}
