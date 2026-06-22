# Pacing Model Reference

## Overview

The Pacing Tracker maintains narrative rhythm across an entire novel by classifying each beat, recording tension levels, and tracking patterns to ensure proper story flow. A healthy story alternates between high and low-tension beats following structural patterns.

## Beat Classification System

Each chapter contains 5 beats (400-600 words each). Each beat is classified into one of 6 types:

### Beat Type 1: ACTION
Direct conflict, combat, chase, confrontation, physical struggle, immediate danger.

**Characteristics:**
- Primary verb focus: attack, flee, fight, dodge, pursue, struggle, clash
- Tension level: typically 7-10
- Pace: fast, short sentences, immediate action
- Character agency: active, making urgent decisions
- Outcome: clear win/loss/escape or forced transition

**Examples from Trọng Sinh:**
- Ch3: Fighting demons with Ngộ Không
- Ch8: Chase through demon territory
- Ch15: Battle with yêu quái at crossroads

### Beat Type 2: TENSION
Building suspense, rising stakes, danger approaching, secrets being uncovered, time pressure mounting.

**Characteristics:**
- Primary verb focus: discover, realize, approach, threaten, suspect, hide, prepare
- Tension level: typically 5-8
- Pace: medium-fast, building momentum
- Character agency: reactive to circumstances, planning ahead
- Outcome: situation becomes more complex/dangerous, not resolved

**Examples:**
- Ch5: Discovering the true nature of Buddhist scripture
- Ch10: Realizing enemies are tracking the group
- Ch16: Approaching final challenge of arc

### Beat Type 3: REVELATION
Major plot twist, secret revealed, hidden knowledge uncovered, character truth exposed, change in understanding.

**Characteristics:**
- Primary verb focus: realize, discover, reveal, understand, learn, expose
- Tension level: typically 4-8 (shock value, not physical danger)
- Pace: variable, often followed by pause for processing
- Character agency: passive (learning), then active (responding)
- Outcome: new information changes story direction

**Examples:**
- Ch7: Learning the true purpose of the journey
- Ch12: Discovering an ally's secret past
- Ch20: Understanding MC's own nature

### Beat Type 4: EMOTIONAL
Character relationship moment, internal conflict revealed, emotional breakthrough, intimate exchange, vulnerability.

**Characteristics:**
- Primary verb focus: feel, talk, understand, forgive, accept, mourn, celebrate
- Tension level: typically 3-7 (emotional stakes)
- Pace: slow, introspective, conversation-heavy
- Character agency: active and vulnerable simultaneously
- Outcome: relationship deepens/shifts, character growth shown

**Examples:**
- Ch6: MC and Ngộ Không bonding over rice meal
- Ch11: Conversation about why they must continue
- Ch19: Character confesses fear to MC

### Beat Type 5: QUIET
Rest, travel, worldbuilding, daily life, humor, light moments, character slice-of-life.

**Characteristics:**
- Primary verb focus: walk, travel, rest, eat, joke, explore, observe
- Tension level: typically 1-3
- Pace: slow, descriptive, breathing room
- Character agency: minimal stakes, characters choosing actions
- Outcome: no plot progression, but world/character knowledge deepens

**Examples:**
- Ch4: Travel montage to next temple
- Ch9: Night at village inn, resting
- Ch14: Exploring market town, comedy scene

### Beat Type 6: TRANSITION
Scene change, location shift, time skip, chapter boundary, structural break.

**Characteristics:**
- Primary verb focus: move, leave, arrive, change, shift
- Tension level: typically 2-4
- Pace: varies, brief
- Character agency: logistical, moving pieces
- Outcome: story moves from one location/time to another

**Examples:**
- Chapter opening: arriving at new location
- Montage: traveling for several days
- Scene break: moving from one POV to another

## Tension Levels (1-10 Scale)

