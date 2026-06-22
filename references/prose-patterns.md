# Prose Patterns Reference

## Overview

The Prose Style Analyzer measures writing style quantitatively to maintain consistency across an entire novel. It creates a baseline from reference chapters, then compares subsequent chapters against that baseline. This is especially critical for AI-assisted writing where style drift can occur between sessions.

## Style Profile Structure

Path: `data/[project-name]/style-profile.json`

```json
{
  "project": "trong-sinh-thanh-duong-tam-tang",
  "baselineChapters": [1, 2, 3, 4, 5],
  "created": "2026-01-20",
  "updated": "2026-03-10",
  "metrics": {
    "sentence": { ... },
    "vocabulary": { ... },
    "structure": { ... },
    "tone": { ... },
    "pov": { ... },
    "aiTrace": { ... },
    "vietnamese": { ... }
  }
}
```

## Metric Categories

### Category 1: Sentence Metrics

```json
{
  "sentence": {
    "avgLength": 15.3,
    "medianLength": 13,
    "minLength": 3,
    "maxLength": 42,
    "stdDev": 8.2,
    "distribution": {
      "short": 0.25,
      "medium": 0.50,
      "long": 0.20,
      "veryLong": 0.05
    },
    "thresholds": {
      "short": [1, 8],
      "medium": [9, 20],
      "long": [21, 35],
      "veryLong": [36, 999]
    }
  }
}
```

**What it measures:**
- Average sentence length (in words)
- Distribution across short/medium/long/very-long buckets
- Standard deviation (higher = more varied rhythm, generally good)

**Drift detection:**
- avgLength deviation > 20% from baseline → WARNING
- distribution shift > 15% in any bucket → WARNING
- stdDev dropping below 5.0 → WARNING (sentences becoming too uniform)

**Good style indicators:**
- Mixed sentence lengths (high stdDev)
- No more than 40% in any single bucket
- Short sentences for impact, long for immersion

### Category 2: Vocabulary Metrics

```json
{
  "vocabulary": {
    "uniqueRatio": 0.62,
    "avgWordLength": 3.8,
    "topFrequencyWords": [
      { "word": "tao", "freq": 0.028 },
      { "word": "thằng", "freq": 0.015 },
      { "word": "nó", "freq": 0.014 }
    ],
    "rarityScore": 0.35,
    "repetitionIndex": 0.12
  }
}
```

**What it measures:**
- Unique word ratio (type-token ratio): unique words / total words
- Average word length
- Most frequent content words (excluding stop words)
- Rarity score: proportion of uncommon words
- Repetition index: how often the same words cluster together

**Drift detection:**
- uniqueRatio change > 10% → WARNING (vocabulary richness shift)
- New top-frequency words appearing / old ones disappearing → NOTE
- repetitionIndex rising above 0.20 → WARNING (getting repetitive)

### Category 3: Structure Metrics

```json
{
  "structure": {
    "dialogueRatio": 0.35,
    "narrationRatio": 0.45,
    "internalMonologueRatio": 0.15,
    "descriptionRatio": 0.05,
    "avgParagraphLength": 4.2,
    "paragraphLengthStdDev": 2.1,
    "sceneBreakFrequency": 2.3,
    "showVsTellRatio": 0.72
  }
}
```

**What it measures:**
- Dialogue vs narration vs internal monologue vs description ratios
- Paragraph length patterns
- Scene break frequency (breaks per 1000 words)
- Show vs Tell ratio (action verbs vs state verbs)

**Drift detection:**
- dialogueRatio change > 15% → WARNING
- showVsTellRatio dropping below 0.60 → WARNING (too much telling)
- descriptionRatio rising above 0.15 → NOTE (pacing may slow)

