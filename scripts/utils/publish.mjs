/**
 * Novel Master v2.1 — Publish Module (EPUB Premium)
 * Gộp chương, xuất EPUB/PDF/HTML/QR/Audiobook
 * 
 * EPUB Premium theo quy tắc Phần E:
 * - Front Matter: bìa trong, bản quyền, đề tặng, lời tác giả, mục lục, bản đồ
 * - Body: trang chia arc + chapters với drop caps
 * - Back Matter: lời bạt, phụ lục nhân vật, thuật ngữ, niên biểu, cảm ơn, về tác giả, QR
 * - CSS: bảng màu Tiểu Tâm, Noto Serif, line-height 1.7, EPUB3
 */

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'fs';
import { join, basename, dirname, resolve } from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const TEMPLATES_DIR = join(__dirname, '..', 'templates');

// ═══════════════════════════════════════════
// COMBINE — Gộp chapters → 1 file markdown
// ═══════════════════════════════════════════
export async function combineChapters(chaptersDir, options = {}) {
  const { title = 'Tiểu Thuyết', outputDir } = options;
  const outDir = outputDir || join(chaptersDir, '..', 'publish');
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

  const files = readdirSync(chaptersDir)
    .filter(f => f.endsWith('.md'))
    .sort((a, b) => {
      const numA = parseInt(a.match(/\d+/)?.[0] || '0');
      const numB = parseInt(b.match(/\d+/)?.[0] || '0');
      return numA - numB;
    });

  if (files.length === 0) throw new Error(`Không tìm thấy file .md trong ${chaptersDir}`);

  // Tạo mục lục
  let combined = `# ${title}\n\n## Mục Lục\n\n`;
  files.forEach((f, i) => {
    const name = f.replace('.md', '').replace(/[-_]/g, ' ');
    combined += `${i + 1}. ${name}\n`;
  });
  combined += '\n---\n\n';

  // Gộp nội dung
  files.forEach(f => {
    const content = readFileSync(join(chaptersDir, f), 'utf8');
    combined += content + '\n\n---\n\n';
  });

  const outFile = join(outDir, `${slugify(title)}-combined.md`);
  writeFileSync(outFile, combined);
  console.log(`✅ Gộp ${files.length} chương → ${outFile}`);
  return { output: outFile, chapters: files.length };
}

