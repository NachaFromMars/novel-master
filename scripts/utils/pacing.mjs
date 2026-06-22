#!/usr/bin/env node

/**
 * Pacing Tracker Module
 * Tracks narrative rhythm across chapters
 * 
 * Usage:
 *   pace record <chapter> <beat1> <beat2> <beat3> <beat4> <beat5>
 *   pace curve <arc>
 *   pace suggest <next-chapter>
 *   pace report
 */

import fs from 'fs';
import path from 'path';

const BEAT_TYPES = ['ACTION', 'TENSION', 'REVELATION', 'EMOTIONAL', 'QUIET', 'TRANSITION'];

const PACING_RULES = {
  maxConsecutiveAction: 3,
  maxConsecutiveQuiet: 2,
  arcOpeningMinTension: 6,
  actionClusterQuietRequired: 3 // After N action beats, need a quiet
};

class PacingTracker {
  constructor(projectSlug) {
    this.projectSlug = projectSlug;
    this.dataDir = path.join(process.cwd(), 'data', projectSlug);
    this.pacingPath = path.join(this.dataDir, 'pacing.json');
  }

  // Load pacing data
  load() {
    if (!fs.existsSync(this.pacingPath)) {
      return { chapters: [], arcAnalysis: {} };
    }
    return JSON.parse(fs.readFileSync(this.pacingPath, 'utf8'));
  }

  // Save pacing data
  save(data) {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
    fs.writeFileSync(this.pacingPath, JSON.stringify(data, null, 2));
  }

  // Record chapter pacing
  record(chapterNum, beats, tensionLevels = [], summaries = []) {
    const data = this.load();

    // Validate beat types
    for (const beat of beats) {
      if (!BEAT_TYPES.includes(beat.toUpperCase())) {
        console.error(`❌ Invalid beat type: "${beat}". Valid: ${BEAT_TYPES.join(', ')}`);
        return;
      }
    }

    const chapterEntry = {
      chapterNumber: chapterNum,
      beats: beats.map((type, i) => ({
        beatNumber: i + 1,
        type: type.toUpperCase(),
        tensionLevel: tensionLevels[i] || this.estimateTension(type),
        summary: summaries[i] || ''
      })),
      chapterArc: {
        type: this.classifyChapterArc(tensionLevels.length ? tensionLevels : beats.map(b => this.estimateTension(b))),
        avgTension: 0,
        pattern: beats.map(b => b.toUpperCase()).join(' → ')
      }
    };

    // Calculate average tension
    const tensions = chapterEntry.beats.map(b => b.tensionLevel);
    chapterEntry.chapterArc.avgTension = Math.round((tensions.reduce((a, b) => a + b, 0) / tensions.length) * 10) / 10;

    // Upsert chapter
    const existingIdx = data.chapters.findIndex(c => c.chapterNumber === chapterNum);
    if (existingIdx >= 0) {
      data.chapters[existingIdx] = chapterEntry;
    } else {
      data.chapters.push(chapterEntry);
      data.chapters.sort((a, b) => a.chapterNumber - b.chapterNumber);
    }

    this.save(data);
    console.log(`✅ Chapter ${chapterNum} pacing recorded: ${chapterEntry.chapterArc.pattern}`);
    console.log(`   Avg tension: ${chapterEntry.chapterArc.avgTension}/10`);
    
    // Check rules
    const violations = this.checkRules(data, chapterNum);
    if (violations.length > 0) {
      console.log(`\n⚠️  Pacing violations detected:`);
      for (const v of violations) {
        console.log(`   ${v.severity}: ${v.message}`);
      }
    }
  }

