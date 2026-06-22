/**
 * Novel Master V2.1 — Module C: 7-Angle Scoring Engine
 * 
 * Pure algorithmic text analysis for Vietnamese prose quality scoring.
 * Zero dependencies. No AI calls.
 * 
 * 7 Angles: Prose Quality, Consistency, Character Voice, Pacing,
 *           AI Trace, Engagement, Markdown & Format
 */

// ─── CONSTANTS ────────────────────────────────────────────────────────

export const ANGLES = [
  { id: 'prose',       name: 'Prose Quality',     weight: 0.20, description: 'Câu chữ mượt? Nhịp điệu? Từ vựng phong phú?' },
  { id: 'consistency', name: 'Consistency',        weight: 0.20, description: 'Nhất quán với Bible? Tên, địa danh, trạng thái đúng?' },
  { id: 'voice',       name: 'Character Voice',    weight: 0.15, description: 'Nhân vật nói đúng giọng? Hành động đúng tính cách?' },
  { id: 'pacing',      name: 'Pacing',             weight: 0.15, description: 'Beat nhanh/chậm phù hợp vị trí trong chương/arc?' },
  { id: 'ai_trace',    name: 'AI Trace',           weight: 0.10, description: 'Còn dấu vết AI? Markdown? Pattern lặp? Từ cấm?' },
  { id: 'engagement',  name: 'Engagement',         weight: 0.10, description: 'Đọc hấp dẫn? Muốn đọc tiếp? Hook cuối beat?' },
  { id: 'format',      name: 'Markdown & Format',  weight: 0.10, description: '0% markdown (# * ** _ --- >)? 0% dấu gạch dài (—)? Prose thuần?' }
];

// ─── VIETNAMESE TEXT UTILITIES ─────────────────────────────────────────

/**
 * Split Vietnamese text into sentences.
 * Handles: . ? ! … and multi-char endings like "?!" or "..."
 */
function splitSentences(text) {
  if (!text || typeof text !== 'string') return [];
  // Split on sentence-ending punctuation followed by whitespace or end
  const raw = text.split(/(?<=[.?!…])\s+/);
  return raw.map(s => s.trim()).filter(s => s.length > 0);
}

/**
 * Split text into words (Vietnamese-aware).
 * Vietnamese words can be multi-syllable separated by spaces,
 * but for token-level analysis we split on whitespace.
 */
function splitWords(text) {
  if (!text || typeof text !== 'string') return [];
  return text.replace(/[""«»"".,!?;:…\-–—()[\]{}]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 0);
}

/**
 * Extract dialogue blocks from text.
 * Supports Vietnamese quotes: "" "" «» and standard ""
 * Returns array of { speaker: string|null, text: string }
 */
function extractDialogue(text) {
  if (!text) return [];
  const dialogues = [];
  // Pattern: optional speaker indication before quote
  // Match quoted text with various Vietnamese quote styles
  // Use a single unified regex to avoid duplicate matches.
  // Matches: "" (curly), «» (guillemets), OR "" (straight ASCII) — in priority order.
  // The alternation ensures each quote is matched exactly once.
  const quotePattern = /\u201C([^\u201D]+)\u201D|«([^»]+)»|"([^"]+)"/g;

  // Track matched index ranges to prevent overlaps
  const matchedRanges = [];

  let match;
  while ((match = quotePattern.exec(text)) !== null) {
    // Pick the first non-null capture group
    const quoteText = (match[1] || match[2] || match[3] || '').trim();
    if (quoteText.length < 2) continue;

    // Check for overlap with already matched ranges
    const start = match.index;
    const end = start + match[0].length;
    const overlaps = matchedRanges.some(([s, e]) => start < e && end > s);
    if (overlaps) continue;
    matchedRanges.push([start, end]);

    // Try to find speaker: look for name before the quote
    // Exclude Vietnamese pronouns that look like proper names (Hắn, Nàng, etc.)
    const beforeQuote = text.substring(Math.max(0, match.index - 80), match.index);
    const speakerMatch = beforeQuote.match(/([A-ZÀ-Ỹ][a-zà-ỹ]+(?:\s+[A-ZÀ-Ỹ][a-zà-ỹ]+)*)\s*(?:nói|hỏi|đáp|cười|gào|thì thầm|gầm|quát|la|kêu|bảo|gọi|thở dài|lẩm bẩm|rít|rống|thốt|buông|chặc lưỡi)?[:\s]*$/);

    let speaker = speakerMatch ? speakerMatch[1].trim() : null;

    // Filter out Vietnamese pronouns that aren't actual character names
    const viPronouns = ['hắn', 'nàng', 'gã', 'lão', 'thị', 'mụ', 'ả', 'chàng', 'nàng', 'y', 'người'];
    if (speaker && viPronouns.includes(speaker.toLowerCase())) {
      speaker = null;
    }

    dialogues.push({
      speaker,
      text: quoteText
    });
  }

  return dialogues;
}

/**
 * Compute standard deviation of an array of numbers.
 */
function stdDev(arr) {
  if (arr.length < 2) return 0;
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  const variance = arr.reduce((sum, val) => sum + (val - mean) ** 2, 0) / arr.length;
  return Math.sqrt(variance);
}

/**
 * Count occurrences of a word in text (case-insensitive).
 */
