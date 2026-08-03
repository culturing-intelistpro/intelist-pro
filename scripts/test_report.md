# Intelist Pro — Test Report
**Date:** 2026-05-29  
**Model:** claude-opus-4-6  
**Total cases:** 75  
**Average score:** 96.3/100  
**Runtime:** 30.1 min  

---

## Criterion Averages

| Criterion | Avg (out of 10) | Status |
|-----------|-----------------|--------|
| Banned Language | 7 | 🟡 |
| Sentence-Starter Ban | 10 | 🟢 |
| Physical Anchor | 9.4 | 🟢 |
| Tier Tone | 9.9 | 🟢 |
| Regional Flavor | 10 | 🟢 |
| Community Identity | 10 | 🟢 |
| MLS First-Sentence Format | 9.9 | 🟢 |
| Zillow 3-Para Structure | 10 | 🟢 |
| Hashtag Count (5–7) | 10 | 🟢 |
| No Fabrication / Hard Block | 10 | 🟢 |

---

## Results by Case

| ID | Label | Score | C1 | C2 | C3 | C4 | C5 | C6 | C7 | C8 | C9 | C10 |
|----|----|----|----|----|----|----|----|----|----|----|----|----|
| T1-01 | McLean SFH $2.8M | 97/100 | 7 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 |
| T1-02 | McLean Condo $1.6M | 97/100 | 7 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 |
| T1-03 | Great Falls SFH $3.2M | 90/100 | 7 | 10 | 10 | 10 | 10 | 10 | 3 | 10 | 10 | 10 |
| T1-04 | Vienna SFH $1.8M (no-price-given → default T2) | 94/100 | 7 | 10 | 7 | 10 | 10 | 10 | 10 | 10 | 10 | 10 |
| T1-05 | Vienna SFH $750K | 94/100 | 7 | 10 | 7 | 10 | 10 | 10 | 10 | 10 | 10 | 10 |
| T1-06 | Falls Church City SFH $1.1M | 97/100 | 7 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 |
| T1-07 | Falls Church City Townhouse $895K | 97/100 | 7 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 |
| T1-08 | Old Town Alexandria Waterfront Condo $1.35M | 97/100 | 7 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 |
| T1-09 | Old Town Alexandria SFH $1.9M | 97/100 | 7 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 |
| T1-10 | Arlington Clarendon Condo $1.7M | 93/100 | 7 | 10 | 10 | 6 | 10 | 10 | 10 | 10 | 10 | 10 |
| T1-11 | McLean SFH price unknown (T1 default) | 97/100 | 7 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 |
| T1-12 | Great Falls SFH $900K (T2 floor applied) | 97/100 | 7 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 |
| T2-01 | Arlington Ballston Condo $950K | 97/100 | 7 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 |
| T2-02 | Arlington Rosslyn Condo $1.1M | 97/100 | 7 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 |
| T2-03 | Del Ray Alexandria SFH $1.05M | 94/100 | 7 | 10 | 7 | 10 | 10 | 10 | 10 | 10 | 10 | 10 |
| T2-04 | Cameron Station Alexandria Townhouse $980K | 97/100 | 7 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 |
| T2-05 | Reston Town Center Condo $1.15M | 97/100 | 7 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 |
| T2-06 | Vienna Oakton price unknown → T2 default | 97/100 | 7 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 |
| T2-07 | Arlington Pentagon City Condo $875K | 97/100 | 7 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 |
| T2-08 | Reston Town Center ZIP 20190 $790K | 97/100 | 7 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 |
| T2-09 | Vienna SFH $1.2M | 97/100 | 7 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 |
| T2-10 | McLean Tysons Condo $920K | 97/100 | 7 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 |
| T2-11 | Arlington Clarendon SFH $1.3M | 94/100 | 7 | 10 | 7 | 10 | 10 | 10 | 10 | 10 | 10 | 10 |
| T2-12 | Old Town Alexandria SFH $1.05M | 97/100 | 7 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 |
| T3-01 | Reston Residential SFH $650K | 97/100 | 7 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 |
| T3-02 | Reston Residential Townhouse $780K | 97/100 | 7 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 |
| T3-03 | Reston Residential SFH $950K (T2 floor from price) | 97/100 | 7 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 |
| T3-04 | Herndon SFH $620K (no metro mentioned) | 97/100 | 7 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 |
| T3-05 | Herndon Townhouse $710K (metro explicit) | 94/100 | 7 | 10 | 7 | 10 | 10 | 10 | 10 | 10 | 10 | 10 |
| T3-06 | Fairfax City SFH $680K | 97/100 | 7 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 |
| T3-07 | Burke SFH $750K | 97/100 | 7 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 |
| T3-08 | Centreville SFH $590K | 97/100 | 7 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 |
| T3-09 | Chantilly Townhouse $660K | 97/100 | 7 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 |
| T3-10 | Ashburn Townhouse $720K | 94/100 | 7 | 10 | 7 | 10 | 10 | 10 | 10 | 10 | 10 | 10 |
| T3-11 | Sterling (HARD BLOCK zone) Townhouse $540K | 97/100 | 7 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 |
| T3-12 | Sterling Lowes Island SFH $1.2M (T2 floor) | 97/100 | 7 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 |
| T3-13 | Leesburg SFH $680K | 94/100 | 7 | 10 | 7 | 10 | 10 | 10 | 10 | 10 | 10 | 10 |
| T3-14 | Brambleton Townhouse $750K | 94/100 | 7 | 10 | 7 | 10 | 10 | 10 | 10 | 10 | 10 | 10 |
| T3-15 | Vienna Condo $580K | 97/100 | 7 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 |
| T3-16 | Oakton SFH $850K | 97/100 | 7 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 |
| T3-17 | South Riding SFH $710K | 94/100 | 7 | 10 | 7 | 10 | 10 | 10 | 10 | 10 | 10 | 10 |
| T3-18 | Aldie SFH $780K | 97/100 | 7 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 |
| T3-19 | Reston ZIP 20191 $680K Condo | 97/100 | 7 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 |
| T3-20 | Herndon ZIP 20171 SFH $810K | 97/100 | 7 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 |
| T3-21 | One Loudoun Condo $620K (not Hard Block) | 97/100 | 7 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 |
| T3-22 | Broadlands SFH $870K | 97/100 | 7 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 |
| T4-01 | Woodbridge SFH $490K | 97/100 | 7 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 |
| T4-02 | Woodbridge SFH $850K Townhouse | 97/100 | 7 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 |
| T4-03 | Manassas SFH $420K | 97/100 | 7 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 |
| T4-04 | Springfield SFH $650K | 97/100 | 7 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 |
| T4-05 | Lorton SFH $580K | 97/100 | 7 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 |
| T4-06 | Annandale SFH $610K | 94/100 | 7 | 10 | 7 | 10 | 10 | 10 | 10 | 10 | 10 | 10 |
| T4-07 | Sterling $340K Condo (Hard Block zone) | 97/100 | 7 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 |
| T4-08 | Gainesville SFH $700K | 97/100 | 7 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 |
| T4-09 | Haymarket SFH $760K | 97/100 | 7 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 |
| T4-10 | Leesburg Townhouse $490K | 97/100 | 7 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 |
| T4-11 | Dale City SFH $440K | 94/100 | 7 | 10 | 7 | 10 | 10 | 10 | 10 | 10 | 10 | 10 |
| T4-12 | Lake Ridge SFH $530K | 97/100 | 7 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 |
| T4-13 | Bristow SFH $680K | 97/100 | 7 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 |
| T4-14 | Nokesville SFH $590K | 97/100 | 7 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 |
| T4-15 | Woodbridge Condo $310K (T5) | 97/100 | 7 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 |
| T4-16 | Manassas City Townhouse $450K | 94/100 | 7 | 10 | 7 | 10 | 10 | 10 | 10 | 10 | 10 | 10 |
| T5-01 | Stafford SFH $460K | 97/100 | 7 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 |
| T5-02 | Stafford SFH $370K | 97/100 | 7 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 |
| T5-03 | Fredericksburg SFH $410K | 97/100 | 7 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 |
| T5-04 | Triangle SFH $380K | 97/100 | 7 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 |
| T5-05 | Dumfries SFH $420K | 97/100 | 7 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 |
| T5-06 | Fredericksburg Townhouse $340K | 97/100 | 7 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 |
| T5-07 | Woodbridge Condo $290K | 97/100 | 7 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 |
| T5-08 | Dale City SFH $355K | 94/100 | 7 | 10 | 7 | 10 | 10 | 10 | 10 | 10 | 10 | 10 |
| SZ-01 | Falls Church CITY (22046) school mention required | 97/100 | 7 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 |
| SZ-02 | Falls Church Fairfax (22042) — FC City schools NOT mentioned | 94/100 | 7 | 10 | 7 | 10 | 10 | 10 | 10 | 10 | 10 | 10 |
| SZ-03 | Sterling 20164 Hard Block — no Innovation/Ashburn Metro | 97/100 | 7 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 |
| SZ-04 | Reston 20191 metro — NO confirmation in notes (must omit) | 97/100 | 7 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 |
| SZ-05 | Herndon 20170 metro — explicit agent note confirms | 97/100 | 7 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 |