  // Suggest pacing for next chapter
  suggest(nextChapterNum) {
    const data = this.load();
    const prevChapters = data.chapters.filter(c => c.chapterNumber < nextChapterNum).sort((a, b) => b.chapterNumber - a.chapterNumber);

    if (prevChapters.length === 0) {
      console.log(`\n📐 Pacing Suggestion for Chapter ${nextChapterNum}\n`);
      console.log(`No previous chapters recorded. Recommend starting with:`);
      console.log(`Beat sequence: TENSION → REVELATION → ACTION → EMOTIONAL → QUIET`);
      console.log(`Rationale: Hook → Establish → Conflict → Process → Rest`);
      return;
    }

    const lastChapter = prevChapters[0];
    const lastBeats = lastChapter.beats.map(b => b.type);
    const lastTension = lastChapter.chapterArc.avgTension;
    const lastBeatType = lastBeats[lastBeats.length - 1];

    console.log(`\n📐 Pacing Suggestion for Chapter ${nextChapterNum}\n`);
    console.log(`Previous: Ch${lastChapter.chapterNumber} — ${lastChapter.chapterArc.pattern}`);
    console.log(`Last beat: ${lastBeatType} (tension ${lastChapter.beats[lastChapter.beats.length - 1].tensionLevel})`);
    console.log(`Avg tension: ${lastTension}/10\n`);

    // Count recent consecutive action beats
    let recentActionCount = 0;
    for (const ch of prevChapters.slice(0, 3)) {
      for (const beat of [...ch.beats].reverse()) {
        if (beat.type === 'ACTION') recentActionCount++;
        else break;
      }
      if (ch.beats[ch.beats.length - 1].type !== 'ACTION') break;
    }

    // Suggestion logic
    const suggestions = [];

    if (recentActionCount >= 3) {
      suggestions.push({
        sequence: ['EMOTIONAL', 'QUIET', 'TENSION', 'REVELATION', 'EMOTIONAL'],
        rationale: `${recentActionCount} action beats in a row — readers need breathing room`,
        tension: '3-6'
      });
    } else if (lastBeatType === 'ACTION' && lastTension >= 8) {
      suggestions.push({
        sequence: ['EMOTIONAL', 'QUIET', 'TENSION', 'ACTION', 'EMOTIONAL'],
        rationale: 'After intense action, allow processing before building again',
        tension: '4-7'
      });
    } else if (lastBeatType === 'QUIET' || lastBeatType === 'EMOTIONAL') {
      suggestions.push({
        sequence: ['TENSION', 'ACTION', 'REVELATION', 'EMOTIONAL', 'TENSION'],
        rationale: 'After quiet/emotional, ramp up stakes',
        tension: '5-8'
      });
    } else if (lastBeatType === 'REVELATION') {
      suggestions.push({
        sequence: ['EMOTIONAL', 'TENSION', 'ACTION', 'TENSION', 'REVELATION'],
        rationale: 'After revelation, process implications then escalate',
        tension: '5-8'
      });
    } else {
      suggestions.push({
        sequence: ['TENSION', 'ACTION', 'EMOTIONAL', 'QUIET', 'TENSION'],
        rationale: 'Standard rising action with breathing room',
        tension: '4-7'
      });
    }

    // Check if this is arc opening
    const arcSize = 10; // chapters per arc
    const posInArc = ((nextChapterNum - 1) % arcSize) + 1;
    if (posInArc === 1) {
      suggestions.unshift({
        sequence: ['TENSION', 'REVELATION', 'ACTION', 'EMOTIONAL', 'TENSION'],
        rationale: 'ARC OPENING — hook readers immediately, tension ≥ 6',
        tension: '6-8'
      });
    }

    for (const s of suggestions) {
      console.log(`RECOMMENDED: ${s.sequence.join(' → ')}`);
      console.log(`Tension range: ${s.tension}`);
      console.log(`Rationale: ${s.rationale}\n`);
    }

    // Avoid list
    console.log(`AVOID:`);
    if (recentActionCount >= 2) console.log(`• Starting with ACTION (too many recent action beats)`);
    if (lastTension <= 3) console.log(`• Starting with QUIET (momentum already low)`);
    if (lastBeatType === 'TRANSITION') console.log(`• Starting with TRANSITION (just had one)`);
  }

  // Show tension curve for arc
  curve(arcNum, arcSize = 10) {
    const data = this.load();
    const arcStart = (arcNum - 1) * arcSize + 1;
    const arcEnd = arcNum * arcSize;
    const arcChapters = data.chapters.filter(c => c.chapterNumber >= arcStart && c.chapterNumber <= arcEnd);

    console.log(`\n📈 Tension Curve — Arc ${arcNum} (Ch${arcStart}-Ch${arcEnd})\n`);

    if (arcChapters.length === 0) {
      console.log('No chapters recorded for this arc.');
      return;
    }

    // ASCII visualization
    const maxHeight = 10;
    for (let level = maxHeight; level >= 1; level--) {
      let row = `${String(level).padStart(2)} │`;
      for (const ch of arcChapters) {
        const avg = ch.chapterArc.avgTension;
        row += avg >= level ? ' ██' : '   ';
      }
      console.log(row);
    }
    console.log(`   └${'───'.repeat(arcChapters.length)}`);
    let labels = '    ';
    for (const ch of arcChapters) {
      labels += `${String(ch.chapterNumber).padStart(2)} `;
    }
    console.log(labels);

    // Stats
    const tensions = arcChapters.map(c => c.chapterArc.avgTension);
    const avg = tensions.reduce((a, b) => a + b, 0) / tensions.length;
    const peak = Math.max(...tensions);
    const valley = Math.min(...tensions);

    console.log(`\nArc ${arcNum} Stats:`);
    console.log(`  Average tension: ${avg.toFixed(1)}/10`);
    console.log(`  Peak: ${peak}/10`);
    console.log(`  Valley: ${valley}/10`);
    console.log(`  Chapters recorded: ${arcChapters.length}/${arcSize}`);
  }

