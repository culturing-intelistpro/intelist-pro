// api/schools.js - Official county GIS boundary lookup

const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY

const LCPS_ES = {
  MSE:'Moorefield Station Elementary', CTY:'Countryside Elementary',
  HUT:'Hutchison Farm Elementary',     BUF:'Buffalo Trail Elementary',
  LIN:'Lincoln Elementary',            HLS:'Hillside Elementary',
  ALG:'Algonkian Elementary',          LIB:'Liberty Elementary',
  EME:'Emerick Elementary',            CSP:'Cool Spring Elementary',
  BAL:"Ball's Bluff Elementary",       CAT:'Catoctin Elementary',
  LEE:'Leesburg Elementary',           EVE:'Evergreen Mill Elementary',
  SEL:'Seldens Landing Elementary',    CED:'Cedar Lane Elementary',
  WAT:'Waterford Elementary',          HAM:'Hamilton Elementary',
  SYC:'Sycolin Creek Elementary',      PNB:'Pinebrook Elementary',
  ASH:'Ashburn Elementary',            TOL:'John W. Tolbert Jr. Elementary',
  ARC:'Arcola Elementary',             BAN:'Banneker Elementary',
  RHL:'Round Hill Elementary',         ALD:'Aldie Elementary',
  MIL:'Mill Run Elementary',           LIT:'Little River Elementary',
  MTV:'Mountain View Elementary',      BST:'Belmont Station Elementary',
  HRZ:'Horizon Elementary',            LOW:'Lowes Island Elementary',
  PMK:'Potowmack Elementary',          MEA:'Meadowland Elementary',
  DOM:'Dominion Trail Elementary',     SUG:'Sugarland Elementary',
  KWC:'Kenneth W. Culbert Elementary', STE:'Sterling Elementary',
  RRD:'Rolling Ridge Elementary',      SAN:'Sanders Corner Elementary',
  GUI:'Guilford Elementary',           SUL:'Sully Elementary',
  FOR:'Forest Grove Elementary',       LEG:'Legacy Elementary',
  LOV:'Lovettsville Elementary',       LUC:'Lucketts Elementary',
  RML:'Richard and Mildred Loving Elementary',
  NLE:'Newton-Lee Elementary',         RLC:'Rosa Lee Carter Elementary',
  CCE:"Creighton's Corner Elementary", STU:'Steuart W. Weller Elementary',
  ETE:'Elaine E. Thompson Elementary', DIS:'Discovery Elementary',
  CRE:'Cardinal Ridge Elementary',     GPE:'Goshen Post Elementary',
  FDE:'Frederick Douglass Elementary', MTE:"Madison's Trust Elementary",
  HOV:'Hovatter Elementary',           WES:'Waxpool Elementary',
  HEN:'Henrietta Lacks Elementary',
}
const LCPS_MS = {
  RBM:'River Bend Middle',        SRM:'Seneca Ridge Middle',
  JLS:'J. Lupton Simpson Middle', BAM:'Brambleton Middle',
  BRM:'Blue Ridge Middle',        BEM:'Belmont Ridge Middle',
  GMS:'Gum Spring Middle',        HPM:'Harper Park Middle',
  ERM:'Eagle Ridge Middle',       FWS:'Farmwell Station Middle',
  HRM:'Harmony Middle',           STM:'Sterling Middle',
  JML:'J. Michael Lunsford Middle', SMM:"Smart's Mill Middle",
  SHM:'Stone Hill Middle',        TMS:'Trailside Middle',
  WMS:'Willard Middle',           WMM:'Watson Mountain Middle',
}
const LCPS_HS = {
  LCH:'Loudoun County High',  DMH:'Dominion High',
  BWH:'Briar Woods High',     PFH:'Potomac Falls High',
  WHS:'Woodgrove High',       SBH:'Stone Bridge High',
  HTH:'Heritage High',        BRH:'Broad Run High',
  PVH:'Park View High',       LVH:'Loudoun Valley High',
  FHS:'Freedom High',         RRH:'Rock Ridge High',
  THS:'Tuscarora High',       JCH:'John Champe High',
  RVH:'Riverside High',       IHS:'Independence High',
  LRH:'Lightridge High',      WOR:'William Obediah Robey High',
  'HS-14':'Thornton Summit High',
}

