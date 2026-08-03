/**
 * Intelist Pro — Zillow Listing Fetcher
 * Usage: node scripts/fetch_prices.js [path/to/url_list.txt]
 *
 * Reads Zillow URLs from a text file (one per line, # = comment)
 * Fetches price, type, beds, baths, sqft from each listing
 * Writes scripts/listing_inventory.json
 * Writes scripts/coverage_report.md
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

// ─── Config ────────────────────────────────────────────────────────────────
const URL_FILE = process.argv[2]
  ?? path.join(ROOT, '리스팅_설명_URL_목록.txt')

const OUT_JSON = path.join(__dirname, 'listing_inventory.json')
const OUT_MD   = path.join(__dirname, 'coverage_report.md')

const DELAY_MS = 2500          // delay between requests (ms)
const TIMEOUT_MS = 15000       // per-request timeout

// ─── Tier detection (mirrors App.jsx) ──────────────────────────────────────
function detectTier(addr) {
  const a = addr.toLowerCase()
  if (/mclean|great.?falls|falls.?church.?city/.test(a))                                    return 'T1'
  if (/\bvienna\b|oakton/.test(a))                                                           return 'T1'
  if (/clarendon|ballston|rosslyn|pentagon.?city|del.?ray|cameron.?station|reston.*town.?center/.test(a)) return 'T2'
  if (/arlington|alexandria/.test(a))                                                        return 'T2'
  if (/reston|herndon|fairfax|burke|centreville|chantilly|ashburn|sterling|leesburg|south.?riding|brambleton|aldie|broadlands|one.?loudoun/.test(a)) return 'T3'
  if (/springfield|lorton|annandale|manassas|woodbridge|dale.?city|lake.?ridge|gainesville|haymarket|bristow|nokesville/.test(a)) return 'T4'
  if (/triangle|dumfries|stafford|fredericksburg/.test(a))                                   return 'T5'
  return 'unknown'
}

function detectTierFromPrice(price) {
  if (!price) return null
  if (price >= 1500000) return 'T1'
  if (price >= 900000)  return 'T2'
  if (price >= 700000)  return 'T3'
  if (price >= 500000)  return 'T4'
  return 'T5'
}

// ─── Property type normalizer ───────────────────────────────────────────────
function normalizeType(raw = '') {
  const r = raw.toLowerCase()
  if (/condo|condominium|apartment/.test(r))  return 'Condo'
  if (/townhouse|townhome|row.?home/.test(r)) return 'Townhouse'
  if (/single.?family|sfh|house/.test(r))    return 'SFH'
  return 'Unknown'
}

// ─── Zillow page parser ─────────────────────────────────────────────────────
function parseZillowPage(html, url) {
  const result = {
    url,
    address: null,
    price: null,
    type: null,
    beds: null,
    baths: null,
    sqft: null,
    zipcode: null,
    city: null,
    state: null,
    tier_location: null,
    tier_price: null,
    tier_final: null,
    fetchedAt: new Date().toISOString(),
    parseMethod: null,
    error: null,
  }

  // ── Method 1: __NEXT_DATA__ JSON (most reliable) ────────────────────────
  try {
    const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/)
    if (match) {
      const data = JSON.parse(match[1])

      // Navigate Zillow's Next.js data tree
      const props = data?.props?.pageProps
      const gdp = props?.gdpClientCache
        ?? props?.componentProps?.gdpClientCache

      if (gdp) {
        // gdpClientCache is keyed by a zpid string
        const entries = Object.values(gdp)
        for (const entry of entries) {
          const p = entry?.property ?? entry
          if (!p?.price && !p?.listPrice) continue

          result.address   = p.streetAddress ?? p.address?.streetAddress ?? null
          result.price     = p.price ?? p.listPrice ?? p.unformattedPrice ?? null
          result.beds      = p.bedrooms ?? p.beds ?? null
          result.baths     = p.bathrooms ?? p.baths ?? null
          result.sqft      = p.livingArea ?? p.floorSize ?? p.resoFacts?.livingArea ?? null
          result.zipcode   = p.zipcode ?? p.address?.zipcode ?? null
          result.city      = p.city ?? p.address?.city ?? null
          result.state     = p.state ?? p.address?.state ?? null
          result.type      = normalizeType(p.homeType ?? p.propertyType ?? '')
          result.parseMethod = '__NEXT_DATA__'
          break
        }
      }

      // Fallback within NEXT_DATA: search for hdpData or listing
      if (!result.price) {
        const str = match[1]
        const priceM = str.match(/"price"\s*:\s*(\d+)/)
        if (priceM) result.price = parseInt(priceM[1])

        const bedsM = str.match(/"bedrooms"\s*:\s*(\d+)/)
        if (bedsM) result.beds = parseInt(bedsM[1])

        const bathsM = str.match(/"bathrooms"\s*:\s*([\d.]+)/)
        if (bathsM) result.baths = parseFloat(bathsM[1])

        const sqftM = str.match(/"livingArea"\s*:\s*(\d+)/)
        if (sqftM) result.sqft = parseInt(sqftM[1])

        const typeM = str.match(/"homeType"\s*:\s*"([^"]+)"/)
        if (typeM) result.type = normalizeType(typeM[1])

        const addrM = str.match(/"streetAddress"\s*:\s*"([^"]+)"/)
        if (addrM) result.address = addrM[1]

        const cityM = str.match(/"city"\s*:\s*"([^"]+)"/)
        if (cityM) result.city = cityM[1]

        const stateM = str.match(/"state"\s*:\s*"([A-Z]{2})"/)
        if (stateM) result.state = stateM[1]

        const zipM = str.match(/"zipcode"\s*:\s*"(\d{5})"/)
        if (zipM) result.zipcode = zipM[1]

        if (result.price) result.parseMethod = '__NEXT_DATA__ (regex fallback)'
      }
    }
  } catch (e) {
    // fall through to Method 2
  }

  // ── Method 2: HTML meta / og tags ───────────────────────────────────────
  if (!result.price) {
    try {
      const ogTitle = html.match(/<meta property="og:title" content="([^"]+)"/)
      if (ogTitle) {
        // e.g. "3bd 2ba $750K house for sale - 123 Main St, McLean, VA 22102"
        const t = ogTitle[1]
        const priceM = t.match(/\$\s*([\d,.]+[KkMm]?)/)
        if (priceM) {
          let raw = priceM[1].replace(/,/g, '')
          if (/[Kk]$/.test(raw)) result.price = parseFloat(raw) * 1000
          else if (/[Mm]$/.test(raw)) result.price = parseFloat(raw) * 1000000
          else result.price = parseFloat(raw)
        }
        const bedsM = t.match(/(\d+)\s*bd/)
        if (bedsM) result.beds = parseInt(bedsM[1])
        const bathsM = t.match(/([\d.]+)\s*ba/)
        if (bathsM) result.baths = parseFloat(bathsM[1])
      }

      const ogDesc = html.match(/<meta (?:name="description"|property="og:description") content="([^"]+)"/)
      if (ogDesc) {
        const d = ogDesc[1]
        const sqftM = d.match(/([\d,]+)\s*sq\s*ft/i)
        if (sqftM) result.sqft = parseInt(sqftM[1].replace(/,/g, ''))
      }

      if (result.price) result.parseMethod = 'og:tags'
    } catch (e) { /* fall through */ }
  }

  // ── Method 3: JSON-LD structured data ───────────────────────────────────
  if (!result.price) {
    try {
      const ldMatches = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
      for (const m of ldMatches) {
        const obj = JSON.parse(m[1])
        const item = Array.isArray(obj) ? obj[0] : obj
        if (item?.['@type'] === 'SingleFamilyResidence' || item?.offers) {
          result.price = item.offers?.price ?? item.price ?? null
          result.address = item.address?.streetAddress ?? null
          result.city    = item.address?.addressLocality ?? null
          result.state   = item.address?.addressRegion ?? null
          result.zipcode = item.address?.postalCode ?? null
          const numRoomsM = (item.numberOfRooms ?? '').toString().match(/\d+/)
          if (numRoomsM) result.beds = parseInt(numRoomsM[0])
          result.sqft = item.floorSize?.value ?? null
          result.parseMethod = 'JSON-LD'
          break
        }
      }
    } catch (e) { /* fall through */ }
  }

  // ── Derive tier ─────────────────────────────────────────────────────────
  const locStr = [result.address, result.city, result.state, result.zipcode].filter(Boolean).join(' ')
  result.tier_location = detectTier(locStr)
  result.tier_price    = detectTierFromPrice(result.price)
  // Final tier: take the more luxurious (lower number) of the two
  if (result.tier_location && result.tier_price) {
    const rank = { T1: 1, T2: 2, T3: 3, T4: 4, T5: 5, unknown: 99 }
    const locR = rank[result.tier_location] ?? 99
    const priR = rank[result.tier_price]    ?? 99
    result.tier_final = locR <= priR ? result.tier_location : result.tier_price
  } else {
    result.tier_final = result.tier_location ?? result.tier_price ?? 'unknown'
  }

  // ── Detect type from URL if still unknown ───────────────────────────────
  if (!result.type || result.type === 'Unknown') {
    if (/condo/i.test(url))     result.type = 'Condo'
    if (/townhouse/i.test(url)) result.type = 'Townhouse'
  }

  return result
}

