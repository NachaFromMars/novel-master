/**
 * Pipeline Orchestrator — Novel Master V2.1 Module B
 * 
 * 10-Phase state machine coordinating the full novel forge pipeline.
 * 3-Version Beat Forge with 7-angle review, retry/escalation,
 * intent detection, prerequisite checking, and state persistence.
 * 
 * Pure Node.js ESM, zero dependencies.
 */

import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DATA_ROOT = join(__dirname, '..', '..', 'data');

// ─────────────────────────────────────────────
// PHASE DEFINITIONS
// ─────────────────────────────────────────────

const PHASES = {
  P0_SETUP: {
    name: 'P0_SETUP',
    description: 'One-time project setup: Style Guide, Bible init, research, tracker',
    scope: 'once',
    prerequisites: [],
    actions: [
      'research-background',
      'create-style-guide',
      'bible-init',
      'create-tracker'
    ],
    qualityGate: {
      description: 'Style Guide exists + Bible initialized',
      checks: ['style-guide-exists', 'bible-initialized']
    },
    skillsUsed: ['cw-style-skill-creator', 'novel-master', 'deep-research-pro', 'diagram']
  },

  P1_PLAN: {
    name: 'P1_PLAN',
    description: 'Plan arc outline: conflicts, twists, chapter breakdown with 5 beats each',
    scope: 'per-arc',
    prerequisites: ['style-guide-exists', 'bible-initialized'],
    actions: [
      'research-context',
      'brainstorm-arc-outline',
      'define-chapters-beats'
    ],
    qualityGate: {
      description: '≥3 conflicts + ≥1 twist per arc',
      checks: ['min-3-conflicts', 'min-1-twist', 'outline-file-exists']
    },
    skillsUsed: ['cw-brainstorming', 'brainstorm', 'think-cog', 'deep-research-pro']
  },

  P2_PRE_FORGE: {
    name: 'P2_PRE_FORGE',
    description: 'Pre-forge chapter: Bible check, pace suggest, detail 5 beats',
    scope: 'per-chapter',
    prerequisites: ['outline-exists-for-arc', 'bible-snapshot-taken'],
    actions: [
      'bible-check-characters',
      'pace-suggest',
      'detail-5-beats'
    ],
    qualityGate: {
      description: 'Bible snapshot taken + 5 beats detailed',
      checks: ['bible-snapshot-current', '5-beats-detailed']
    },
    skillsUsed: ['novel-master', 'cw-brainstorming', 'think-cog']
  },

  P3_FORGE: {
    name: 'P3_FORGE',
    description: '3-version beat forge: write 3 independent versions → 7-angle review → choose/combine BEST',
    scope: 'per-beat',
    prerequisites: ['beats-detailed-for-chapter', 'style-guide-exists', 'bible-initialized'],
    actions: [
      'forge-3-versions',
      'review-7-angles',
      'choose-or-combine',
      'clean-markdown-ai',
      'score-final'
    ],
    qualityGate: {
      description: 'Each beat ≥9/10 on 7-angle review (incl. markdown+AI clean)',
      checks: ['beat-score-gte-9']
    },
    skillsUsed: ['omni-forge-novel', 'cw-prose-writing', 'story-cog', 'mula-ralph']
  },

  P4_GUARD: {
    name: 'P4_GUARD',
    description: 'Guard chapter: merge 5 beats, continuity scan, prose check, pacing, voice',
    scope: 'per-chapter',
    prerequisites: ['all-5-beats-passed'],
    actions: [
      'merge-beats-to-chapter',
      'continuity-scan',
      'prose-style-check',
      'pacing-record',
      'voice-check'
    ],
    qualityGate: {
      description: '0 critical, ≤2 warnings, pacing OK, drift <20%',
      checks: ['0-critical', 'max-2-warnings', 'pacing-ok', 'drift-under-20']
    },
    skillsUsed: ['novel-master']
  },

  P5_REVIEW: {
    name: 'P5_REVIEW',
    description: 'Review chapter: critique, multi-agent review, final prose read',
    scope: 'per-chapter',
    prerequisites: ['chapter-guarded'],
    actions: [
      'cw-story-critique',
      'multi-agent-review',
      'final-prose-read'
    ],
    qualityGate: {
      description: 'Critique PASS + 0% markdown + 0% AI trace',
      checks: ['critique-pass', '0-markdown', '0-ai-trace']
    },
    skillsUsed: ['cw-story-critique', 'mula-audit']
  },

  P6_SHIP: {
    name: 'P6_SHIP',
    description: 'Ship chapter: send to Telegram, Bible sync, wiki update, tracker, auto-spawn next',
    scope: 'per-chapter',
    prerequisites: ['chapter-reviewed'],
    actions: [
      'send-telegram',
      'bible-sync',
      'wiki-update',
      'update-tracker',
      'auto-spawn-next'
    ],
    qualityGate: {
      description: 'Sent to Telegram + Bible synced',
      checks: ['telegram-sent', 'bible-synced']
    },
    skillsUsed: ['novel-master', 'cw-official-docs', 'mula-ralph']
  },

  P7_ARC_REVIEW: {
    name: 'P7_ARC_REVIEW',
    description: 'Arc review: full scan, style drift, tension curve, voice report, lessons learned',
    scope: 'per-arc',
    prerequisites: ['all-chapters-in-arc-shipped'],
    actions: [
      'continuity-scan-all',
      'prose-drift-arc',
      'pacing-curve',
      'voice-report',
      'cw-story-critique-arc',
      'lessons-learned'
    ],
    qualityGate: {
      description: '0 critical across arc, pacing curve healthy',
      checks: ['0-critical-arc', 'pacing-curve-healthy']
    },
    skillsUsed: ['novel-master', 'cw-story-critique', 'self-improving-agent']
  },

  P8_EDIT: {
    name: 'P8_EDIT',
    description: 'Deep edit: beat-by-beat review, voice consistency, full scan, pacing balance, humanize',
    scope: 'all',
    prerequisites: ['all-arcs-reviewed'],
    actions: [
      'beat-by-beat-review',
      'voice-consistency-full',
      'full-continuity-scan',
      'pacing-balance',
      'style-drift-fix',
      'humanize-final-pass'
    ],
    qualityGate: {
      description: 'Voice consistent, 0 plot holes, 0 AI trace',
      checks: ['voice-consistent', '0-plot-holes', '0-ai-trace-final']
    },
    skillsUsed: ['novel-master', 'humanize']
  },

  P9_EPUB: {
    name: 'P9_EPUB',
    description: 'EPUB Premium export: per-arc books with covers, illustrations, maps, teasers',
    scope: 'per-arc',
    prerequisites: ['arc-review-passed'],
    actions: [
      'prepare-images',
      'generate-cover',
      'build-front-matter',
      'build-body',
      'build-back-matter',
      'epub3-export',
      'audiobook-optional',
      'reader-test',
      'send-epub-telegram'
    ],
    qualityGate: {
      description: 'Format correct, reads well, QR works, images render OK',
      checks: ['format-valid', 'reader-tested', 'qr-works', 'images-ok']
    },
    skillsUsed: ['novel-master', 'book-cover-design', 'edge-tts', 'translate', 'image-edit']
  }
};

