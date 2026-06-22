#!/usr/bin/env node

/**
 * Novel Master CLI v2.1 — Entry Point
 * 
 * The unified command-line interface for all 6 modules:
 *   bible    — Character & World Bible management
 *   check    — Continuity scanning
 *   prose    — Style analysis
 *   pace     — Pacing tracking
 *   voice    — Character voice management
 *   publish  — EPUB/PDF/HTML/QR/Audiobook publishing
 * 
 * Usage:
 *   node novel-master.mjs <module> <command> [options]
 * 
 * Examples:
 *   node novel-master.mjs bible init "Trọng Sinh Thành Đường Tam Tạng"
 *   node novel-master.mjs bible add character "Trần Huyền Trang" --age 17
 *   node novel-master.mjs check scan chapters/ch21.md
 *   node novel-master.mjs prose baseline chapters/ch01.md chapters/ch02.md
 *   node novel-master.mjs pace record 21 ACTION TENSION REVELATION EMOTIONAL QUIET
 *   node novel-master.mjs voice add tran-huyen-trang --name "Trần Huyền Trang"
 *   node novel-master.mjs publish epub chapters/ --title "Tên Truyện" --arc 1
 */

import BibleManager from './utils/bible.mjs';
import ContinuityChecker from './utils/continuity.mjs';
import ProseAnalyzer from './utils/prose.mjs';
import PacingTracker from './utils/pacing.mjs';
import VoiceManager from './utils/voice.mjs';
import Publisher from './utils/publish.mjs';
import { Router, PATTERNS, OPERATIONS } from './utils/router.mjs';
import path from 'path';
import fs from 'fs';

// Lazy-load optional V2.1 modules (may not exist yet)
let Orchestrator = null;
let Scoring = null;
try { Orchestrator = (await import('./utils/orchestrator.mjs')).default; } catch {}
try { Scoring = (await import('./utils/scoring.mjs')).default; } catch {}

// Parse args
const args = process.argv.slice(2);
const module = args[0]?.toLowerCase();
const command = args[1]?.toLowerCase();
const rest = args.slice(2);

// Get project slug from --project flag or default
const projectIdx = args.indexOf('--project');
const projectSlug = projectIdx >= 0 ? args[projectIdx + 1] : 'default-project';

