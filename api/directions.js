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

// Strip all HTML, including small-print sub-notes Google embeds right after the
// main instruction (toll/restricted-road labels, "Destination will be on the
// right"). Sub-notes are dropped here — the destination side is pulled out
// separately by destinationSideFromHtml() before this runs.
function plainInstruction(html) {
  return html
    .replace(/<div[^>]*>[\s\S]*?<\/div>/gi, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s*\/\s*/g, '/')
    .trim()
}

function destinationSideFromHtml(html) {
  const m = html.match(/<div[^>]*>\s*Destination will be on the (left|right)/i)
  return m ? m[1].toLowerCase() : null
}

// Street-type abbreviations for compact agent-style shorthand.
const STREET_ABBREVIATIONS = [
  [/\bBoulevard\b/gi, 'Blvd'],
  [/\bStreet\b/gi,    'St'],
  [/\bAvenue\b/gi,    'Ave'],
  [/\bDrive\b/gi,     'Dr'],
  [/\bRoad\b/gi,      'Rd'],
  [/\bParkway\b/gi,   'Pkwy'],
  [/\bSquare\b/gi,    'Sq'],
  [/\bCourt\b/gi,     'Ct'],
  [/\bLane\b/gi,      'Ln'],
  [/\bPlace\b/gi,     'Pl'],
  [/\bTerrace\b/gi,   'Ter'],
]

function abbreviateStreetType(name) {
  return STREET_ABBREVIATIONS.reduce((s, [re, abbr]) => s.replace(re, abbr), name)
}

// Google lists slash-separated aliases from most-general to most-local, e.g.
// "State Rte 6220 N/Algonkian Pkwy" — the local street name is always last.
function extractRoadName(raw) {
  const parts = raw.split('/').map((p) => p.trim()).filter(Boolean)
  const name = (parts[parts.length - 1] || raw).replace(/\.$/, '').trim()
  return abbreviateStreetType(name)
}

// A bare numbered route with no proper street name ("VA-286 N", "State Rte
// 6220") is a transient ramp/connector inside an interchange, not something an
// agent would call out in quick directions — only named streets survive.
const BARE_ROUTE_RE = /^(?:VA|US|I)-?\d+\s*[NSEW]{0,2}$|^State Rte\.?\s*\d+\s*[NSEW]{0,2}$/i

function isBareRoute(name) {
  return BARE_ROUTE_RE.test(name)
}

// Convert Google's step-by-step instructions into MLS-agent shorthand:
// "From VA-7 (Leesburg Pike), R on Algonkian Pkwy, L on Dunkirk Sq, home on right."
// Only explicit "Turn left/right onto X" steps become turns — Head/Continue/
// Keep-to-stay-on/ramp-only maneuvers are connective tissue an agent skips.
function formatMlsDirections(steps, originLabel) {
  const turns = []
  let destinationSide = null

  for (const step of steps) {
    const html = step.html_instructions || ''

    const side = destinationSideFromHtml(html)
    if (side) destinationSide = side

    const text = plainInstruction(html)
    const turnMatch = text.match(/^Turn (right|left) onto (?:the ramp (?:to|onto) )?(.+)$/i)
    if (!turnMatch) continue

    const [, dir, rawRoad] = turnMatch
    const road = extractRoadName(rawRoad)
    if (isBareRoute(road)) continue // transient connector, not a real turn to call out

    turns.push(`${dir[0].toUpperCase()} on ${road}`)
  }

  const tokens = [...turns]
  if (destinationSide) tokens.push(`home on ${destinationSide}`)

  return `From ${originLabel}, ${tokens.join(', ')}.`
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