const PHASE_ORDER = [
  'P0_SETUP', 'P1_PLAN', 'P2_PRE_FORGE', 'P3_FORGE', 'P4_GUARD',
  'P5_REVIEW', 'P6_SHIP', 'P7_ARC_REVIEW', 'P8_EDIT', 'P9_EPUB'
];

// ─────────────────────────────────────────────
// 7-ANGLE REVIEW WEIGHTS
// ─────────────────────────────────────────────

const REVIEW_ANGLES = [
  { key: 'prose',       name: 'Prose Quality',    weight: 0.20, description: 'Smooth sentences, rhythm, rich vocabulary' },
  { key: 'consistency', name: 'Consistency',       weight: 0.20, description: 'Bible-aligned: names, locations, states' },
  { key: 'voice',       name: 'Character Voice',   weight: 0.15, description: 'Characters speak/act in character' },
  { key: 'pacing',      name: 'Pacing',            weight: 0.15, description: 'Beat speed fits chapter/arc position' },
  { key: 'aiTrace',     name: 'AI Trace',          weight: 0.10, description: 'No AI patterns, no forbidden words' },
  { key: 'engagement',  name: 'Engagement',        weight: 0.10, description: 'Compelling, want to read more, hook at end' },
  { key: 'format',      name: 'Markdown & Format', weight: 0.10, description: '0% markdown (# * ** _ --- >), 0% em-dash (—), pure prose' }
];

const PASS_THRESHOLD = 9;
const BEATS_PER_CHAPTER = 5;
const BEAT_MIN_WORDS = 400;
const BEAT_MAX_WORDS = 600;

// ─────────────────────────────────────────────
// RETRY MANAGER
// ─────────────────────────────────────────────

export class RetryManager {
  /**
   * @param {number} maxCycles - Maximum full forge cycles (each = 3 versions)
   * @param {number} versionsPerCycle - Versions forged per cycle
   */
  constructor(maxCycles = 2, versionsPerCycle = 3) {
    this.maxCycles = maxCycles;
    this.versionsPerCycle = versionsPerCycle;
    /** @type {Map<number, { cycles: number, totalVersions: number, bestScore: number, scores: number[], escalated: boolean }>} */
    this.beats = new Map();
  }

  /**
   * Register a new attempt for a beat
   * @param {number} beatNum
   * @param {number} score - Score achieved this cycle
   * @returns {{ cycle: number, totalVersions: number }}
   */
  attempt(beatNum, score = 0) {
    if (!this.beats.has(beatNum)) {
      this.beats.set(beatNum, {
        cycles: 0,
        totalVersions: 0,
        bestScore: 0,
        scores: [],
        escalated: false
      });
    }
    const state = this.beats.get(beatNum);
    state.cycles += 1;
    state.totalVersions += this.versionsPerCycle;
    if (score > state.bestScore) state.bestScore = score;
    state.scores.push(score);
    return { cycle: state.cycles, totalVersions: state.totalVersions };
  }