function countWord(text, word) {
  const regex = new RegExp(`\\b${escapeRegex(word)}\\b`, 'gi');
  return (text.match(regex) || []).length;
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Normalize Vietnamese text for comparison (lowercase, strip diacritics for matching).
 */
function normalizeVi(text) {
  return text.toLowerCase().trim();
}

// ─── VIETNAMESE LITERARY PATTERNS ──────────────────────────────────────

const VIETNAMESE_LITERARY_WORDS = [
  // Thành ngữ phổ biến
  'nước đổ đầu vịt', 'cá chậu chim lồng', 'mặt hoa da phấn',
  'trăng thanh gió mát', 'đèn sách', 'bút nghiên', 'sông núi',
  'trời đất', 'gió mưa', 'mây trời', 'sóng gió', 'phong ba',
  'bão táp', 'tang thương', 'phiêu bạt', 'lưu lạc', 'trôi nổi',
  'long lanh', 'mênh mông', 'bao la', 'thăm thẳm', 'vời vợi',
  'mịt mù', 'chập chờn', 'lập lòe', 'lung linh', 'lấp lánh',
  'thổn thức', 'nức nở', 'nghẹn ngào', 'bồi hồi', 'xao xuyến',
  'rạo rực', 'nao nao', 'bâng khuâng', 'man mác', 'miên man',
  'u hoài', 'bi thương', 'ai oán', 'thê lương', 'sầu muộn',
  'phẫn nộ', 'uất hận', 'cay đắng', 'tủi nhục', 'oan khuất',
  // Thi ca / văn chương
  'hồng nhan', 'bạc phận', 'tài hoa', 'phong lưu', 'nho nhã',
  'thanh tao', 'cao nhã', 'kiêu sa', 'diễm lệ', 'kiều diễm',
  'yêu kiều', 'mặn mà', 'đoan trang', 'thùy mị', 'nết na',
  'hiền thục', 'dịu dàng', 'e ấp', 'thẹn thùng', 'ngại ngùng',
  // Từ láy văn học
  'lặng lẽ', 'âm thầm', 'dịu dàng', 'nhẹ nhàng', 'êm đềm',
  'trầm lặng', 'thâm trầm', 'sâu lắng', 'tĩnh lặng', 'yên ả',
  'rầm rập', 'ào ạt', 'cuồn cuộn', 'dào dạt', 'ầm ầm',
  'vang vọng', 'lanh lảnh', 'réo rắt', 'du dương', 'véo von'
];

// AI forbidden words
const AI_FORBIDDEN_EN = [
  'brilliant', 'stunning', 'delve', 'tapestry', 'journey', 'unleash',
  'pivotal', 'groundbreaking', 'transformative', 'nuance', 'intricate',
  'unveil', 'realm', 'foster', 'embark', 'elevate'
];

const AI_FORBIDDEN_VI = [
  'tuyệt vời một cách', 'không thể phủ nhận', 'điều đáng chú ý là',
  'không thể không nhắc đến', 'phải thừa nhận rằng', 'nói không ngoa',
  'một cách đáng kinh ngạc', 'thật sự đáng kinh ngạc', 'một bước ngoặt',
  'đánh dấu một cột mốc', 'mở ra một chương mới'
];

// Markdown patterns
const MARKDOWN_PATTERNS = [
  { pattern: /^#{1,6}\s/m, name: 'header (#)' },
  { pattern: /\*\*[^*]+\*\*/g, name: 'bold (**)' },
  { pattern: /(?<!\*)\*(?!\*)[^*]+\*(?!\*)/g, name: 'italic (*)' },
  { pattern: /_{1,2}[^_]+_{1,2}/g, name: 'underscore emphasis (_)' },
  { pattern: /^---+$/m, name: 'horizontal rule (---)' },
  { pattern: /^>\s/m, name: 'blockquote (>)' },
  { pattern: /`[^`]+`/g, name: 'inline code (`)' },
  { pattern: /```[\s\S]*?```/g, name: 'code block (```)' },
  { pattern: /~~[^~]+~~/g, name: 'strikethrough (~~)' },
  { pattern: /^\s*[-*+]\s/m, name: 'bullet list' },
  { pattern: /^\s*\d+\.\s/m, name: 'numbered list' },
  { pattern: /\|.+\|.+\|/g, name: 'table' },
];

// Beat type patterns for pacing detection
const BEAT_TYPE_PATTERNS = {
  ACTION: {
    verbs: ['chém', 'đánh', 'đá', 'bắn', 'phi', 'lao', 'xông', 'vung', 'chặt', 'đâm',
            'né', 'tránh', 'nhảy', 'chạy', 'rượt', 'truy', 'đuổi', 'ném', 'phóng', 'bay',
            'tấn công', 'phản kích', 'xuất chiêu', 'vỡ', 'nổ', 'sập', 'tan', 'rung chuyển'],
    threshold: 0.15  // verbs per word
  },
  TENSION: {
    keywords: ['lo lắng', 'bất an', 'hồi hộp', 'căng thẳng', 'đe dọa', 'nguy hiểm',
              'rình rập', 'ẩn nấp', 'theo dõi', 'nghi ngờ', 'cảnh giác', 'bóng tối',
              'im lặng', 'kỳ lạ', 'khác thường', 'chờ đợi', 'nín thở'],
    threshold: 3
  },
  REVELATION: {
    keywords: ['hóa ra', 'thì ra', 'bí mật', 'sự thật', 'phát hiện', 'nhận ra', 'vỡ lẽ',
              'tiết lộ', 'lộ ra', 'bật mí', 'chân tướng', 'bí ẩn', 'giải mã', 'hiểu ra',
              'sáng tỏ', 'rõ ràng', 'không ngờ', 'bất ngờ', 'kinh ngạc'],
    threshold: 2
  },
  EMOTIONAL: {
    keywords: ['khóc', 'cười', 'nước mắt', 'đau lòng', 'xúc động', 'thương', 'nhớ',
              'buồn', 'vui', 'hạnh phúc', 'cô đơn', 'ấm áp', 'yêu', 'ghét', 'giận',
              'hối hận', 'tha thứ', 'tội lỗi', 'hy sinh', 'mất mát', 'chia ly'],
    threshold: 3
  },
  QUIET: {
    keywords: ['tĩnh lặng', 'yên bình', 'nhẹ nhàng', 'chậm rãi', 'thong thả',
              'ngồi', 'nằm', 'ngắm', 'suy nghĩ', 'hồi tưởng', 'nhớ lại', 'ngẫm',
              'thiền', 'nghỉ ngơi', 'bình yên', 'thanh thản', 'an nhiên'],
    threshold: 3
  },
  TRANSITION: {
    keywords: ['rồi', 'sau đó', 'tiếp theo', 'ngày hôm sau', 'sáng hôm sau',
              'vài ngày sau', 'một lúc sau', 'khi', 'lúc', 'đến nơi', 'rời đi',
              'trở về', 'lên đường', 'di chuyển', 'dời', 'chuyển'],
    threshold: 3
  }
};

// ─── INDIVIDUAL ANGLE SCORERS ──────────────────────────────────────────

/**
 * 3a. Prose Quality Scorer (20%)
 * - Sentence length variety
 * - Vocabulary richness
 * - Vietnamese literary words
 * - Repetition penalty
 */
function scoreProse(text, context) {
  const sentences = splitSentences(text);
  const words = splitWords(text);
  const issues = [];
  let score = 10;

  if (sentences.length === 0 || words.length === 0) {
    return { score: 0, details: 'Không có nội dung để phân tích', issues: ['empty_text'] };
  }

  // 1. Sentence length variety (std dev)
  const sentenceLengths = sentences.map(s => splitWords(s).length);
  const lengthStdDev = stdDev(sentenceLengths);
  const avgLength = sentenceLengths.reduce((a, b) => a + b, 0) / sentenceLengths.length;

  // Good variety: stdDev >= 4. Poor: < 2
  if (lengthStdDev < 2) {
    score -= 2;
    issues.push(`Câu quá đồng đều (std dev: ${lengthStdDev.toFixed(1)}) — cần xen câu ngắn/dài`);
  } else if (lengthStdDev < 3) {
    score -= 1;
    issues.push(`Nhịp câu hơi đều (std dev: ${lengthStdDev.toFixed(1)})`);
  }

  // Penalize very short or very long average
  if (avgLength < 5) {
    score -= 1;
    issues.push(`Câu trung bình quá ngắn (${avgLength.toFixed(1)} từ)`);
  } else if (avgLength > 25) {
    score -= 1;
    issues.push(`Câu trung bình quá dài (${avgLength.toFixed(1)} từ) — khó đọc`);
  }

  // 2. Vocabulary richness (unique/total)
  const lowerWords = words.map(w => w.toLowerCase());
  const uniqueWords = new Set(lowerWords);
  const vocabRichness = uniqueWords.size / lowerWords.length;

  // Good: >= 0.6. Poor: < 0.4
  if (vocabRichness < 0.35) {
    score -= 2;
    issues.push(`Từ vựng nghèo nàn (${(vocabRichness * 100).toFixed(0)}% unique)`);
  } else if (vocabRichness < 0.45) {
    score -= 1;
    issues.push(`Từ vựng khá lặp (${(vocabRichness * 100).toFixed(0)}% unique)`);
  }

  // 3. Vietnamese literary words detection
  const textLower = text.toLowerCase();
  let literaryCount = 0;
  const foundLiterary = [];
  for (const word of VIETNAMESE_LITERARY_WORDS) {
    if (textLower.includes(word)) {
      literaryCount++;
      foundLiterary.push(word);
    }
  }

  // Bonus for literary touches, penalty for complete absence
  if (literaryCount === 0) {
    score -= 1;
    issues.push('Không có từ vựng văn học / thành ngữ');
  } else if (literaryCount >= 5) {
    score = Math.min(10, score + 0.5);
  }

  // 4. Repetition penalty: same significant word (>3 chars) appearing within 3 consecutive sentences
  for (let i = 0; i < sentences.length - 2; i++) {
    const window = sentences.slice(i, i + 3).join(' ').toLowerCase();
    const windowWords = splitWords(window).filter(w => w.length > 3);
    const wordCount = {};
    for (const w of windowWords) {
      wordCount[w] = (wordCount[w] || 0) + 1;
    }
    const repeatedWords = Object.entries(wordCount)
      .filter(([_, c]) => c >= 4)
      .map(([w]) => w);
    if (repeatedWords.length > 0) {
      score -= 0.5;
      issues.push(`Lặp từ trong 3 câu liên tiếp (${i + 1}-${i + 3}): "${repeatedWords.join('", "')}"`);
    }
  }

  // 5. Compare to style profile if available
  if (context.styleProfile && context.styleProfile.avgSentenceLength) {
    const drift = Math.abs(avgLength - context.styleProfile.avgSentenceLength) / context.styleProfile.avgSentenceLength;
    if (drift > 0.3) {
      score -= 0.5;
      issues.push(`Câu lệch ${(drift * 100).toFixed(0)}% so với baseline style (${context.styleProfile.avgSentenceLength.toFixed(1)} → ${avgLength.toFixed(1)})`);
    }
  }

  score = Math.max(0, Math.min(10, score));

  const details = [
    `Sentences: ${sentences.length} | Avg length: ${avgLength.toFixed(1)} words | Std dev: ${lengthStdDev.toFixed(1)}`,
    `Vocabulary: ${uniqueWords.size}/${lowerWords.length} unique (${(vocabRichness * 100).toFixed(0)}%)`,
    `Literary touches: ${literaryCount} (${foundLiterary.slice(0, 5).join(', ')}${foundLiterary.length > 5 ? '...' : ''})`
  ].join('\n');

  return { score: Math.round(score * 10) / 10, details, issues };
}

/**
 * 3b. Consistency Scorer (20%)
 * - Character names vs Bible aliases
 * - Locations vs Bible
 * - Items vs Bible
 * - Character states (alive/dead, location)
 */
function scoreConsistency(text, context) {
  const issues = [];
  let score = 10;
  const bible = context.bible || {};

  if (!bible || (Object.keys(bible).length === 0)) {
    return { score: 10, details: 'Không có Bible data → bỏ qua consistency check', issues: [] };
  }

  const textLower = text.toLowerCase();

  // 1. Check character names and aliases
  const characters = bible.characters || {};
  for (const [charId, char] of Object.entries(characters)) {
    const name = char.name || charId;
    const aliases = [name, ...(char.aliases || [])];

    // Check if mentioned
    const mentioned = aliases.some(alias => textLower.includes(alias.toLowerCase()));
    if (!mentioned) continue;

    // Check if character is dead but appears active
    if (char.status === 'dead' || char.status === 'deceased') {
      // Check if they have dialogue or perform actions (not just mentioned in memory/thought)
      const hasDialogue = extractDialogue(text).some(d =>
        d.speaker && aliases.some(a => d.speaker.toLowerCase().includes(a.toLowerCase()))
      );
      // Check for action verbs near name
      const namePattern = aliases.map(a => escapeRegex(a)).join('|');
      const activePattern = new RegExp(`(${namePattern})\\s+(nói|hỏi|đáp|đi|chạy|đánh|cầm|lấy|mở|đóng|nhìn|quay)`, 'gi');
      const isActive = activePattern.test(text);

      if (hasDialogue || isActive) {
        score -= 3;
        issues.push(`⚠️ CRITICAL: ${name} đã chết nhưng xuất hiện hoạt động/đối thoại`);
      }
    }

    // Check wrong location
    if (char.currentLocation && context.chapterNum) {
      // Just flag for manual review if character mentions being somewhere different
      const location = char.currentLocation.toLowerCase();
      // This is a heuristic — flag if character explicitly states a contradicting location
      for (const alias of aliases) {
        const aliasLower = alias.toLowerCase();
        const locMismatch = new RegExp(`${escapeRegex(aliasLower)}[^.]*(?:đang ở|đứng tại|ngồi ở|nằm ở)\\s+([^.]+)`, 'gi');
        let m;
        while ((m = locMismatch.exec(textLower)) !== null) {
          const mentionedLoc = m[1].trim();
          if (!mentionedLoc.includes(location) && !location.includes(mentionedLoc)) {
            score -= 1;
            issues.push(`${name} Bible location: "${char.currentLocation}" nhưng text nói ở "${mentionedLoc}"`);
          }
        }
      }
    }
  }

  // 2. Check locations
  const locations = bible.locations || {};
  for (const [locId, loc] of Object.entries(locations)) {
    const locName = loc.name || locId;
    if (!textLower.includes(locName.toLowerCase())) continue;

    // Check if location has been destroyed but appears intact
    if (loc.status === 'destroyed' || loc.status === 'ruined') {
      // Check context for descriptions suggesting it's fine
      const intactPattern = new RegExp(`${escapeRegex(locName.toLowerCase())}[^.]*(?:tráng lệ|huy hoàng|nguy nga|đẹp đẽ|rực rỡ|phồn hoa)`, 'gi');
      if (intactPattern.test(textLower)) {
        score -= 2;
        issues.push(`${locName} đã bị phá huỷ nhưng được miêu tả còn nguyên vẹn`);
      }
    }
  }

  // 3. Check items
  const items = bible.items || {};
  for (const [itemId, item] of Object.entries(items)) {
    const itemName = item.name || itemId;
    if (!textLower.includes(itemName.toLowerCase())) continue;

    // Check if item has been destroyed/lost but appears
    if (item.status === 'destroyed' || item.status === 'lost') {
      const usedPattern = new RegExp(`(?:cầm|dùng|vung|sử dụng|rút)\\s+${escapeRegex(itemName.toLowerCase())}`, 'gi');
      if (usedPattern.test(textLower)) {
        score -= 2;
        issues.push(`${itemName} đã ${item.status} nhưng được sử dụng trong text`);
      }
    }

    // Check owner mismatch
    if (item.owner) {
      const ownerName = (typeof item.owner === 'string') ? item.owner : item.owner.name || '';
      if (ownerName) {
        // See if someone else is using the item
        const otherUserPattern = new RegExp(`([A-ZÀ-Ỹ][a-zà-ỹ]+(?:\\s+[A-ZÀ-Ỹ][a-zà-ỹ]+)*)\\s+(?:cầm|dùng|vung|sử dụng|rút)\\s+${escapeRegex(itemName.toLowerCase())}`, 'gi');
        let m;
        while ((m = otherUserPattern.exec(text)) !== null) {
          const user = m[1].trim();
          if (user.toLowerCase() !== ownerName.toLowerCase()) {
            score -= 1;
            issues.push(`${itemName} thuộc về ${ownerName} nhưng ${user} đang sử dụng`);
          }
        }
      }
    }
  }

  score = Math.max(0, Math.min(10, score));

  const checkedEntities = {
    characters: Object.keys(characters).length,
    locations: Object.keys(locations).length,
    items: Object.keys(items).length
  };

  const details = [
    `Bible check: ${checkedEntities.characters} characters, ${checkedEntities.locations} locations, ${checkedEntities.items} items`,
    issues.length === 0 ? '✅ Không phát hiện mâu thuẫn' : `❌ ${issues.length} vấn đề phát hiện`
  ].join('\n');

  return { score: Math.round(score * 10) / 10, details, issues };
}

/**
 * 3c. Character Voice Scorer (15%)
 * - Extract dialogue per character
 * - Check vocabulary level
 * - Check speech patterns
 * - Check voice distinctness
 */
function scoreVoice(text, context) {
  const issues = [];
  let score = 10;
  const voiceProfiles = context.voiceProfiles || {};
  const dialogues = extractDialogue(text);

  if (dialogues.length === 0) {
    return { score: 9, details: 'Không có dialogue trong beat này (narrative beat)', issues: [] };
  }

  // Group dialogues by speaker
  const bySpeaker = {};
  for (const d of dialogues) {
    const speaker = d.speaker || '__unknown__';
    if (!bySpeaker[speaker]) bySpeaker[speaker] = [];
    bySpeaker[speaker].push(d.text);
  }

  const speakers = Object.keys(bySpeaker).filter(s => s !== '__unknown__');

  // 1. Check if we can identify speakers
  const unidentified = bySpeaker['__unknown__'] || [];
  if (unidentified.length > dialogues.length * 0.5) {
    score -= 1;
    issues.push(`${unidentified.length}/${dialogues.length} câu thoại không xác định được người nói`);
  }

  // 2. Check voice profiles if available
  for (const [speaker, lines] of Object.entries(bySpeaker)) {
    if (speaker === '__unknown__') continue;

    // Find matching voice profile
    const profile = findVoiceProfile(speaker, voiceProfiles);
    if (!profile) continue;

    const allText = lines.join(' ');
    const words = splitWords(allText);

    // Check vocabulary level
    if (profile.vocabularyLevel) {
      const avgWordLength = words.reduce((s, w) => s + w.length, 0) / (words.length || 1);
      const level = profile.vocabularyLevel; // 'low', 'medium', 'high', 'scholarly'
      const expectedAvg = { low: 3, medium: 4, high: 5, scholarly: 6 };
      const expected = expectedAvg[level] || 4;
      if (Math.abs(avgWordLength - expected) > 2) {
        score -= 0.5;
        issues.push(`${speaker}: vocabulary level không khớp profile (expected: ${level})`);
      }
    }

    // Check speech patterns (catchphrases, verbal tics)
    if (profile.catchphrases && profile.catchphrases.length > 0) {
      const foundPatterns = profile.catchphrases.filter(p =>
        allText.toLowerCase().includes(p.toLowerCase())
      );
      // Not a hard penalty, but check if completely absent in long dialogue
      if (lines.length >= 3 && foundPatterns.length === 0) {
        score -= 0.5;
        issues.push(`${speaker}: không dùng catchphrase nào trong ${lines.length} câu thoại`);
      }
    }

    // Check tone
    if (profile.tone) {
      const toneChecks = {
        'formal': /(?:thưa|dạ|kính|xin|ngài|quý)/gi,
        'casual': /(?:ê|nè|hen|nha|á|ha|hả|đi|mày|tao|bọn)/gi,
        'aggressive': /(?:đồ|thằng|con|mẹ|chết|giết|phá|đập|bỏ mẹ)/gi,
        'gentle': /(?:nhẹ nhàng|dịu dàng|em|anh|chị|xin|vui lòng)/gi,
        'scholarly': /(?:theo|luận|pháp|đạo|lý|kinh|thuật|chi|hồ|vậy|thay)/gi,
      };
      const tonePattern = toneChecks[profile.tone];
      if (tonePattern) {
        const matches = allText.match(tonePattern) || [];
        if (matches.length === 0 && lines.length >= 2) {
          score -= 0.5;
          issues.push(`${speaker}: tone "${profile.tone}" không thể hiện trong thoại`);
        }
      }
    }
  }

  // 3. Voice distinctness: compare dialogue vocabulary overlap between speakers
  if (speakers.length >= 2) {
    for (let i = 0; i < speakers.length; i++) {
      for (let j = i + 1; j < speakers.length; j++) {
        const wordsA = new Set(splitWords(bySpeaker[speakers[i]].join(' ').toLowerCase()).filter(w => w.length > 2));
        const wordsB = new Set(splitWords(bySpeaker[speakers[j]].join(' ').toLowerCase()).filter(w => w.length > 2));
        if (wordsA.size < 3 || wordsB.size < 3) continue;

        const intersection = new Set([...wordsA].filter(w => wordsB.has(w)));
        const similarity = intersection.size / Math.min(wordsA.size, wordsB.size);

        if (similarity > 0.6) {
          score -= 2;
          issues.push(`${speakers[i]} & ${speakers[j]}: giọng quá giống nhau (${(similarity * 100).toFixed(0)}% overlap > 40%) — FAIL`);
        } else if (similarity > 0.4) {
          score -= 1.5;
          issues.push(`${speakers[i]} & ${speakers[j]}: giọng giống nhau (${(similarity * 100).toFixed(0)}% overlap > 40%) — FAIL`);
        }
      }
    }
  }

  score = Math.max(0, Math.min(10, score));

  const details = [
    `Dialogues: ${dialogues.length} total | Speakers identified: ${speakers.length}`,
    `Voice profiles checked: ${Object.keys(voiceProfiles).length}`,
    speakers.length > 0 ? `Speakers: ${speakers.join(', ')}` : 'Không xác định speaker'
  ].join('\n');

  return { score: Math.round(score * 10) / 10, details, issues };
}

/**
 * Find voice profile for a speaker name (fuzzy match).
 */
function findVoiceProfile(speaker, profiles) {
  if (!profiles) return null;
  const speakerLower = speaker.toLowerCase();
  for (const [key, profile] of Object.entries(profiles)) {
    const names = [key, profile.name, ...(profile.aliases || [])].filter(Boolean);
    if (names.some(n => n.toLowerCase() === speakerLower || speakerLower.includes(n.toLowerCase()))) {
      return profile;
    }
  }
  return null;
}

/**
 * 3d. Pacing Scorer (15%)
 * - Detect beat type
 * - Check position match
 * - Action density
 * - Dialogue/narrative ratio
 */
function scorePacing(text, context) {
  const issues = [];
  let score = 10;
  const sentences = splitSentences(text);
  const words = splitWords(text);
  const dialogues = extractDialogue(text);

  if (sentences.length === 0) {
    return { score: 0, details: 'Không có nội dung', issues: ['empty'] };
  }

  // 1. Detect beat type
  const typeScores = {};
  const textLower = text.toLowerCase();

  for (const [type, config] of Object.entries(BEAT_TYPE_PATTERNS)) {
    let count = 0;
    const checkList = config.verbs || config.keywords || [];
    for (const word of checkList) {
      count += countWord(textLower, word);
    }
    typeScores[type] = count;
  }

  // Find dominant type
  const sortedTypes = Object.entries(typeScores).sort((a, b) => b[1] - a[1]);
  const detectedType = sortedTypes[0][1] > 0 ? sortedTypes[0][0] : 'QUIET';

  // 2. Check if detected type matches expected
  if (context.expectedBeatType) {
    const expected = context.expectedBeatType.toUpperCase();
    if (detectedType !== expected) {
      // Partial match (e.g., EMOTIONAL when QUIET is expected is less wrong than ACTION when QUIET expected)
      const compatible = {
        'QUIET': ['EMOTIONAL', 'TRANSITION'],
        'ACTION': ['TENSION'],
        'TENSION': ['ACTION', 'REVELATION'],
        'REVELATION': ['TENSION', 'EMOTIONAL'],
        'EMOTIONAL': ['QUIET', 'REVELATION'],
        'TRANSITION': ['QUIET']
      };
      if ((compatible[expected] || []).includes(detectedType)) {
        score -= 0.5;
        issues.push(`Beat type: expected ${expected}, detected ${detectedType} (tương thích một phần)`);
      } else {
        score -= 1.5;
        issues.push(`Beat type mismatch: expected ${expected}, detected ${detectedType}`);
      }
    }
  }

  // 3. Action density (verbs per sentence)
  const actionVerbs = ['chém', 'đánh', 'đá', 'bắn', 'phi', 'lao', 'xông', 'chạy', 'nhảy',
    'né', 'vung', 'đâm', 'ném', 'phóng', 'rút', 'bắt', 'giữ', 'kéo', 'đẩy',
    'mở', 'đóng', 'cầm', 'nắm', 'buông', 'thả', 'đặt', 'lấy', 'đưa', 'nhận',
    'đi', 'đến', 'về', 'lên', 'xuống', 'vào', 'ra', 'qua', 'tới'];
  let totalVerbs = 0;
  for (const verb of actionVerbs) {
    totalVerbs += countWord(textLower, verb);
  }
  const verbDensity = totalVerbs / sentences.length;

  // For ACTION beats, density should be higher
  if (detectedType === 'ACTION' && verbDensity < 1.5) {
    score -= 0.5;
    issues.push(`Action beat nhưng verb density thấp (${verbDensity.toFixed(2)}/sentence)`);
  }
  // For QUIET beats, density should be lower
  if (detectedType === 'QUIET' && verbDensity > 3) {
    score -= 0.5;
    issues.push(`Quiet beat nhưng quá nhiều hành động (${verbDensity.toFixed(2)} verbs/sentence)`);
  }

  // 4. Dialogue/narrative ratio
  const dialogueWords = dialogues.reduce((sum, d) => sum + splitWords(d.text).length, 0);
  const dialogueRatio = words.length > 0 ? dialogueWords / words.length : 0;

  // Extreme ratios are problematic
  if (dialogueRatio > 0.8) {
    score -= 1;
    issues.push(`Quá nhiều dialogue (${(dialogueRatio * 100).toFixed(0)}%) — thiếu narrative`);
  } else if (dialogueRatio === 0 && detectedType !== 'ACTION' && detectedType !== 'TRANSITION') {
    score -= 0.5;
    issues.push('Không có dialogue — nên xen kẽ thoại để tạo nhịp');
  }

  // 5. Check flow with previous beats
  if (context.previousBeats && context.previousBeats.length > 0) {
    const prevBeat = context.previousBeats[context.previousBeats.length - 1];
    if (prevBeat && prevBeat.type === detectedType && detectedType !== 'ACTION') {
      score -= 0.5;
      issues.push(`2 beats liên tiếp cùng type (${detectedType}) — nhịp monotone`);
    }
  }

  score = Math.max(0, Math.min(10, score));

  const details = [
    `Detected type: ${detectedType} (scores: ${sortedTypes.slice(0, 3).map(([t, s]) => `${t}=${s}`).join(', ')})`,
    `Verb density: ${verbDensity.toFixed(2)}/sentence | Dialogue ratio: ${(dialogueRatio * 100).toFixed(0)}%`,
    context.expectedBeatType ? `Expected: ${context.expectedBeatType}` : 'No expected type set'
  ].join('\n');

  return { score: Math.round(score * 10) / 10, details, issues };
}

/**
 * 3e. AI Trace Scorer (10%)
 * - Forbidden words (EN + VI)
 * - Repetitive structure patterns
 * - Sycophantic tone
 */
function scoreAiTrace(text, context) {
  const issues = [];
  let score = 10;
  const textLower = text.toLowerCase();
  const sentences = splitSentences(text);

  // 1. English forbidden words
  const foundEN = [];
  for (const word of AI_FORBIDDEN_EN) {
    if (textLower.includes(word.toLowerCase())) {
      foundEN.push(word);
    }
  }
  if (foundEN.length > 0) {
    score -= Math.min(3, foundEN.length * 0.5);
    issues.push(`AI English words detected: ${foundEN.join(', ')}`);
  }

  // 2. Vietnamese forbidden phrases
  const foundVI = [];
  for (const phrase of AI_FORBIDDEN_VI) {
    if (textLower.includes(phrase.toLowerCase())) {
      foundVI.push(phrase);
    }
  }
  if (foundVI.length > 0) {
    score -= Math.min(3, foundVI.length * 1);
    issues.push(`AI Vietnamese phrases: ${foundVI.join(', ')}`);
  }

  // 3. Repetitive structure: 3+ consecutive sentences with same pattern
  // Pattern: detect if sentences start with the same structure
  if (sentences.length >= 3) {
    for (let i = 0; i <= sentences.length - 3; i++) {
      const window = sentences.slice(i, i + 3);
      
      // Check same-start pattern
      const starts = window.map(s => {
        const words = splitWords(s);
        return words.slice(0, 2).join(' ').toLowerCase();
      });
      if (starts[0] === starts[1] && starts[1] === starts[2] && starts[0].length > 0) {
        score -= 1;
        issues.push(`3 câu liên tiếp bắt đầu giống nhau (${i + 1}-${i + 3}): "${starts[0]}..."`);
      }

      // Check same-length pattern (within 2 words)
      const lengths = window.map(s => splitWords(s).length);
      if (Math.max(...lengths) - Math.min(...lengths) <= 1 && lengths[0] > 3) {
        // Could be monotonous
        score -= 0.3;
        issues.push(`3 câu liên tiếp gần cùng độ dài (${lengths.join(', ')} từ)`);
      }

      // Check same ending pattern
      const endings = window.map(s => {
        const w = splitWords(s);
        return w.length > 0 ? w[w.length - 1].toLowerCase() : '';
      });
      if (endings[0] === endings[1] && endings[1] === endings[2] && endings[0].length > 1) {
        score -= 0.5;
        issues.push(`3 câu liên tiếp kết thúc cùng từ: "${endings[0]}"`);
      }
    }
  }

  // 4. Sycophantic tone detection
  const sycophanticPatterns = [
    /thật sự rất tuyệt vời/gi,
    /một cách hoàn hảo/gi,
    /không thể tin được/gi,
    /thật là đáng kinh ngạc/gi,
    /tuyệt đối hoàn hảo/gi,
    /vô cùng ấn tượng/gi,
    /thật đáng ngưỡng mộ/gi,
    /quả thật xuất sắc/gi,
  ];
  let sycCount = 0;
  for (const pattern of sycophanticPatterns) {
    const matches = text.match(pattern);
    if (matches) sycCount += matches.length;
  }
  if (sycCount > 0) {
    score -= Math.min(2, sycCount * 0.5);
    issues.push(`Sycophantic tone: ${sycCount} pattern(s) detected`);
  }

  // 5. Detect "telling" not "showing" patterns
  const tellingPatterns = [
    /anh ấy cảm thấy (?:rất |vô cùng )/gi,
    /cô ấy cảm thấy (?:rất |vô cùng )/gi,
    /hắn cảm thấy (?:rất |vô cùng )/gi,
    /nàng cảm thấy (?:rất |vô cùng )/gi,
  ];
  let tellCount = 0;
  for (const p of tellingPatterns) {
    const m = text.match(p);
    if (m) tellCount += m.length;
  }
  if (tellCount >= 3) {
    score -= 0.5;
    issues.push(`Tell-not-show: ${tellCount} "cảm thấy rất/vô cùng" (should show emotion through action)`);
  }

  score = Math.max(0, Math.min(10, score));

  const details = [
    `AI EN words: ${foundEN.length} | AI VI phrases: ${foundVI.length}`,
    `Structure repetition issues: ${issues.filter(i => i.includes('liên tiếp')).length}`,
    `Sycophantic patterns: ${sycCount} | Tell-not-show: ${tellCount}`
  ].join('\n');

  return { score: Math.round(score * 10) / 10, details, issues };
}

/**
 * 3f. Engagement Scorer (10%)
 * - Opening hook
 * - Closing hook
 * - Tension/conflict
 * - Emotional beats
 * - Curiosity triggers
 */
function scoreEngagement(text, context) {
  const issues = [];
  let score = 10;
  const sentences = splitSentences(text);
  const textLower = text.toLowerCase();

  if (sentences.length < 2) {
    // Single sentence: still evaluate what's there, but cap at 6
    let singleScore = 5;
    const singleText = sentences[0] || '';
    if (/[?!]/.test(singleText)) singleScore += 1; // Has punch
    if (/\.{3}|…/.test(singleText)) singleScore += 0.5; // Suspense
    const sensoryCheck = ['mùi', 'tiếng', 'ánh', 'bóng', 'lạnh', 'nóng', 'đau'];
    if (sensoryCheck.some(w => singleText.toLowerCase().includes(w))) singleScore += 0.5;
    return { score: Math.min(6, singleScore), details: 'Text rất ngắn — đánh giá engagement hạn chế', issues: ['very_short_beat'] };
  }

  // 1. Opening hook strength (first 2 sentences)
  const opening = sentences.slice(0, 2).join(' ');
  let openingScore = 0;

  // Strong openers: action, dialogue, question, vivid image, in-medias-res
  if (/^[""\u201C«]/.test(opening)) openingScore += 2;  // Opens with dialogue
  if (/\?/.test(opening)) openingScore += 1.5;           // Has a question
  if (/!/.test(opening)) openingScore += 1;              // Has exclamation
  // Check for vivid/sensory opening
  const sensoryWords = ['mùi', 'tiếng', 'ánh', 'bóng', 'lạnh', 'nóng', 'đau', 'nghe', 'thấy', 'nhìn'];
  if (sensoryWords.some(w => opening.toLowerCase().includes(w))) openingScore += 1.5;
  // Short punchy opening
  if (splitWords(sentences[0]).length <= 8) openingScore += 1;

  if (openingScore < 1) {
    score -= 1.5;
    issues.push('Mở đầu yếu — thiếu hook (nên: dialogue, câu hỏi, hành động, hình ảnh sống động)');
  } else if (openingScore < 2) {
    score -= 0.5;
    issues.push('Mở đầu tạm — có thể mạnh hơn');
  }

  // 2. Closing hook strength (last 2 sentences)
  const closing = sentences.slice(-2).join(' ');
  let closingScore = 0;

  if (/\?/.test(closing)) closingScore += 2;       // Ends with question/mystery
  if (/\.{3}|…/.test(closing)) closingScore += 1.5; // Ends with ellipsis (suspense)
  if (/!/.test(closing)) closingScore += 1;          // Ends with exclamation
  // Check for forward momentum words
  const momentumWords = ['nhưng', 'tuy nhiên', 'bất ngờ', 'đột nhiên', 'chưa kịp', 'vừa lúc', 'không ngờ'];
  if (momentumWords.some(w => closing.toLowerCase().includes(w))) closingScore += 1.5;

  if (closingScore < 1) {
    score -= 1.5;
    issues.push('Kết yếu — không có hook (nên: cliffhanger, câu hỏi, suspense, twist)');
  } else if (closingScore < 2) {
    score -= 0.5;
    issues.push('Kết tạm — thiếu sức hút tiếp tục đọc');
  }

  // 3. Tension/conflict presence
  const conflictWords = ['nhưng', 'tuy nhiên', 'mặc dù', 'không', 'đối đầu', 'xung đột',
    'tranh', 'cãi', 'giận', 'tức', 'oán', 'thù', 'phản', 'chống', 'đe dọa',
    'nguy hiểm', 'khó khăn', 'thách thức', 'trở ngại', 'cản', 'ngăn'];
  let conflictCount = 0;
  for (const w of conflictWords) {
    conflictCount += countWord(textLower, w);
  }

  if (conflictCount === 0) {
    score -= 1;
    issues.push('Không có tension/conflict — beat thiếu xung đột');
  }

  // 4. Emotional beats presence
  const emotionWords = ['khóc', 'cười', 'buồn', 'vui', 'sợ', 'giận', 'yêu', 'thương',
    'nhớ', 'đau', 'xúc động', 'nước mắt', 'tim đập', 'run', 'lặng',
    'nghẹn', 'thở dài', 'bàng hoàng', 'choáng', 'sững'];
  let emotionCount = 0;
  for (const w of emotionWords) {
    emotionCount += countWord(textLower, w);
  }

  if (emotionCount === 0) {
    score -= 0.5;
    issues.push('Thiếu emotional beat — nên thêm phản ứng cảm xúc');
  }

  // 5. Curiosity triggers
  const curiosityWords = ['bí mật', 'ai', 'tại sao', 'vì sao', 'thế nào', 'là gì',
    'liệu', 'nếu', 'rốt cuộc', 'hóa ra', 'lạ', 'kỳ lạ', 'bất thường'];
  let curiosityCount = 0;
  for (const w of curiosityWords) {
    curiosityCount += countWord(textLower, w);
  }

  if (curiosityCount === 0) {
    score -= 0.5;
    issues.push('Thiếu curiosity trigger — nên đặt câu hỏi hoặc mystery');
  }

  score = Math.max(0, Math.min(10, score));

  const details = [
    `Opening hook: ${openingScore.toFixed(1)}/5 | Closing hook: ${closingScore.toFixed(1)}/5`,
    `Conflict signals: ${conflictCount} | Emotion signals: ${emotionCount} | Curiosity triggers: ${curiosityCount}`
  ].join('\n');

  return { score: Math.round(score * 10) / 10, details, issues };
}

/**
 * 3g. Markdown & Format Scorer (10%)
 * - Detect markdown chars
 * - Detect em dash
 * - Detect bullets, lists, tables
 * - Detect code blocks
 */
function scoreFormat(text, context) {
  const issues = [];
  let score = 10;

  if (!text || text.trim().length === 0) {
    return { score: 0, details: 'Không có nội dung', issues: ['empty'] };
  }

  // 1. Check all markdown patterns
  let totalMarkdown = 0;
  for (const { pattern, name } of MARKDOWN_PATTERNS) {
    const matches = text.match(pattern);
    if (matches && matches.length > 0) {
      totalMarkdown += matches.length;
      score -= Math.min(2, matches.length * 0.5);
      issues.push(`Markdown detected: ${name} (${matches.length} lần)`);
    }
  }

  // 2. Em dash detection (—)
  const emDashCount = (text.match(/—/g) || []).length;
  if (emDashCount > 0) {
    score -= Math.min(2, emDashCount * 0.3);
    issues.push(`Dấu gạch dài (—): ${emDashCount} lần — nên thay bằng dấu phẩy, chấm, hoặc viết lại câu`);
  }

  // 3. En dash detection (–) — less serious but still unwanted
  const enDashCount = (text.match(/–/g) || []).length;
  if (enDashCount > 0) {
    score -= Math.min(1, enDashCount * 0.2);
    issues.push(`Dấu gạch ngang (–): ${enDashCount} lần`);
  }

  // 4. Check for any remaining structural artifacts
  // Numbered section headers like "1." at start of line (not dialogue)
  const numberedHeaders = text.match(/^\d+\.\s+[A-ZÀ-Ỹ]/gm);
  if (numberedHeaders) {
    score -= 1;
    issues.push(`Numbered headers detected: ${numberedHeaders.length}`);
  }

  // Check for markdown-style links [text](url)
  const links = text.match(/\[([^\]]+)\]\([^)]+\)/g);
  if (links) {
    score -= 1;
    issues.push(`Markdown links detected: ${links.length}`);
  }

  // 5. Word count check (beat should be 400-600 words)
  const words = splitWords(text);
  if (words.length < 350) {
    score -= 1;
    issues.push(`Beat quá ngắn: ${words.length} từ (yêu cầu 400-600)`);
  } else if (words.length > 650) {
    score -= 0.5;
    issues.push(`Beat hơi dài: ${words.length} từ (yêu cầu 400-600)`);
  }

  score = Math.max(0, Math.min(10, score));

  const details = [
    `Markdown violations: ${totalMarkdown} | Em dashes: ${emDashCount} | En dashes: ${enDashCount}`,
    `Word count: ${words.length} (target: 400-600)`,
    totalMarkdown === 0 && emDashCount === 0 ? '✅ Clean prose format' : '❌ Cần clean markdown/format'
  ].join('\n');

  return { score: Math.round(score * 10) / 10, details, issues };
}