---

## Criterion Notes (Failed Cases)

### Banned Language
- **T1-01**: Found: /\b[A-Z]{3,}\b/
- **T1-02**: Found: /\b[A-Z]{3,}\b/
- **T1-03**: Found: /\b[A-Z]{3,}\b/
- **T1-04**: Found: /\b[A-Z]{3,}\b/
- **T1-05**: Found: /\b[A-Z]{3,}\b/
- **T1-06**: Found: /\b[A-Z]{3,}\b/
- **T1-07**: Found: /\b[A-Z]{3,}\b/
- **T1-08**: Found: /\b[A-Z]{3,}\b/
- **T1-09**: Found: /\b[A-Z]{3,}\b/
- **T1-10**: Found: /\b[A-Z]{3,}\b/
- **T1-11**: Found: /\b[A-Z]{3,}\b/
- **T1-12**: Found: /\b[A-Z]{3,}\b/
- **T2-01**: Found: /\b[A-Z]{3,}\b/
- **T2-02**: Found: /\b[A-Z]{3,}\b/
- **T2-03**: Found: /\b[A-Z]{3,}\b/
- **T2-04**: Found: /\b[A-Z]{3,}\b/
- **T2-05**: Found: /\b[A-Z]{3,}\b/
- **T2-06**: Found: /\b[A-Z]{3,}\b/
- **T2-07**: Found: /\b[A-Z]{3,}\b/
- **T2-08**: Found: /\b[A-Z]{3,}\b/
- **T2-09**: Found: /\b[A-Z]{3,}\b/
- **T2-10**: Found: /\b[A-Z]{3,}\b/
- **T2-11**: Found: /\b[A-Z]{3,}\b/
- **T2-12**: Found: /\b[A-Z]{3,}\b/
- **T3-01**: Found: /\b[A-Z]{3,}\b/
- **T3-02**: Found: /\b[A-Z]{3,}\b/
- **T3-03**: Found: /\b[A-Z]{3,}\b/
- **T3-04**: Found: /\b[A-Z]{3,}\b/
- **T3-05**: Found: /\b[A-Z]{3,}\b/
- **T3-06**: Found: /\b[A-Z]{3,}\b/
- **T3-07**: Found: /\b[A-Z]{3,}\b/
- **T3-08**: Found: /\b[A-Z]{3,}\b/
- **T3-09**: Found: /\b[A-Z]{3,}\b/
- **T3-10**: Found: /\b[A-Z]{3,}\b/
- **T3-11**: Found: /\b[A-Z]{3,}\b/
- **T3-12**: Found: /\b[A-Z]{3,}\b/
- **T3-13**: Found: /\b[A-Z]{3,}\b/
- **T3-14**: Found: /\b[A-Z]{3,}\b/
- **T3-15**: Found: /\b[A-Z]{3,}\b/
- **T3-16**: Found: /\b[A-Z]{3,}\b/
- **T3-17**: Found: /\b[A-Z]{3,}\b/
- **T3-18**: Found: /\b[A-Z]{3,}\b/
- **T3-19**: Found: /\b[A-Z]{3,}\b/
- **T3-20**: Found: /\b[A-Z]{3,}\b/
- **T3-21**: Found: /\b[A-Z]{3,}\b/
- **T3-22**: Found: /\b[A-Z]{3,}\b/
- **T4-01**: Found: /\b[A-Z]{3,}\b/
- **T4-02**: Found: /\b[A-Z]{3,}\b/
- **T4-03**: Found: /\b[A-Z]{3,}\b/
- **T4-04**: Found: /\b[A-Z]{3,}\b/
- **T4-05**: Found: /\b[A-Z]{3,}\b/
- **T4-06**: Found: /\b[A-Z]{3,}\b/
- **T4-07**: Found: /\b[A-Z]{3,}\b/
- **T4-08**: Found: /\b[A-Z]{3,}\b/
- **T4-09**: Found: /\b[A-Z]{3,}\b/
- **T4-10**: Found: /\b[A-Z]{3,}\b/
- **T4-11**: Found: /\b[A-Z]{3,}\b/
- **T4-12**: Found: /\b[A-Z]{3,}\b/
- **T4-13**: Found: /\b[A-Z]{3,}\b/
- **T4-14**: Found: /\b[A-Z]{3,}\b/
- **T4-15**: Found: /\b[A-Z]{3,}\b/
- **T4-16**: Found: /\b[A-Z]{3,}\b/
- **T5-01**: Found: /\b[A-Z]{3,}\b/
- **T5-02**: Found: /\b[A-Z]{3,}\b/
- **T5-03**: Found: /\b[A-Z]{3,}\b/
- **T5-04**: Found: /\b[A-Z]{3,}\b/
- **T5-05**: Found: /\b[A-Z]{3,}\b/
- **T5-06**: Found: /\b[A-Z]{3,}\b/
- **T5-07**: Found: /\b[A-Z]{3,}\b/
- **T5-08**: Found: /\b[A-Z]{3,}\b/
- **SZ-01**: Found: /\b[A-Z]{3,}\b/
- **SZ-02**: Found: /\b[A-Z]{3,}\b/
- **SZ-03**: Found: /\b[A-Z]{3,}\b/
- **SZ-04**: Found: /\b[A-Z]{3,}\b/
- **SZ-05**: Found: /\b[A-Z]{3,}\b/

