# Bible Schema Reference

## Overview

The Bible is the single source of truth for all story entities. It stores characters, locations, items, factions, history, and world rules in a structured JSON format. Every module in Novel Master reads from this Bible.

## Data File

Path: `data/[project-name]/bible.json`

## Top-Level Structure

```json
{
  "project": {
    "name": "Trọng Sinh Thành Đường Tam Tạng",
    "slug": "trong-sinh-thanh-duong-tam-tang",
    "genre": "xuyen-khong / tu-tien / hai-huoc",
    "pov": "first-person",
    "mc": "tran-huyen-trang",
    "created": "2026-01-15",
    "updated": "2026-03-10",
    "totalChapters": 20,
    "currentArc": 1
  },
  "characters": { ... },
  "locations": { ... },
  "items": { ... },
  "factions": { ... },
  "history": [ ... ],
  "worldRules": { ... },
  "snapshots": { ... }
}
```

## Characters Schema

Each character entry uses a slug key derived from their name.

```json
{
  "characters": {
    "tran-huyen-trang": {
      "identity": {
        "name": "Trần Huyền Trang",
        "aliases": ["Đường Tam Tạng", "Tam Tạng", "thằng nhóc họ Trần"],
        "age": 17,
        "gender": "male",
        "species": "human",
        "appearance": {
          "height": "trung bình",
          "build": "gầy, nhưng dẻo dai",
          "face": "mặt trắng, mày thanh mắt sáng, nhìn hiền nhưng ranh",
          "distinguishing": "vết sẹo nhỏ trên lông mày trái",
          "clothing": "áo tăng vàng nghệ, thắt lưng dây thừng"
        },
        "background": "Linh hồn hiện đại trọng sinh vào thân xác Trần Huyền Trang thời Đường"
      },
      "personality": {
        "traits": ["mưu mẹo", "hài hước đen", "thực dụng", "trung thành ngầm"],
        "motivations": ["sinh tồn", "hiểu bản chất thỉnh kinh", "bảo vệ đồng đội"],
        "fears": ["chết lần nữa", "không kiểm soát được tình huống"],
        "desires": ["tự do thật sự", "giải mã game thỉnh kinh"],
        "moralCompass": "xám — làm đúng theo cách riêng, không theo khuôn mẫu",
        "quirks": ["hay tự nói chuyện trong đầu", "thích ăn ngon", "ghét giả đạo đức"]
      },
      "relationships": [
        {
          "target": "ton-ngo-khong",
          "nature": "sư đồ trên danh nghĩa, thực chất là đồng đội ngang hàng",
          "evolution": [
            { "chapter": 1, "state": "xa lạ, đề phòng" },
            { "chapter": 10, "state": "bắt đầu tin tưởng" },
            { "chapter": 18, "state": "chiến hữu thật sự" }
          ],
          "notes": "Tao biết nó mạnh nhưng cũng biết nó kiêu. Phải dùng mưu."
        }
      ],
      "voice": {
        "vocabularyLevel": "street-educated",
        "sentenceStyle": "short-punchy-with-occasional-sarcasm",
        "catchphrases": [
          "Đời không như là mơ, thí chủ ạ",
          "Tao là sư phụ, nhưng tao không ngu"
        ],
        "dialect": "modern-vietnamese-in-ancient-setting",
        "emotionalExpression": {
          "anger": "mỉa mai lạnh, không la hét",
          "joy": "cười khẩy, hiếm khi cười thật",
          "fear": "phân tích nhanh thay vì hoảng",
          "love": "không nói thẳng, thể hiện qua hành động"
        },
        "forbiddenWords": ["a di đà phật (nói nghiêm túc)", "thiện tai thiện tai (không mỉa mai)"],
        "speechQuirks": ["hay chêm tiếng lóng hiện đại vào bối cảnh cổ", "tự bình luận trong đầu bằng giọng narrator"]
      },
      "arc": {
        "type": "transformation",
        "trajectory": [
          { "phase": "opening", "state": "hoang mang, phải giả vờ là sư phụ" },
          { "phase": "rising", "state": "bắt đầu thích vai này, phát hiện sức mạnh ẩn" },
          { "phase": "midpoint", "state": "nhận ra thỉnh kinh không đơn giản" },
          { "phase": "climax", "state": "đối diện với bản chất thật của mình" },
          { "phase": "resolution", "state": "chấp nhận và vượt qua" }
        ]
      },
      "states": {
        "ch01": {
          "location": "Chùa Pháp Môn, Trường An",
          "condition": "vừa trọng sinh, yếu, hoang mang",
          "knowledge": ["biết mình trọng sinh", "biết cốt truyện Tây Du Ký"],
          "possessions": ["áo tăng cũ", "bình bát sứt mẻ"],
          "powerLevel": 0,
          "notes": "Vừa tỉnh dậy trong thân xác sư thầy"
        },
        "ch10": {
          "location": "Đường đến Hỏa Diệm Sơn",
          "condition": "khỏe hơn, bắt đầu có nội lực",
          "knowledge": ["biết cốt truyện + đã sửa vài điểm", "hiểu hệ thống tu luyện"],
          "possessions": ["áo tăng vàng (mới)", "tích trượng", "bình bát"],
          "powerLevel": 15,
          "notes": "Đã thu phục Ngộ Không, đang trên đường"
        }
      }
    }
  }
}
```