// ═══════════════════════════════════════════
// EPUB PREMIUM — Xuất EPUB3 chuẩn xuất bản
// ═══════════════════════════════════════════
export async function createEpubPremium(chaptersDir, options = {}) {
  const {
    title = 'Tiểu Thuyết',
    author = 'Tiểu Tâm',
    cover,
    outputDir,
    dedication,
    authorNote,
    afterword,
    acknowledgments,
    aboutAuthor,
    qrUrl = 'https://www.facebook.com/profile.php?id=61588560594683',
    bibleDir,  // cho auto-generate character guide + glossary + timeline
    arcs = [],  // [{name: "Arc 1", subtitle: "...", chapters: [1,10]}]
    mapImage,  // bản đồ thế giới
    glossary = [], // [{term, definition}]
    lang = 'vi',
    arc,       // Per-arc: chỉ include chapters trong arc này (number)
    bundle,    // Bundle: gom TẤT CẢ arc thành 1 file Toàn Tập
    seriesName, // Tên series
    seriesNumber, // Số quyển trong series
  } = options;

  const outDir = outputDir || join(chaptersDir, '..', 'publish');
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

  const tempDir = join(outDir, '.epub-temp');
  if (!existsSync(tempDir)) mkdirSync(tempDir, { recursive: true });

  // 1. Đọc chapters
  const files = readdirSync(chaptersDir)
    .filter(f => f.endsWith('.md'))
    .sort((a, b) => {
      const numA = parseInt(a.match(/\d+/)?.[0] || '0');
      const numB = parseInt(b.match(/\d+/)?.[0] || '0');
      return numA - numB;
    });

  if (files.length === 0) throw new Error(`Không tìm thấy file .md trong ${chaptersDir}`);

  // ── Per-Arc Filtering ──
  let filteredFiles = files;
  let activeArc = null;
  let nextArc = null;
  let isBundle = !!bundle;

  if (arc && arcs.length > 0) {
    // Find the requested arc
    const arcIdx = arcs.findIndex(a => {
      const arcNum = arcs.indexOf(a) + 1;
      return arcNum === arc;
    });
    if (arcIdx >= 0) {
      activeArc = arcs[arcIdx];
      nextArc = arcs[arcIdx + 1] || null;
      const [start, end] = activeArc.chapters || [1, files.length];
      filteredFiles = files.filter(f => {
        const num = parseInt(f.match(/\d+/)?.[0] || '0');
        return num >= start && num <= end;
      });
      console.log(`📖 Arc ${arc}: "${activeArc.name}" — chương ${start}→${end} (${filteredFiles.length} chương)`);
    } else {
      console.warn(`⚠️ Arc ${arc} không tìm thấy trong danh sách arcs. Xuất toàn bộ.`);
    }
  } else if (arc && arcs.length === 0) {
    console.warn(`⚠️ Flag --arc được set nhưng không có arcs[] config. Xuất toàn bộ.`);
  }

  if (isBundle) {
    filteredFiles = files; // Toàn Tập = tất cả
    console.log(`📚 Bundle mode: Toàn Tập — ${filteredFiles.length} chương`);
  }

  // 2. Build EPUB source markdown với Front + Body + Back Matter
  let epubSource = '';

  // ── FRONT MATTER ──

  // Series title page (nếu có series)
  if (seriesName) {
    epubSource += `<div class="series-page" style="text-align:center; page-break-after:always; padding-top:40%;">\n`;
    epubSource += `<p class="series-name" style="font-size:1.2em; color:#C9A96E; letter-spacing:0.15em;">${seriesName}</p>\n`;
    if (seriesNumber) {
      epubSource += `<p class="series-number" style="font-size:1.5em; margin-top:0.5em;">Quyển ${seriesNumber}</p>\n`;
    }
    if (activeArc) {
      epubSource += `<p class="arc-subtitle" style="font-size:1.1em; margin-top:0.5em; color:#8B1A2F;">${activeArc.name}</p>\n`;
    }
    if (isBundle) {
      epubSource += `<p class="bundle-label" style="font-size:1.1em; margin-top:0.5em; color:#8B1A2F;">— Toàn Tập —</p>\n`;
    }
    epubSource += `</div>\n\n`;
  }

  // Trang bìa trong (Title Page)
  epubSource += `<div class="title-page">\n`;
  epubSource += `<h1>${title}</h1>\n`;
  epubSource += `<p class="author">${author}</p>\n`;
  epubSource += `<p class="publisher">Novel Master v2.1 Premium Edition</p>\n`;
  epubSource += `</div>\n\n`;

  // Trang bản quyền
  const year = new Date().getFullYear();
  epubSource += `<div class="copyright-page">\n`;
  epubSource += `<p>© ${year} ${author}. Bảo lưu mọi quyền.</p>\n`;
  epubSource += `<p>Xuất bản bởi Novel Master v2.1</p>\n`;
  epubSource += `<p>Không được sao chép dưới bất kỳ hình thức nào</p>\n`;
  epubSource += `<p>mà không có sự đồng ý bằng văn bản của tác giả.</p>\n`;
  epubSource += `<p style="margin-top:2em;">ISBN: (Đang cập nhật)</p>\n`;
  epubSource += `</div>\n\n`;

  // Lời đề tặng
  if (dedication) {
    epubSource += `<div class="dedication">\n`;
    epubSource += `<p>${dedication}</p>\n`;
    epubSource += `</div>\n\n`;
  }

  // Lời tác giả / Preface
  if (authorNote) {
    epubSource += `# Lời Tác Giả\n\n${authorNote}\n\n`;
  }

  // Bản đồ thế giới
  if (mapImage && existsSync(mapImage)) {
    epubSource += `<div style="text-align:center; page-break-after:always;">\n`;
    epubSource += `<h2>Bản Đồ Thế Giới</h2>\n`;
    epubSource += `<img src="${mapImage}" alt="Bản đồ thế giới" />\n`;
    epubSource += `</div>\n\n`;
  }

  // ── BODY — Chapters ──

  let chapterNum = 0;
  filteredFiles.forEach(f => {
    chapterNum++;
    const globalNum = parseInt(f.match(/\d+/)?.[0] || '0');
    let content = readFileSync(join(chaptersDir, f), 'utf8');

    // Kiểm tra xem chương này có bắt đầu arc mới không
    if (arcs.length > 0) {
      const arcMatch = arcs.find(a => a.chapters && a.chapters[0] === globalNum);
      if (arcMatch) {
        epubSource += `<div class="part-page">\n`;
        epubSource += `<h1>${arcMatch.name}</h1>\n`;
        if (arcMatch.subtitle) epubSource += `<p class="part-subtitle">${arcMatch.subtitle}</p>\n`;
        epubSource += `</div>\n\n`;
      }
    }

    // Thêm class chapter + drop cap cho đoạn đầu
    epubSource += `<div class="chapter">\n\n`;

    // Tìm paragraph đầu tiên và thêm class drop-cap
    const lines = content.split('\n');
    let foundFirstParagraph = false;
    const processedLines = lines.map(line => {
      if (!foundFirstParagraph && line.trim() && !line.startsWith('#') && !line.startsWith('---')) {
        foundFirstParagraph = true;
        return `<p class="drop-cap">${line}</p>`;
      }
      return line;
    });

    epubSource += processedLines.join('\n');
    epubSource += `\n\n</div>\n\n`;
  });

  // ── Teaser Arc Tiếp (Per-Arc mode) ──
  if (activeArc && nextArc) {
    epubSource += `<div class="teaser-page" style="page-break-before:always; text-align:center; padding-top:30%;">\n`;
    epubSource += `<p style="font-size:0.9em; color:#C9A96E; letter-spacing:0.2em;">SẮP RA MẮT</p>\n`;
    epubSource += `<h2 style="color:#8B1A2F; margin-top:1em;">${nextArc.name}</h2>\n`;
    if (nextArc.subtitle) {
      epubSource += `<p style="font-style:italic; margin-top:0.5em;">${nextArc.subtitle}</p>\n`;
    }
    epubSource += `<p style="margin-top:2em; font-size:0.85em; color:#888;">Đón đọc phần tiếp theo...</p>\n`;
    epubSource += `</div>\n\n`;
  }

  // ── BACK MATTER ──

  // Lời bạt (Afterword)
  if (afterword) {
    epubSource += `# Lời Bạt\n\n${afterword}\n\n`;
  }

  // Phụ lục nhân vật — auto-generate từ Bible
  if (bibleDir && existsSync(join(bibleDir, 'characters'))) {
    epubSource += `<div class="character-guide">\n\n`;
    epubSource += `# Phụ Lục Nhân Vật\n\n`;

    const charDir = join(bibleDir, 'characters');
    const charFiles = readdirSync(charDir).filter(f => f.endsWith('.json'));
    charFiles.forEach(f => {
      try {
        const char = JSON.parse(readFileSync(join(charDir, f), 'utf8'));
        epubSource += `<div class="character-entry">\n`;
        epubSource += `<h3>${char.name || f.replace('.json', '')}</h3>\n`;
        if (char.aliases?.length) {
          epubSource += `<p class="aliases">Biệt danh: ${char.aliases.join(', ')}</p>\n`;
        }
        if (char.attributes) {
          const attrs = [];
          if (char.attributes.age) attrs.push(`Tuổi: ${char.attributes.age}`);
          if (char.attributes.cultivation) attrs.push(`Tu vi: ${char.attributes.cultivation}`);
          if (char.attributes.faction) attrs.push(`Phe: ${char.attributes.faction}`);
          if (attrs.length) epubSource += `<p>${attrs.join(' | ')}</p>\n`;
        }
        if (char.notes?.length) {
          epubSource += `<p>${char.notes[0]}</p>\n`;
        }
        epubSource += `</div>\n\n`;
      } catch (e) { /* skip invalid */ }
    });
    epubSource += `</div>\n\n`;
  }

  // Thuật ngữ (Glossary)
  if (glossary.length > 0) {
    epubSource += `# Thuật Ngữ\n\n<dl class="glossary">\n`;
    glossary.forEach(g => {
      epubSource += `<dt>${g.term}</dt>\n<dd>${g.definition}</dd>\n`;
    });
    epubSource += `</dl>\n\n`;
  }

  // Niên biểu (Timeline) — auto-generate từ Bible
  if (bibleDir && existsSync(join(bibleDir, 'timeline'))) {
    const tlDir = join(bibleDir, 'timeline');
    const tlFiles = readdirSync(tlDir).filter(f => f.endsWith('.json'));
    if (tlFiles.length > 0) {
      epubSource += `# Niên Biểu\n\n`;
      const events = [];
      tlFiles.forEach(f => {
        try {
          const ev = JSON.parse(readFileSync(join(tlDir, f), 'utf8'));
          if (Array.isArray(ev)) events.push(...ev);
          else events.push(ev);
        } catch (e) { /* skip */ }
      });
      events.sort((a, b) => (a.chapter || 0) - (b.chapter || 0));
      events.forEach(ev => {
        epubSource += `<div class="timeline-entry">\n`;
        epubSource += `<span class="date">Chương ${ev.chapter || '?'}</span>`;
        if (ev.time) epubSource += ` — ${ev.time}`;
        epubSource += `\n<p>${ev.event || ev.description || ''}</p>\n`;
        epubSource += `</div>\n\n`;
      });
    }
  }

  // Lời cảm ơn
  if (acknowledgments) {
    epubSource += `# Lời Cảm Ơn\n\n${acknowledgments}\n\n`;
  }

  // Về tác giả + QR Code
  epubSource += `<div class="about-author">\n`;
  epubSource += `# Về Tác Giả\n\n`;
  epubSource += `<p class="author-name">${author}</p>\n`;
  if (aboutAuthor) {
    epubSource += `<p>${aboutAuthor}</p>\n`;
  } else {
    epubSource += `<p>Tác giả tiểu thuyết, rèn bằng tình yêu văn chương và sự cầu toàn.</p>\n`;
  }

  // QR Code — generate + embed
  if (qrUrl) {
    try {
      const qrFile = join(tempDir, 'author-qr.png');
      try {
        execSync(`qrencode -o "${qrFile}" -s 6 -l H -m 2 "${qrUrl}"`, { stdio: 'pipe' });
      } catch {
        execSync(`python3 -c "import qrcode; q=qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_H); q.add_data('${qrUrl}'); q.make(fit=True); q.make_image().save('${qrFile}')"`, { stdio: 'pipe' });
      }
      if (existsSync(qrFile)) {
        epubSource += `<img class="qr" src="${qrFile}" alt="QR Code — ${author}" />\n`;
        epubSource += `<p style="font-size:0.85em; color:#888;">Quét mã QR để theo dõi tác giả</p>\n`;
      }
    } catch (e) {
      epubSource += `<p><a href="${qrUrl}">→ Theo dõi tác giả</a></p>\n`;
    }
  }
  epubSource += `</div>\n\n`;

  // 3. Ghi file source
  const sourceFile = join(tempDir, 'epub-source.md');
  writeFileSync(sourceFile, epubSource);

  // 4. Copy CSS template
  const cssFile = join(TEMPLATES_DIR, 'epub-premium.css');
  const cssDest = join(tempDir, 'epub-premium.css');
  if (existsSync(cssFile)) {
    writeFileSync(cssDest, readFileSync(cssFile, 'utf8'));
  }

  // 5. Build pandoc command
  // Append arc/bundle suffix to filename
  let fileSuffix = '';
  if (activeArc && !isBundle) fileSuffix = `-arc${arc}`;
  if (isBundle) fileSuffix = '-toan-tap';
  const outFile = join(outDir, `${slugify(title)}${fileSuffix}.epub`);
  let cmd = `pandoc "${sourceFile}" -o "${outFile}"`;
  cmd += ` --metadata title="${title}"`;
  cmd += ` --metadata author="${author}"`;
  cmd += ` --metadata lang="${lang}"`;
  cmd += ` --epub-chapter-level=1`;
  cmd += ` --toc --toc-depth=2`;

  // CSS
  if (existsSync(cssDest)) {
    cmd += ` --css="${cssDest}"`;
  }

  // Cover
  if (cover && existsSync(cover)) {
    cmd += ` --epub-cover-image="${cover}"`;
  }

  // EPUB3
  cmd += ` -t epub3`;

  // 6. Execute
  console.log(`📦 Đang tạo EPUB Premium...`);
  try {
    execSync(cmd, { stdio: 'pipe', maxBuffer: 50 * 1024 * 1024 });
    console.log(`✅ EPUB Premium → ${outFile}`);
    console.log(`   📚 ${filteredFiles.length} chương${activeArc ? ` (Arc ${arc}: ${activeArc.name})` : ''}${isBundle ? ' (Toàn Tập)' : ''}`);
    console.log(`   📄 Front Matter: ${seriesName ? 'series page + ' : ''}bìa trong + bản quyền${dedication ? ' + đề tặng' : ''}${authorNote ? ' + lời tác giả' : ''}${mapImage ? ' + bản đồ' : ''}`);
    console.log(`   📖 Body: ${arcs.length > 0 ? arcs.length + ' arc + ' : ''}${filteredFiles.length} chương (drop caps)`);
    console.log(`   📑 Back Matter:${nextArc ? ' teaser arc tiếp +' : ''}${afterword ? ' lời bạt +' : ''} phụ lục nhân vật + thuật ngữ + niên biểu${acknowledgments ? ' + cảm ơn' : ''} + về tác giả + QR`);

    return { output: outFile, chapters: filteredFiles.length, format: 'epub3' };
  } catch (e) {
    console.error(`❌ Lỗi tạo EPUB: ${e.message}`);
    throw e;
  }
}

