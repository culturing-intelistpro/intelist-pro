# Multilingual Revision Test Report
Generated: 2026-06-09 03:36:42

## Summary
| Metric | Result |
|---|---|
| Tests run | 8 |
| PASS | 8 |
| FAIL | 0 |
| Average score | 10.0/10 |
| masterPrompt included | ALL YES ✓ |

## Test Results

### [PASS ✓] Test 1: Hindi (Devanagari)

**Request:** `स्कूल की जानकारी हटाएं`
**Translation:** "Remove school information"
**Section:** mls | **Expected:** school info removed

| Check | Result | Detail |
|---|---|---|
| masterPrompt included | ✓ YES | Total: 20,306 chars, Master: 18,807 chars |
| English only | ✓ YES | Clean |
| No banned words | ✓ PASS | None found |
| No exclamation marks | ✓ PASS | Clean |
| Request reflected | ✓ YES | School info removed ✓ |

**Score: 10/10**
**Response time:** 4.0s | **Output:** 169 words

<details>
<summary>Full output (click to expand)</summary>

```
4-bedroom, 3.5-bath single-family home in Lowes Island, Sterling, VA. 2,840 square feet of finished living space listed at $749,000. HOA fee of $85 per month covers common area maintenance and tot lot upkeep.

The main level features hardwood flooring throughout the living and dining areas, a kitchen updated in 2021 with quartz countertops and stainless steel appliances, and a two-car garage with interior access. A gas fireplace anchors the family room, which opens to a rear composite deck overlooking a fully fenced backyard. The upper level holds four bedrooms, including a primary suite with a walk-in closet and an en suite bath featuring a dual-sink vanity and soaking tub. The finished lower level adds a full bath and flex room suited for a home office or exercise space.

The property sits on a 0.22-acre lot within the Lowes Island community, with access to the Cascades trail network and proximity to Cascades Marketplace for daily errands. The Potomac River waterfront and Algonkian Regional Park are accessible via the trail system.
```

</details>

---

### [PASS ✓] Test 2: Arabic (Arabic)

**Request:** `اجعل النبرة أكثر فخامة وركز على المطبخ`
**Translation:** "Make the tone more luxurious and focus on the kitchen"
**Section:** zillow | **Expected:** kitchen emphasis (tone must NOT upgrade to Tier 1)

| Check | Result | Detail |
|---|---|---|
| masterPrompt included | ✓ YES | Total: 20,516 chars, Master: 18,807 chars |
| English only | ✓ YES | Clean |
| No banned words | ✓ PASS | None found |
| No exclamation marks | ✓ PASS | Clean |
| Request reflected | ✓ YES | Kitchen emphasis present ✓ |

**Score: 10/10**
**Response time:** 8.8s | **Output:** 264 words

<details>
<summary>Full output (click to expand)</summary>

```
The hardwood floors and open-plan main level create a continuous sightline from the entry through the living areas, grounding the home in a layout built for daily function and easy circulation. The 2021 kitchen renovation anchors the main level — quartz countertops run the full length of the prep surfaces, paired with a subway tile backsplash and stainless steel appliances that bring a polished, contemporary edge to the space. Cabinet storage is generous, and the countertop layout accommodates both meal preparation and casual gathering without crowding the footprint. A gas fireplace in the adjoining family room adds a second focal point, balancing the kitchen's clean material palette with warmth.

A composite deck extends from the main level, overlooking a fully fenced backyard backed by established plantings that provide a layered screen of privacy. The upper level organizes four bedrooms around a wide hallway, with the primary suite set in the rear corner for separation from secondary rooms. The en suite bath — soaking tub and dual-sink vanity — reinforces the home's emphasis on finish quality carried through from the kitchen level. The finished lower level includes a full bath and flexible square footage suited to a dedicated office, workout space, or both.

Lowes Island's trail network connects the property to Cascades paths and Algonkian Regional Park's Potomac River frontage as a genuine extension of daily routine. Cascades Marketplace handles everyday errands, while Dulles Town Center and One Loudoun broaden the retail and dining range. The Potomac Falls High School pyramid within Loudoun County Public Schools anchors the neighborhood for households prioritizing established school options.
```

</details>

---

### [PASS ✓] Test 3: Chinese (Simplified)

**Request:** `删除学区信息，突出户外空间`
**Translation:** "Remove school district info, highlight outdoor space"
**Section:** mls | **Expected:** school removed, outdoor/deck/yard highlighted

| Check | Result | Detail |
|---|---|---|
| masterPrompt included | ✓ YES | Total: 20,297 chars, Master: 18,807 chars |
| English only | ✓ YES | Clean |
| No banned words | ✓ PASS | None found |
| No exclamation marks | ✓ PASS | Clean |
| Request reflected | ✓ YES | School info removed ✓ |

**Score: 10/10**
**Response time:** 4.9s | **Output:** 179 words

<details>
<summary>Full output (click to expand)</summary>