```
1   — Peaceful, no stakes (sleeping, relaxing)
2   — Minor uncertainty (small problem, easily solved)
3   — Modest concern (something slightly wrong)
4   — Clear challenge (problem is real, solution unclear)
5   — Significant threat (danger is present and mounting)
6   — High stakes (character must make difficult choice)
7   — Acute danger (immediate threat to life/goal)
8   — Critical crisis (everything falling apart)
9   — Peak catastrophe (worst-case scenario happening)
10  — Absolute zero (character dying, world ending, all is lost)
```

## Pacing Rules

### Rule 1: Action Limit
**No more than 3 consecutive ACTION beats.**

Rationale: Readers need breathing room. Constant action becomes exhausting and loses impact.

Violation example:
- Ch5: ACTION (fight) → Ch6: ACTION (chase) → Ch7: ACTION (ambush) → Ch8: ACTION (another fight)

Fix: Insert EMOTIONAL or QUIET beat in ch7 or ch8.

### Rule 2: Quiet Minimum
**Every 3 ACTION beats, include at least 1 QUIET beat.**

Rationale: Pacing rhythm requires rest beats. Also allows character development.

Pattern template:
- ACTION → ACTION → QUIET
- ACTION → TENSION → QUIET
- ACTION → EMOTIONAL → (next ACTION)

### Rule 3: Arc Opening
**First beat of arc should have tension ≥ 6 (hook the reader).**

Rationale: Establish stakes immediately.

Example: Ch21 (new arc start) should NOT open with QUIET (2) or EMOTIONAL (3). Should be ACTION or TENSION or REVELATION.

### Rule 4: Arc Closing
**Final beat of arc should include REVELATION or EMOTIONAL or ACTION resolution.**

Rationale: Satisfying conclusion, not anticlimactic.

Bad ending: Arc closes with QUIET (character resting after adventure).
Good ending: Arc closes with REVELATION (truth about character) or EMOTIONAL (bonding after trials) or ACTION (defeating final enemy).

### Rule 5: Tension Curve
**Tension should generally rise through arc, with controlled dips.**

Pattern:
- Ch1-3: Rising (avg tension 4-6)
- Ch4-6: Peak building (avg tension 6-7)
- Ch7-9: Climax plateau (avg tension 7-8)
- Ch10: Dip/resolution (tension drops to 5, allows breathing)
- Ch11+: New arc cycle OR Sustained tension if multi-arc

Visualization:
```
10 |       ╭─╮
9  |      ╱   ╲╭───╮
8  |  ╭──╱     ╰    ╲╮
7  | ╭╯             ╭╯
6  |╭╯              
5  |╯      (dip)    ╭
4  |      ╱         ╰╮
3  |      ╱           ╲
2  |                   ╱
1  |___________________
   1 2 3 4 5 6 7 8 9 10
```

### Rule 6: Tone Consistency
**QUIET beats should not be ACTION-paced or ACTION beats should not be melancholic.**

Rationale: Beat type determines tone. Mismatched tone breaks immersion.

Wrong: "In the midst of battle, Huyền Trang paused to admire the sunset." (ACTION beat describing peaceful moment)

Right: ACTION beat = immediate, urgent language. QUIET beat = slow, observational language.

## Beat Recording Format

Path: `data/[project-name]/pacing.json`

```json
{
  "chapters": [
    {
      "chapterNumber": 1,
      "beats": [
        {
          "beatNumber": 1,
          "type": "REVELATION",
          "tensionLevel": 7,
          "summary": "Trần Huyền Trang trọng sinh vào thân xác sư thầy",
          "notes": "Opening hook — establish high stakes immediately"
        },
        {
          "beatNumber": 2,
          "type": "EMOTIONAL",
          "tensionLevel": 4,
          "summary": "MC processes situation, internal monologue",
          "notes": "Processing shock, audience learns his voice"
        },
        ...
      ],
      "chapterArc": {
        "type": "rising",
        "avgTension": 5.2,
        "pattern": "REVELATION → EMOTIONAL → ACTION → QUIET → TENSION"
      }
    }
  ],
  "arcAnalysis": {
    "arc1": {
      "chapters": [1, 10],
      "arcType": "rising-action",
      "overallTensionCurve": 5.8,
      "violations": [],
      "paceRating": "excellent"
    }
  }
}
```