async function getNearbySchool(lat, lng, keyword) {
  const params = new URLSearchParams({
    location: `${lat},${lng}`,
    rankby:   'distance',
    keyword,
    type:     'school',
    key:      GOOGLE_API_KEY,
  })
  try {
    const res  = await fetch(
      `https://maps.googleapis.com/maps/api/place/nearbysearch/json?${params}`,
      { signal: AbortSignal.timeout(6000) }
    )
    const data = await res.json()
    return data.results?.[0]?.name ?? null
  } catch { return null }
}

async function arcgisQuery(layerUrl, lat, lng, field) {
  const params = new URLSearchParams({
    geometryType: 'esriGeometryPoint',
    geometry: `${lng},${lat}`,
    inSR: '4326',
    spatialRel: 'esriSpatialRelIntersects',
    outFields: field,
    returnGeometry: 'false',
    f: 'json',
  })
  try {
    const res = await fetch(`${layerUrl}/query?${params}`, { signal: AbortSignal.timeout(8000) })
    const data = await res.json()
    return data.features?.[0]?.attributes?.[field] ?? null
  } catch { return null }
}

async function getFairfaxSchools(lat, lng) {
  const BASE = 'https://services1.arcgis.com/ioennV6PpG5Xodq0/arcgis/rest/services'
  const [elementary, middle, high] = await Promise.all([
    arcgisQuery(`${BASE}/Elementary_School_Attendance_Areas/FeatureServer/0`, lat, lng, 'SCHOOL_NAME'),
    arcgisQuery(`${BASE}/Middle_School_Attendance_Areas/FeatureServer/0`,    lat, lng, 'SCHOOL_NAME'),
    arcgisQuery(`${BASE}/High_School_Attendance_Areas/FeatureServer/0`,      lat, lng, 'SCHOOL_NAME'),
  ])
  return { elementary, middle, high, district: { name: 'Fairfax County Public Schools', site: 'fcps.edu' } }
}

async function getLoudounSchools(lat, lng) {
  const BASE = 'https://logis.loudoun.gov/gis/rest/services/COL/Schools/MapServer'
  const [esCode, msCode, hsCode] = await Promise.all([
    arcgisQuery(`${BASE}/1`, lat, lng, 'ES_SCH_CODE'),
    arcgisQuery(`${BASE}/2`, lat, lng, 'MS_SCH_CODE'),
    arcgisQuery(`${BASE}/3`, lat, lng, 'HS_SCH_CODE'),
  ])
  return {
    elementary: esCode ? (LCPS_ES[esCode] ?? esCode) : null,
    middle:     msCode ? (LCPS_MS[msCode] ?? msCode) : null,
    high:       hsCode ? (LCPS_HS[hsCode] ?? hsCode) : null,
    district: { name: 'Loudoun County Public Schools', site: 'lcps.org' },
  }
}

async function getPrinceWilliamSchools(lat, lng) {
  const BASE = 'https://gisweb.pwcva.gov/arcgis/rest/services/GTS/Education/MapServer'
  const [elementary, middle, high] = await Promise.all([
    arcgisQuery(`${BASE}/0`, lat, lng, 'SchoolName'),
    arcgisQuery(`${BASE}/1`, lat, lng, 'SchoolName'),
    arcgisQuery(`${BASE}/3`, lat, lng, 'SchoolName'),
  ])
  return { elementary, middle, high, district: { name: 'Prince William County Public Schools', site: 'pwcs.edu' } }
}

async function getArlingtonSchools(lat, lng) {
  const BASE = 'https://arlgis.arlingtonva.us/arcgis/rest/services/Open_Data/od_School_Boundaries_Polygons/MapServer'
  const [elementary, middle, high] = await Promise.all([
    arcgisQuery(`${BASE}/0`, lat, lng, 'ES_Name'),
    arcgisQuery(`${BASE}/1`, lat, lng, 'MS_Name'),
    arcgisQuery(`${BASE}/2`, lat, lng, 'HS_Name'),
  ])
  return { elementary, middle, high, district: { name: 'Arlington Public Schools', site: 'apsva.us' } }
}


