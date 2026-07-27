import { glowXFromBearing } from "./layout";
import { withAlpha } from "./stars";

const AMBER = "#F2C57C";
const AMBER_HOT = "#FFE3B0";

/** Сколько длится падение кометы, секунд. */
export const COMET_DURATION = 2.4;

/** Квадратичная кривая Безье по одной координате. */
function bezier(t: number, p0: number, c: number, p1: number): number {
  const u = 1 - t;
  return u * u * p0 + 2 * u * t * c + t * t * p1;
}

/**
 * Комета, падающая за горизонт, — послание, отправленное в ночь.
 *
 * Летит из верхней части неба вниз к линии холмов, в сторону её города
 * (туда же, где зарево), и уходит за горизонт. Рисуется ДО силуэта земли,
 * поэтому у самого горизонта её скрывают холмы — она исчезает за ними,
 * а не гаснет в воздухе.
 *
 * `e` — секунды с начала полёта.
 */
export function drawComet(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  e: number,
  bearingDeg: number,
) {
  const p = e / COMET_DURATION;
  if (p < 0 || p > 1) return;

  const glowX = glowXFromBearing(bearingDeg);
  // Траектория в долях вьюпорта: старт высоко справа, конец — за горизонтом
  // на её стороне. Контрольная точка выгибает дугу падения.
  const S = { x: 0.82, y: 0.05 };
  const C = { x: 0.6, y: 0.5 };
  const E = { x: glowX, y: 1.08 };

  // Падение ускоряется к земле.
  const head = Math.pow(p, 1.35);
  const bx = (t: number) => bezier(t, S.x, C.x, E.x) * w;
  const by = (t: number) => bezier(t, S.y, C.y, E.y) * h;

  // Быстрое проявление, плавный уход хвоста в конце.
  const alpha = Math.min(1, p / 0.07) * (1 - Math.max(0, (p - 0.82) / 0.18));
  if (alpha <= 0.001) return;

  const unit = Math.min(w, h);
  const hx = bx(head);
  const hy = by(head);

  // Куда он летит прямо сейчас — по касательной к кривой.
  //
  // Отпечаток разворачивается по курсу, но не вдоль него, а поперёк: губы
  // идут перпендикулярно движению, отпечатком вперёд. Вдоль курса он вставал
  // бы на ребро и превращался в светлую щепку — узнать в ней поцелуй нельзя,
  // а узнать надо. Наклон при этом всё равно меняется вместе с падением.
  const ahead = Math.min(1, head + 0.02);
  const behind = Math.max(0, head - 0.02);
  const course =
    Math.atan2(by(ahead) - by(behind), bx(ahead) - bx(behind)) - Math.PI / 2;

  // Точки хвоста позади головы вдоль кривой.
  const N = 22;
  const tailSpan = 0.22;
  const pts: Array<{ x: number; y: number; f: number; live: boolean }> = [];
  for (let i = 0; i < N; i++) {
    const f = i / (N - 1);
    const t = head - tailSpan * f;
    pts.push({ x: bx(Math.max(0, t)), y: by(Math.max(0, t)), f, live: t > 0 });
  }

  // Комета собирается на офскрине и композируется с размытием — так хвост из
  // резких отрезков превращается в мягкий шлейф, а голова перестаёт быть
  // «наклеенной» точкой. Это и делает её мягче и реалистичнее.
  const blur = unit * 0.005 + 1.4;
  const halo = unit * 0.05;
  let minX = hx;
  let minY = hy;
  let maxX = hx;
  let maxY = hy;
  for (const q of pts) {
    minX = Math.min(minX, q.x);
    minY = Math.min(minY, q.y);
    maxX = Math.max(maxX, q.x);
    maxY = Math.max(maxY, q.y);
  }
  const pad = blur * 2 + halo;
  minX -= pad;
  minY -= pad;
  maxX += pad;
  maxY += pad;
  const bw = Math.ceil(maxX - minX);
  const bh = Math.ceil(maxY - minY);
  if (bw <= 0 || bh <= 0) return;

  const buf = cometScratch(bw, bh);
  const g = buf.getContext("2d")!;
  g.globalCompositeOperation = "source-over";
  g.filter = "none";
  g.clearRect(0, 0, bw, bh);
  g.save();
  g.translate(-minX, -minY);
  g.lineCap = "round";

  // Хвост — сужается и тает.
  for (let i = 0; i < N - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    if (!a.live && !b.live) continue;
    g.strokeStyle = withAlpha(a.f < 0.28 ? AMBER_HOT : AMBER, (1 - a.f) * (1 - a.f) * 0.6);
    g.lineWidth = Math.max(0.8, (1 - a.f) * unit * 0.007);
    g.beginPath();
    g.moveTo(a.x, a.y);
    g.lineTo(b.x, b.y);
    g.stroke();
  }

  // Ореол вокруг головы — он и уходит в общее размытие вместе с хвостом.
  // Сам отпечаток заметно крупнее искры: на десяти пикселях узнать в нём
  // поцелуй невозможно, а узнать надо.
  const hr = Math.min(23, Math.max(9, unit * 0.033));
  const glowR = hr * 2.1;
  const glow = g.createRadialGradient(hx, hy, 0, hx, hy, glowR);
  // Ядро приглушено: на ярком пятне сам отпечаток перестаёт читаться.
  glow.addColorStop(0, withAlpha(AMBER, 0.4));
  glow.addColorStop(0.38, withAlpha(AMBER, 0.24));
  glow.addColorStop(1, withAlpha(AMBER, 0));
  g.fillStyle = glow;
  g.fillRect(hx - glowR, hy - glowR, glowR * 2, glowR * 2);
  g.restore();

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = alpha;
  ctx.filter = `blur(${blur}px)`;
  ctx.drawImage(buf, minX, minY);
  ctx.filter = "none";
  ctx.restore();

  // Сам отпечаток — поверх размытия и без него. Под общим блюром он
  // превращался в светлую кляксу, и понять, что это поцелуй, было нельзя;
  // а понять надо, иначе за горизонт улетает просто камень.
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = alpha;
  ctx.translate(hx, hy);
  ctx.rotate(course);
  drawKissMark(ctx, 0, 0, hr);
  ctx.restore();
}