### Physical Anchor
- **T1-01**: 3/3 paragraphs anchored
- **T1-02**: 3/3 paragraphs anchored
- **T1-03**: 3/3 paragraphs anchored
- **T1-04**: 2/3 paragraphs anchored
- **T1-05**: 2/3 paragraphs anchored
- **T1-06**: 3/3 paragraphs anchored
- **T1-07**: 3/3 paragraphs anchored
- **T1-08**: 3/3 paragraphs anchored
- **T1-09**: 3/3 paragraphs anchored
- **T1-10**: 3/3 paragraphs anchored
- **T1-11**: 3/3 paragraphs anchored
- **T1-12**: 3/3 paragraphs anchored
- **T2-01**: 3/3 paragraphs anchored
- **T2-02**: 3/3 paragraphs anchored
- **T2-03**: 2/3 paragraphs anchored
- **T2-04**: 3/3 paragraphs anchored
- **T2-05**: 3/3 paragraphs anchored
- **T2-06**: 3/3 paragraphs anchored
- **T2-07**: 3/3 paragraphs anchored
- **T2-08**: 3/3 paragraphs anchored
- **T2-09**: 3/3 paragraphs anchored
- **T2-10**: 3/3 paragraphs anchored
- **T2-11**: 2/3 paragraphs anchored
- **T2-12**: 3/3 paragraphs anchored
- **T3-01**: 3/3 paragraphs anchored
- **T3-02**: 3/3 paragraphs anchored
- **T3-03**: 3/3 paragraphs anchored
- **T3-04**: 3/3 paragraphs anchored
- **T3-05**: 2/3 paragraphs anchored
- **T3-06**: 3/3 paragraphs anchored
- **T3-07**: 3/3 paragraphs anchored
- **T3-08**: 3/3 paragraphs anchored
- **T3-09**: 3/3 paragraphs anchored
- **T3-10**: 2/3 paragraphs anchored
- **T3-11**: 3/3 paragraphs anchored
- **T3-12**: 3/3 paragraphs anchored
- **T3-13**: 2/3 paragraphs anchored
- **T3-14**: 2/3 paragraphs anchored
- **T3-15**: 3/3 paragraphs anchored
- **T3-16**: 3/3 paragraphs anchored
- **T3-17**: 2/3 paragraphs anchored
- **T3-18**: 3/3 paragraphs anchored
- **T3-19**: 3/3 paragraphs anchored
- **T3-20**: 3/3 paragraphs anchored
- **T3-21**: 3/3 paragraphs anchored
- **T3-22**: 3/3 paragraphs anchored
- **T4-01**: 3/3 paragraphs anchored
- **T4-02**: 3/3 paragraphs anchored
- **T4-03**: 3/3 paragraphs anchored
- **T4-04**: 3/3 paragraphs anchored
- **T4-05**: 3/3 paragraphs anchored
- **T4-06**: 2/3 paragraphs anchored
- **T4-07**: 3/3 paragraphs anchored
- **T4-08**: 3/3 paragraphs anchored
- **T4-09**: 3/3 paragraphs anchored
- **T4-10**: 3/3 paragraphs anchored
- **T4-11**: 2/3 paragraphs anchored
- **T4-12**: 3/3 paragraphs anchored
- **T4-13**: 3/3 paragraphs anchored
- **T4-14**: 3/3 paragraphs anchored
- **T4-15**: 3/3 paragraphs anchored
- **T4-16**: 2/3 paragraphs anchored
- **T5-01**: 3/3 paragraphs anchored
- **T5-02**: 3/3 paragraphs anchored
- **T5-03**: 3/3 paragraphs anchored
- **T5-04**: 3/3 paragraphs anchored
- **T5-05**: 3/3 paragraphs anchored
- **T5-06**: 3/3 paragraphs anchored
- **T5-07**: 3/3 paragraphs anchored
- **T5-08**: 2/3 paragraphs anchored
- **SZ-01**: 3/3 paragraphs anchored
- **SZ-02**: 2/3 paragraphs anchored
- **SZ-03**: 3/3 paragraphs anchored
- **SZ-04**: 3/3 paragraphs anchored
- **SZ-05**: 3/3 paragraphs anchored

