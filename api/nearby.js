// Server-only key — never prefixed with VITE_, so Vite never inlines it into the client bundle.
const GEOCODE_URL      = 'https://maps.googleapis.com/maps/api/geocode/json'
const MATRIX_URL       = 'https://maps.googleapis.com/maps/api/distancematrix/json'
const TEXT_SEARCH_URL  = 'https://places.googleapis.com/v1/places:searchText'
const MAX_ADDRESS_LENGTH = 200
const MAX_DESTINATIONS_PER_REQUEST = 25 // Google Distance Matrix API limit
const WALK_MAX_METERS = 804.672 // 0.5 mi

// Coordinates were pre-geocoded once (not re-geocoded per request) — these are
// fixed landmarks, so re-resolving them on every listing would just burn quota.
const CATEGORIES = {
  airports: { label: 'Airports', thresholdMin: 30, places: [
    { name: 'Dulles International Airport', lat: 38.95225, lng: -77.45789 },
    { name: 'Reagan National Airport', lat: 38.85011, lng: -77.03918 },
  ] },
  metro: { label: 'Metro', thresholdMin: 15, places: [
    { name: 'Ashburn', lat: 39.00436, lng: -77.48959, line: 'Silver' },
    { name: 'Loudoun Gateway', lat: 38.99326, lng: -77.4603, line: 'Silver' },
    { name: 'Dulles', lat: 38.95225, lng: -77.45789, line: 'Silver' },
    { name: 'Reston Town Center', lat: 38.9536, lng: -77.3598, line: 'Silver' },
    { name: 'Wiehle-Reston East', lat: 38.9467, lng: -77.33945, line: 'Silver' },
    { name: 'Spring Hill', lat: 38.92822, lng: -77.24172, line: 'Silver' },
    { name: 'Greensboro', lat: 38.92075, lng: -77.23365, line: 'Silver' },
    { name: 'Tysons', lat: 38.92104, lng: -77.22213, line: 'Silver' },
    { name: 'Vienna', lat: 38.87836, lng: -77.27181, line: 'Orange' },
    { name: 'Dunn Loring', lat: 38.88176, lng: -77.23086, line: 'Orange' },
    { name: 'West Falls Church', lat: 38.90082, lng: -77.18892, line: 'Orange' },
    { name: 'East Falls Church', lat: 38.88733, lng: -77.15442, line: 'Orange' },
    { name: 'Franconia-Springfield', lat: 38.76641, lng: -77.16826, line: 'Blue' },
    { name: 'Van Dorn', lat: 38.79929, lng: -77.12929, line: 'Blue' },
    { name: 'King Street', lat: 38.80717, lng: -77.06009, line: 'Blue' },
  ] },
  employment: { label: 'Employment & Downtown', thresholdMin: 30, places: [
    { name: 'DC Downtown', lat: 38.90729, lng: -77.03693 },
    { name: 'Tysons Corner', lat: 38.91872, lng: -77.23109 },
    { name: 'Reston Town Center', lat: 38.95891, lng: -77.36146 },
    { name: 'Amazon HQ2 (Arlington)', lat: 38.85829, lng: -77.04937 },
  ] },
  parks: { label: 'Parks & Trails', thresholdMin: 15, places: [
    { name: 'W&OD Trail', lat: 38.90109, lng: -77.25944 },
    { name: 'Bull Run Occoquan Trail', lat: 38.72521, lng: -77.33095 },
    { name: 'Algonkian Regional Park', lat: 39.05896, lng: -77.37505 },
    { name: 'Bull Run Regional Park', lat: 38.80171, lng: -77.49154 },
    { name: 'Lake Fairfax Park', lat: 38.96167, lng: -77.31803 },
    { name: 'Meadowlark Botanical Gardens', lat: 38.93803, lng: -77.28193 },
    { name: 'Occoquan Regional Park', lat: 38.69329, lng: -77.25576 },
    { name: 'Pohick Bay Regional Park', lat: 38.67181, lng: -77.16904 },
    { name: 'Fountainhead Regional Park', lat: 38.72462, lng: -77.3301 },
    { name: 'Hemlock Overlook Regional Park', lat: 38.77019, lng: -77.40962 },
    { name: 'Riverbend Park', lat: 39.01771, lng: -77.25629 },
    { name: 'Scotts Run Nature Preserve', lat: 38.96127, lng: -77.19898 },
    { name: 'Wolf Trap National Park', lat: 38.93837, lng: -77.2647 },
    { name: 'Great Falls Park', lat: 38.99519, lng: -77.25541 },
  ] },
}

