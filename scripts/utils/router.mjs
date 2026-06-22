/**
 * Router — Intent Detection & Module Dispatch for Novel Master V2.1
 * 
 * Detects user intent from Vietnamese + English messages and routes
 * to the correct module(s) for execution.
 * 
 * Pure Node.js ESM, zero dependencies.
 */

// ─── Pattern Definitions (Vietnamese + English) ────────────────────────────

export const PATTERNS = [
  // Forge/Write
  {
    patterns: [
      /viết chương\s*(\d+)/i,
      /forge ch(?:ương)?\s*(\d+)/i,
      /write chapter\s*(\d+)/i,
      /soạn tiếp/i,
      /continue(?:\s+the)?\s+(?:novel|story|writing)/i,
      /continue\b/i,
      /forge next/i,
    ],
    intent: 'forge_chapter',
    phase: 'P2',
    modules: ['bible', 'pacing', 'orchestrator'],
    extract: (match) => {
      for (const m of match) {
        if (m && m[1]) return { chapter: parseInt(m[1], 10) };
      }
      return {};
    },
  },

  // Forge Beat (specific)
  // English: "forge beat <ch> <beat>" → chapter first, beat second
  // Vietnamese: "viết beat <beat> chương <ch>" → beat first, chapter second
  {
    patterns: [
      /forge beat\s*(\d+)\s+(\d+)/i,
      /viết beat\s*(\d+)\s+(?:chương|ch)\s*(\d+)/i,
    ],
    intent: 'forge_beat',
    phase: 'P3',
    modules: ['bible', 'pacing', 'orchestrator', 'scoring'],
    extract: (match) => {
      // match[0] = English regex result, match[1] = Vietnamese regex result
      // English: m[1]=ch, m[2]=beat → { chapter: m[1], beat: m[2] }
      // Vietnamese: m[1]=beat, m[2]=ch → { chapter: m[2], beat: m[1] }
      if (match[0] && match[0][1] && match[0][2]) {
        return { chapter: parseInt(match[0][1], 10), beat: parseInt(match[0][2], 10) };
      }
      if (match[1] && match[1][1] && match[1][2]) {
        return { chapter: parseInt(match[1][2], 10), beat: parseInt(match[1][1], 10) };
      }
      return {};
    },
  },

  // Plan
  {
    patterns: [
      /(?:tạo\s+|plan\s+|brainstorm\s+)outline/i,
      /plan arc\s*(\d+)/i,
      /outline arc\s*(\d+)?/i,
      /brainstorm arc\s*(\d+)?/i,
    ],
    intent: 'plan_arc',
    phase: 'P1',
    modules: ['orchestrator'],
    extract: (match) => {
      for (const m of match) {
        if (m && m[1]) return { arc: parseInt(m[1], 10) };
      }
      return {};
    },
  },

  // Check/Scan
  {
    patterns: [
      /scan ch(?:ương)?\s*(\d+)?/i,
      /kiểm tra mâu thuẫn/i,
      /check continuity/i,
      /plot\s*hole/i,
      /scan[-\s]all/i,
      /scan[-\s]range/i,
    ],
    intent: 'scan',
    phase: 'P4',
    modules: ['continuity', 'prose', 'voice'],
    extract: (match) => {
      for (const m of match) {
        if (m && m[1]) return { chapter: parseInt(m[1], 10) };
      }
      return {};
    },
  },

  // Style/Prose
  {
    patterns: [
      /(?:phân tích|check|kiểm tra)\s+(?:văn phong|style|prose)/i,
      /style drift/i,
      /AI trace/i,
      /prose\s+(?:check|analysis|baseline)/i,
    ],
    intent: 'prose_check',
    phase: 'P4',
    modules: ['prose'],
  },

  // Pacing
  {
    patterns: [
      /(?:nhịp|pacing|tension|beat)\s+(?:check|curve|report|suggest)/i,
      /(?:nhịp|pacing)\s+(?:truyện|chương|arc)/i,
      /tension\s+curve/i,
      /(?:hơi\s+)?chậm\s+(?:quá|rồi)/i,
      /(?:hơi\s+)?nhanh\s+(?:quá|rồi)/i,
      /pace\s+(?:record|curve|suggest|report)/i,
    ],
    intent: 'pacing',
    phase: 'P4',
    modules: ['pacing'],
  },

  // Voice
  {
    patterns: [
      /(?:giọng|voice|dialogue)\s+(?:check|compare|report)/i,
      /nhân vật.*nói/i,
      /voice\s+(?:consistency|differentiation)/i,
      /character\s+voice/i,
    ],
    intent: 'voice_check',
    phase: 'P4',
    modules: ['voice'],
  },

  // Bible
  {
    patterns: [
      /bible\s+(?:init|add|show|list|update|snapshot|diff|export)/i,
      /bible/i,
      /nhân vật\s+(?:mới|thêm|xem|cập nhật)/i,
      /character\s+(?:add|show|list|profile)/i,
      /thế giới\s+(?:xem|cập nhật)/i,
      /world\s+(?:bible|building)/i,
      /location\s+(?:add|show|list)/i,
      /item\s+(?:add|show|list)/i,
    ],
    intent: 'bible',
    phase: 'P0',
    modules: ['bible'],
  },

  // Pipeline
  {
    patterns: [
      /pipeline\s+(?:status|advance|reset)/i,
      /pipeline/i,
    ],
    intent: 'pipeline',
    phase: null,
    modules: ['orchestrator'],
  },

  // Score
  {
    patterns: [
      /score\s+(?:beat|compare)/i,
      /chấm điểm/i,
      /thẩm định/i,
    ],
    intent: 'score',
    phase: 'P3',
    modules: ['scoring'],
  },

  // Review
  {
    patterns: [
      /review arc\s*(\d+)?/i,
      /phê bình\s+(?:arc|chương)/i,
      /arc review/i,
    ],
    intent: 'arc_review',
    phase: 'P7',
    modules: ['continuity', 'prose', 'pacing', 'voice'],
    extract: (match) => {
      for (const m of match) {
        if (m && m[1]) return { arc: parseInt(m[1], 10) };
      }
      return {};
    },
  },

  // Edit
  {
    patterns: [
      /biên tập\s+(?:toàn bộ|tất cả|all)/i,
      /biên tập/i,
      /edit all/i,
      /rà soát\s+(?:toàn bộ|tất cả)/i,
      /rà soát/i,
    ],
    intent: 'full_edit',
    phase: 'P8',
    modules: ['continuity', 'prose', 'pacing', 'voice'],
  },

  // Export
  {
    patterns: [
      /xuất epub/i,
      /export\s+(?:book|epub|pdf|html)/i,
      /phát hành/i,
      /publish\s+(?:epub|pdf|html|all|audiobook)/i,
      /publish/i,
      /audiobook/i,
    ],
    intent: 'export',
    phase: 'P9',
    modules: ['publish'],
  },

  // Status
  {
    patterns: [
      /truyện tới đâu/i,
      /tiến độ/i,
      /progress/i,
      /status/i,
      /tới đâu rồi/i,
    ],
    intent: 'status',
    phase: null,
    modules: ['orchestrator'],
  },

  // Issues
  {
    patterns: [
      /mâu thuẫn/i,
      /plot\s*hole/i,
      /hơi chậm/i,
      /inconsisten/i,
      /contradiction/i,
    ],
    intent: 'issue',
    phase: 'P4',
    modules: ['continuity'],
  },
];

