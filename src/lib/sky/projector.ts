import { projectorMetrics } from "./layout";
import { withAlpha } from "./stars";

const AMBER = "#F2C57C";
const AMBER_HOT = "#FFE3B0";

/** Фазы одного проката, секунды от начала. */
const RISE = 1.4; // луч поднимается
const FADE_IN = 1.1; // фото проявляется
const HOLD_END = 7.6; // до этого момента фото держится
const FADE_OUT = 8.7; // фото гаснет
const RETRACT = 9.6; // луч убирается
export const PROJECTOR_TOTAL = RETRACT;
/** Момент, когда луч уже поднят: сюда перематывают при смене кадра. */
export const PROJECTOR_SWAP_AT = RISE - 0.3;

export interface ProjectorImage {
  el: CanvasImageSource;
  w: number;
  h: number;
}

/**
 * Куда бьёт луч. Небольшая дуга в верхней части неба, левее центра.
 *
 * Пятно стоит ниже, чем стояло раньше: круг вырос вдвое, и на прежней
 * высоте он упирался бы верхним краем в край экрана на широких мониторах.
 */
function target(w: number, h: number, sweep: number) {
  const x = (0.44 + 0.12 * sweep) * w;
  const y = (0.34 - 0.015 * sweep) * h;
  return { x, y };
}

/**
 * Радиус светового круга.
 *
 * Считается от меньшей стороны, но не может подняться выше собственной
 * высоты на экране: иначе на широком мониторе круг вылезал бы за верхний
 * край, а обрезанный круг света сразу перестаёт быть кругом света.
 */
function discRadius(w: number, h: number, targetY: number) {
  return Math.min(Math.min(w, h) * 0.4, targetY * 0.85);
}

function easeOut(x: number): number {
  return 1 - Math.pow(1 - x, 3);
}
function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

/**
 * Один прокат прожектора: луч поднимается, ведёт по небу, упирается в дымку,
 * в пятне проявляется фотография и гаснет. Рисуется поверх ночного неба,
 * но под вечной звездой — лампа не гаснет ни при каком свете.
 *
 * `e` — секунды с начала проката; `token` задаёт дрожание и микросдвиг пятна,
 * чтобы два проката не совпадали.
 */
export function drawProjector(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  e: number,
  image: ProjectorImage | null,
  token: number,
  reducedMotion: boolean,
  /**
   * Множитель схлопывания, 1..0.
   *
   * Когда прокат закрывают свайпом, ждать честного ухода луча незачем: он
   * длится две секунды и выглядит так, будто жест не сработал. Здесь всё
   * гаснет за треть секунды — и луч, и фотография разом.
   */
  collapse = 1,
) {
  if (collapse <= 0.001) return;
  const { lens, size } = projectorMetrics(w, h);

  // Луч поднимается в начале и убирается в конце.
  const rise = easeOut(clamp01(e / RISE));
  const retract = 1 - easeOut(clamp01((e - FADE_OUT) / (RETRACT - FADE_OUT)));
  const beamLen = (reducedMotion ? 1 : Math.min(rise, retract)) * collapse;
  if (beamLen <= 0.001) return;

  // Медленный проход по небу — только пока фото висит.
  const sweepRaw = clamp01((e - RISE) / (HOLD_END - RISE));
  const sweep = reducedMotion ? 0.5 : easeOut(sweepRaw);
  const tgt = target(w, h, sweep);

  // Дрожание пятна: два несоизмеримых синуса не дают узору повториться.
  const jx = reducedMotion ? 0 : Math.sin(e * 2.3 + token) * 2.2 + Math.sin(e * 5.1) * 1.1;
  const jy = reducedMotion ? 0 : Math.cos(e * 1.9 + token * 1.3) * 1.8;
  const tip = { x: tgt.x + jx, y: tgt.y + jy };

  // Текущий конец луча, пока он поднимается.
  const end = {
    x: lens.x + (tip.x - lens.x) * beamLen,
    y: lens.y + (tip.y - lens.y) * beamLen,
  };

  // Радиус круга и полуширина луча на его конце — одно и то же число:
  // свет не может быть уже пятна, которое он рисует, и не должен быть шире.
  const discR = discRadius(w, h, tgt.y) * 0.92;

  // Луч, потом яркое ядро на самой линзе. Ядро рисуется после луча и поверх
  // него: свет должен рождаться из линзы, а не начинаться где-то в воздухе.
  drawBeam(ctx, lens, end, discR * beamLen, beamLen, size);
  drawLensCore(ctx, lens, size, beamLen);

  // Фото проявляется и гаснет.
  const photoAlpha =
    easeOut(clamp01((e - (RISE - 0.3)) / FADE_IN)) *
    (1 - easeOut(clamp01((e - HOLD_END) / (FADE_OUT - HOLD_END)))) *
    collapse;

  if (image && photoAlpha > 0.001) {
    drawProjection(ctx, image, tip, discR, photoAlpha);
  }
}