// Help
function showHelp() {
  console.log(`
╔══════════════════════════════════════════════════════╗
║           📖 NOVEL MASTER v2.1                       ║
║     The Guardian of Novel Consistency                ║
╚══════════════════════════════════════════════════════╝

USAGE: node novel-master.mjs <module> <command> [args] [--project slug]

MODULES:

  bible     Character & World Bible management
  ├── init <name>                   Initialize project Bible
  ├── add character <name> [opts]   Add character
  ├── add location <name> [opts]    Add location
  ├── add item <name> [opts]        Add item
  ├── show <entity-slug>            Show entity details
  ├── list <type>                   List entities (character/location/item)
  ├── update-state <char> <ch> <json>  Update character state
  ├── snapshot <chapter>            Create chapter snapshot
  ├── diff <ch1> <ch2>             Compare two snapshots
  └── export                        Export Bible to markdown

  check     Continuity scanning
  ├── scan <chapter.md>             Scan single chapter
  ├── scan-all <directory>          Scan all chapters
  └── scan-range <start> <end> <dir>  Scan chapter range

  prose     Writing style analysis
  ├── baseline <ch1.md> [ch2.md...] Create style baseline
  ├── check <chapter.md>            Check chapter against baseline
  └── drift <start> <end> <dir>     Measure style drift over range

  pace      Pacing tracking
  ├── record <ch#> <B1> <B2>...     Record chapter beat types
  ├── curve <arc#>                  Show tension curve for arc
  ├── suggest <next-ch#>            Suggest pacing for next chapter
  └── report                        Full pacing report

  voice     Character voice management
  ├── add <slug> [--name "Name"]    Create voice profile
  ├── build <slug> <chapter.md>     Build profile from chapter dialogues
  ├── check <chapter.md>            Check voice consistency
  ├── compare <slug1> <slug2>       Compare two character voices
  └── report                        Full voice report

  publish   EPUB/PDF/HTML/QR/Audiobook publishing
  ├── epub <chapters-dir>           Create EPUB3 Premium
  ├── pdf <chapters-dir>            Create PDF (A5)
  ├── html <chapters-dir>           Create HTML web reader
  ├── qr <url>                      Generate QR code
  ├── audiobook <chapters-dir>      Create audiobook (Edge-TTS)
  └── all <chapters-dir>            Run full publish pipeline

  PUBLISH FLAGS:
    --title <name>      Book title
    --author <name>     Author name
    --cover <path>      Cover image path
    --arc <number>      Export only chapters in this arc
    --bundle            Bundle ALL arcs into single "Toàn Tập" file
    --voice <name>      TTS voice for audiobook (default: vi-VN-HoaiMyNeural)
    --output <dir>      Output directory

  pipeline  Pipeline orchestrator (V2.1)
  ├── status [--project slug]        Show pipeline state (phase, progress)
  ├── advance [--project slug]       Advance to next phase (check gates)
  └── reset [--project slug]         Reset pipeline state

  score     Beat scoring (V2.1)
  ├── beat <file>                    Score a beat (7 angles)
  └── compare <v1> <v2> <v3>        Compare 3 beat versions

  route     Intent detection (V2.1)
  └── <message>                      Test intent detection on a message

  forge     Full forge cycle (V2.1)
  ├── beat <ch#> <beat#> [--project] Full 3-version beat forge cycle
  └── chapter <ch#> [--project]      Full chapter forge (5 beats × 3 versions)

OPTIONS:
  --project <slug>    Project slug (default: "default-project")

Beat types: ACTION, TENSION, REVELATION, EMOTIONAL, QUIET, TRANSITION
`);
}

// Parse --key value flags
function parseFlags(args) {
  const flags = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].substring(2);
      const value = args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true;
      flags[key] = value;
      if (value !== true) i++;
    }
  }
  return flags;
}

// Get positional args (non-flag)
function getPositional(args) {
  const result = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      if (args[i + 1] && !args[i + 1].startsWith('--')) i++;
      continue;
    }
    result.push(args[i]);
  }
  return result;
}