  /**
   * Check if beat should retry based on score
   * @param {number} beatNum
   * @param {number} score
   * @returns {boolean}
   */
  shouldRetry(beatNum, score) {
    const state = this.beats.get(beatNum);
    if (!state) return score < PASS_THRESHOLD;
    return score < PASS_THRESHOLD && state.cycles < this.maxCycles;
  }

  /**
   * Check if beat should escalate to user
   * @param {number} beatNum
   * @returns {boolean}
   */
  shouldEscalate(beatNum) {
    const state = this.beats.get(beatNum);
    if (!state) return false;
    if (state.cycles >= this.maxCycles && state.bestScore < PASS_THRESHOLD) {
      state.escalated = true;
      return true;
    }
    return false;
  }

  /**
   * Get stats for a specific beat
   * @param {number} beatNum
   * @returns {{ totalVersions: number, cycles: number, bestScore: number, escalated: boolean, scores: number[] }}
   */
  getStats(beatNum) {
    const state = this.beats.get(beatNum);
    if (!state) return { totalVersions: 0, cycles: 0, bestScore: 0, escalated: false, scores: [] };
    return { ...state };
  }

  /**
   * Get aggregate stats for all beats
   * @returns {{ beatsAttempted: number, totalVersions: number, totalCycles: number, averageBestScore: number, escalatedBeats: number[] }}
   */
  getAggregateStats() {
    let totalVersions = 0;
    let totalCycles = 0;
    let scoreSum = 0;
    const escalatedBeats = [];

    for (const [beatNum, state] of this.beats) {
      totalVersions += state.totalVersions;
      totalCycles += state.cycles;
      scoreSum += state.bestScore;
      if (state.escalated) escalatedBeats.push(beatNum);
    }

    const beatsAttempted = this.beats.size;
    return {
      beatsAttempted,
      totalVersions,
      totalCycles,
      averageBestScore: beatsAttempted > 0 ? +(scoreSum / beatsAttempted).toFixed(2) : 0,
      escalatedBeats
    };
  }

  /** Serialize to plain object */
  toJSON() {
    const entries = {};
    for (const [k, v] of this.beats) entries[k] = v;
    return { maxCycles: this.maxCycles, versionsPerCycle: this.versionsPerCycle, beats: entries };
  }

  /** Restore from plain object */
  static fromJSON(obj) {
    const rm = new RetryManager(obj.maxCycles || 2, obj.versionsPerCycle || 3);
    if (obj.beats) {
      for (const [k, v] of Object.entries(obj.beats)) {
        rm.beats.set(Number(k), v);
      }
    }
    return rm;
  }
}

// ─────────────────────────────────────────────
// INTENT DETECTION
// ─────────────────────────────────────────────

/**
 * Intent detection patterns for Vietnamese + English messages.
 * Returns { phase, action, params } or null if no match.
 */