// ─── Pre-defined Operation Combos ──────────────────────────────────────────

export const OPERATIONS = {
  'pre-forge': ['bible', 'pacing'],
  'post-forge-guard': ['continuity', 'prose', 'pacing', 'voice'],
  'full-scan': ['continuity', 'prose', 'pacing', 'voice'],
  'quick-check': ['continuity'],
  'arc-review': ['continuity', 'prose', 'pacing', 'voice'],
  'setup': ['bible'],
};

// ─── Router Class ──────────────────────────────────────────────────────────

export class Router {
  /**
   * @param {Object} modules - Map of module name → module instance
   *   { bible, continuity, prose, pacing, voice, publish, orchestrator, scoring }
   */
  constructor(modules = {}) {
    this.modules = modules;
  }

  /**
   * Detect user intent from a free-text message (Vietnamese + English).
   * 
   * @param {string} message - User message
   * @returns {{ intent: string, phase: string|null, modules: string[], params: object, confidence: number, raw: string }}
   */
  detectIntent(message) {
    if (!message || typeof message !== 'string') {
      return {
        intent: 'unknown',
        phase: null,
        modules: [],
        params: {},
        confidence: 0,
        raw: message || '',
      };
    }

    const trimmed = message.trim();
    let bestMatch = null;
    let bestConfidence = 0;
    let bestParams = {};

    for (const patternDef of PATTERNS) {
      const matches = [];
      let matchCount = 0;

      for (const regex of patternDef.patterns) {
        const m = trimmed.match(regex);
        matches.push(m);
        if (m) matchCount++;
      }

      if (matchCount === 0) continue;

      // Confidence: based on how many patterns matched + specificity
      // Single match = 0.6 base, each additional match adds 0.1, cap at 1.0
      let confidence = 0.6 + (matchCount - 1) * 0.1;

      // Boost confidence for longer, more specific matches
      for (const m of matches) {
        if (m && m[0]) {
          const matchRatio = m[0].length / trimmed.length;
          if (matchRatio > 0.5) confidence += 0.15;
          else if (matchRatio > 0.3) confidence += 0.05;
        }
      }

      confidence = Math.min(confidence, 1.0);

      // Extract params if extractor is defined
      let params = {};
      if (patternDef.extract) {
        params = patternDef.extract(matches) || {};
      }

      if (confidence > bestConfidence) {
        bestConfidence = confidence;
        bestMatch = patternDef;
        bestParams = params;
      }
    }

    if (!bestMatch) {
      return {
        intent: 'unknown',
        phase: null,
        modules: [],
        params: {},
        confidence: 0,
        raw: trimmed,
      };
    }

    return {
      intent: bestMatch.intent,
      phase: bestMatch.phase,
      modules: [...bestMatch.modules],
      params: bestParams,
      confidence: Math.round(bestConfidence * 100) / 100,
      raw: trimmed,
    };
  }