```
4-bedroom, 3.5-bath single-family home in Lowes Island, Sterling, VA. 2,840 square feet of finished living space listed at $749,000. HOA fee of $85 per month covers common area maintenance and tot lot upkeep.

The main level features hardwood flooring throughout the living and dining areas, a kitchen updated in 2021 with quartz countertops and stainless steel appliances, and a two-car garage with interior access. A gas fireplace anchors the family room, which opens directly to a rear composite deck. The upper level holds four bedrooms, including a primary suite with a walk-in closet and an en suite bath featuring a dual-sink vanity and soaking tub. The finished lower level adds a full bath and flex room suited for a home office or exercise space.

The composite deck extends the living space to a fully fenced backyard on a 0.22-acre lot, providing a contained outdoor area for dining, grilling, or seasonal use. The Lowes Island community offers access to the Cascades trail network, connecting to the Potomac River waterfront and Algonkian Regional Park. Cascades Marketplace is accessible for daily errands.
```

</details>

---

### [PASS ✓] Test 4: Urdu (Nastaliq)

**Request:** `پڑوس کی مزید تفصیلات شامل کریں`
**Translation:** "Add more neighborhood details"
**Section:** zillow | **Expected:** more neighborhood context (only verified facts)

| Check | Result | Detail |
|---|---|---|
| masterPrompt included | ✓ YES | Total: 20,508 chars, Master: 18,807 chars |
| English only | ✓ YES | Clean |
| No banned words | ✓ PASS | None found |
| No exclamation marks | ✓ PASS | Clean |
| Request reflected | ✓ YES | Neighborhood details present ✓ |

**Score: 10/10**
**Response time:** 7.9s | **Output:** 256 words

<details>
<summary>Full output (click to expand)</summary>

```
The hardwood floors and open-plan main level establish a clear sense of flow from the moment you step inside. The 2021 kitchen renovation — quartz countertops, subway tile backsplash, stainless appliances — brings the space current without erasing the warmth of the gas fireplace in the adjoining family room. A composite deck extends the living space outward, overlooking a fully fenced backyard that backs to established plantings for a measure of privacy.

The upper level's four bedrooms are organized around a wide hallway, with the primary suite occupying the rear corner for separation from the secondary rooms. The en suite bath's soaking tub and dual-sink vanity reflect the home's practical approach to comfort. The finished lower level — full bath included — handles the overflow that a four-bedroom household generates: a dedicated office, a workout room, or both.

Lowes Island's master-planned layout places the Cascades trail network and Algonkian Regional Park's Potomac River shoreline within genuine reach of the property — not theoretical amenities on a map. The Cascades community pool, tennis courts, and recreation facilities reinforce the neighborhood's established infrastructure for year-round activity. Cascades Marketplace anchors daily errands with grocery, dining, and service options, while Dulles Town Center and One Loudoun extend the retail and restaurant range across the broader Loudoun corridor. The Lowes Island streetscape itself — mature tree canopy, sidewalk connectivity, and cul-de-sac pockets — reflects over two decades of neighborhood continuity. The Potomac Falls High School pyramid within Loudoun County Public Schools anchors the community's appeal for households prioritizing established school options.
```

</details>

---

### [PASS ✓] Test 5: Spanish (Latin)

**Request:** `Hazlo más corto y enfócate en los hechos`
**Translation:** "Make it shorter and focus on facts"
**Section:** mls | **Expected:** shorter, more fact-focused

| Check | Result | Detail |
|---|---|---|
| masterPrompt included | ✓ YES | Total: 20,324 chars, Master: 18,807 chars |
| English only | ✓ YES | Clean |
| No banned words | ✓ PASS | None found |
| No exclamation marks | ✓ PASS | Clean |
| Request reflected | ✓ YES | 141 words vs 182 original (77%) |

**Score: 10/10**
**Response time:** 4.3s | **Output:** 141 words

<details>
<summary>Full output (click to expand)</summary>

```
4-bedroom, 3.5-bath single-family home in Lowes Island, Sterling, VA. 2,840 square feet of finished living space listed at $749,000. HOA fee of $85 per month covers common area maintenance and tot lot upkeep.

Hardwood flooring runs through the main-level living and dining areas. The kitchen, updated in 2021, includes quartz countertops and stainless steel appliances. A gas fireplace anchors the family room, which opens to a composite deck and fully fenced backyard. A two-car garage provides interior access. The upper level holds four bedrooms, including a primary suite with walk-in closet, dual-sink vanity, and soaking tub. The finished lower level adds a full bath and flex room.

The 0.22-acre lot sits within the Lowes Island community, with access to the Cascades trail network and proximity to Cascades Marketplace. Located within the Potomac Falls High School pyramid in Loudoun County Public Schools.
```

</details>

---

### [PASS ✓] Test 6: Vietnamese (Latin)

**Request:** `Làm ngắn hơn và tập trung vào sân ngoài`
**Translation:** "Make it shorter and focus on the outdoor area"
**Section:** zillow | **Expected:** shorter, outdoor area focus