function detectIntent(userMessage) {
  if (!userMessage || typeof userMessage !== 'string') return null;

  const msg = userMessage.trim().toLowerCase();

  // Ordered from most specific to least specific
  const patterns = [
    // ── EPUB / Export ──
    {
      regex: /(?:xu[aấ]t|export|ph[aá]t\s*h[aà]nh|publish)\s*epub\s*(?:arc\s*(\d+)|qu[yể]n\s*(\d+))?/i,
      handler: (m) => ({
        phase: 'P9_EPUB',
        action: 'epub',
        params: { arc: num(m[1] || m[2]) }
      })
    },
    {
      regex: /(?:xu[aấ]t|export|ph[aá]t\s*h[aà]nh|publish)\s*(?:audiobook|s[aá]ch\s*n[oó]i)\s*(?:arc\s*(\d+))?/i,
      handler: (m) => ({
        phase: 'P9_EPUB',
        action: 'audiobook',
        params: { arc: num(m[1]) }
      })
    },
    {
      regex: /(?:xu[aấ]t|export|ph[aá]t\s*h[aà]nh|publish)\s*(?:pdf|html)\s*(?:arc\s*(\d+))?/i,
      handler: (m) => ({
        phase: 'P9_EPUB',
        action: 'export',
        params: { arc: num(m[1]) }
      })
    },
    {
      regex: /(?:xu[aấ]t|export|ph[aá]t\s*h[aà]nh|publish)\s*(?:to[aà]n\s*t[aậ]p|bundle|all)/i,
      handler: () => ({
        phase: 'P9_EPUB',
        action: 'epub-bundle',
        params: {}
      })
    },

    // ── Edit / Biên tập ──
    {
      regex: /(?:bi[eê]n\s*t[aậ]p|edit)\s*(?:to[aà]n\s*b[oộ]|all|full)/i,
      handler: () => ({
        phase: 'P8_EDIT',
        action: 'deep-edit',
        params: {}
      })
    },
    {
      regex: /(?:r[aà]\s*so[aá]t|review\s*all|humanize\s*all)/i,
      handler: () => ({
        phase: 'P8_EDIT',
        action: 'deep-edit',
        params: {}
      })
    },

    // ── Arc Review ──
    {
      regex: /(?:review|ph[eê]\s*b[iì]nh|đ[aá]nh\s*gi[aá])\s*arc\s*(\d+)/i,
      handler: (m) => ({
        phase: 'P7_ARC_REVIEW',
        action: 'arc-review',
        params: { arc: num(m[1]) }
      })
    },

    // ── Forge / Write chapter (triggers P2→P6) ──
    {
      regex: /(?:vi[eế]t|forge|so[aạ]n|write|continue|ti[eế]p)\s*(?:ch[uư][oơ]ng|chapter)\s*(\d+)/i,
      handler: (m) => ({
        phase: 'P2_PRE_FORGE',
        action: 'pre-forge',
        params: { chapter: num(m[1]) }
      })
    },
    {
      regex: /(?:vi[eế]t|forge|so[aạ]n|write)\s*(?:ti[eế]p|next|ch[uư][oơ]ng\s*ti[eế]p|next\s*chapter)/i,
      handler: () => ({
        phase: 'P2_PRE_FORGE',
        action: 'pre-forge-next',
        params: {}
      })
    },
    {
      regex: /(?:so[aạ]n\s*ti[eế]p\s*truy[eệ]n|continue\s*(?:the\s*)?novel|forge\s*next)/i,
      handler: () => ({
        phase: 'P2_PRE_FORGE',
        action: 'pre-forge-next',
        params: {}
      })
    },

    // ── Check / Scan ──
    {
      regex: /(?:scan|ki[eể]m\s*tra|check)\s*(?:m[aâ]u\s*thu[aẫ]n|continuity|ch[uư][oơ]ng|chapter)(?:\s+(?:ch[uư][oơ]ng|chapter))?\s*(\d+)?/i,
      handler: (m) => ({
        phase: 'P4_GUARD',
        action: 'guard-scan',
        params: { chapter: num(m[1]) }
      })
    },
    {
      regex: /(?:plot\s*hole|l[oỗ]\s*h[oổ]ng|m[aâ]u\s*thu[aẫ]n)/i,
      handler: () => ({
        phase: 'P4_GUARD',
        action: 'guard-scan',
        params: {}
      })
    },

    // ── Review chapter ──
    {
      regex: /(?:review|ph[eê]\s*b[iì]nh|critique)\s*(?:ch[uư][oơ]ng|chapter)\s*(\d+)/i,
      handler: (m) => ({
        phase: 'P5_REVIEW',
        action: 'review-chapter',
        params: { chapter: num(m[1]) }
      })
    },
    {
      regex: /(?:pacing|nh[iị]p)\s*(?:ok|[oổ]n|check)?/i,
      handler: () => ({
        phase: 'P5_REVIEW',
        action: 'pacing-check',
        params: {}
      })
    },

    // ── Plan / Outline ──
    {
      regex: /(?:t[aạ]o\s*outline|plan|brainstorm)\s*arc\s*(\d+)/i,
      handler: (m) => ({
        phase: 'P1_PLAN',
        action: 'plan-arc',
        params: { arc: num(m[1]) }
      })
    },
    {
      regex: /(?:outline|k[eế]\s*ho[aạ]ch|plan)\s*(?:arc|tr[uư]y[eệ]n)/i,
      handler: () => ({
        phase: 'P1_PLAN',
        action: 'plan-arc',
        params: {}
      })
    },

    // ── Setup ──
    {
      regex: /(?:kh[oở]i\s*t[aạ]o|init|setup)\s*(?:project|d[uự]\s*[aá]n|truy[eệ]n)/i,
      handler: () => ({
        phase: 'P0_SETUP',
        action: 'setup',
        params: {}
      })
    },
    {
      regex: /(?:t[aạ]o\s*style\s*guide|style\s*guide)/i,
      handler: () => ({
        phase: 'P0_SETUP',
        action: 'style-guide',
        params: {}
      })
    },
    {
      regex: /bible\s*init/i,
      handler: () => ({
        phase: 'P0_SETUP',
        action: 'bible-init',
        params: {}
      })
    },

    // ── Status ──
    {
      regex: /(?:truy[eệ]n\s*t[oớ]i\s*đ[aâ]u|ti[eế]n\s*đ[oộ]|progress|status|state)/i,
      handler: () => ({
        phase: null,
        action: 'status',
        params: {}
      })
    }
  ];

  for (const { regex, handler } of patterns) {
    const m = msg.match(regex);
    if (m) return handler(m);
  }

  return null;
}

function num(val) {
  if (val === undefined || val === null) return null;
  const n = parseInt(val, 10);
  return isNaN(n) ? null : n;
}

// ─────────────────────────────────────────────
// HELPER: File existence check
// ─────────────────────────────────────────────

async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function ensureDir(dirPath) {
  await mkdir(dirPath, { recursive: true });
}

// ─────────────────────────────────────────────
// PIPELINE ORCHESTRATOR
// ─────────────────────────────────────────────

export class PipelineOrchestrator {
  constructor() {
    this.phases = PHASES;
    this.phaseOrder = PHASE_ORDER;
    this.reviewAngles = REVIEW_ANGLES;
    this.retryManager = new RetryManager();
  }

  // ── Project Data Path ──

  /**
   * Get the data directory for a project
   * @param {string} projectSlug
   * @returns {string}
   */
  dataDir(projectSlug) {
    return join(DATA_ROOT, projectSlug);
  }

  /**
   * Get the state file path for a project
   * @param {string} projectSlug
   * @returns {string}
   */
  stateFilePath(projectSlug) {
    return join(this.dataDir(projectSlug), 'pipeline-state.json');
  }