// ═══════════════════════════════════════════
// PDF — Xuất PDF đẹp (A5)
// ═══════════════════════════════════════════
export async function createPdf(input, options = {}) {
  const { title = 'Tiểu Thuyết', author = 'Tiểu Tâm', outputDir } = options;
  const outDir = outputDir || join(dirname(input), 'publish');
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

  const outFile = join(outDir, `${slugify(title)}.pdf`);

  // Tạo HTML wrapper cho wkhtmltopdf
  const content = readFileSync(input, 'utf8');
  const htmlFile = join(outDir, '.temp-pdf.html');
  const cssFile = join(TEMPLATES_DIR, 'epub-premium.css');
  const css = existsSync(cssFile) ? readFileSync(cssFile, 'utf8') : '';

  const html = `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<style>
${css}
@page { size: A5; margin: 2cm; }
body { font-size: 11pt; }
</style>
</head>
<body>${content.replace(/^# (.+)$/gm, '<h1>$1</h1>').replace(/^## (.+)$/gm, '<h2>$1</h2>').replace(/\n\n/g, '</p><p>')}</body>
</html>`;

  writeFileSync(htmlFile, html);

  try {
    execSync(`wkhtmltopdf --page-size A5 --margin-top 20mm --margin-bottom 20mm --margin-left 15mm --margin-right 15mm --header-center "${title}" --header-font-size 8 --footer-center "[page]" --footer-font-size 8 "${htmlFile}" "${outFile}"`, { stdio: 'pipe' });
    console.log(`✅ PDF → ${outFile}`);
    return { output: outFile };
  } catch (e) {
    console.error(`❌ Lỗi tạo PDF: ${e.message}`);
    throw e;
  }
}

