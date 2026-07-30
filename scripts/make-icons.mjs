/**
 * Значки сайта и картинка для ссылок.
 *
 * Всё рисуется здесь, из кода, а не подкладывается готовыми файлами: так
 * значок и превью гарантированно совпадают с палитрой сайта, а поправить
 * их можно, не открывая графический редактор.
 *
 * Запускать: npm run icons
 * Результат кладётся в public/ и коммитится вместе с кодом.
 */
import { writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "public");

// Палитра сайта. Те же шесть значений, что в globals.css.
const NIGHT_DEEP = "#05070F";
const NIGHT = "#0A0E1A";
const HORIZON = "#14203A";
const STAR = "#C9D6F0";
const AMBER = "#F2C57C";
const AMBER_HOT = "#FFE3B0";

/**
 * Солнце. Контур взят из готового значка (SVG Repo, 32×32) — лучи у него
 * не прямые, а завихрённые, и это ровно тот характер, который нужен: не
 * схема из презентации, а рисунок.
 */
const SUN_PATH =
  "M23.395 14.106c2.958-1.383 2.828-6.068 5.758-5.884-4.125-2.74-4.019 3.106-9.089 1.235 1.107-3.068-2.292-6.286-0.091-8.227-4.855 0.979-0.645 5.039-5.555 7.301-1.384-2.958-6.068-2.828-5.884-5.758-2.74 4.125 3.106 4.019 1.235 9.089-3.068-1.107-6.286 2.292-8.227 0.091 0.979 4.855 5.039 0.645 7.301 5.555-2.958 1.384-2.828 6.068-5.758 5.884 4.125 2.74 4.019-3.106 9.089-1.235-1.107 3.068 2.292 6.286 0.091 8.227 4.855-0.979 0.645-5.039 5.555-7.301 1.384 2.958 6.068 2.828 5.884 5.758 2.74-4.125-3.106-4.019-1.235-9.089 3.068 1.107 6.286-2.292 8.226-0.091-0.979-4.855-5.039-0.645-7.301-5.555z";

/**
 * Профиль земли: сумма гауссиан. Повторяет groundYAt из src/lib/sky/layout.ts —
 * значок и превью должны показывать те же холмы, что и сам сайт.
 */
function bump(x, center, width, height) {
  const t = (x - center) / width;
  return height * Math.exp(-t * t * 2.2);
}
function groundYAt(x) {
  return (
    0.862 - bump(x, 0.17, 0.3, 0.073) - bump(x, 0.62, 0.24, 0.013) + bump(x, 0.93, 0.2, 0.011)
  );
}

/** Тот же генератор, что рассыпает звёзды на сайте: небо должно быть узнаваемым. */
function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Значок: солнце на ночном квадрате.
 *
 * Не прозрачный фон, а именно тёмный квадрат — во вкладке браузера и в
 * списке закладок фон бывает и белым, и чёрным, и амберное солнце на
 * прозрачном пропадало бы на светлой теме.
 */
