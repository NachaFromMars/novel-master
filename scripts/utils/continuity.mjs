#!/usr/bin/env node

/**
 * Continuity Checker V2.1 — 19 Rules, 6 Categories
 * Pure Node.js ESM, zero dependencies, Vietnamese text analysis
 *
 * Categories:
 *   1. Character Identity (1.1–1.3)
 *   2. Character State (2.1–2.5)
 *   3. Relationship (3.1–3.2)
 *   4. Timeline (4.1–4.3)
 *   5. World Rules (5.1–5.3)
 *   6. Narrative (6.1–6.3)
 */

// ─── Helpers ────────────────────────────────────────────────────────────────

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getLineNumber(text, index) {
  return text.substring(0, index).split('\n').length;
}

function getLineContext(text, lineNum, radius = 1) {
  const lines = text.split('\n');
  const start = Math.max(0, lineNum - 1 - radius);
  const end = Math.min(lines.length, lineNum + radius);
  return lines.slice(start, end).join('\n');
}

/** Normalise Vietnamese diacritics for fuzzy compare */
function stripViDiacritics(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

/** Levenshtein distance — lightweight, no dep */
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

/** Vietnamese time-of-day order */
const TIME_ORDER = ['sáng', 'trưa', 'chiều', 'tối', 'đêm'];

/** Vietnamese pronouns grouped by gender */
const PRONOUNS = {
  male: ['hắn', 'anh', 'gã', 'y', 'chàng', 'lão', 'ông', 'thằng', 'cậu'],
  female: ['nàng', 'cô', 'thị', 'bà', 'ả', 'mụ', 'chị', 'thiếm', 'nàng ấy'],
  neutral: ['người', 'kẻ', 'vị', 'tên', 'đứa', 'ai']
};

/** Vietnamese appearance keywords mapped to categories */
const APPEARANCE_KEYWORDS = {
  height: ['cao', 'thấp', 'lùn', 'dong dỏng', 'mập', 'gầy', 'ốm', 'béo', 'nhỏ thó', 'vạm vỡ', 'tráng kiện'],
  hair: ['tóc', 'bạch phát', 'hắc phát', 'tóc dài', 'tóc ngắn', 'đầu trọc', 'tóc bạc', 'tóc đỏ', 'tóc bạch kim'],
  eyes: ['mắt', 'nhãn', 'đồng tử', 'mắt đen', 'mắt xanh', 'mắt đỏ', 'mắt vàng', 'song mục'],
  scar: ['sẹo', 'vết sẹo', 'vết thương cũ', 'sẹo dài', 'sẹo mặt'],
  skin: ['da', 'da trắng', 'da ngăm', 'da đen', 'da sáng', 'da nâu'],
  build: ['vai', 'vai rộng', 'vai hẹp', 'thân hình', 'cơ bắp', 'gầy guộc', 'mảnh khảnh']
};

/** Vietnamese action verbs suggesting possession usage */
const POSSESSION_USE_VERBS = ['dùng', 'cầm', 'rút', 'vung', 'phóng', 'ném', 'chém', 'đâm', 'bắn',
  'mang', 'đeo', 'mặc', 'uống', 'ăn', 'sử dụng', 'kích hoạt', 'triệu hồi'];

/** Vietnamese power-breakthrough words */
const BREAKTHROUGH_WORDS = ['đột phá', 'thăng cấp', 'lên level', 'tu luyện thành',
  'giác ngộ', 'khai mở', 'đạt được', 'bước vào cảnh giới', 'tiến nhập',
  'đại thành', 'viên mãn', 'đắc đạo', 'hóa thần', 'trúc cơ', 'kết đan', 'ngưng anh'];

/** Travel / movement verbs */
const TRAVEL_VERBS = ['đi', 'tới', 'đến', 'rời', 'bay', 'chạy', 'di chuyển', 'lên đường',
  'xuất phát', 'phi', 'ngự kiếm', 'cưỡi', 'đạp', 'vượt', 'truyền tống', 'dịch chuyển'];

/** Interaction words by relationship nature */
const INTERACTION_PATTERNS = {
  enemy: ['chém', 'giết', 'đánh', 'tấn công', 'tiêu diệt', 'hận', 'căm thù', 'trả thù', 'diệt'],
  ally: ['hợp lực', 'cùng nhau', 'giúp', 'hỗ trợ', 'bảo vệ', 'đồng hành', 'liên minh'],
  lover: ['ôm', 'hôn', 'yêu', 'nhớ', 'thương', 'nhìn nhau', 'nắm tay', 'bên nhau'],
  master: ['bái sư', 'sư phụ', 'truyền thụ', 'dạy', 'chỉ điểm', 'đệ tử', 'tôn sư'],
  rival: ['so tài', 'thi đấu', 'thách đấu', 'đối đầu', 'ganh đua', 'cạnh tranh']
};

// ─── ContinuityChecker Class ────────────────────────────────────────────────

class ContinuityChecker {
  /**
   * @param {Object} bible — The Bible object (characters, locations, items, worldRules, plotThreads, project)
   * @param {Object} chapters — Map of chapterNum → text content { 1: "...", 2: "..." }
   * @param {Object} project — Project meta { slug, pov, ... }
   */
  constructor(bible, chapters, project) {
    this.bible = bible || {};
    this.chapters = chapters || {};
    this.project = project || {};
    this.findings = [];

    // Ensure bible sub-objects exist
    this.bible.characters = this.bible.characters || {};
    this.bible.locations = this.bible.locations || {};
    this.bible.items = this.bible.items || {};
    this.bible.worldRules = this.bible.worldRules || {};
    this.bible.plotThreads = this.bible.plotThreads || [];
    this.bible.project = this.bible.project || {};
  }

  // ─── Public API ─────────────────────────────────────────────────────────

  /** Scan a single chapter by number. Returns findings for that chapter. */
  scan(chapterNum) {
    const text = this.chapters[chapterNum];
    if (!text) {
      return { chapterNum, findings: [], error: `Chapter ${chapterNum} not found` };
    }

    const chFindings = [];
    const ctx = this._buildContext(chapterNum, text);

    // Cat 1 — Character Identity
    this._rule_1_1_nameConsistency(ctx, chFindings);
    this._rule_1_2_appearanceConsistency(ctx, chFindings);
    this._rule_1_3_genderPronoun(ctx, chFindings);

    // Cat 2 — Character State
    this._rule_2_1_locationLogic(ctx, chFindings);
    this._rule_2_2_deathAbsence(ctx, chFindings);
    this._rule_2_3_knowledgeState(ctx, chFindings);
    this._rule_2_4_possessionTracking(ctx, chFindings);
    this._rule_2_5_powerLevel(ctx, chFindings);

    // Cat 3 — Relationship
    this._rule_3_1_relationshipState(ctx, chFindings);
    this._rule_3_2_relationshipLogic(ctx, chFindings);

    // Cat 4 — Timeline
    this._rule_4_1_eventOrdering(ctx, chFindings);
    this._rule_4_2_timeLogic(ctx, chFindings);
    this._rule_4_3_ageConsistency(ctx, chFindings);

    // Cat 5 — World Rules
    this._rule_5_1_magicSystem(ctx, chFindings);
    this._rule_5_2_worldPhysics(ctx, chFindings);
    this._rule_5_3_socialRules(ctx, chFindings);

    // Cat 6 — Narrative
    this._rule_6_1_foreshadowing(ctx, chFindings);
    this._rule_6_2_droppedPlotlines(ctx, chFindings);
    this._rule_6_3_povConsistency(ctx, chFindings);

    // Store findings globally
    for (const f of chFindings) {
      this.findings.push(f);
    }

    return { chapterNum, findings: chFindings };
  }

  /** Scan all chapters. */
  scanAll() {
    this.findings = [];
    const nums = Object.keys(this.chapters).map(Number).sort((a, b) => a - b);
    const results = [];
    for (const n of nums) {
      results.push(this.scan(n));
    }
    return results;
  }

  /** Scan a range of chapters [from, to] inclusive. */
  scanRange(from, to) {
    this.findings = [];
    const results = [];
    for (let n = from; n <= to; n++) {
      if (this.chapters[n]) {
        results.push(this.scan(n));
      }
    }
    return results;
  }

  /** Generate a comprehensive report from accumulated findings. */
  getReport() {
    const critical = this.findings.filter(f => f.severity === 'CRITICAL');
    const warnings = this.findings.filter(f => f.severity === 'WARNING');
    const notes = this.findings.filter(f => f.severity === 'NOTE');

    // Group by chapter
    const byChapter = {};
    for (const f of this.findings) {
      const ch = f.chapter;
      if (!byChapter[ch]) byChapter[ch] = [];
      byChapter[ch].push(f);
    }

    // Group by rule
    const byRule = {};
    for (const f of this.findings) {
      const r = f.ruleId;
      if (!byRule[r]) byRule[r] = [];
      byRule[r].push(f);
    }

    let report = '';
    report += `╔══════════════════════════════════════════════════════╗\n`;
    report += `║   CONTINUITY REPORT V2.1 — 19 Rules, 6 Categories  ║\n`;
    report += `╚══════════════════════════════════════════════════════╝\n\n`;

    report += `Total findings: ${this.findings.length}\n`;
    report += `  🔴 CRITICAL: ${critical.length}\n`;
    report += `  🟡 WARNING:  ${warnings.length}\n`;
    report += `  🔵 NOTE:     ${notes.length}\n\n`;

    // By chapter
    const sortedChs = Object.keys(byChapter).map(Number).sort((a, b) => a - b);
    for (const ch of sortedChs) {
      const chFindings = byChapter[ch];
      const chCrit = chFindings.filter(f => f.severity === 'CRITICAL').length;
      const chWarn = chFindings.filter(f => f.severity === 'WARNING').length;
      const chNote = chFindings.filter(f => f.severity === 'NOTE').length;
      const icon = chCrit > 0 ? '❌' : chWarn > 0 ? '⚠️' : '✅';
      report += `── Chapter ${ch} ${icon}  C:${chCrit} W:${chWarn} N:${chNote} ──\n`;

      for (const f of chFindings) {
        const sevIcon = f.severity === 'CRITICAL' ? '🔴' : f.severity === 'WARNING' ? '🟡' : '🔵';
        report += `  ${sevIcon} [${f.ruleId}] L${f.line}: ${f.message}\n`;
      }
      report += `\n`;
    }

    // By rule summary
    report += `── Rule Summary ──\n`;
    const ruleNames = {
      '1.1': 'Name Consistency', '1.2': 'Appearance Consistency', '1.3': 'Gender/Pronoun',
      '2.1': 'Location Logic', '2.2': 'Death/Absence', '2.3': 'Knowledge State',
      '2.4': 'Possession Tracking', '2.5': 'Power Level',
      '3.1': 'Relationship State', '3.2': 'Relationship Logic',
      '4.1': 'Event Ordering', '4.2': 'Time Logic', '4.3': 'Age Consistency',
      '5.1': 'Magic System', '5.2': 'World Physics', '5.3': 'Social Rules',
      '6.1': 'Foreshadowing', '6.2': 'Dropped Plotlines', '6.3': 'POV Consistency'
    };
    for (const [ruleId, name] of Object.entries(ruleNames)) {
      const count = (byRule[ruleId] || []).length;
      if (count > 0) {
        report += `  [${ruleId}] ${name}: ${count} finding(s)\n`;
      }
    }

    report += `\n`;
    const pass = critical.length === 0;
    report += `STATUS: ${pass ? 'PASS ✅' : 'FAIL ❌'}\n`;

    return {
      report,
      summary: {
        total: this.findings.length,
        critical: critical.length,
        warnings: warnings.length,
        notes: notes.length,
        pass,
        byChapter,
        byRule
      },
      findings: this.findings
    };
  }

  // ─── Context Builder ────────────────────────────────────────────────────

  _buildContext(chapterNum, text) {
    const mentions = this._extractCharacterMentions(text);
    const locationMentions = this._extractLocationMentions(text);
    const itemMentions = this._extractItemMentions(text);
    const timeMarkers = this._extractTimeMarkers(text);
    const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0);

    return {
      chapterNum,
      text,
      textLower: text.toLowerCase(),
      mentions,
      locationMentions,
      itemMentions,
      timeMarkers,
      paragraphs
    };
  }

  // ─── Extraction Helpers ─────────────────────────────────────────────────

  /** Extract character mentions: { charSlug: { positions: [{name, index, line}], names: [..] } } */
  _extractCharacterMentions(text) {
    const mentions = {};
    for (const [slug, char] of Object.entries(this.bible.characters)) {
      const identity = char.identity || {};
      const names = [identity.name, ...(identity.aliases || [])].filter(Boolean);
      const positions = [];

      for (const name of names) {
        if (!name || name.length < 2) continue;
        const regex = new RegExp(escapeRegex(name), 'gi');
        let match;
        while ((match = regex.exec(text)) !== null) {
          positions.push({ name, index: match.index, line: getLineNumber(text, match.index) });
        }
      }

      if (positions.length > 0) {
        positions.sort((a, b) => a.index - b.index);
        mentions[slug] = { positions, names, count: positions.length };
      }
    }
    return mentions;
  }

  /** Extract location mentions */
  _extractLocationMentions(text) {
    const mentions = {};
    for (const [slug, loc] of Object.entries(this.bible.locations)) {
      if (!loc.name) continue;
      const regex = new RegExp(escapeRegex(loc.name), 'gi');
      let match;
      const positions = [];
      while ((match = regex.exec(text)) !== null) {
        positions.push({ index: match.index, line: getLineNumber(text, match.index) });
      }
      if (positions.length > 0) {
        mentions[slug] = { name: loc.name, positions, count: positions.length };
      }
    }
    return mentions;
  }

  /** Extract item mentions */
  _extractItemMentions(text) {
    const mentions = {};
    for (const [slug, item] of Object.entries(this.bible.items)) {
      if (!item.name) continue;
      const regex = new RegExp(escapeRegex(item.name), 'gi');
      let match;
      const positions = [];
      while ((match = regex.exec(text)) !== null) {
        positions.push({ index: match.index, line: getLineNumber(text, match.index) });
      }
      if (positions.length > 0) {
        mentions[slug] = { name: item.name, positions, count: positions.length };
      }
    }
    return mentions;
  }

  /** Extract Vietnamese time markers */
  _extractTimeMarkers(text) {
    const markers = [];
    // Exact time-of-day words
    const todPatterns = [
      { regex: /(?:^|\s)(sáng)(?:\s|$|,|\.)/gim, tod: 'sáng' },
      { regex: /(?:^|\s)(trưa)(?:\s|$|,|\.)/gim, tod: 'trưa' },
      { regex: /(?:^|\s)(chiều)(?:\s|$|,|\.)/gim, tod: 'chiều' },
      { regex: /(?:^|\s)(tối)(?:\s|$|,|\.)/gim, tod: 'tối' },
      { regex: /(?:^|\s)(đêm)(?:\s|$|,|\.)/gim, tod: 'đêm' }
    ];
    // Compound time phrases — "hôm sau" variants are day-level transitions, NOT same-day
    const compoundPatterns = [
      { regex: /sáng\s+hôm\s+sau/gi, tod: 'sáng', type: 'next-day' },
      { regex: /trưa\s+hôm\s+sau/gi, tod: 'trưa', type: 'next-day' },
      { regex: /chiều\s+hôm\s+sau/gi, tod: 'chiều', type: 'next-day' },
      { regex: /tối\s+hôm\s+sau/gi, tod: 'tối', type: 'next-day' },
      { regex: /đêm\s+hôm\s+sau/gi, tod: 'đêm', type: 'next-day' },
      { regex: /sáng\s+(?:hôm\s+)?(?:nay|đó|ấy|sớm)/gi, tod: 'sáng', type: 'compound' },
      { regex: /trưa\s+(?:hôm\s+)?(?:nay|đó|ấy)/gi, tod: 'trưa', type: 'compound' },
      { regex: /chiều\s+(?:hôm\s+)?(?:nay|đó|ấy|muộn|tà)/gi, tod: 'chiều', type: 'compound' },
      { regex: /tối\s+(?:hôm\s+)?(?:nay|đó|ấy|muộn)/gi, tod: 'tối', type: 'compound' },
      { regex: /đêm\s+(?:hôm\s+)?(?:nay|đó|ấy|khuya)/gi, tod: 'đêm', type: 'compound' },
      { regex: /nửa\s+đêm/gi, tod: 'đêm', type: 'compound' },
      { regex: /rạng\s+sáng/gi, tod: 'sáng', type: 'compound' },
      { regex: /hoàng\s+hôn/gi, tod: 'tối', type: 'compound' },
      { regex: /bình\s+minh/gi, tod: 'sáng', type: 'compound' }
    ];
    // Day-level skip markers
    const dayPatterns = [
      { regex: /hôm\s+sau/gi, type: 'next-day' },
      { regex: /ngày\s+hôm\s+sau/gi, type: 'next-day' },
      { regex: /(?:một|hai|ba|bốn|năm|sáu|bảy|tám|chín|mười|\d+)\s+ngày\s+sau/gi, type: 'days-later' },
      { regex: /(?:một|hai|ba|bốn|năm|sáu|\d+)\s+tháng\s+sau/gi, type: 'months-later' },
      { regex: /(?:một|nửa|hai|ba|\d+)\s+năm\s+sau/gi, type: 'years-later' },
      { regex: /trước\s+đó/gi, type: 'flashback' }
    ];

    const seen = new Set(); // Avoid duplicates from compound + simple matching same position

    for (const p of compoundPatterns) {
      let m;
      while ((m = p.regex.exec(text)) !== null) {
        const key = `${m.index}`;
        if (!seen.has(key)) {
          seen.add(key);
          markers.push({ text: m[0].trim(), tod: p.tod, type: p.type || 'tod', index: m.index, line: getLineNumber(text, m.index) });
        }
      }
    }

    for (const p of todPatterns) {
      let m;
      while ((m = p.regex.exec(text)) !== null) {
        // Check not already captured as compound
        const nearby = [...seen].some(k => Math.abs(parseInt(k) - m.index) < 5);
        if (!nearby) {
          seen.add(`${m.index}`);
          markers.push({ text: m[1], tod: p.tod, type: 'tod', index: m.index, line: getLineNumber(text, m.index) });
        }
      }
    }

    for (const p of dayPatterns) {
      let m;
      while ((m = p.regex.exec(text)) !== null) {
        markers.push({ text: m[0].trim(), tod: null, type: p.type, index: m.index, line: getLineNumber(text, m.index) });
      }
    }

    markers.sort((a, b) => a.index - b.index);
    return markers;
  }

  /** Get the latest state for a character before or at chapterNum */
  _getLatestState(charSlug, chapterNum) {
    const char = this.bible.characters[charSlug];
    if (!char || !char.states) return null;
    let latest = null;
    for (let i = 1; i <= chapterNum; i++) {
      const key = `ch${String(i).padStart(2, '0')}`;
      if (char.states[key]) {
        latest = { ...char.states[key], _ch: i };
      }
    }
    return latest;
  }

  /** Get character state exactly at chapterNum */
  _getStateAt(charSlug, chapterNum) {
    const char = this.bible.characters[charSlug];
    if (!char || !char.states) return null;
    const key = `ch${String(chapterNum).padStart(2, '0')}`;
    return char.states[key] || null;
  }

  /** Extract text window around an index */
  _textWindow(text, index, radius = 150) {
    const start = Math.max(0, index - radius);
    const end = Math.min(text.length, index + radius);
    return text.substring(start, end);
  }

  /** Find pronouns near a character mention */
  _findPronounsNear(text, charPosition, radius = 200) {
    const window = this._textWindow(text, charPosition.index, radius);
    const found = [];
    for (const [gender, plist] of Object.entries(PRONOUNS)) {
      for (const pronoun of plist) {
        const re = new RegExp(`(?:^|\\s)(${escapeRegex(pronoun)})(?:\\s|$|,|\\.)`, 'gi');
        let m;
        while ((m = re.exec(window)) !== null) {
          found.push({ pronoun: m[1], gender });
        }
      }
    }
    return found;
  }

  /** Check if any word from a list appears in text */
  _containsAny(text, words) {
    const lower = text.toLowerCase();
    return words.some(w => lower.includes(w.toLowerCase()));
  }

  /** Find all regex matches with positions */
  _findAll(text, regex) {
    const results = [];
    let m;
    const re = new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : regex.flags + 'g');
    while ((m = re.exec(text)) !== null) {
      results.push({ match: m[0], index: m.index, line: getLineNumber(text, m.index), groups: m.slice(1) });
    }
    return results;
  }

  /** Add a finding */
  _addFinding(findings, severity, ruleId, chapter, line, message) {
    findings.push({ severity, ruleId, chapter, line, message, ts: Date.now() });
  }

  // ─── RULE IMPLEMENTATIONS ──────────────────────────────────────────────

  // ═══ CATEGORY 1: CHARACTER IDENTITY ═══

  /** 1.1 Name Consistency — extract names, cross-ref Bible aliases, flag unknowns near char context, check spelling variations */
  _rule_1_1_nameConsistency(ctx, findings) {
    const { chapterNum, text } = ctx;

    // Collect all known names/aliases
    const knownNames = new Set();
    const nameToSlug = {};
    for (const [slug, char] of Object.entries(this.bible.characters)) {
      const id = char.identity || {};
      const names = [id.name, ...(id.aliases || [])].filter(Boolean);
      for (const n of names) {
        knownNames.add(n.toLowerCase());
        nameToSlug[n.toLowerCase()] = slug;
      }
    }

    // Find Vietnamese proper-noun-like patterns (capitalized words not at sentence start)
    // Vietnamese names: multi-syllable, each capitalised e.g. "Trần Minh Đức"
    const namePattern = /(?<!\.\s)(?<![?!]\s)(?:^|\s)([A-ZÀÁẢÃẠÂẦẤẨẪẬĂẰẮẲẴẶÈÉẺẼẸÊỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢÙÚỦŨỤƯỪỨỬỮỰỲÝỶỸỴĐĐ][a-zàáảãạâầấẩẫậăằắẳẵặèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]*(?:\s[A-ZÀÁẢÃẠÂẦẤẨẪẬĂẰẮẲẴẶÈÉẺẼẸÊỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢÙÚỦŨỤƯỪỨỬỮỰỲÝỶỸỴĐĐ][a-zàáảãạâầấẩẫậăằắẳẵặèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]*){1,3})/gm;

    let match;
    const unknownCandidates = new Map(); // name → [lines]
    while ((match = namePattern.exec(text)) !== null) {
      const candidate = match[1].trim();
      if (candidate.length < 2) continue;
      const lower = candidate.toLowerCase();
      // Skip known names
      if (knownNames.has(lower)) continue;
      // Skip common Vietnamese words that start with caps at line start
      const commonWords = new Set(['nhưng', 'vì', 'nếu', 'khi', 'sau', 'trước', 'trong', 'ngoài', 'trên', 'dưới']);
      if (commonWords.has(lower)) continue;

      // Check fuzzy match against known names (possible typo)
      let isFuzzy = false;
      for (const known of knownNames) {
        const dist = levenshtein(stripViDiacritics(lower), stripViDiacritics(known));
        const threshold = Math.max(1, Math.floor(known.length * 0.25));
        if (dist > 0 && dist <= threshold) {
          const line = getLineNumber(text, match.index);
          this._addFinding(findings, 'WARNING', '1.1', chapterNum, line,
            `Possible name typo: "${candidate}" ≈ Bible name "${[...knownNames].find(k => stripViDiacritics(k) === stripViDiacritics(known))}" (distance: ${dist})`);
          isFuzzy = true;
          break;
        }
      }

      if (!isFuzzy) {
        const line = getLineNumber(text, match.index);
        if (!unknownCandidates.has(candidate)) unknownCandidates.set(candidate, []);
        unknownCandidates.get(candidate).push(line);
      }
    }

    // Report unknown names that appear multiple times (likely actual characters)
    for (const [name, lines] of unknownCandidates) {
      if (lines.length >= 2) {
        this._addFinding(findings, 'NOTE', '1.1', chapterNum, lines[0],
          `Unknown character name "${name}" appears ${lines.length} times (lines: ${lines.slice(0, 5).join(', ')}). Not in Bible.`);
      }
    }

    // Check for spelling variations of known names within the chapter
    for (const [slug, char] of Object.entries(this.bible.characters)) {
      const id = char.identity || {};
      const canonicalName = id.name;
      if (!canonicalName) continue;
      const aliases = new Set((id.aliases || []).map(a => a.toLowerCase()));
      aliases.add(canonicalName.toLowerCase());

      // Check if multiple spelling forms are used
      const usedForms = new Set();
      for (const alias of [canonicalName, ...(id.aliases || [])]) {
        if (text.includes(alias)) usedForms.add(alias);
      }
      // If more than 2 forms used, note it (not necessarily wrong but worth flagging)
      if (usedForms.size > 2) {
        this._addFinding(findings, 'NOTE', '1.1', chapterNum, 0,
          `Character "${canonicalName}" referred to by ${usedForms.size} different forms: ${[...usedForms].join(', ')}`);
      }
    }
  }

  /** 1.2 Appearance Consistency — extract descriptors, compare vs Bible, flag contradictions */
  _rule_1_2_appearanceConsistency(ctx, findings) {
    const { chapterNum, text, mentions } = ctx;

    for (const [slug, mention] of Object.entries(mentions)) {
      const char = this.bible.characters[slug];
      if (!char) continue;
      const bibleAppearance = char.identity?.appearance || {};
      if (Object.keys(bibleAppearance).length === 0) continue;

      // For each mention position, look for appearance keywords nearby
      for (const pos of mention.positions) {
        const window = this._textWindow(text, pos.index, 200);
        const windowLower = window.toLowerCase();

        for (const [category, keywords] of Object.entries(APPEARANCE_KEYWORDS)) {
          const bibleValue = bibleAppearance[category];
          if (!bibleValue) continue;
          const bibleValueLower = (typeof bibleValue === 'string' ? bibleValue : '').toLowerCase();

          for (const kw of keywords) {
            if (windowLower.includes(kw)) {
              // Found an appearance keyword near this character — check for contradiction
              // Look for the keyword + descriptor pattern
              const descPattern = new RegExp(`(${escapeRegex(kw)}[^,.;]{0,30})`, 'gi');
              const descMatch = descPattern.exec(window);
              if (descMatch) {
                const descriptor = descMatch[1].toLowerCase().trim();
                // Check contradiction: e.g. Bible says "tóc đen" but text says "tóc bạc"
                if (bibleValueLower && descriptor.includes(kw) && !descriptor.includes(bibleValueLower)) {
                  // Only flag if the descriptor actually states a conflicting value
                  const hasConflict = keywords.some(otherKw =>
                    otherKw !== kw && descriptor.includes(otherKw) && !bibleValueLower.includes(otherKw)
                  );
                  if (hasConflict || (bibleValueLower.length > 2 && !descriptor.includes(bibleValueLower.split(' ').pop()))) {
                    this._addFinding(findings, 'WARNING', '1.2', chapterNum, pos.line,
                      `${char.identity.name}: appearance "${descriptor}" may contradict Bible ${category}: "${bibleValue}"`);
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  /** 1.3 Gender/Pronoun — track Vietnamese pronouns per character, flag gender mismatch */
  _rule_1_3_genderPronoun(ctx, findings) {
    const { chapterNum, text, mentions } = ctx;

    for (const [slug, mention] of Object.entries(mentions)) {
      const char = this.bible.characters[slug];
      if (!char) continue;
      const bibleGender = char.identity?.gender; // 'male', 'female', 'neutral', etc.
      if (!bibleGender) continue;

      // Check pronouns near each mention
      const pronounCounts = { male: 0, female: 0, neutral: 0 };

      for (const pos of mention.positions) {
        const nearbyPronouns = this._findPronounsNear(text, pos, 150);
        for (const p of nearbyPronouns) {
          pronounCounts[p.gender] = (pronounCounts[p.gender] || 0) + 1;
        }
      }

      // Check for mismatched pronouns
      const expectedGender = bibleGender.toLowerCase();
      const oppositeGender = expectedGender === 'male' ? 'female' : expectedGender === 'female' ? 'male' : null;

      if (oppositeGender && pronounCounts[oppositeGender] > 0) {
        // Only flag if opposite-gender pronouns are significant
        const totalGendered = pronounCounts.male + pronounCounts.female;
        const wrongRatio = totalGendered > 0 ? pronounCounts[oppositeGender] / totalGendered : 0;
        if (wrongRatio > 0.2 || pronounCounts[oppositeGender] >= 3) {
          this._addFinding(findings, 'WARNING', '1.3', chapterNum, mention.positions[0].line,
            `${char.identity.name} (Bible: ${bibleGender}) has ${pronounCounts[oppositeGender]} ${oppositeGender} pronoun(s) nearby (${Math.round(wrongRatio * 100)}% of gendered refs)`);
        }
      }
    }
  }

  // ═══ CATEGORY 2: CHARACTER STATE ═══

  /** 2.1 Location Logic — check travel time, distance from Bible */
  _rule_2_1_locationLogic(ctx, findings) {
    const { chapterNum, text, mentions, locationMentions, textLower } = ctx;

    for (const [slug, mention] of Object.entries(mentions)) {
      const state = this._getLatestState(slug, chapterNum - 1);
      if (!state || !state.location) continue;

      const char = this.bible.characters[slug];
      const charName = char?.identity?.name || slug;
      const lastLocationSlug = state.location;
      const lastLocation = this.bible.locations[lastLocationSlug];

      // Find if this character is associated with a different location in this chapter
      for (const [locSlug, locMention] of Object.entries(locationMentions)) {
        if (locSlug === lastLocationSlug) continue;

        // Check proximity: is the character mentioned near this location?
        for (const charPos of mention.positions) {
          for (const locPos of locMention.positions) {
            if (Math.abs(charPos.index - locPos.index) < 300) {
              // Character mentioned near a new location
              const hasTravelVerb = this._containsAny(
                this._textWindow(text, charPos.index, 400),
                TRAVEL_VERBS
              );

              if (!hasTravelVerb) {
                this._addFinding(findings, 'WARNING', '2.1', chapterNum, charPos.line,
                  `${charName} appears at "${locMention.name}" but last known location was "${lastLocation?.name || lastLocationSlug}". No travel narrative detected.`);
              }

              // Check distance if defined
              if (lastLocation?.distance && lastLocation.distance[locSlug]) {
                const dist = lastLocation.distance[locSlug];
                if (typeof dist === 'object' && dist.time) {
                  // We have travel time info — flag if chapter seems too short for the journey
                  this._addFinding(findings, 'NOTE', '2.1', chapterNum, charPos.line,
                    `${charName}: travel from "${lastLocation.name}" to "${locMention.name}" should take ${dist.time}. Verify timeline.`);
                }
              }
            }
          }
        }
      }
    }
  }

  /** 2.2 Death/Absence — flag dead or absent characters appearing */
  _rule_2_2_deathAbsence(ctx, findings) {
    const { chapterNum, text, mentions } = ctx;

    for (const [slug, mention] of Object.entries(mentions)) {
      const state = this._getLatestState(slug, chapterNum - 1);
      if (!state || !state.condition) continue;

      const char = this.bible.characters[slug];
      const charName = char?.identity?.name || slug;
      const condition = state.condition.toLowerCase();

      // Check if the mention is in dialogue/flashback (more lenient)
      const firstPos = mention.positions[0];
      const context = this._textWindow(text, firstPos.index, 300).toLowerCase();
      const isFlashback = /hồi tưởng|nhớ lại|năm xưa|ngày trước|khi ấy|thuở/.test(context);
      const isDialogue = /["'""][^"'"]*/.test(this._textWindow(text, firstPos.index, 50));

      if (condition.includes('dead') || condition.includes('chết') || condition.includes('tử vong')) {
        if (!isFlashback && !isDialogue) {
          this._addFinding(findings, 'CRITICAL', '2.2', chapterNum, firstPos.line,
            `${charName} is DEAD (since ch${state._ch || '??'}) but appears as active character. Add resurrection event or fix.`);
        } else {
          this._addFinding(findings, 'NOTE', '2.2', chapterNum, firstPos.line,
            `${charName} (dead) mentioned — appears to be flashback/dialogue. Verify.`);
        }
      }

      if (condition.includes('absent') || condition.includes('vắng mặt') ||
          condition.includes('imprisoned') || condition.includes('bị giam') ||
          condition.includes('sealed') || condition.includes('bị phong ấn')) {
        if (!isFlashback && !isDialogue) {
          this._addFinding(findings, 'WARNING', '2.2', chapterNum, firstPos.line,
            `${charName} is "${state.condition}" but appears active in chapter. Explain release/escape or fix.`);
        }
      }
    }
  }

  /** 2.3 Knowledge State — track knowledge[], flag acting on unknown info */
  _rule_2_3_knowledgeState(ctx, findings) {
    const { chapterNum, text, mentions, textLower } = ctx;

    for (const [slug, mention] of Object.entries(mentions)) {
      const state = this._getLatestState(slug, chapterNum - 1);
      if (!state || !state.knowledge || state.knowledge.length === 0) continue;

      const char = this.bible.characters[slug];
      const charName = char?.identity?.name || slug;

      // Check other characters' secrets/knowledge that THIS character shouldn't know
      for (const [otherSlug, otherChar] of Object.entries(this.bible.characters)) {
        if (otherSlug === slug) continue;
        const otherState = this._getLatestState(otherSlug, chapterNum - 1);
        if (!otherState || !otherState.knowledge) continue;

        // Find knowledge items marked as secret that are NOT in this character's knowledge
        for (const knowledgeItem of otherState.knowledge) {
          if (typeof knowledgeItem !== 'string') continue;
          const isSecret = knowledgeItem.toLowerCase().includes('[secret]') || knowledgeItem.toLowerCase().includes('[bí mật]');
          if (!isSecret) continue;

          const secretContent = knowledgeItem.replace(/\[secret\]|\[bí mật\]/gi, '').trim();
          if (state.knowledge.some(k => typeof k === 'string' && k.includes(secretContent))) continue; // Already knows

          // Check if this character references the secret in dialogue near their mention
          for (const pos of mention.positions) {
            const window = this._textWindow(text, pos.index, 400);
            if (window.toLowerCase().includes(secretContent.toLowerCase())) {
              this._addFinding(findings, 'WARNING', '2.3', chapterNum, pos.line,
                `${charName} references "${secretContent}" but this is not in their knowledge[]. Should they know this?`);
              break;
            }
          }
        }
      }
    }
  }

  /** 2.4 Possession Tracking — track possessions[], flag using items not held, consumables used twice */
  _rule_2_4_possessionTracking(ctx, findings) {
    const { chapterNum, text, mentions, itemMentions, textLower } = ctx;

    // Track which items are used by which characters
    for (const [itemSlug, itemMention] of Object.entries(itemMentions)) {
      const item = this.bible.items[itemSlug];
      if (!item) continue;

      // Find which character is near this item mention (using it)
      for (const itemPos of itemMention.positions) {
        const window = this._textWindow(text, itemPos.index, 250);
        const windowLower = window.toLowerCase();

        // Check if usage verb is nearby
        const hasUsageVerb = POSSESSION_USE_VERBS.some(v => windowLower.includes(v));
        if (!hasUsageVerb) continue;

        // Find which character is closest to this item usage
        let closestChar = null;
        let closestDist = Infinity;

        for (const [charSlug, charMention] of Object.entries(mentions)) {
          for (const charPos of charMention.positions) {
            const dist = Math.abs(charPos.index - itemPos.index);
            if (dist < closestDist && dist < 300) {
              closestDist = dist;
              closestChar = charSlug;
            }
          }
        }

        if (closestChar) {
          const charState = this._getLatestState(closestChar, chapterNum - 1);
          const char = this.bible.characters[closestChar];
          const charName = char?.identity?.name || closestChar;

          if (charState && charState.possessions) {
            const hasPossession = charState.possessions.some(p =>
              (typeof p === 'string' ? p : p?.id || '').toLowerCase() === itemSlug.toLowerCase() ||
              (typeof p === 'string' ? p : p?.name || '').toLowerCase() === item.name.toLowerCase()
            );

            if (!hasPossession) {
              this._addFinding(findings, 'WARNING', '2.4', chapterNum, itemPos.line,
                `${charName} uses "${item.name}" but it's not in their possessions[]. Transfer event needed.`);
            }
          }

          // Check consumable used multiple times
          if (item.consumable) {
            const usageCount = itemMention.positions.filter(p => {
              const w = this._textWindow(text, p.index, 150).toLowerCase();
              return POSSESSION_USE_VERBS.some(v => w.includes(v));
            }).length;

            if (usageCount > 1) {
              this._addFinding(findings, 'WARNING', '2.4', chapterNum, itemPos.line,
                `Consumable "${item.name}" appears to be used ${usageCount} times in this chapter. Consumables should be single-use.`);
            }
          }
        }
      }
    }

    // Cross-chapter consumable check: check if a consumable was already used in a previous chapter
    for (const [itemSlug, item] of Object.entries(this.bible.items)) {
      if (!item.consumable) continue;
      if (!itemMentions[itemSlug]) continue;

      // Check previous chapters for usage
      const chNums = Object.keys(this.chapters).map(Number).filter(n => n < chapterNum).sort((a, b) => a - b);
      for (const prevCh of chNums) {
        const prevText = this.chapters[prevCh];
        if (!prevText) continue;
        if (prevText.toLowerCase().includes(item.name.toLowerCase())) {
          // Check if it was actually used (not just mentioned)
          const prevLower = prevText.toLowerCase();
          const wasUsed = POSSESSION_USE_VERBS.some(v => {
            const itemIdx = prevLower.indexOf(item.name.toLowerCase());
            if (itemIdx < 0) return false;
            const window = prevLower.substring(Math.max(0, itemIdx - 100), itemIdx + 100);
            return window.includes(v);
          });
          if (wasUsed) {
            this._addFinding(findings, 'CRITICAL', '2.4', chapterNum, itemMentions[itemSlug].positions[0].line,
              `Consumable "${item.name}" was already used in Chapter ${prevCh}. Cannot be used again.`);
            break;
          }
        }
      }
    }
  }

  /** 2.5 Power Level — flag jumps >15 without breakthrough event */
  _rule_2_5_powerLevel(ctx, findings) {
    const { chapterNum, text, mentions, textLower } = ctx;

    for (const [slug, mention] of Object.entries(mentions)) {
      const prevState = this._getLatestState(slug, chapterNum - 1);
      const currState = this._getStateAt(slug, chapterNum);

      if (!prevState || prevState.powerLevel === undefined) continue;
      if (!currState || currState.powerLevel === undefined) continue;

      const char = this.bible.characters[slug];
      const charName = char?.identity?.name || slug;
      const jump = currState.powerLevel - prevState.powerLevel;

      if (jump > 15) {
        // Check for breakthrough event in text
        const hasBreakthrough = this._containsAny(text, BREAKTHROUGH_WORDS);
        if (!hasBreakthrough) {
          this._addFinding(findings, 'WARNING', '2.5', chapterNum, mention.positions[0].line,
            `${charName}: power level jumped from ${prevState.powerLevel} → ${currState.powerLevel} (+${jump}) without breakthrough event described.`);
        } else {
          this._addFinding(findings, 'NOTE', '2.5', chapterNum, mention.positions[0].line,
            `${charName}: power level jump +${jump} (${prevState.powerLevel}→${currState.powerLevel}). Breakthrough words detected — verify adequate.`);
        }
      }

      // Also flag negative jumps (power regression) without explanation
      if (jump < -10) {
        const regressionWords = ['mất', 'bị phế', 'tổn thương', 'suy yếu', 'trọng thương', 'bị truất', 'phế bỏ'];
        const hasRegression = this._containsAny(text, regressionWords);
        if (!hasRegression) {
          this._addFinding(findings, 'WARNING', '2.5', chapterNum, mention.positions[0].line,
            `${charName}: power level dropped from ${prevState.powerLevel} → ${currState.powerLevel} (${jump}) without explanation.`);
        }
      }
    }
  }

  // ═══ CATEGORY 3: RELATIONSHIP ═══

  /** 3.1 Relationship State — check interaction matches relationship */
  _rule_3_1_relationshipState(ctx, findings) {
    const { chapterNum, text, mentions, textLower } = ctx;

    const mentionedSlugs = Object.keys(mentions);

    // Check pairs of characters that are both mentioned
    for (let i = 0; i < mentionedSlugs.length; i++) {
      for (let j = i + 1; j < mentionedSlugs.length; j++) {
        const slugA = mentionedSlugs[i];
        const slugB = mentionedSlugs[j];

        const charA = this.bible.characters[slugA];
        const charB = this.bible.characters[slugB];
        if (!charA || !charB) continue;

        // Get relationship between A and B
        const relAB = charA.relationships?.[slugB];
        if (!relAB || !relAB.nature) continue;

        const nature = relAB.nature.toLowerCase();
        const nameA = charA.identity?.name || slugA;
        const nameB = charB.identity?.name || slugB;

        // Find text between / near both characters' mentions
        const positionsA = mentions[slugA].positions;
        const positionsB = mentions[slugB].positions;

        // Find co-occurrence windows (both mentioned within 500 chars)
        // Only flag once per character pair per chapter
        let pairFlagged = false;
        for (const pA of positionsA) {
          if (pairFlagged) break;
          for (const pB of positionsB) {
            if (pairFlagged) break;
            if (Math.abs(pA.index - pB.index) > 500) continue;

            const start = Math.min(pA.index, pB.index);
            const end = Math.max(pA.index, pB.index) + 100;
            const interactionText = text.substring(Math.max(0, start - 50), Math.min(text.length, end + 50)).toLowerCase();

            // Check if interaction type contradicts relationship
            for (const [intType, patterns] of Object.entries(INTERACTION_PATTERNS)) {
              const hasPattern = patterns.some(p => interactionText.includes(p));
              if (!hasPattern) continue;

              // Check for contradictions
              if (nature.includes('enemy') && intType === 'ally') {
                this._addFinding(findings, 'WARNING', '3.1', chapterNum, pA.line,
                  `${nameA} and ${nameB} are enemies but cooperating (${intType} interaction). Reconciliation needed?`);
                pairFlagged = true;
              }
              if (nature.includes('ally') && intType === 'enemy') {
                this._addFinding(findings, 'WARNING', '3.1', chapterNum, pA.line,
                  `${nameA} and ${nameB} are allies but fighting (${intType} interaction). Betrayal event needed?`);
                pairFlagged = true;
              }
              if (nature.includes('lover') && intType === 'enemy') {
                this._addFinding(findings, 'WARNING', '3.1', chapterNum, pA.line,
                  `${nameA} and ${nameB} are lovers but hostile interaction detected. Breakup/conflict event needed?`);
                pairFlagged = true;
              }
              if (nature.includes('master') && intType === 'enemy') {
                this._addFinding(findings, 'NOTE', '3.1', chapterNum, pA.line,
                  `${nameA} and ${nameB} have master/student bond but hostile interaction detected. Verify.`);
                pairFlagged = true;
              }
            }
          }
        }
      }
    }
  }

  /** 3.2 Relationship Logic — check if relationship change was dramatized */
  _rule_3_2_relationshipLogic(ctx, findings) {
    const { chapterNum, text, mentions } = ctx;

    for (const [slugA, charA] of Object.entries(this.bible.characters)) {
      if (!charA.relationships) continue;

      for (const [slugB, rel] of Object.entries(charA.relationships)) {
        if (!rel.evolution || rel.evolution.length < 2) continue;

        // Check if a relationship transition happens AT this chapter
        const transition = rel.evolution.find(e => e.chapter === chapterNum || e.ch === chapterNum);
        if (!transition) continue;

        const charB = this.bible.characters[slugB];
        const nameA = charA.identity?.name || slugA;
        const nameB = charB?.identity?.name || slugB;

        // Both characters should be mentioned in this chapter
        if (!mentions[slugA] || !mentions[slugB]) {
          this._addFinding(findings, 'WARNING', '3.2', chapterNum, 0,
            `Relationship change between ${nameA} and ${nameB} at ch${chapterNum}: "${transition.from || '?'}" → "${transition.to || '?'}", but one/both not mentioned in chapter.`);
          continue;
        }

        // Check if the chapter contains enough dramatization
        const transitionWords = ['thay đổi', 'phản bội', 'tha thứ', 'hòa giải', 'tuyên chiến',
          'kết nghĩa', 'ly khai', 'tỏ tình', 'chia tay', 'phát hiện', 'bí mật',
          'sự thật', 'lời thề', 'phá bỏ', 'cam kết'];

        const hasDramatization = this._containsAny(text, transitionWords);
        if (!hasDramatization) {
          this._addFinding(findings, 'WARNING', '3.2', chapterNum, mentions[slugA]?.positions[0]?.line || 0,
            `Relationship change: ${nameA}↔${nameB} "${transition.from || '?'}"→"${transition.to || '?'}" but chapter lacks dramatization. Show the turning point.`);
        }
      }
    }
  }

  // ═══ CATEGORY 4: TIMELINE ═══

  /** 4.1 Event Ordering — extract time markers, build timeline, flag ordering */
  _rule_4_1_eventOrdering(ctx, findings) {
    const { chapterNum, text, timeMarkers } = ctx;

    if (timeMarkers.length < 2) return;

    // Check for day-level ordering issues
    let dayLevel = 0; // Track day progression
    for (let i = 0; i < timeMarkers.length; i++) {
      const marker = timeMarkers[i];
      if (marker.type === 'next-day' || marker.type === 'days-later') {
        dayLevel++;
      }
      if (marker.type === 'flashback') {
        // Flashback is OK — but warn if no return to present
        const remainingMarkers = timeMarkers.slice(i + 1);
        const returnsToPresent = remainingMarkers.some(m =>
          m.type === 'tod' || m.type === 'next-day' || m.type === 'compound'
        );
        if (!returnsToPresent && remainingMarkers.length > 0) {
          this._addFinding(findings, 'NOTE', '4.1', chapterNum, marker.line,
            `Flashback marker "${marker.text}" at line ${marker.line} — chapter may not return to present timeline.`);
        }
      }
    }

    // Cross-chapter: check if this chapter's starting time makes sense after previous chapter
    const prevChNum = chapterNum - 1;
    if (this.chapters[prevChNum]) {
      const prevMarkers = this._extractTimeMarkers(this.chapters[prevChNum]);
      if (prevMarkers.length > 0 && timeMarkers.length > 0) {
        const lastPrev = prevMarkers[prevMarkers.length - 1];
        const firstCurr = timeMarkers[0];

        // If previous chapter ended at night, and this one starts at morning, that's fine (next day)
        // But if previous ended at morning and this starts at night of same "day", check for time skip
        if (lastPrev.tod && firstCurr.tod && !firstCurr.type?.includes('day')) {
          const prevIdx = TIME_ORDER.indexOf(lastPrev.tod);
          const currIdx = TIME_ORDER.indexOf(firstCurr.tod);
          if (prevIdx >= 0 && currIdx >= 0 && currIdx < prevIdx) {
            // Time went backwards between chapters without a day change marker
            this._addFinding(findings, 'NOTE', '4.1', chapterNum, firstCurr.line,
              `Chapter starts at "${firstCurr.text}" but previous chapter ended at "${lastPrev.text}". Missing day transition?`);
          }
        }
      }
    }
  }

  /** 4.2 Time Logic — Vietnamese time sequence, flag backwards */
  _rule_4_2_timeLogic(ctx, findings) {
    const { chapterNum, timeMarkers } = ctx;

    // Filter to only time-of-day markers within the same "day"
    let currentDayMarkers = [];

    for (const marker of timeMarkers) {
      if (marker.type === 'flashback') {
        // Flashback — skip time checks until next day marker
        currentDayMarkers = [];
        continue;
      }

      if (marker.type === 'next-day' || marker.type === 'days-later' ||
          marker.type === 'months-later' || marker.type === 'years-later') {
        // New day — reset the tracker, but if this marker also has a tod
        // (e.g. "sáng hôm sau" has type='next-day' and tod='sáng'),
        // start the new day's tracker with it.
        currentDayMarkers = [];
        if (marker.tod) {
          currentDayMarkers.push(marker);
        }
        continue;
      }

      if (marker.tod) {
        const todIdx = TIME_ORDER.indexOf(marker.tod);
        if (todIdx < 0) continue;

        // Check against previous time-of-day in same day
        if (currentDayMarkers.length > 0) {
          const lastMarker = currentDayMarkers[currentDayMarkers.length - 1];
          const lastIdx = TIME_ORDER.indexOf(lastMarker.tod);

          if (lastIdx >= 0 && todIdx < lastIdx) {
            this._addFinding(findings, 'WARNING', '4.2', chapterNum, marker.line,
              `Time goes backwards: "${lastMarker.text}" (${lastMarker.tod}) → "${marker.text}" (${marker.tod}). Expected ${TIME_ORDER.join('→')} sequence.`);
          }
        }

        currentDayMarkers.push(marker);
      }
    }
  }

  /** 4.3 Age Consistency — check age mentions vs timeline */
  _rule_4_3_ageConsistency(ctx, findings) {
    const { chapterNum, text, mentions } = ctx;

    // Pattern for Vietnamese age mentions: "XX tuổi", "năm nay XX"
    const agePattern = /(\d{1,3})\s*tuổi/gi;
    const ageMatches = this._findAll(text, agePattern);

    if (ageMatches.length === 0) return;

    for (const ageMatch of ageMatches) {
      const mentionedAge = parseInt(ageMatch.groups[0]);
      if (isNaN(mentionedAge)) continue;

      // Find nearest character to this age mention
      let closestChar = null;
      let closestDist = Infinity;

      for (const [slug, mention] of Object.entries(mentions)) {
        for (const pos of mention.positions) {
          const dist = Math.abs(pos.index - ageMatch.index);
          if (dist < closestDist && dist < 200) {
            closestDist = dist;
            closestChar = slug;
          }
        }
      }

      if (!closestChar) continue;

      const char = this.bible.characters[closestChar];
      if (!char) continue;
      const charName = char.identity?.name || closestChar;
      const bibleAge = char.identity?.age;

      if (bibleAge !== undefined && bibleAge !== null) {
        // Calculate expected age based on timeline
        const timelineStart = this.bible.project?.timeline?.startYear || 0;
        const chapterYear = this.bible.project?.timeline?.chapterYears?.[chapterNum] || 0;
        const yearsPassed = chapterYear ? chapterYear - timelineStart : 0;
        const expectedAge = yearsPassed > 0 ? bibleAge + yearsPassed : bibleAge;

        const ageDiff = Math.abs(mentionedAge - expectedAge);
        if (ageDiff > 2) { // Allow ±2 years for rounding
          this._addFinding(findings, 'WARNING', '4.3', chapterNum, ageMatch.line,
            `${charName}: mentioned as ${mentionedAge} tuổi, but Bible age=${bibleAge}${yearsPassed > 0 ? ` (+${yearsPassed}yr = expected ~${expectedAge})` : ''}. Difference: ${ageDiff} years.`);
        }
      }

      // Check cross-chapter age consistency
      const chNums = Object.keys(this.chapters).map(Number).filter(n => n < chapterNum).sort((a, b) => a - b);
      for (const prevCh of chNums) {
        const prevText = this.chapters[prevCh];
        if (!prevText) continue;
        const prevAgeMatches = this._findAll(prevText, /(\d{1,3})\s*tuổi/gi);
        for (const prevAge of prevAgeMatches) {
          const prevMentionedAge = parseInt(prevAge.groups[0]);
          // Check if same character was mentioned near this previous age
          const prevMentions = this._extractCharacterMentions(prevText);
          if (!prevMentions[closestChar]) continue;

          let prevNear = false;
          for (const pp of prevMentions[closestChar].positions) {
            if (Math.abs(pp.index - prevAge.index) < 200) { prevNear = true; break; }
          }
          if (!prevNear) continue;

          // Compare ages across chapters
          if (mentionedAge < prevMentionedAge) {
            this._addFinding(findings, 'WARNING', '4.3', chapterNum, ageMatch.line,
              `${charName}: age decreased from ${prevMentionedAge} (ch${prevCh}) to ${mentionedAge} (ch${chapterNum}).`);
          }
        }
      }
    }
  }

  // ═══ CATEGORY 5: WORLD RULES ═══

  /** 5.1 Magic System — check worldRules.magic violations */
  _rule_5_1_magicSystem(ctx, findings) {
    const { chapterNum, text, textLower } = ctx;
    const magic = this.bible.worldRules?.magic;
    if (!magic) return;

    // Check prohibited actions
    if (magic.prohibited && Array.isArray(magic.prohibited)) {
      for (const rule of magic.prohibited) {
        if (typeof rule === 'string') {
          // Simple string pattern
          if (textLower.includes(rule.toLowerCase())) {
            const idx = textLower.indexOf(rule.toLowerCase());
            this._addFinding(findings, 'WARNING', '5.1', chapterNum, getLineNumber(text, idx),
              `Magic violation: "${rule}" is prohibited by worldRules.magic but found in text.`);
          }
        } else if (rule.pattern && rule.description) {
          const re = new RegExp(rule.pattern, 'gi');
          const m = re.exec(text);
          if (m) {
            this._addFinding(findings, 'WARNING', '5.1', chapterNum, getLineNumber(text, m.index),
              `Magic violation: ${rule.description} — matched "${m[0]}".`);
          }
        }
      }
    }

    // Check costs / limitations
    if (magic.costs && Array.isArray(magic.costs)) {
      for (const cost of magic.costs) {
        if (!cost.spell || !cost.cost) continue;
        // Check if the spell is used
        if (textLower.includes(cost.spell.toLowerCase())) {
          // Check if cost is mentioned nearby
          const spellIdx = textLower.indexOf(cost.spell.toLowerCase());
          const window = this._textWindow(text, spellIdx, 500).toLowerCase();
          if (!window.includes(cost.cost.toLowerCase())) {
            this._addFinding(findings, 'NOTE', '5.1', chapterNum, getLineNumber(text, spellIdx),
              `Spell "${cost.spell}" used but cost "${cost.cost}" not mentioned nearby.`);
          }
        }
      }
    }

    // Check level requirements
    if (magic.levelRequirements && typeof magic.levelRequirements === 'object') {
      for (const [spell, reqLevel] of Object.entries(magic.levelRequirements)) {
        if (!textLower.includes(spell.toLowerCase())) continue;
        const spellIdx = textLower.indexOf(spell.toLowerCase());
        const line = getLineNumber(text, spellIdx);

        // Find who casts it
        for (const [slug, mention] of Object.entries(ctx.mentions)) {
          const charPos = mention.positions.find(p => Math.abs(p.index - spellIdx) < 300);
          if (!charPos) continue;

          const state = this._getLatestState(slug, chapterNum);
          if (state && state.powerLevel !== undefined && state.powerLevel < reqLevel) {
            const charName = this.bible.characters[slug]?.identity?.name || slug;
            this._addFinding(findings, 'WARNING', '5.1', chapterNum, line,
              `${charName} (power ${state.powerLevel}) uses "${spell}" which requires level ${reqLevel}.`);
          }
        }
      }
    }

    // Check general rules (string array)
    if (magic.rules && Array.isArray(magic.rules)) {
      for (const rule of magic.rules) {
        if (typeof rule === 'object' && rule.condition && rule.violation) {
          if (textLower.includes(rule.violation.toLowerCase())) {
            const idx = textLower.indexOf(rule.violation.toLowerCase());
            this._addFinding(findings, 'WARNING', '5.1', chapterNum, getLineNumber(text, idx),
              `Magic rule violation: "${rule.condition}" — detected "${rule.violation}".`);
          }
        }
      }
    }
  }

  /** 5.2 World Physics — check worldRules.physics violations */
  _rule_5_2_worldPhysics(ctx, findings) {
    const { chapterNum, text, textLower } = ctx;
    const physics = this.bible.worldRules?.physics;
    if (!physics) return;

    // Check defined physics rules
    const rules = Array.isArray(physics) ? physics : (physics.rules || []);

    for (const rule of rules) {
      if (typeof rule === 'string') {
        // Plain text rule — can't auto-check, skip
        continue;
      }

      if (rule.impossible && Array.isArray(rule.impossible)) {
        for (const impossibleAction of rule.impossible) {
          if (textLower.includes(impossibleAction.toLowerCase())) {
            const idx = textLower.indexOf(impossibleAction.toLowerCase());
            this._addFinding(findings, 'WARNING', '5.2', chapterNum, getLineNumber(text, idx),
              `Physics violation: "${impossibleAction}" is impossible in this world (rule: ${rule.name || 'unnamed'}).`);
          }
        }
      }

      if (rule.pattern) {
        const re = new RegExp(rule.pattern, 'gi');
        const m = re.exec(text);
        if (m) {
          this._addFinding(findings, 'WARNING', '5.2', chapterNum, getLineNumber(text, m.index),
            `Physics violation: ${rule.description || rule.name || 'unnamed rule'} — matched "${m[0]}".`);
        }
      }
    }

    // Check for speed/distance inconsistencies if defined
    if (physics.travelSpeeds && typeof physics.travelSpeeds === 'object') {
      // Check if someone travels faster than allowed
      for (const [mode, maxSpeed] of Object.entries(physics.travelSpeeds)) {
        if (textLower.includes(mode.toLowerCase())) {
          // Note for manual verification
          const idx = textLower.indexOf(mode.toLowerCase());
          this._addFinding(findings, 'NOTE', '5.2', chapterNum, getLineNumber(text, idx),
            `Travel mode "${mode}" mentioned. Max speed defined: ${maxSpeed}. Verify consistency.`);
        }
      }
    }
  }

  /** 5.3 Social Rules — check social norm violations */
  _rule_5_3_socialRules(ctx, findings) {
    const { chapterNum, text, textLower, mentions } = ctx;
    const social = this.bible.worldRules?.social;
    if (!social) return;

    const rules = Array.isArray(social) ? social : (social.rules || []);

    for (const rule of rules) {
      if (typeof rule === 'string') continue; // Can't auto-check plain text

      if (rule.violation && rule.description) {
        if (typeof rule.violation === 'string' && textLower.includes(rule.violation.toLowerCase())) {
          const idx = textLower.indexOf(rule.violation.toLowerCase());
          this._addFinding(findings, 'NOTE', '5.3', chapterNum, getLineNumber(text, idx),
            `Social rule: "${rule.description}" — violation pattern "${rule.violation}" found.`);
        }
      }

      if (rule.pattern) {
        const re = new RegExp(rule.pattern, 'gi');
        const m = re.exec(text);
        if (m) {
          this._addFinding(findings, 'NOTE', '5.3', chapterNum, getLineNumber(text, m.index),
            `Social rule: ${rule.description || 'unnamed'} — matched "${m[0]}".`);
        }
      }

      // Honorific rules: check if characters address each other correctly
      if (rule.honorifics && typeof rule.honorifics === 'object') {
        for (const [charSlug, expectedHonorific] of Object.entries(rule.honorifics)) {
          if (!mentions[charSlug]) continue;
          const char = this.bible.characters[charSlug];
          if (!char) continue;

          // Check if any other character addresses them without proper honorific
          const charNames = [char.identity?.name, ...(char.identity?.aliases || [])].filter(Boolean);
          for (const name of charNames) {
            // Look for name without honorific prefix
            const withoutHonorific = new RegExp(`(?<!${escapeRegex(expectedHonorific)}\\s)${escapeRegex(name)}`, 'g');
            const m = withoutHonorific.exec(text);
            if (m) {
              // Could be a violation — but only in dialogue
              const window = this._textWindow(text, m.index, 100);
              if (/["'""]/.test(window)) {
                this._addFinding(findings, 'NOTE', '5.3', chapterNum, getLineNumber(text, m.index),
                  `${name} addressed without honorific "${expectedHonorific}" in dialogue. Social norm check.`);
              }
            }
          }
        }
      }
    }
  }

  // ═══ CATEGORY 6: NARRATIVE ═══

  /** 6.1 Foreshadowing — track setup/payoff */
  _rule_6_1_foreshadowing(ctx, findings) {
    const { chapterNum, text, textLower } = ctx;

    // Vietnamese foreshadowing/setup markers
    const setupMarkers = [
      /(?:sau\s+này|rồi\s+sẽ|chưa\s+biết\s+rằng|không\s+ngờ|ai\s+biết\s+được)/gi,
      /(?:đó\s+là\s+(?:điều|chuyện)\s+(?:mà|sẽ))/gi,
      /(?:báo\s+trước|điềm\s+báo|dự\s+cảm)/gi,
      /(?:hạt\s+giống|mầm\s+mống)/gi
    ];

    for (const pattern of setupMarkers) {
      const matches = this._findAll(text, pattern);
      for (const m of matches) {
        this._addFinding(findings, 'NOTE', '6.1', chapterNum, m.line,
          `Foreshadowing setup detected: "${m.match}". Track for payoff in later chapters.`);
      }
    }

    // Check if this chapter pays off any earlier setups (via plotThreads)
    for (const thread of this.bible.plotThreads) {
      if (!thread.id) continue;
      if (thread.resolved) continue;

      // Check if this chapter references the thread
      const threadKeywords = thread.keywords || [thread.id];
      const isReferenced = threadKeywords.some(kw => textLower.includes(kw.toLowerCase()));

      if (isReferenced && thread.introduced_ch && chapterNum > thread.introduced_ch) {
        const gap = chapterNum - thread.introduced_ch;
        if (gap > 5) {
          this._addFinding(findings, 'NOTE', '6.1', chapterNum, 0,
            `Plot thread "${thread.id}" (introduced ch${thread.introduced_ch}) referenced after ${gap} chapters. Potential payoff moment.`);
        }
      }
    }
  }

  /** 6.2 Dropped Plotlines — warn if 10+ chapters without mention */
  _rule_6_2_droppedPlotlines(ctx, findings) {
    const { chapterNum, text, textLower } = ctx;

    for (const thread of this.bible.plotThreads) {
      if (!thread.id) continue;
      if (thread.resolved) continue;

      const lastMentioned = thread.last_mentioned_ch || thread.introduced_ch || 0;
      const gap = chapterNum - lastMentioned;

      if (gap >= 10) {
        // Check if this chapter actually mentions the thread
        const threadKeywords = thread.keywords || [thread.id];
        const isReferenced = threadKeywords.some(kw => textLower.includes(kw.toLowerCase()));

        if (!isReferenced) {
          this._addFinding(findings, 'WARNING', '6.2', chapterNum, 0,
            `Dropped plotline: "${thread.id}" not mentioned for ${gap} chapters (last: ch${lastMentioned}). Resolve or reference it.`);
        } else {
          // It's being picked up — update last_mentioned (informational)
          this._addFinding(findings, 'NOTE', '6.2', chapterNum, 0,
            `Plot thread "${thread.id}" mentioned again after ${gap} chapter gap. Update bible.plotThreads.last_mentioned_ch.`);
        }
      }
    }
  }

  /** 6.3 POV Consistency — check POV shifts */
  _rule_6_3_povConsistency(ctx, findings) {
    const { chapterNum, text, paragraphs } = ctx;

    const projectPov = this.bible.project?.pov;
    if (!projectPov) return;

    const povLower = projectPov.toLowerCase();

    if (povLower === 'first-person' || povLower === 'ngôi thứ nhất') {
      // First person: should use ta/tao/tôi, not describe other characters' inner thoughts
      const firstPersonWords = ['ta', 'tao', 'tôi', 'mình'];
      const innerThoughtPatterns = [
        /(?:hắn|gã|y|nàng|cô ấy|anh ta)\s+(?:nghĩ|suy nghĩ|tự hỏi|thầm nghĩ|cảm thấy\s+trong\s+lòng)/gi,
        /(?:trong\s+lòng\s+(?:hắn|gã|y|nàng|cô ấy|anh ta))/gi
      ];

      for (let i = 0; i < paragraphs.length; i++) {
        const para = paragraphs[i];
        if (para.length < 80) continue;

        // Check for third-person inner thoughts
        for (const pattern of innerThoughtPatterns) {
          const m = pattern.exec(para);
          if (m) {
            // Check this isn't in dialogue
            const isDialogue = /["'""]/.test(para.substring(Math.max(0, para.indexOf(m[0]) - 30), para.indexOf(m[0])));
            if (!isDialogue) {
              const paraStart = text.indexOf(para);
              const line = paraStart >= 0 ? getLineNumber(text, paraStart) : 0;
              this._addFinding(findings, 'WARNING', '6.3', chapterNum, line,
                `First-person POV violation: paragraph ${i + 1} describes another character's inner thoughts ("${m[0]}"). Use dialogue, expression, or inference instead.`);
              break;
            }
          }
        }
      }
    }

    if (povLower === 'third-person-limited' || povLower === 'ngôi thứ ba hạn chế') {
      // Third person limited: should follow ONE character per scene
      // Check for multiple characters' inner thoughts in same scene
      const sceneBreaks = text.split(/\n\s*[*—─]{3,}\s*\n|\n\s*#/);

      for (let s = 0; s < sceneBreaks.length; s++) {
        const scene = sceneBreaks[s];
        if (scene.length < 200) continue;

        const innerCharacters = new Set();
        const innerThoughtPattern = /(?:([\p{Lu}][\p{Ll}]+(?:\s[\p{Lu}][\p{Ll}]+)*))\s+(?:nghĩ|suy nghĩ|tự hỏi|thầm|cảm thấy\s+trong\s+lòng)/gu;
        let m;
        while ((m = innerThoughtPattern.exec(scene)) !== null) {
          innerCharacters.add(m[1]);
        }

        if (innerCharacters.size > 1) {
          const sceneStart = text.indexOf(scene);
          const line = sceneStart >= 0 ? getLineNumber(text, sceneStart) : 0;
          this._addFinding(findings, 'WARNING', '6.3', chapterNum, line,
            `Third-person-limited POV: scene ${s + 1} shows inner thoughts of ${innerCharacters.size} characters (${[...innerCharacters].join(', ')}). Should follow one POV character per scene.`);
        }
      }
    }

    if (povLower === 'omniscient' || povLower === 'toàn tri') {
      // Omniscient: mostly fine, but check for inconsistent narrator voice
      // This is hard to auto-detect; just note unusual first-person intrusions
      const firstPersonIntrusion = /\b(tao|tôi)\s+(nghĩ|thấy|biết|nói)/gi;
      const matches = this._findAll(text, firstPersonIntrusion);
      if (matches.length > 0) {
        this._addFinding(findings, 'NOTE', '6.3', chapterNum, matches[0].line,
          `Omniscient narrator has first-person intrusion ("${matches[0].match}"). Intentional narrator voice or POV slip?`);
      }
    }
  }
}

export default ContinuityChecker;
export { ContinuityChecker };
