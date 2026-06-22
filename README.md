# Novel Master v2.0.0 — OpenClaw Skill

## Hệ thống quản lý, bảo vệ tính nhất quán, forge orchestration, và xuất bản cho tiểu thuyết dài.

### What's New in V2.0

- **10-Phase Pipeline Orchestrator** — End-to-end từ Setup → EPUB Export
- **6-Angle Beat Review** — Thẩm định đa diện: Prose, Consistency, Voice, Pacing, AI Trace, Engagement
- **Quality Gate ≥ 9/10** — Nâng chuẩn từ 8.5 lên 9/10 mỗi beat
- **Forge Rules (A1-A5)** — Quy tắc viết bất biến
- **23-Skill Coordination Map** — Biết chính xác skill nào vào phase nào
- **Auto-Trigger Detection** — Tự nhận diện intent từ Vietnamese/English
- **Retry Logic** — Max 3 retries per beat → escalate

### 7 Modules

| # | Module | Chức năng |
|---|--------|----------|
| 1 | 📚 Bible Manager | CRUD Character Bible + World Bible |
| 2 | 🔍 Continuity Checker | 30+ rules scan mâu thuẫn, plot holes |
| 3 | ✍️ Prose Analyzer | Phân tích prose tiếng Việt (7 categories), phát hiện lệch giọng |
| 4 | 📈 Pacing Tracker | 6 beat types, tension curve, pacing rules |
| 5 | 🎭 Voice Manager | Speech patterns, catchphrases, vocabulary, differentiation |
| 6 | 📦 Publisher | EPUB Premium, PDF, HTML Reader, QR Code, Audiobook |
| 7 | 🎯 Pipeline Orchestrator | 10-Phase, 23-skill coordination, auto-trigger |

### 10-Phase Pipeline

```
P0 SETUP → P1 PLAN → P2 PRE-FORGE → P3 FORGE → P4 GUARD
    ↓           ↓           ↓            ↓          ↓
P5 REVIEW → P6 SHIP → P7 ARC-REVIEW → P8 BIÊN TẬP → P9 EPUB
```

### Quick Start

```bash
alias nm='node ~/.openclaw/workspace/skills/novel-master/scripts/novel-master.mjs'

# Bible
nm bible init "Trọng Sinh Thành Đường Tam Tạng"
nm bible add character "Trần Huyền Trang" --age 17

# Check
nm check scan chapters/ch21.md
nm check scan-all chapters/

# Style
nm prose baseline chapters/ch01.md chapters/ch02.md
nm prose check chapters/ch21.md

# Pacing
nm pace record 21 ACTION TENSION REVELATION EMOTIONAL QUIET
nm pace suggest 22

# Voice
nm voice check chapters/ch21.md
nm voice compare tran-huyen-trang ton-ngo-khong

# Publish
nm publish all chapters/ --title "Trọng Sinh Đường Tam Tạng" --author "Tiểu Tâm"
```

### Dependencies

- OpenClaw (any version)
- Node.js 18+
- pandoc, qrencode, wkhtmltopdf (for Publisher)
- edge-tts (for Audiobook)

### Tác Giả

Tiểu Tâm 🦊 — V1.0-1.2 forged by SuperBuild-OpenBuild + StepForge Protocol. V2.0 upgraded with BluePrint tinh tuý.

### License

MIT
