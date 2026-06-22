# Continuity Rules Reference

## Overview

The Continuity Checker scans chapters against the Bible to detect contradictions, plot holes, and inconsistencies. This document defines all rules, severity levels, and detection strategies.

## Severity Levels

### CRITICAL (Must fix before ship)
Direct contradictions that break story logic. Reader will notice immediately.

### WARNING (Should fix before arc end)
Potential inconsistencies that careful readers will catch. May or may not be intentional.

### NOTE (Track for reference)
Minor details worth recording. May become issues later if ignored.

## Rule Categories

### Category 1: Character Identity Consistency

**Rule 1.1: Name Consistency**
- Severity: CRITICAL
- Check: Character names must match across all appearances
- Common violations:
  - Full name vs nickname inconsistency (using wrong alias in wrong context)
  - Spelling variations (Huyền Trang vs Huyen Trang)
  - Name change without narrative justification
- Detection: Extract all character name mentions, cross-reference with Bible aliases list

**Rule 1.2: Appearance Consistency**
- Severity: WARNING (physical features), NOTE (clothing)
- Check: Physical descriptions must not contradict
- Common violations:
  - Eye color changes between chapters
  - Height/build descriptions contradicting earlier mentions
  - Scars or distinguishing marks appearing/disappearing
  - Age not matching timeline progression
- Detection: Extract appearance descriptors, compare against Bible identity.appearance
- Exception: Clothing can change. Appearance can change if narratively justified (injury, transformation, disguise)

**Rule 1.3: Gender and Pronoun Consistency**
- Severity: CRITICAL
- Check: Pronouns must match character gender throughout
- Detection: Track pronoun usage per character per chapter

### Category 2: Character State Consistency

**Rule 2.1: Location Logic**
- Severity: CRITICAL
- Check: Characters cannot teleport without explanation
- Detection strategy:
  1. Read character's location from most recent Bible state
  2. If chapter places character in new location, check:
     - Was travel mentioned or implied?
     - Is the travel time reasonable for the distance?
     - Did the character have reason to travel?
  3. Flag if character appears in location without travel narrative
- Common violations:
  - Character in City A end of ch10, starts ch11 in City B (1000km away) with no transition
  - Two characters meeting in a location neither was last seen near

**Rule 2.2: Death/Absence Respect**
- Severity: CRITICAL
- Check: Dead characters must not reappear without resurrection narrative
- Detection:
  1. If character state includes condition containing "dead", "killed", "deceased"
  2. Any subsequent appearance without resurrection/revival event = CRITICAL
  3. Also check for absent characters (imprisoned, exiled) appearing freely
- Exception: Flashbacks, dreams, visions (must be clearly marked in narrative)

**Rule 2.3: Knowledge State**
- Severity: WARNING
- Check: Characters should not know information they have not learned
- Detection:
  1. Track knowledge[] array per character per chapter
  2. If character acts on knowledge not in their list:
     - Did someone tell them on-screen? → OK, update knowledge
     - Did they witness it? → OK, update knowledge
     - No source? → WARNING: unexplained knowledge
- Common violations:
  - MC reacts to event they were not present for
  - Character knows another character's secret without learning scene
  - Character knows about a place they have never visited

**Rule 2.4: Possession Tracking**
- Severity: WARNING
- Check: Items in character's possession must be accounted for
- Detection:
  1. Track possessions[] array per character
  2. If character uses item not in possession → WARNING
  3. If character still has item they gave away/lost → WARNING
  4. If significant item just disappears without mention → WARNING
- Common violations:
  - Sword was dropped in ch5 fight, character uses it in ch6 without picking it up
  - Character gives artifact to ally in ch8, somehow uses it in ch12
  - Consumable item used twice

**Rule 2.5: Power Level Consistency**
- Severity: WARNING
- Check: Power levels should progress logically
- Detection:
  1. Track powerLevel per chapter
  2. Sudden jumps (more than 15 points in one chapter) without training/breakthrough → WARNING
  3. Power decrease without injury/seal/curse → WARNING
  4. Using ability above current power level → WARNING
- Exception: Breakthrough events (must be narrated), temporary power-ups (must be explained)

### Category 3: Relationship Consistency

**Rule 3.1: Relationship State**
- Severity: WARNING
- Check: Character interactions must match current relationship state
- Detection:
  1. Read relationship evolution from Bible
  2. If characters interact as friends but Bible shows they are enemies at this chapter → WARNING
  3. If characters show no recognition but Bible shows they have met → WARNING
- Common violations:
  - Characters who fought bitterly suddenly being friendly without reconciliation scene
  - Allies treating each other as strangers