**Good style indicators for Trọng Sinh:**
- Dialogue 30-40% (characters talk a lot in this story)
- Internal monologue 10-20% (MC's modern-mind commentary)
- Show vs Tell > 0.65
- Description < 10% (action-oriented, not descriptive literature)

### Category 4: Tone Metrics

```json
{
  "tone": {
    "humorFrequency": 0.068,
    "darknessLevel": 0.45,
    "emotionalIntensity": {
      "avg": 5.2,
      "peaks": [8, 9, 7],
      "valleys": [2, 3]
    },
    "sarcasmMarkers": 0.032,
    "profanityLevel": 0.021,
    "formalityScore": 0.30
  }
}
```

**What it measures:**
- Humor frequency: jokes, witty remarks, comedic situations per 1000 words
- Darkness level: 0 (lighthearted) to 1 (grimdark)
- Emotional intensity on 1-10 scale
- Sarcasm markers per 1000 words
- Profanity/slang level
- Formality score: 0 (very casual) to 1 (very formal)

**Drift detection:**
- humorFrequency change > 30% → WARNING (story tone shifting)
- darknessLevel change > 20% → WARNING
- formalityScore change > 25% → WARNING (register shifting)

**Good indicators for Trọng Sinh (hài đen 70%):**
- humorFrequency: 0.05-0.08 (1 joke every 13-20 sentences)
- darknessLevel: 0.35-0.55 (dark humor, not grimdark)
- sarcasmMarkers: 0.02-0.05 (MC is sarcastic)
- formalityScore: 0.20-0.40 (casual but not sloppy)

### Category 5: POV Metrics

```json
{
  "pov": {
    "type": "first-person",
    "pronounDistribution": {
      "tao": 0.028,
      "ta": 0.005,
      "nó": 0.014,
      "hắn": 0.011,
      "bọn": 0.008
    },
    "perspectiveBreaks": 0,
    "narratorReliability": "unreliable-humorous"
  }
}
```

**What it measures:**
- POV type consistency (first/third/omniscient)
- Pronoun distribution
- Perspective breaks (MC describing events they are not present for)
- Narrator reliability classification

**Drift detection:**
- perspectiveBreaks > 0 → CRITICAL (for first-person)
- "tao" frequency dropping significantly → WARNING (voice shifting away from MC)
- Third-person pronouns ("anh ta", "cô ấy") appearing in MC's inner voice → NOTE

### Category 6: AI Trace Detection

```json
{
  "aiTrace": {
    "forbiddenWords": {
      "found": [],
      "count": 0
    },
    "markdownArtifacts": {
      "found": [],
      "count": 0
    },
    "patternRepetition": {
      "consecutiveSameStructure": 0,
      "maxConsecutive": 0
    },
    "clichePatterns": {
      "found": [],
      "count": 0
    }
  }
}
```

**Forbidden words list (English AI patterns):**
brilliant, stunning, fascinating, delve, tapestry, landscape, journey (metaphorical),
testament, embark, beacon, intricate, pivotal, crucial, leverage, foster, holistic,
paradigm, unprecedented, cutting-edge, groundbreaking, game-changing, world-class,
deep dive, at the end of the day, it goes without saying, needless to say

**Forbidden words list (Vietnamese AI patterns):**
một cách đáng kinh ngạc, kỳ diệu thay, thật không thể tin được (overuse),
sự kết hợp hoàn hảo, hành trình tuyệt vời, đắm chìm trong, bức tranh toàn cảnh,
nền tảng vững chắc, tầm nhìn chiến lược

**Markdown artifacts:**
Any occurrence of: # ## ### * ** __ --- > ``` - [ ] | (in prose text, not in code/meta)

**Pattern repetition:**
- Three or more consecutive sentences starting with same word → flag
- Three or more consecutive sentences with same structure (Subject-Verb-Object all same length) → flag
- Same transition word used 3+ times in one paragraph → flag

**Cliche patterns:**
- "Và cứ thế..." (And so...)
- "Thời gian trôi qua..." (Time passed...)
- "Không ai biết rằng..." (No one knew that...) — overused
- "Trong khoảnh khắc đó..." (In that moment...) — filler

**Detection threshold:** ANY forbidden word or markdown = FAIL (0 tolerance)

### Category 7: Vietnamese-Specific Metrics

```json
{
  "vietnamese": {
    "particleUsage": {
      "à": 0.005,
      "ư": 0.002,
      "nhỉ": 0.003,
      "nhé": 0.004,
      "đi": 0.006,
      "thôi": 0.004,
      "chứ": 0.003,
      "mà": 0.008
    },
    "sinoVietnameseRatio": 0.18,
    "dialectMarkers": {
      "northern": 0.1,
      "central": 0.0,
      "southern": 0.15,
      "modern": 0.75
    },
    "sentenceEndingPatterns": {
      "period": 0.55,
      "ellipsis": 0.15,
      "exclamation": 0.12,
      "question": 0.10,
      "dash": 0.08
    },
    "registerMix": {
      "formal": 0.15,
      "neutral": 0.40,
      "informal": 0.35,
      "slang": 0.10
    }
  }
}
```

**What it measures:**
- Particle usage frequency (Vietnamese sentence-ending particles convey tone)
- Sino-Vietnamese word ratio (Hán-Việt vs thuần Việt)
- Dialect markers (which regional Vietnamese flavors appear)
- Sentence ending patterns
- Register mixing (formal vs casual language)

**Vietnamese-specific rules:**
- Particle usage should match character voice (formal characters use fewer particles)
- Sino-Vietnamese ratio affects perceived formality
- Modern slang in ancient setting is intentional for Trọng Sinh (MC is modern soul)
- Consistent register within narration, varied in dialogue

**Drift detection:**
- sinoVietnameseRatio change > 15% → WARNING
- registerMix shift > 20% in any category → WARNING
- dialectMarkers suddenly shifting → WARNING

## Style Comparison Process

### Creating Baseline
1. Select 3-5 representative chapters (best quality, most "on-voice")
2. Analyze each chapter across all 7 categories
3. Average the metrics to create baseline profile
4. Store in style-profile.json

### Checking Chapter
1. Analyze new chapter across all 7 categories
2. Compare each metric against baseline
3. Calculate deviation percentage for each metric
4. Flag deviations exceeding thresholds
5. Calculate overall drift score (weighted average of all deviations)

### Drift Score Calculation
```
drift = (sentence_dev * 0.15) + (vocab_dev * 0.15) + (structure_dev * 0.20)
      + (tone_dev * 0.20) + (pov_dev * 0.10) + (aiTrace_dev * 0.10)
      + (vietnamese_dev * 0.10)
```

- drift < 10% → PASS (consistent)
- drift 10-20% → NOTE (minor drift, monitor)
- drift > 20% → WARNING (significant drift, review needed)

## Report Format

```
STYLE ANALYSIS — Chapter 21
Baseline: chapters 1-5 | Drift Score: 8.3% (PASS)

METRICS:
  Sentence length:     avg 14.8 (baseline 15.3) — OK
  Vocabulary richness: 0.60 (baseline 0.62) — OK
  Dialogue ratio:      0.38 (baseline 0.35) — OK
  Show vs Tell:        0.70 (baseline 0.72) — OK
  Humor frequency:     0.071 (baseline 0.068) — OK
  AI trace:            0 forbidden words, 0 markdown — CLEAN

VIETNAMESE:
  Sino-Viet ratio:     0.17 (baseline 0.18) — OK
  Register consistency: 95% match — OK

SUMMARY: Overall drift 8.3% | AI trace CLEAN
STATUS: PASS
```