// ─── SCORER MAP ────────────────────────────────────────────────────────

const SCORERS = {
  prose: scoreProse,
  consistency: scoreConsistency,
  voice: scoreVoice,
  pacing: scorePacing,
  ai_trace: scoreAiTrace,
  engagement: scoreEngagement,
  format: scoreFormat
};

// ─── MAIN CLASS ────────────────────────────────────────────────────────

export class ScoringEngine {
  /**
   * @param {Object} config
   * @param {number} config.passThreshold - Minimum weighted score to pass (default: 9)
   * @param {Object} config.weights - Override angle weights { [angleId]: number }
   * @param {number} config.finalStricterBy - How much stricter final scoring is (default: 0.3)
   */
  constructor(config = {}) {
    this.passThreshold = config.passThreshold ?? 9;
    this.finalStricterBy = config.finalStricterBy ?? 0.3;

    // Build effective weights (merge defaults with overrides)
    this.weights = {};
    for (const angle of ANGLES) {
      this.weights[angle.id] = config.weights?.[angle.id] ?? angle.weight;
    }

    // Normalize weights to sum to 1
    const totalWeight = Object.values(this.weights).reduce((a, b) => a + b, 0);
    if (Math.abs(totalWeight - 1) > 0.001) {
      for (const id of Object.keys(this.weights)) {
        this.weights[id] /= totalWeight;
      }
    }
  }

