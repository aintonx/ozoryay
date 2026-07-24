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

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";

  // Хвост: цепочка отрезков вдоль кривой позади головы, сужается и тает.
  const N = 18;
  const tailSpan = 0.2;
  for (let i = 0; i < N - 1; i++) {
    const f0 = i / (N - 1);
    const f1 = (i + 1) / (N - 1);
    const t0 = head - tailSpan * f0;
    const t1 = head - tailSpan * f1;
    if (t0 <= 0 && t1 <= 0) continue;
    const a = (1 - f0) * (1 - f0) * 0.55 * alpha;
    ctx.strokeStyle = withAlpha(f0 < 0.3 ? AMBER_HOT : AMBER, a);
    ctx.lineWidth = Math.max(0.6, (1 - f0) * unit * 0.006);
    ctx.beginPath();
    ctx.moveTo(bx(Math.max(0, t0)), by(Math.max(0, t0)));
    ctx.lineTo(bx(Math.max(0, t1)), by(Math.max(0, t1)));
    ctx.stroke();
  }

  // Голова: горячее ядро с ореолом.
  const hx = bx(head);
  const hy = by(head);
  const r = Math.max(1.6, unit * 0.0042);
  const halo = r * 11;
  const g = ctx.createRadialGradient(hx, hy, 0, hx, hy, halo);
  g.addColorStop(0, withAlpha(AMBER_HOT, 0.9 * alpha));
  g.addColorStop(0.18, withAlpha(AMBER, 0.4 * alpha));
  g.addColorStop(1, withAlpha(AMBER, 0));
  ctx.fillStyle = g;
  ctx.fillRect(hx - halo, hy - halo, halo * 2, halo * 2);

  ctx.beginPath();
  ctx.arc(hx, hy, r, 0, Math.PI * 2);
  ctx.fillStyle = withAlpha(AMBER_HOT, alpha);
  ctx.fill();

  ctx.restore();
}