  /**
   * Route a message to the correct module(s) and execute.
   * 
   * @param {string} message - User message
   * @param {string} projectSlug - Project slug for data directory
   * @returns {{ intent: object, results: object[], summary: string }}
   */
  async route(message, projectSlug = 'default-project') {
    const intent = this.detectIntent(message);
    const results = [];

    if (intent.intent === 'unknown') {
      return {
        intent,
        results: [],
        summary: `❓ Could not determine intent from: "${message}". Try more specific commands like "viết chương 1", "scan chương", "bible show", etc.`,
      };
    }

    // Execute each module in the intent's module list
    for (const moduleName of intent.modules) {
      const mod = this.modules[moduleName];
      if (!mod) {
        results.push({
          module: moduleName,
          status: 'skipped',
          reason: `Module "${moduleName}" not loaded`,
        });
        continue;
      }

      try {
        const result = await this._executeModule(mod, moduleName, intent, projectSlug);
        results.push({
          module: moduleName,
          status: 'ok',
          data: result,
        });
      } catch (err) {
        results.push({
          module: moduleName,
          status: 'error',
          error: err.message,
        });
      }
    }

    // Build summary
    const okCount = results.filter(r => r.status === 'ok').length;
    const errCount = results.filter(r => r.status === 'error').length;
    const skipCount = results.filter(r => r.status === 'skipped').length;

    const parts = [];
    parts.push(`🎯 Intent: ${intent.intent} (${(intent.confidence * 100).toFixed(0)}% confidence)`);
    if (intent.phase) parts.push(`📍 Phase: ${intent.phase}`);
    parts.push(`📦 Modules: ${intent.modules.join(', ')}`);
    if (Object.keys(intent.params).length > 0) {
      parts.push(`🔧 Params: ${JSON.stringify(intent.params)}`);
    }
    parts.push(`✅ OK: ${okCount} | ❌ Error: ${errCount} | ⏭️ Skipped: ${skipCount}`);

    return {
      intent,
      results,
      summary: parts.join('\n'),
    };
  }