  // ── State Persistence ──

  /**
   * Save pipeline state to disk
   * @param {string} projectSlug
   * @param {object} [stateOverride] - Optional state object to save (defaults to internal state)
   */
  async saveState(projectSlug, stateOverride) {
    const dir = this.dataDir(projectSlug);
    await ensureDir(dir);

    const state = stateOverride || this._buildStateSnapshot(projectSlug);
    const filePath = this.stateFilePath(projectSlug);
    await writeFile(filePath, JSON.stringify(state, null, 2), 'utf-8');
    return filePath;
  }

  /**
   * Load pipeline state from disk
   * @param {string} projectSlug
   * @returns {object|null}
   */
  async loadState(projectSlug) {
    const filePath = this.stateFilePath(projectSlug);
    if (!(await fileExists(filePath))) return null;

    try {
      const raw = await readFile(filePath, 'utf-8');
      const state = JSON.parse(raw);
      // Restore retry manager
      if (state.retryManager) {
        this.retryManager = RetryManager.fromJSON(state.retryManager);
      }
      return state;
    } catch {
      return null;
    }
  }

  /**
   * Build a state snapshot from current orchestrator state
   * @param {string} projectSlug
   * @returns {object}
   */
  _buildStateSnapshot(projectSlug) {
    return {
      projectSlug,
      currentPhase: this._currentPhase || 'P0_SETUP',
      currentArc: this._currentArc || 1,
      currentChapter: this._currentChapter || 1,
      currentBeat: this._currentBeat || 1,
      beatScores: this._beatScores || {},
      retryManager: this.retryManager.toJSON(),
      phaseHistory: this._phaseHistory || [],
      qualityGateResults: this._qualityGateResults || [],
      updatedAt: new Date().toISOString()
    };
  }

  /**
   * Restore orchestrator internal state from loaded data
   * @param {object} state - Previously loaded state
   */
  restoreFromState(state) {
    if (!state) return;
    this._currentPhase = state.currentPhase || 'P0_SETUP';
    this._currentArc = state.currentArc || 1;
    this._currentChapter = state.currentChapter || 1;
    this._currentBeat = state.currentBeat || 1;
    this._beatScores = state.beatScores || {};
    this._phaseHistory = state.phaseHistory || [];
    this._qualityGateResults = state.qualityGateResults || [];
    if (state.retryManager) {
      this.retryManager = RetryManager.fromJSON(state.retryManager);
    }
  }

  // ── Phase Information ──

  /**
   * Get phase definition
   * @param {string} phaseName
   * @returns {object|null}
   */
  getPhase(phaseName) {
    return this.phases[phaseName] || null;
  }

  /**
   * Get the next phase in the pipeline
   * @param {string} currentPhaseName
   * @returns {string|null}
   */
  getNextPhase(currentPhaseName) {
    const idx = this.phaseOrder.indexOf(currentPhaseName);
    if (idx === -1 || idx >= this.phaseOrder.length - 1) return null;
    return this.phaseOrder[idx + 1];
  }

  /**
   * Get the phase index (0-9)
   * @param {string} phaseName
   * @returns {number}
   */
  getPhaseIndex(phaseName) {
    return this.phaseOrder.indexOf(phaseName);
  }

  // ── Phase Transition ──

  /**
   * Advance to next phase based on quality gate result
   * @param {string} currentPhase - Current phase name
   * @param {{ passed: boolean, score?: number, details?: object }} result
   * @returns {{ nextPhase: string|null, status: 'advanced'|'retry'|'escalate', reason: string }}
   */
  async advancePhase(currentPhase, result) {
    const phase = this.getPhase(currentPhase);
    if (!phase) {
      return { nextPhase: null, status: 'escalate', reason: `Unknown phase: ${currentPhase}` };
    }

    // Record quality gate result
    const gateEntry = {
      phase: currentPhase,
      passed: result.passed,
      score: result.score ?? null,
      details: result.details ?? null,
      timestamp: new Date().toISOString()
    };
    if (!this._qualityGateResults) this._qualityGateResults = [];
    this._qualityGateResults.push(gateEntry);

    // Record phase history
    if (!this._phaseHistory) this._phaseHistory = [];

    if (result.passed) {
      const nextPhase = this.getNextPhase(currentPhase);
      this._phaseHistory.push({
        from: currentPhase,
        to: nextPhase,
        status: 'advanced',
        timestamp: new Date().toISOString()
      });
      this._currentPhase = nextPhase || currentPhase;
      return {
        nextPhase,
        status: 'advanced',
        reason: `Quality gate PASSED for ${currentPhase}. Advancing to ${nextPhase || 'COMPLETED'}.`
      };
    }

    // For P3_FORGE (beat level), use retry logic
    if (currentPhase === 'P3_FORGE' && typeof this._currentBeat === 'number') {
      const beatNum = this._currentBeat;
      if (this.retryManager.shouldRetry(beatNum, result.score ?? 0)) {
        this._phaseHistory.push({
          from: currentPhase,
          to: currentPhase,
          status: 'retry',
          beat: beatNum,
          score: result.score,
          timestamp: new Date().toISOString()
        });
        return {
          nextPhase: currentPhase,
          status: 'retry',
          reason: `Beat ${beatNum} scored ${result.score}/<${PASS_THRESHOLD}. Retrying (cycle ${this.retryManager.getStats(beatNum).cycles + 1}/${this.retryManager.maxCycles}).`
        };
      }

      if (this.retryManager.shouldEscalate(beatNum)) {
        this._phaseHistory.push({
          from: currentPhase,
          to: currentPhase,
          status: 'escalate',
          beat: beatNum,
          bestScore: this.retryManager.getStats(beatNum).bestScore,
          timestamp: new Date().toISOString()
        });
        return {
          nextPhase: currentPhase,
          status: 'escalate',
          reason: `Beat ${beatNum} failed after ${this.retryManager.maxCycles} cycles (${this.retryManager.maxCycles * this.retryManager.versionsPerCycle} versions). Best score: ${this.retryManager.getStats(beatNum).bestScore}. Needs user intervention.`
        };
      }
    }

    // Generic retry for other phases
    this._phaseHistory.push({
      from: currentPhase,
      to: currentPhase,
      status: 'retry',
      timestamp: new Date().toISOString()
    });
    return {
      nextPhase: currentPhase,
      status: 'retry',
      reason: `Quality gate FAILED for ${currentPhase}: ${result.details?.reason || 'unknown'}. Staying in phase for retry.`
    };
  }