  /**
   * Score a single angle.
   * @param {string} angleId - One of: prose, consistency, voice, pacing, ai_trace, engagement, format
   * @param {string} text - The prose text to score
   * @param {Object} context - Context object (bible, voiceProfiles, etc.)
   * @returns {{ score: number, details: string, issues: string[] }}
   */
  scoreAngle(angleId, text, context = {}) {
    const scorer = SCORERS[angleId];
    if (!scorer) {
      throw new Error(`Unknown angle: "${angleId}". Valid: ${Object.keys(SCORERS).join(', ')}`);
    }
    return scorer(text, context);
  }

  /**
   * Score all 7 angles for a beat.
   * @param {string} text - The prose text
   * @param {Object} context - Context object
   * @returns {{ angles: Object, weighted: number, passed: boolean, summary: string }}
   */
  scoreAll(text, context = {}) {
    const angles = {};
    let weightedSum = 0;

    for (const angle of ANGLES) {
      const result = this.scoreAngle(angle.id, text, context);
      angles[angle.id] = result;
      weightedSum += result.score * this.weights[angle.id];
    }

    const weighted = Math.round(weightedSum * 100) / 100;
    const passed = weighted >= this.passThreshold;

    // Build summary
    const lines = [];
    lines.push(`📊 SCORE: ${weighted.toFixed(2)}/10 ${passed ? '✅ PASS' : '❌ FAIL'} (threshold: ${this.passThreshold})`);
    lines.push('');

    for (const angle of ANGLES) {
      const r = angles[angle.id];
      const bar = scoreBar(r.score);
      lines.push(`${bar} ${angle.name}: ${r.score}/10 (×${(this.weights[angle.id] * 100).toFixed(0)}%)`);
      if (r.issues.length > 0) {
        for (const issue of r.issues.slice(0, 3)) {
          lines.push(`    ⚠️ ${issue}`);
        }
        if (r.issues.length > 3) {
          lines.push(`    ... và ${r.issues.length - 3} issues khác`);
        }
      }
    }

    return { angles, weighted, passed, summary: lines.join('\n') };
  }

