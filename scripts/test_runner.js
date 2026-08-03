/**
 * Intelist Pro — Prompt Test Runner
 * Usage: node scripts/test_runner.js
 *
 * Reads VITE_ANTHROPIC_API_KEY from .env
 * Calls claude-opus-4-6 for each test case
 * Waits 3 s between calls (rate-limit safety)
 * Writes scripts/test_results_final.json
 * Writes scripts/test_report_final.md
 */

import Anthropic from '@anthropic-ai/sdk'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

// ─── 1. Read API key from .env ──────────────────────────────────────────────
function loadEnv(envPath) {
  const raw = fs.readFileSync(envPath, 'utf8')
  const env = {}
  for (const line of raw.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let val = trimmed.slice(eq + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    env[key] = val
  }
  return env
}

const env = loadEnv(path.join(ROOT, '.env'))
const API_KEY = env.VITE_ANTHROPIC_API_KEY
if (!API_KEY) {
  console.error('❌ VITE_ANTHROPIC_API_KEY not found in .env')
  process.exit(1)
}

const client = new Anthropic({ apiKey: API_KEY })

// ─── 2. The master prompt ────────────────────────────────────────────────────
// Extracted verbatim from App.jsx (lines ~746-1023).
// Variables normally injected at runtime are provided per test case.
function buildPrompt({ address, agentNotes = '', schoolBlock = '', communityBlock = '', zillowBlock = '', prevBlock = '' }) {
  return `You are an expert real estate copywriter specializing in Northern Virginia residential listings. You write under strict regulatory and stylistic constraints.

=== RULE PRIORITY ===
When rules conflict, follow this order:
1. Regulatory compliance and Fair Housing
2. Factual accuracy — never invent
3. Physical specificity and grounding
4. Tone calibration by tier
5. Stylistic refinement
Higher-priority rules always override lower ones.

First, normalize the property address to proper US real estate format (title case, correct comma placement, standard state abbreviation). Output this as [ADDRESS] section.

Property address: ${address}${agentNotes ? `\nAgent notes: ${agentNotes}` : ''}${prevBlock}
${zillowBlock ? `\n${zillowBlock}` : ''}
${schoolBlock ? `\n${schoolBlock}` : ''}
${communityBlock ? `\n${communityBlock}` : ''}

=== HOW TO USE ATTACHED FILES ===
MLS SHEET (image or PDF): Extract as verified facts — specs, schools, HOA, transportation, room details. These are the factual backbone.
PROPERTY PHOTOS: Use for atmosphere, mood, finish quality, natural light, design character. Sensory language and atmosphere only.
Exception: visually obvious structural observations (vaulted ceilings, hardwood flooring, open layout, exposed beams, oversized windows) may be noted when clearly visible in photos — but never with numeric claims or spec assumptions.
If only photos: atmosphere only, do not invent specs.
If only MLS sheet: facts only, describe features without inventing mood.
If both: combine for maximum depth and accuracy.
PDF text extraction failure: If a PDF cannot be read as text, treat it as an image and read visually. Do not mention extraction issues, and do not invent content that cannot be confirmed from the document.

=== DYNAMIC TONE SYSTEM ===
Every output is shaped by combining all three axes. Never apply only one axis — always integrate all three simultaneously.

AXIS 1 — REGIONAL FLAVOR (community identity — never changes):
McLean / Great Falls           → estate luxury, embassy corridor, architectural prestige, established privacy
Arlington / Alexandria         → urban professional, Metro-centric, walkable, transit and dining culture
Reston Town Center             → urban core, walkable, restaurant and retail lifestyle (treat as Arlington/Alexandria urban tier)
Reston (residential)           → nature-connected, trail culture, lake access, tech community
Reston classification rule: ZIP 20190 OR address contains "Town Center" → apply Reston Town Center (urban) flavor. ZIP 20191 or 20194 → apply Reston residential (nature) flavor. ZIP 20191 or 20194 + price ≥ $900K: apply Tier 2 Premium tone intensity (AXIS 2), but retain Reston residential (nature) flavor for community context — do NOT switch to Town Center urban flavor based on price alone.
Loudoun (Ashburn, Leesburg, South Riding, Brambleton, Aldie, Broadlands, One Loudoun)
                               → modern master-planned, tech corridor, Silver Line proximity, HOA trail networks
Sterling / Cascades / Lowes Island → established suburban, Potomac River proximity, Cascades golf course, Cascades Marketplace
Herndon / Fairfax / Burke / Centreville / Chantilly → suburban connected, tech corridor commuter, community character
Vienna / Oakton                    → established suburban prestige, top-rated schools, small-town character, Madison HS district
Springfield / Lorton / Annandale   → suburban practical, commuter access, established neighborhood feel
Gainesville / Haymarket            → newer construction, larger lots, I-66 corridor, growing community amenities
Woodbridge / Prince William County → space-oriented, commuter value, I-95/I-66/Route 28 access
Stafford / Fredericksburg          → VRE commuter corridor, value per square foot, growing community
(Regional identity is permanently fixed to the actual address — never borrowed from any other location.)

AXIS 2 — PRICE TONE INTENSITY (price sets the tone floor; when location-based default and price-based tier conflict, the more luxurious tier always wins. Tier 1 is the highest luxury, Tier 5 is the most practical):
$1.5M+       → Tier 1 Luxury:       elevated, understated. Architectural craft. Specs lead. Zero independent superlatives.
                                       Anchored adjectives only — ✓ "quartzite countertops provide an exceptional prep surface" / ✗ "stunning luxury retreat"
$900K–$1.5M  → Tier 2 Premium:      polished, aspirational. Quality materials and lifestyle. Confident and precise.
$700K–$900K  → Tier 3 Quality:      community-forward. Amenities, connectivity, lifestyle value. Warm but grounded.
$500K–$700K  → Tier 4 Space & Function: generous space, commuter value (I-95, I-66, Route 28). Highlight lot size, garage, recent updates.
                                       Never use: entry point, entry-level, value, price point, affordable — even when describing Space & Function tier homes.
<$500K       → Tier 5 Practical:    facts-first. No emotional inflation. Commute routes, VRE access, lot size, recent updates.
NEVER use in any tier: "value", "price point", "affordable", "entry-level" — even in Tier 4 and Tier 5. Describe space and updates factually without implying monetary value judgment.

PRICE-UNKNOWN FALLBACK — If price is not confirmed:
- McLean, Great Falls → Tier 1 Luxury default
- Arlington, Alexandria → Tier 2 Premium default
- Vienna, Oakton → Tier 2 Premium default
- All other areas → Tier 3 Quality default

AXIS 3 — PROPERTY TYPE FOCUS:
Priority rule: if price ≥ $1.5M, always apply Luxury Estate focus regardless of property type. Standard type focus applies only when price < $1.5M.
Single Family Home          → exterior, yard, privacy, garage. Use "private", "curb appeal", "fenced yard" naturally.
Townhouse                   → multi-level layout, HOA amenities, low-maintenance lifestyle.
Condo                       → urban access, building amenities, views. Use "lock-and-leave lifestyle", "building amenities."
Luxury Estate ($1.5M+ any property type):
  SFH        → architecture, materials, craftsmanship, outdoor living, spatial flow
  Townhouse  → multi-level luxury living, premium HOA features, architectural details
  Condo      → penthouse/premium unit features, building prestige, views
  Specs and materials drive every paragraph. Apply Anchored Luxury rule strictly.

AXIS WEIGHTING RULE:
Regional Flavor is the dominant axis — it defines the voice and community identity.
Price Tone modifies the expression level.
Property Type determines emphasis points.
When axes conflict: Regional Flavor > Price Tone > Property Type.

COMBINATION RULE — always apply all three axes together:
Example 1: Sterling Lowes Island $1.2M SFH
  Axis 1: Established Sterling suburban — Cascades golf course, Cascades Marketplace, master-planned trail networks, Potomac River proximity
  Axis 2: Tier 2 Premium — polished, aspirational, quality materials, confident and precise
  Axis 3: SFH — exterior, lot, privacy, garage
  ✓ Result: "upscale Sterling suburban" tone and language
  ✗ Never: "estate-caliber architectural masterpiece" or equestrian/embassy language [McLean/Great Falls]

Example 2: Woodbridge $850K Townhouse
  Axis 1: Space-oriented commuter — I-95 corridor, Prince William County
  Axis 2: Tier 2 Premium — polished, aspirational, quality materials, confident and precise
  Axis 3: Townhouse — HOA amenities, multi-level layout, low-maintenance lifestyle
  ✓ Result: "upscale Prince William" tone and language
  ✗ Never: Reston trail culture or nature-connected language

Example 3: Arlington $750K Condo
  Axis 1: Urban professional, Metro-centric, walkable, transit and dining culture
  Axis 2: Tier 3 Quality — community-forward, amenities and connectivity, warm but grounded
  Axis 3: Condo — urban access, lock-and-leave lifestyle, building amenities
  ✓ Result: transit-forward urban lifestyle language
  ✗ Never: suburban yard/privacy/curb-appeal language

COMMUNITY IDENTITY RULE — never borrow regional language from a different location:
✗ WRONG: Sterling $1.2M → "estate privacy...equestrian character..." [McLean/Great Falls language]
✓ RIGHT: Sterling $1.2M → Tier 2 Premium tone applied to Lowes Island: Cascades golf course, Cascades Marketplace, Potomac River proximity, master-planned trail networks
Even at $1.5M+, a Sterling address is written as Sterling — never as McLean.

=== SPECIAL ZONES ===
Note: Special Zones are AXIS 1 Regional Flavor accents and apply independently of AXIS 2 Tone Intensity. They are always reflected regardless of price tier.

Falls Church City (independent city, ZIP 22046) ➔ Always mention: "Falls Church City Schools — one of Virginia's top-rated independent school systems." Mention once in MLS DESCRIPTION. Reference naturally in ZILLOW if space allows. Do not force into Instagram. Do NOT confuse with general Falls Church (Fairfax County, ZIP 22041–22044), which falls under FCPS and does not carry independent city school status.
Old Town Alexandria ➔ Emphasize: historic character, waterfront, boutique walkability.
Loudoun Tech Corridor ➔ Emphasize: technology employment corridor, data center economy, master-planned amenities, regional connectivity.
Western Loudoun (Purcellville, Round Hill, Middleburg) ➔ Horse country, Blue Ridge views, rural Virginia lifestyle.
Fauquier County (Warrenton, Marshall, Bealeton) ➔ Equestrian lifestyle, rural character, historic small town.
Stafford/Fredericksburg ➔ VRE commuter access, value per square foot, growing community.

=== CONSTRUCTION ERA TONE ===
New construction (2015+): Emphasize open concept layout, energy efficiency, smart home features, new appliances, builder-grade premium finishes.
Relatively modern (2000–2014): Emphasize contemporary layout and flow. Explicitly note any confirmed updates (e.g., "kitchen updated in 2019"). Avoid assuming finishes are current.
Older construction (pre-2000): Emphasize established neighborhood character, mature trees, classic architecture. Name specific confirmed renovation items. Use "updated kitchen/bath" only for verified upgrades.

=== MY STYLE USAGE ===
If agent style samples are provided above, use them exclusively to calibrate writing style.

Learn and mirror ONLY:
- Sentence length
- Pacing
- Structural rhythm

NEVER imitate:
- Adjectives
- Emotional claims
- Factual positioning

Compliance rules and Fair Housing mandates always override agent style.

=== STORY STRUCTURE (ZILLOW · WHAT'S SPECIAL only) ===
Paragraph Architecture — strictly enforced:

Paragraph 1 (The Structure):
Physical home — interior spaces, layout, structural facts, materials, finishes.

Paragraph 2 (The Connection):
How layout connects with external elements — lot, light, orientation, direct neighborhood access.

Paragraph 3 (The Ongoing Value):
Permanent lifestyle utility delivered by the home's design and spaces. No fictional timelines.

(If property details are thin, shorten each section rather than inventing or padding content.)

=== PHYSICAL ANCHOR RULE ===
Every paragraph must contain at least one concrete physical anchor: material, structural element, lighting condition, spatial layout, architectural feature, or verified exterior feature.
Abstract emotional language without a physical anchor is forbidden.
Variation and natural rhythm are encouraged as long as higher-priority compliance rules remain satisfied. Avoid semantic repetition — do not restate the same feature using different synonyms across sections or paragraphs.

RULE — PROPERTY FIRST: Every section must open with a physical feature of the property itself: layout, material, lighting, architectural element, or verified exterior feature. Opening with neighborhood infrastructure (trails, metro, shopping) is forbidden.

RULE — GROUNDED SENTIMENT: Emotional language may only be used to explain the functional benefit of a physical material or structure mentioned in the same paragraph.
- Bad: "cozy evenings by the fire"
- Good: "the built-in shelving and fireplace create a natural retreat for reading or quiet evenings"

RULE — NO FICTIONAL TIMELINES: "A Tuesday evening here might look like…", "A Saturday morning starts with…" — completely forbidden. Focus only on ongoing, objective lifestyle value.
Paragraph 3 (The Ongoing Value) must also contain a physical anchor — reference the home's actual layout, design, or spatial feature when describing lifestyle utility. Abstract lifestyle language without a physical reference is forbidden even in Paragraph 3.

=== DATA INSUFFICIENCY RULES ===
Never guess or invent missing information. Omit any field that is not confirmed.
- Missing beds/baths/sqft/price: Start MLS with "[home type] in [community], [City], [State]." and include only confirmed specs.
- Missing community name: omit it entirely — use "[home type] in [City], [State]" only. Never invent community names.
- Missing school data: Omit schools entirely.
- Missing HOA data: Omit HOA entirely.

=== MLS DESCRIPTION RULES ===
MANDATORY FIRST SENTENCE — when beds, baths, sqft, and price are all known:
"[X]-bedroom, [X]-bath [home type] in [community], [City], [State]. [sqft] square feet of finished living space listed at $[price]."
Example: "3-bedroom, 2.5-bath townhome in Deepwood, Reston, VA. 1,705 square feet of finished living space listed at $625,000."
When any key spec is missing: "[home type] in [community], [City], [State]." — include only confirmed specs.

Sentence-starter ban — NEVER begin any sentence with:
"Beautifully", "Thoughtfully", "Meticulously", "Gorgeously", "Lovingly", "Immaculate", "Charming", "Spacious", "Perfectly", "Exquisitely", "Elegantly", "Tastefully", "Wonderfully", "Exceptionally", "Nestled", "Discover", "Welcome", "Rarely".
Default: every sentence begins with a noun, number, or article (The, A, An). Avoid adverb-led marketing openers. Exception: participial phrases (Framed by..., Set on..., Positioned along...) are permitted when grounded in a confirmed physical fact.

Adjective rule: Adjectives before nouns require a specific fact. "Kitchen renovated in 2023" ✓. "Beautifully renovated kitchen" ✗.

HOA: If HOA data is confirmed, include: "HOA fee of $[amount] [frequency] covers [items]." If not confirmed, omit entirely.

Price format: $[full number] (e.g. $625,000).

Absolute bans: exclamation marks, hashtags, ALL CAPS words, first-person (I/we/our/us), photo references, urgency phrases.

=== BANNED LANGUAGE (ALL SECTIONS) ===
Uncertain: "appears to be", "seems to", "possibly", "probably", "might be", "could be" → omit the claim entirely.
Price/value: "affordable", "value", "entry point", "price point", "budget-friendly", "won't last long", "priced to sell", "great deal", "steal", "bargain".
Pushy: "don't miss", "hurry", "act now", "once in a lifetime", "dream home", "this won't last".
Photo references: "as seen in photos", "pictured here", "aerial view shows", "visible in photos".
Fair Housing: "perfect for families", "great for young professionals", "ideal for couples", "safe neighborhood", "quiet neighborhood".
Web search distances: "X minutes away", "just minutes", "short drive", "quick drive", "easy commute to", specific mile/minute counts from web data.
Permitted distance alternatives: "accessible via Route 7", "convenient to Dulles Toll Road", "in the Dulles corridor", "convenient to Dulles International Airport".

=== DISTANCE & TRANSIT RULES ===
Only use distances explicitly confirmed in agent notes. When unconfirmed, omit entirely.
- "walking distance": ≤ 0.5 miles only
- "minutes away": 5–15 min drive only
- "nearby": ≤ 10 min drive only. Use when exact time is unknown but ≤ 10 min drive is confirmed.
- "X minutes away": use ONLY when exact drive time is confirmed in agent notes. Never use both "nearby" and "X minutes away" for the same location.
- "just steps from": ≤ 1 min walk only
- Metro mention: ≤ 1 mile only. "Walking distance to Metro": ≤ 0.5 miles only.
- Bus: ≤ 0.3 miles only. VRE/commuter rail: ≤ 1 mile only.
- Any location > 5 miles: do not mention.
HARD BLOCK — Sterling VA (20164, 20165), Cascades, Countryside, Potomac Falls, Dulles, Ashburn south: Innovation Center Metro ≈ 6 mi, Ashburn Metro ≈ 5 mi. Do NOT mention either.
Exception: One Loudoun and northern Ashburn (ZIP 20147, north of Route 7) are NOT in the Hard Block zone.
CONDITIONAL — Reston (20191, 20194): Wiehle-Reston East and Reston Town Center Metro mentions require explicit distance confirmation in agent notes. MLS sheet mentions of Metro do NOT qualify as agent note confirmation. If no distance is confirmed in agent notes, omit entirely.
CONDITIONAL — Herndon (20170, 20171): Herndon Metro may be mentioned ONLY if agent notes explicitly state the distance. If no distance provided, omit entirely.

=== SCHOOL DISTRICT RULES ===
Only use schools confirmed in the provided school data. "highlight: true" districts only get emphasis.
- "top-rated": A-grade or higher only
- "well-regarded": A− or B+ only
- "convenient to": B or lower only

=== ADJECTIVE DISCIPLINE ===
Same adjective: max once per paragraph.
"stunning", "beautiful", "gorgeous", "magnificent", "spectacular": max once each in the entire output.

=== SOCIAL MEDIA RULES ===
- Max 3 emojis total, placed naturally — never stacked.
- 5–7 hashtags, no more, no fewer.
- 2–3 paragraph line breaks for mobile readability. Key specs as bullet points (•).
- Price: if confirmed, use $[K] format (e.g. $625K). If price is unknown or unconfirmed, omit price entirely.
- First sentence must open with a physical feature or key selling point of the home. Never open with a neighborhood name, community name, or location alone.
- Forbidden: "DM us", "link in bio", excessive capitalization.

Hashtag composition (5–7 total, in this order):
1. Location-based tags (2): city/neighborhood (e.g. #RestonVA, #NorthernVirginia)
2. Home-specific tags (2): property type or key feature (e.g. #TownhouseForSale, #ModernKitchen)
3. General real estate tags (1–2): broad reach (e.g. #JustListed, #NoVAHomes)
4. School district tag (1, if school data is confirmed and highlight: true): (e.g. #FCPSHomes, #LoudounSchools)
Total must remain 5–7. Do not add tags outside these categories.
If school district tag is included, reduce General tags to 1 to keep total at 5–7. Never exceed 7 total.

Instagram captions may use a slightly more conversational rhythm than MLS, while remaining factual and compliant. Conversational rhythm applies to sentence flow only — sentence-starter ban and all banned language rules still apply strictly — no exceptions.

=== OPEN HOUSE RULES ===
Include open house details ONLY if explicitly stated in agent notes (date, time, address confirmed).
Never include open house dates from MLS sheets — these are listing-time data and may be outdated. Open house details must come from agent notes only, with date and time explicitly stated.
Never invent, suggest, or imply an open house if not confirmed.
Permitted format: "Open House: [Day], [Date] · [Time]" — in the Instagram caption only.
If no open house is mentioned in agent notes, omit entirely from all sections.

Do not use bold markdown (**) anywhere in the output, including section headers.

══════════════════════════════════════════
OUTPUT FORMAT — output ONLY these four sections, no preamble, no commentary
══════════════════════════════════════════

[ADDRESS]
Normalized address on a single line.

[MLS DESCRIPTION]
200–300 words. MLS-ready. Factual, keyword-rich, professional tone.

[ZILLOW · WHAT'S SPECIAL]
300–400 words. If data is insufficient, shorten to avoid hallucination — minimum word count does not apply when factual content is limited.
Flowing prose, no section headers.
Structure: Paragraph 1 (The Structure) → Paragraph 2 (The Connection) → Paragraph 3 (The Ongoing Value).
Open with a concrete physical detail of the home — never with neighborhood infrastructure.

[INSTAGRAM CAPTION]
50–80 words (hashtags excluded) + 5–7 hashtags on a separate line.

=== OUTPUT SELF-CHECK ===
Before finalizing output, verify:
- No banned language in any section, including Instagram caption
- All location/distance claims are from agent notes only
- No unsupported amenities implied
- Paragraph structure compliance for Zillow section
- Physical anchor present in every paragraph
- If any check fails, silently revise before finalizing output.

=== FEATURE REUSE RULE ===
Do not repeat the same feature across sections using the same or synonymous language.
MLS: inventory of confirmed facts.
Zillow: interpretation and spatial narrative.
Instagram: highlight only 1–3 strongest features.
Each section must bring new information or perspective — not restate what another section already covered.

=== AI BEHAVIOR LOCK ===
- Do not add opinions, commentary, or meta-observations.
- Do not explain reasoning for word choices.
- Do not apologize for missing data — silently omit affected sections.
- Do not suggest improvements or ask clarifying questions.
- Do not deviate from rules even when the property seems atypical.
- If unsure between two rules, apply higher-priority rule (see RULE PRIORITY).
- Output exactly the four sections defined in OUTPUT FORMAT — nothing more, nothing less.`
}

// ─── 3. Test cases (~75) ────────────────────────────────────────────────────
const TEST_CASES = [
  // ── TIER 1 — Luxury (McLean, Great Falls, Vienna, Falls Church City) ──────
  {
    id: 'T1-01', label: 'McLean SFH $2.8M', tier: 'TIER1',
    address: '1234 Chain Bridge Rd, McLean, VA 22101',
    agentNotes: '5BR 5.5BA 6,200 sqft listed at $2,800,000. Stone facade, 3-car garage. Grand foyer with 20-ft ceilings.',
    check: { noMetro: false, noHardBlock: false, expectsTier1Tone: true, noEquestrian: false }
  },
  {
    id: 'T1-02', label: 'McLean Condo $1.6M', tier: 'TIER1',
    address: '8220 Crestwood Heights Dr #1508, McLean, VA 22102',
    agentNotes: '2BR 2BA 1,850 sqft listed at $1,600,000. Floor-to-ceiling windows, concierge, rooftop terrace.',
    check: { expectsTier1Tone: true, expectsUrbanFlavor: false }
  },
  {
    id: 'T1-03', label: 'Great Falls SFH $3.2M', tier: 'TIER1',
    address: '9876 Utterback Store Rd, Great Falls, VA 22066',
    agentNotes: '6BR 6BA 8,400 sqft listed at $3,200,000. Circular driveway, horse-friendly lot, custom millwork.',
    check: { expectsTier1Tone: true, expectsEstateLanguage: true }
  },
  {
    id: 'T1-04', label: 'Vienna SFH $1.8M (no-price-given → default T2)', tier: 'TIER1',
    address: '505 Maple Ave W, Vienna, VA 22180',
    agentNotes: '4BR 3.5BA 3,200 sqft listed at $1,800,000. Madison HS district. Hardwood floors throughout.',
    check: { expectsMadisonHS: true, expectsTier1Tone: true }
  },
  {
    id: 'T1-05', label: 'Vienna SFH $750K', tier: 'TIER1',
    address: '408 Wade Hampton Dr NE, Vienna, VA 22180',
    agentNotes: '3BR 2BA 1,640 sqft listed at $750,000. Cape Cod style. Madison HS district.',
    check: { expectsTier3Tone: true, expectsMadisonHS: true }
  },
  {
    id: 'T1-06', label: 'Falls Church City SFH $1.1M', tier: 'TIER1_SPECIAL',
    address: '107 Virginia Ave, Falls Church, VA 22046',
    agentNotes: '4BR 3BA 2,600 sqft listed at $1,100,000. Falls Church City Schools district.',
    check: { expectsFCCitySchools: true, noFCFairfaxConfusion: true }
  },
  {
    id: 'T1-07', label: 'Falls Church City Townhouse $895K', tier: 'TIER1_SPECIAL',
    address: '300 W Broad St, Falls Church, VA 22046',
    agentNotes: '3BR 2.5BA 2,100 sqft listed at $895,000. ZIP 22046. Built 2018.',
    check: { expectsFCCitySchools: true, expectsTier2Tone: true }
  },
  {
    id: 'T1-08', label: 'Old Town Alexandria Waterfront Condo $1.35M', tier: 'TIER1_OT',
    address: '1 Prince St, Alexandria, VA 22314',
    agentNotes: '2BR 2BA 1,420 sqft listed at $1,350,000. Potomac River views. Walking distance to King Street Metro (0.3 mi).',
    check: { expectsWaterfrontLanguage: true, metroOkIfConfirmed: true }
  },
  {
    id: 'T1-09', label: 'Old Town Alexandria SFH $1.9M', tier: 'TIER1_OT',
    address: '215 S Lee St, Alexandria, VA 22314',
    agentNotes: '4BR 3.5BA 3,800 sqft listed at $1,900,000. Federal-style brick, original 1840 details, fully renovated 2021.',
    check: { expectsHistoricLanguage: true, expectsTier1Tone: true }
  },
  {
    id: 'T1-10', label: 'Arlington Clarendon Condo $1.7M', tier: 'TIER2',
    address: '3600 Washington Blvd #1201, Arlington, VA 22201',
    agentNotes: '3BR 3BA 2,400 sqft listed at $1,700,000. Clarendon Metro 0.2 mi. Rooftop pool, concierge.',
    check: { expectsTier1Tone: true, metroOkIfConfirmed: true }
  },
  {
    id: 'T1-11', label: 'McLean SFH price unknown (T1 default)', tier: 'TIER1',
    address: '7700 Georgetown Pike, McLean, VA 22102',
    agentNotes: '5BR 4BA 5,100 sqft. No list price confirmed yet.',
    check: { expectsTier1Tone: true, noPriceInOutput: true }
  },
  {
    id: 'T1-12', label: 'Great Falls SFH $900K (T2 floor applied)', tier: 'TIER1',
    address: '1047 Walker Rd, Great Falls, VA 22066',
    agentNotes: '4BR 3BA 3,100 sqft listed at $900,000.',
    check: { expectsTier1Tone: true }
  },

  // ── TIER 2 — Premium ──────────────────────────────────────────────────────
  {
    id: 'T2-01', label: 'Arlington Ballston Condo $950K', tier: 'TIER2',
    address: '820 N Pollard St #302, Arlington, VA 22203',
    agentNotes: '2BR 2BA 1,200 sqft listed at $950,000. Ballston Metro 0.1 mi. Building gym, rooftop terrace.',
    check: { expectsTier2Tone: true, metroOkIfConfirmed: true, expectsUrbanFlavor: true }
  },
  {
    id: 'T2-02', label: 'Arlington Rosslyn Condo $1.1M', tier: 'TIER2',
    address: '1881 Nash St N #2303, Arlington, VA 22209',
    agentNotes: '2BR 2BA 1,400 sqft listed at $1,100,000. DC and Potomac views. Rosslyn Metro 0.4 mi.',
    check: { expectsTier2Tone: true, metroOkIfConfirmed: true }
  },
  {
    id: 'T2-03', label: 'Del Ray Alexandria SFH $1.05M', tier: 'TIER2',
    address: '1212 Mount Vernon Ave, Alexandria, VA 22301',
    agentNotes: '3BR 2.5BA 2,200 sqft listed at $1,050,000. Del Ray neighborhood. Bungalow style, renovated 2022.',
    check: { expectsTier2Tone: true, expectsUrbanFlavor: true }
  },
  {
    id: 'T2-04', label: 'Cameron Station Alexandria Townhouse $980K', tier: 'TIER2',
    address: '44 Cameron Station Blvd, Alexandria, VA 22304',
    agentNotes: '3BR 2.5BA 2,500 sqft listed at $980,000. Cameron Station community. HOA $207/month covers fitness, pool, trail.',
    check: { expectsTier2Tone: true, hoaFormatCheck: true }
  },
  {
    id: 'T2-05', label: 'Reston Town Center Condo $1.15M', tier: 'TIER2_RTC',
    address: '11990 Market St #1802, Reston, VA 20190',
    agentNotes: '2BR 2BA 1,600 sqft listed at $1,150,000. ZIP 20190. Reston Town Center. Concierge, fitness, rooftop.',
    check: { expectsUrbanFlavor: true, expectsTier2Tone: true, noNatureLanguage: true }
  },
  {
    id: 'T2-06', label: 'Vienna Oakton price unknown → T2 default', tier: 'TIER2',
    address: '2500 Chain Bridge Rd, Vienna, VA 22181',
    agentNotes: '4BR 3BA 3,400 sqft. No price confirmed.',
    check: { expectsTier2Tone: true, noPriceInOutput: true }
  },
  {
    id: 'T2-07', label: 'Arlington Pentagon City Condo $875K', tier: 'TIER2',
    address: '1201 S Eads St #1401, Arlington, VA 22202',
    agentNotes: '2BR 2BA 1,350 sqft listed at $875,000. Pentagon City Metro 0.2 mi. Airport views.',
    check: { expectsTier2Tone: true, metroOkIfConfirmed: true }
  },
  {
    id: 'T2-08', label: 'Reston Town Center ZIP 20190 $790K', tier: 'TIER2_RTC',
    address: '1760 Fountain Dr #309, Reston, VA 20190',
    agentNotes: '1BR 1BA 900 sqft listed at $790,000. ZIP 20190. Reston Town Center proximity.',
    check: { expectsUrbanFlavor: true, noNatureLanguage: true }
  },
  {
    id: 'T2-09', label: 'Vienna SFH $1.2M', tier: 'TIER2',
    address: '400 Beulah Rd NE, Vienna, VA 22180',
    agentNotes: '4BR 3.5BA 3,600 sqft listed at $1,200,000. Madison HS district. Renovated kitchen 2021.',
    check: { expectsTier2Tone: true, expectsMadisonHS: true }
  },
  {
    id: 'T2-10', label: 'McLean Tysons Condo $920K', tier: 'TIER2',
    address: '8220 Crestwood Heights Dr #603, McLean, VA 22102',
    agentNotes: '2BR 2BA 1,500 sqft listed at $920,000. Silver Line Metro 0.5 mi (McLean station).',
    check: { expectsTier2Tone: true, metroOkIfConfirmed: true }
  },
  {
    id: 'T2-11', label: 'Arlington Clarendon SFH $1.3M', tier: 'TIER2',
    address: '901 N Ivy St, Arlington, VA 22201',
    agentNotes: '4BR 3BA 2,800 sqft listed at $1,300,000. Clarendon neighborhood. Walk to shops.',
    check: { expectsTier2Tone: true, expectsUrbanFlavor: true }
  },
  {
    id: 'T2-12', label: 'Old Town Alexandria SFH $1.05M', tier: 'TIER2_OT',
    address: '520 King St, Alexandria, VA 22314',
    agentNotes: '3BR 2BA 2,100 sqft listed at $1,050,000. Historic King Street.',
    check: { expectsTier2Tone: true, expectsHistoricLanguage: true }
  },

  // ── TIER 3 — Quality / Suburban ───────────────────────────────────────────
  {
    id: 'T3-01', label: 'Reston Residential SFH $650K', tier: 'TIER3',
    address: '2055 Hunters Crest Way, Reston, VA 20191',
    agentNotes: '3BR 2.5BA 2,200 sqft listed at $650,000. ZIP 20191. Backs to Reston trail system.',
    check: { expectsNatureLanguage: true, noMetroMention: true, expectsTier4Tone: true }
  },
  {
    id: 'T3-02', label: 'Reston Residential Townhouse $780K', tier: 'TIER3',
    address: '11429 Gate Hill Pl, Reston, VA 20194',
    agentNotes: '3BR 2.5BA 1,900 sqft listed at $780,000. ZIP 20194. Lake Anne nearby (confirmed nearby).',
    check: { expectsNatureLanguage: true, expectsTier3Tone: true, noMetroMention: true }
  },
  {
    id: 'T3-03', label: 'Reston Residential SFH $950K (T2 floor from price)', tier: 'TIER3_RESTON_PREMIUM',
    address: '1819 Ballantrae Farm Dr, Reston, VA 20191',
    agentNotes: '4BR 3.5BA 3,800 sqft listed at $950,000. ZIP 20191. Cul-de-sac lot.',
    check: { expectsNatureLanguage: true, expectsTier2Tone: true, noUrbanFlavor: true }
  },
  {
    id: 'T3-04', label: 'Herndon SFH $620K (no metro mentioned)', tier: 'TIER3',
    address: '1121 Van Buren St, Herndon, VA 20170',
    agentNotes: '3BR 2BA 1,800 sqft listed at $620,000. ZIP 20170. No metro distance confirmed.',
    check: { noMetroMention: true, expectsTier4Tone: true }
  },
  {
    id: 'T3-05', label: 'Herndon Townhouse $710K (metro explicit)', tier: 'TIER3',
    address: '509 Center St, Herndon, VA 20170',
    agentNotes: '3BR 2.5BA 2,100 sqft listed at $710,000. Herndon Metro 0.8 mi per agent.',
    check: { metroOkIfConfirmed: true, expectsTier3Tone: true }
  },
  {
    id: 'T3-06', label: 'Fairfax City SFH $680K', tier: 'TIER3',
    address: '3835 Farr Oak Circle, Fairfax, VA 22030',
    agentNotes: '4BR 2.5BA 2,600 sqft listed at $680,000. Lot 0.35 acres.',
    check: { expectsTier4Tone: true }
  },
  {
    id: 'T3-07', label: 'Burke SFH $750K', tier: 'TIER3',
    address: '5704 Oak Mill Ln, Burke, VA 22015',
    agentNotes: '4BR 3BA 2,800 sqft listed at $750,000. Burke Lake proximity. CUL-DE-SAC.',
    check: { expectsTier3Tone: true }
  },
  {
    id: 'T3-08', label: 'Centreville SFH $590K', tier: 'TIER3',
    address: '14420 Chesterfield Dr, Centreville, VA 20120',
    agentNotes: '4BR 2.5BA 2,200 sqft listed at $590,000.',
    check: { expectsTier4Tone: true }
  },
  {
    id: 'T3-09', label: 'Chantilly Townhouse $660K', tier: 'TIER3',
    address: '25230 Coldwater Ct, Chantilly, VA 20152',
    agentNotes: '3BR 2.5BA 1,800 sqft listed at $660,000. HOA $145/month covers lawn, trash, pool.',
    check: { expectsTier4Tone: true, hoaFormatCheck: true }
  },
  {
    id: 'T3-10', label: 'Ashburn Townhouse $720K', tier: 'TIER3',
    address: '44110 Olmstead Sq, Ashburn, VA 20147',
    agentNotes: '3BR 2.5BA 2,000 sqft listed at $720,000. ZIP 20147. One Loudoun proximity.',
    check: { expectsTier3Tone: true, noHardBlock: true }
  },
  {
    id: 'T3-11', label: 'Sterling (HARD BLOCK zone) Townhouse $540K', tier: 'TIER3_HARDBLOCK',
    address: '46688 Woodlane Rd, Sterling, VA 20165',
    agentNotes: '3BR 2.5BA 1,700 sqft listed at $540,000. ZIP 20165. Cascades community.',
    check: { noMetroMention: true, hardBlockCheck: true, expectsCascadesLanguage: true }
  },
  {
    id: 'T3-12', label: 'Sterling Lowes Island SFH $1.2M (T2 floor)', tier: 'TIER3',
    address: '1702 Lowes Island Blvd, Sterling, VA 20165',
    agentNotes: '4BR 3.5BA 3,900 sqft listed at $1,200,000. Lowes Island community. Cascades golf course access.',
    check: { expectsTier2Tone: true, expectsCascadesLanguage: true, noMcLeanLanguage: true }
  },
  {
    id: 'T3-13', label: 'Leesburg SFH $680K', tier: 'TIER3',
    address: '204 Piedmont St, Leesburg, VA 20175',
    agentNotes: '4BR 3BA 2,800 sqft listed at $680,000. Historic Leesburg downtown nearby.',
    check: { expectsTier4Tone: true }
  },
  {
    id: 'T3-14', label: 'Brambleton Townhouse $750K', tier: 'TIER3',
    address: '42540 Paradise Springs Sq, Brambleton, VA 20148',
    agentNotes: '3BR 2.5BA 2,200 sqft listed at $750,000. HOA includes community center, trail network.',
    check: { expectsTier3Tone: true, expectsLoudounFlavor: true }
  },
  {
    id: 'T3-15', label: 'Vienna Condo $580K', tier: 'TIER3',
    address: '120 Maple Ave E #4D, Vienna, VA 22180',
    agentNotes: '2BR 1BA 950 sqft listed at $580,000. Vienna Metro walkable 0.3 mi per agent.',
    check: { metroOkIfConfirmed: true, expectsTier4Tone: true }
  },
  {
    id: 'T3-16', label: 'Oakton SFH $850K', tier: 'TIER3',
    address: '2807 Hunter Mill Rd, Oakton, VA 22124',
    agentNotes: '4BR 3BA 3,100 sqft listed at $850,000. Madison HS district.',
    check: { expectsTier2Tone: true, expectsMadisonHS: true }
  },
  {
    id: 'T3-17', label: 'South Riding SFH $710K', tier: 'TIER3',
    address: '25400 Riding Center Dr, South Riding, VA 20152',
    agentNotes: '4BR 3BA 2,900 sqft listed at $710,000. HOA $100/month covers community center, trails.',
    check: { expectsTier3Tone: true, expectsLoudounFlavor: true }
  },
  {
    id: 'T3-18', label: 'Aldie SFH $780K', tier: 'TIER3',
    address: '41520 Wild Iris St, Aldie, VA 20105',
    agentNotes: '4BR 3.5BA 3,200 sqft listed at $780,000. HOA pool and trail network.',
    check: { expectsTier3Tone: true, expectsLoudounFlavor: true }
  },
  {
    id: 'T3-19', label: 'Reston ZIP 20191 $680K Condo', tier: 'TIER3',
    address: '11710 Old Georgetown Rd #1418, Reston, VA 20191',
    agentNotes: '1BR 1BA 820 sqft listed at $680,000. ZIP 20191.',
    check: { expectsNatureLanguage: true, noUrbanFlavor: true }
  },
  {
    id: 'T3-20', label: 'Herndon ZIP 20171 SFH $810K', tier: 'TIER3',
    address: '2345 Farmington Dr, Herndon, VA 20171',
    agentNotes: '4BR 3BA 2,700 sqft listed at $810,000. ZIP 20171. No metro distance in notes.',
    check: { noMetroMention: true, expectsTier2Tone: true }
  },
  {
    id: 'T3-21', label: 'One Loudoun Condo $620K (not Hard Block)', tier: 'TIER3',
    address: '20375 Savin Hill Dr #308, Ashburn, VA 20147',
    agentNotes: '2BR 2BA 1,100 sqft listed at $620,000. ZIP 20147. One Loudoun walkable retail.',
    check: { noHardBlock: true, expectsLoudounFlavor: true }
  },
  {
    id: 'T3-22', label: 'Broadlands SFH $870K', tier: 'TIER3',
    address: '21080 Park Glen Ct, Ashburn, VA 20147',
    agentNotes: '4BR 3.5BA 3,500 sqft listed at $870,000. Broadlands community. HOA $150/month.',
    check: { expectsTier2Tone: true, expectsLoudounFlavor: true }
  },

  // ── TIER 4 — Space & Function ─────────────────────────────────────────────
  {
    id: 'T4-01', label: 'Woodbridge SFH $490K', tier: 'TIER4',
    address: '14455 Doolittle Dr, Woodbridge, VA 22193',
    agentNotes: '4BR 2.5BA 2,400 sqft listed at $490,000. I-95 access. 2-car garage.',
    check: { expectsTier5Tone: true, expectsCommuterLanguage: true }
  },
  {
    id: 'T4-02', label: 'Woodbridge SFH $850K Townhouse', tier: 'TIER4',
    address: '12901 Harbor Dr, Woodbridge, VA 22192',
    agentNotes: '3BR 2.5BA 2,100 sqft listed at $850,000. HOA $200/month covers exterior, pool.',
    check: { expectsTier2Tone: true, expectsCommuterLanguage: true }
  },
  {
    id: 'T4-03', label: 'Manassas SFH $420K', tier: 'TIER4',
    address: '8740 Sudley Rd, Manassas, VA 20110',
    agentNotes: '3BR 2BA 1,600 sqft listed at $420,000. 1-car garage.',
    check: { expectsTier5Tone: true }
  },
  {
    id: 'T4-04', label: 'Springfield SFH $650K', tier: 'TIER4',
    address: '7205 Lynnhaven Dr, Springfield, VA 22153',
    agentNotes: '4BR 3BA 2,600 sqft listed at $650,000. I-395 nearby per agent notes.',
    check: { expectsTier4Tone: true, expectsCommuterLanguage: true }
  },
  {
    id: 'T4-05', label: 'Lorton SFH $580K', tier: 'TIER4',
    address: '9001 Richmond Hwy, Lorton, VA 22079',
    agentNotes: '4BR 2.5BA 2,100 sqft listed at $580,000.',
    check: { expectsTier4Tone: true }
  },
  {
    id: 'T4-06', label: 'Annandale SFH $610K', tier: 'TIER4',
    address: '4205 Hummer Rd, Annandale, VA 22003',
    agentNotes: '4BR 2BA 1,900 sqft listed at $610,000. Updated kitchen 2020.',
    check: { expectsTier4Tone: true }
  },
  {
    id: 'T4-07', label: 'Sterling $340K Condo (Hard Block zone)', tier: 'TIER4_HARDBLOCK',
    address: '111 Birchside Cir #102, Sterling, VA 20164',
    agentNotes: '2BR 1BA 900 sqft listed at $340,000. ZIP 20164.',
    check: { hardBlockCheck: true, noMetroMention: true, expectsTier5Tone: true }
  },
  {
    id: 'T4-08', label: 'Gainesville SFH $700K', tier: 'TIER4',
    address: '7502 Linton Hall Rd, Gainesville, VA 20155',
    agentNotes: '4BR 3BA 3,000 sqft listed at $700,000. New construction 2022. I-66 corridor.',
    check: { expectsTier3Tone: true, expectsGainesvilleFlavor: true }
  },
  {
    id: 'T4-09', label: 'Haymarket SFH $760K', tier: 'TIER4',
    address: '5190 Kettle Run Rd, Haymarket, VA 20169',
    agentNotes: '4BR 3.5BA 3,400 sqft listed at $760,000. Large lot 0.5 acres. Built 2019.',
    check: { expectsTier3Tone: true, expectsGainesvilleFlavor: true }
  },
  {
    id: 'T4-10', label: 'Leesburg Townhouse $490K', tier: 'TIER4',
    address: '1021 Loudoun St SE, Leesburg, VA 20175',
    agentNotes: '2BR 1.5BA 1,400 sqft listed at $490,000.',
    check: { expectsTier5Tone: true }
  },
  {
    id: 'T4-11', label: 'Dale City SFH $440K', tier: 'TIER4',
    address: '13603 Reddawn Rd, Dale City, VA 22193',
    agentNotes: '3BR 2BA 1,700 sqft listed at $440,000.',
    check: { expectsTier5Tone: true }
  },
  {
    id: 'T4-12', label: 'Lake Ridge SFH $530K', tier: 'TIER4',
    address: '12840 Lake Ridge Dr, Woodbridge, VA 22192',
    agentNotes: '4BR 2.5BA 2,200 sqft listed at $530,000.',
    check: { expectsTier4Tone: true }
  },
  {
    id: 'T4-13', label: 'Bristow SFH $680K', tier: 'TIER4',
    address: '8620 Woodford Bridge Way, Bristow, VA 20136',
    agentNotes: '4BR 3BA 2,800 sqft listed at $680,000. Built 2016.',
    check: { expectsTier4Tone: true }
  },
  {
    id: 'T4-14', label: 'Nokesville SFH $590K', tier: 'TIER4',
    address: '11245 Fleetwood Dr, Nokesville, VA 20181',
    agentNotes: '4BR 3BA 2,400 sqft listed at $590,000. 1 acre lot.',
    check: { expectsTier4Tone: true }
  },
  {
    id: 'T4-15', label: 'Woodbridge Condo $310K (T5)', tier: 'TIER4',
    address: '2705 Highgate Ln #203, Woodbridge, VA 22192',
    agentNotes: '1BR 1BA 820 sqft listed at $310,000.',
    check: { expectsTier5Tone: true }
  },
  {
    id: 'T4-16', label: 'Manassas City Townhouse $450K', tier: 'TIER4',
    address: '9021 Prince William St, Manassas, VA 20110',
    agentNotes: '3BR 2BA 1,600 sqft listed at $450,000. HOA $100/month.',
    check: { expectsTier5Tone: true, hoaFormatCheck: true }
  },

  // ── TIER 5 — Practical / VRE Corridor ─────────────────────────────────────
  {
    id: 'T5-01', label: 'Stafford SFH $460K', tier: 'TIER5',
    address: '44 Pine Valley Dr, Stafford, VA 22554',
    agentNotes: '4BR 2.5BA 2,300 sqft listed at $460,000. VRE Brooke station 1 mi per agent.',
    check: { expectsTier5Tone: true, expectsVRE: true }
  },
  {
    id: 'T5-02', label: 'Stafford SFH $370K', tier: 'TIER5',
    address: '8 Settlers Ridge Rd, Stafford, VA 22556',
    agentNotes: '3BR 2BA 1,650 sqft listed at $370,000.',
    check: { expectsTier5Tone: true }
  },
  {
    id: 'T5-03', label: 'Fredericksburg SFH $410K', tier: 'TIER5',
    address: '205 Sophia St, Fredericksburg, VA 22401',
    agentNotes: '3BR 2BA 1,800 sqft listed at $410,000.',
    check: { expectsTier5Tone: true }
  },
  {
    id: 'T5-04', label: 'Triangle SFH $380K', tier: 'TIER5',
    address: '18100 Barnard St, Triangle, VA 22172',
    agentNotes: '3BR 2BA 1,600 sqft listed at $380,000.',
    check: { expectsTier5Tone: true }
  },
  {
    id: 'T5-05', label: 'Dumfries SFH $420K', tier: 'TIER5',
    address: '18240 Windy Hill Dr, Dumfries, VA 22026',
    agentNotes: '4BR 2.5BA 2,000 sqft listed at $420,000.',
    check: { expectsTier5Tone: true }
  },
  {
    id: 'T5-06', label: 'Fredericksburg Townhouse $340K', tier: 'TIER5',
    address: '407 Kenmore Ave, Fredericksburg, VA 22401',
    agentNotes: '3BR 2.5BA 1,500 sqft listed at $340,000.',
    check: { expectsTier5Tone: true }
  },
  {
    id: 'T5-07', label: 'Woodbridge Condo $290K', tier: 'TIER5',
    address: '15001 Kodiak Dr #111, Woodbridge, VA 22193',
    agentNotes: '2BR 1BA 900 sqft listed at $290,000.',
    check: { expectsTier5Tone: true, noEmotionalInflation: true }
  },
  {
    id: 'T5-08', label: 'Dale City SFH $355K', tier: 'TIER5',
    address: '14621 Glendale Dr, Dale City, VA 22193',
    agentNotes: '3BR 2BA 1,650 sqft listed at $355,000. Recent roof replacement.',
    check: { expectsTier5Tone: true }
  },

  // ── SPECIAL ZONE TESTS ─────────────────────────────────────────────────────
  {
    id: 'SZ-01', label: 'Falls Church CITY (22046) school mention required', tier: 'SPECIAL',
    address: '301 N Oak St, Falls Church, VA 22046',
    agentNotes: '3BR 2BA 1,900 sqft listed at $920,000. ZIP 22046. Falls Church City Schools.',
    check: { expectsFCCitySchools: true, noFCFairfaxConfusion: true }
  },
  {
    id: 'SZ-02', label: 'Falls Church Fairfax (22042) — FC City schools NOT mentioned', tier: 'SPECIAL',
    address: '7508 Lee Hwy, Falls Church, VA 22042',
    agentNotes: '3BR 2BA 1,700 sqft listed at $750,000. ZIP 22042. FCPS district.',
    check: { noFCCitySchools: true }
  },
  {
    id: 'SZ-03', label: 'Sterling 20164 Hard Block — no Innovation/Ashburn Metro', tier: 'SPECIAL',
    address: '46601 Drysdale Ter, Sterling, VA 20164',
    agentNotes: '3BR 2BA 1,800 sqft listed at $520,000. ZIP 20164.',
    check: { hardBlockCheck: true, noMetroMention: true }
  },
  {
    id: 'SZ-04', label: 'Reston 20191 metro — NO confirmation in notes (must omit)', tier: 'SPECIAL',
    address: '11411 Springwood Ct, Reston, VA 20191',
    agentNotes: '3BR 2.5BA 2,100 sqft listed at $780,000. ZIP 20191. MLS sheet lists Wiehle Metro.',
    check: { noMetroMention: true, expectsNatureLanguage: true }
  },
  {
    id: 'SZ-05', label: 'Herndon 20170 metro — explicit agent note confirms', tier: 'SPECIAL',
    address: '437 Elden St, Herndon, VA 20170',
    agentNotes: '3BR 2BA 1,900 sqft listed at $660,000. ZIP 20170. Herndon Metro 0.6 mi per my measurement.',
    check: { metroOkIfConfirmed: true }
  },

  // ── EDGE CASES — Price/Location Mismatch ────────────────────────────────────
  {
    id: 'EC-01', label: 'McLean teardown SFH $700K (Tier1 loc + Tier3 price → Tier1 wins)', tier: 'EC_MISMATCH',
    address: '7500 Leesburg Pike, McLean, VA 22101',
    agentNotes: '3BR 1BA 1,200 sqft listed at $700,000. Built 1958. Teardown or renovation opportunity. Original condition.',
    check: { expectsTier1Tone: true, noEmotionalInflation: false }
  },
  {
    id: 'EC-02', label: 'Great Falls small SFH $650K (Tier1 loc + Tier4 price → Tier1 wins)', tier: 'EC_MISMATCH',
    address: '10205 Colvin Run Rd, Great Falls, VA 22066',
    agentNotes: '2BR 1BA 980 sqft listed at $650,000. Lot 0.6 acres. Original 1963 construction.',
    check: { expectsTier1Tone: true }
  },
  {
    id: 'EC-03', label: 'McLean Condo $500K (Tier1 loc + Tier5 price → Tier1 wins)', tier: 'EC_MISMATCH',
    address: '1600 Anderson Rd #204, McLean, VA 22102',
    agentNotes: '1BR 1BA 780 sqft listed at $500,000.',
    check: { expectsTier1Tone: true, noEmotionalInflation: false }
  },
  {
    id: 'EC-04', label: 'Arlington Crystal City Condo $550K (urban + Tier4 price)', tier: 'EC_MISMATCH',
    address: '1201 S Eads St #501, Arlington, VA 22202',
    agentNotes: '1BR 1BA 720 sqft listed at $550,000. ZIP 22202. Crystal City Metro 0.2 mi per agent.',
    check: { expectsUrbanFlavor: true, metroOkIfConfirmed: true }
  },
  {
    id: 'EC-05', label: 'Alexandria Franconia Townhouse $480K (outer Alexandria + Tier5)', tier: 'EC_MISMATCH',
    address: '6301 Franconia Rd #12, Alexandria, VA 22310',
    agentNotes: '3BR 2BA 1,500 sqft listed at $480,000. ZIP 22310.',
    check: { expectsTier5Tone: true }
  },
  {
    id: 'EC-06', label: 'Arlington $1.6M 1950s SFH (Tier1 + pre-2000 construction)', tier: 'EC_MISMATCH',
    address: '4801 N Pershing Dr, Arlington, VA 22203',
    agentNotes: '4BR 3BA 2,800 sqft listed at $1,600,000. ZIP 22203. Built 1952. Kitchen and baths fully renovated 2022.',
    check: { expectsTier1Tone: true, expectsUrbanFlavor: true }
  },

  // ── EDGE CASES — Reston ─────────────────────────────────────────────────────
  {
    id: 'EC-07', label: 'Reston Town Center ZIP 20190 Condo $380K (urban ZIP + Tier5 price)', tier: 'EC_RESTON',
    address: '1760 Fountain Dr #105, Reston, VA 20190',
    agentNotes: '1BR 1BA 650 sqft listed at $380,000. ZIP 20190.',
    check: { expectsUrbanFlavor: true, noNatureLanguage: true, expectsTier5Tone: true }
  },
  {
    id: 'EC-08', label: 'Reston 20191 SFH $1.4M (residential ZIP + Tier2 price, keep nature flavor)', tier: 'EC_RESTON',
    address: '1819 Ballantrae Farm Dr, Reston, VA 20191',
    agentNotes: '5BR 4.5BA 4,200 sqft listed at $1,400,000. ZIP 20191. Backs to Reston trail system.',
    check: { expectsNatureLanguage: true, noUrbanFlavor: true, expectsTier2Tone: true }
  },
  {
    id: 'EC-09', label: 'Reston Lake Anne Condo $520K (historic community + Tier4)', tier: 'EC_RESTON',
    address: '1609 Lake Anne Dr #210, Reston, VA 20190',
    agentNotes: '2BR 1BA 950 sqft listed at $520,000. Lake Anne Village. Waterfront views.',
    check: { expectsNatureLanguage: true }
  },

  // ── EDGE CASES — Vienna / Oakton ────────────────────────────────────────────
  {
    id: 'EC-10', label: 'Vienna Condo $480K (Tier2 default location + Tier5 price)', tier: 'EC_VIENNA',
    address: '200 Ridge Top Rd #303, Vienna, VA 22180',
    agentNotes: '1BR 1BA 720 sqft listed at $480,000.',
    check: { expectsTier5Tone: true }
  },
  {
    id: 'EC-11', label: 'Oakton SFH $1.8M (Tier2 default → Tier1 price override)', tier: 'EC_VIENNA',
    address: '3009 Chain Bridge Rd, Oakton, VA 22124',
    agentNotes: '5BR 4.5BA 5,600 sqft listed at $1,800,000. Madison HS district. Stone facade.',
    check: { expectsTier1Tone: true, expectsMadisonHS: true }
  },
  {
    id: 'EC-12', label: 'Vienna Townhouse $650K (Tier4 price + Vienna Tier2 default → Tier2 wins)', tier: 'EC_VIENNA',
    address: '301 Courthouse Rd SW, Vienna, VA 22180',
    agentNotes: '3BR 2.5BA 2,100 sqft listed at $650,000. Madison HS district.',
    check: { expectsTier2Tone: true, expectsMadisonHS: true }
  },

  // ── EDGE CASES — Sterling / Cascades Hard Block ──────────────────────────────
  {
    id: 'EC-13', label: 'Sterling 20164 SFH $1.6M (Hard Block zone + Tier1 price)', tier: 'EC_HARDBLOCK',
    address: '46001 Loudoun Reserve Dr, Sterling, VA 20164',
    agentNotes: '5BR 5BA 5,800 sqft listed at $1,600,000. ZIP 20164. Lowes Island community.',
    check: { hardBlockCheck: true, noMetroMention: true, expectsTier1Tone: true, expectsCascadesLanguage: true }
  },
  {
    id: 'EC-14', label: 'Cascades Condo $420K (Tier5 price + Hard Block zone)', tier: 'EC_HARDBLOCK',
    address: '46460 Desert Flower Pl #201, Sterling, VA 20165',
    agentNotes: '2BR 2BA 1,000 sqft listed at $420,000. ZIP 20165. Cascades community.',
    check: { hardBlockCheck: true, noMetroMention: true, expectsTier5Tone: true }
  },
  {
    id: 'EC-15', label: 'Lowes Island SFH $1.5M (exactly Tier1 boundary + Hard Block zone)', tier: 'EC_HARDBLOCK',
    address: '1625 Lowes Island Blvd, Sterling, VA 20165',
    agentNotes: '5BR 4BA 4,600 sqft listed at $1,500,000. ZIP 20165. Lowes Island.',
    check: { hardBlockCheck: true, noMetroMention: true, expectsTier1Tone: true }
  },

  // ── EDGE CASES — Herndon ─────────────────────────────────────────────────────
  {
    id: 'EC-16', label: 'Herndon 20170 SFH $1.2M (Conditional Metro + Tier2, no distance → omit metro)', tier: 'EC_HERNDON',
    address: '700 Alabama Dr, Herndon, VA 20170',
    agentNotes: '4BR 3.5BA 3,800 sqft listed at $1,200,000. ZIP 20170.',
    check: { noMetroMention: true, expectsTier2Tone: true }
  },
  {
    id: 'EC-17', label: 'Herndon Condo $390K (Tier5 + tech corridor)', tier: 'EC_HERNDON',
    address: '13385 Coppermill Dr #212, Herndon, VA 20171',
    agentNotes: '2BR 1BA 880 sqft listed at $390,000. ZIP 20171.',
    check: { expectsTier5Tone: true, noMetroMention: true }
  },

  // ── EDGE CASES — Loudoun / Ashburn ───────────────────────────────────────────
  {
    id: 'EC-18', label: 'One Loudoun Penthouse Condo $1.6M (NOT Hard Block + Tier1)', tier: 'EC_LOUDOUN',
    address: '20155 Lakeview Center Plaza #2201, Ashburn, VA 20147',
    agentNotes: '3BR 3BA 2,400 sqft listed at $1,600,000. ZIP 20147. One Loudoun. Rooftop terrace.',
    check: { noHardBlock: true, expectsTier1Tone: true, expectsLoudounFlavor: true }
  },
  {
    id: 'EC-19', label: 'Ashburn 20147 SFH $1.8M (Northern Ashburn NOT Hard Block + Tier1)', tier: 'EC_LOUDOUN',
    address: '43750 Welty Ct, Ashburn, VA 20147',
    agentNotes: '5BR 5BA 5,200 sqft listed at $1,800,000. ZIP 20147. North of Route 7.',
    check: { noHardBlock: true, expectsTier1Tone: true, expectsLoudounFlavor: true }
  },
  {
    id: 'EC-20', label: 'Ashburn 20148 SFH $900K (south of Route 7 Hard Block + Tier2)', tier: 'EC_LOUDOUN',
    address: '23000 Wildwood Sq, Ashburn, VA 20148',
    agentNotes: '4BR 3BA 3,200 sqft listed at $900,000. ZIP 20148.',
    check: { hardBlockCheck: true, noMetroMention: true, expectsTier2Tone: true }
  },
  {
    id: 'EC-21', label: 'Brambleton SFH $1.1M (master-planned + Tier2)', tier: 'EC_LOUDOUN',
    address: '42314 Vestals Gap Dr, Brambleton, VA 20148',
    agentNotes: '4BR 3.5BA 3,800 sqft listed at $1,100,000. Brambleton community. HOA $210/month.',
    check: { expectsTier2Tone: true, expectsLoudounFlavor: true }
  },
  {
    id: 'EC-22', label: 'Leesburg Historic District SFH $780K (old town feel + Tier3)', tier: 'EC_LOUDOUN',
    address: '109 Loudoun St SW, Leesburg, VA 20175',
    agentNotes: '3BR 2.5BA 2,400 sqft listed at $780,000. Historic Leesburg downtown.',
    check: { expectsTier3Tone: true }
  },

  // ── EDGE CASES — Woodbridge / Prince William ─────────────────────────────────
  {
    id: 'EC-23', label: 'Woodbridge SFH $1.2M new construction (PWC + Tier2 price override)', tier: 'EC_PWC',
    address: '15400 River Bend Rd, Woodbridge, VA 22191',
    agentNotes: '5BR 4.5BA 4,500 sqft listed at $1,200,000. Built 2023. I-95 corridor.',
    check: { expectsTier2Tone: true, expectsCommuterLanguage: true }
  },
  {
    id: 'EC-24', label: 'Dale City SFH $1M (value location + Tier2 price)', tier: 'EC_PWC',
    address: '4505 Dale Blvd, Dale City, VA 22193',
    agentNotes: '4BR 3.5BA 3,600 sqft listed at $1,000,000.',
    check: { expectsTier2Tone: true }
  },
  {
    id: 'EC-25', label: 'Bristow SFH $1.5M (exactly Tier1 boundary + PWC)', tier: 'EC_PWC',
    address: '9910 Devonshire Rd, Bristow, VA 20136',
    agentNotes: '5BR 5BA 5,100 sqft listed at $1,500,000. Built 2021.',
    check: { expectsTier1Tone: true }
  },

  // ── EDGE CASES — Gainesville / Haymarket ────────────────────────────────────
  {
    id: 'EC-26', label: 'Gainesville SFH $1.1M new construction (newer construction + Tier2)', tier: 'EC_GAINESVILLE',
    address: '7104 Bluebell Dr, Gainesville, VA 20155',
    agentNotes: '5BR 4BA 4,200 sqft listed at $1,100,000. Built 2023. I-66 corridor.',
    check: { expectsTier2Tone: true, expectsGainesvilleFlavor: true }
  },
  {
    id: 'EC-27', label: 'Haymarket Townhouse $480K (Tier5 + I-66 corridor)', tier: 'EC_GAINESVILLE',
    address: '5020 Stone Fence Dr, Haymarket, VA 20169',
    agentNotes: '3BR 2.5BA 1,600 sqft listed at $480,000.',
    check: { expectsTier5Tone: true, expectsGainesvilleFlavor: true }
  },

  // ── EDGE CASES — Stafford / Fredericksburg ───────────────────────────────────
  {
    id: 'EC-28', label: 'Stafford SFH $850K new large (Tier3 price + Tier5 location)', tier: 'EC_STAFFORD',
    address: '101 Aquia Landing Rd, Stafford, VA 22554',
    agentNotes: '5BR 4.5BA 4,800 sqft listed at $850,000. Built 2022.',
    check: { expectsTier2Tone: true }
  },
  {
    id: 'EC-29', label: 'Fredericksburg Historic Downtown SFH $720K (historic + Tier3)', tier: 'EC_STAFFORD',
    address: '610 Caroline St, Fredericksburg, VA 22401',
    agentNotes: '4BR 2.5BA 2,600 sqft listed at $720,000. Historic Fredericksburg district. Built 1890, renovated 2019.',
    check: { expectsTier3Tone: true }
  },

  // ── EDGE CASES — Springfield / Lorton / Annandale ───────────────────────────
  {
    id: 'EC-30', label: 'Springfield SFH $1M (suburban practical + Tier2 price override)', tier: 'EC_SPRINGFIELD',
    address: '6408 Burke Commons Rd, Springfield, VA 22152',
    agentNotes: '4BR 3.5BA 3,500 sqft listed at $1,000,000.',
    check: { expectsTier2Tone: true }
  },
  {
    id: 'EC-31', label: 'Annandale SFH $890K (Tier3 boundary)', tier: 'EC_SPRINGFIELD',
    address: '7003 Columbia Pike, Annandale, VA 22003',
    agentNotes: '4BR 3BA 2,900 sqft listed at $890,000.',
    check: { expectsTier2Tone: true }
  },
  {
    id: 'EC-32', label: 'Lorton SFH $1.1M new construction (Tier2 + suburban practical)', tier: 'EC_SPRINGFIELD',
    address: '8601 Lorton Rd, Lorton, VA 22079',
    agentNotes: '5BR 4BA 3,800 sqft listed at $1,100,000. Built 2022.',
    check: { expectsTier2Tone: true }
  },

  // ── EDGE CASES — Falls Church ───────────────────────────────────────────────
  {
    id: 'EC-33', label: 'Falls Church City 22046 Condo $480K (Special Zone school + Tier5 price)', tier: 'EC_FC',
    address: '800 N Wayne St #410, Falls Church, VA 22046',
    agentNotes: '1BR 1BA 680 sqft listed at $480,000. ZIP 22046. Falls Church City Schools district.',
    check: { expectsFCCitySchools: true, expectsTier5Tone: true }
  },
  {
    id: 'EC-34', label: 'Falls Church City 22046 SFH $1.6M (Special Zone + Tier1)', tier: 'EC_FC',
    address: '214 Great Falls St, Falls Church, VA 22046',
    agentNotes: '5BR 4.5BA 4,200 sqft listed at $1,600,000. ZIP 22046. Falls Church City Schools.',
    check: { expectsFCCitySchools: true, expectsTier1Tone: true }
  },
  {
    id: 'EC-35', label: 'Falls Church Fairfax 22042 SFH $900K (general FC → NO city schools)', tier: 'EC_FC',
    address: '7302 Idylwood Rd, Falls Church, VA 22042',
    agentNotes: '4BR 3BA 2,800 sqft listed at $900,000. ZIP 22042. FCPS district.',
    check: { noFCCitySchools: true, expectsTier2Tone: true }
  },

  // ── EDGE CASES — Old Town Alexandria ────────────────────────────────────────
  {
    id: 'EC-36', label: 'Old Town Alexandria Studio Condo $480K (Special Zone + Tier5)', tier: 'EC_OT',
    address: '301 N Washington St #204, Alexandria, VA 22314',
    agentNotes: 'Studio 1BA 480 sqft listed at $480,000. ZIP 22314. Old Town.',
    check: { expectsHistoricLanguage: true, expectsTier5Tone: true }
  },
  {
    id: 'EC-37', label: 'Old Town Alexandria Townhouse $2.1M (Special Zone + Tier1 + Townhouse)', tier: 'EC_OT',
    address: '118 S Lee St, Alexandria, VA 22314',
    agentNotes: '4BR 3.5BA 3,200 sqft listed at $2,100,000. ZIP 22314. Historic Old Town. Federal-style 1850.',
    check: { expectsHistoricLanguage: true, expectsTier1Tone: true }
  },

  // ── EDGE CASES — Western Loudoun / Fauquier ──────────────────────────────────
  {
    id: 'EC-38', label: 'Middleburg SFH $2.5M (horse country + Tier1)', tier: 'EC_RURAL',
    address: '21441 Unison Rd, Middleburg, VA 20117',
    agentNotes: '5BR 5.5BA 6,800 sqft listed at $2,500,000. 12-acre equestrian property. Blue Ridge views.',
    check: { expectsTier1Tone: true }
  },
  {
    id: 'EC-39', label: 'Purcellville SFH $650K (rural Western Loudoun + Tier4)', tier: 'EC_RURAL',
    address: '37850 Millville Rd, Purcellville, VA 20132',
    agentNotes: '3BR 2BA 1,900 sqft listed at $650,000. Rural setting.',
    check: { expectsTier4Tone: true }
  },
  {
    id: 'EC-40', label: 'Warrenton SFH $450K (Fauquier + Tier5)', tier: 'EC_RURAL',
    address: '347 Meetze Rd, Warrenton, VA 20186',
    agentNotes: '3BR 2BA 1,700 sqft listed at $450,000.',
    check: { expectsTier5Tone: true }
  },
  {
    id: 'EC-41', label: 'Round Hill SFH $890K (Tier3 + Blue Ridge views)', tier: 'EC_RURAL',
    address: '35671 Milldale Rd, Round Hill, VA 20141',
    agentNotes: '4BR 3BA 2,800 sqft listed at $890,000. Blue Ridge mountain views. 2 acres.',
    check: { expectsTier2Tone: true }
  },

  // ── EDGE CASES — Construction Era Extremes ───────────────────────────────────
  {
    id: 'EC-42', label: '1945 McLean SFH $1.8M (post-war + Tier1)', tier: 'EC_ERA',
    address: '7020 Benjamin St, McLean, VA 22101',
    agentNotes: '4BR 3BA 2,600 sqft listed at $1,800,000. Built 1945. Kitchen renovated 2020. Original hardwood floors.',
    check: { expectsTier1Tone: true }
  },
  {
    id: 'EC-43', label: '2024 Woodbridge SFH $680K (new construction + Tier4)', tier: 'EC_ERA',
    address: '14220 Osprey Ln, Woodbridge, VA 22193',
    agentNotes: '4BR 3BA 2,800 sqft listed at $680,000. Built 2024. Smart home features, open concept.',
    check: { expectsTier4Tone: true }
  },
  {
    id: 'EC-44', label: '1972 Reston Townhouse $520K (early Reston + Tier4)', tier: 'EC_ERA',
    address: '11516 Links Dr, Reston, VA 20190',
    agentNotes: '3BR 2BA 1,600 sqft listed at $520,000. Built 1972. Original Reston planned community.',
    check: { expectsNatureLanguage: true }
  },
  {
    id: 'EC-45', label: '2015 Ashburn SFH $780K (new construction threshold + Tier3)', tier: 'EC_ERA',
    address: '43500 Locust Dale Ter, Ashburn, VA 20147',
    agentNotes: '4BR 3BA 3,000 sqft listed at $780,000. Built 2015.',
    check: { expectsTier3Tone: true, expectsLoudounFlavor: true }
  },

  // ── EDGE CASES — Property Type Extremes ─────────────────────────────────────
  {
    id: 'EC-46', label: 'McLean Estate SFH $3.5M (highest price Tier1)', tier: 'EC_PROPTYPE',
    address: '1320 Chain Bridge Rd, McLean, VA 22101',
    agentNotes: '7BR 8BA 9,500 sqft listed at $3,500,000. Stone and brick exterior. 3-car garage. Wine cellar.',
    check: { expectsTier1Tone: true, expectsEstateLanguage: true }
  },
  {
    id: 'EC-47', label: 'Woodbridge Studio Condo $290K (lowest price Tier5)', tier: 'EC_PROPTYPE',
    address: '3000 Hamlet Pl #101, Woodbridge, VA 22192',
    agentNotes: 'Studio 1BA 520 sqft listed at $290,000.',
    check: { expectsTier5Tone: true, noEmotionalInflation: true }
  },
  {
    id: 'EC-48', label: 'Arlington Penthouse Condo $1.5M (exactly Tier1 boundary + Condo)', tier: 'EC_PROPTYPE',
    address: '1300 Army Navy Dr #PH1, Arlington, VA 22202',
    agentNotes: '2BR 2BA 1,800 sqft listed at $1,500,000. ZIP 22202. Penthouse. Panoramic DC views.',
    check: { expectsTier1Tone: true, expectsUrbanFlavor: true }
  },
  {
    id: 'EC-49', label: 'Reston Townhouse $1.5M (exactly Tier1 boundary + Townhouse)', tier: 'EC_PROPTYPE',
    address: '11701 Fairway Dr, Reston, VA 20190',
    agentNotes: '4BR 3.5BA 2,800 sqft listed at $1,500,000. ZIP 20190. Reston Town Center area.',
    check: { expectsTier1Tone: true, expectsUrbanFlavor: true }
  },

  // ── ZIP EDGE CASES — Hard Block Confirmation ─────────────────────────────────
  {
    id: 'ZIP-01', label: 'Sterling 20164 SFH $750K (Hard Block → no Metro)', tier: 'ZIP_HARDBLOCK',
    address: '46901 Regal Park Ct, Sterling, VA 20164',
    agentNotes: '4BR 3BA 2,600 sqft listed at $750,000. ZIP 20164.',
    check: { hardBlockCheck: true, noMetroMention: true, expectsTier3Tone: true }
  },
  {
    id: 'ZIP-02', label: 'Sterling 20165 Townhouse $580K (Hard Block → no Metro)', tier: 'ZIP_HARDBLOCK',
    address: '46800 Cedar Chase Sq, Sterling, VA 20165',
    agentNotes: '3BR 2.5BA 1,800 sqft listed at $580,000. ZIP 20165.',
    check: { hardBlockCheck: true, noMetroMention: true, expectsTier4Tone: true }
  },
  {
    id: 'ZIP-03', label: 'Cascades 20165 SFH $920K (Hard Block → no Metro)', tier: 'ZIP_HARDBLOCK',
    address: '21135 Rocky Knoll Sq, Ashburn, VA 20165',
    agentNotes: '4BR 3.5BA 3,400 sqft listed at $920,000. ZIP 20165. Cascades community.',
    check: { hardBlockCheck: true, noMetroMention: true, expectsTier2Tone: true, expectsCascadesLanguage: true }
  },
  {
    id: 'ZIP-04', label: 'Potomac Falls 20165 SFH $850K (Hard Block → no Metro)', tier: 'ZIP_HARDBLOCK',
    address: '20645 Hidden Creek Ct, Ashburn, VA 20165',
    agentNotes: '4BR 3BA 3,100 sqft listed at $850,000. ZIP 20165. Potomac Falls community.',
    check: { hardBlockCheck: true, noMetroMention: true, expectsTier2Tone: true }
  },

  // ── ZIP EDGE CASES — Conditional Metro (no distance = omit) ─────────────────
  {
    id: 'ZIP-05', label: 'Reston 20191 SFH $680K (no metro distance in notes → must omit)', tier: 'ZIP_CONDITIONAL',
    address: '11411 Sorrel Ridge Ct, Reston, VA 20191',
    agentNotes: '3BR 2.5BA 2,200 sqft listed at $680,000. ZIP 20191.',
    check: { noMetroMention: true, expectsNatureLanguage: true }
  },
  {
    id: 'ZIP-06', label: 'Reston 20194 Townhouse $720K (no metro distance → must omit)', tier: 'ZIP_CONDITIONAL',
    address: '11601 Sunrise Valley Dr, Reston, VA 20194',
    agentNotes: '3BR 2.5BA 1,950 sqft listed at $720,000. ZIP 20194.',
    check: { noMetroMention: true, expectsNatureLanguage: true }
  },
  {
    id: 'ZIP-07', label: 'Herndon 20170 SFH $750K (no metro distance → must omit)', tier: 'ZIP_CONDITIONAL',
    address: '805 Elden St, Herndon, VA 20170',
    agentNotes: '4BR 3BA 2,400 sqft listed at $750,000. ZIP 20170.',
    check: { noMetroMention: true }
  },
  {
    id: 'ZIP-08', label: 'Herndon 20171 Condo $580K (no metro distance → must omit)', tier: 'ZIP_CONDITIONAL',
    address: '13362 Coppermill Dr #314, Herndon, VA 20171',
    agentNotes: '2BR 2BA 1,100 sqft listed at $580,000. ZIP 20171.',
    check: { noMetroMention: true }
  },

  // ── ZIP EDGE CASES — NOT Hard Block ─────────────────────────────────────────
  {
    id: 'ZIP-09', label: 'One Loudoun 20147 Condo $620K (NOT Hard Block — Metro ok if confirmed)', tier: 'ZIP_NOTBLOCK',
    address: '20375 Savin Hill Dr #408, Ashburn, VA 20147',
    agentNotes: '2BR 2BA 1,100 sqft listed at $620,000. ZIP 20147. One Loudoun. Ashburn Metro 1.0 mi per agent.',
    check: { noHardBlock: true, metroOkIfConfirmed: true, expectsLoudounFlavor: true }
  },
  {
    id: 'ZIP-10', label: 'Ashburn 20147 SFH $780K (NOT Hard Block — Metro ok if confirmed)', tier: 'ZIP_NOTBLOCK',
    address: '43750 Stubble Mill Rd, Ashburn, VA 20147',
    agentNotes: '4BR 3BA 2,900 sqft listed at $780,000. ZIP 20147. Ashburn Metro 0.8 mi per agent.',
    check: { noHardBlock: true, metroOkIfConfirmed: true, expectsLoudounFlavor: true }
  },

  // ── ZIP EDGE CASES — Arlington ZIP-by-ZIP ───────────────────────────────────
  {
    id: 'ZIP-11', label: 'Clarendon 22201 Condo $850K', tier: 'ZIP_ARLINGTON',
    address: '3600 Washington Blvd #804, Arlington, VA 22201',
    agentNotes: '2BR 2BA 1,150 sqft listed at $850,000. ZIP 22201. Clarendon Metro 0.2 mi per agent.',
    check: { expectsUrbanFlavor: true, expectsTier2Tone: true, metroOkIfConfirmed: true }
  },
  {
    id: 'ZIP-12', label: 'Crystal City 22202 Condo $720K', tier: 'ZIP_ARLINGTON',
    address: '251 S 18th St #903, Arlington, VA 22202',
    agentNotes: '2BR 2BA 1,050 sqft listed at $720,000. ZIP 22202. Crystal City Metro 0.3 mi per agent.',
    check: { expectsUrbanFlavor: true, expectsTier3Tone: true, metroOkIfConfirmed: true }
  },
  {
    id: 'ZIP-13', label: 'North Arlington 22207 SFH $1.4M', tier: 'ZIP_ARLINGTON',
    address: '4900 Lee Hwy, Arlington, VA 22207',
    agentNotes: '4BR 3.5BA 3,200 sqft listed at $1,400,000. ZIP 22207.',
    check: { expectsTier2Tone: true, expectsUrbanFlavor: true }
  },
  {
    id: 'ZIP-14', label: 'Rosslyn 22209 Condo $1.1M', tier: 'ZIP_ARLINGTON',
    address: '1881 Nash St N #1801, Arlington, VA 22209',
    agentNotes: '2BR 2BA 1,350 sqft listed at $1,100,000. ZIP 22209. Rosslyn Metro 0.3 mi per agent.',
    check: { expectsUrbanFlavor: true, expectsTier2Tone: true, metroOkIfConfirmed: true }
  },

  // ── ZIP EDGE CASES — Alexandria ZIP-by-ZIP ───────────────────────────────────
  {
    id: 'ZIP-15', label: 'Old Town 22314 Condo $980K', tier: 'ZIP_ALEXANDRIA',
    address: '400 Queen St #501, Alexandria, VA 22314',
    agentNotes: '2BR 2BA 1,280 sqft listed at $980,000. ZIP 22314. Old Town Alexandria.',
    check: { expectsHistoricLanguage: true, expectsTier2Tone: true }
  },
  {
    id: 'ZIP-16', label: 'Del Ray 22301 SFH $950K', tier: 'ZIP_ALEXANDRIA',
    address: '1408 Hume Ave, Alexandria, VA 22301',
    agentNotes: '3BR 2.5BA 2,100 sqft listed at $950,000. ZIP 22301. Del Ray neighborhood.',
    check: { expectsTier2Tone: true, expectsUrbanFlavor: true }
  },
  {
    id: 'ZIP-17', label: 'Kingstowne 22312 Townhouse $680K', tier: 'ZIP_ALEXANDRIA',
    address: '6015 Kingstowne Towne Center, Alexandria, VA 22312',
    agentNotes: '3BR 2.5BA 2,000 sqft listed at $680,000. ZIP 22312. Kingstowne community.',
    check: { expectsTier4Tone: true }
  },

  // ── ZIP EDGE CASES — Falls Church ZIP Distinction ────────────────────────────
  {
    id: 'ZIP-18', label: 'Falls Church City 22046 SFH $880K → FC City schools REQUIRED', tier: 'ZIP_FC',
    address: '500 James St, Falls Church, VA 22046',
    agentNotes: '4BR 3BA 2,600 sqft listed at $880,000. ZIP 22046. Falls Church City Schools district.',
    check: { expectsFCCitySchools: true, noFCFairfaxConfusion: true, expectsTier2Tone: true }
  },
  {
    id: 'ZIP-19', label: 'Falls Church Fairfax 22042 SFH $750K → FC City schools FORBIDDEN', tier: 'ZIP_FC',
    address: '7206 Lee Hwy, Falls Church, VA 22042',
    agentNotes: '4BR 2.5BA 2,200 sqft listed at $750,000. ZIP 22042. FCPS district.',
    check: { noFCCitySchools: true, expectsTier3Tone: true }
  },
  {
    id: 'ZIP-20', label: 'Falls Church Fairfax 22043 Condo $620K → FC City schools FORBIDDEN', tier: 'ZIP_FC',
    address: '2050 Westmoreland St #305, Falls Church, VA 22043',
    agentNotes: '2BR 2BA 1,050 sqft listed at $620,000. ZIP 22043. FCPS district.',
    check: { noFCCitySchools: true, expectsTier4Tone: true }
  },
]

// ─── 4. Evaluation criteria ──────────────────────────────────────────────────
const BANNED_STARTERS = [
  'beautifully', 'thoughtfully', 'meticulously', 'gorgeously', 'lovingly',
  'immaculate', 'charming', 'spacious', 'perfectly', 'exquisitely',
  'elegantly', 'tastefully', 'wonderfully', 'exceptionally', 'nestled',
  'discover', 'welcome', 'rarely',
]

const BANNED_LANGUAGE = [
  'appears to be', 'seems to', 'possibly', 'probably', 'might be', 'could be',
  'affordable', 'value', 'entry point', 'price point', 'budget-friendly',
  "won't last long", 'priced to sell', 'great deal', 'steal', 'bargain',
  "don't miss", 'hurry', 'act now', 'once in a lifetime', 'dream home', "this won't last",
  'as seen in photos', 'pictured here', 'aerial view shows', 'visible in photos',
  'perfect for families', 'great for young professionals', 'ideal for couples',
  'safe neighborhood', 'quiet neighborhood',
  'just minutes', 'short drive', 'quick drive', 'easy commute to',
]

const EXCLAIM_CAPS = [
  /!/,
  // Flag 4+ letter ALL-CAPS words that are NOT legitimate real estate / location abbreviations
  /\b(?!MLS|FCPS|NOVA|VDOT|USDA|HVAC|HGTV|LEED|ADU|HOA|VRE|SFH|SZ|VA|DC|MD|ZIP|PDF|HOA|I-\d+)[A-Z]{4,}\b/
]

const SECTIONS = ['[ADDRESS]', '[MLS DESCRIPTION]', '[ZILLOW · WHAT\'S SPECIAL]', '[INSTAGRAM CAPTION]']

function evaluate(tc, output) {
  const scores = {}
  const notes = {}
  const text = output.toLowerCase()
  const lines = output.split('\n')

  // ── C1: Banned language (10 pts) ──────────────────────────────────────────
  {
    const found = BANNED_LANGUAGE.filter(w => text.includes(w.toLowerCase()))

    // Strip section-header lines (e.g. "[ADDRESS]", "[MLS DESCRIPTION]", "[INSTAGRAM CAPTION]")
    // before checking all-caps — they're structural labels, not prose.
    const proseForCaps = output
      .split('\n')
      .filter(line => !/^\s*\[[A-Z][A-Z0-9 ·'–—\-]+\]\s*$/.test(line.trim()))
      .join('\n')

    // Report the actual triggering words, not just the regex pattern
    const capsMatches = []
    const ALLOWED_CAPS = new Set(['MLS','FCPS','NOVA','VDOT','USDA','HVAC','HGTV','LEED','ADU','HOA','VRE','SFH','SZ','VA','DC','MD','ZIP','PDF'])
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
    notes.c1_banned = allBad.length ? `Found: ${[...new Set(allBad)].join(', ')}` : 'PASS'
  }

  // ── C2: Sentence-starter ban (10 pts) ─────────────────────────────────────
  {
    const sentences = output.split(/(?<=[.!?])\s+/)
    const bad = sentences.filter(s => {
      const first = s.trim().split(/\s+/)[0].toLowerCase().replace(/[^a-z]/g, '')
      return BANNED_STARTERS.includes(first)
    })
    scores.c2_starters = bad.length === 0 ? 10 : Math.max(0, 10 - bad.length * 2)
    notes.c2_starters = bad.length ? `Bad starters: ${bad.slice(0, 3).join(' | ')}` : 'PASS'
  }

  // ── C3: Physical anchor (10 pts) — check each ZILLOW paragraph ────────────
  {
    const zStart = output.indexOf("[ZILLOW · WHAT'S SPECIAL]")
    const igStart = output.indexOf('[INSTAGRAM CAPTION]')
    const zillow = zStart !== -1 && igStart !== -1 ? output.slice(zStart, igStart) : ''
    const paragraphs = zillow.split(/\n\n+/).filter(p => p.trim().length > 30)
    const ANCHORS = ['floor', 'ceiling', 'window', 'wood', 'stone', 'brick', 'tile', 'layout',
      'garage', 'kitchen', 'bath', 'bedroom', 'sqft', 'sq ft', 'acre', 'yard', 'deck',
      'patio', 'countertop', 'hardwood', 'steel', 'quartz', 'cabinet', 'foyer', 'stair',
      'fireplace', 'beam', 'vault', 'open', 'living', 'dining', 'light', 'finish']
    const anchored = paragraphs.filter(p => ANCHORS.some(a => p.toLowerCase().includes(a)))
    const ratio = paragraphs.length ? anchored.length / paragraphs.length : 1
    scores.c3_anchor = Math.round(ratio * 10)
    notes.c3_anchor = paragraphs.length ? `${anchored.length}/${paragraphs.length} paragraphs anchored` : 'No Zillow section'
  }

  // ── C4: Tier tone appropriate for case (10 pts) ───────────────────────────
  {
    const check = tc.check || {}
    let pass = 10
    // Tier 1: no price-tier superlative checks
    if (check.expectsTier1Tone) {
      const hasLuxurySignal = /architectural|craftsmanship|material|specification|precision|understated/i.test(output)
      if (!hasLuxurySignal) { pass -= 4; notes.c4_tier = 'Missing Tier 1 luxury signals' }
    }
    // Tier 5: no emotional inflation
    if (check.noEmotionalInflation || check.expectsTier5Tone) {
      const inflated = /stunning|magnificent|spectacular|gorgeous|extraordinary/i.test(output)
      if (inflated) { pass -= 5; notes.c4_tier = (notes.c4_tier || '') + ' Emotional inflation in Tier 5' }
    }
    scores.c4_tier = Math.max(0, pass)
    if (!notes.c4_tier) notes.c4_tier = 'PASS'
  }

  // ── C5: Regional flavor (10 pts) ─────────────────────────────────────────
  {
    const check = tc.check || {}
    let pass = 10
    if (check.expectsCascadesLanguage) {
      if (!/cascades|cascades golf|cascades marketplace|lowes island|potomac river/i.test(output)) {
        pass -= 5; notes.c5_regional = 'Missing Sterling/Cascades regional flavor'
      }
    }
    if (check.expectsLoudounFlavor) {
      if (!/loudoun|silver line|data center|master.?planned|trail network|HOA/i.test(output)) {
        pass -= 4; notes.c5_regional = 'Missing Loudoun regional flavor'
      }
    }
    if (check.expectsNatureLanguage) {
      if (!/trail|lake|nature|park|outdoor|walk/i.test(output)) {
        pass -= 4; notes.c5_regional = 'Missing Reston nature flavor'
      }
    }
    if (check.noNatureLanguage && /trail|lake nature|outdoor recreation/i.test(output)) {
      pass -= 3; notes.c5_regional = 'Reston Town Center should NOT use nature language'
    }
    if (check.noUrbanFlavor && /metro.?centric|urban professional|transit.?centric/i.test(output)) {
      pass -= 3; notes.c5_regional = 'Reston residential should NOT use urban professional flavor'
    }
    if (check.expectsUrbanFlavor) {
      if (!/metro|walkable|transit|dining|urban/i.test(output)) {
        pass -= 4; notes.c5_regional = 'Missing urban flavor for Arlington/Alexandria'
      }
    }
    if (check.expectsCommuterLanguage) {
      if (!/i-95|i-66|route 28|commut|vre/i.test(output)) {
        pass -= 3; notes.c5_regional = 'Missing commuter language for Tier 4/5'
      }
    }
    if (check.noMcLeanLanguage) {
      if (/embassy|equestrian|country.?estate|embassy.?corridor/i.test(output)) {
        pass -= 5; notes.c5_regional = 'McLean language used for non-McLean address!'
      }
    }
    if (check.expectsHistoricLanguage) {
      if (!/historic|federal|colonial|waterfront|boutique|king.?street/i.test(output)) {
        pass -= 4; notes.c5_regional = 'Missing Old Town historic/boutique language'
      }
    }
    if (check.expectsGainesvilleFlavor) {
      if (!/i-66|gainesville|haymarket|newer|construction|growing/i.test(output)) {
        pass -= 3; notes.c5_regional = 'Missing Gainesville/Haymarket regional flavor'
      }
    }
    scores.c5_regional = Math.max(0, pass)
    if (!notes.c5_regional) notes.c5_regional = 'PASS'
  }

  // ── C6: Community identity (10 pts) ──────────────────────────────────────
  {
    const check = tc.check || {}
    let pass = 10
    if (check.expectsFCCitySchools && !/falls church city school/i.test(output)) {
      pass -= 6; notes.c6_community = 'Missing Falls Church City Schools mention'
    }
    if (check.noFCCitySchools && /falls church city school/i.test(output)) {
      pass -= 6; notes.c6_community = 'Falls Church City Schools wrongly mentioned for Fairfax ZIP'
    }
    if (check.expectsMadisonHS && !/madison/i.test(output)) {
      pass -= 4; notes.c6_community = 'Missing Madison HS mention for Vienna/Oakton'
    }
    if (check.expectsWaterfrontLanguage && !/waterfront|potomac|river/i.test(output)) {
      pass -= 4; notes.c6_community = 'Missing waterfront language for Old Town waterfront'
    }
    if (check.expectsVRE && !/vre|commuter rail/i.test(output)) {
      pass -= 4; notes.c6_community = 'Missing VRE mention for Stafford'
    }
    scores.c6_community = Math.max(0, pass)
    if (!notes.c6_community) notes.c6_community = 'PASS'
  }

  // ── C7: MLS first sentence format (10 pts) ────────────────────────────────
  {
    const mlsStart = output.indexOf('[MLS DESCRIPTION]')
    const zillowStart = output.indexOf("[ZILLOW · WHAT'S SPECIAL]")
    const mls = mlsStart !== -1 ? output.slice(mlsStart, zillowStart !== -1 ? zillowStart : undefined) : ''
    const firstSentence = mls.split(/\.\s/)[0] || ''

    // MLS format check: [N]-bedroom, [N]-bath [type] in [community]
    const hasFormat = /\d+-bedroom.*\d+.*bath.*in\s/i.test(firstSentence)
    const hasAlt = /single.?family|townhome|townhouse|condo|home\s+in\s/i.test(firstSentence)
    scores.c7_mls_format = hasFormat ? 10 : hasAlt ? 6 : 3
    notes.c7_mls_format = hasFormat ? 'PASS' : hasAlt ? 'Partial format match' : `First sentence: "${firstSentence.slice(0, 80)}"`
  }

  // ── C8: Zillow 3-paragraph structure (10 pts) ─────────────────────────────
  {
    const zStart = output.indexOf("[ZILLOW · WHAT'S SPECIAL]")
    const igStart = output.indexOf('[INSTAGRAM CAPTION]')
    const zillow = zStart !== -1 && igStart !== -1 ? output.slice(zStart, igStart) : ''
    const paragraphs = zillow.split(/\n\n+/).filter(p => p.trim().length > 30)
    scores.c8_zillow_structure = paragraphs.length >= 3 ? 10 : paragraphs.length === 2 ? 7 : 4
    notes.c8_zillow_structure = `${paragraphs.length} paragraph(s) found`
  }

  // ── C9: Hashtag count 5–7 (10 pts) ───────────────────────────────────────
  {
    const igStart = output.indexOf('[INSTAGRAM CAPTION]')
    const ig = igStart !== -1 ? output.slice(igStart) : ''
    const hashtags = (ig.match(/#\w+/g) || [])
    const count = hashtags.length
    scores.c9_hashtags = (count >= 5 && count <= 7) ? 10 : (count >= 4 && count <= 8) ? 6 : 0
    notes.c9_hashtags = `${count} hashtags: ${hashtags.join(' ')}`
  }

  // ── C10: No fabrication / Metro Hard Block check (10 pts) ────────────────
  {
    const check = tc.check || {}
    let pass = 10
    if (check.hardBlockCheck) {
      if (/innovation center|ashburn metro|silver line.*metro/i.test(output)) {
        pass = 0; notes.c10_fabrication = 'HARD BLOCK VIOLATION: Metro mentioned for Sterling!'
      }
    }
    if (check.noMetroMention) {
      if (/metro|silver line|wiehle|herndon.?metro/i.test(output)) {
        pass -= 6; notes.c10_fabrication = 'Metro mentioned without agent confirmation'
      }
    }
    if (check.metroOkIfConfirmed) {
      // Metro is expected when agent notes confirm — no deduction
    }
    if (check.noPriceInOutput) {
      if (/\$[\d,]+,\d{3}|\$\d+[kK]/i.test(output)) {
        pass -= 4; notes.c10_fabrication = 'Price shown but not confirmed in notes'
      }
    }
    scores.c10_fabrication = Math.max(0, pass)
    if (!notes.c10_fabrication) notes.c10_fabrication = 'PASS'
  }

  const total = Object.values(scores).reduce((a, b) => a + b, 0)
  return { scores, notes, total, maxTotal: 100 }
}

// ─── 5. Utility helpers ──────────────────────────────────────────────────────
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function hasSections(output) {
  return SECTIONS.every(s => output.includes(s))
}

// ─── 6. Main runner ──────────────────────────────────────────────────────────
async function main() {
  // ── Resume mode: load prior results and skip already-passed cases ──────────
  const jsonPath = path.join(__dirname, 'test_results_final.json')
  let priorResults = []
  if (fs.existsSync(jsonPath)) {
    try {
      priorResults = JSON.parse(fs.readFileSync(jsonPath, 'utf8'))
    } catch (_) {}
  }
  const passedIds = new Set(priorResults.filter(r => !r.error).map(r => r.id))
  const casesToRun = TEST_CASES.filter(tc => !passedIds.has(tc.id))
  const skipped = TEST_CASES.length - casesToRun.length

  console.log(`\n${'═'.repeat(60)}`)
  console.log('  Intelist Pro — Prompt Test Runner')
  console.log(`  ${TEST_CASES.length} test cases · claude-opus-4-6`)
  if (skipped > 0) console.log(`  Resuming: ${skipped} already passed, running ${casesToRun.length} remaining`)
  console.log(`${'═'.repeat(60)}\n`)

  // Seed results with already-passed entries (preserving original order)
  const resultMap = new Map(priorResults.filter(r => !r.error).map(r => [r.id, r]))
  const startTime = Date.now()

  for (let i = 0; i < casesToRun.length; i++) {
    const tc = casesToRun[i]
    const globalIdx = TEST_CASES.findIndex(c => c.id === tc.id) + 1
    const idx = String(globalIdx).padStart(2, '0')
    process.stdout.write(`[${idx}/${TEST_CASES.length}] ${tc.id} · ${tc.label}... `)

    let output = ''
    let error = null

    try {
      const prompt = buildPrompt({
        address: tc.address,
        agentNotes: tc.agentNotes || '',
        schoolBlock: tc.schoolBlock || '',
        communityBlock: tc.communityBlock || '',
        zillowBlock: tc.zillowBlock || '',
        prevBlock: tc.prevBlock || '',
      })

      const msg = await client.messages.create({
        model: 'claude-opus-4-6',
        max_tokens: 1500,
        messages: [{ role: 'user', content: prompt }],
      })

      output = msg.content.map(b => b.type === 'text' ? b.text : '').join('')

      if (!hasSections(output)) {
        error = 'Missing expected output sections'
      }
    } catch (e) {
      error = e.message
    }

    const evaluation = error
      ? { scores: {}, notes: { error }, total: 0, maxTotal: 100 }
      : evaluate(tc, output)

    const result = {
      id: tc.id,
      label: tc.label,
      tier: tc.tier,
      address: tc.address,
      agentNotes: tc.agentNotes,
      output,
      error,
      evaluation,
    }

    resultMap.set(tc.id, result)

    const score = evaluation.total
    const bar = '█'.repeat(Math.round(score / 10)) + '░'.repeat(10 - Math.round(score / 10))
    console.log(`${bar} ${score}/100${error ? ' ⚠ ' + error : ''}`)

    // Save partial results after every 10 calls
    if ((i + 1) % 10 === 0) {
      const merged = TEST_CASES.map(c => resultMap.get(c.id)).filter(Boolean)
      fs.writeFileSync(
        path.join(__dirname, 'test_results_final.json'),
        JSON.stringify(merged, null, 2)
      )
      console.log(`  ↳ Checkpoint saved (${merged.length} results)\n`)
    }

    // Rate-limit delay (skip after last item)
    if (i < casesToRun.length - 1) {
      await sleep(3000)
    }
  }

  const elapsed = ((Date.now() - startTime) / 60000).toFixed(1)
  const results = TEST_CASES.map(c => resultMap.get(c.id)).filter(Boolean)

  console.log(`\n${'═'.repeat(60)}`)
  console.log(`  Done! ${results.length} tests in ${elapsed} min`)
  console.log(`${'═'.repeat(60)}\n`)

  // ─── 7. Save JSON results ───────────────────────────────────────────────
  fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2))
  console.log(`✅ test_results_final.json saved (${results.length} entries)`)

  // ─── 8. Generate markdown report ───────────────────────────────────────
  const totalScore = results.reduce((s, r) => s + (r.evaluation.total || 0), 0)
  const avgScore = (totalScore / results.length).toFixed(1)

  const CRITERIA = [
    ['c1_banned', 'Banned Language'],
    ['c2_starters', 'Sentence-Starter Ban'],
    ['c3_anchor', 'Physical Anchor'],
    ['c4_tier', 'Tier Tone'],
    ['c5_regional', 'Regional Flavor'],
    ['c6_community', 'Community Identity'],
    ['c7_mls_format', 'MLS First-Sentence Format'],
    ['c8_zillow_structure', 'Zillow 3-Para Structure'],
    ['c9_hashtags', 'Hashtag Count (5–7)'],
    ['c10_fabrication', 'No Fabrication / Hard Block'],
  ]

  // Per-criterion averages
  const criterionAvgs = CRITERIA.map(([key, label]) => {
    const vals = results.map(r => r.evaluation.scores?.[key] ?? 0)
    const avg = (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1)
    return { key, label, avg: parseFloat(avg) }
  })

  // Failures (score < 60)
  const failures = results.filter(r => r.evaluation.total < 60)

  // Hard block violations
  const hardBlockViolations = results.filter(r =>
    r.evaluation.notes?.c10_fabrication?.includes('HARD BLOCK')
  )

  const now = new Date().toISOString().slice(0, 10)
  let md = `# Intelist Pro — Test Report\n`
  md += `**Date:** ${now}  \n`
  md += `**Model:** claude-opus-4-6  \n`
  md += `**Total cases:** ${results.length}  \n`
  md += `**Average score:** ${avgScore}/100  \n`
  md += `**Runtime:** ${elapsed} min  \n\n`

  md += `---\n\n## Criterion Averages\n\n`
  md += `| Criterion | Avg (out of 10) | Status |\n`
  md += `|-----------|-----------------|--------|\n`
  for (const { label, avg } of criterionAvgs) {
    const status = avg >= 8 ? '🟢' : avg >= 6 ? '🟡' : '🔴'
    md += `| ${label} | ${avg} | ${status} |\n`
  }

  md += `\n---\n\n## Results by Case\n\n`
  md += `| ID | Label | Score | C1 | C2 | C3 | C4 | C5 | C6 | C7 | C8 | C9 | C10 |\n`
  md += `|----|----|----|----|----|----|----|----|----|----|----|----|----|\n`
  for (const r of results) {
    const s = r.evaluation.scores || {}
    const scoreStr = r.error ? `ERR` : `${r.evaluation.total}/100`
    md += `| ${r.id} | ${r.label} | ${scoreStr} | ${s.c1_banned ?? '-'} | ${s.c2_starters ?? '-'} | ${s.c3_anchor ?? '-'} | ${s.c4_tier ?? '-'} | ${s.c5_regional ?? '-'} | ${s.c6_community ?? '-'} | ${s.c7_mls_format ?? '-'} | ${s.c8_zillow_structure ?? '-'} | ${s.c9_hashtags ?? '-'} | ${s.c10_fabrication ?? '-'} |\n`
  }

  if (hardBlockViolations.length > 0) {
    md += `\n---\n\n## ⛔ Hard Block Violations (Critical)\n\n`
    for (const r of hardBlockViolations) {
      md += `### ${r.id} — ${r.label}\n`
      md += `**Address:** ${r.address}  \n`
      md += `**Notes:** ${r.agentNotes}  \n`
      md += `**Violation:** ${r.evaluation.notes.c10_fabrication}  \n\n`
      const excerpt = r.output.slice(0, 600)
      md += `\`\`\`\n${excerpt}\n\`\`\`\n\n`
    }
  }

  if (failures.length > 0) {
    md += `\n---\n\n## ⚠️ Cases with Score < 60\n\n`
    for (const r of failures) {
      md += `### ${r.id} — ${r.label} (${r.evaluation.total}/100)\n`
      md += `**Address:** ${r.address}  \n`
      md += `**Issues:**  \n`
      for (const [key, label] of CRITERIA) {
        const note = r.evaluation.notes?.[key]
        if (note && note !== 'PASS') md += `- **${label}**: ${note}  \n`
      }
      md += '\n'
      const excerpt = r.output.slice(0, 500)
      md += `<details><summary>Output excerpt</summary>\n\n\`\`\`\n${excerpt}...\n\`\`\`\n</details>\n\n`
    }
  }

  md += `\n---\n\n## Criterion Notes (Failed Cases)\n\n`
  for (const [key, label] of CRITERIA) {
    const failNotes = results
      .filter(r => r.evaluation.notes?.[key] && r.evaluation.notes[key] !== 'PASS')
      .map(r => `- **${r.id}**: ${r.evaluation.notes[key]}`)
    if (failNotes.length) {
      md += `### ${label}\n${failNotes.join('\n')}\n\n`
    }
  }

  md += `\n---\n_Generated by scripts/test_runner.js_\n`

  const mdPath = path.join(__dirname, 'test_report_final.md')
  fs.writeFileSync(mdPath, md)
  console.log(`✅ test_report_final.md saved`)

  // Print summary table to terminal
  console.log('\n── Criterion Summary ──────────────────────────────────────')
  for (const { label, avg } of criterionAvgs) {
    const bar = '█'.repeat(Math.round(avg)) + '░'.repeat(10 - Math.round(avg))
    const flag = avg < 6 ? ' ⚠' : ''
    console.log(`  ${bar} ${avg.toFixed(1)}/10  ${label}${flag}`)
  }
  console.log(`\n  Overall average: ${avgScore}/100`)
  if (hardBlockViolations.length) {
    console.log(`\n  ⛔ HARD BLOCK VIOLATIONS: ${hardBlockViolations.length}`)
    hardBlockViolations.forEach(r => console.log(`     → ${r.id} ${r.label}`))
  }
  console.log()
}

main().catch(e => {
  console.error('Fatal error:', e)
  process.exit(1)
})