  // ── Prerequisite Checker ──

  /**
   * Check prerequisites for entering a phase
   * @param {string} phaseName
   * @param {string} projectSlug
   * @returns {Promise<{ met: boolean, missing: string[] }>}
   */
  async checkPrerequisites(phaseName, projectSlug) {
    const dir = this.dataDir(projectSlug);
    const missing = [];

    switch (phaseName) {
      case 'P0_SETUP':
        // No prerequisites — this is the first phase
        break;

      case 'P1_PLAN': {
        if (!(await fileExists(join(dir, 'style-profile.json')))) {
          missing.push('style-guide: Style Guide not found (style-profile.json)');
        }
        if (!(await fileExists(join(dir, 'bible.json')))) {
          missing.push('bible: Bible not initialized (bible.json)');
        }
        break;
      }

      case 'P2_PRE_FORGE': {
        const arc = this._currentArc || 1;
        const outlineFile = join(dir, `outline-arc${arc}.md`);
        if (!(await fileExists(outlineFile))) {
          missing.push(`outline: Outline for arc ${arc} not found (outline-arc${arc}.md)`);
        }
        if (!(await fileExists(join(dir, 'bible.json')))) {
          missing.push('bible: Bible not initialized');
        }
        break;
      }

      case 'P3_FORGE': {
        const ch = this._currentChapter || 1;
        const beatsFile = join(dir, `beats-ch${String(ch).padStart(2, '0')}.md`);
        if (!(await fileExists(beatsFile))) {
          missing.push(`beats: Beat details for chapter ${ch} not found (beats-ch${String(ch).padStart(2, '0')}.md)`);
        }
        if (!(await fileExists(join(dir, 'style-profile.json')))) {
          missing.push('style-guide: Style Guide not found');
        }
        if (!(await fileExists(join(dir, 'bible.json')))) {
          missing.push('bible: Bible not initialized');
        }
        break;
      }

      case 'P4_GUARD': {
        const ch = this._currentChapter || 1;
        // Check that all 5 beats passed
        const chKey = `ch${ch}`;
        const scores = this._beatScores?.[chKey];
        if (!scores || Object.keys(scores).length < BEATS_PER_CHAPTER) {
          missing.push(`beats: Not all ${BEATS_PER_CHAPTER} beats have passed for chapter ${ch}`);
        } else {
          for (let b = 1; b <= BEATS_PER_CHAPTER; b++) {
            if (!scores[`b${b}`] || scores[`b${b}`] < PASS_THRESHOLD) {
              missing.push(`beat-${b}: Beat ${b} score (${scores[`b${b}`] || 0}) below threshold ${PASS_THRESHOLD}`);
            }
          }
        }
        break;
      }

      case 'P5_REVIEW': {
        const ch = this._currentChapter || 1;
        const guardedFile = join(dir, `ch${String(ch).padStart(2, '0')}-guarded.md`);
        if (!(await fileExists(guardedFile))) {
          missing.push(`guard: Chapter ${ch} not guarded yet (ch${String(ch).padStart(2, '0')}-guarded.md)`);
        }
        break;
      }

      case 'P6_SHIP': {
        const ch = this._currentChapter || 1;
        const finalFile = join(dir, `ch${String(ch).padStart(2, '0')}-FINAL.md`);
        if (!(await fileExists(finalFile))) {
          missing.push(`review: Chapter ${ch} not reviewed yet (ch${String(ch).padStart(2, '0')}-FINAL.md)`);
        }
        break;
      }

      case 'P7_ARC_REVIEW': {
        // Check all chapters in current arc are shipped
        // We check for tracker or state indicating arc chapters done
        if (!(await fileExists(join(dir, 'bible.json')))) {
          missing.push('bible: Bible not found');
        }
        const trackerFile = join(dir, 'tracker.json');
        if (!(await fileExists(trackerFile))) {
          missing.push('tracker: Progress tracker not found');
        }
        break;
      }

      case 'P8_EDIT': {
        // All arcs should have been reviewed
        const arcReviewFile = join(dir, `arc-review-${this._currentArc || 1}.md`);
        if (!(await fileExists(arcReviewFile))) {
          missing.push(`arc-review: Arc review not found (arc-review-${this._currentArc || 1}.md)`);
        }
        break;
      }

      case 'P9_EPUB': {
        const arc = this._currentArc || 1;
        const arcReviewFile = join(dir, `arc-review-${arc}.md`);
        if (!(await fileExists(arcReviewFile))) {
          missing.push(`arc-review: Arc ${arc} review must pass before EPUB (arc-review-${arc}.md)`);
        }
        break;
      }

      default:
        missing.push(`unknown-phase: "${phaseName}" is not a recognized phase`);
    }

    return { met: missing.length === 0, missing };
  }

