#!/usr/bin/env node

/**
 * Prose Style Analyzer Module
 * Analyzes writing style to maintain consistency
 * 
 * Usage:
 *   prose baseline <chapter-files...>
 *   prose check <chapter-file>
 *   prose drift <ch-start> <ch-end> <directory>
 *   prose report
 */

import fs from 'fs';
import path from 'path';

class ProseAnalyzer {
  constructor(projectSlug) {
    this.projectSlug = projectSlug;
    this.dataDir = path.join(process.cwd(), 'data', projectSlug);
    this.profilePath = path.join(this.dataDir, 'style-profile.json');
  }

  // Analyze single text and return metrics
  analyze(text) {
    const cleanText = this.cleanText(text);
    const sentences = this.splitSentences(cleanText);
    const words = this.splitWords(cleanText);
    const paragraphs = cleanText.split(/\n\n+/).filter(p => p.trim().length > 0);

    return {
      sentence: this.analyzeSentences(sentences),
      vocabulary: this.analyzeVocabulary(words),
      structure: this.analyzeStructure(cleanText, sentences, paragraphs),
      tone: this.analyzeTone(cleanText, sentences),
      pov: this.analyzePOV(cleanText),
      aiTrace: this.detectAITrace(cleanText),
      vietnamese: this.analyzeVietnamese(cleanText, words)
    };
  }

  // Create baseline from reference chapters
  baseline(chapterFiles) {
    console.log(`\n📊 Creating style baseline from ${chapterFiles.length} chapters...\n`);

    const analyses = [];
    for (const file of chapterFiles) {
      const text = fs.readFileSync(file, 'utf8');
      analyses.push(this.analyze(text));
    }

    // Average all metrics
    const profile = {
      project: this.projectSlug,
      baselineChapters: chapterFiles.map(f => path.basename(f)),
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      metrics: this.averageMetrics(analyses)
    };

    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
    fs.writeFileSync(this.profilePath, JSON.stringify(profile, null, 2));
    console.log(`✅ Baseline created from ${chapterFiles.length} chapters`);
    this.printMetrics(profile.metrics);
    return profile;
  }

  // Check chapter against baseline
  check(chapterFile) {
    if (!fs.existsSync(this.profilePath)) {
      throw new Error('No baseline found. Run "prose baseline" first.');
    }

    const profile = JSON.parse(fs.readFileSync(this.profilePath, 'utf8'));
    const text = fs.readFileSync(chapterFile, 'utf8');
    const current = this.analyze(text);
    const baseline = profile.metrics;

    console.log(`\n📊 Style Check — ${path.basename(chapterFile)}\n`);

    const deviations = this.calculateDeviations(current, baseline);
    const driftScore = this.calculateDriftScore(deviations);

    this.printComparison(current, baseline, deviations, driftScore);

    return { current, baseline, deviations, driftScore, pass: driftScore < 20 };
  }

  // Measure drift over range
  drift(chStart, chEnd, directory) {
    const files = fs.readdirSync(directory)
      .filter(f => {
        const num = parseInt(f.match(/\d+/)?.[0] || '0');
        return f.endsWith('.md') && num >= chStart && num <= chEnd;
      })
      .sort((a, b) => {
        const numA = parseInt(a.match(/\d+/)?.[0] || '0');
        const numB = parseInt(b.match(/\d+/)?.[0] || '0');
        return numA - numB;
      });

    console.log(`\n📊 Style Drift Analysis — Ch${chStart} to Ch${chEnd}\n`);

    const results = [];
    for (const file of files) {
      const text = fs.readFileSync(path.join(directory, file), 'utf8');
      const analysis = this.analyze(text);
      const chNum = parseInt(file.match(/\d+/)?.[0] || '0');
      results.push({ chapter: chNum, metrics: analysis });
    }

    // Calculate drift between consecutive chapters
    for (let i = 1; i < results.length; i++) {
      const prev = results[i - 1];
      const curr = results[i];
      const dev = this.calculateDeviations(curr.metrics, prev.metrics);
      const drift = this.calculateDriftScore(dev);
      console.log(`Ch${prev.chapter} → Ch${curr.chapter}: Drift ${drift.toFixed(1)}% ${drift > 20 ? '⚠️' : '✅'}`);
    }

    return results;
  }