// ─── HTTP fetch with browser headers ───────────────────────────────────────
async function fetchListing(url) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer': 'https://www.zillow.com/',
        'sec-ch-ua': '"Chromium";v="124", "Google Chrome";v="124"',
        'sec-ch-ua-mobile': '?0',
        'sec-fetch-dest': 'document',
        'sec-fetch-mode': 'navigate',
        'sec-fetch-site': 'same-origin',
        'Cache-Control': 'max-age=0',
      },
    })

    if (!res.ok) {
      return { error: `HTTP ${res.status}`, url }
    }

    const html = await res.text()

    // Zillow bot block detection
    if (html.includes('captcha') || html.includes('robot') || html.includes('cf-error-code')) {
      return { error: 'Bot blocked (CAPTCHA/CF)', url }
    }

    return parseZillowPage(html, url)
  } catch (e) {
    if (e.name === 'AbortError') return { error: 'Timeout', url }
    return { error: e.message, url }
  } finally {
    clearTimeout(timer)
  }
}

// ─── Coverage report generator ─────────────────────────────────────────────
function generateReport(listings) {
  const ok     = listings.filter(l => !l.error && l.price)
  const failed = listings.filter(l => l.error || !l.price)

  const tiers  = ['T1', 'T2', 'T3', 'T4', 'T5', 'unknown']
  const types  = ['SFH', 'Condo', 'Townhouse', 'Unknown']

  // Count by tier
  const byTier = {}
  for (const t of tiers) byTier[t] = ok.filter(l => l.tier_final === t)

  // Count by type
  const byType = {}
  for (const t of types) byType[t] = ok.filter(l => l.type === t)

  // Count by tier × type
  const matrix = {}
  for (const tier of tiers) {
    matrix[tier] = {}
    for (const type of types) {
      matrix[tier][type] = ok.filter(l => l.tier_final === tier && l.type === type).length
    }
  }

  // Price stats per tier
  const priceStats = {}
  for (const tier of tiers) {
    const prices = byTier[tier].map(l => l.price).filter(Boolean)
    if (prices.length) {
      priceStats[tier] = {
        min:    Math.min(...prices),
        max:    Math.max(...prices),
        avg:    Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
        median: prices.sort((a, b) => a - b)[Math.floor(prices.length / 2)],
      }
    }
  }

  const fmt = n => n ? `$${(n / 1000).toFixed(0)}K` : '—'
  const now = new Date().toISOString().slice(0, 10)

  let md = `# Intelist Pro — Listing Inventory Coverage Report\n`
  md += `**Generated:** ${now}  \n`
  md += `**Total URLs:** ${listings.length}  \n`
  md += `**Successfully fetched:** ${ok.length}  \n`
  md += `**Failed / blocked:** ${failed.length}  \n\n`
  md += `---\n\n`

  // ── By tier ──
  md += `## Coverage by Tier\n\n`
  md += `| Tier | Name | Count | Min Price | Avg Price | Max Price |\n`
  md += `|------|------|------:|-----------|-----------|-----------|\n`
  const tierNames = { T1: 'Luxury ($1.5M+)', T2: 'Premium ($900K–$1.5M)', T3: 'Quality ($700K–$900K)', T4: 'Space & Function ($500K–$700K)', T5: 'Practical (<$500K)', unknown: 'Unknown' }
  for (const tier of tiers) {
    const c = byTier[tier].length
    if (!c) continue
    const s = priceStats[tier] ?? {}
    md += `| ${tier} | ${tierNames[tier]} | ${c} | ${fmt(s.min)} | ${fmt(s.avg)} | ${fmt(s.max)} |\n`
  }
  md += '\n'

  // ── By type ──
  md += `## Coverage by Property Type\n\n`
  md += `| Type | Count | % |\n`
  md += `|------|------:|---|\n`
  for (const type of types) {
    const c = byType[type]?.length ?? 0
    if (!c) continue
    const pct = ok.length ? ((c / ok.length) * 100).toFixed(0) : 0
    md += `| ${type} | ${c} | ${pct}% |\n`
  }
  md += '\n'

  // ── Tier × Type matrix ──
  md += `## Tier × Type Matrix\n\n`
  md += `| Tier | SFH | Condo | Townhouse | Unknown | Total |\n`
  md += `|------|----:|------:|----------:|--------:|------:|\n`
  for (const tier of tiers) {
    const row = matrix[tier]
    const total = Object.values(row).reduce((a, b) => a + b, 0)
    if (!total) continue
    md += `| ${tier} | ${row.SFH ?? 0} | ${row.Condo ?? 0} | ${row.Townhouse ?? 0} | ${row.Unknown ?? 0} | ${total} |\n`
  }
  md += '\n'

  // ── Gap analysis ──
  md += `## Gap Analysis\n\n`
  const gaps = []
  for (const tier of tiers.filter(t => t !== 'unknown')) {
    for (const type of ['SFH', 'Condo', 'Townhouse']) {
      const count = matrix[tier]?.[type] ?? 0
      if (count === 0) gaps.push(`${tier} × ${type}`)
      else if (count < 2) gaps.push(`${tier} × ${type} (only ${count} — needs more)`)
    }
  }
  if (gaps.length === 0) {
    md += `✅ All tier × type combinations covered with 2+ listings.\n\n`
  } else {
    md += `The following combinations need more listings:\n\n`
    for (const g of gaps) md += `- ⚠️ ${g}\n`
    md += '\n'
  }

  // ── Failed URLs ──
  if (failed.length) {
    md += `## Failed Fetches\n\n`
    md += `| URL | Error |\n`
    md += `|-----|-------|\n`
    for (const f of failed) {
      const shortUrl = f.url?.replace('https://www.zillow.com', '').slice(0, 60)
      md += `| \`${shortUrl}...\` | ${f.error ?? 'No price found'} |\n`
    }
    md += '\n'
  }

  md += `---\n_Generated by scripts/fetch_prices.js_\n`
  return md
}

