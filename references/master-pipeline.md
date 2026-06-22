# MASTER PIPELINE — Quy Trình Viết Tiểu Thuyết 9 Phase
# Lệnh anh Nấng 2026-03-10 23:37 CET
# GHI NHỚ VĨNH VIỄN — Áp dụng cho MỌI tiểu thuyết

## Tổng Quan
```
Phase 0 → Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6 → Phase 7 → Phase 8 → Phase 9
SETUP     PLAN      PRE-FORGE  FORGE      GUARD      REVIEW     SHIP       ARC-REVIEW BIÊN TẬP   EPUB
(1 lần)   (mỗi arc) (mỗi ch.)  (mỗi beat) (mỗi ch.)  (mỗi ch.)  (mỗi ch.)  (mỗi arc)  (toàn bộ)  (cuối)
```

## PHASE 0: SETUP (1 lần duy nhất)
- novel-guardian bible build → Kinh Điển Nhân Vật + Thế Giới
- cw-style-skill-creator → phân tích 20 chương đầu → style guide
- Tạo tracker: tiến độ, word count, quality scores
- Output: Bible JSON + style-guide.md + tracker.json

## PHASE 1: PLAN (mỗi arc)
- Research bối cảnh lịch sử/địa lý (nếu cần)
- Outline arc: conflict chính + twist + character arcs
- Chia chương: 5 beats/chương, tóm tắt mỗi beat
- cw-brainstorming → brainstorm chi tiết
- Output: outline-arcX.md

## PHASE 2: PRE-FORGE (mỗi chương)
- novel-guardian bible check → nhân vật ở đâu, trạng thái, power level
- cw-brainstorming → detail 5 beats cụ thể
- Output: beats-chXX.md

## PHASE 3: FORGE (mỗi beat)
- Viết 1 beat (400-600 từ, 0 markdown, 0 AI trace)
- cw-prose-writing → apply style guide
- Spawn thẩm định đa diện → ≥9/10?
  - FAIL → viết lại beat
  - PASS → spawn beat tiếp
- Lặp cho 5 beats
- Output: 5 beats PASS

## PHASE 4: GUARD (mỗi chương)
- Ghép 5 beats → chương hoàn chỉnh
- novel-guardian scan → 0 critical
- novel-guardian pacing → nhịp OK
- novel-guardian style → giọng nhất quán
- Fix nếu FAIL → quay lại Phase 3
- Output: chXX-guarded.md

## PHASE 5: REVIEW (mỗi chương)
- cw-story-critique → feedback chất lượng
- humanize → clean AI patterns
- Quality gate: ≥9/10 + critique PASS
- Output: chXX-FINAL.md

## PHASE 6: SHIP (mỗi chương)
- Gửi file FINAL lên Telegram + báo cáo
- novel-guardian bible sync → cập nhật Bible
- cw-official-docs → update wiki
- Tracker → cập nhật tiến độ
- Auto spawn chương tiếp
- Lặp Phase 2-6 cho tới hết truyện
- Format tên file: [Tên Chương]_Tiểu-Tâm_FINAL.md

## PHASE 7: ARC REVIEW (mỗi arc xong)
- novel-guardian report → tổng quan arc
- cw-story-critique → review toàn arc
- Pacing curve → pattern lặp?
- Lessons learned → lưu memory
- Output: arc-review-X.md

## PHASE 8: BIÊN TẬP SIÊU KỸ (khi toàn bộ DONE)
- Rà soát từng beat (400-600 từ/lần)
- Giọng nhất quán toàn bộ chương
- novel-guardian scan TOÀN BỘ → fix
- Pacing curve toàn truyện → balance
- Style drift check → sửa
- Humanize pass cuối → 0% AI trace
- Output: toàn bộ chương FINAL-EDITED

## PHASE 9: EPUB PREMIUM EXPORT
- Generate bìa (AI hoặc cung cấp)
- Build front matter (title, copyright, dedication, author's note, TOC, map)
- Build body (chapters + part dividers + drop caps)
- Build back matter (afterword, character guide, glossary, timeline, acknowledgments, about author + QR)
- Pandoc → EPUB3 + custom CSS (bảng màu Tiểu Tâm)
- Test trên reader
- Gửi EPUB lên Telegram
- 📚 SẴN SÀNG PHÁT HÀNH

## QUALITY GATES TỔNG HỢP
| Phase | Gate | Tiêu chuẩn PASS |
|-------|------|-----------------|
| Plan | Outline | ≥3 conflict + ≥1 twist per arc |
| Forge | Mỗi beat | ≥9/10, thẩm định đa diện |
| Guard | Chương | 0 critical, ≤2 warnings, pacing OK |
| Review | Critique | Critique PASS, Humanize 0% AI |
| Ship | File | Gửi Telegram + Bible synced |
| Biên tập | Toàn bộ | Giọng nhất quán, 0 plot hole, 0 AI trace |
| EPUB | Final | Format đúng, đọc tốt trên reader, QR hoạt động |

## 23 SKILL THAM GIA
| # | Skill | Vai trò | Phase |
|---|-------|---------|-------|
| 1 | omni-forge-novel | Render prose chính | 3 |
| 2 | novel-guardian | Scan mâu thuẫn, Bible, pacing, style | 2,4,7,8 |
| 3 | cw-brainstorming | Brainstorm outline + beats | 1,2 |
| 4 | cw-prose-writing | Apply style guide | 3 |
| 5 | cw-story-critique | Phê bình chất lượng | 5,7 |
| 6 | cw-style-skill-creator | Tạo style guide | 0 |
| 7 | cw-official-docs | Cập nhật wiki/character profiles | 6 |
| 8 | cw-router | Điều phối cw- skills | Mọi phase |
| 9 | humanize | Loại dấu vết AI | 5,8 |
| 10 | novel-master publish | Xuất EPUB3 Premium | 9 |
| 11 | novel-master qr | Tạo QR code | 9 |
| 12 | infinity-memory | Bộ nhớ dài hạn xuyên session | Mọi phase |
| 13 | self-improving | Học từ lỗi, tiến hoá | 7 |
| 14 | deep-research-pro | Research bối cảnh lịch sử | 1 |
| 15 | translate | Dịch đa ngữ nếu cần | 9 |
| 16 | think-cog | Suy luận phức tạp | 1,2 |
| 17 | brainstorm | Sinh ý tưởng nhanh | 1,2 |
| 18 | mula-ralph | Self-driving loop | 3,6 |
| 19 | mula-audit | Multi-agent review | 5,7 |
| 20 | mula-forge-code | Pipeline dev (cho tool) | 0 |
| 21 | edge-tts | Audiobook | 9 |
| 22 | svg-draw | Minh hoạ nếu cần | 9 |
| 23 | diagram | Sơ đồ thế giới | 0 |

## GHI CHÚ
- Tiêu chuẩn beat: ≥9/10 (NÂNG từ ≥8.5 lên ≥9)
- File name format: [Tên Tiếng Việt Có Dấu]_Tiểu-Tâm_FINAL.md
- Tác giả: Tiểu Tâm (trên mọi bản phát hành)
- QR URL: https://www.facebook.com/profile.php?id=61588560594683
