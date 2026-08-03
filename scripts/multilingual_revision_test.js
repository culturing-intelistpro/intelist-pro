import Anthropic from '@anthropic-ai/sdk'
import fs from 'fs'

// ── Load master prompt rules (same as App.jsx) ─────────────────────────────
// Inline the content since we can't use .js ESM imports easily from scripts
import masterPromptRules from '../src/masterPromptRules.js'

const API_KEY = process.env.VITE_ANTHROPIC_API_KEY || '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'

// ── Sample: Sterling Lowes Island MLS text ─────────────────────────────────
const SAMPLE_MLS = `4-bedroom, 3.5-bath single-family home in Lowes Island, Sterling, VA. 2,840 square feet of finished living space listed at $749,000. HOA fee of $85 per month covers common area maintenance and tot lot upkeep.

The main level features hardwood flooring throughout the living and dining areas, a kitchen updated in 2021 with quartz countertops and stainless steel appliances, and a two-car garage with interior access. A gas fireplace anchors the family room, which opens to a rear composite deck overlooking a fully fenced backyard. The upper level holds four bedrooms, including a primary suite with a walk-in closet and an en suite bath featuring a dual-sink vanity and soaking tub. The finished lower level adds a full bath and flex room suited for a home office or exercise space.

The property sits on a 0.22-acre lot within the Lowes Island community, with access to the Cascades trail network and proximity to Cascades Marketplace for daily errands. The Potomac River waterfront and Algonkian Regional Park are accessible via the trail system. Located within the Potomac Falls High School pyramid in Loudoun County Public Schools.`

const SAMPLE_ZILLOW = `The hardwood floors and open-plan main level establish a clear sense of flow from the moment you step inside. The 2021 kitchen renovation — quartz countertops, subway tile backsplash, stainless appliances — brings the space current without erasing the warmth of the gas fireplace in the adjoining family room. A composite deck extends the living space outward, overlooking a fully fenced backyard that backs to established plantings for a measure of privacy.

The upper level's four bedrooms are organized around a wide hallway, with the primary suite occupying the rear corner for separation from the secondary rooms. The en suite bath's soaking tub and dual-sink vanity reflect the home's practical approach to comfort. The finished lower level — full bath included — handles the overflow that a four-bedroom household generates: a dedicated office, a workout room, or both.

Lowes Island's trail infrastructure means the Cascades paths and Algonkian Regional Park's riverfront are genuinely accessible from the property, not theoretical amenities. Cascades Marketplace handles daily errands; Dulles Town Center and One Loudoun extend the retail and dining range. The Potomac Falls High School pyramid within Loudoun County Public Schools anchors the neighborhood's appeal for households prioritizing established school options.`

const SAMPLE_INSTAGRAM = `Hardwood floors, a 2021 kitchen remodel, and a gas fireplace — this Lowes Island home delivers the details that matter.

• 4 bed / 3.5 bath | 2,840 sq ft
• Quartz countertops, composite deck, fenced yard
• Lowes Island trails and Cascades Marketplace

Listed at $749K.

#SterlingVA #LowesIsland #NorthernVirginia #SingleFamilyHome #JustListed #NoVAHomes #LoudounSchools`

// ── Test cases ─────────────────────────────────────────────────────────────
const TEST_CASES = [
  {
    id: 1,
    lang: 'Hindi',
    script: 'Devanagari',
    request: 'स्कूल की जानकारी हटाएं',
    translation: 'Remove school information',
    section: 'mls',
    originalText: SAMPLE_MLS,
    expectedChange: 'school info removed',
  },
  {
    id: 2,
    lang: 'Arabic',
    script: 'Arabic',
    request: 'اجعل النبرة أكثر فخامة وركز على المطبخ',
    translation: 'Make the tone more luxurious and focus on the kitchen',
    section: 'zillow',
    originalText: SAMPLE_ZILLOW,
    expectedChange: 'kitchen emphasis (tone must NOT upgrade to Tier 1)',
  },
  {
    id: 3,
    lang: 'Chinese',
    script: 'Simplified',
    request: '删除学区信息，突出户外空间',
    translation: 'Remove school district info, highlight outdoor space',
    section: 'mls',
    originalText: SAMPLE_MLS,
    expectedChange: 'school removed, outdoor/deck/yard highlighted',
  },
  {
    id: 4,
    lang: 'Urdu',
    script: 'Nastaliq',
    request: 'پڑوس کی مزید تفصیلات شامل کریں',
    translation: 'Add more neighborhood details',
    section: 'zillow',
    originalText: SAMPLE_ZILLOW,
    expectedChange: 'more neighborhood context (only verified facts)',
  },
  {
    id: 5,
    lang: 'Spanish',
    script: 'Latin',
    request: 'Hazlo más corto y enfócate en los hechos',
    translation: 'Make it shorter and focus on facts',
    section: 'mls',
    originalText: SAMPLE_MLS,
    expectedChange: 'shorter, more fact-focused',
  },
  {
    id: 6,
    lang: 'Vietnamese',
    script: 'Latin',
    request: 'Làm ngắn hơn và tập trung vào sân ngoài',
    translation: 'Make it shorter and focus on the outdoor area',
    section: 'zillow',
    originalText: SAMPLE_ZILLOW,
    expectedChange: 'shorter, outdoor area focus',
  },
  {
    id: 7,
    lang: 'Telugu',
    script: 'Telugu',
    request: 'పాఠశాల సమాచారం తీసివేయండి',
    translation: 'Remove school information',
    section: 'instagram',
    originalText: SAMPLE_INSTAGRAM,
    expectedChange: 'school hashtag removed, other 5-7 hashtags preserved',
  },
  {
    id: 8,
    lang: 'Korean',
    script: 'Hangul',
    request: '더 짧게, 야외 공간 강조해줘',
    translation: 'Make it shorter, emphasize outdoor space',
    section: 'zillow',
    originalText: SAMPLE_ZILLOW,
    expectedChange: 'shorter, deck/yard/trails emphasis',
  },
]