### Tier Tone
- **T1-10**: Missing Tier 1 luxury signals

### MLS First-Sentence Format
- **T1-03**: First sentence: "[MLS DESCRIPTION]
6-bedroom, 6-bath residence on Utterback Store Rd, Great Falls"

### Zillow 3-Para Structure
- **T1-01**: 3 paragraph(s) found
- **T1-02**: 3 paragraph(s) found
- **T1-03**: 3 paragraph(s) found
- **T1-04**: 3 paragraph(s) found
- **T1-05**: 3 paragraph(s) found
- **T1-06**: 3 paragraph(s) found
- **T1-07**: 3 paragraph(s) found
- **T1-08**: 3 paragraph(s) found
- **T1-09**: 3 paragraph(s) found
- **T1-10**: 3 paragraph(s) found
- **T1-11**: 3 paragraph(s) found
- **T1-12**: 3 paragraph(s) found
- **T2-01**: 3 paragraph(s) found
- **T2-02**: 3 paragraph(s) found
- **T2-03**: 3 paragraph(s) found
- **T2-04**: 3 paragraph(s) found
- **T2-05**: 3 paragraph(s) found
- **T2-06**: 3 paragraph(s) found
- **T2-07**: 3 paragraph(s) found
- **T2-08**: 3 paragraph(s) found
- **T2-09**: 3 paragraph(s) found
- **T2-10**: 3 paragraph(s) found
- **T2-11**: 3 paragraph(s) found
- **T2-12**: 3 paragraph(s) found
- **T3-01**: 3 paragraph(s) found
- **T3-02**: 3 paragraph(s) found
- **T3-03**: 3 paragraph(s) found
- **T3-04**: 3 paragraph(s) found
- **T3-05**: 3 paragraph(s) found
- **T3-06**: 3 paragraph(s) found
- **T3-07**: 3 paragraph(s) found
- **T3-08**: 3 paragraph(s) found
- **T3-09**: 3 paragraph(s) found
- **T3-10**: 3 paragraph(s) found
- **T3-11**: 3 paragraph(s) found
- **T3-12**: 3 paragraph(s) found
- **T3-13**: 3 paragraph(s) found
- **T3-14**: 3 paragraph(s) found
- **T3-15**: 3 paragraph(s) found
- **T3-16**: 3 paragraph(s) found
- **T3-17**: 3 paragraph(s) found
- **T3-18**: 3 paragraph(s) found
- **T3-19**: 3 paragraph(s) found
- **T3-20**: 3 paragraph(s) found
- **T3-21**: 3 paragraph(s) found
- **T3-22**: 3 paragraph(s) found
- **T4-01**: 3 paragraph(s) found
- **T4-02**: 3 paragraph(s) found
- **T4-03**: 3 paragraph(s) found
- **T4-04**: 3 paragraph(s) found
- **T4-05**: 3 paragraph(s) found
- **T4-06**: 3 paragraph(s) found
- **T4-07**: 3 paragraph(s) found
- **T4-08**: 3 paragraph(s) found
- **T4-09**: 3 paragraph(s) found
- **T4-10**: 3 paragraph(s) found
- **T4-11**: 3 paragraph(s) found
- **T4-12**: 3 paragraph(s) found
- **T4-13**: 3 paragraph(s) found
- **T4-14**: 3 paragraph(s) found
- **T4-15**: 3 paragraph(s) found
- **T4-16**: 3 paragraph(s) found
- **T5-01**: 3 paragraph(s) found
- **T5-02**: 3 paragraph(s) found
- **T5-03**: 3 paragraph(s) found
- **T5-04**: 3 paragraph(s) found
- **T5-05**: 3 paragraph(s) found
- **T5-06**: 3 paragraph(s) found
- **T5-07**: 3 paragraph(s) found
- **T5-08**: 3 paragraph(s) found
- **SZ-01**: 3 paragraph(s) found
- **SZ-02**: 3 paragraph(s) found
- **SZ-03**: 3 paragraph(s) found
- **SZ-04**: 3 paragraph(s) found
- **SZ-05**: 3 paragraph(s) found