  /**
   * Compare 3 versions → recommend best or combine.
   * @param {string[]} versions - Array of 3 text versions
   * @param {Object} context - Context object
   * @returns {Object} Comparison result
   */
  compareVersions(versions, context = {}) {
    if (!versions || versions.length === 0) {
      throw new Error('At least 1 version required');
    }

    const scores = versions.map((text, i) => {
      const result = this.scoreAll(text, context);
      return {
        version: i + 1,
        angles: result.angles,
        weighted: result.weighted,
        passed: result.passed
      };
    });

    // Sort by weighted score
    const sorted = [...scores].sort((a, b) => b.weighted - a.weighted);
    const best = sorted[0];
    const secondBest = sorted[1] || null;

    // Decision logic
    let recommendation = 'pick';
    let bestVersion = best.version;
    let combineStrategy = null;

    if (secondBest) {
      const gap = best.weighted - secondBest.weighted;

      if (gap >= 0.5) {
        // Clear winner
        recommendation = 'pick';
        bestVersion = best.version;
      } else {
        // Close scores — check if different versions excel at different things
        const angleWinners = {};
        for (const angle of ANGLES) {
          let maxScore = -1;
          let winner = 0;
          for (const s of scores) {
            if (s.angles[angle.id].score > maxScore) {
              maxScore = s.angles[angle.id].score;
              winner = s.version;
            }
          }
          angleWinners[angle.id] = winner;
        }

        // If different versions win different angles, suggest combine
        const uniqueWinners = new Set(Object.values(angleWinners));
        if (uniqueWinners.size >= 2) {
          recommendation = 'combine';
          bestVersion = null;

          // Build combine strategy
          const strategy = [];
          const byVersion = {};
          for (const [angleId, winner] of Object.entries(angleWinners)) {
            if (!byVersion[winner]) byVersion[winner] = [];
            byVersion[winner].push(ANGLES.find(a => a.id === angleId).name);
          }
          for (const [ver, angles] of Object.entries(byVersion)) {
            strategy.push(`Version ${ver}: ${angles.join(', ')}`);
          }
          combineStrategy = strategy.join(' | ');
        } else {
          recommendation = 'pick';
          bestVersion = best.version;
        }
      }
    }

    // Build analysis
    const analysisLines = [];
    analysisLines.push('📊 VERSION COMPARISON');
    analysisLines.push('');
    for (const s of scores) {
      analysisLines.push(`Version ${s.version}: ${s.weighted.toFixed(2)}/10 ${s.passed ? '✅' : '❌'}`);
      // Show top 2 strengths and top 2 weaknesses
      const sortedAngles = ANGLES.map(a => ({ ...a, score: s.angles[a.id].score }))
        .sort((a, b) => b.score - a.score);
      const strengths = sortedAngles.slice(0, 2).map(a => `${a.name}=${a.score}`);
      const weaknesses = sortedAngles.slice(-2).map(a => `${a.name}=${a.score}`);
      analysisLines.push(`  💪 ${strengths.join(', ')} | 📉 ${weaknesses.join(', ')}`);
    }
    analysisLines.push('');
    analysisLines.push(`→ Recommendation: ${recommendation.toUpperCase()}`);
    if (bestVersion) analysisLines.push(`→ Best: Version ${bestVersion}`);
    if (combineStrategy) analysisLines.push(`→ Strategy: ${combineStrategy}`);

    return {
      scores,
      recommendation,
      bestVersion,
      combineStrategy,
      analysis: analysisLines.join('\n')
    };
  }

