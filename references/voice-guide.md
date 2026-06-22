# Character Voice Guide Reference

## Overview

Character voice is how a character speaks, thinks, and is perceived through language. Each character should have a distinct voice recognizable from dialogue alone. The Voice Manager maintains voice profiles and checks consistency across chapters.

## Voice Profile Components

Path: `data/[project-name]/voices.json`

```json
{
  "characters": {
    "tran-huyen-trang": {
      "name": "Trần Huyền Trang",
      "role": "protagonist",
      "voiceType": "first-person-narrator",
      "vocabulary": { ... },
      "sentence_style": { ... },
      "catchphrases": [ ... ],
      "dialect": { ... },
      "emotional_expression": { ... },
      "forbiddenWords": [ ... ],
      "speechQuirks": [ ... ],
      "consistency_notes": "..."
    }
  }
}
```

## Component 1: Vocabulary Level

Categorize character's word choice on 5-level scale:

### Level 1: Simple/Street (tây ba ngôn ngữ)
- Average word length: 2-3 characters
- Vocabulary: everyday, colloquial, minimal literary terms
- Example speakers: street vendors, common soldiers, uneducated peasants
- In Trọng Sinh: Không Trí Kỷ (demon monkey)

```json
{
  "vocabularyLevel": "simple",
  "examples": ["cái gì", "thế nào", "đáng chết"],
  "avoids": ["kinh thánh", "quán triệt", "siêu việt"]
}
```

### Level 2: Educated/Practical (common sense + some learning)
- Average word length: 3-4 characters
- Vocabulary: practical knowledge, some classical references
- Example speakers: merchants, experienced fighters, practical scholars
- In Trọng Sinh: Trần Huyền Trang (modern soul + quick learner)

```json
{
  "vocabularyLevel": "educated",
  "examples": ["như thế nào", "phải không", "chắc chắn"],
  "avoids": ["vi đại", "huyền bí"]
}
```

### Level 3: Literary/Scholarly (classical education)
- Average word length: 4-5+ characters, often Sino-Vietnamese
- Vocabulary: classics, philosophy, formal address
- Example speakers: monks, scholars, nobility
- In Trọng Sinh: Ngưu Ma Vương (demon king, educated)

```json
{
  "vocabularyLevel": "literary",
  "examples": ["高然而語", "實則", "豈得"],
  "avoids": ["đơn giản", "nên", "cái gì vậy"]
}
```

### Level 4: Archaic/Mystical (ancient power, not of this era)
- Vocabulary: classical, mystical, formal, often poetic
- Word choice: inverted syntax, flowery language
- Example speakers: ancient beings, Buddhas, divine powers
- In Trọng Sinh: Phật Tổ (speaking from celestial perspective)

### Level 5: Modern/Mixed (the intentional anachronism)
- Vocabulary: modern slang, modern concepts, modern pacing
- In Trọng Sinh: MC's internal monologue, thinking in modern Vietnamese despite ancient setting
- Used for humor and character distinction

## Component 2: Sentence Style

How a character constructs sentences reveals personality and education.

### Type A: Short-Punchy
- Average: 5-8 words per sentence
- Structure: Simple SVO (Subject-Verb-Object)
- Example: "Nó là yêu quái. Tao biết. Giết nó đi."
- Character type: Action-oriented, no-nonsense, impatient
- In Trọng Sinh: Ngộ Không (direct, immediate)

### Type B: Flowing/Conversational
- Average: 12-15 words per sentence
- Structure: Mix of simple and compound
- Example: "Tao không biết cách giải thích cho anh hiểu, nhưng có cảm giác nó sai."
- Character type: Friendly, explanatory, thoughtful
- In Trọng Sinh: MC in dialogue with allies

### Type C: Formal/Elaborate
- Average: 18-25 words per sentence
- Structure: Complex with multiple clauses
- Example: "Như thế nào, sau khi ta đã soi kỹ bởi con mắt của người thế nhân, lại có được sự phán đoán đó?"
- Character type: Educated, formal, deliberate
- In Trọng Sinh: Monks, official characters

### Type D: Staccato/Fragmented
- Average: 2-5 words, often incomplete
- Example: "Không. Chết. Hay sao?"
- Character type: Shocked, emotional, injured, foreign/struggling with language
- In Trọng Sinh: Characters in extreme distress