async function getAlexandriaSchools(lat, lng) {
  const BASE = 'https://geoportal.alexandriava.gov/server/rest/services'
  const [elementary, middle] = await Promise.all([
    arcgisQuery(`${BASE}/Elementary_School_Attendance_Boundaries/FeatureServer/0`, lat, lng, 'School_Name'),
    arcgisQuery(`${BASE}/Middle_School_Attendance_Boundaries/FeatureServer/0`, lat, lng, 'School_Name'),
  ])
  return {
    elementary,
    middle,
    high: 'Alexandria City High School',
    district: { name: 'Alexandria City Public Schools', site: 'acps.k12.va.us' },
  }
}

// Falls Church City: one MS and one HS; two ES zones but no public ArcGIS
// boundary layer — ES approximated via Google Places nearest school.
async function getFallsChurchSchools(lat, lng) {
  const elementary = await getNearbySchool(lat, lng, 'elementary school')
  return {
    elementary,
    middle: 'Mary Ellen Henderson Middle School',
    high:   'Meridian High School',
    approximate: elementary != null,
    district: { name: 'Falls Church City Public Schools', site: 'fccps.org' },
  }
}

// Manassas City: one MS (Metz) and one HS (Osbourn); five ES zones — ES
// approximated via Google Places nearest school.
async function getManassasCitySchools(lat, lng) {
  const elementary = await getNearbySchool(lat, lng, 'elementary school')
  return {
    elementary,
    middle: 'Grace E. Metz Middle School',
    high:   'Osbourn High School',
    approximate: elementary != null,
    district: { name: 'Manassas City Public Schools', site: 'mcpsva.org' },
  }
}

// Manassas Park City: one MS and one HS; two ES zones — ES approximated via
// Google Places nearest school.
async function getManassasParkSchools(lat, lng) {
  const elementary = await getNearbySchool(lat, lng, 'elementary school')
  return {
    elementary,
    middle: 'Manassas Park Middle School',
    high:   'Manassas Park High School',
    approximate: elementary != null,
    district: { name: 'Manassas Park City Schools', site: 'mpark.net' },
  }
}

// Spotsylvania County: multiple zones at all levels; no public ArcGIS boundary
// service — all three levels approximated via Google Places nearest school.
async function getSpotsylvaniaSchools(lat, lng) {
  const [elementary, middle, high] = await Promise.all([
    getNearbySchool(lat, lng, 'elementary school'),
    getNearbySchool(lat, lng, 'middle school'),
    getNearbySchool(lat, lng, 'high school'),
  ])
  return {
    elementary, middle, high,
    approximate: true,
    district: { name: 'Spotsylvania County Public Schools', site: 'spotsylvania.k12.va.us' },
  }
}

// Stafford County stores school assignments as attributes on address points.
async function getStaffordSchools(lat, lng) {
  const LAYER = 'https://services9.arcgis.com/VEbqiV0jZuocUaxq/arcgis/rest/services/address_points_FYS/FeatureServer/0'
  const params = new URLSearchParams({
    geometryType:      'esriGeometryPoint',
    geometry:          `${lng},${lat}`,
    inSR:              '4326',
    distance:          '300',
    units:             'esriSRUnit_Meter',
    outFields:         'ESCHLNAME,MSCHLNAME,HSCHLNAME',
    returnGeometry:    'false',
    resultRecordCount: '1',
    f:                 'json',
  })
  try {
    const res = await fetch(`${LAYER}/query?${params}`, { signal: AbortSignal.timeout(8000) })
    const data = await res.json()
    const attrs = data.features?.[0]?.attributes
    if (!attrs) return null
    return {
      elementary: attrs.ESCHLNAME || null,
      middle:     attrs.MSCHLNAME || null,
      high:       attrs.HSCHLNAME || null,
      district:   { name: 'Stafford County Public Schools', site: 'staffordschools.net' },
    }
  } catch { return null }
}

async function getFauquierSchools(lat, lng) {
  const BASE = 'https://services.arcgis.com/oAoeYJ1kqmAwcEC2/arcgis/rest/services/Fauquier_County_School_Districts/FeatureServer'
  const [elementary, middle, high] = await Promise.all([
    arcgisQuery(`${BASE}/0`, lat, lng, 'NAME'),
    arcgisQuery(`${BASE}/1`, lat, lng, 'NAME'),
    arcgisQuery(`${BASE}/2`, lat, lng, 'NAME'),
  ])
  return { elementary, middle, high, district: { name: 'Fauquier County Public Schools', site: 'fauquiercounty.gov/schools' } }
}