// Malls/town centers only make the Shopping category if genuinely walkable
// (see WALK_MAX_METERS below) — otherwise they're just noise next to the
// priority grocery/retail chains.
const MALL_PLACES = [
  { name: 'Tysons Corner', lat: 38.91702, lng: -77.22284 },
  { name: 'Reston Town Center', lat: 38.95891, lng: -77.36146 },
  { name: 'Dulles Town Center', lat: 39.03237, lng: -77.42394 },
  { name: 'One Loudoun', lat: 39.05285, lng: -77.45586 },
  { name: 'Fair Oaks Mall', lat: 38.86469, lng: -77.35746 },
  { name: 'Mosaic District', lat: 38.87278, lng: -77.22943 },
  { name: 'Springfield Town Center', lat: 38.7748, lng: -77.17521 },
  { name: 'Leesburg Premium Outlets', lat: 39.10555, lng: -77.53913 },
  { name: 'Pentagon City Mall', lat: 38.86323, lng: -77.06094 },
  { name: 'Old Town Alexandria', lat: 38.80672, lng: -77.04205 },
]

// Priority grocery/retail chains for the Shopping category — unlike other
// categories, these have many branches, so there's no fixed coordinate per
// chain. `query` is what's sent to Places Text Search; `variants` are the
// exact (lowercased) display names that count as the real store — Places
// Text Search also returns sub-departments at the same address (pharmacy,
// bakery, deli, floral, gas station, optical, etc.) that must be filtered out.
const SHOPPING_CHAINS = [
  // Premium / natural
  { name: 'Whole Foods',         query: 'Whole Foods Market',       variants: ['whole foods market'] },
  { name: 'Wegmans',             query: 'Wegmans',                  variants: ['wegmans'] },
  { name: "Trader Joe's",        query: "Trader Joe's",             variants: ["trader joe's", 'trader joes'] },
  // Traditional grocery
  { name: 'Harris Teeter',       query: 'Harris Teeter',            variants: ['harris teeter'] },
  { name: 'Safeway',             query: 'Safeway',                  variants: ['safeway'] },
  { name: 'Giant',               query: 'Giant Food',               variants: ['giant food', 'giant'] },
  { name: 'Food Lion',           query: 'Food Lion',                variants: ['food lion'] },
  { name: 'Kroger',              query: 'Kroger',                   variants: ['kroger'] },
  { name: 'Publix',              query: 'Publix',                   variants: ['publix'] },
  // Discount grocery
  { name: 'Aldi',                query: 'Aldi',                     variants: ['aldi'] },
  { name: 'Lidl',                query: 'Lidl',                     variants: ['lidl'] },
  // Asian grocery (well-known in NoVA)
  { name: 'Great Wall Supermarket', query: 'Great Wall Supermarket', variants: ['great wall supermarket'] },
  { name: '99 Ranch Market',      query: '99 Ranch Market',          variants: ['99 ranch market', '99ranch'] },
  { name: 'H Mart',              query: 'H Mart',                   variants: ['h mart', 'hmart'] },
  { name: 'Lotte Plaza Market',  query: 'Lotte Plaza Market',       variants: ['lotte plaza market', 'lotte plaza'] },
  // Warehouse / big box
  { name: 'Costco',              query: 'Costco Wholesale',         variants: ['costco wholesale', 'costco'] },
  { name: "BJ's Wholesale Club", query: "BJ's Wholesale Club",      variants: ["bj's wholesale club", 'bjs wholesale club'] },
  { name: "Sam's Club",          query: "Sam's Club",               variants: ["sam's club", 'sams club'] },
  { name: 'Walmart',             query: 'Walmart Supercenter',      variants: ['walmart supercenter', 'walmart'] },
  { name: 'Target',              query: 'Target',                   variants: ['target'] },
]

// Every place across the fixed-coordinate categories, in a fixed flat order —
// index into this array is how Distance Matrix results get mapped back.
// Shopping is excluded here — it's resolved dynamically per-request below.
const ALL_PLACES = Object.entries(CATEGORIES).flatMap(([categoryKey, cat]) =>
  cat.places.map((p) => ({ ...p, categoryKey }))
)