  // Check pacing rules
  checkRules(data, currentChapter) {
    const violations = [];
    const recentChapters = data.chapters
      .filter(c => c.chapterNumber <= currentChapter)
      .sort((a, b) => a.chapterNumber - b.chapterNumber);

    // Flatten recent beats
    const recentBeats = [];
    for (const ch of recentChapters.slice(-5)) {
      for (const beat of ch.beats) {
        recentBeats.push({ ...beat, chapter: ch.chapterNumber });
      }
    }

    // Rule 1: Max consecutive ACTION
    let actionStreak = 0;
    for (const beat of recentBeats) {
      if (beat.type === 'ACTION') {
        actionStreak++;
        if (actionStreak > PACING_RULES.maxConsecutiveAction) {
          violations.push({
            severity: 'WARNING',
            rule: 'R1',
            message: `${actionStreak} consecutive ACTION beats (max ${PACING_RULES.maxConsecutiveAction}). Insert QUIET or EMOTIONAL.`
          });
        }
      } else {
        actionStreak = 0;
      }
    }

    // Rule 2: Max consecutive QUIET
    let quietStreak = 0;
    for (const beat of recentBeats) {
      if (beat.type === 'QUIET') {
        quietStreak++;
        if (quietStreak > PACING_RULES.maxConsecutiveQuiet) {
          violations.push({
            severity: 'NOTE',
            rule: 'R2',
            message: `${quietStreak} consecutive QUIET beats. Pacing may feel slow.`
          });
        }
      } else {
        quietStreak = 0;
      }
    }

    // Rule 3: Arc opening tension
    const arcSize = 10;
    const posInArc = ((currentChapter - 1) % arcSize) + 1;
    if (posInArc === 1) {
      const currentChData = data.chapters.find(c => c.chapterNumber === currentChapter);
      if (currentChData && currentChData.beats[0]?.tensionLevel < PACING_RULES.arcOpeningMinTension) {
        violations.push({
          severity: 'WARNING',
          rule: 'R3',
          message: `Arc opening (Ch${currentChapter}) starts with tension ${currentChData.beats[0].tensionLevel} (min ${PACING_RULES.arcOpeningMinTension}).`
        });
      }
    }

    return violations;
  }

  // Generate full report
  report() {
    const data = this.load();
    
    console.log(`\n📊 PACING REPORT — ${this.projectSlug}\n`);
    console.log(`Total chapters recorded: ${data.chapters.length}\n`);

    for (const ch of data.chapters) {
      const beatStr = ch.beats.map(b => `${b.type}(${b.tensionLevel})`).join(' → ');
      console.log(`Ch${String(ch.chapterNumber).padStart(2)}: ${beatStr} | avg ${ch.chapterArc.avgTension}`);
    }

    // Overall stats
    if (data.chapters.length > 0) {
      const allTensions = data.chapters.map(c => c.chapterArc.avgTension);
      const overallAvg = allTensions.reduce((a, b) => a + b, 0) / allTensions.length;
      console.log(`\nOverall average tension: ${overallAvg.toFixed(1)}/10`);
    }
  }

  // Estimate tension from beat type
  estimateTension(beatType) {
    const estimates = {
      'ACTION': 8, 'TENSION': 6, 'REVELATION': 7,
      'EMOTIONAL': 5, 'QUIET': 2, 'TRANSITION': 3
    };
    return estimates[beatType.toUpperCase()] || 5;
  }

  // Classify chapter arc type
  classifyChapterArc(tensions) {
    if (tensions.length < 2) return 'flat';
    const first = tensions[0];
    const last = tensions[tensions.length - 1];
    const peak = Math.max(...tensions);
    const peakIdx = tensions.indexOf(peak);

    if (last > first + 2) return 'rising';
    if (first > last + 2) return 'falling';
    if (peakIdx > 0 && peakIdx < tensions.length - 1) return 'peak';
    return 'flat';
  }
}

export default PacingTracker;
