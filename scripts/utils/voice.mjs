#!/usr/bin/env node

/**
 * Character Voice Manager Module
 * Manages voice profiles and checks dialogue consistency
 * 
 * Usage:
 *   voice add <character> [options]
 *   voice check <chapter-file>
 *   voice compare <char1> <char2>
 *   voice report
 */

import fs from 'fs';
import path from 'path';

class VoiceManager {
  constructor(projectSlug) {
    this.projectSlug = projectSlug;
    this.dataDir = path.join(process.cwd(), 'data', projectSlug);
    this.voicesPath = path.join(this.dataDir, 'voices.json');
    this.biblePath = path.join(this.dataDir, 'bible.json');
  }

  // Load voices
  load() {
    if (!fs.existsSync(this.voicesPath)) {
      return { characters: {} };
    }
    return JSON.parse(fs.readFileSync(this.voicesPath, 'utf8'));
  }

  // Save voices
  save(data) {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
    fs.writeFileSync(this.voicesPath, JSON.stringify(data, null, 2));
  }

  // Add/update voice profile
  addProfile(characterSlug, options = {}) {
    const data = this.load();

    data.characters[characterSlug] = {
      name: options.name || characterSlug,
      role: options.role || 'supporting',
      voiceType: options.voiceType || 'dialogue',
      vocabulary: {
        level: options.vocabularyLevel || 'educated',
        formalityScore: options.formality || 0.5,
        examples: options.vocabExamples || [],
        avoids: options.vocabAvoids || []
      },
      sentenceStyle: {
        type: options.sentenceStyle || 'flowing',
        avgLength: options.avgSentenceLength || 12,
        preference: options.sentencePreference || 'medium'
      },
      catchphrases: options.catchphrases || [],
      dialect: {
        region: options.dialect || 'modern',
        markers: options.dialectMarkers || []
      },
      emotionalExpression: {
        anger: options.angerStyle || '',
        joy: options.joyStyle || '',
        fear: options.fearStyle || '',
        love: options.loveStyle || ''
      },
      forbiddenWords: options.forbiddenWords || [],
      speechQuirks: options.speechQuirks || [],
      exampleDialogues: options.examples || [],
      stats: {
        totalDialogueLines: 0,
        avgWordsPerLine: 0,
        exclamationRate: 0,
        questionRate: 0,
        ellipsisRate: 0,
        lastUpdated: new Date().toISOString()
      }
    };

    this.save(data);
    console.log(`✅ Voice profile created for "${options.name || characterSlug}"`);
  }

  // Extract dialogues from chapter for a character
  extractDialogues(chapterPath, characterName) {
    const text = fs.readFileSync(chapterPath, 'utf8');
    const dialogues = [];

    // Pattern: "dialogue" — character said/replied/asked
    // or: Character: "dialogue"
    // or: character verb: "dialogue"
    const lines = text.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Find quoted speech
      const quotes = line.match(/[""]([^""]+)[""]|"([^"]+)"/g);
      if (!quotes) continue;

      // Check if character name appears near the quote (within 100 chars before or after)
      const nearbyText = lines.slice(Math.max(0, i - 1), Math.min(lines.length, i + 2)).join(' ');