**Rule 3.2: Relationship Logic**
- Severity: NOTE
- Check: Relationship changes should be motivated
- Detection: If relationship state changes between chapters, check if the change was dramatized in narrative

### Category 4: Timeline Consistency

**Rule 4.1: Event Ordering**
- Severity: CRITICAL
- Check: Events must happen in logical chronological order
- Detection:
  1. Extract time markers from narrative ("sáng hôm sau", "ba ngày sau", "lúc này")
  2. Build timeline from markers
  3. Flag if event B (which depends on event A) happens before event A
  4. Flag if character references future event as past

**Rule 4.2: Time Logic**
- Severity: WARNING
- Check: Time durations must be reasonable
- Detection:
  1. Calculate implied duration between events
  2. Check against travel times, healing times, seasonal changes
  3. Flag if: 3-day journey completed in "một lúc sau"
  4. Flag if: grievous wound healed overnight without magical healing

**Rule 4.3: Age Consistency**
- Severity: NOTE
- Check: Character ages should match timeline progression
- Detection: If story spans years, verify age mentions match

### Category 5: World Rules Consistency

**Rule 5.1: Magic System Rules**
- Severity: CRITICAL
- Check: Magic/powers must follow established rules
- Detection:
  1. Read worldRules.magic from Bible
  2. If character uses power that violates stated limitations → CRITICAL
  3. If cost/requirement is ignored → CRITICAL
  4. If new ability appears without learning/earning → WARNING
- Common violations:
  - "Cannot revive dead beyond 7 days" but character does it in ch15
  - MC uses ability 3 power levels above current level

**Rule 5.2: World Physics**
- Severity: NOTE
- Check: Physical world should be internally consistent
- Detection: Check if worldRules.physics notes are violated

**Rule 5.3: Social Rules**
- Severity: NOTE
- Check: Social norms established in worldbuilding should be respected
- Detection: Characters violating established social norms without narrative consequence

### Category 6: Narrative Consistency

**Rule 6.1: Foreshadowing Payoff**
- Severity: NOTE
- Check: Planted setups should eventually pay off
- Detection: Track "setup" events and check for corresponding "payoff" events
- This is tracked but not automatically flagged — for human review

**Rule 6.2: Dropped Plotlines**
- Severity: WARNING
- Check: Story threads introduced should not vanish
- Detection:
  1. Track active plot threads per arc
  2. If thread is introduced but not mentioned for 10+ chapters → WARNING
  3. If thread is never resolved by arc end → WARNING

**Rule 6.3: POV Consistency**
- Severity: CRITICAL (for first-person)
- Check: First-person narrator should not describe scenes they cannot observe
- Detection:
  1. If POV is first-person, MC must be present in every scene
  2. If scene describes events MC is not present for → CRITICAL (unless clearly framed as "tao nghe kể lại")

## Scan Process

### Single Chapter Scan

1. Load Bible (latest state before this chapter)
2. Parse chapter text:
   - Extract character mentions (names, aliases, pronouns)
   - Extract location mentions
   - Extract time markers
   - Extract item mentions
   - Extract power/ability usage
   - Extract dialogue attribution
3. For each extraction, run applicable rules
4. Collect all violations with severity
5. Generate report sorted by severity

### Full Project Scan

1. Scan chapters sequentially (ch1 → ch_latest)
2. Update running state after each chapter
3. Cross-reference between chapters for:
   - Timeline consistency
   - Dropped plotlines
   - Character arc progression
4. Generate summary report

## Report Format

```
CONTINUITY REPORT — Chapter 21
Scanned against Bible snapshot: ch20

CRITICAL (0):
(none)

WARNING (2):
[W-2.3] Ch21 line 45: Huyền Trang references Ngưu Ma Vương's weakness,
        but knowledge[] does not include this. Last known source: none.
        Suggestion: Add learning scene or update Bible.

[W-2.4] Ch21 line 112: Huyền Trang uses "phù lửa" but possessions[]
        shows it was given to Sa Tăng in ch19.
        Suggestion: Add retrieval scene or fix.

NOTE (1):
[N-1.2] Ch21 line 78: Describes Bát Giới as "to cao", but ch15 describes
        as "mập mạp nhưng thấp". Minor inconsistency.

SUMMARY: 0 Critical | 2 Warnings | 1 Note
STATUS: PASS (0 critical) — fix warnings before arc end
```

## Integration Points

- **Bible Manager**: Reads all character states, locations, items
- **Pacing Tracker**: Shares chapter metadata
- **Voice Manager**: Shares character dialogue attribution
- **Prose Analyzer**: Shares extracted text segments
