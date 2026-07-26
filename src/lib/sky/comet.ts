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

  // Голова — не камень, а горящий поцелуй: ореол и в нём силуэт губ.
  const hr = Math.max(1.5, unit * 0.0045);
  const glow = g.createRadialGradient(hx, hy, 0, hx, hy, hr * 9);
  glow.addColorStop(0, withAlpha(AMBER_HOT, 0.95));
  glow.addColorStop(0.22, withAlpha(AMBER, 0.42));
  glow.addColorStop(1, withAlpha(AMBER, 0));
  g.fillStyle = glow;
  g.fillRect(hx - hr * 9, hy - hr * 9, hr * 18, hr * 18);
  drawKissMark(g, hx, hy, hr * 3.1);
  g.restore();

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = alpha;
  ctx.filter = `blur(${blur}px)`;
  ctx.drawImage(buf, minX, minY);
  ctx.filter = "none";
  ctx.restore();
}

/**
 * Силуэт поцелуя — то, что летит вместо камня.
 *
 * Две дуги верхней губы с ложбинкой посередине и одна нижняя. На размере
 * в несколько пикселей узнаётся именно как поцелуй, а не как пятно: всё
 * держится на ложбинке сверху и на ширине формы.
 */
function drawKissMark(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(r / 10, r / 10);

  ctx.beginPath();
  // Верхняя губа: от левого угла к ложбинке и к правому углу.
  ctx.moveTo(-10, -1.4);
  ctx.bezierCurveTo(-7.5, -7.4, -2.6, -7.4, 0, -2.4);
  ctx.bezierCurveTo(2.6, -7.4, 7.5, -7.4, 10, -1.4);
  // Нижняя губа — одной дугой обратно.
  ctx.bezierCurveTo(7.6, 6.6, 2.8, 9.4, 0, 9.4);
  ctx.bezierCurveTo(-2.8, 9.4, -7.6, 6.6, -10, -1.4);
  ctx.closePath();

  ctx.fillStyle = withAlpha(AMBER_HOT, 1);
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