  /**
   * Score final version (stricter thresholds).
   * After combine/pick, this is the definitive scoring.
   * Penalties are amplified by finalStricterBy factor.
   * @param {string} text - Final text
   * @param {Object} context - Context object
   * @returns {Object} Same shape as scoreAll
   */
  scoreFinal(text, context = {}) {
    const base = this.scoreAll(text, context);

    // Apply stricter scoring: each issue causes slightly more penalty
    const stricterAngles = {};
    let weightedSum = 0;

    for (const angle of ANGLES) {
      const baseResult = base.angles[angle.id];
      const issueCount = baseResult.issues.length;

      // Additional penalty for final: each issue deducts extra
      const extraPenalty = issueCount * this.finalStricterBy;
      const stricterScore = Math.max(0, Math.min(10, baseResult.score - extraPenalty));

      stricterAngles[angle.id] = {
        score: Math.round(stricterScore * 10) / 10,
        details: baseResult.details + (extraPenalty > 0 ? `\n[FINAL] Extra penalty: -${extraPenalty.toFixed(1)} (${issueCount} issues × ${this.finalStricterBy})` : ''),
        issues: baseResult.issues
      };

      weightedSum += stricterScore * this.weights[angle.id];
    }

    const weighted = Math.round(weightedSum * 100) / 100;
    const passed = weighted >= this.passThreshold;

    // Build summary
    const lines = [];
    lines.push(`🔬 FINAL SCORE: ${weighted.toFixed(2)}/10 ${passed ? '✅ PASS' : '❌ FAIL'} (threshold: ${this.passThreshold}, STRICT mode)`);
    lines.push('');

    for (const angle of ANGLES) {
      const r = stricterAngles[angle.id];
      const baseScore = base.angles[angle.id].score;
      const bar = scoreBar(r.score);
      const diff = r.score < baseScore ? ` (base: ${baseScore})` : '';
      lines.push(`${bar} ${angle.name}: ${r.score}/10${diff} (×${(this.weights[angle.id] * 100).toFixed(0)}%)`);
      if (r.issues.length > 0) {
        for (const issue of r.issues.slice(0, 3)) {
          lines.push(`    ⚠️ ${issue}`);
        }
        if (r.issues.length > 3) {
          lines.push(`    ... và ${r.issues.length - 3} issues khác`);
        }
      }
    }

    return { angles: stricterAngles, weighted, passed, summary: lines.join('\n') };
  }

