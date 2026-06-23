# novel-master — All-in-one novel quality guardian and forge orchestrator

> One skill to write, review, and publish novels at scale. A 10-phase pipeline with multi-version beat forging, 30+ continuity rules, and EPUB Premium output — coordinating 23 sub-skills.

[![OpenClaw Skill](https://img.shields.io/badge/OpenClaw-Skill-blueviolet)](https://github.com/NachaFromMars)

## Overview
novel-master v2.1 is an all-in-one orchestrator that unites quality guarding and creative forging into a single workflow. Seven integrated modules share a common data layer to ensure consistency across hundreds of chapters. The 10-phase pipeline covers the full novel lifecycle from character bible to EPUB Premium publishing. V2.1 key additions: 3-Version Beat Forge (write 3 independent versions → select/mix BEST), 7-angle review (adds Markdown + Format checks), integrated Markdown+AI clean in beat review, EPUB Per-Arc Strategy (each arc = 1 book, sell individually or bundled), 2-cycle retry (6 versions max before escalation).

## Features
- **7 modules** — Bible, Scanner, Pacing, Style, Beat Forge, Review, Publisher
- **10-phase pipeline** — end-to-end from outline to published EPUB
- **30+ continuity rules** — timeline, character, world, plot contradiction detection
- **6-angle beat review** + 7-angle in V2.1 (adds Markdown + Format)
- **Prose style + pacing curve + character voice** analysis
- **EPUB Per-Arc** — each story arc = one standalone book
- **23 sub-skills coordinated** automatically

## Usage / Quick Start
```bash
node scripts/novel-master.mjs <module> <command> --project <name>
```
Routes automatically between modules based on task.

## Trigger Keywords (OpenClaw)
novel guardian, bible, continuity check, plot hole, prose style, pacing, character voice, scan chapter, write chapter, forge chapter, export epub

## Related Skills
- [novel-guardian](https://github.com/NachaFromMars/novel-guardian) — focused continuity guardian module
- [novelcore-ai](https://github.com/NachaFromMars/novelcore-ai) — AI writing system
- [omni-forge-novel](https://github.com/NachaFromMars/omni-forge-novel) — literary forge system

---
Part of the [NachaFromMars](https://github.com/NachaFromMars) OpenClaw skill ecosystem.