### Type E: Poetic/Winding
- Average: 20+ words, often metaphorical
- Structure: Layered meaning, rhythm-focused
- Example: "Như tiếng mưa rơi trên lá xanh, hành động của người nước ngoài cũng thoảng qua mà không để lại dấu vết..."
- Character type: Poets, romantics, ancient immortals
- In Trọng Sinh: Rarely used, when universe speaks

## Component 3: Catchphrases & Verbal Tics

Recurring expressions unique to the character. Use sparingly (1-3 per character) or they become annoying.

### Effective catchphrases (recurring, plot-relevant):
- **MC**: "Tao là sư phụ, nhưng tao không ngu" (defining his character)
- **Ngộ Không**: "Thì ra là..." (discovering something new, fits his character arc)
- **Monk character**: "A di đà Phật" (spiritual grounding, appropriate)

### Ineffective catchphrases (overused, generic):
- "Oh no!" / "Đúng là..." (too common, every character uses it)
- "Really?" / "Thế hả?" (too generic)

## Component 4: Dialect Markers

Characters may speak with regional or social dialect features.

### Vietnamese Regional Dialects:
- **Northern** (Hà Nội, Thái Bình): "-ơi", "cụ", "chị ơi", rolling r sounds
- **Central** (Huế, Đà Nẵng): "-ơ", "chẳng", "thế thôi", softer tones
- **Southern** (TP.HCM, Cần Thơ): "-ơi", "này", "ấy chứ", elided final consonants
- **Modern/Urban**: Mixes all regions, youth slang, modern neologisms

In **Trọng Sinh** context:
- Characters speak ancient-setting Vietnamese
- MC's internal voice is modern Vietnamese (humor source)
- Demons may have dialect markers if from specific regions
- Monks may use formal, ceremonial Vietnamese

### Social Dialect:
- **Street speech**: colloquial, dropped formalities, "tao/tớ", "cái/chiếc" → "cái"
- **Formal speech**: "tôi", "bạn", "ông/bà", full honorifics
- **Peasant speech**: local dialect + simple vocabulary
- **Scholar speech**: Sino-Vietnamese, classical references, formal address

## Component 5: Emotional Expression

How does the character show emotion through language?

### Anger:
- **MC style**: Sarcasm, sharp tone, cutting remarks (不 hot-headed)
- **Ngộ Không**: Direct insult, threats, physical language
- **Monk style**: Controlled rebuke, moral language, "disappointing"
- **Demon style**: Roaring, threats, grandstanding

### Joy:
- **MC**: Dry humor, witty observation, ironic tone
- **Ngộ Không**: Loud laughter, boasting, excitement
- **Monk**: Serene satisfaction, "blessed", calm acceptance
- **Demon**: Evil cackle, vindictive glee, threatening joy

### Fear:
- **MC**: Sarcasm increases, rapid internal monologue, strategic thinking
- **Ngộ Không**: Aggressive defensiveness, challenge the threat, strength assertion
- **Monk**: Prayer, acceptance of fate, spiritual language
- **Peasant**: Paralysis, begging, flight

### Love/Affection:
- **MC**: SHOWS not TELLS. Acts, doesn't say "I love you"
- **Ngộ Không**: Protective actions, subtle softening of speech
- **Monk**: Blessing, compassion, spiritual elevation
- **Demon**: Possession, obsession, twisted language

## Component 6: Forbidden Words

Words a character would NEVER say due to personality, upbringing, or role.

### MC (Trần Huyền Trang):
- "A di đà Phật" (too sincere, breaks his ironic character)
- "Tôi cảm thấy vô cùng vinh dự" (too formal, not his voice)
- "Hành động cao thượng" (he's cynical, wouldn't praise action like this)