// ═══════════════════════════════════════════
// HTML Reader — Web reader responsive
// ═══════════════════════════════════════════
export async function createHtmlReader(input, options = {}) {
  const { title = 'Tiểu Thuyết', author = 'Tiểu Tâm', outputDir } = options;
  const outDir = outputDir || join(dirname(input), 'publish');
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

  const content = readFileSync(input, 'utf8');
  const outFile = join(outDir, `${slugify(title)}-reader.html`);

  const html = `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title} — ${author}</title>
<style>
  :root { --bg: #F5F0EB; --accent: #C9A96E; --danger: #8B1A2F; --depth: #2C2C2C; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Noto Serif', Georgia, serif; line-height: 1.8; color: var(--depth); background: var(--bg); }
  .container { max-width: 680px; margin: 0 auto; padding: 40px 24px; }
  h1 { font-size: 2em; text-align: center; margin: 2em 0 0.5em; color: var(--danger); border-bottom: 2px solid var(--accent); padding-bottom: 0.5em; }
  h2 { font-size: 1.4em; text-align: center; color: var(--danger); margin: 2em 0 1em; }
  p { text-align: justify; margin: 0.8em 0; text-indent: 1.5em; }
  hr { border: none; text-align: center; margin: 2em 0; }
  hr::after { content: "✦ ✦ ✦"; color: var(--accent); }
  .header { text-align: center; padding: 60px 0 40px; border-bottom: 2px solid var(--accent); margin-bottom: 40px; }
  .header h1 { border: none; margin: 0; font-size: 2.5em; }
  .header .author { color: var(--accent); font-size: 1.2em; margin-top: 8px; }
  /* Dark mode */
  @media (prefers-color-scheme: dark) {
    :root { --bg: #1a1a1a; --depth: #e0dcd7; }
    body { background: #1a1a1a; color: #e0dcd7; }
  }
  .toggle-dark { position: fixed; top: 16px; right: 16px; background: var(--depth); color: var(--bg); border: none; padding: 8px 14px; border-radius: 8px; cursor: pointer; font-size: 1.1em; z-index: 100; }
</style>
</head>
<body>
<button class="toggle-dark" onclick="document.body.style.background=document.body.style.background==='#1a1a1a'?'#F5F0EB':'#1a1a1a';document.body.style.color=document.body.style.color==='rgb(224, 220, 215)'?'#2C2C2C':'#e0dcd7'">🌙</button>
<div class="container">
<div class="header">
<h1>${title}</h1>
<p class="author">${author}</p>
</div>
${content.replace(/^# (.+)$/gm, '<h1>$1</h1>').replace(/^## (.+)$/gm, '<h2>$1</h2>').replace(/^---$/gm, '<hr>').replace(/\n\n/g, '</p>\n<p>')}
</div>
</body>
</html>`;

  writeFileSync(outFile, html);
  console.log(`✅ HTML Reader → ${outFile}`);
  return { output: outFile };
}