function iconSvg(size) {
  const r = size * 0.22; // скругление угла, как у иконок приложений
  const sun = size * 0.66;
  const off = (size - sun) / 2;
  const k = sun / 32; // исходный контур нарисован в сетке 32×32
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <radialGradient id="halo" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${AMBER}" stop-opacity="0.34"/>
      <stop offset="55%" stop-color="${AMBER}" stop-opacity="0.09"/>
      <stop offset="100%" stop-color="${AMBER}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="face" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${AMBER_HOT}"/>
      <stop offset="100%" stop-color="${AMBER}"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${r}" ry="${r}" fill="${NIGHT}"/>
  <circle cx="${size / 2}" cy="${size / 2}" r="${size * 0.46}" fill="url(#halo)"/>
  <g transform="translate(${off} ${off}) scale(${k})">
    <path d="${SUN_PATH}" fill="url(#face)"/>
  </g>
</svg>`;
}

/**
 * Картинка для ссылок: то же небо, что на сайте.
 *
 * Именно сцена, а не логотип с надписью: телеграм и без того подставляет
 * рядом название и описание из мета-тегов, а вторая надпись поверх картинки
 * только спорила бы с ними.
 */
function ogSvg(w, h) {
  const sunX = 0.372; // азимут на Краснодар — там же, где восходит на сайте
  const groundPx = (x) => groundYAt(x) * h;

  // Силуэт земли — тот же профиль, что рисует холмы на сайте.
  const steps = 160;
  let ground = `M 0 ${h} L 0 ${groundPx(0).toFixed(1)}`;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    ground += ` L ${(t * w).toFixed(1)} ${groundPx(t).toFixed(1)}`;
  }
  ground += ` L ${w} ${h} Z`;

  // Звёзды: те же правила, что у россыпи на сайте — к горизонту реже.
  const rand = mulberry32(41720260630);
  let stars = "";
  for (let i = 0; i < 240; i++) {
    const x = rand() * w;
    const y = Math.pow(rand(), 1.25) * groundPx(x / w);
    const a = 0.08 + Math.pow(rand(), 2.4) * 0.55;
    const r = rand() < 0.84 ? 0.9 : 1.5;
    if (y > groundPx(x / w) - 6) continue;
    stars += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}" fill="${STAR}" opacity="${a.toFixed(2)}"/>`;
  }

  const cx = sunX * w;
  const cy = groundPx(sunX);
  const discR = h * 0.3;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${NIGHT_DEEP}"/>
      <stop offset="55%" stop-color="${NIGHT}"/>
      <stop offset="100%" stop-color="${HORIZON}"/>
    </linearGradient>
    <radialGradient id="wide" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${AMBER}" stop-opacity="0.16"/>
      <stop offset="40%" stop-color="${AMBER}" stop-opacity="0.06"/>
      <stop offset="100%" stop-color="${AMBER}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="band" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${AMBER_HOT}" stop-opacity="0.4"/>
      <stop offset="30%" stop-color="${AMBER}" stop-opacity="0.2"/>
      <stop offset="100%" stop-color="${AMBER}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="disc" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${AMBER_HOT}" stop-opacity="0.95"/>
      <stop offset="38%" stop-color="${AMBER_HOT}" stop-opacity="0.82"/>
      <stop offset="54%" stop-color="${AMBER_HOT}" stop-opacity="0.42"/>
      <stop offset="70%" stop-color="${AMBER}" stop-opacity="0.14"/>
      <stop offset="100%" stop-color="${AMBER}" stop-opacity="0"/>
    </radialGradient>
    <clipPath id="skyOnly"><path d="M 0 0 L ${w} 0 L ${w} ${h} L 0 ${h} Z M 0 ${h} ${ground.slice(1)}"/></clipPath>
  </defs>

  <rect width="${w}" height="${h}" fill="url(#sky)"/>
  ${stars}

  <ellipse cx="${cx}" cy="${cy}" rx="${w * 0.62}" ry="${h * 0.42}" fill="url(#wide)"/>
  <ellipse cx="${cx}" cy="${cy}" rx="${w * 0.5}" ry="${h * 0.22}" fill="url(#band)"/>
  <circle cx="${cx}" cy="${cy}" r="${discR}" fill="url(#disc)"/>

  <path d="${ground}" fill="#02030A"/>
</svg>`;
}

/**
 * Обёртка ICO вокруг готового PNG.
 *
 * Формат допускает PNG внутри начиная с Vista, и все живые браузеры его
 * понимают. Нужен он ровно за тем, чтобы браузер не стучался за
 * /favicon.ico и не получал 404 — сам значок берётся из svg и png.
 */
function icoFromPng(png, size) {
  const header = Buffer.alloc(22);
  header.writeUInt16LE(0, 0); // зарезервировано
  header.writeUInt16LE(1, 2); // тип: значок
  header.writeUInt16LE(1, 4); // одна картинка внутри
  header.writeUInt8(size >= 256 ? 0 : size, 6); // ширина (0 значит 256)
  header.writeUInt8(size >= 256 ? 0 : size, 7); // высота
  header.writeUInt8(0, 8); // палитры нет
  header.writeUInt8(0, 9);
  header.writeUInt16LE(1, 10); // плоскостей
  header.writeUInt16LE(32, 12); // бит на пиксель
  header.writeUInt32LE(png.length, 14);
  header.writeUInt32LE(22, 18); // смещение данных
  return Buffer.concat([header, png]);
}

const icon = iconSvg(512);
await writeFile(join(OUT, "icon.svg"), iconSvg(64) + "\n");

const png = (size) => sharp(Buffer.from(icon)).resize(size, size).png({ compressionLevel: 9 });

await png(512).toFile(join(OUT, "icon-512.png"));
await png(192).toFile(join(OUT, "icon-192.png"));
await png(180).toFile(join(OUT, "apple-touch-icon.png"));
await png(32).toFile(join(OUT, "icon-32.png"));

const ico32 = await png(32).toBuffer();
await writeFile(join(OUT, "favicon.ico"), icoFromPng(ico32, 32));

await sharp(Buffer.from(ogSvg(1200, 630)))
  .png({ compressionLevel: 9 })
  .toFile(join(OUT, "og.png"));

console.log("icons: icon.svg, favicon.ico, icon-32/192/512, apple-touch-icon, og.png");