/**
 * Отпечаток губ — то, что летит вместо камня.
 *
 * Две доли с зазором по линии смыкания, ширина вдвое больше высоты: ровно
 * та же форма, что у иконки на кнопке (см. `IconKiss`). Цельный силуэт с
 * ложбинкой сверху на таком размере читается как сердце, а зазор и ширина
 * не оставляют глазу выбора.
 *
 * Рисуется в своей системе координат: вызывающий уже перенёс начало в
 * голову кометы и развернул её по курсу.
 */
function drawKissMark(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.save();
  ctx.translate(x, y);
  // Исходные координаты — в сетке 24×24 с центром в (12, 13).
  ctx.scale(r / 11, r / 11);
  ctx.translate(-12, -13);
  ctx.fillStyle = withAlpha(AMBER_HOT, 1);

  // Верхняя губа.
  ctx.beginPath();
  ctx.moveTo(2.2, 11.9);
  ctx.bezierCurveTo(3.4, 8.4, 5.6, 6.6, 7.6, 6.6);
  ctx.bezierCurveTo(9.4, 6.6, 10.9, 7.7, 12, 9.5);
  ctx.bezierCurveTo(13.1, 7.7, 14.6, 6.6, 16.4, 6.6);
  ctx.bezierCurveTo(18.4, 6.6, 20.6, 8.4, 21.8, 11.9);
  ctx.bezierCurveTo(19.6, 11.2, 15.9, 10.8, 12, 10.8);
  ctx.bezierCurveTo(8.1, 10.8, 4.4, 11.2, 2.2, 11.9);
  ctx.closePath();
  ctx.fill();

  // Нижняя губа.
  ctx.beginPath();
  ctx.moveTo(2.2, 13.1);
  ctx.bezierCurveTo(4.4, 12.5, 8.1, 12.1, 12, 12.1);
  ctx.bezierCurveTo(15.9, 12.1, 19.6, 12.5, 21.8, 13.1);
  ctx.bezierCurveTo(20.2, 16.9, 16.4, 19.4, 12, 19.4);
  ctx.bezierCurveTo(7.6, 19.4, 3.8, 16.9, 2.2, 13.1);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

/** Переиспользуемый офскрин для кометы. */
let cometCanvas: HTMLCanvasElement | null = null;
function cometScratch(w: number, h: number): HTMLCanvasElement {
  if (!cometCanvas) cometCanvas = document.createElement("canvas");
  if (cometCanvas.width !== w) cometCanvas.width = w;
  if (cometCanvas.height !== h) cometCanvas.height = h;
  return cometCanvas;
}