### Character Fields Explained

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| identity.name | string | YES | Full name as used in narrative |
| identity.aliases | string[] | YES | All names/nicknames used to refer to character |
| identity.age | number | YES | Age at story start |
| identity.appearance | object | YES | Physical description fields |
| identity.background | string | YES | One-line backstory |
| personality.traits | string[] | YES | 3-5 core personality traits |
| personality.motivations | string[] | YES | What drives them |
| personality.fears | string[] | YES | What they avoid/dread |
| personality.moralCompass | string | YES | Ethical alignment description |
| relationships | array | YES | All significant relationships |
| voice | object | YES | Speech patterns (see Voice Guide) |
| arc | object | NO | Character arc trajectory |
| states | object | YES | Per-chapter snapshots |

### States: The Living Bible

The `states` object is the most critical part. It captures the character's situation at each chapter checkpoint. When the Continuity Checker scans a chapter, it compares against the most recent state snapshot.

**When to create a state snapshot:**
- After every chapter during SHIP phase (Phase 6)
- When a significant change occurs (location, possession, knowledge, injury, death)
- At arc boundaries

**State fields:**

| Field | Description |
|-------|-------------|
| location | Where the character is at end of chapter |
| condition | Physical/mental state |
| knowledge | List of things character now knows |
| possessions | Current inventory |
| powerLevel | Numeric power level (0-100 scale) |
| notes | Freeform notes about state |

## Locations Schema

```json
{
  "locations": {
    "chua-phap-mon": {
      "name": "Chùa Pháp Môn",
      "type": "temple",
      "region": "Trường An, Đại Đường",
      "geography": {
        "terrain": "đồng bằng, trong thành phố",
        "climate": "ôn đới, 4 mùa rõ rệt",
        "landmarks": ["chính điện", "tháp kinh", "vườn thiền"]
      },
      "culture": {
        "population": "vài chục tăng nhân",
        "language": "Hán ngữ cổ",
        "customs": "Phật giáo Đại Thừa",
        "politics": "dưới sự bảo trợ của triều đình"
      },
      "connections": [
        { "to": "truong-an", "distance": "trong thành", "travelTime": "đi bộ 1 khắc" }
      ],
      "firstAppearance": 1,
      "significance": "Nơi MC trọng sinh, khởi điểm hành trình"
    }
  }
}
```

## Items Schema

```json
{
  "items": {
    "tich-truong": {
      "name": "Tích Trượng Cửu Hoàn",
      "type": "weapon-artifact",
      "description": "Gậy vàng 9 vòng, Phật tổ ban tặng",
      "properties": {
        "material": "kim cang bất hoại",
        "weight": "nặng với người thường, nhẹ với người được chọn",
        "powers": ["trấn yêu", "khai quang", "chỉ đường"],
        "limitations": ["chỉ phát huy khi tâm chính", "không dùng để sát sinh vô cớ"]
      },
      "owner": "tran-huyen-trang",
      "ownerHistory": [
        { "chapter": 1, "owner": "nhà chùa (trưng bày)" },
        { "chapter": 3, "owner": "tran-huyen-trang", "event": "được Phật tổ trao" }
      ],
      "firstAppearance": 1,
      "currentLocation": "trên tay Huyền Trang"
    }
  }
}
```