// For each priority chain, find the nearest real branch (by name, not just
// keyword match) near the property using Places Text Search, ranked by
// distance from the property. Best-effort per chain — one missing chain in a
// given area shouldn't fail the whole lookup.
async function findNearestChainBranches(lat, lng) {
  const bias = { circle: { center: { latitude: lat, longitude: lng }, radius: 40000 } } // ~25 mi
  const found = await Promise.all(SHOPPING_CHAINS.map(async (chain) => {
    try {
      const res = await fetch(TEXT_SEARCH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': process.env.GOOGLE_MAPS_API_KEY,
          'X-Goog-FieldMask': 'places.displayName,places.location',
        },
        body: JSON.stringify({ textQuery: chain.query, locationBias: bias, rankPreference: 'DISTANCE' }),
      })
      const data = await res.json()
      const match = (data.places || []).find((p) =>
        chain.variants.includes((p.displayName?.text || '').trim().toLowerCase())
      )
      if (!match) return null
      return { name: chain.name, lat: match.location.latitude, lng: match.location.longitude }
    } catch (err) {
      console.error(`[api/nearby] chain search failed for ${chain.name}:`, err)
      return null
    }
  }))
  return found.filter(Boolean)
}

function chunk(arr, size) {
  const out = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

// Epoch seconds for the next weekday (Mon–Fri) at `hour`:00 America/New_York time —
// used as departure_time so Distance Matrix returns a rush-hour traffic estimate.
function nextWeekdayRushHourEpoch(hour = 8) {
  const now = new Date()
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York', hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
  const p = Object.fromEntries(fmt.formatToParts(now).map((x) => [x.type, x.value]))
  // A UTC timestamp whose fields read the same as the current NY wall-clock time —
  // diffing it against the real "now" gives NY's current UTC offset (DST-aware).
  const nyWallAsUTC = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second)
  const offsetMs = nyWallAsUTC - now.getTime()

  const target = new Date(nyWallAsUTC)
  target.setUTCHours(hour, 0, 0, 0)
  if (target.getTime() <= nyWallAsUTC) target.setUTCDate(target.getUTCDate() + 1)
  while (target.getUTCDay() === 0 || target.getUTCDay() === 6) target.setUTCDate(target.getUTCDate() + 1)

  return Math.floor((target.getTime() - offsetMs) / 1000)
}

async function fetchDurations(originLat, originLng, places, departureTime, mode = 'driving') {
  if (!places.length) return []
  const results = new Array(places.length).fill(null)
  const batches = chunk(places, MAX_DESTINATIONS_PER_REQUEST)
  let offset = 0
  for (const batch of batches) {
    const destinations = batch.map((p) => `${p.lat},${p.lng}`).join('|')
    const params = new URLSearchParams({
      origins: `${originLat},${originLng}`,
      destinations,
      mode,
      units: 'imperial',
      key: process.env.GOOGLE_MAPS_API_KEY,
    })
    if (departureTime) {
      params.set('departure_time', String(departureTime))
      params.set('traffic_model', 'pessimistic')
    }
    const res = await fetch(`${MATRIX_URL}?${params.toString()}`)
    const data = await res.json()
    if (data.status !== 'OK' || !data.rows?.length) throw new Error(`Distance Matrix error: ${data.status}`)
    data.rows[0].elements.forEach((el, i) => { results[offset + i] = el })
    offset += batch.length
  }
  return results
}

