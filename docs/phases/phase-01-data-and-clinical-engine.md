# Phase 1 — Data and Clinical Engine

**Day:** Saturday 21 Nov 2026

**Goal:** The deterministic clinical core can resolve a Pakistani brand to a salt and return a verified interaction without any vision model or UI.

## Deliverables

- [ ] `backend/data/pk_formulary.json` — 200 common Pakistani brands.
- [ ] `backend/data/pk_interactions_fallback.json` — 60 verified critical pairs with verbatim FDA excerpts.
- [ ] `backend/services/formulary_resolver.py` — RapidFuzz plus phonetic normalization.
- [ ] `backend/services/openfda_client.py` — live label fetch, local fallback, pair checker.
- [ ] `README.md` skeleton that lists every API and library as they are added.
- [ ] Free `openFDA` API key in backend env (240 requests/minute).

## Formulary row

Each entry matches this shape:

```json
{
  "brand_name": "Leflox",
  "aliases": ["leflox", "leflx", "leflo", "levofloxacin", "lefloxacine"],
  "generic_salts": ["levofloxacin"],
  "common_strengths_mg": [250, 500, 750],
  "max_single_dose_mg": 750,
  "max_daily_dose_mg": 750,
  "is_antibiotic": true,
  "who_aware_tier": "WATCH",
  "drap_shortage_flagged": false,
  "bioequivalent_pk_brands": ["Cravit", "Tavanic", "Bactoflox"],
  "urdu_category_note": "Yeh ek taqatwar Watch-group antibiotic hai. Doctor ke bataye huay poore din mukammal karein, beech mein na chorein."
}
```

Cover the brands named in the pitch and eval set: Augmentin, Risek, Panadol, Glucophage, Concor, Leflox, Flagyl, Brufen, Disprin, Arinac, plus Warfarin. Antibiotics carry `who_aware_tier` of `ACCESS`, `WATCH`, or `RESERVE`. Non-antibiotics use `NONE`.

`openFDA` is never called with a brand string. The resolver returns salts first (`levofloxacin`, `ibuprofen`, `omeprazole`, `metronidazole`, `amoxicillin`, `clavulanate`, `warfarin`).

Resolver target: under 5 ms per name. Acceptance probe: `Augmntin` → `amoxicillin + clavulanate`. Score below 82 does not return a salt (Phase 2 turns that into `REFUSED_UNKNOWN_DRUG`).

## Interaction fallback row

```json
{
  "salt_a": "ibuprofen",
  "salt_b": "warfarin",
  "severity": "HIGH",
  "source": "openFDA Drug Label (Cached Verified Excerpt)",
  "fda_verbatim_excerpt": "The effects of warfarin and NSAIDs on GI bleeding are synergistic, such that users of both drugs together have a risk of serious GI bleeding higher than users of either drug alone.",
  "urdu_warning": "Khabardar! Aap pehle se khoon patla karne ki dawai Warfarin le rahi hain. Brufen (ibuprofen) is ke sath lene se bleeding ka khatra barh sakta hai. Lene se pehle apne doctor se foran rabta karein."
}
```

The 60-pair file must include these five eval pairs:

- ibuprofen + warfarin
- ciprofloxacin + tizanidine
- metronidazole + warfarin
- sildenafil + nitrates
- clarithromycin + simvastatin

Live client:

`GET https://api.fda.gov/drug/label.json?search=openfda.generic_name:"{salt}"&limit=1`

Read `drug_interactions`, `boxed_warning`, and `contraindications`. On timeout, empty body, or throttle, return the local row. Two exponential-backoff retries, then fallback.

## 2-hour cut

If building all 200 brands stalls, ship the brands in the pitch, the five high-risk pairs, and enough aliases to pass `Augmntin`. Expand to 200 before Day 5 eval, not during the Day 1 stall.

If `openFDA` throttles while you are authoring the cache, write the local file from already-copied verbatim excerpts and keep the live client behind the fallback.

## Done when

- A function call with `Leflox` returns levofloxacin, max doses, and `WATCH`.
- A function call with `ibuprofen` + `warfarin` returns severity `HIGH` and the verbatim excerpt, with the network disabled.
- `README.md` names `openFDA`, RapidFuzz, and the two JSON datasets.