      if (nearbyText.toLowerCase().includes(characterName.toLowerCase())) {
        for (const quote of quotes) {
          const cleanQuote = quote.replace(/[""\""]/g, '').trim();
          if (cleanQuote.length > 3) {
            dialogues.push({
              text: cleanQuote,
              lineNumber: i + 1,
              context: line.trim().substring(0, 100)
            });
          }
        }
      }
    }

    return dialogues;
  }

  // Build voice profile from sample dialogues
  buildFromSamples(characterSlug, dialogues) {
    const data = this.load();
    const profile = data.characters[characterSlug];

    if (!profile) {
      console.error(`❌ Profile not found for "${characterSlug}". Create it first.`);
      return;
    }

    // Analyze dialogues
    const texts = dialogues.map(d => d.text);
    const allText = texts.join(' ');
    const words = allText.split(/\s+/).filter(w => w.length > 0);

    // Sentence analysis
    const sentenceLengths = texts.map(t => t.split(/\s+/).length);
    const avgLength = sentenceLengths.length > 0
      ? sentenceLengths.reduce((a, b) => a + b, 0) / sentenceLengths.length
      : 0;

    // Ending patterns
    const exclamations = texts.filter(t => t.endsWith('!')).length;
    const questions = texts.filter(t => t.endsWith('?')).length;
    const ellipses = texts.filter(t => t.endsWith('...')).length;

    // Update stats
    profile.stats = {
      totalDialogueLines: texts.length,
      avgWordsPerLine: Math.round(avgLength * 10) / 10,
      exclamationRate: texts.length > 0 ? Math.round((exclamations / texts.length) * 100) / 100 : 0,
      questionRate: texts.length > 0 ? Math.round((questions / texts.length) * 100) / 100 : 0,
      ellipsisRate: texts.length > 0 ? Math.round((ellipses / texts.length) * 100) / 100 : 0,
      lastUpdated: new Date().toISOString()
    };

    // Update sentence style
    if (avgLength <= 8) {
      profile.sentenceStyle.type = 'short-punchy';
      profile.sentenceStyle.preference = 'short';
    } else if (avgLength <= 15) {
      profile.sentenceStyle.type = 'flowing';
      profile.sentenceStyle.preference = 'medium';
    } else {
      profile.sentenceStyle.type = 'elaborate';
      profile.sentenceStyle.preference = 'long';
    }
    profile.sentenceStyle.avgLength = Math.round(avgLength);

    // Find frequent words (potential catchphrases)
    const freq = {};
    for (const w of words) {
      const lower = w.toLowerCase().replace(/[.,!?;:"""]/g, '');
      if (lower.length > 2) freq[lower] = (freq[lower] || 0) + 1;
    }
    const stopWords = new Set(['và', 'của', 'là', 'có', 'cho', 'một', 'không', 'để', 'được', 'với', 'này', 'đó', 'trong', 'từ', 'đã', 'cũng', 'nhưng', 'thì', 'mà', 'khi', 'nếu']);
    const topWords = Object.entries(freq)
      .filter(([w]) => !stopWords.has(w))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    // Store example dialogues
    profile.exampleDialogues = texts.slice(0, 5);

    this.save(data);
    console.log(`✅ Voice profile updated for "${profile.name}" from ${texts.length} dialogue lines`);
    console.log(`   Avg words/line: ${profile.stats.avgWordsPerLine}`);
    console.log(`   Style: ${profile.sentenceStyle.type}`);
    console.log(`   Top words: ${topWords.slice(0, 5).map(([w, c]) => `${w}(${c})`).join(', ')}`);
  }

  // Check voice consistency in chapter
  check(chapterPath) {
    const data = this.load();
    const text = fs.readFileSync(chapterPath, 'utf8');
    const findings = [];

    console.log(`\n🎭 Voice Consistency Check — ${path.basename(chapterPath)}\n`);

    for (const [slug, profile] of Object.entries(data.characters)) {
      const dialogues = this.extractDialogues(chapterPath, profile.name);
      if (dialogues.length === 0) continue;

      console.log(`${profile.name}: ${dialogues.length} dialogue lines`);

      // Check forbidden words
      for (const d of dialogues) {
        for (const forbidden of profile.forbiddenWords) {
          if (d.text.toLowerCase().includes(forbidden.toLowerCase())) {
            findings.push({
              severity: 'WARNING',
              character: profile.name,
              line: d.lineNumber,
              message: `Uses forbidden word "${forbidden}": "${d.text.substring(0, 60)}..."`
            });
          }
        }
      }

      // Check sentence length consistency
      const avgDialogueLength = dialogues.reduce((sum, d) => sum + d.text.split(/\s+/).length, 0) / dialogues.length;
      const expectedLength = profile.sentenceStyle.avgLength || 12;
      const deviation = Math.abs(avgDialogueLength - expectedLength) / expectedLength * 100;

      if (deviation > 40) {
        findings.push({
          severity: 'WARNING',
          character: profile.name,
          line: 0,
          message: `Sentence length drift: avg ${Math.round(avgDialogueLength)} words (expected ${expectedLength}, ${Math.round(deviation)}% deviation)`
        });
      }

      console.log(`   Avg words: ${Math.round(avgDialogueLength)} (expected ${expectedLength}) ${deviation > 40 ? '⚠️' : '✅'}`);
    }

    // Report
    if (findings.length === 0) {
      console.log(`\n✅ All character voices consistent`);
    } else {
      console.log(`\n⚠️  ${findings.length} voice issues found:`);
      for (const f of findings) {
        console.log(`   [${f.severity}] ${f.character} line ${f.line}: ${f.message}`);
      }
    }

    return { findings, pass: findings.filter(f => f.severity === 'CRITICAL').length === 0 };
  }

  // Compare two character voices
  compare(char1Slug, char2Slug) {
    const data = this.load();
    const p1 = data.characters[char1Slug];
    const p2 = data.characters[char2Slug];

    if (!p1 || !p2) {
      console.error('❌ One or both characters not found');
      return;
    }

    console.log(`\n🎭 Voice Comparison: ${p1.name} vs ${p2.name}\n`);

    // Vocabulary level match
    const vocabMatch = p1.vocabulary.level === p2.vocabulary.level ? 1 : 0;

    // Sentence style match
    const styleMatch = p1.sentenceStyle.type === p2.sentenceStyle.type ? 1 : 0;

    // Sentence length similarity (inverse of difference)
    const lenDiff = Math.abs((p1.sentenceStyle.avgLength || 12) - (p2.sentenceStyle.avgLength || 12));
    const lenMatch = Math.max(0, 1 - lenDiff / 20);

    // Formality similarity
    const formalDiff = Math.abs((p1.vocabulary.formalityScore || 0.5) - (p2.vocabulary.formalityScore || 0.5));
    const formalMatch = 1 - formalDiff;

    // Overall similarity
    const similarity = Math.round(((vocabMatch + styleMatch + lenMatch + formalMatch) / 4) * 100);

    console.log(`  Vocabulary level: ${p1.vocabulary.level} vs ${p2.vocabulary.level} ${vocabMatch ? '⚠️ SAME' : '✅ Different'}`);
    console.log(`  Sentence style: ${p1.sentenceStyle.type} vs ${p2.sentenceStyle.type} ${styleMatch ? '⚠️ SAME' : '✅ Different'}`);
    console.log(`  Avg line length: ${p1.sentenceStyle.avgLength} vs ${p2.sentenceStyle.avgLength}`);
    console.log(`  Formality: ${p1.vocabulary.formalityScore} vs ${p2.vocabulary.formalityScore}`);
    console.log(`\n  Overall similarity: ${similarity}% ${similarity > 40 ? '❌ TOO SIMILAR' : similarity > 30 ? '⚠️ Borderline' : '✅ Well differentiated'}`);

    return { similarity, vocabMatch, styleMatch, lenMatch, formalMatch };
  }

  // Full voice report
  report() {
    const data = this.load();
    const characters = Object.entries(data.characters);

    console.log(`\n🎭 VOICE REPORT — ${this.projectSlug}\n`);
    console.log(`Total characters with voice profiles: ${characters.length}\n`);

    // Profile summary
    for (const [slug, p] of characters) {
      console.log(`${p.name} (${slug}):`);
      console.log(`  Role: ${p.role} | Vocabulary: ${p.vocabulary.level} | Style: ${p.sentenceStyle.type}`);
      console.log(`  Catchphrases: ${p.catchphrases.length > 0 ? p.catchphrases.join(', ') : 'None defined'}`);
      console.log(`  Forbidden: ${p.forbiddenWords.length > 0 ? p.forbiddenWords.join(', ') : 'None defined'}`);
      console.log(`  Dialogue lines analyzed: ${p.stats.totalDialogueLines}`);
      console.log('');
    }

    // Similarity matrix
    if (characters.length >= 2) {
      console.log(`SIMILARITY MATRIX:`);
      for (let i = 0; i < characters.length; i++) {
        for (let j = i + 1; j < characters.length; j++) {
          const result = this.compare(characters[i][0], characters[j][0]);
        }
      }
    }
  }
}

export default VoiceManager;