  /**
   * Generate a full markdown report from a scoreAll/scoreFinal result.
   * @param {Object} scoreResult - Output from scoreAll() or scoreFinal()
   * @returns {string} Markdown formatted report
   */
  generateReport(scoreResult) {
    const lines = [];

    lines.push('# 📊 Beat Scoring Report');
    lines.push('');
    lines.push(`**Overall: ${scoreResult.weighted.toFixed(2)}/10** ${scoreResult.passed ? '✅ PASSED' : '❌ FAILED'}`);
    lines.push('');
    lines.push('---');
    lines.push('');

    for (const angle of ANGLES) {
      const r = scoreResult.angles[angle.id];
      if (!r) continue;

      lines.push(`## ${angle.name} — ${r.score}/10 (weight: ${(this.weights[angle.id] * 100).toFixed(0)}%)`);
      lines.push('');
      lines.push(`> ${angle.description}`);
      lines.push('');
      
      // Details
      if (r.details) {
        lines.push('**Analysis:**');
        for (const line of r.details.split('\n')) {
          lines.push(`- ${line}`);
        }
        lines.push('');
      }

      // Issues
      if (r.issues.length > 0) {
        lines.push('**Issues:**');
        for (const issue of r.issues) {
          lines.push(`- ⚠️ ${issue}`);
        }
        lines.push('');
      } else {
        lines.push('✅ No issues detected');
        lines.push('');
      }
    }

    lines.push('---');
    lines.push('');
    lines.push(`**Weighted Score: ${scoreResult.weighted.toFixed(2)}/10**`);
    lines.push(`**Status: ${scoreResult.passed ? 'PASS ✅' : 'FAIL ❌ — revise required'}**`);

    return lines.join('\n');
  }