// ─── Sleep helper ───────────────────────────────────────────────────────────
const sleep = ms => new Promise(r => setTimeout(r, ms))

// ─── Main ───────────────────────────────────────────────────────────────────
async function main() {
  // Read URL file
  if (!fs.existsSync(URL_FILE)) {
    console.error(`❌ URL file not found: ${URL_FILE}`)
    console.error(`Usage: node scripts/fetch_prices.js [path/to/url_list.txt]`)
    process.exit(1)
  }

  const raw = fs.readFileSync(URL_FILE, 'utf8')
  const urls = raw
    .split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('#') && l.startsWith('http'))

  if (!urls.length) {
    console.error('❌ No URLs found in file (lines starting with http)')
    process.exit(1)
  }

  console.log(`\n${'═'.repeat(60)}`)
  console.log(`  Intelist Pro — Zillow Listing Fetcher`)
  console.log(`  ${urls.length} URLs · ${URL_FILE}`)
  console.log(`${'═'.repeat(60)}\n`)

  // Load existing results if any (resume support)
  let existing = []
  if (fs.existsSync(OUT_JSON)) {
    try {
      existing = JSON.parse(fs.readFileSync(OUT_JSON, 'utf8'))
      const doneUrls = new Set(existing.filter(l => !l.error && l.price).map(l => l.url))
      console.log(`  Resuming: ${doneUrls.size} already fetched, skipping those.\n`)
    } catch (_) {}
  }
  const doneUrls = new Set(existing.filter(l => !l.error && l.price).map(l => l.url))
  const toFetch  = urls.filter(u => !doneUrls.has(u))

  const results = [...existing.filter(l => !l.error && l.price)]

  for (let i = 0; i < toFetch.length; i++) {
    const url = toFetch[i]
    const idx = String(i + 1).padStart(3, '0')
    process.stdout.write(`[${idx}/${toFetch.length}] ${url.slice(0, 60)}... `)

    const listing = await fetchListing(url)

    if (listing.error) {
      console.log(`⚠  ${listing.error}`)
    } else if (!listing.price) {
      console.log(`⚠  No price extracted (method: ${listing.parseMethod ?? 'none'})`)
      listing.error = 'No price extracted'
    } else {
      const p = listing.price >= 1000000
        ? `$${(listing.price / 1000000).toFixed(2)}M`
        : `$${Math.round(listing.price / 1000)}K`
      console.log(`✅ ${p} · ${listing.type ?? '?'} · ${listing.beds ?? '?'}bd · ${listing.sqft ?? '?'}sqft · ${listing.tier_final}`)
    }

    results.push(listing)

    // Checkpoint every 10
    if ((i + 1) % 10 === 0) {
      fs.writeFileSync(OUT_JSON, JSON.stringify(results, null, 2))
      console.log(`  ↳ Checkpoint saved (${results.length} total)\n`)
    }

    if (i < toFetch.length - 1) await sleep(DELAY_MS)
  }

  // Final save
  const allResults = [...results]
  fs.writeFileSync(OUT_JSON, JSON.stringify(allResults, null, 2))
  console.log(`\n✅ listing_inventory.json saved (${allResults.length} entries)`)

  // Generate coverage report
  const report = generateReport(allResults)
  fs.writeFileSync(OUT_MD, report)
  console.log(`✅ coverage_report.md saved\n`)

  // Quick summary
  const ok = allResults.filter(l => !l.error && l.price)
  const failed = allResults.filter(l => l.error || !l.price)
  console.log(`── Summary ───────────────────────────────────────────────`)
  console.log(`  Fetched:  ${ok.length}/${allResults.length}`)
  console.log(`  Failed:   ${failed.length}`)
  const tiers = ['T1','T2','T3','T4','T5']
  for (const t of tiers) {
    const c = ok.filter(l => l.tier_final === t).length
    if (c) console.log(`  ${t}: ${c} listings`)
  }
  console.log()
}

main().catch(e => {
  console.error('Fatal error:', e)
  process.exit(1)
})