## Factions Schema

```json
{
  "factions": {
    "thien-dinh": {
      "name": "Thiên Đình",
      "type": "divine-government",
      "leader": "ngoc-hoang",
      "goals": ["duy trì trật tự tam giới", "kiểm soát yêu ma"],
      "attitude": {
        "toMC": "ủng hộ bề mặt, nghi ngờ bên trong",
        "toFaction:yeu-gioi": "đối địch",
        "toFaction:phat-gioi": "hợp tác thận trọng"
      },
      "members": ["ngoc-hoang", "thai-bach-kim-tinh", "thua-thien-vong"],
      "resources": ["thiên binh thiên tướng", "pháp bảo", "mạng lưới do thám"],
      "firstAppearance": 5
    }
  }
}
```

## History (Timeline) Schema

```json
{
  "history": [
    {
      "event": "Tôn Ngộ Không đại náo thiên cung",
      "when": "500 năm trước thời điểm truyện",
      "participants": ["ton-ngo-khong", "ngoc-hoang"],
      "consequences": ["Ngộ Không bị nhốt Ngũ Hành Sơn", "Thiên Đình tổn thất"],
      "mentionedInChapters": [1, 5, 12],
      "type": "backstory"
    },
    {
      "event": "Huyền Trang trọng sinh",
      "when": "Chương 1, ngày 1",
      "participants": ["tran-huyen-trang"],
      "consequences": ["MC chiếm thân xác", "bắt đầu hành trình"],
      "mentionedInChapters": [1],
      "type": "plot"
    }
  ]
}
```

## World Rules Schema

```json
{
  "worldRules": {
    "magic": {
      "system": "tu luyện + Phật pháp + yêu thuật",
      "levels": ["phàm nhân", "luyện khí", "trúc cơ", "kim đan", "nguyên anh", "hoá thần", "đại thừa", "độ kiếp"],
      "rules": [
        "Tu luyện cần ngộ tính + tài nguyên",
        "Phật pháp mạnh nhất chống yêu ma nhưng yêu cầu tâm tính",
        "Yêu thuật mạnh nhưng có phản phệ (karma)"
      ],
      "limitations": [
        "Không thể hồi sinh người chết quá 7 ngày",
        "Thiên đạo cấm can thiệp trực tiếp vào nhân gian"
      ]
    },
    "physics": {
      "notes": "Cơ bản giống thế giới thật nhưng có thần thông, bay, biến hình"
    },
    "society": {
      "notes": "Đại Đường thời Lý Thế Dân, Phật giáo được trọng, nho giáo nền tảng"
    }
  }
}
```

## Snapshots

Snapshots are automatic backups of all character states at a chapter boundary:

```json
{
  "snapshots": {
    "ch05": {
      "timestamp": "2026-02-15T10:30:00Z",
      "characterStates": {
        "tran-huyen-trang": { "location": "...", "condition": "...", ... },
        "ton-ngo-khong": { "location": "...", "condition": "...", ... }
      },
      "notes": "Kết thúc arc đầu tiên, bắt đầu hành trình thật sự"
    }
  }
}
```

## Operations

### Add Character
1. Generate slug from name
2. Create entry with all required fields
3. Set initial state (ch00 or first appearance chapter)
4. Cross-reference with existing characters for relationships

### Update State
1. Read current state
2. Apply changes (only changed fields)
3. Record what changed and why
4. Validate: no impossible transitions (dead → alive without explanation)

### Bible Diff
Compare two snapshots to show what changed between chapters:
- Characters added/removed
- Location changes
- Power level changes
- Possession changes
- Relationship evolution

### Export
Generate human-readable markdown from Bible JSON:
- Character profiles with current state
- Location guide
- Item catalog
- Faction overview
- Timeline of events
