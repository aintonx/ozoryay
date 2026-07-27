import { EMOJI_FONT, KISS } from "../emoji";
import { glowXFromBearing } from "./layout";
import { withAlpha } from "./stars";

/**
 * Комета светит красным, а не амбером.
 *
 * Единственное отступление от палитры на всём сайте — и оно вынужденное:
 * голова кометы это отпечаток губ, он красный, и амберный шлейф за красной
 * головой смотрелся склейкой из двух разных картинок. Цвета взяты из
 * самого эмодзи, поэтому хвост читается как свет от него.
 */
const RED = "#E24A55";
const RED_HOT = "#FF8A90";

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

  // Куда он летит прямо сейчас — по касательной к кривой. Отпечаток идёт
  // по своей длинной оси: уголок губ впереди, хвост позади.
  const ahead = Math.min(1, head + 0.02);
  const behind = Math.max(0, head - 0.02);
  const course = Math.atan2(by(ahead) - by(behind), bx(ahead) - bx(behind));

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
    g.strokeStyle = withAlpha(a.f < 0.28 ? RED_HOT : RED, (1 - a.f) * (1 - a.f) * 0.6);
    g.lineWidth = Math.max(0.8, (1 - a.f) * unit * 0.007);
    g.beginPath();
    g.moveTo(a.x, a.y);
    g.lineTo(b.x, b.y);
    g.stroke();
  }

  // Ореол вокруг головы — он и уходит в общее размытие вместе с хвостом.
  // Размер головы: узнать поцелуй надо, но и комета должна оставаться
  // кометой, а не летящей наклейкой во весь экран.
  const hr = Math.min(15, Math.max(8, unit * 0.026));
  const glowR = hr * 2.2;
  const glow = g.createRadialGradient(hx, hy, 0, hx, hy, glowR);
  glow.addColorStop(0, withAlpha(RED_HOT, 0.5));
  glow.addColorStop(0.4, withAlpha(RED, 0.26));
  glow.addColorStop(1, withAlpha(RED, 0));
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

  // Сам отпечаток — поверх общего размытия, но со своим, слабым: без него
  // резкий глиф лежит на мягком шлейфе наклейкой, с полным — превращается
  // в кляксу, и понять, что это поцелуй, уже нельзя.
  //
  // Складывать его свет с фоном («lighter») тоже нельзя: цветной глиф от
  // этого выцветает добела. Кладём как есть.
  ctx.save();
  ctx.globalAlpha = alpha * 0.92;
  ctx.filter = `blur(${Math.max(0.6, hr * 0.055)}px)`;
  ctx.translate(hx, hy);
  ctx.rotate(course);
  // Отражение по горизонтали: после него вперёд по курсу смотрит левый
  // уголок губ — он и работает носом ракеты, а верх отпечатка остаётся
  // верхом. Без отражения вперёд шёл бы правый край, хвостом вперёд.
  ctx.scale(-1, 1);
  drawKissMark(ctx, hr * 2.2);
  ctx.filter = "none";
  ctx.restore();
}

/**
 * Отпечаток губ — то, что летит вместо камня.
 *
 * Не рисунок, а системный эмодзи 💋: ровно тот же символ, что стоит на
 * кнопке. Нарисованные губы на таком размере узнавались только тем, кто
 * знает, что ищет, — а понять, что за горизонт улетает поцелуй, должно быть
 * можно с первого взгляда.
 *
 * Рисуется в своей системе координат: вызывающий уже перенёс начало в
 * голову кометы и развернул её по курсу.
 */
function drawKissMark(ctx: CanvasRenderingContext2D, size: number) {
  ctx.font = `${size}px ${EMOJI_FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(KISS, 0, 0);
}

/** Переиспользуемый офскрин для кометы. */
let cometCanvas: HTMLCanvasElement | null = null;
function cometScratch(w: number, h: number): HTMLCanvasElement {
  if (!cometCanvas) cometCanvas = document.createElement("canvas");
  if (cometCanvas.width !== w) cometCanvas.width = w;
  if (cometCanvas.height !== h) cometCanvas.height = h;
  return cometCanvas;
}