| Check | Result | Detail |
|---|---|---|
| masterPrompt included | ✓ YES | Total: 20,517 chars, Master: 18,807 chars |
| English only | ✓ YES | Clean |
| No banned words | ✓ PASS | None found |
| No exclamation marks | ✓ PASS | Clean |
| Request reflected | ✓ YES | Outdoor emphasis present ✓ |

**Score: 10/10**
**Response time:** 6.0s | **Output:** 142 words

<details>
<summary>Full output (click to expand)</summary>

```
The composite deck and fully fenced backyard define this home's outdoor footprint — established plantings along the rear boundary provide a natural screen, and the flat grading keeps the full yard usable. The gas fireplace and open main level connect directly to the deck through rear access, extending the living space outward across seasons.

Inside, the 2021 kitchen renovation — quartz countertops, subway tile backsplash, stainless appliances — anchors the main level alongside hardwood floors throughout. Four upper-level bedrooms include a primary suite with en suite soaking tub and dual-sink vanity. The finished lower level with full bath adds flexible space for an office, recreation, or both.

Lowes Island's Cascades trail network and Algonkian Regional Park's riverfront are accessible from the property. Cascades Marketplace handles daily errands, and the Potomac Falls High School pyramid within Loudoun County Public Schools serves the neighborhood.
```

</details>

---

### [PASS ✓] Test 7: Telugu (Telugu)

**Request:** `పాఠశాల సమాచారం తీసివేయండి`
**Translation:** "Remove school information"
**Section:** instagram | **Expected:** school hashtag removed, other 5-7 hashtags preserved

| Check | Result | Detail |
|---|---|---|
| masterPrompt included | ✓ YES | Total: 19,637 chars, Master: 18,807 chars |
| English only | ✓ YES | Clean |
| No banned words | ✓ PASS | None found |
| No exclamation marks | ✓ PASS | Clean |
| Request reflected | ✓ YES | School info removed ✓ |
| Instagram hashtags | Hashtags: 6 (PASS ✓) | — |

**Score: 10/10**
**Response time:** 2.4s | **Output:** 53 words

<details>
<summary>Full output (click to expand)</summary>

```
Hardwood floors, a 2021 kitchen remodel, and a gas fireplace — this Lowes Island home delivers the details that matter.

• 4 bed / 3.5 bath | 2,840 sq ft
• Quartz countertops, composite deck, fenced yard
• Lowes Island trails and Cascades Marketplace

Listed at $749K.

#SterlingVA #LowesIsland #NorthernVirginia #SingleFamilyHome #JustListed #NoVAHomes
```

</details>

---

### [PASS ✓] Test 8: Korean (Hangul)

**Request:** `더 짧게, 야외 공간 강조해줘`
**Translation:** "Make it shorter, emphasize outdoor space"
**Section:** zillow | **Expected:** shorter, deck/yard/trails emphasis

| Check | Result | Detail |
|---|---|---|
| masterPrompt included | ✓ YES | Total: 20,494 chars, Master: 18,807 chars |
| English only | ✓ YES | Clean |
| No banned words | ✓ PASS | None found |
| No exclamation marks | ✓ PASS | Clean |
| Request reflected | ✓ YES | Outdoor emphasis present ✓ |

**Score: 10/10**
**Response time:** 5.3s | **Output:** 146 words

<details>
<summary>Full output (click to expand)</summary>

```
The hardwood floors and open-plan main level establish a clear sense of flow, with the 2021 kitchen renovation — quartz countertops, subway tile backsplash, stainless appliances — anchoring the heart of the home. A gas fireplace grounds the adjoining family room.

The composite deck extends the main level outward into a fully fenced backyard backed by mature plantings, creating a layered outdoor space with genuine privacy. Lowes Island's trail network connects directly to Cascades paths and Algonkian Regional Park's Potomac riverfront, making the property's outdoor reach larger than its lot line suggests.

Four upper-level bedrooms include a primary suite with en suite soaking tub and dual-sink vanity. The finished lower level with full bath flexes as office, recreation, or both. Cascades Marketplace handles daily errands, and the Potomac Falls High School pyramid within Loudoun County Public Schools anchors the neighborhood for households prioritizing established school options.
```

</details>

---

## Quick Reference Table

| # | Language | PASS/FAIL | English | Banned | Request | Score |
|---|---|---|---|---|---|---|
| 1 | Hindi | ✓ PASS | ✓ | ✓ | ✓ | 10/10 |
| 2 | Arabic | ✓ PASS | ✓ | ✓ | ✓ | 10/10 |
| 3 | Chinese | ✓ PASS | ✓ | ✓ | ✓ | 10/10 |
| 4 | Urdu | ✓ PASS | ✓ | ✓ | ✓ | 10/10 |
| 5 | Spanish | ✓ PASS | ✓ | ✓ | ✓ | 10/10 |
| 6 | Vietnamese | ✓ PASS | ✓ | ✓ | ✓ | 10/10 |
| 7 | Telugu | ✓ PASS | ✓ | ✓ | ✓ | 10/10 |
| 8 | Korean | ✓ PASS | ✓ | ✓ | ✓ | 10/10 |