/** Яркое горячее ядро на срезе линзы — видимый источник луча. */
function drawLensCore(
  ctx: CanvasRenderingContext2D,
  lens: { x: number; y: number },
  size: number,
  intensity: number,
) {
  const r = size * 0.62 * (0.6 + 0.4 * intensity);
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const g = ctx.createRadialGradient(lens.x, lens.y, 0, lens.x, lens.y, r);
  g.addColorStop(0, withAlpha(AMBER_HOT, 0.9 * intensity));
  g.addColorStop(0.28, withAlpha(AMBER_HOT, 0.35 * intensity));
  g.addColorStop(0.6, withAlpha(AMBER, 0.1 * intensity));
  g.addColorStop(1, withAlpha(AMBER, 0));
  ctx.fillStyle = g;
  ctx.fillRect(lens.x - r, lens.y - r, r * 2, r * 2);
  ctx.restore();
}

/**
 * Конус света от линзы к пятну. Узкий у линзы, широкий вверху.
 *
 * Плоский залитый треугольник читается как серый клин, а не как свет.
 * Поэтому луч собирается на офскрине и размывается: мягкие края вдоль оси
 * дают объём, а яркость, падающая к концу, — ощущение расстояния. Компонуется
 * через «lighter», как и положено свету, — он складывается, а не кроет.
 */
function drawBeam(
  ctx: CanvasRenderingContext2D,
  from: { x: number; y: number },
  to: { x: number; y: number },
  halfWidth: number,
  intensity: number,
  size: number,
) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy);
  if (len < 1) return;

  const nx = -dy / len;
  const ny = dx / len;
  const base = size * 0.16; // полуширина у линзы — с размер самой линзы

  const pts = [
    { x: from.x + nx * base, y: from.y + ny * base },
    { x: to.x + nx * halfWidth, y: to.y + ny * halfWidth },
    { x: to.x - nx * halfWidth, y: to.y - ny * halfWidth },
    { x: from.x - nx * base, y: from.y - ny * base },
  ];

  // Офскрин с запасом под размытие краёв.
  const blur = size * 0.5;
  const pad = blur * 2.2;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of pts) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  minX -= pad;
  minY -= pad;
  maxX += pad;
  maxY += pad;
  const bw = Math.ceil(maxX - minX);
  const bh = Math.ceil(maxY - minY);
  if (bw <= 0 || bh <= 0) return;

  const buf = beamScratch(bw, bh);
  const bx = buf.getContext("2d")!;
  bx.globalCompositeOperation = "source-over";
  bx.filter = "none";
  bx.clearRect(0, 0, bw, bh);

  bx.save();
  bx.translate(-minX, -minY);
  const grad = bx.createLinearGradient(from.x, from.y, to.x, to.y);
  grad.addColorStop(0, withAlpha(AMBER_HOT, 0.34 * intensity));
  grad.addColorStop(0.35, withAlpha(AMBER, 0.12 * intensity));
  grad.addColorStop(1, withAlpha(AMBER, 0));
  bx.beginPath();
  bx.moveTo(pts[0].x, pts[0].y);
  bx.lineTo(pts[1].x, pts[1].y);
  bx.lineTo(pts[2].x, pts[2].y);
  bx.lineTo(pts[3].x, pts[3].y);
  bx.closePath();
  bx.fillStyle = grad;
  bx.fill();
  bx.restore();

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.filter = `blur(${blur}px)`;
  ctx.drawImage(buf, minX, minY);
  ctx.filter = "none";
  ctx.restore();
}