## Pacing Analysis Process

### Step 1: Classify Beats
For each beat, determine:
1. Which type (ACTION/TENSION/REVELATION/EMOTIONAL/QUIET/TRANSITION)?
2. What tension level (1-10)?
3. Brief summary of what happens

### Step 2: Check Rules
For each chapter, verify:
- Rule 1: Max 3 consecutive ACTION? ✓
- Rule 2: QUIET beat after action cluster? ✓
- Rule 3: Arc opening tension ≥ 6? ✓
- Rule 4: Arc closing satisfying? ✓

### Step 3: Calculate Arc Metrics
- Average tension across arc
- Tension curve shape (rising/falling/plateau)
- Pacing rating (excellent/good/fair/poor)

### Step 4: Generate Report
List violations with severity:
- CRITICAL: Violates rules 1-4
- WARNING: Tension curve too flat or too volatile
- NOTE: Minor pacing adjustment suggested

## Pacing Report Format

```
PACING ANALYSIS — Chapter 21 (Arc 2 Opening)

BEAT BREAKDOWN:
Beat 1: REVELATION (tension 8) — Discovery of new threat
  Status: OK (arc opening hook ≥ 6) ✓

Beat 2: EMOTIONAL (tension 5) — Dialogue about implications
  Status: OK (REVELATION → EMOTIONAL natural flow)

Beat 3: ACTION (tension 8) — Fight with enemy scouts
  Status: OK

Beat 4: TENSION (tension 6) — Aftermath, planning response
  Status: OK

Beat 5: QUIET (tension 2) — Rest and recovery
  Status: OK (action cluster broken up)

CHAPTER ANALYSIS:
Pattern: REVELATION → EMOTIONAL → ACTION → TENSION → QUIET
Average tension: 5.8 / 10
Arc position: Opening chapter of Arc 2
Rating: EXCELLENT (strong opening, good rhythm)

ARC 2 PROJECTION (Ch21-30):
Current arc opening: Strong
Recommended pacing: Maintain high tension for ch21-25, allow dip in ch26

VIOLATIONS: None
STATUS: PASS
```

## Integration with Other Modules

- **Bible Manager**: Provides character states for emotional relevance
- **Continuity Checker**: Shares chapter text and timeline
- **Prose Analyzer**: Confirms beat classification (ACTION = fast pacing = short sentences)
- **Voice Manager**: Dialogue-heavy beats should match voice profiles

## Pacing Suggestions

When analyzing a chapter that needs next chapter's pacing:

```
Last chapter ended with: ACTION (tension 8)
Last beat type: Action climax with death of supporting character

SUGGESTION FOR CH22:
Recommend opening with: EMOTIONAL or QUIET beat
Rationale: Readers need emotional processing after tragedy
Tension suggestion: Start at 4-5, gradually rising to 7-8 by midchapter
Recommended beat sequence: EMOTIONAL → QUIET → TENSION → REVELATION

Avoid: Starting ch22 with ACTION (would be overkill after ch21 climax)
```

## Quick Reference Table

| Beat Type | Tension | Pace | Use When |
|-----------|---------|------|----------|
| ACTION | 7-10 | Fast | Danger is immediate, physical conflict |
| TENSION | 5-8 | Med-Fast | Stakes rising, discovery approaching |
| REVELATION | 4-8 | Variable | Plot twist, secret revealed |
| EMOTIONAL | 3-7 | Slow | Character growth, relationship shift |
| QUIET | 1-3 | Slow | Rest, exploration, humor, breathing room |
| TRANSITION | 2-4 | Brief | Scene/location/time change |

## Best Practices

1. **Every chapter needs variation**: Don't repeat same beat sequence twice in a row
2. **Match beat type to prose style**: ACTION = short sentences; QUIET = longer, descriptive
3. **Tension should reward reader**: Peaks should feel earned, dips should feel necessary
4. **Character beats matter most**: EMOTIONAL and REVELATION beats develop character arcs
5. **Quiet beats are not filler**: They establish world, allow humor, build relationships
