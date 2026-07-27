/**
 * Опись воспоминаний для прожектора.
 *
 * Сайт статический: спросить у сервера, что лежит в папке, ему не у кого.
 * Поэтому список файлов составляется здесь, на сборке, и уезжает в деплой
 * вместе с ними. Запускается сам перед каждым `next build` и `next dev` —
 * достаточно положить файл в public/memories и закоммитить, править код
 * не нужно.
 *
 * Размеры не пишем: их измерит браузер при загрузке. Иначе пришлось бы
 * тянуть библиотеку картинок ради двух чисел, а для видео — ещё и ffprobe.
 *
 * Заодно с JPEG срезаются метаданные. Сайт публичный, а телефон кладёт в
 * снимок GPS-координаты — то есть адрес, где он сделан. Один раз забыть
 * прогнать фото через обработку достаточно, чтобы выложить домашний адрес
 * в открытый доступ, поэтому чистка стоит здесь, на общем пути, а не в
 * отдельном шаге, который можно пропустить.
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIR = join(ROOT, "public", "memories");
const MANIFEST = join(DIR, "manifest.json");

const IMAGES = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif", ".gif"]);
const VIDEOS = new Set([".mp4", ".webm", ".mov", ".m4v"]);

let files;
try {
  files = await readdir(DIR);
} catch {
  console.log("memories: папки public/memories нет — опись не нужна");
  process.exit(0);
}

const entries = [];
let stripped = 0;

for (const file of files.sort(new Intl.Collator("ru", { numeric: true }).compare)) {
  const ext = extname(file).toLowerCase();
  const kind = IMAGES.has(ext) ? "image" : VIDEOS.has(ext) ? "video" : null;
  if (!kind) continue;

  if (ext === ".jpg" || ext === ".jpeg") {
    const raw = await readFile(join(DIR, file));
    const clean = stripJpegMetadata(raw);
    if (clean.length !== raw.length) {
      await writeFile(join(DIR, file), clean);
      stripped += 1;
    }
  }

  // Путь относительный: сайт живёт и в корне домена, и в подпапке.
  entries.push({ src: `memories/${file}`, kind });
}

await writeFile(MANIFEST, JSON.stringify(entries, null, 2) + "\n");

const photos = entries.filter((e) => e.kind === "image").length;
const clips = entries.length - photos;
console.log(
  `memories: ${photos} фото, ${clips} видео` +
    (stripped ? `, метаданные срезаны у ${stripped}` : ""),
);
if (VIDEOS.size && clips) {
  console.log("memories: у видео метаданные не трогаются — проверь их сам, если снимал на телефон");
}

/**
 * JPEG без метаданных.
 *
 * Файл — это цепочка сегментов: маркер FF xx, два байта длины, данные.
 * Выбрасываем всё семейство APPn (там живут EXIF с GPS, XMP, миниатюры)
 * и комментарии COM; таблицы квантования, Хаффмана и сами пиксели остаются
 * нетронутыми, то есть картинка не перекодируется и не теряет качества.
 */
function stripJpegMetadata(buf) {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return buf;

  const out = [buf.subarray(0, 2)];
  let i = 2;

  while (i + 3 < buf.length) {
    if (buf[i] !== 0xff) break; // не сегмент — дальше разбирать нечего
    const marker = buf[i + 1];
    // SOS: дальше идут сжатые данные до конца файла, их не трогаем.
    if (marker === 0xda) {
      out.push(buf.subarray(i));
      i = buf.length;
      break;
    }
    const len = buf.readUInt16BE(i + 2);
    if (len < 2 || i + 2 + len > buf.length) break;
    const drop = (marker >= 0xe0 && marker <= 0xef) || marker === 0xfe;
    if (!drop) out.push(buf.subarray(i, i + 2 + len));
    i += 2 + len;
  }

  // Что-то в разборе не сошлось — отдаём оригинал, портить файл нельзя.
  if (i < buf.length) return buf;
  return Buffer.concat(out);
}
