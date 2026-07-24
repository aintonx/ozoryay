/**
 * Подготовка фотографий для прожектора.
 *
 * Читает оригиналы из memories-source/ (вне public, чтобы 44 МБ мастеров
 * не улетали в деплой) и кладёт в public/memories/ веб-версии:
 *   — HEIC → JPEG, иначе браузеры их просто не покажут;
 *   — метаданные срезаются (sharp делает это по умолчанию) — с публичного
 *     сайта нельзя отдавать EXIF с геометками и моделью телефона;
 *   — ориентация запекается в пиксели, EXIF-флаг orientation исчезает;
 *   — длинная сторона ужимается: фото всё равно показывается размытым,
 *     обесцвеченным и полупрозрачным в пятне света — 4К там не нужен.
 *
 * Имена фиксированные (memory-01…), порядок показа перемешивает сайт.
 * Запускать: node scripts/process-memories.mjs
 */
import { readdir, mkdir, writeFile, rm } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import sharp from "sharp";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "memories-source");
const OUT = join(ROOT, "public", "memories");
const TMP = join(tmpdir(), "ozoryay-memories");
const LONG_EDGE = 1400;
const QUALITY = 80;

const files = (await readdir(SRC))
  .filter((f) => /\.(heic|jpe?g|png)$/i.test(f))
  .sort();

await mkdir(OUT, { recursive: true });
await mkdir(TMP, { recursive: true });

const manifest = [];
let i = 0;

for (const file of files) {
  i += 1;
  const name = `memory-${String(i).padStart(2, "0")}.jpg`;

  // sharp читает контейнер HEIF, но HEVC-кодек в libvips не собран.
  // Родной декодер Apple раскрывает HEIC в PNG без потерь, дальше — sharp.
  let input = join(SRC, file);
  let temp = null;
  if (/\.heic$/i.test(file)) {
    temp = join(TMP, `${name}.png`);
    execFileSync("sips", ["-s", "format", "png", input, "--out", temp]);
    input = temp;
  }

  const meta = await sharp(input)
    .rotate() // запечь ориентацию из EXIF и убрать флаг
    .resize(LONG_EDGE, LONG_EDGE, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: QUALITY, mozjpeg: true })
    .toFile(join(OUT, name));

  if (temp) await rm(temp, { force: true });
  manifest.push({ src: `/memories/${name}`, w: meta.width, h: meta.height });
  console.log(`${name}  ${meta.width}×${meta.height}  ${(meta.size / 1024).toFixed(0)} КБ  ← ${file}`);
}

await rm(TMP, { recursive: true, force: true });

await writeFile(join(OUT, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
console.log(`\nготово: ${manifest.length} фото, манифест записан`);