// ── Banned word checker ────────────────────────────────────────────────────
const BANNED_WORDS = [
  'beautiful', 'stunning', 'meticulously', 'gracefully',
  'culinary masterpiece', 'culinary sanctuary', 'culinary atelier',
  'more than a home', 'where your story begins',
  'imagine', 'dream home', 'lovingly', 'loving',
  'magnificent', 'extraordinary', 'epitomizes', 'unrivaled',
  'affordable', 'entry point', 'price point', 'entry-level',
  'don\'t miss', 'act now', 'won\'t last', 'once in a lifetime',
]

function checkBannedWords(text) {
  const lower = text.toLowerCase()
  return BANNED_WORDS.filter(w => lower.includes(w.toLowerCase()))
}

function isEnglishOnly(text) {
  // Check for non-Latin/non-ASCII characters (beyond standard punctuation and numbers)
  // Allow: ASCII, common punctuation, $ € £, em-dash, smart quotes
  const nonEnglish = text.match(/[-ɏɐ-ͯͰ-ϿЀ-ӿ֐-׿؀-ۿऀ-ॿఀ-౿一-鿿가-힯᐀-ᙿ]/g)
  return { isEnglish: !nonEnglish || nonEnglish.length === 0, nonEnglishChars: nonEnglish || [] }
}

function countWords(text) {
  return text.trim().split(/\s+/).length
}

function hasExclamation(text) {
  return text.includes('!')
}