### Ngộ Không:
- "Tôi xin lỗi" (doesn't apologize formally)
- "Em không biết" (too submissive, not his voice)
- "Tôi sợ" (would say "Tao não nước?" instead)

### Monk:
- "Đáng chết" (violent language, violates vow)
- "Tao chỉ quan tâm tiền" (violates monastic vow)
- Vulgar language (maintains spiritual decorum)

## Component 7: Speech Quirks

Unique speech patterns that become recognizable.

### MC's quirks:
- Talks to himself (internal monologue voiced aloud, sometimes)
- Ends statements with "...tao biết" (emphasizing his knowledge/control)
- Mixes modern slang into ancient setting for humor
- Questions himself often: "Tao sao lại...?"

### Ngộ Không's quirks:
- Interrupts himself with "à mà", "tờ mé"
- Repeats last word when emphatic: "Sợ, sợ cái gì?"
- Boasts frequently: "Tao là..."

### Monk's quirks:
- Begins statements with "Lão pháp sư cho rằng..."
- Ends with "Phật bảo"
- Lengthy, winding explanations
- Pauses for effect

## Voice Consistency Rules

### Rule 1: Consistency Within Scenes
A character's voice should not dramatically shift unless there's narrative reason (drunk, possessed, etc.).

Wrong: Ch5 MC speaks educated, ch6 MC speaks street slang (no explanation)
Right: Ch5 MC educated, ch6 MC injured/exhausted and speech becomes fragmented (explained)

### Rule 2: Dialogue Should Be Distinguishable
If you removed the dialogue tags ("MC said", "Ngộ Không said"), readers should recognize who's speaking.

Test: Can readers identify speaker by voice alone? If not, voices are too similar.

### Rule 3: Voices Evolve With Character Arc
A character learning literacy might shift from simple → educated vocabulary.
A character losing confidence might fragment their sentences.
These changes should be subtle and motivated by arc.

### Rule 4: No Character Speaks Identically to Author
If every character sounds like the prose narrator, voices are weak.
Especially: Don't let all characters speak in your natural voice.

## Voice Comparison Process

### Creating Voice Profile
1. Select 3-5 representative dialogue samples per character (best scenes for them)
2. Analyze each sample:
   - Average sentence length
   - Vocabulary level
   - Catchphrases
   - Emotional tone markers
   - Forbidden words
   - Quirks
3. Create profile JSON summarizing patterns
4. Save to voices.json

### Checking Chapter
1. Extract all dialogue attributed to each character
2. For each character:
   - Verify vocabulary level consistency (±1 level OK)
   - Verify sentence style (pattern should be recognizable)
   - Check for forbidden words (should be 0)
   - Verify emotional tone matches chapter context
3. Compare character voices:
   - Calculate similarity between pairs
   - If similarity > 40%, flag for differentiation

### Similarity Calculation
```
Similarity = (vocab_match + sentence_match + tone_match + word_freq_match) / 4
```

- < 30% = Well differentiated ✓
- 30-40% = OK but could improve
- > 40% = Too similar, needs work

## Voice Report Format

```
CHARACTER VOICE ANALYSIS — Chapter 21

VOICE PROFILES:
- Trần Huyền Trang: Educated + Modern, Short-Punchy with Sarcasm
- Ngộ Không: Simple + Formal, Short-Punchy Direct
- Bhikṣu character: Literary, Formal/Elaborate

DIALOGUE SAMPLES:
MC: "Cái gì vậy? Tao không biết mà sao anh lại..."
    Vocab: Educated | Sentence: Short-Punchy | Tone: Sarcastic ✓

Ngộ Không: "Hãy để ta làm. Tao sẽ xử lý nó."
    Vocab: Simple | Sentence: Short-Punchy | Tone: Direct ✓

VOICE DIFFERENTIATION:
MC vs Ngộ Không: 28% similarity — WELL DIFFERENTIATED ✓
MC vs Monk: 35% similarity — ACCEPTABLE
Ngộ Không vs Demon: 32% similarity — WELL DIFFERENTIATED ✓

VIOLATIONS:
(none)

SUGGESTIONS:
Consider deepening Monk character's unique voice (slightly closer to educated vocabulary)

STATUS: PASS
```

## Best Practices

1. **Write character voices naturally first**: Don't overthink. Let each character's personality drive speech.
2. **Test voice uniqueness**: Cover dialogue tags and see if you can identify speakers.
3. **Evolve gradually**: Voice can change but should feel earned and gradual, not sudden.
4. **Dialect sparingly**: A touch of dialect adds flavor; too much becomes caricature.
5. **Emotional extremes can break character**: Terrified characters may fragment, drunk characters may slur — these are intentional, not inconsistency.
6. **Important rule: Character voice in narration vs dialogue**: First-person narration voice = protagonist's internal voice. Dialogue voice = how they speak aloud. These may differ (MC thinks modern, speaks more formal).