/**
 * Фотография в пятне света — КРУГОМ, как световой круг прожектора, а не
 * прямоугольным кадром. Размытие, обесцвечивание, невысокая непрозрачность,
 * мягкий круглый край, растворяющийся в свете. Не картинка в рамке — образ,
 * проступивший в луче.
 *
 * Фото масштабируется «по кругу» (cover): заполняет диск целиком, без пустых
 * углов, лишнее обрезается. Собирается на офскрине — filter и destination-in
 * задели бы звёзды, будь это на главном холсте.
 */
function drawProjection(
  ctx: CanvasRenderingContext2D,
  image: ProjectorImage,
  center: { x: number; y: number },
  R: number,
  alpha: number,
) {
  const D = Math.ceil(R * 2);
  const buf = photoScratch(D, D);
  const bx = buf.getContext("2d")!;
  // Офскрин переиспользуется между кадрами: возвращаем режим и фильтр
  // в исходное, иначе оставленный destination-in сотрёт следующий кадр.
  bx.globalCompositeOperation = "source-over";
  bx.filter = "none";
  bx.clearRect(0, 0, D, D);

  // cover: меньшая сторона фото укладывается в диаметр круга, остальное режется.
  const scale = D / Math.min(image.w, image.h);
  const iw = image.w * scale;
  const ih = image.h * scale;

  // Матовость и мягкость: свет проецирует воспоминание, а не фотоснимок.
  bx.filter = "blur(2px) saturate(45%) brightness(1.12) contrast(0.95)";
  bx.drawImage(image.el, (D - iw) / 2, (D - ih) / 2, iw, ih);
  bx.filter = "none";

  // Круглая маска с мягким краем: держит центр плотным, к ободу тает.
  bx.globalCompositeOperation = "destination-in";
  const m = bx.createRadialGradient(R, R, 0, R, R, R);
  m.addColorStop(0, "rgba(0,0,0,1)");
  m.addColorStop(0.7, "rgba(0,0,0,1)");
  m.addColorStop(0.88, "rgba(0,0,0,0.5)");
  m.addColorStop(1, "rgba(0,0,0,0)");
  bx.fillStyle = m;
  bx.fillRect(0, 0, D, D);
  bx.globalCompositeOperation = "source-over";

  // Пятно дымки под фото — свету есть на что лечь, круг сидит в пуле света.
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const pool = ctx.createRadialGradient(center.x, center.y, R * 0.4, center.x, center.y, R * 1.5);
  pool.addColorStop(0, withAlpha(AMBER, 0.06 * alpha));
  pool.addColorStop(1, withAlpha(AMBER, 0));
  ctx.fillStyle = pool;
  ctx.fillRect(center.x - R * 1.5, center.y - R * 1.5, R * 3, R * 3);
  ctx.restore();

  // Круг ложится ровно, без наклона и сжатия. Перспектива здесь пробовалась
  // и была снята: любое искажение уродует лица, а лица — это единственное,
  // ради чего прожектор существует.
  ctx.save();
  ctx.globalAlpha = alpha * 0.66;
  ctx.drawImage(buf, center.x - R, center.y - R);
  ctx.restore();
}

/**
 * Два переиспользуемых офскрина: под луч и под фото. Не плодим канвасы
 * в каждом кадре и не заставляем их бороться за один буфер.
 */
let beamCanvas: HTMLCanvasElement | null = null;
function beamScratch(w: number, h: number): HTMLCanvasElement {
  if (!beamCanvas) beamCanvas = document.createElement("canvas");
  if (beamCanvas.width !== w) beamCanvas.width = w;
  if (beamCanvas.height !== h) beamCanvas.height = h;
  return beamCanvas;
}

let photoCanvas: HTMLCanvasElement | null = null;
function photoScratch(w: number, h: number): HTMLCanvasElement {
  if (!photoCanvas) photoCanvas = document.createElement("canvas");
  if (photoCanvas.width !== w) photoCanvas.width = w;
  if (photoCanvas.height !== h) photoCanvas.height = h;
  return photoCanvas;
}
