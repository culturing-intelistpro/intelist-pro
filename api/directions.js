// Server-only key — never prefixed with VITE_, so Vite never inlines it into the client bundle.
const GEOCODE_URL    = 'https://maps.googleapis.com/maps/api/geocode/json'
const DIRECTIONS_URL = 'https://maps.googleapis.com/maps/api/directions/json'
const MAX_ADDRESS_LENGTH = 200

// Primary commuter road per region — mirrors the regional groupings already used
// for MLS description tone in App.jsx (AXIS 1 / detectTier).
const MAJOR_ROAD_BY_REGION = [
  { pattern: /mclean|great falls/i,                                              road: 'I-495 (Capital Beltway)' },
  { pattern: /vienna|oakton/i,                                                   road: 'I-66' },
  { pattern: /reston|herndon/i,                                                  road: 'Dulles Toll Road (VA-267)' },
  { pattern: /fairfax|burke|centreville|chantilly/i,                             road: 'I-66' },
  { pattern: /arlington|alexandria|rosslyn|ballston|clarendon|pentagon city|del ?ray/i, road: 'I-395' },
  { pattern: /ashburn|leesburg|south riding|brambleton|aldie|broadlands|one loudoun|loudoun/i, road: 'VA-7 (Leesburg Pike)' },
  { pattern: /sterling|cascades|lowes island|potomac falls|countryside/i,        road: 'VA-7 (Leesburg Pike)' },
  { pattern: /springfield|lorton|annandale/i,                                    road: 'I-95' },
  { pattern: /gainesville|haymarket/i,                                           road: 'I-66' },
  { pattern: /woodbridge|dale city|lake ?ridge|manassas|bristow|nokesville/i,    road: 'I-95' },
  { pattern: /stafford|fredericksburg|triangle|dumfries/i,                       road: 'I-95' },
  { pattern: /falls church/i,                                                    road: 'I-66' },
]
const DEFAULT_ROAD = 'I-495 (Capital Beltway)'

function getMajorRoad(text) {
  const match = MAJOR_ROAD_BY_REGION.find(({ pattern }) => pattern.test(text))
  return match ? match.road : DEFAULT_ROAD
}

// Google's html_instructions often embed a small-print sub-note right after the
// main instruction with no separating whitespace, e.g.:
//   "...High Occupancy Toll<div style="font-size:0.9em">Toll road</div>"
//   "Turn left onto Tulip Poplar Ln<div style="font-size:0.9em">Destination will be on the right</div>"
// Naively stripping tags concatenates these into broken words ("TollToll road").
// Keep the actionable "Destination will be on the..." note as a trailing sentence;
// drop other sub-notes (toll/restricted-road labels) — they read as noise in prose.
function stripHtml(html) {
  const destMatch = html.match(/<div[^>]*>\s*(Destination[^<]*)<\/div>/i)
  let text = html.replace(/<div[^>]*>[\s\S]*?<\/div>/gi, '')
  text = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').replace(/\s*\/\s*/g, '/').trim()
  if (destMatch) text += `. ${destMatch[1].trim()}`
  return text
}

// Format raw Directions API steps into a single MLS-style "Directions" paragraph.
function formatMlsDirections(steps, originLabel) {
  const parts = steps.map((step) => {
    let instruction = stripHtml(step.html_instructions || '')
    if (!/[.!?]$/.test(instruction)) instruction += '.'
    return step.distance?.text ? `${instruction} (${step.distance.text})` : instruction
  })
  return `From ${originLabel}, ${parts.join(' ')}`
}

async function geocode(query, apiKey) {
  const url = `${GEOCODE_URL}?address=${encodeURIComponent(query)}&key=${apiKey}`
  const res = await fetch(url)
  const data = await res.json()
  if (data.status !== 'OK' || !data.results?.length) return null
  return data.results[0]
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { address } = req.body || {}
  if (typeof address !== 'string' || !address.trim() || address.length > MAX_ADDRESS_LENGTH) {
    return res.status(400).json({ error: 'Invalid address' })
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY

  try {
    // Step 1: Geocode the destination address.
    const destination = await geocode(address, apiKey)
    if (!destination) return res.status(422).json({ error: 'Address could not be geocoded' })

    const destLoc = destination.geometry.location
    const cityComponent = destination.address_components.find((c) => c.types.includes('locality'))
      || destination.address_components.find((c) => c.types.includes('administrative_area_level_3'))
    const stateComponent = destination.address_components.find((c) => c.types.includes('administrative_area_level_1'))
    const city  = cityComponent?.long_name  || ''
    const state = stateComponent?.short_name || 'VA'

    // Step 2: Pick the nearest major commuter road for this region, then geocode
    // a reference point where that road meets the property's town/city.
    const majorRoad  = getMajorRoad(`${city} ${address}`)
    const originQuery = `${majorRoad} near ${city || address}, ${state}`
    const origin = await geocode(originQuery, apiKey)
    if (!origin) return res.status(502).json({ error: 'Could not locate a reference road' })

    const originLoc = origin.geometry.location

    // Step 3: Driving directions from the major road to the property.
    const dirUrl = `${DIRECTIONS_URL}?origin=${originLoc.lat},${originLoc.lng}&destination=${destLoc.lat},${destLoc.lng}&mode=driving&key=${apiKey}`
    const dirRes = await fetch(dirUrl)
    const dir = await dirRes.json()
    if (dir.status !== 'OK' || !dir.routes?.length) {
      return res.status(502).json({ error: 'No driving route found', status: dir.status })
    }

    const leg = dir.routes[0].legs[0]
    const text = formatMlsDirections(leg.steps, majorRoad)

    return res.status(200).json({
      text,
      originLabel:          majorRoad,
      distance:             leg.distance?.text ?? null,
      duration:             leg.duration?.text ?? null,
      destinationFormatted: destination.formatted_address,
    })
  } catch (err) {
    console.error('[api/directions] error:', err)
    return res.status(502).json({ error: 'Upstream error', debug: `${err.name}: ${err.message}` })
  }
}