  // ── 3-Version Beat Forge ──

  /**
   * Execute the 3-version beat forge process.
   * This method structures the forge logic; actual prose generation
   * is delegated to the `forgeCallback` function.
   *
   * @param {number} beatNum - Beat number (1-5)
   * @param {string} outlineText - Beat outline/description
   * @param {object} context - Context object { chapter, arc, bibleSnapshot, styleGuide, previousBeats }
   * @param {Function} forgeCallback - async (beatNum, outlineText, context, versionNum, previousVersions) => { text, wordCount }
   * @param {Function} scoreCallback - async (text, context) => { scores: { prose, consistency, voice, pacing, aiTrace, engagement, format }, total }
   * @returns {Promise<{ bestVersion: string, score: number, attempts: number, passed: boolean, versions: object[] }>}
   */
  async forgeBeat(beatNum, outlineText, context, forgeCallback, scoreCallback) {
    let cycle = 0;
    let bestVersion = null;
    let bestScore = 0;
    let allVersions = [];
    let passed = false;

    while (cycle < this.retryManager.maxCycles) {
      cycle++;
      const cycleVersions = [];

      // ── Step 1: Forge 3 independent versions ──
      for (let v = 1; v <= 3; v++) {
        const previousVersions = cycleVersions.map(cv => cv.text);
        const result = await forgeCallback(beatNum, outlineText, context, v, previousVersions);
        
        // Validate word count
        const wordCount = result.wordCount || countWords(result.text);
        const wcValid = wordCount >= BEAT_MIN_WORDS && wordCount <= BEAT_MAX_WORDS;

        // Score this version
        const scoreResult = await scoreCallback(result.text, context);
        
        cycleVersions.push({
          versionNum: v,
          cycle,
          text: result.text,
          wordCount,
          wordCountValid: wcValid,
          scores: scoreResult.scores,
          totalScore: scoreResult.total
        });
      }

      // ── Step 2: Choose best or flag for combine ──
      cycleVersions.sort((a, b) => b.totalScore - a.totalScore);
      const top = cycleVersions[0];
      const second = cycleVersions[1];
      const gap = top.totalScore - second.totalScore;

      let selectedVersion;
      if (gap >= 0.5) {
        // Clear winner
        selectedVersion = { ...top, selectionMethod: 'clear-winner' };
      } else {
        // Close scores — mark for potential combine (actual combining done by caller)
        selectedVersion = { ...top, selectionMethod: 'combine-candidate', combinePool: cycleVersions };
      }

      allVersions.push(...cycleVersions);

      // ── Step 3: Register attempt in retry manager ──
      this.retryManager.attempt(beatNum, selectedVersion.totalScore);

      // ── Step 4: Check if passed ──
      if (selectedVersion.totalScore >= PASS_THRESHOLD) {
        bestVersion = selectedVersion.text;
        bestScore = selectedVersion.totalScore;
        passed = true;
        break;
      }

      // Track best across cycles
      if (selectedVersion.totalScore > bestScore) {
        bestScore = selectedVersion.totalScore;
        bestVersion = selectedVersion.text;
      }

      // Check if we should retry or escalate
      if (!this.retryManager.shouldRetry(beatNum, selectedVersion.totalScore)) {
        break;
      }
    }

    // Record beat score
    const chKey = `ch${context.chapter || this._currentChapter || 1}`;
    if (!this._beatScores) this._beatScores = {};
    if (!this._beatScores[chKey]) this._beatScores[chKey] = {};
    this._beatScores[chKey][`b${beatNum}`] = bestScore;

    return {
      bestVersion,
      score: bestScore,
      attempts: allVersions.length,
      passed,
      escalated: this.retryManager.shouldEscalate(beatNum),
      versions: allVersions
    };
  }

  /**
   * Compute weighted score from 7-angle individual scores
   * @param {{ prose: number, consistency: number, voice: number, pacing: number, aiTrace: number, engagement: number, format: number }} scores
   * @returns {number} Weighted total (0-10)
   */
  computeWeightedScore(scores) {
    let total = 0;
    for (const angle of REVIEW_ANGLES) {
      const val = scores[angle.key];
      if (typeof val === 'number' && !Number.isNaN(val)) {
        total += val * angle.weight;
      }
    }
    return +total.toFixed(2);
  }

