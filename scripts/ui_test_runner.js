/**
 * Intelist Pro — UI Test Runner (Playwright)
 * Usage: node scripts/ui_test_runner.js
 *
 * Requires:  npm install playwright
 *            localhost:5174 running (npm run dev)
 *
 * Tests 25 real addresses against the live UI.
 * Evaluates output using the same 10 criteria as test_runner.js.
 * Saves screenshots to scripts/screenshots/
 * Saves report to scripts/ui_test_report.md
 */

import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots')
const REPORT_PATH     = path.join(__dirname, 'ui_test_report.md')
const RESULTS_PATH    = path.join(__dirname, 'ui_test_results.json')

const BASE_URL          = 'http://localhost:5174'
const RESULT_TIMEOUT_MS = 120_000   // max wait for AI response
const CASE_DELAY_MS     = 10_000    // delay between cases
const MAX_RETRIES       = 1         // retry once on timeout

// ─── System Chrome path (avoids downloading Playwright browser) ────────────
const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

// ─── Test cases ─────────────────────────────────────────────────────────────
const TEST_CASES = [
  { id: 'UI-01', address: '1800 Old Meadow Rd #713, McLean, VA 22102' },
  { id: 'UI-02', address: '1438 Brookhaven Dr, McLean, VA 22101' },
  { id: 'UI-03', address: '745 Potomac River Rd, McLean, VA 22102' },
  { id: 'UI-04', address: '1307 Tulip Poplar Ln, Vienna, VA 22182' },
  { id: 'UI-05', address: '1401 N Rhodes St #603, Arlington, VA 22209' },
  { id: 'UI-06', address: '12000 Market St #445, Reston, VA 20190' },
  { id: 'UI-07', address: '11852 St Trinians Ct, Reston, VA 20191' },
  { id: 'UI-08', address: '2254 Gunsmith Sq, Reston, VA 20191' },
  { id: 'UI-09', address: '42671 Leaflet Ln, Chantilly, VA 20152' },
  { id: 'UI-10', address: '43728 Transit Sq, Ashburn, VA 20147' },
  { id: 'UI-11', address: '46 Wedgedale Dr, Sterling, VA 20164' },
  { id: 'UI-12', address: '47085 Glenaire Ct, Sterling, VA 20165' },
  { id: 'UI-13', address: '13227 Pearsall Ln, Fairfax, VA 22033' },
  { id: 'UI-14', address: '6518 Alexis Ln, Springfield, VA 22150' },
  { id: 'UI-15', address: '9131 Karlo St, Manassas, VA 20110' },
  { id: 'UI-16', address: '4333C Americana Dr #101, Annandale, VA 22003' },
  { id: 'UI-17', address: '18320 Moss Garden Rd, Dumfries, VA 22026' },
  { id: 'UI-18', address: '8213 Claremont Woods Dr, Alexandria, VA 22306' },
  { id: 'UI-19', address: '1968 Hopewood Dr, Falls Church, VA 22043' },
  { id: 'UI-20', address: '2407 Lellah Ct, Dunn Loring, VA 22027' },
  { id: 'UI-21', address: '23342 Higbee Ln, Brambleton, VA 20148' },
  { id: 'UI-22', address: '103 Duvall Court SE, Leesburg, VA 20175' },
  { id: 'UI-23', address: '13343 Connor Dr, Centreville, VA 20120' },
  { id: 'UI-24', address: '16309 Sandy Ridge Ct, Woodbridge, VA 22191' },
  { id: 'UI-25', address: '7209 Valleycrest Blvd, Annandale, VA 22003' },
]

// ─── Evaluation (same criteria as test_runner.js) ───────────────────────────
const BANNED_STARTERS = [
  'beautifully', 'thoughtfully', 'meticulously', 'gorgeously', 'lovingly',
  'immaculate', 'charming', 'spacious', 'perfectly', 'exquisitely',
  'elegantly', 'tastefully', 'wonderfully', 'exceptionally', 'nestled',
  'discover', 'welcome', 'rarely',
]

