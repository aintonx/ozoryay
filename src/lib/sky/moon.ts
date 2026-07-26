import { withAlpha } from "./stars";

const SYNODIC_MONTH = 29.530588853;
/** Новолуние 6 января 2000, 18:14 UTC — опорная точка. */
const KNOWN_NEW_MOON = Date.UTC(2000, 0, 6, 18, 14) / 86400000;

export interface MoonPhase {
  /** Возраст луны в сутках, 0..29.53. */
  age: number;
  /** Освещённая доля диска, 0..1. */
  illum: number;
  /** Растёт ли луна: определяет, с какой стороны освещённый край. */
  waxing: boolean;
}

/** Настоящая фаза на заданный момент. Луна одна на два города. */
export function moonPhase(at: Date): MoonPhase {
  const days = at.getTime() / 86400000 - KNOWN_NEW_MOON;
  const age = ((days % SYNODIC_MONTH) + SYNODIC_MONTH) % SYNODIC_MONTH;
  const illum = (1 - Math.cos((2 * Math.PI * age) / SYNODIC_MONTH)) / 2;
  return { age, illum, waxing: age < SYNODIC_MONTH / 2 };
}

/**
 * Луна в спрайт. Пересобирается только при ресайзе и смене суток,
 * в кадре она просто выкладывается одним drawImage.
 *
 * Ореол строится из самой формы освещённой части, а не из окружности диска.
 * Кольцевой ореол вокруг всего диска подсвечивает неосвещённую часть с обеих
 * сторон, и она проступает чёрным укусом на фоне неба. У настоящей луны
 * светится только освещённое — поэтому ореол здесь несимметричен.
 *
 * Всё построение идёт в пикселях устройства: ctx.filter трактует радиус
 * размытия по-разному в зависимости от текущей трансформации, и с ctx.scale
 * размытие поехало бы на экранах с разным dpr.
 */
/**
 * Лунные моря — тёмные базальтовые равнины видимой стороны, в долях радиуса
 * от центра диска. Именно по ним луна узнаётся как луна, а не как белый круг:
 * без них любой диск читается пятном или, при неполной фазе, яйцом.
 *
 * Расположение примерно повторяет настоящее: Океан Бурь слева, Море Дождей
 * сверху, Спокойствия и Ясности в центре, Кризисов справа.
 */
const MARIA = [
  { x: -0.34, y: -0.30, rx: 0.30, ry: 0.26, a: 0.20 }, // Океан Бурь
  { x: -0.10, y: -0.44, rx: 0.26, ry: 0.20, a: 0.22 }, // Море Дождей
  { x: 0.16, y: -0.26, rx: 0.20, ry: 0.17, a: 0.18 }, // Море Ясности
  { x: 0.26, y: 0.02, rx: 0.23, ry: 0.19, a: 0.20 }, // Море Спокойствия
  { x: 0.52, y: -0.12, rx: 0.13, ry: 0.11, a: 0.17 }, // Море Кризисов
  { x: 0.30, y: 0.34, rx: 0.18, ry: 0.14, a: 0.15 }, // Море Изобилия
  { x: -0.44, y: 0.26, rx: 0.15, ry: 0.13, a: 0.13 }, // Море Влажности
  { x: -0.02, y: 0.30, rx: 0.14, ry: 0.12, a: 0.12 }, // Море Облаков
];

/** Крупные светлые кратеры с лучевыми системами. */
const CRATERS = [
  { x: -0.18, y: 0.52, r: 0.075, a: 0.16 }, // Тихо
  { x: -0.46, y: -0.02, r: 0.045, a: 0.12 }, // Коперник
  { x: 0.44, y: 0.44, r: 0.038, a: 0.1 },
  { x: -0.62, y: -0.34, r: 0.03, a: 0.09 },
];