  // ── Intent Detection ──

  /**
   * Detect user intent from message
   * @param {string} userMessage
   * @returns {{ phase: string|null, action: string, params: object }|null}
   */
  detectIntent(userMessage) {
    return detectIntent(userMessage);
  }

  // ── Progress Tracking ──

  /**
   * Set current position in the pipeline
   * @param {{ phase?: string, arc?: number, chapter?: number, beat?: number }} position
   */
  setPosition(position) {
    if (position.phase !== undefined) this._currentPhase = position.phase;
    if (position.arc !== undefined) this._currentArc = position.arc;
    if (position.chapter !== undefined) this._currentChapter = position.chapter;
    if (position.beat !== undefined) this._currentBeat = position.beat;
  }

  /**
   * Get current position
   * @returns {{ phase: string, arc: number, chapter: number, beat: number }}
   */
  getPosition() {
    return {
      phase: this._currentPhase || 'P0_SETUP',
      arc: this._currentArc || 1,
      chapter: this._currentChapter || 1,
      beat: this._currentBeat || 1
    };
  }

  /**
   * Get a human-readable status summary
   * @param {string} projectSlug
   * @returns {Promise<string>}
   */
  async getStatusSummary(projectSlug) {
    const state = await this.loadState(projectSlug);
    if (!state) {
      return `Project "${projectSlug}": No state found. Run Phase 0 (Setup) first.`;
    }

    const pos = {
      phase: state.currentPhase,
      arc: state.currentArc,
      chapter: state.currentChapter,
      beat: state.currentBeat
    };

    const phaseInfo = this.getPhase(pos.phase);
    const phaseName = phaseInfo ? `${pos.phase} (${phaseInfo.description})` : pos.phase;
    const retryStats = state.retryManager ? RetryManager.fromJSON(state.retryManager).getAggregateStats() : null;

    let summary = `📊 ${projectSlug}\n`;
    summary += `Phase: ${phaseName}\n`;
    summary += `Arc: ${pos.arc} | Chapter: ${pos.chapter} | Beat: ${pos.beat}\n`;

    if (retryStats) {
      summary += `Beats forged: ${retryStats.beatsAttempted} | Total versions: ${retryStats.totalVersions}`;
      if (retryStats.escalatedBeats.length > 0) {
        summary += ` | ⚠️ Escalated: beats ${retryStats.escalatedBeats.join(', ')}`;
      }
      summary += '\n';
    }

    if (state.beatScores && Object.keys(state.beatScores).length > 0) {
      summary += 'Scores: ';
      const entries = [];
      for (const [chKey, beats] of Object.entries(state.beatScores)) {
        const beatEntries = Object.entries(beats).map(([bk, sc]) => `${bk}=${sc}`).join(' ');
        entries.push(`${chKey}[${beatEntries}]`);
      }
      summary += entries.join(', ') + '\n';
    }

    summary += `Updated: ${state.updatedAt || 'unknown'}`;
    return summary;
  }

  // ── Full Pipeline Execution Map ──

  /**
   * Get the execution plan for a detected intent
   * @param {{ phase: string, action: string, params: object }} intent
   * @returns {{ phases: string[], description: string }}
   */
  getExecutionPlan(intent) {
    if (!intent || !intent.phase) {
      return { phases: [], description: 'No intent detected' };
    }

    // Writing a chapter triggers P2→P6 pipeline
    if (intent.action === 'pre-forge' || intent.action === 'pre-forge-next') {
      return {
        phases: ['P2_PRE_FORGE', 'P3_FORGE', 'P4_GUARD', 'P5_REVIEW', 'P6_SHIP'],
        description: `Forge chapter pipeline: Pre-forge → Forge (3-version beats) → Guard → Review → Ship`
      };
    }

    // Arc review
    if (intent.action === 'arc-review') {
      return {
        phases: ['P7_ARC_REVIEW'],
        description: `Arc review: full scan, drift, curve, voice, critique`
      };
    }

    // Deep edit
    if (intent.action === 'deep-edit') {
      return {
        phases: ['P8_EDIT'],
        description: `Deep edit: beat-by-beat review, full scan, humanize`
      };
    }

    // EPUB
    if (intent.phase === 'P9_EPUB') {
      return {
        phases: ['P9_EPUB'],
        description: `EPUB export: ${intent.action}`
      };
    }

    // Single phase
    return {
      phases: [intent.phase],
      description: `Execute ${intent.phase}: ${intent.action}`
    };
  }
}

// ─────────────────────────────────────────────
// UTILITY
// ─────────────────────────────────────────────

/**
 * Count words in text (supports Vietnamese + Latin)
 * @param {string} text
 * @returns {number}
 */
function countWords(text) {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(w => w.length > 0).length;
}

// ─────────────────────────────────────────────
// CONSTANTS EXPORT (for external tools)
// ─────────────────────────────────────────────

export const PIPELINE_CONSTANTS = {
  PHASES,
  PHASE_ORDER,
  REVIEW_ANGLES,
  PASS_THRESHOLD,
  BEATS_PER_CHAPTER,
  BEAT_MIN_WORDS,
  BEAT_MAX_WORDS
};