  /**
   * Generate comparison report for multiple versions.
   * @param {Object} compareResult - Output from compareVersions()
   * @returns {string} Markdown formatted comparison
   */
  generateComparison(compareResult) {
    const lines = [];

    lines.push('# 📊 Version Comparison Report');
    lines.push('');

    // Summary table
    lines.push('| Angle | ' + compareResult.scores.map(s => `V${s.version}`).join(' | ') + ' |');
    lines.push('|-------|' + compareResult.scores.map(() => '------').join('|') + '|');

    for (const angle of ANGLES) {
      const cells = compareResult.scores.map(s => {
        const score = s.angles[angle.id].score;
        // Find best score for this angle
        const maxScore = Math.max(...compareResult.scores.map(ss => ss.angles[angle.id].score));
        const marker = score === maxScore ? ' 🏆' : '';
        return `${score}${marker}`;
      });
      lines.push(`| ${angle.name} | ${cells.join(' | ')} |`);
    }

    lines.push('| **WEIGHTED** | ' + compareResult.scores.map(s => `**${s.weighted.toFixed(2)}**`).join(' | ') + ' |');
    lines.push('');

    // Recommendation
    lines.push('---');
    lines.push('');
    lines.push(`## Recommendation: **${compareResult.recommendation.toUpperCase()}**`);
    if (compareResult.bestVersion) {
      lines.push(`Best version: **#${compareResult.bestVersion}**`);
    }
    if (compareResult.combineStrategy) {
      lines.push(`Combine strategy: ${compareResult.combineStrategy}`);
    }
    lines.push('');

    // Per-version details
    for (const s of compareResult.scores) {
      lines.push(`### Version ${s.version} (${s.weighted.toFixed(2)}/10)`);
      lines.push('');
      for (const angle of ANGLES) {
        const r = s.angles[angle.id];
        if (r.issues.length > 0) {
          lines.push(`- **${angle.name}** (${r.score}/10): ${r.issues.slice(0, 2).join('; ')}`);
        }
      }
      lines.push('');
    }

    return lines.join('\n');
  }
}

// ─── HELPERS ───────────────────────────────────────────────────────────

/**
 * Visual score bar for summaries.
 */
function scoreBar(score) {
  const filled = Math.round(score);
  const empty = 10 - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}