  /**
   * Execute a specific pre-defined operation combo.
   * 
   * @param {string} operation - One of OPERATIONS keys
   * @param {string} projectSlug 
   * @param {object} params - Additional params to pass
   * @returns {{ operation: string, results: object[], summary: string }}
   */
  async runOperation(operation, projectSlug = 'default-project', params = {}) {
    const moduleNames = OPERATIONS[operation];
    if (!moduleNames) {
      return {
        operation,
        results: [],
        summary: `❌ Unknown operation: "${operation}". Available: ${Object.keys(OPERATIONS).join(', ')}`,
      };
    }

    const results = [];
    for (const moduleName of moduleNames) {
      const mod = this.modules[moduleName];
      if (!mod) {
        results.push({ module: moduleName, status: 'skipped', reason: 'Not loaded' });
        continue;
      }

      try {
        const result = await this._executeModule(mod, moduleName, { intent: operation, params }, projectSlug);
        results.push({ module: moduleName, status: 'ok', data: result });
      } catch (err) {
        results.push({ module: moduleName, status: 'error', error: err.message });
      }
    }

    const okCount = results.filter(r => r.status === 'ok').length;
    const total = moduleNames.length;

    return {
      operation,
      results,
      summary: `⚙️ Operation "${operation}": ${okCount}/${total} modules completed`,
    };
  }

  /**
   * Execute a single module based on intent.
   * Delegates to the module's known methods based on the intent type.
   * 
   * @private
   */
  async _executeModule(mod, moduleName, intent, projectSlug) {
    // Each module has different entry points.
    // This provides a best-effort dispatch — modules that don't match
    // get a generic "info" call.
    const params = intent.params || {};

    switch (moduleName) {
      case 'bible': {
        if (params.chapter) {
          // Pre-forge: take a snapshot
          if (typeof mod.snapshot === 'function') {
            return mod.snapshot(params.chapter);
          }
        }
        if (typeof mod.list === 'function') {
          return mod.list('character');
        }
        return { info: 'Bible module invoked', params };
      }

      case 'continuity': {
        if (params.chapter && typeof mod.scan === 'function') {
          return mod.scan(params.chapter);
        }
        return { info: 'Continuity module invoked', params };
      }

      case 'prose': {
        if (params.chapter && typeof mod.check === 'function') {
          return mod.check(params.chapter);
        }
        return { info: 'Prose module invoked', params };
      }

      case 'pacing': {
        if (params.chapter && typeof mod.suggest === 'function') {
          return mod.suggest(params.chapter);
        }
        if (typeof mod.report === 'function') {
          return mod.report();
        }
        return { info: 'Pacing module invoked', params };
      }

      case 'voice': {
        if (params.chapter && typeof mod.check === 'function') {
          return mod.check(params.chapter);
        }
        if (typeof mod.report === 'function') {
          return mod.report();
        }
        return { info: 'Voice module invoked', params };
      }

      case 'publish': {
        return { info: 'Publish module invoked — use CLI for actual publishing', params };
      }

      case 'orchestrator': {
        if (intent.intent === 'status' && typeof mod.status === 'function') {
          return mod.status(projectSlug);
        }
        if (intent.intent === 'forge_chapter' && typeof mod.forgeChapter === 'function') {
          return await mod.forgeChapter(params.chapter, projectSlug);
        }
        if (intent.intent === 'forge_beat' && typeof mod.forgeBeat === 'function') {
          return await mod.forgeBeat(params.chapter, params.beat, projectSlug);
        }
        if (intent.intent === 'plan_arc' && typeof mod.planArc === 'function') {
          return await mod.planArc(params.arc, projectSlug);
        }
        if (intent.intent === 'pipeline') {
          if (typeof mod.status === 'function') return mod.status(projectSlug);
        }
        return { info: 'Orchestrator module invoked', params };
      }

      case 'scoring': {
        return { info: 'Scoring module invoked — use CLI for beat scoring', params };
      }

      default:
        return { info: `Module "${moduleName}" invoked (no specific dispatch)`, params };
    }
  }

  /**
   * Get a list of all supported intents with their descriptions.
   * Useful for help / debug.
   */
  listIntents() {
    const intents = [];
    const seen = new Set();
    for (const p of PATTERNS) {
      if (seen.has(p.intent)) continue;
      seen.add(p.intent);
      intents.push({
        intent: p.intent,
        phase: p.phase,
        modules: p.modules,
        patternCount: p.patterns.length,
      });
    }
    return intents;
  }
}

export default Router;