const BANNED_LANGUAGE = [
  'appears to be', 'seems to', 'possibly', 'probably', 'might be', 'could be',
  'affordable', 'entry point', 'price point', 'budget-friendly',
  "won't last long", 'priced to sell', 'great deal', 'steal', 'bargain',
  "don't miss", 'hurry', 'act now', 'once in a lifetime', 'dream home', "this won't last",
  'as seen in photos', 'pictured here', 'aerial view shows', 'visible in photos',
  'perfect for families', 'great for young professionals', 'ideal for couples',
  'safe neighborhood', 'quiet neighborhood',
  'just minutes', 'short drive', 'quick drive', 'easy commute to',
]

const HARD_BLOCK_ZONES = [
  /sterling.*va.*2016[45]/i,
  /cascades.*va/i,
  /potomac.?falls.*va/i,
]
const HARD_BLOCK_TERMS = [
  /innovation.?center.?metro/i,
  /ashburn.?metro/i,
  /ashburn.*station/i,
]

const ALLOWED_CAPS = new Set(['MLS','FCPS','NOVA','VDOT','USDA','HVAC','HGTV','LEED','ADU','HOA','VRE','SFH','VA','DC','MD','ZIP','PDF'])

function evaluate(tc, output) {
  const scores = {}
  const notes  = {}
  const text   = output.toLowerCase()
  const lines  = output.split('\n')

  // C1: Banned language
  {
    const found = BANNED_LANGUAGE.filter(w => text.includes(w.toLowerCase()))
    const proseForCaps = output.split('\n')
      .filter(l => !/^\s*\[[A-Z][A-Z0-9 ·'–—\-]+\]\s*$/.test(l.trim()))
      .join('\n')
    const capsMatches = []
    for (const m of proseForCaps.matchAll(/\b[A-Z]{4,}\b/g)) {
      const w = m[0]
      if (!ALLOWED_CAPS.has(w) && !/^I-\d+$/.test(w)) capsMatches.push(w)
    }
    const exclFound = [
      ...(proseForCaps.includes('!') ? ['exclamation mark'] : []),
      ...capsMatches,
    ]
    const allBad = [...found, ...exclFound]
    scores.c1_banned = allBad.length === 0 ? 10 : Math.max(0, 10 - allBad.length * 3)
    notes.c1_banned  = allBad.length ? `Found: ${[...new Set(allBad)].join(', ')}` : 'PASS'
  }

  // C2: Sentence-starter ban
  {
    const sentences = output.split(/(?<=[.!?])\s+/)
    const bad = sentences.filter(s => {
      const first = s.trim().split(/\s+/)[0].toLowerCase().replace(/[^a-z]/g, '')
      return BANNED_STARTERS.includes(first)
    })
    scores.c2_starters = bad.length === 0 ? 10 : Math.max(0, 10 - bad.length * 5)
    notes.c2_starters  = bad.length ? `Bad starters: ${bad.map(s => s.trim().split(/\s+/)[0]).join(', ')}` : 'PASS'
  }

  // C3: Physical anchor — 3 paragraphs in Zillow section
  {
    const zillowMatch = output.match(/\[ZILLOW[^\]]*\]([\s\S]*?)(?=\[INSTAGRAM|$)/i)
    if (zillowMatch) {
      const paras = zillowMatch[1].trim().split(/\n\s*\n/).filter(p => p.trim().length > 30)
      const ANCHOR = /\b(floor|ceiling|wall|window|door|room|kitchen|bath|bedroom|living|dining|garage|basement|attic|deck|patio|yard|sqft|square.?feet|hardwood|tile|granite|quartz|marble|stainless|island|countertop|cabinet|layout|open.?concept|natural.?light|built.?in|fireplace|vaulted|beam|brick|stone|siding|roof|driveway|lot|acre|entry|foyer|hallway|staircase|balcony|terrace)\b/i
      const anchored = paras.filter(p => ANCHOR.test(p)).length
      scores.c3_anchor = anchored >= 3 ? 10 : anchored === 2 ? 7 : 3
      notes.c3_anchor  = `${anchored}/${paras.length} paragraphs anchored`
    } else {
      scores.c3_anchor = 5
      notes.c3_anchor  = 'Zillow section not found'
    }
  }

  // C4: Tier tone — no cross-contamination
  {
    const addr = (tc.address ?? '').toLowerCase()
    let issues = []
    if (/mclean|great.?falls/.test(addr)) {
      const luxuryTerms = /embassy|estate.?luxury|architectural.?prestige/i
      if (!luxuryTerms.test(output)) issues.push('T1 location missing luxury signals')
    }
    if (/sterling|cascades|potomac.?falls/.test(addr)) {
      const wrongTerms = /equestrian|embassy|horse.?country|wine.?country/i
      if (wrongTerms.test(output)) issues.push('Wrong regional flavor for Sterling')
    }
    scores.c4_tier = issues.length === 0 ? 10 : 6
    notes.c4_tier  = issues.length ? issues.join('; ') : 'PASS'
  }

  // C5: Regional flavor present
  {
    const addr = (tc.address ?? '').toLowerCase()
    const regionTerms = {
      mclean:    /mclean|great.?falls|embassy|architectural|established/i,
      arlington: /arlington|metro|walkable|urban|transit/i,
      reston:    /reston|trail|lake|tech|nature/i,
      vienna:    /vienna|oakton|madison|small.?town|established/i,
      sterling:  /sterling|cascades|potomac.?river|suburban/i,
      ashburn:   /ashburn|loudoun|tech.?corridor|silver.?line|master.?planned/i,
      herndon:   /herndon|fairfax|tech|commuter|suburban/i,
    }
    let found = false
    for (const [loc, re] of Object.entries(regionTerms)) {
      if (addr.includes(loc) && re.test(output)) { found = true; break }
    }
    scores.c5_regional = found ? 10 : 7
    notes.c5_regional  = found ? 'PASS' : 'Regional flavor may be weak'
  }

  // C6: Community identity — no borrowed language
  {
    const addr = (tc.address ?? '').toLowerCase()
    let issues = []
    if (/sterling|cascades|woodbridge|manassas|springfield/.test(addr)) {
      if (/equestrian|horse.?country|embassy.?corridor|wine.?country/i.test(output)) {
        issues.push('Borrowed luxury regional language')
      }
    }
    scores.c6_community = issues.length === 0 ? 10 : 4
    notes.c6_community  = issues.length ? issues.join('; ') : 'PASS'
  }

  // C7: MLS first-sentence format
  {
    const mlsMatch = output.match(/\[MLS DESCRIPTION\]([\s\S]*?)(?=\[ZILLOW|$)/i)
    if (mlsMatch) {
      const firstSentence = mlsMatch[1].trim().split(/\n/)[0]
      const hasFormat = /\d+-bedroom|\d+-bath|sq(?:uare)?.?f(?:ee)?t|listed at \$|single.?family|townho(?:use|me)|condominium|condo/i.test(firstSentence)
      scores.c7_mls_format = hasFormat ? 10 : 5
      notes.c7_mls_format  = hasFormat ? 'PASS' : `First sentence format issue: "${firstSentence.slice(0, 80)}"`
    } else {
      scores.c7_mls_format = 0
      notes.c7_mls_format  = 'MLS section not found'
    }
  }

  // C8: Zillow 3-paragraph structure
  {
    const zillowMatch = output.match(/\[ZILLOW[^\]]*\]([\s\S]*?)(?=\[INSTAGRAM|$)/i)
    if (zillowMatch) {
      const paras = zillowMatch[1].trim().split(/\n\s*\n/).filter(p => p.trim().length > 20)
      scores.c8_zillow_structure = paras.length >= 3 ? 10 : paras.length === 2 ? 6 : 3
      notes.c8_zillow_structure  = `${paras.length} paragraphs found`
    } else {
      scores.c8_zillow_structure = 0
      notes.c8_zillow_structure  = 'Zillow section not found'
    }
  }

  // C9: Hashtag count (5–7)
  {
    const hashtags = output.match(/#\w+/g) ?? []
    const count    = hashtags.length
    scores.c9_hashtags = (count >= 5 && count <= 7) ? 10 : Math.max(0, 10 - Math.abs(count - 6) * 3)
    notes.c9_hashtags  = `${count} hashtags: ${hashtags.join(' ')}`
  }

  // C10: No fabrication / Hard Block
  {
    const isHardBlock = HARD_BLOCK_ZONES.some(re => re.test(tc.address ?? ''))
    let violation = null
    if (isHardBlock) {
      for (const term of HARD_BLOCK_TERMS) {
        if (term.test(output)) { violation = `HARD BLOCK violation: "${term}" mentioned`; break }
      }
    }
    scores.c10_fabrication = violation ? 0 : 10
    notes.c10_fabrication  = violation ?? 'PASS'
  }

  const total = Object.values(scores).reduce((a, b) => a + b, 0)
  return { scores, notes, total, maxTotal: 100 }
}

// ─── Sleep ──────────────────────────────────────────────────────────────────
const sleep = ms => new Promise(r => setTimeout(r, ms))

// ─── Run one test case (with retry) ─────────────────────────────────────────
async function runCase(page, tc, attempt = 1) {
  // Navigate fresh each case
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' })
  await sleep(800)

  // Dismiss auth modal if present
  const modal = page.locator('[class*="modalOverlay"], [class*="authModal"]')
  if (await modal.isVisible({ timeout: 1500 }).catch(() => false)) {
    const closeBtn = page.locator('[class*="modalClose"], button[aria-label="Close"]')
    if (await closeBtn.isVisible({ timeout: 800 }).catch(() => false)) {
      await closeBtn.click()
      await sleep(300)
    } else {
      // Click outside modal to dismiss
      await page.keyboard.press('Escape')
      await sleep(300)
    }
  }

  // Type address
  const input = page.locator('#address-input')
  await input.waitFor({ state: 'visible', timeout: 5000 })
  await input.click({ clickCount: 3 })
  await input.fill(tc.address)
  await sleep(300)

  // Click submit arrow button
  const submitBtn = page.locator('button[aria-label="Generate listing copy"]')
  await submitBtn.waitFor({ state: 'visible', timeout: 3000 })
  await submitBtn.click()

  // Wait for results — "Your listing copy is ready."
  try {
    await page.locator('text=Your listing copy is ready.').waitFor({
      state: 'visible',
      timeout: RESULT_TIMEOUT_MS,
    })
  } catch (e) {
    if (attempt <= MAX_RETRIES) {
      console.log(`  ↳ Timeout — retrying (attempt ${attempt + 1})...`)
      return runCase(page, tc, attempt + 1)
    }
    throw new Error(`Timeout after ${RESULT_TIMEOUT_MS / 1000}s (${MAX_RETRIES + 1} attempts)`)
  }

  await sleep(500) // let DOM settle

  // Extract text from each card by tag label
  async function getCardText(tagText) {
    const card = page.locator('div').filter({
      has: page.locator('span', { hasText: tagText }),
    }).first()
    // The displayed text is in the <p class*="cardText"> or a textarea
    const p = card.locator('p').last()
    return (await p.textContent().catch(() => '')).trim()
  }

  const mlsText      = await getCardText('MLS Description')
  const zillowText   = await getCardText("Zillow · What's Special")
  const instagramText = await getCardText('Instagram Caption')

  const output = [
    '[MLS DESCRIPTION]', mlsText,
    "[ZILLOW · WHAT'S SPECIAL]", zillowText,
    '[INSTAGRAM CAPTION]', instagramText,
  ].join('\n\n')

  return { mlsText, zillowText, instagramText, output }
}

// ─── Report generator ────────────────────────────────────────────────────────
function generateReport(results, elapsed) {
  const ok     = results.filter(r => !r.error)
  const failed = results.filter(r =>  r.error)
  const avgScore = ok.length
    ? (ok.reduce((s, r) => s + r.evaluation.total, 0) / ok.length).toFixed(1)
    : '—'

  const CRITERIA = [
    ['c1_banned',          'Banned Language'],
    ['c2_starters',        'Sentence-Starter Ban'],
    ['c3_anchor',          'Physical Anchor'],
    ['c4_tier',            'Tier Tone'],
    ['c5_regional',        'Regional Flavor'],
    ['c6_community',       'Community Identity'],
    ['c7_mls_format',      'MLS First-Sentence Format'],
    ['c8_zillow_structure','Zillow 3-Para Structure'],
    ['c9_hashtags',        'Hashtag Count (5–7)'],
    ['c10_fabrication',    'No Fabrication / Hard Block'],
  ]

  const now = new Date().toISOString().slice(0, 10)
  let md = `# Intelist Pro — UI Test Report\n`
  md += `**Date:** ${now}  \n`
  md += `**Model:** claude-opus-4-6 (via live UI)  \n`
  md += `**Total cases:** ${results.length}  \n`
  md += `**Passed:** ${ok.length}  \n`
  md += `**Failed:** ${failed.length}  \n`
  md += `**Average score:** ${avgScore}/100  \n`
  md += `**Runtime:** ${elapsed} min  \n\n`
  md += `---\n\n`

  // Criterion averages
  md += `## Criterion Averages\n\n`
  md += `| Criterion | Avg | Status |\n`
  md += `|-----------|----:|--------|\n`
  for (const [key, label] of CRITERIA) {
    const vals = ok.map(r => r.evaluation.scores?.[key] ?? 0)
    const avg  = vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : '—'
    const icon = parseFloat(avg) >= 8 ? '🟢' : parseFloat(avg) >= 6 ? '🟡' : '🔴'
    md += `| ${label} | ${avg} | ${icon} |\n`
  }
  md += '\n---\n\n'

  // Results table
  md += `## Results by Case\n\n`
  md += `| ID | Address | Score | C1 | C2 | C3 | C4 | C5 | C6 | C7 | C8 | C9 | C10 | Screenshot |\n`
  md += `|----|---------|------:|----|----|----|----|----|----|----|----|----|-----|------------|\n`
  for (const r of results) {
    const s        = r.evaluation?.scores ?? {}
    const scoreStr = r.error ? 'ERR' : `${r.evaluation.total}/100`
    const shot     = r.screenshotFile ? `[📷](screenshots/${r.screenshotFile})` : '—'
    const addr     = r.address.slice(0, 35) + (r.address.length > 35 ? '…' : '')
    md += `| ${r.id} | ${addr} | ${scoreStr} | ${s.c1_banned ?? '-'} | ${s.c2_starters ?? '-'} | ${s.c3_anchor ?? '-'} | ${s.c4_tier ?? '-'} | ${s.c5_regional ?? '-'} | ${s.c6_community ?? '-'} | ${s.c7_mls_format ?? '-'} | ${s.c8_zillow_structure ?? '-'} | ${s.c9_hashtags ?? '-'} | ${s.c10_fabrication ?? '-'} | ${shot} |\n`
  }
  md += '\n'

  // Issues
  const issues = ok.filter(r => r.evaluation.total < 90)
  if (issues.length) {
    md += `## ⚠️ Cases Scoring Below 90\n\n`
    for (const r of issues) {
      md += `### ${r.id} — ${r.address} (${r.evaluation.total}/100)\n\n`
      for (const [key, label] of CRITERIA) {
        const note = r.evaluation.notes?.[key]
        if (note && note !== 'PASS') md += `- **${label}**: ${note}  \n`
      }
      md += '\n'
    }
  }

  // Hard block violations
  const hbViolations = ok.filter(r => r.evaluation.notes?.c10_fabrication?.includes('HARD BLOCK'))
  if (hbViolations.length) {
    md += `## ⛔ Hard Block Violations\n\n`
    for (const r of hbViolations) {
      md += `- **${r.id}** ${r.address}: ${r.evaluation.notes.c10_fabrication}\n`
    }
    md += '\n'
  }

  // Failures
  if (failed.length) {
    md += `## ❌ Errors\n\n`
    for (const r of failed) {
      md += `- **${r.id}** ${r.address}: ${r.error}\n`
    }
    md += '\n'
  }

  md += `---\n_Generated by scripts/ui_test_runner.js_\n`
  return md
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  // Setup
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true })

  console.log(`\n${'═'.repeat(62)}`)
  console.log(`  Intelist Pro — UI Test Runner (Playwright)`)
  console.log(`  ${TEST_CASES.length} cases · ${BASE_URL}`)
  console.log(`  Result timeout: ${RESULT_TIMEOUT_MS / 1000}s · Delay: ${CASE_DELAY_MS / 1000}s · Retry: ${MAX_RETRIES}x`)
  console.log(`${'═'.repeat(62)}\n`)

  // Launch browser using system Chrome
  const browser = await chromium.launch({
    executablePath: CHROME_PATH,
    headless: false,          // visible window — easier to debug
    args: ['--no-sandbox'],
  })

  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 },
    locale: 'en-US',
  })
  const page = await context.newPage()

  // Suppress console noise from the app
  page.on('console', () => {})
  page.on('pageerror', () => {})

  const results  = []
  const startTime = Date.now()

  for (let i = 0; i < TEST_CASES.length; i++) {
    const tc  = TEST_CASES[i]
    const idx = String(i + 1).padStart(2, '0')
    process.stdout.write(`[${idx}/${TEST_CASES.length}] ${tc.id} · ${tc.address.slice(0, 50)}... `)

    const result = {
      id:             tc.id,
      address:        tc.address,
      mlsText:        '',
      zillowText:     '',
      instagramText:  '',
      screenshotFile: null,
      error:          null,
      evaluation:     null,
    }

    try {
      const { mlsText, zillowText, instagramText, output } = await runCase(page, tc)

      result.mlsText       = mlsText
      result.zillowText    = zillowText
      result.instagramText = instagramText
      result.evaluation    = evaluate(tc, output)

      const score = result.evaluation.total
      const bar   = '█'.repeat(Math.round(score / 10)) + '░'.repeat(10 - Math.round(score / 10))
      console.log(`${bar} ${score}/100`)
    } catch (e) {
      result.error = e.message
      console.log(`⚠  ${e.message}`)
    }

    // Screenshot (success or failure)
    try {
      const filename = `${tc.id}-${tc.address.replace(/[^a-z0-9]/gi, '_').slice(0, 40)}.png`
      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, filename),
        fullPage: true,
      })
      result.screenshotFile = filename
    } catch (_) {}

    results.push(result)

    // Checkpoint every 5
    if ((i + 1) % 5 === 0) {
      fs.writeFileSync(RESULTS_PATH, JSON.stringify(results, null, 2))
      console.log(`  ↳ Checkpoint saved (${i + 1} results)\n`)
    }

    // Delay between cases (skip after last)
    if (i < TEST_CASES.length - 1) {
      await sleep(CASE_DELAY_MS)
    }
  }

  await browser.close()

  const elapsed = ((Date.now() - startTime) / 60000).toFixed(1)

  console.log(`\n${'═'.repeat(62)}`)
  console.log(`  Done! ${TEST_CASES.length} cases in ${elapsed} min`)
  console.log(`${'═'.repeat(62)}\n`)

  // Save final results
  fs.writeFileSync(RESULTS_PATH, JSON.stringify(results, null, 2))
  console.log(`✅ ui_test_results.json saved`)

  // Generate report
  const report = generateReport(results, elapsed)
  fs.writeFileSync(REPORT_PATH, report)
  console.log(`✅ ui_test_report.md saved`)
  console.log(`✅ Screenshots in scripts/screenshots/\n`)

  // Terminal summary
  const ok = results.filter(r => !r.error)
  const avgScore = ok.length
    ? (ok.reduce((s, r) => s + r.evaluation.total, 0) / ok.length).toFixed(1)
    : '—'

  const CRITERIA = [
    ['c1_banned',          'Banned Language'],
    ['c2_starters',        'Sentence-Starter Ban'],
    ['c3_anchor',          'Physical Anchor'],
    ['c4_tier',            'Tier Tone'],
    ['c5_regional',        'Regional Flavor'],
    ['c6_community',       'Community Identity'],
    ['c7_mls_format',      'MLS First-Sentence Format'],
    ['c8_zillow_structure','Zillow 3-Para Structure'],
    ['c9_hashtags',        'Hashtag Count (5–7)'],
    ['c10_fabrication',    'No Fabrication / Hard Block'],
  ]

  console.log('── Criterion Summary ──────────────────────────────────────')
  for (const [key, label] of CRITERIA) {
    const vals = ok.map(r => r.evaluation?.scores?.[key] ?? 0)
    const avg  = vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length) : 0
    const bar  = '█'.repeat(Math.round(avg)) + '░'.repeat(10 - Math.round(avg))
    console.log(`  ${bar} ${avg.toFixed(1)}/10  ${label}`)
  }
  console.log(`\n  Overall average: ${avgScore}/100`)
  if (results.filter(r => r.error).length) {
    console.log(`\n  ⚠  ${results.filter(r => r.error).length} cases failed — see ui_test_report.md`)
  }
  console.log()
}

main().catch(e => {
  console.error('Fatal error:', e)
  process.exit(1)
})