// ═══════════════════════════════════════════
// QR Code
// ═══════════════════════════════════════════
export async function createQr(content, options = {}) {
  const { label, outputDir = '/tmp', size = 6 } = options;
  const outFile = join(outputDir, `${slugify(label || 'qrcode')}-qr.png`);

  try {
    // Error correction High cho đọc dù mờ
    execSync(`qrencode -o "${outFile}" -s ${size} -l H -m 2 --foreground=2C2C2C --background=F5F0EB "${content}"`, { stdio: 'pipe' });
    console.log(`✅ QR Code → ${outFile}`);
    return { output: outFile };
  } catch {
    try {
      execSync(`python3 -c "
import qrcode
from qrcode.image.styledpil import StyledPilImage
q = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_H, box_size=${size}, border=2)
q.add_data('${content}')
q.make(fit=True)
img = q.make_image(fill_color='#2C2C2C', back_color='#F5F0EB')
img.save('${outFile}')
"`, { stdio: 'pipe' });
      console.log(`✅ QR Code (Python) → ${outFile}`);
      return { output: outFile };
    } catch (e) {
      console.error(`❌ Lỗi tạo QR: ${e.message}`);
      throw e;
    }
  }
}

// ═══════════════════════════════════════════
// Audiobook — Edge-TTS + ffmpeg
// ═══════════════════════════════════════════
export async function createAudiobook(chaptersDir, options = {}) {
  const { voice = 'vi-VN-HoaiMyNeural', outputDir } = options;
  const outDir = outputDir || join(chaptersDir, '..', 'publish', 'audiobook');
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

  const files = readdirSync(chaptersDir)
    .filter(f => f.endsWith('.md'))
    .sort((a, b) => {
      const numA = parseInt(a.match(/\d+/)?.[0] || '0');
      const numB = parseInt(b.match(/\d+/)?.[0] || '0');
      return numA - numB;
    });

  console.log(`🎙️ Tạo audiobook: ${files.length} chương, giọng ${voice}`);
  const results = [];

  for (const f of files) {
    const chName = f.replace('.md', '');
    const outFile = join(outDir, `${chName}.mp3`);
    let text = readFileSync(join(chaptersDir, f), 'utf8');

    // Bỏ markdown headers
    text = text.replace(/^#+\s+/gm, '').replace(/\*\*/g, '').replace(/\*/g, '');

    // Chunk processing cho text dài (edge-tts giới hạn ~2000 chars)
    const maxChunk = 1500;
    const sentences = text.match(/[^.!?。？！]+[.!?。？！]+/g) || [text];
    const chunks = [];
    let current = '';

    for (const s of sentences) {
      if ((current + s).length > maxChunk) {
        if (current) chunks.push(current);
        current = s;
      } else {
        current += s;
      }
    }
    if (current) chunks.push(current);

    if (chunks.length === 1) {
      // Single chunk
      const escaped = chunks[0].replace(/"/g, '\\"').replace(/\n/g, ' ');
      try {
        execSync(`edge-tts --voice "${voice}" --text "${escaped}" --write-media "${outFile}"`, { stdio: 'pipe', timeout: 120000 });
      } catch (e) {
        console.error(`⚠️ Lỗi TTS ${chName}: ${e.message}`);
        continue;
      }
    } else {
      // Multi-chunk → concat
      const chunkFiles = [];
      for (let i = 0; i < chunks.length; i++) {
        const chunkFile = join(outDir, `.chunk-${chName}-${i}.mp3`);
        const escaped = chunks[i].replace(/"/g, '\\"').replace(/\n/g, ' ');
        try {
          execSync(`edge-tts --voice "${voice}" --text "${escaped}" --write-media "${chunkFile}"`, { stdio: 'pipe', timeout: 120000 });
          chunkFiles.push(chunkFile);
        } catch (e) {
          console.error(`⚠️ Chunk ${i} lỗi: ${e.message}`);
        }
      }

      // Concat with ffmpeg
      if (chunkFiles.length > 0) {
        const listFile = join(outDir, `.concat-${chName}.txt`);
        writeFileSync(listFile, chunkFiles.map(f => `file '${f}'`).join('\n'));
        try {
          execSync(`ffmpeg -y -f concat -safe 0 -i "${listFile}" -c copy "${outFile}"`, { stdio: 'pipe' });
        } catch {
          // Fallback: copy first chunk
          if (existsSync(chunkFiles[0])) {
            execSync(`cp "${chunkFiles[0]}" "${outFile}"`);
          }
        }
        // Cleanup chunks
        chunkFiles.forEach(f => { try { execSync(`rm -f "${f}"`); } catch {} });
        try { execSync(`rm -f "${listFile}"`); } catch {}
      }
    }

    if (existsSync(outFile)) {
      results.push(outFile);
      console.log(`✅ ${chName}.mp3`);
    }
  }

  console.log(`\n🎙️ Audiobook: ${results.length}/${files.length} chương hoàn thành`);
  return { output: outDir, chapters: results.length, total: files.length };
}

// ═══════════════════════════════════════════
// ALL — Pipeline tổng
// ═══════════════════════════════════════════
export async function publishAll(chaptersDir, options = {}) {
  console.log('🚀 Bắt đầu pipeline xuất bản...\n');
  const results = {};

  // 1. Combine
  console.log('━━━ Bước 1/5: Gộp chương ━━━');
  results.combine = await combineChapters(chaptersDir, options);

  // 2. EPUB Premium
  console.log('\n━━━ Bước 2/5: EPUB Premium ━━━');
  results.epub = await createEpubPremium(chaptersDir, options);

  // 3. PDF
  console.log('\n━━━ Bước 3/5: PDF ━━━');
  try {
    results.pdf = await createPdf(results.combine.output, options);
  } catch (e) {
    console.error(`⚠️ PDF bỏ qua: ${e.message}`);
  }

  // 4. HTML Reader
  console.log('\n━━━ Bước 4/5: HTML Reader ━━━');
  results.html = await createHtmlReader(results.combine.output, options);

  // 5. QR Code
  console.log('\n━━━ Bước 5/5: QR Code ━━━');
  const qrUrl = options.qrUrl || options.url || 'https://www.facebook.com/profile.php?id=61588560594683';
  results.qr = await createQr(qrUrl, { ...options, label: options.title || 'novel' });

  console.log('\n🎉 Pipeline xuất bản HOÀN THÀNH!');
  console.log('📦 Output:', Object.values(results).map(r => r?.output).filter(Boolean).join('\n       '));
  return results;
}

// ═══════════════════════════════════════════
// UTILS
// ═══════════════════════════════════════════
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[àáạảãâầấậẩẫăằắặẳẵ]/g, 'a')
    .replace(/[èéẹẻẽêềếệểễ]/g, 'e')
    .replace(/[ìíịỉĩ]/g, 'i')
    .replace(/[òóọỏõôồốộổỗơờớợởỡ]/g, 'o')
    .replace(/[ùúụủũưừứựửữ]/g, 'u')
    .replace(/[ỳýỵỷỹ]/g, 'y')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// ═══════════════════════════════════════════
// PUBLISHER CLASS — Unified wrapper for CLI
// ═══════════════════════════════════════════
class Publisher {
  constructor(projectSlug = 'default-project') {
    this.projectSlug = projectSlug;
  }

  /**
   * Create EPUB3 Premium
   * @param {string} dir - Chapters directory
   * @param {object} options - title, author, cover, arc, bundle, outputDir, etc.
   */
  async epub(dir, options = {}) {
    return createEpubPremium(dir, options);
  }

  /**
   * Create PDF (A5)
   * @param {string} dir - Chapters directory (will combine first)
   * @param {object} options - title, author, outputDir
   */
  async pdf(dir, options = {}) {
    // PDF needs a combined file first
    const combined = await combineChapters(dir, options);
    return createPdf(combined.output, options);
  }

  /**
   * Create responsive HTML web reader
   * @param {string} dir - Chapters directory (will combine first)
   * @param {object} options - title, author, outputDir
   */
  async html(dir, options = {}) {
    const combined = await combineChapters(dir, options);
    return createHtmlReader(combined.output, options);
  }

  /**
   * Generate QR code
   * @param {string} url - URL to encode
   * @param {object} options - label, outputDir, size
   */
  async qr(url, options = {}) {
    return createQr(url, { ...options, label: options.title || 'novel' });
  }

  /**
   * Create audiobook (Edge-TTS)
   * @param {string} dir - Chapters directory
   * @param {object} options - voice, outputDir
   */
  async audiobook(dir, options = {}) {
    return createAudiobook(dir, options);
  }

  /**
   * Run full publish pipeline (all formats)
   * @param {string} dir - Chapters directory
   * @param {object} options - all publishing options
   */
  async all(dir, options = {}) {
    return publishAll(dir, options);
  }
}

export default Publisher;