  // Sentence analysis
  analyzeSentences(sentences) {
    if (sentences.length === 0) return { avgLength: 0, medianLength: 0, minLength: 0, maxLength: 0, stdDev: 0, distribution: {} };

    const lengths = sentences.map(s => this.splitWords(s).length);
    const avg = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const sorted = [...lengths].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const variance = lengths.reduce((sum, l) => sum + Math.pow(l - avg, 2), 0) / lengths.length;
    const stdDev = Math.sqrt(variance);

    const distribution = {
      short: lengths.filter(l => l >= 1 && l <= 8).length / lengths.length,
      medium: lengths.filter(l => l >= 9 && l <= 20).length / lengths.length,
      long: lengths.filter(l => l >= 21 && l <= 35).length / lengths.length,
      veryLong: lengths.filter(l => l >= 36).length / lengths.length
    };

    return { avgLength: Math.round(avg * 10) / 10, medianLength: median, minLength: min, maxLength: max, stdDev: Math.round(stdDev * 10) / 10, distribution };
  }

  // Vocabulary analysis
  analyzeVocabulary(words) {
    const unique = new Set(words.map(w => w.toLowerCase()));
    const uniqueRatio = words.length > 0 ? unique.size / words.length : 0;
    const avgWordLength = words.length > 0 ? words.reduce((sum, w) => sum + w.length, 0) / words.length : 0;

    // Frequency count
    const freq = {};
    for (const w of words) {
      const lower = w.toLowerCase();
      freq[lower] = (freq[lower] || 0) + 1;
    }

    // Filter stop words (Vietnamese)
    const stopWords = new Set(['và', 'của', 'là', 'có', 'cho', 'một', 'không', 'để', 'được', 'với', 'này', 'đó', 'trong', 'từ', 'đã', 'cũng', 'nhưng', 'thì', 'mà', 'khi', 'nếu', 'hay', 'ở', 'như', 'các', 'theo', 'về', 'nào', 'bị', 'sẽ', 'đều', 'vì', 'lại', 'ra', 'lên', 'vào', 'rồi', 'rằng', 'đi', 'còn']);

    const contentFreq = Object.entries(freq)
      .filter(([w]) => !stopWords.has(w) && w.length > 1)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word, count]) => ({ word, freq: Math.round((count / words.length) * 1000) / 1000 }));

    // Repetition index
    let repetitions = 0;
    for (let i = 1; i < words.length; i++) {
      if (words[i].toLowerCase() === words[i - 1].toLowerCase()) repetitions++;
    }
    const repetitionIndex = words.length > 1 ? repetitions / (words.length - 1) : 0;

    return {
      uniqueRatio: Math.round(uniqueRatio * 100) / 100,
      avgWordLength: Math.round(avgWordLength * 10) / 10,
      topFrequencyWords: contentFreq,
      repetitionIndex: Math.round(repetitionIndex * 100) / 100
    };
  }

  // Structure analysis
  analyzeStructure(text, sentences, paragraphs) {
    const totalChars = text.length;
    
    // Dialogue detection (Vietnamese quotes)
    const dialogueMatches = text.match(/[""].*?[""]|".*?"|—\s*[^—\n]+/g) || [];
    const dialogueChars = dialogueMatches.reduce((sum, d) => sum + d.length, 0);
    const dialogueRatio = totalChars > 0 ? dialogueChars / totalChars : 0;

    // Internal monologue (first-person thoughts)
    const monologuePatterns = /tao\s+(?:nghĩ|biết|hiểu|tự\s+hỏi|chợt|bỗng\s+nhận\s+ra)/gi;
    const monologueMatches = text.match(monologuePatterns) || [];
    const monologueRatio = sentences.length > 0 ? monologueMatches.length / sentences.length : 0;

    const narrationRatio = Math.max(0, 1 - dialogueRatio - monologueRatio * 0.1);

    // Paragraph analysis
    const paraLengths = paragraphs.map(p => this.splitSentences(p).length);
    const avgParaLength = paraLengths.length > 0 ? paraLengths.reduce((a, b) => a + b, 0) / paraLengths.length : 0;

    // Show vs Tell
    const actionVerbs = (text.match(/\b(chạy|đánh|nhảy|bay|xông|lao|phóng|chém|đâm|bắn|ném|giật|kéo|xé|rít|gào|hét|cười|khóc|run|rung)\b/gi) || []).length;
    const stateVerbs = (text.match(/\b(là|cảm\s+thấy|trở\s+nên|dường\s+như|có\s+vẻ|hình\s+như|tưởng\s+như)\b/gi) || []).length;
    const showVsTell = (actionVerbs + stateVerbs) > 0 ? actionVerbs / (actionVerbs + stateVerbs) : 0.5;

    return {
      dialogueRatio: Math.round(dialogueRatio * 100) / 100,
      narrationRatio: Math.round(narrationRatio * 100) / 100,
      internalMonologueRatio: Math.round(monologueRatio * 100) / 100,
      avgParagraphLength: Math.round(avgParaLength * 10) / 10,
      showVsTellRatio: Math.round(showVsTell * 100) / 100
    };
  }

  // Tone analysis
  analyzeTone(text, sentences) {
    const totalSentences = sentences.length || 1;

    // Humor markers
    const humorPatterns = /haha|hehe|hề hề|cười|buồn cười|nực cười|đùa|bỡn cợt|khôi hài|chọc|trêu|mỉa|châm biếm|wtf|mẹ|đéo|lol|méo/gi;
    const humorCount = (text.match(humorPatterns) || []).length;
    const humorFrequency = humorCount / totalSentences;

    // Sarcasm markers
    const sarcasmPatterns = /mỉa|châm\s+biếm|tất\s+nhiên\s+rồi|ừ\s+thì|chứ\s+sao|ai\s+biết|thật\s+à|đúng\s+thế|giả\s+vờ|hài/gi;
    const sarcasmCount = (text.match(sarcasmPatterns) || []).length;
    const sarcasmMarkers = sarcasmCount / totalSentences;

    // Profanity level
    const profanityPatterns = /đéo|mẹ|địt|chó|thằng\s+chó|con\s+mẹ|đm|ngu|khốn|chết\s+tiệt/gi;
    const profanityCount = (text.match(profanityPatterns) || []).length;
    const profanityLevel = profanityCount / totalSentences;

    // Formality (Sino-Vietnamese formal words)
    const formalWords = /tuy\s+nhiên|mặc\s+dù|do\s+đó|bởi\s+vậy|quả\s+nhiên|thật\s+vậy|hiển\s+nhiên|chắc\s+chắn|tất\s+yếu|nhất\s+định/gi;
    const formalCount = (text.match(formalWords) || []).length;
    const formalityScore = Math.min(1, formalCount / (totalSentences * 0.1));

    return {
      humorFrequency: Math.round(humorFrequency * 1000) / 1000,
      sarcasmMarkers: Math.round(sarcasmMarkers * 1000) / 1000,
      profanityLevel: Math.round(profanityLevel * 1000) / 1000,
      formalityScore: Math.round(formalityScore * 100) / 100
    };
  }

  // POV analysis
  analyzePOV(text) {
    const firstPerson = (text.match(/\btao\b|\bta\b/gi) || []).length;
    const thirdPerson = (text.match(/\bhắn\b|\bnó\b|\banh\s+ta\b|\bcô\s+ấy\b/gi) || []).length;
    const total = firstPerson + thirdPerson || 1;

    return {
      type: firstPerson > thirdPerson ? 'first-person' : 'third-person',
      firstPersonRatio: Math.round((firstPerson / total) * 100) / 100,
      pronounDistribution: {
        tao: (text.match(/\btao\b/gi) || []).length,
        ta: (text.match(/\bta\b/gi) || []).length,
        no: (text.match(/\bnó\b/gi) || []).length,
        han: (text.match(/\bhắn\b/gi) || []).length
      }
    };
  }

  // AI trace detection
  detectAITrace(text) {
    const forbiddenEN = ['brilliant', 'stunning', 'fascinating', 'delve', 'tapestry', 'testament', 'embark', 'beacon', 'intricate', 'pivotal', 'crucial', 'leverage', 'foster', 'holistic', 'paradigm', 'unprecedented', 'cutting-edge', 'groundbreaking'];
    const forbiddenVN = ['một cách đáng kinh ngạc', 'kỳ diệu thay', 'sự kết hợp hoàn hảo', 'hành trình tuyệt vời', 'đắm chìm trong', 'bức tranh toàn cảnh', 'nền tảng vững chắc', 'tầm nhìn chiến lược'];

    const foundWords = [];

    for (const word of forbiddenEN) {
      if (text.toLowerCase().includes(word)) foundWords.push(word);
    }
    for (const phrase of forbiddenVN) {
      if (text.toLowerCase().includes(phrase)) foundWords.push(phrase);
    }

    // Markdown artifacts
    const markdownPatterns = /^#{1,3}\s|^\*\s|^\-\s\[|^\|.*\||\*\*.*\*\*|__.*__|```/gm;
    const markdownFound = text.match(markdownPatterns) || [];

    // Pattern repetition (3+ consecutive same-start sentences)
    const sentences = this.splitSentences(text);
    let maxConsecutiveSameStart = 0;
    let currentStreak = 1;
    for (let i = 1; i < sentences.length; i++) {
      const prevStart = sentences[i - 1].trim().split(/\s+/)[0]?.toLowerCase();
      const currStart = sentences[i].trim().split(/\s+/)[0]?.toLowerCase();
      if (prevStart === currStart && prevStart) {
        currentStreak++;
        maxConsecutiveSameStart = Math.max(maxConsecutiveSameStart, currentStreak);
      } else {
        currentStreak = 1;
      }
    }

    return {
      forbiddenWords: { found: foundWords, count: foundWords.length },
      markdownArtifacts: { found: markdownFound.map(m => m.trim()), count: markdownFound.length },
      patternRepetition: { maxConsecutiveSameStart },
      clean: foundWords.length === 0 && markdownFound.length === 0 && maxConsecutiveSameStart < 3
    };
  }

  // Vietnamese-specific analysis
  analyzeVietnamese(text, words) {
    const particles = {
      'à': (text.match(/\bà\b/g) || []).length,
      'ư': (text.match(/\bư\b/g) || []).length,
      'nhỉ': (text.match(/\bnhỉ\b/g) || []).length,
      'nhé': (text.match(/\bnhé\b/g) || []).length,
      'đi': (text.match(/\bđi\b(?!\s+(?:đến|tới|ra|vào|lên|xuống))/g) || []).length,
      'thôi': (text.match(/\bthôi\b/g) || []).length,
      'chứ': (text.match(/\bchứ\b/g) || []).length,
      'mà': (text.match(/\bmà\b/g) || []).length
    };

    // Sino-Vietnamese ratio (simplified check)
    const sinoPatterns = /[a-zA-ZÀ-ỹ]+(phương|đạo|thiên|địa|nhân|phật|thánh|thần|quân|quốc|vương|đế|kinh|pháp|tâm|đức|nghĩa|lễ|trí|tín)/gi;
    const sinoCount = (text.match(sinoPatterns) || []).length;
    const sinoRatio = words.length > 0 ? sinoCount / words.length : 0;

    // Sentence ending patterns
    const endings = {
      period: (text.match(/\.\s/g) || []).length,
      ellipsis: (text.match(/\.\.\./g) || []).length,
      exclamation: (text.match(/!/g) || []).length,
      question: (text.match(/\?/g) || []).length,
      dash: (text.match(/—/g) || []).length
    };
    const totalEndings = Object.values(endings).reduce((a, b) => a + b, 0) || 1;

    return {
      particleUsage: particles,
      sinoVietnameseRatio: Math.round(sinoRatio * 100) / 100,
      sentenceEndingPatterns: Object.fromEntries(
        Object.entries(endings).map(([k, v]) => [k, Math.round((v / totalEndings) * 100) / 100])
      )
    };
  }

  // Average metrics across multiple analyses
  averageMetrics(analyses) {
    if (analyses.length === 0) return {};
    if (analyses.length === 1) return analyses[0];

    // Deep average of numeric values
    const result = JSON.parse(JSON.stringify(analyses[0]));

    const avgRecursive = (target, sources, path = '') => {
      for (const key of Object.keys(target)) {
        if (typeof target[key] === 'number') {
          const values = sources.map(s => {
            let val = s;
            for (const k of path.split('.').filter(Boolean).concat(key)) val = val?.[k];
            return val || 0;
          });
          target[key] = Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 1000) / 1000;
        } else if (typeof target[key] === 'object' && target[key] !== null && !Array.isArray(target[key])) {
          avgRecursive(target[key], sources, path ? `${path}.${key}` : key);
        }
      }
    };

    avgRecursive(result, analyses);
    return result;
  }

  // Calculate deviations
  calculateDeviations(current, baseline) {
    const devs = {};

    const calcDev = (curr, base, prefix = '') => {
      for (const key of Object.keys(curr)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        if (typeof curr[key] === 'number' && typeof base[key] === 'number') {
          const ref = base[key] || 0.001;
          devs[fullKey] = Math.abs(curr[key] - base[key]) / Math.abs(ref) * 100;
        } else if (typeof curr[key] === 'object' && curr[key] !== null && !Array.isArray(curr[key]) && base[key]) {
          calcDev(curr[key], base[key], fullKey);
        }
      }
    };

    calcDev(current, baseline);
    return devs;
  }

  // Calculate drift score
  calculateDriftScore(deviations) {
    const weights = {
      'sentence': 0.15,
      'vocabulary': 0.15,
      'structure': 0.20,
      'tone': 0.20,
      'pov': 0.10,
      'aiTrace': 0.10,
      'vietnamese': 0.10
    };

    let totalDrift = 0;
    let totalWeight = 0;

    for (const [key, dev] of Object.entries(deviations)) {
      const category = key.split('.')[0];
      const weight = weights[category] || 0.1;
      totalDrift += dev * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? totalDrift / totalWeight : 0;
  }

  // Print metrics
  printMetrics(metrics) {
    console.log(`\n  Sentence avg: ${metrics.sentence?.avgLength} words`);
    console.log(`  Vocabulary richness: ${metrics.vocabulary?.uniqueRatio}`);
    console.log(`  Dialogue ratio: ${metrics.structure?.dialogueRatio}`);
    console.log(`  Show vs Tell: ${metrics.structure?.showVsTellRatio}`);
    console.log(`  Humor frequency: ${metrics.tone?.humorFrequency}`);
    console.log(`  AI trace clean: ${metrics.aiTrace?.clean ? '✅' : '❌'}`);
  }

  // Print comparison
  printComparison(current, baseline, deviations, driftScore) {
    console.log(`  Drift Score: ${driftScore.toFixed(1)}% ${driftScore < 10 ? '✅' : driftScore < 20 ? '⚠️' : '❌'}\n`);
    console.log(`  Sentence avg: ${current.sentence?.avgLength} (baseline ${baseline.sentence?.avgLength})`);
    console.log(`  Vocab richness: ${current.vocabulary?.uniqueRatio} (baseline ${baseline.vocabulary?.uniqueRatio})`);
    console.log(`  Dialogue: ${current.structure?.dialogueRatio} (baseline ${baseline.structure?.dialogueRatio})`);
    console.log(`  Show/Tell: ${current.structure?.showVsTellRatio} (baseline ${baseline.structure?.showVsTellRatio})`);
    console.log(`  AI trace: ${current.aiTrace?.clean ? 'CLEAN ✅' : 'DIRTY ❌'}`);
    console.log(`\n  STATUS: ${driftScore < 20 ? 'PASS ✅' : 'FAIL ❌'}`);
  }

  // Utility: Clean text (remove non-prose elements)
  cleanText(text) {
    return text
      .replace(/^#.*$/gm, '')      // Remove headers
      .replace(/^---.*$/gm, '')     // Remove separators
      .replace(/```[\s\S]*?```/g, '') // Remove code blocks
      .trim();
  }

  // Utility: Split into sentences (Vietnamese-aware)
  splitSentences(text) {
    return text
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 3);
  }

  // Utility: Split into words
  splitWords(text) {
    return text
      .split(/\s+/)
      .filter(w => w.length > 0 && !/^[.,!?;:"""''()—\-…]+$/.test(w));
  }
}

export default ProseAnalyzer;