const MATRIX_URL = 'https://maps.googleapis.com/maps/api/distancematrix/json'

const SCHOOL_LEVEL_SUFFIX = { elementary: 'Elementary School', middle: 'Middle School', high: 'High School' }

async function getSchoolDriveTimes(originLat, originLng, schools) {
  const levels = ['elementary', 'middle', 'high']
  const entries = levels.map((l) => [l, schools[l]]).filter(([, name]) => name)
  if (!entries.length) return {}
  // Bare names ("Longfellow, Virginia") geocode unreliably — Distance Matrix has
  // no location bias, so an ambiguous short name can resolve hundreds of miles
  // away. Adding the school-level suffix and county disambiguates it.
  const countyLabel = (schools.district?.name || '').replace(/ Public Schools$/i, '') || 'Virginia'
  const destinations = entries
    .map(([level, name]) => `${name} ${SCHOOL_LEVEL_SUFFIX[level]}, ${countyLabel}, VA`)
    .join('|')
  const params = new URLSearchParams({
    origins: `${originLat},${originLng}`,
    destinations,
    mode: 'driving',
    units: 'imperial',
    key: GOOGLE_API_KEY,
  })
  try {
    const res  = await fetch(`${MATRIX_URL}?${params}`, { signal: AbortSignal.timeout(6000) })
    const data = await res.json()
    if (data.status !== 'OK' || !data.rows?.[0]) return {}
    const result = {}
    entries.forEach(([level], i) => {
      const el = data.rows[0].elements[i]
      if (el?.status === 'OK') result[level] = {
        mins: Math.round(el.duration.value / 60),
        dist: el.distance.text,
      }
    })
    return result
  } catch { return {} }
}

function detectCounty(components) {
  let county = '', locality = ''
  for (const c of components) {
    if (c.types.includes('administrative_area_level_2')) county = c.long_name.toLowerCase()
    if (c.types.includes('locality'))                   locality = c.long_name.toLowerCase()
  }
  if (county.includes('loudoun'))        return 'loudoun'
  if (county.includes('fairfax'))        return 'fairfax'
  if (county.includes('prince william')) return 'prince_william'
  if (county.includes('arlington'))      return 'arlington'
  if (locality === 'alexandria')         return 'alexandria'
  if (locality === 'falls church')       return 'falls_church'
  if (county.includes('stafford'))       return 'stafford'
  if (county.includes('fauquier'))       return 'fauquier'
  if (county.includes('spotsylvania'))   return 'spotsylvania'
  // Manassas City and Manassas Park are independent cities (no county match)
  if (locality === 'manassas park')      return 'manassas_park'
  if (locality === 'manassas')           return 'manassas_city'
  return null
}

export default async function handler(req, res) {
  const { address } = req.query
  if (!address) return res.status(400).json({ error: 'address required' })

  const geoUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_API_KEY}`
  const geoRes  = await fetch(geoUrl)
  const geoData = await geoRes.json()
  const result  = geoData.results?.[0]
  if (!result) return res.status(404).json({ error: 'Address not found' })

  const { lat, lng } = result.geometry.location
  const county = detectCounty(result.address_components)

  let schools = null
  if      (county === 'loudoun')        schools = await getLoudounSchools(lat, lng)
  else if (county === 'fairfax')        schools = await getFairfaxSchools(lat, lng)
  else if (county === 'prince_william') schools = await getPrinceWilliamSchools(lat, lng)
  else if (county === 'arlington')      schools = await getArlingtonSchools(lat, lng)
  else if (county === 'alexandria')     schools = await getAlexandriaSchools(lat, lng)
  else if (county === 'falls_church')   schools = await getFallsChurchSchools(lat, lng)
  else if (county === 'stafford')       schools = await getStaffordSchools(lat, lng)
  else if (county === 'fauquier')       schools = await getFauquierSchools(lat, lng)
  else if (county === 'spotsylvania')   schools = await getSpotsylvaniaSchools(lat, lng)
  else if (county === 'manassas_city')  schools = await getManassasCitySchools(lat, lng)
  else if (county === 'manassas_park')  schools = await getManassasParkSchools(lat, lng)

  if (!schools) return res.status(200).json({ found: false, county })

  const driveTimes = await getSchoolDriveTimes(lat, lng, schools).catch(() => ({}))

  return res.status(200).json({ found: true, county, ...schools, driveTimes })
}