export function makeMoonSprite(
  phase: MoonPhase,
  radius: number,
  color: string,
  dpr: number,
): HTMLCanvasElement {
  const size = Math.ceil(radius * 5.2 * 2 * dpr);
  const cx = size / 2;
  const cy = size / 2;
  const r = radius * dpr;

  // Диск с текстурой: рисуем целиком, фазу вырежем в конце.
  const disc = document.createElement("canvas");
  disc.width = size;
  disc.height = size;
  const d = disc.getContext("2d")!;

  // Основа — идеально круглый диск. Чуть тёплый, а не бумажно-белый.
  d.beginPath();
  d.arc(cx, cy, r, 0, Math.PI * 2);
  d.closePath();
  d.fillStyle = withAlpha(color, 1);
  d.fill();

  // Дальше рисуем только внутри диска.
  d.save();
  d.clip();

  // Моря: мягкие тёмные пятна.
  d.filter = `blur(${Math.max(0.7, r * 0.05)}px)`;
  for (const m of MARIA) {
    d.beginPath();
    d.ellipse(cx + m.x * r, cy + m.y * r, m.rx * r, m.ry * r, 0.35, 0, Math.PI * 2);
    d.fillStyle = `rgba(24, 32, 54, ${m.a})`;
    d.fill();
  }

  // Кратеры: светлые точки с ореолом выброса.
  for (const k of CRATERS) {
    const kx = cx + k.x * r;
    const ky = cy + k.y * r;
    const g = d.createRadialGradient(kx, ky, 0, kx, ky, k.r * r * 3.2);
    g.addColorStop(0, `rgba(255,255,255,${k.a})`);
    g.addColorStop(0.28, `rgba(255,255,255,${k.a * 0.35})`);
    g.addColorStop(1, "rgba(255,255,255,0)");
    d.fillStyle = g;
    d.fillRect(kx - k.r * r * 3.2, ky - k.r * r * 3.2, k.r * r * 6.4, k.r * r * 6.4);
  }
  d.filter = "none";

  // Потемнение к краю: диск становится шаром, а не наклейкой.
  const limb = d.createRadialGradient(cx, cy, r * 0.3, cx, cy, r);
  limb.addColorStop(0, "rgba(0,0,0,0)");
  limb.addColorStop(0.72, "rgba(0,0,0,0.06)");
  limb.addColorStop(0.93, "rgba(0,0,0,0.2)");
  limb.addColorStop(1, "rgba(0,0,0,0.42)");
  d.fillStyle = limb;
  d.fillRect(cx - r, cy - r, r * 2, r * 2);
  d.restore();

  // Маска фазы. Терминатор проецируется эллипсом с полуосью r·|1−2k|:
  // при такой границе площадь освещённого участка равна ровно k.
  const t = 1 - 2 * phase.illum;
  const mask = document.createElement("canvas");
  mask.width = size;
  mask.height = size;
  const mc = mask.getContext("2d")!;
  mc.save();
  if (!phase.waxing) {
    // Убывающая луна освещена слева — то же построение зеркально.
    mc.translate(size, 0);
    mc.scale(-1, 1);
  }
  // Мягкий терминатор: у настоящей луны граница света размыта рельефом.
  mc.filter = `blur(${Math.max(0.6, r * 0.045)}px)`;
  mc.beginPath();
  mc.arc(cx, cy, r + 1, -Math.PI / 2, Math.PI / 2, false);
  mc.ellipse(cx, cy, r * Math.abs(t), r + 1, 0, Math.PI / 2, -Math.PI / 2, t > 0);
  mc.closePath();
  mc.fillStyle = "#fff";
  mc.fill();
  mc.restore();

  // Освещённая часть = диск, обрезанный маской фазы.
  d.globalCompositeOperation = "destination-in";
  d.drawImage(mask, 0, 0);
  d.globalCompositeOperation = "source-over";

  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d")!;

  // Ореол вокруг освещённой части — свет рассеивается в атмосфере.
  ctx.globalAlpha = 0.1;
  ctx.filter = `blur(${r * 0.5}px)`;
  ctx.drawImage(disc, 0, 0);
  ctx.globalAlpha = 0.07;
  ctx.filter = `blur(${r * 1.8}px)`;
  ctx.drawImage(disc, 0, 0);
  ctx.filter = "none";
  ctx.globalAlpha = 1;

  // Пепельный свет: неосвещённая часть еле угадывается — её подсвечивает
  // Земля. Только на узких фазах и очень слабо: чуть сильнее — и диск
  // читается серым кругом, а не серпом.
  if (phase.illum < 0.3) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.99, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = withAlpha(color, 0.03 * (1 - phase.illum / 0.3));
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    ctx.restore();
  }

  // Сам диск.
  ctx.globalAlpha = 0.95;
  ctx.drawImage(disc, 0, 0);
  ctx.globalAlpha = 1;

  return c;
}