### Hashtag Count (5–7)
- **T1-01**: 6 hashtags: #McLeanVA #NorthernVirginia #LuxuryEstateForSale #StoneExterior #JustListed #NoVAHomes
- **T1-02**: 6 hashtags: #McLeanVA #NorthernVirginia #LuxuryCondo #FloorToCeilingWindows #JustListed #NoVAHomes
- **T1-03**: 7 hashtags: #GreatFallsVA #NorthernVirginia #LuxuryEstateForSale #EquestrianProperty #JustListed #NoVAHomes #GreatFallsRealEstate
- **T1-04**: 7 hashtags: #ViennaVA #NorthernVirginia #LuxuryHomeForSale #HardwoodFloors #JustListed #MadisonHS #NoVAHomes
- **T1-05**: 6 hashtags: #ViennaVA #NorthernVirginia #CapeCodeHome #JustListed #NoVAHomes #FCPSHomes
- **T1-06**: 6 hashtags: #FallsChurchVA #FallsChurchCity #HomeForSale #NoVAHomes #JustListed #FallsChurchCitySchools
- **T1-07**: 7 hashtags: #FallsChurchVA #FallsChurchCity #NewConstructionHome #OpenConceptLiving #JustListed #NoVAHomes #FCCSchools
- **T1-08**: 6 hashtags: #OldTownAlexandria #AlexandriaVA #CondoForSale #PotomacRiverViews #JustListed #NoVAHomes
- **T1-09**: 7 hashtags: #OldTownAlexandria #AlexandriaVA #HistoricHomeForSale #FederalArchitecture #JustListed #NoVAHomes #LuxuryRealEstate
- **T1-10**: 5 hashtags: #ArlingtonVA #NorthernVirginia #LuxuryCondo #HighRiseLiving #JustListed
- **T1-11**: 7 hashtags: #McLeanVA #GeorgetownPike #LuxuryHomesForSale #NorthernVirginia #NoVAHomes #FCPSHomes #JustListed
- **T1-12**: 5 hashtags: #GreatFallsVA #NorthernVirginia #HomeForSale #GreatFallsHomes #JustListed
- **T2-01**: 6 hashtags: #ArlingtonVA #BallstonCondo #CondoForSale #MetroLiving #JustListed #NoVAHomes
- **T2-02**: 7 hashtags: #ArlingtonVA #RosslynVA #CondoForSale #DCViews #JustListed #NoVAHomes #NorthernVirginia
- **T2-03**: 7 hashtags: #DelRayVA #AlexandriaVA #BungalowForSale #RenovatedHome #JustListed #NoVAHomes #NorthernVirginia
- **T2-04**: 5 hashtags: #AlexandriaVA #CameronStation #NorthernVirginiaHomes #JustListed #NoVAHomes
- **T2-05**: 6 hashtags: #RestonVA #RestonTownCenter #CondoForSale #LockAndLeave #NorthernVirginiaHomes #JustListed
- **T2-06**: 7 hashtags: #ViennaVA #NorthernVirginia #SingleFamilyHome #ChainBridgeRoad #JustListed #NoVAHomes #FCPSHomes
- **T2-07**: 7 hashtags: #ArlingtonVA #PentagonCity #CondoForSale #HighRiseLiving #NorthernVirginia #JustListed #NoVAHomes
- **T2-08**: 6 hashtags: #RestonVA #NorthernVirginia #CondoForSale #RestonTownCenter #JustListed #NoVAHomes
- **T2-09**: 6 hashtags: #ViennaVA #NorthernVirginia #HomeForSale #RenovatedKitchen #JustListed #FCPSHomes
- **T2-10**: 6 hashtags: #McLeanVA #NorthernVirginia #CondoForSale #SilverLineMetro #JustListed #NoVAHomes
- **T2-11**: 6 hashtags: #ArlingtonVA #ClarendonArlington #HomeForSale #WalkableNeighborhood #JustListed #NoVAHomes
- **T2-12**: 5 hashtags: #AlexandriaVA #OldTownAlexandria #HistoricHome #JustListed #NoVAHomes
- **T3-01**: 6 hashtags: #RestonVA #NorthernVirginia #HomeForSale #TrailLiving #JustListed #NoVAHomes
- **T3-02**: 6 hashtags: #RestonVA #NorthernVirginia #HomeForSale #LakeAnne #JustListed #NoVAHomes
- **T3-03**: 7 hashtags: #RestonVA #NorthernVirginia #SingleFamilyHome #CulDeSacLiving #JustListed #NoVAHomes #FCPSHomes
- **T3-04**: 6 hashtags: #HerndonVA #NorthernVirginia #HomeForSale #SingleFamilyHome #JustListed #NoVAHomes
- **T3-05**: 6 hashtags: #HerndonVA #NorthernVirginia #HomeForSale #SilverLineMetro #JustListed #NoVAHomes
- **T3-06**: 5 hashtags: #FairfaxVA #NorthernVirginia #SingleFamilyHome #JustListed #NoVAHomes
- **T3-07**: 6 hashtags: #BurkeVA #NorthernVirginia #SingleFamilyHome #CulDeSacLiving #JustListed #NoVAHomes
- **T3-08**: 6 hashtags: #CentrevilleVA #NorthernVirginia #SingleFamilyHome #4BedroomHome #JustListed #NoVAHomes
- **T3-09**: 5 hashtags: #ChantillyVA #NorthernVirginia #HomeForSale #JustListed #NoVAHomes
- **T3-10**: 6 hashtags: #AshburnVA #NorthernVirginia #OneLoudoun #HomeForSale #JustListed #LoudounSchools
- **T3-11**: 6 hashtags: #SterlingVA #CascadesCommunity #HomeForSale #NorthernVirginia #JustListed #NoVAHomes
- **T3-12**: 5 hashtags: #SterlingVA #LowesIsland #NorthernVirginiaHomes #JustListed #NoVAHomes
- **T3-13**: 6 hashtags: #LeesburgVA #NorthernVirginia #HomeForSale #LoudounCountyHomes #JustListed #NoVAHomes
- **T3-14**: 7 hashtags: #BrambletonVA #NorthernVirginia #HomeForSale #ModernLiving #JustListed #LoudounCounty #NoVAHomes
- **T3-15**: 6 hashtags: #ViennaVA #NorthernVirginia #CondoForSale #WalkableVienna #JustListed #NoVAHomes
- **T3-16**: 7 hashtags: #OaktonVA #NorthernVirginia #SingleFamilyHome #HunterMillRoad #JustListed #NoVAHomes #FCPSHomes
- **T3-17**: 6 hashtags: #SouthRidingVA #LoudounCounty #HomeForSale #NoVAHomes #JustListed #LoudounSchools
- **T3-18**: 7 hashtags: #AldieVA #LoudounCounty #HomeForSale #SingleFamilyHome #JustListed #NoVAHomes #LoudounSchools
- **T3-19**: 6 hashtags: #RestonVA #NorthernVirginia #CondoForSale #LockAndLeave #JustListed #NoVAHomes
- **T3-20**: 7 hashtags: #HerndonVA #NorthernVirginia #SingleFamilyHome #HomeForSale #JustListed #NoVAHomes #FCPSHomes
- **T3-21**: 7 hashtags: #AshburnVA #NorthernVirginia #CondoForSale #OneLoudoun #JustListed #NoVAHomes #LoudounCounty
- **T3-22**: 6 hashtags: #AshburnVA #BroadlandsCommunity #SingleFamilyHome #JustListed #NoVAHomes #LoudounCounty
- **T4-01**: 6 hashtags: #WoodbridgeVA #NorthernVirginia #SingleFamilyHome #2CarGarage #JustListed #NoVAHomes
- **T4-02**: 5 hashtags: #WoodbridgeVA #PrinceWilliamCounty #HomeForSale #NoVAHomes #JustListed
- **T4-03**: 5 hashtags: #ManassasVA #NorthernVirginia #HomeForSale #SingleFamilyHome #JustListed
- **T4-04**: 6 hashtags: #SpringfieldVA #NorthernVirginia #HomeForSale #SingleFamilyHome #JustListed #NoVAHomes
- **T4-05**: 6 hashtags: #LortonVA #NorthernVirginia #HomeForSale #SingleFamilyHome #JustListed #NoVAHomes
- **T4-06**: 6 hashtags: #AnnanddaleVA #NorthernVirginia #SingleFamilyHome #UpdatedKitchen #JustListed #NoVAHomes
- **T4-07**: 6 hashtags: #SterlingVA #NorthernVirginia #CondoForSale #LockAndLeave #JustListed #NoVAHomes
- **T4-08**: 6 hashtags: #GainesvilleVA #NorthernVirginia #NewConstructionHome #OpenConceptLiving #JustListed #NoVAHomes
- **T4-09**: 6 hashtags: #HaymarketVA #NorthernVirginia #SingleFamilyHome #NewerConstruction #JustListed #NoVAHomes
- **T4-10**: 5 hashtags: #LeesburgVA #NorthernVirginia #HomeForSale #LoudounCountyHomes #JustListed
- **T4-11**: 6 hashtags: #DaleCityVA #PrinceWilliamCounty #HomeForSale #SingleFamilyHome #JustListed #NoVAHomes
- **T4-12**: 7 hashtags: #WoodbridgeVA #LakeRidge #SingleFamilyHome #FourBedroom #JustListed #NoVAHomes #PrinceWilliamCounty
- **T4-13**: 7 hashtags: #BristowVA #NorthernVirginia #SingleFamilyHome #NewerConstruction #JustListed #NoVAHomes #I66Corridor
- **T4-14**: 6 hashtags: #NokesvilleVA #NorthernVirginia #HomeForSale #AcreLot #JustListed #NoVAHomes
- **T4-15**: 5 hashtags: #WoodbridgeVA #NorthernVirginia #CondoForSale #LockAndLeave #JustListed
- **T4-16**: 5 hashtags: #ManassasVA #NorthernVirginia #HomeForSale #JustListed #NoVAHomes
- **T5-01**: 6 hashtags: #StaffordVA #NorthernVirginia #HomeForSale #VRECommuter #JustListed #NoVAHomes
- **T5-02**: 5 hashtags: #StaffordVA #NorthernVirginia #HomeForSale #SingleFamilyHome #JustListed
- **T5-03**: 6 hashtags: #FredericksburgVA #SophiaStreet #HomeForSale #DowntownLiving #JustListed #VirginiaHomes
- **T5-04**: 6 hashtags: #TriangleVA #PrinceWilliamCounty #HomeForSale #SingleFamilyHome #JustListed #NoVAHomes
- **T5-05**: 6 hashtags: #DumfriesVA #NorthernVirginia #SingleFamilyHome #HomeForSale #JustListed #NoVAHomes
- **T5-06**: 5 hashtags: #FredericksburgVA #NorthernVirginia #HomeForSale #VRECommuter #JustListed
- **T5-07**: 6 hashtags: #WoodbridgeVA #NorthernVirginia #CondoForSale #LockAndLeave #JustListed #NoVAHomes
- **T5-08**: 5 hashtags: #DaleCityVA #NorthernVirginia #HomeForSale #NewRoof #NoVAHomes
- **SZ-01**: 6 hashtags: #FallsChurchVA #FallsChurchCity #HomeForSale #NoVARealEstate #JustListed #FallsChurchCitySchools
- **SZ-02**: 6 hashtags: #FallsChurchVA #NorthernVirginia #HomeForSale #FairfaxCounty #JustListed #FCPSHomes
- **SZ-03**: 5 hashtags: #SterlingVA #NorthernVirginia #HomeForSale #JustListed #NoVAHomes
- **SZ-04**: 6 hashtags: #RestonVA #NorthernVirginia #HomeForSale #RestonLiving #JustListed #NoVAHomes
- **SZ-05**: 6 hashtags: #HerndonVA #NorthernVirginia #HomeForSale #SilverLineMetro #JustListed #NoVAHomes


---
_Generated by scripts/test_runner.js_