function formatMinutes(seconds) {
  return Math.round(seconds / 60)
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

  try {
    // Step 1: Geocode the property address.
    const geoRes = await fetch(`${GEOCODE_URL}?address=${encodeURIComponent(address)}&key=${process.env.GOOGLE_MAPS_API_KEY}`)
    const geo = await geoRes.json()
    if (geo.status !== 'OK' || !geo.results?.length) {
      return res.status(422).json({ error: 'Address could not be geocoded' })
    }
    const { lat, lng } = geo.results[0].geometry.location

    // Step 2: Driving duration to every landmark, without traffic (normal) and
    // with traffic at next weekday 8am ET (rush hour) — used to decide inclusion
    // and to show both figures. In parallel: find the nearest branch of each
    // priority shopping chain, and check walking distance to the malls/town
    // centers (Shopping is resolved separately below, not through `computed`).
    const rushDepartureTime = nextWeekdayRushHourEpoch(8)
    const [normalEls, rushEls, chainBranches, mallWalkEls] = await Promise.all([
      fetchDurations(lat, lng, ALL_PLACES, null),
      fetchDurations(lat, lng, ALL_PLACES, rushDepartureTime),
      findNearestChainBranches(lat, lng).catch((err) => {
        console.error('[api/nearby] chain branch lookup failed:', err)
        return []
      }),
      fetchDurations(lat, lng, MALL_PLACES, null, 'walking').catch((err) => {
        console.error('[api/nearby] mall walk-distance lookup failed:', err)
        return []
      }),
    ])
    const chainEls = await fetchDurations(lat, lng, chainBranches, null).catch((err) => {
      console.error('[api/nearby] chain distance lookup failed:', err)
      return []
    })

    const computed = ALL_PLACES.map((place, i) => {
      const normalEl = normalEls[i]
      const rushEl   = rushEls[i]
      if (!normalEl || normalEl.status !== 'OK') return null
      const normalMin = formatMinutes(normalEl.duration.value)
      const rushMin    = (rushEl && rushEl.status === 'OK')
        ? formatMinutes(rushEl.duration_in_traffic?.value ?? rushEl.duration.value)
        : normalMin
      return { ...place, normalMin, rushMin }
    }).filter(Boolean)

    // Step 3: Filter by category threshold (on normal time) and format for display.
    // Airports and Metro always show at least the single nearest option, even if it
    // falls outside the normal threshold — every listing should surface "nearest
    // Metro station" and "drive time to the nearest airport" rather than showing
    // nothing when the closest one happens to be a few minutes over the cutoff.
    const ALWAYS_SHOW_NEAREST = new Set(['airports', 'metro'])
    const result = {}
    for (const [categoryKey, cat] of Object.entries(CATEGORIES)) {
      const byCategory = computed
        .filter((p) => p.categoryKey === categoryKey)
        .sort((a, b) => a.normalMin - b.normalMin)

      let inRange = byCategory.filter((p) => p.normalMin <= cat.thresholdMin)
      let isFallback = false
      if (!inRange.length && ALWAYS_SHOW_NEAREST.has(categoryKey) && byCategory.length) {
        inRange = [byCategory[0]]
        isFallback = true
      }

      if (!inRange.length) continue

      result[categoryKey] = {
        label: cat.label,
        items: inRange.map((p) => {
          if (categoryKey === 'metro') {
            // Fallback (beyond the normal 15-min threshold): state the real drive
            // time rather than "Minutes to"/"Convenient to", which imply proximity.
            if (isFallback) return `Nearest Metro — ${p.name} (${p.normalMin} min drive)`
            return p.normalMin <= 10
              ? `Minutes to ${p.name} Metro`
              : `Convenient to ${p.name} Metro`
          }
          return `${p.name} — ${p.normalMin} min (rush hour: ${p.rushMin} min)`
        }),
      }
    }

    // Step 4: Shopping — top 3 nearest priority chains by driving distance,
    // plus any mall/town center that's genuinely within a 0.5 mi walk.
    const chainResults = chainBranches
      .map((branch, i) => {
        const el = chainEls[i]
        if (!el || el.status !== 'OK') return null
        return { name: branch.name, distanceMeters: el.distance.value, distanceText: el.distance.text, mins: formatMinutes(el.duration.value) }
      })
      .filter(Boolean)
      .sort((a, b) => a.distanceMeters - b.distanceMeters)
      .slice(0, 5)

    const walkableMalls = MALL_PLACES
      .map((mall, i) => {
        const el = mallWalkEls[i]
        if (!el || el.status !== 'OK' || el.distance.value > WALK_MAX_METERS) return null
        return { name: mall.name, distanceText: el.distance.text, mins: formatMinutes(el.duration.value) }
      })
      .filter(Boolean)

    const shoppingItems = [...chainResults, ...walkableMalls]
      .map((p) => `${p.name} — ${p.distanceText} · ${p.mins} min`)

    if (shoppingItems.length) {
      result.shopping = { label: 'Shopping', items: shoppingItems }
    }

    // Reorder sections by priority: shopping → metro → employment → parks → airports
    const SECTION_ORDER = ['shopping', 'metro', 'employment', 'parks', 'airports']
    const ordered = {}
    for (const key of SECTION_ORDER) {
      if (result[key]) ordered[key] = result[key]
    }
    return res.status(200).json({ categories: ordered })
  } catch (err) {
    console.error('[api/nearby] error:', err)
    return res.status(502).json({ error: 'Upstream error', debug: `${err.name}: ${err.message}` })
  }
}