// ── Run one test ───────────────────────────────────────────────────────────
async function runTest(tc, client) {
  const isInstagram = tc.section === 'instagram'

  const systemPrompt = `${masterPromptRules}\n\n---\nYou are now REVISING an existing section.\nDo not regenerate from scratch.\n\nORIGINAL TEXT TO REVISE:\n${tc.originalText}\n\nREVISION REQUEST: ${tc.request}\n\nApply the revision request while strictly following ALL rules in the master prompt above.\nThe tier, tone, and compliance rules cannot be changed by the revision request.${isInstagram ? '\nHashtags (5-7) must always be included. Never remove hashtags when revising Instagram caption.' : ''}\nOutput only the revised section in English.`

  const promptLength = systemPrompt.length
  const masterPromptLength = masterPromptRules.length

  console.log(`\n[${tc.id}/8] ${tc.lang} — "${tc.request}"`)
  console.log(`  Translation: "${tc.translation}"`)
  console.log(`  masterPrompt length: ${masterPromptLength} chars`)
  console.log(`  Total prompt length: ${promptLength} chars`)
  console.log(`  Master included: ${promptLength > masterPromptLength ? 'YES ✓' : 'NO ✗'}`)

  const startTime = Date.now()

  try {
    const msg = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 700,
      messages: [{ role: 'user', content: systemPrompt }],
    })

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
    const output = msg.content[0]?.text?.trim() ?? ''
    const outputWords = countWords(output)

    // ── Checks ──────────────────────────────────────────────────────────
    const { isEnglish, nonEnglishChars } = isEnglishOnly(output)
    const bannedFound = checkBannedWords(output)
    const hasExcl = hasExclamation(output)

    // Check if request was reflected (rough keyword check)
    const lower = output.toLowerCase()
    let requestReflected = false
    let reflectionNote = ''

    if (tc.translation.toLowerCase().includes('school')) {
      const hasSchool = lower.includes('school') || lower.includes('loudoun county') || lower.includes('pyramid')
      requestReflected = !hasSchool
      reflectionNote = hasSchool ? 'School info still present' : 'School info removed ✓'
    } else if (tc.translation.toLowerCase().includes('outdoor') || tc.translation.toLowerCase().includes('outdoor area') || tc.translation.toLowerCase().includes('outdoor space')) {
      const hasDeck = lower.includes('deck') || lower.includes('yard') || lower.includes('outdoor') || lower.includes('backyard') || lower.includes('trail')
      requestReflected = hasDeck
      reflectionNote = hasDeck ? 'Outdoor emphasis present ✓' : 'Outdoor emphasis missing'
    } else if (tc.translation.toLowerCase().includes('shorter')) {
      const originalWords = countWords(tc.originalText)
      requestReflected = outputWords < originalWords * 0.85
      reflectionNote = `${outputWords} words vs ${originalWords} original (${Math.round(outputWords/originalWords*100)}%)`
    } else if (tc.translation.toLowerCase().includes('kitchen')) {
      const hasKitchen = lower.includes('kitchen') || lower.includes('quartz') || lower.includes('appliance')
      requestReflected = hasKitchen
      reflectionNote = hasKitchen ? 'Kitchen emphasis present ✓' : 'Kitchen emphasis missing'
    } else if (tc.translation.toLowerCase().includes('neighborhood')) {
      const hasNeighborhood = lower.includes('cascades') || lower.includes('lowes island') || lower.includes('sterling') || lower.includes('marketplace')
      requestReflected = hasNeighborhood
      reflectionNote = hasNeighborhood ? 'Neighborhood details present ✓' : 'Neighborhood details missing'
    } else if (tc.translation.toLowerCase().includes('fact')) {
      requestReflected = true // hard to auto-check, assume pass
      reflectionNote = 'Fact-focus: manual review needed'
    }

    // Instagram: check hashtag count
    let instagramHashtagNote = ''
    if (isInstagram) {
      const hashtags = (output.match(/#\w+/g) || [])
      const count = hashtags.length
      const hashtagOk = count >= 5 && count <= 7
      instagramHashtagNote = `Hashtags: ${count} (${hashtagOk ? 'PASS ✓' : 'FAIL ✗ — must be 5-7'})`
    }

    // ── Score ────────────────────────────────────────────────────────────
    let score = 10
    if (!isEnglish)          score -= 4
    if (bannedFound.length > 0) score -= 2
    if (hasExcl)             score -= 1
    if (!requestReflected)   score -= 2
    if (isInstagram && !(output.match(/#\w+/g) || []).length >= 5) score -= 1

    const pass = score >= 7 && isEnglish && bannedFound.length === 0

    console.log(`  Output: ${outputWords} words | ${elapsed}s`)
    console.log(`  English only: ${isEnglish ? 'YES ✓' : 'NO ✗'} ${nonEnglishChars.length > 0 ? `(found: ${nonEnglishChars.slice(0,5).join('')})` : ''}`)
    console.log(`  Banned words: ${bannedFound.length === 0 ? 'NONE ✓' : bannedFound.join(', ')}`)
    console.log(`  Exclamation: ${hasExcl ? 'FOUND ✗' : 'NONE ✓'}`)
    console.log(`  Request reflected: ${requestReflected ? 'YES ✓' : 'NO ✗'} — ${reflectionNote}`)
    if (isInstagram) console.log(`  ${instagramHashtagNote}`)
    console.log(`  Score: ${score}/10 | ${pass ? 'PASS ✓' : 'FAIL ✗'}`)

    return {
      tc,
      output,
      promptLength,
      masterPromptLength,
      outputWords,
      isEnglish,
      nonEnglishChars: nonEnglishChars.slice(0, 10),
      bannedFound,
      hasExclamation: hasExcl,
      requestReflected,
      reflectionNote,
      instagramHashtagNote,
      score,
      pass,
      elapsed,
      error: null,
    }
  } catch (err) {
    console.error(`  ERROR: ${err.message}`)
    return {
      tc,
      output: '',
      promptLength,
      masterPromptLength,
      outputWords: 0,
      isEnglish: false,
      nonEnglishChars: [],
      bannedFound: [],
      hasExclamation: false,
      requestReflected: false,
      reflectionNote: 'API error',
      instagramHashtagNote: '',
      score: 0,
      pass: false,
      elapsed: ((Date.now() - startTime) / 1000).toFixed(1),
      error: err.message,
    }
  }
}

// ── Build markdown report ──────────────────────────────────────────────────
function buildMarkdown(results) {
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19)
  const passed = results.filter(r => r.pass).length
  const totalScore = results.reduce((s, r) => s + r.score, 0)
  const avgScore = (totalScore / results.length).toFixed(1)

  let md = `# Multilingual Revision Test Report\n`
  md += `Generated: ${now}\n\n`
  md += `## Summary\n`
  md += `| Metric | Result |\n|---|---|\n`
  md += `| Tests run | ${results.length} |\n`
  md += `| PASS | ${passed} |\n`
  md += `| FAIL | ${results.length - passed} |\n`
  md += `| Average score | ${avgScore}/10 |\n`
  md += `| masterPrompt included | ${results.every(r => r.promptLength > r.masterPromptLength) ? 'ALL YES ✓' : 'SOME NO ✗'} |\n\n`

  md += `## Test Results\n\n`

  for (const r of results) {
    const { tc } = r
    md += `### [${r.pass ? 'PASS ✓' : 'FAIL ✗'}] Test ${tc.id}: ${tc.lang} (${tc.script})\n\n`
    md += `**Request:** \`${tc.request}\`\n`
    md += `**Translation:** "${tc.translation}"\n`
    md += `**Section:** ${tc.section} | **Expected:** ${tc.expectedChange}\n\n`

    md += `| Check | Result | Detail |\n|---|---|---|\n`
    md += `| masterPrompt included | ${r.promptLength > r.masterPromptLength ? '✓ YES' : '✗ NO'} | Total: ${r.promptLength.toLocaleString()} chars, Master: ${r.masterPromptLength.toLocaleString()} chars |\n`
    md += `| English only | ${r.isEnglish ? '✓ YES' : '✗ NO'} | ${r.nonEnglishChars.length > 0 ? `Non-English chars: ${r.nonEnglishChars.join('')}` : 'Clean'} |\n`
    md += `| No banned words | ${r.bannedFound.length === 0 ? '✓ PASS' : '✗ FAIL'} | ${r.bannedFound.length === 0 ? 'None found' : r.bannedFound.join(', ')} |\n`
    md += `| No exclamation marks | ${r.hasExclamation ? '✗ FAIL' : '✓ PASS'} | ${r.hasExclamation ? 'Found !' : 'Clean'} |\n`
    md += `| Request reflected | ${r.requestReflected ? '✓ YES' : '✗ NO'} | ${r.reflectionNote} |\n`
    if (tc.section === 'instagram') {
      md += `| Instagram hashtags | ${r.instagramHashtagNote} | — |\n`
    }
    md += `\n`

    md += `**Score: ${r.score}/10**\n`
    md += `**Response time:** ${r.elapsed}s | **Output:** ${r.outputWords} words\n\n`

    if (r.error) {
      md += `> ⚠️ API Error: ${r.error}\n\n`
    } else {
      md += `<details>\n<summary>Full output (click to expand)</summary>\n\n`
      md += `\`\`\`\n${r.output}\n\`\`\`\n\n</details>\n\n`
    }
    md += `---\n\n`
  }

  // ── Pass/fail table ──────────────────────────────────────────────────────
  md += `## Quick Reference Table\n\n`
  md += `| # | Language | PASS/FAIL | English | Banned | Request | Score |\n`
  md += `|---|---|---|---|---|---|---|\n`
  for (const r of results) {
    md += `| ${r.tc.id} | ${r.tc.lang} | ${r.pass ? '✓ PASS' : '✗ FAIL'} | ${r.isEnglish ? '✓' : '✗'} | ${r.bannedFound.length === 0 ? '✓' : `✗ (${r.bannedFound.join(', ')})`} | ${r.requestReflected ? '✓' : '✗'} | ${r.score}/10 |\n`
  }
  md += '\n'

  return md
}

// ── Main ───────────────────────────────────────────────────────────────────
async function main() {
  console.log('='.repeat(60))
  console.log('Multilingual AI Revision Test — 8 Languages')
  console.log('='.repeat(60))
  console.log(`masterPromptRules length: ${masterPromptRules.length.toLocaleString()} chars`)
  console.log(`Sample property: Sterling Lowes Island, VA ($749K SFH)`)
  console.log('='.repeat(60))

  const client = new Anthropic({ apiKey: API_KEY })
  const results = []

  for (const tc of TEST_CASES) {
    const result = await runTest(tc, client)
    results.push(result)
    // small delay between calls to avoid rate limiting
    await new Promise(r => setTimeout(r, 1000))
  }

  console.log('\n' + '='.repeat(60))
  console.log('FINAL SUMMARY')
  console.log('='.repeat(60))
  const passed = results.filter(r => r.pass).length
  const avgScore = (results.reduce((s, r) => s + r.score, 0) / results.length).toFixed(1)
  console.log(`Passed: ${passed}/${results.length}`)
  console.log(`Average score: ${avgScore}/10`)
  results.forEach(r => {
    console.log(`  [${r.pass ? 'PASS' : 'FAIL'}] ${r.tc.lang}: ${r.score}/10`)
  })

  const md = buildMarkdown(results)
  const outPath = new URL('./multilingual_revision_test.md', import.meta.url).pathname
  fs.writeFileSync(outPath, md, 'utf8')
  console.log(`\nReport saved: ${outPath}`)
}

main().catch(console.error)