// Main router
async function main() {
  if (!module || module === 'help' || module === '--help' || module === '-h') {
    showHelp();
    return;
  }

  if (module === '--version' || module === '-v') {
    console.log('Novel Master v2.1');
    return;
  }

  const flags = parseFlags(rest);
  const positional = getPositional(rest);

  switch (module) {
    case 'bible': {
      const bible = new BibleManager(projectSlug);
      switch (command) {
        case 'init':
          bible.init(positional[0] || 'Untitled Project');
          break;
        case 'add': {
          const entityType = positional[0];
          const entityName = positional[1];
          if (!entityType) { console.error('❌ Entity type required. Usage: bible add <character|location|item> <name>'); return; }
          if (!entityName) { console.error('❌ Name required. Usage: bible add ' + entityType + ' <name>'); return; }
          switch (entityType) {
            case 'character':
              bible.addCharacter(entityName, {
                aliases: flags.aliases?.split(',') || [],
                age: flags.age ? parseInt(flags.age) : null,
                gender: flags.gender,
                background: flags.background,
                traits: flags.traits?.split(',') || [],
                vocabularyLevel: flags.vocab,
                sentenceStyle: flags.style,
                catchphrases: flags.catchphrases?.split(',') || [],
                forbiddenWords: flags.forbidden?.split(',') || [],
                startLocation: flags.location,
                initialPowerLevel: flags.power ? parseInt(flags.power) : 0
              });
              break;
            case 'location':
              bible.addLocation(entityName, {
                type: flags.type, region: flags.region,
                terrain: flags.terrain, significance: flags.significance,
                firstAppearance: flags.chapter ? parseInt(flags.chapter) : null
              });
              break;
            case 'item':
              bible.addItem(entityName, {
                type: flags.type, description: flags.desc,
                owner: flags.owner,
                powers: flags.powers?.split(',') || [],
                firstAppearance: flags.chapter ? parseInt(flags.chapter) : null
              });
              break;
            default:
              console.error(`❌ Unknown entity type: ${entityType}. Use: character, location, item`);
          }
          break;
        }
        case 'show':
        case 'get':
          if (positional[0]) bible.show(positional[0]);
          else console.error('❌ Entity slug required');
          break;
        case 'list':
          bible.list(positional[0] || 'character');
          break;
        case 'update-state': {
          const charSlug = positional[0];
          const chNum = parseInt(positional[1]);
          if (!charSlug || isNaN(chNum)) {
            console.error('❌ Usage: bible update-state <char-slug> <chapter#> <json>');
            return;
          }
          let updates;
          try {
            updates = JSON.parse(positional[2] || '{}');
          } catch (e) {
            console.error(`❌ Invalid JSON: ${e.message}`);
            return;
          }
          bible.updateCharacterState(charSlug, chNum, updates);
          break;
        }
        case 'snapshot': {
          const snapCh = parseInt(positional[0]);
          if (isNaN(snapCh)) {
            console.error('❌ Chapter number required. Usage: bible snapshot <chapter#>');
            return;
          }
          bible.snapshot(snapCh);
          break;
        }
        case 'diff': {
          const diffCh1 = parseInt(positional[0]);
          const diffCh2 = parseInt(positional[1]);
          if (isNaN(diffCh1) || isNaN(diffCh2)) {
            console.error('❌ Two chapter numbers required. Usage: bible diff <ch1> <ch2>');
            return;
          }
          bible.diff(diffCh1, diffCh2);
          break;
        }
        case 'export':
          bible.export();
          break;
        case 'help':
        case '--help':
        case undefined:
          console.log('📖 Bible module. Commands: init, add, show, list, update-state, snapshot, diff, export');
          console.log('   Usage: node novel-master.mjs bible <command> [args] [--project slug]');
          break;
        default:
          console.error(`❌ Unknown bible command: ${command}`);
          showHelp();
      }
      break;
    }

    case 'check': {
      // ContinuityChecker expects (bible, chapters, project) — not projectSlug
      // Load bible from BibleManager, then load chapters from files
      const bibleMgr = new BibleManager(projectSlug);
      let bible = {};
      try { bible = bibleMgr.read(); } catch { /* No bible yet — use empty */ }

      // Helper: load chapter text from file path or chapter number
      function loadChapters(filePaths) {
        const chapters = {};
        for (const fp of filePaths) {
          const match = fp.match(/ch(?:apter)?[-_]?(\d+)/i);
          const num = match ? parseInt(match[1], 10) : 0;
          try {
            const content = fs.readFileSync(fp, 'utf8');
            chapters[num || fp] = content;
          } catch (e) {
            console.error(`⚠️ Could not read file: ${fp}`);
          }
        }
        return chapters;
      }

      function loadChaptersFromDir(dir) {
        const chapters = {};
        if (!fs.existsSync(dir)) { console.error(`❌ Directory not found: ${dir}`); return chapters; }
        const files = fs.readdirSync(dir).filter(f => f.endsWith('.md')).sort();
        for (const f of files) {
          const match = f.match(/ch(?:apter)?[-_]?(\d+)/i);
          const num = match ? parseInt(match[1], 10) : 0;
          try {
            chapters[num || f] = fs.readFileSync(path.join(dir, f), 'utf8');
          } catch { /* skip unreadable */ }
        }
        return chapters;
      }

      const checker = new ContinuityChecker(bible, {}, { slug: projectSlug });
      switch (command) {
        case 'scan': {
          if (!positional[0]) { console.error('❌ Chapter file required'); return; }
          const fp = positional[0];
          const chs = loadChapters([fp]);
          const chChecker = new ContinuityChecker(bible, chs, { slug: projectSlug });
          const nums = Object.keys(chs).map(Number).filter(n => !isNaN(n));
          if (nums.length > 0) {
            const result = chChecker.scan(nums[0]);
            console.log(JSON.stringify(result, null, 2));
          } else {
            console.error(`❌ Could not determine chapter number from: ${fp}`);
          }
          break;
        }
        case 'scan-all': {
          if (!positional[0]) { console.error('❌ Directory required'); return; }
          const chs = loadChaptersFromDir(positional[0]);
          const chChecker = new ContinuityChecker(bible, chs, { slug: projectSlug });
          const results = chChecker.scanAll();
          console.log(JSON.stringify(results, null, 2));
          break;
        }
        case 'scan-range': {
          const rangeStart = parseInt(positional[0]);
          const rangeEnd = parseInt(positional[1]);
          const rangeDir = positional[2];
          if (isNaN(rangeStart) || isNaN(rangeEnd) || !rangeDir) {
            console.error('❌ Usage: check scan-range <start#> <end#> <directory>');
            return;
          }
          const chs = loadChaptersFromDir(rangeDir);
          const chChecker = new ContinuityChecker(bible, chs, { slug: projectSlug });
          const results = chChecker.scanRange(rangeStart, rangeEnd);
          console.log(JSON.stringify(results, null, 2));
          break;
        }
        case 'help':
        case '--help':
        case undefined:
          console.log('🔍 Check module. Commands: scan, scan-all, scan-range');
          console.log('   Usage: node novel-master.mjs check <command> [args] [--project slug]');
          break;
        default:
          console.error(`❌ Unknown check command: ${command}`);
          showHelp();
      }
      break;
    }

    case 'prose': {
      const analyzer = new ProseAnalyzer(projectSlug);
      switch (command) {
        case 'baseline':
          if (positional.length > 0) analyzer.baseline(positional);
          else console.error('❌ At least one chapter file required');
          break;
        case 'check':
          if (positional[0]) analyzer.check(positional[0]);
          else console.error('❌ Chapter file required');
          break;
        case 'drift': {
          const driftStart = parseInt(positional[0]);
          const driftEnd = parseInt(positional[1]);
          const driftDir = positional[2];
          if (isNaN(driftStart) || isNaN(driftEnd) || !driftDir) {
            console.error('❌ Usage: prose drift <start#> <end#> <directory>');
            return;
          }
          analyzer.drift(driftStart, driftEnd, driftDir);
          break;
        }
        case 'help':
        case '--help':
        case undefined:
          console.log('✍️ Prose module. Commands: baseline, check, drift');
          console.log('   Usage: node novel-master.mjs prose <command> [args] [--project slug]');
          break;
        default:
          console.error(`❌ Unknown prose command: ${command}`);
          showHelp();
      }
      break;
    }

    case 'pace': {
      const tracker = new PacingTracker(projectSlug);
      switch (command) {
        case 'record': {
          const chapterNum = parseInt(positional[0]);
          if (isNaN(chapterNum)) {
            console.error('❌ Chapter number required. Usage: pace record <ch#> <B1> <B2>...');
            return;
          }
          const beats = positional.slice(1);
          if (beats.length === 0) {
            console.error('❌ At least one beat type required. Types: ACTION, TENSION, REVELATION, EMOTIONAL, QUIET, TRANSITION');
            return;
          }
          tracker.record(chapterNum, beats);
          break;
        }
        case 'curve': {
          const curveArc = parseInt(positional[0] || '1');
          if (isNaN(curveArc)) {
            console.error('❌ Usage: pace curve <arc#>');
            return;
          }
          tracker.curve(curveArc);
          break;
        }
        case 'suggest': {
          const suggestCh = parseInt(positional[0]);
          if (isNaN(suggestCh)) {
            console.error('❌ Chapter number required. Usage: pace suggest <next-ch#>');
            return;
          }
          tracker.suggest(suggestCh);
          break;
        }
        case 'report':
          tracker.report();
          break;
        case 'help':
        case '--help':
        case undefined:
          console.log('📈 Pace module. Commands: record, curve, suggest, report');
          console.log('   Usage: node novel-master.mjs pace <command> [args] [--project slug]');
          break;
        default:
          console.error(`❌ Unknown pace command: ${command}`);
          showHelp();
      }
      break;
    }

    case 'voice': {
      const manager = new VoiceManager(projectSlug);
      switch (command) {
        case 'add':
          if (!positional[0]) {
            console.error('❌ Slug required. Usage: voice add <slug> [--name "Name"]');
            return;
          }
          manager.addProfile(positional[0], flags);
          break;
        case 'build': {
          if (!positional[0] || !positional[1]) {
            console.error('❌ Usage: voice build <slug> <chapter.md>');
            return;
          }
          const dialogues = manager.extractDialogues(positional[1], flags.name || positional[0]);
          manager.buildFromSamples(positional[0], dialogues);
          break;
        }
        case 'check':
          if (!positional[0]) {
            console.error('❌ Chapter file required. Usage: voice check <chapter.md>');
            return;
          }
          manager.check(positional[0]);
          break;
        case 'compare':
          if (!positional[0] || !positional[1]) {
            console.error('❌ Two slugs required. Usage: voice compare <slug1> <slug2>');
            return;
          }
          manager.compare(positional[0], positional[1]);
          break;
        case 'report':
          manager.report();
          break;
        case 'help':
        case '--help':
        case undefined:
          console.log('🗣️ Voice module. Commands: add, build, check, compare, report');
          console.log('   Usage: node novel-master.mjs voice <command> [args] [--project slug]');
          break;
        default:
          console.error(`❌ Unknown voice command: ${command}`);
          showHelp();
      }
      break;
    }

    case 'publish': {
      const publisher = new Publisher(projectSlug);
      const dir = positional[0];
      const pubOptions = {
        title: flags.title,
        author: flags.author,
        cover: flags.cover,
        outputDir: flags.output,
        voice: flags.voice,
        arc: flags.arc ? parseInt(flags.arc) : undefined,
        bundle: flags.bundle === true || flags.bundle === 'true',
      };

      switch (command) {
        case 'epub':
          if (!dir) { console.error('❌ Chapters directory required. Usage: publish epub <dir> [--title ...] [--arc N] [--bundle]'); return; }
          await publisher.epub(dir, pubOptions);
          break;
        case 'pdf':
          if (!dir) { console.error('❌ Chapters directory required. Usage: publish pdf <dir> [--title ...]'); return; }
          await publisher.pdf(dir, pubOptions);
          break;
        case 'html':
          if (!dir) { console.error('❌ Chapters directory required. Usage: publish html <dir> [--title ...]'); return; }
          await publisher.html(dir, pubOptions);
          break;
        case 'qr':
          if (!dir) { console.error('❌ URL required. Usage: publish qr <url>'); return; }
          await publisher.qr(dir, pubOptions);
          break;
        case 'audiobook':
          if (!dir) { console.error('❌ Chapters directory required. Usage: publish audiobook <dir> [--voice ...]'); return; }
          await publisher.audiobook(dir, pubOptions);
          break;
        case 'all':
          if (!dir) { console.error('❌ Chapters directory required. Usage: publish all <dir> [--title ...]'); return; }
          await publisher.all(dir, pubOptions);
          break;
        case 'help':
        case '--help':
        case undefined:
          console.log(`
📦 PUBLISH MODULE — EPUB/PDF/HTML/QR/Audiobook

USAGE: node novel-master.mjs publish <command> <dir> [options]

COMMANDS:
  epub <dir>         Create EPUB3 Premium (with per-arc support)
  pdf <dir>          Create PDF (A5 format)
  html <dir>         Create responsive HTML web reader
  qr <url>           Generate QR code image
  audiobook <dir>    Create audiobook chapters (Edge-TTS)
  all <dir>          Run full publish pipeline

FLAGS:
  --title <name>     Book title (default: "Tiểu Thuyết")
  --author <name>    Author name (default: "Tiểu Tâm")
  --cover <path>     Cover image path for EPUB
  --arc <number>     Export ONLY chapters in this arc
  --bundle           Bundle ALL arcs into single "Toàn Tập" file
  --voice <name>     TTS voice (default: vi-VN-HoaiMyNeural)
  --output <dir>     Output directory

EXAMPLES:
  publish epub chapters/ --title "Trọng Sinh" --arc 1
  publish epub chapters/ --title "Trọng Sinh" --bundle
  publish all chapters/ --title "Trọng Sinh" --author "Nấng"
  publish qr https://example.com
`);
          break;
        default:
          console.error(`❌ Unknown publish command: ${command}`);
          showHelp();
      }
      break;
    }

    // ─── V2.1 New Modules ─────────────────────────────────────────────

    case 'pipeline': {
      if (!Orchestrator) {
        console.error('❌ Orchestrator module not available. Ensure utils/orchestrator.mjs exists.');
        return;
      }
      const orch = new Orchestrator(projectSlug);
      switch (command) {
        case 'status':
          orch.status(projectSlug);
          break;
        case 'advance':
          orch.advance(projectSlug);
          break;
        case 'reset':
          orch.reset(projectSlug);
          break;
        case 'help':
        case '--help':
        case undefined:
          console.log(`
🔄 PIPELINE MODULE — 10-Phase Pipeline Orchestrator (V2.1)

USAGE: node novel-master.mjs pipeline <command> [--project slug]

COMMANDS:
  status     Show current pipeline state (phase, progress, gates)
  advance    Advance to next phase (checks quality gates first)
  reset      Reset pipeline state to Phase 0

EXAMPLES:
  pipeline status --project trong-sinh
  pipeline advance --project trong-sinh
  pipeline reset --project trong-sinh
`);
          break;
        default:
          console.error(`❌ Unknown pipeline command: ${command}. Use: status, advance, reset`);
      }
      break;
    }

    case 'score': {
      if (!Scoring) {
        console.error('❌ Scoring module not available. Ensure utils/scoring.mjs exists.');
        return;
      }
      const scorer = new Scoring(projectSlug);
      switch (command) {
        case 'beat': {
          const beatFile = positional[0];
          if (!beatFile) { console.error('❌ Beat file required. Usage: score beat <file>'); return; }
          scorer.scoreBeat(beatFile);
          break;
        }
        case 'compare': {
          const v1 = positional[0];
          const v2 = positional[1];
          const v3 = positional[2];
          if (!v1 || !v2 || !v3) { console.error('❌ Three version files required. Usage: score compare <v1> <v2> <v3>'); return; }
          scorer.compare(v1, v2, v3);
          break;
        }
        case 'help':
        case '--help':
        case undefined:
          console.log(`
📊 SCORE MODULE — 7-Angle Beat Scoring (V2.1)

USAGE: node novel-master.mjs score <command> [args]

COMMANDS:
  beat <file>                Score a single beat file (7 angles)
  compare <v1> <v2> <v3>    Compare 3 beat versions side-by-side

ANGLES:
  1. Prose Quality    (20%)  — Flow, rhythm, vocabulary richness
  2. Consistency      (20%)  — Bible accuracy (names, locations, states)
  3. Character Voice  (15%)  — Dialogue authenticity, personality match
  4. Pacing           (15%)  — Beat timing, tension appropriateness
  5. AI Trace         (10%)  — Zero forbidden words, zero patterns
  6. Engagement       (10%)  — Hook quality, read-on compulsion
  7. Markdown/Format  (10%)  — Zero markdown in prose, clean format

EXAMPLES:
  score beat chapters/ch01-beat1-v1.md
  score compare beat1-v1.md beat1-v2.md beat1-v3.md
`);
          break;
        default:
          console.error(`❌ Unknown score command: ${command}. Use: beat, compare`);
      }
      break;
    }

    case 'route': {
      // Test intent detection on a message
      // Use getPositional() to strip --flag values properly, then join
      const routePositional = getPositional(args.slice(1));
      const message = routePositional.join(' ');
      if (!message) {
        console.error('❌ Message required. Usage: route <message>');
        console.log('   Example: route "viết chương 5"');
        return;
      }
      const router = new Router({});
      const detected = router.detectIntent(message);
      console.log(`\n🎯 Intent Detection Result:`);
      console.log(`   Intent:     ${detected.intent}`);
      console.log(`   Phase:      ${detected.phase || '—'}`);
      console.log(`   Modules:    ${detected.modules.join(', ') || '—'}`);
      console.log(`   Params:     ${JSON.stringify(detected.params)}`);
      console.log(`   Confidence: ${(detected.confidence * 100).toFixed(0)}%`);
      console.log(`   Raw:        "${detected.raw}"`);
      console.log();
      break;
    }

    case 'forge': {
      if (!Orchestrator) {
        console.error('❌ Orchestrator module not available. Ensure utils/orchestrator.mjs exists.');
        return;
      }
      const forgeOrch = new Orchestrator(projectSlug);
      switch (command) {
        case 'beat': {
          const ch = parseInt(positional[0]);
          const beat = parseInt(positional[1]);
          if (isNaN(ch) || isNaN(beat)) {
            console.error('❌ Chapter and beat numbers required. Usage: forge beat <ch#> <beat#> [--project slug]');
            return;
          }
          console.log(`\n🔥 Forging beat ${beat} of chapter ${ch} (3-version cycle)...`);
          console.log(`   Project: ${projectSlug}\n`);
          await forgeOrch.forgeBeat(ch, beat, projectSlug);
          break;
        }
        case 'chapter': {
          const ch = parseInt(positional[0]);
          if (isNaN(ch)) {
            console.error('❌ Chapter number required. Usage: forge chapter <ch#> [--project slug]');
            return;
          }
          console.log(`\n🔥 Forging chapter ${ch} (5 beats × 3 versions)...`);
          console.log(`   Project: ${projectSlug}\n`);
          await forgeOrch.forgeChapter(ch, projectSlug);
          break;
        }
        case 'help':
        case '--help':
        case undefined:
          console.log(`
🔥 FORGE MODULE — 3-Version Beat Forge Cycle (V2.1)

USAGE: node novel-master.mjs forge <command> [args] [--project slug]

COMMANDS:
  beat <ch#> <beat#>    Full 3-version forge cycle for a single beat
  chapter <ch#>         Full chapter forge (5 beats × 3 versions each)

PROCESS (per beat):
  1. Write version #1 (free approach)
  2. Write version #2 (reference #1, different angle)
  3. Write version #3 (reference #1+#2, new approach)
  4. Score all 3 versions (7-angle review)
  5. Select BEST or combine highlights
  6. Final scoring → must pass ≥ 9/10
  7. Retry up to 2 full cycles (6 versions max)

EXAMPLES:
  forge beat 5 1 --project trong-sinh
  forge chapter 5 --project trong-sinh
`);
          break;
        default:
          console.error(`❌ Unknown forge command: ${command}. Use: beat, chapter`);
      }
      break;
    }

    default:
      console.error(`❌ Unknown module: ${module}`);
      showHelp();
  }
}

main().catch(err => {
  console.error(`❌ ${err.message || err}`);
  process.exit(1);
});
