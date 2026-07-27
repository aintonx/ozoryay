import { mulberry32 } from "./prng";
import { withAlpha } from "./stars";

/**
 * Млечный Путь — полоса звёздной пыли поперёк неба.
 *
 * Ради него небо перестаёт быть «чёрным фоном с точками»: появляется глубина
 * и ощущение, что это настоящее небо, а не заставка. Рисуется один раз в
 * статический слой, поэтому в кадре ничего не стоит.
 *
 * Строится из трёх слоёв: широкое мягкое свечение, полоса тёмной пыли поверх
 * (у настоящего Млечного Пути посередине идёт разрыв — облака поглощают свет)
 * и россыпь мельчайших звёзд, слишком слабых, чтобы различаться поодиночке.
 */
export function drawMilkyWay(ctx: CanvasRenderingContext2D, w: number, h: number, star: string) {
  // Диагональ через небо. Проходит ниже луны: рядом с ней полоса спорит
  // с диском и оба образа проигрывают.
  const angle = -0.52; // радианы
  const cx = w * 0.38;
  const cy = h * 0.46;
  const len = Math.hypot(w, h) * 1.3;
  const band = h * 0.19; // полуширина полосы

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);

  // Свечение: поперёк полосы яркость спадает от середины к краям.
  const glow = ctx.createLinearGradient(0, -band, 0, band);
  glow.addColorStop(0, withAlpha(star, 0));
  glow.addColorStop(0.22, withAlpha(star, 0.045));
  glow.addColorStop(0.5, withAlpha(star, 0.1));
  glow.addColorStop(0.78, withAlpha(star, 0.045));
  glow.addColorStop(1, withAlpha(star, 0));
  ctx.fillStyle = glow;
  ctx.fillRect(-len / 2, -band, len, band * 2);

  // Сгущения вдоль полосы: настоящий Млечный Путь неровный, местами ярче.
  const clump = mulberry32(773);
  for (let i = 0; i < 7; i++) {
    const u = (clump() - 0.5) * len * 0.85;
    const v = (clump() - 0.5) * band * 0.5;
    const rx = band * (0.5 + clump() * 0.7);
    const ry = band * (0.3 + clump() * 0.35);
    const g2 = ctx.createRadialGradient(u, v, 0, u, v, rx);
    g2.addColorStop(0, withAlpha(star, 0.05));
    g2.addColorStop(0.5, withAlpha(star, 0.02));
    g2.addColorStop(1, withAlpha(star, 0));
    ctx.save();
    ctx.translate(u, v);
    ctx.scale(1, ry / rx);
    ctx.translate(-u, -v);
    ctx.fillStyle = g2;
    ctx.fillRect(u - rx, v - rx, rx * 2, rx * 2);
    ctx.restore();
  }

  // Пылевой разрыв по середине — тёмная жила, из-за неё полоса читается
  // как объёмное облако, а не как ровная подсветка.
  const dust = ctx.createLinearGradient(0, -band * 0.34, 0, band * 0.34);
  dust.addColorStop(0, "rgba(5,7,15,0)");
  dust.addColorStop(0.5, "rgba(5,7,15,0.5)");
  dust.addColorStop(1, "rgba(5,7,15,0)");
  ctx.fillStyle = dust;
  ctx.fillRect(-len / 2, -band * 0.34, len, band * 0.68);

  // Пыль из мельчайших звёзд. Плотность падает к краям полосы.
  const rand = mulberry32(20260630);
  const count = Math.round((w * h) / 900);
  for (let i = 0; i < count; i++) {
    const u = (rand() - 0.5) * len;
    // Сумма двух случайных даёт сгущение к середине полосы.
    const v = ((rand() + rand() - 1) / 2) * band * 1.7;
    // В пылевой жиле звёзд почти не видно — они за облаком.
    const inDust = Math.abs(v) < band * 0.22;
    if (inDust && rand() < 0.72) continue;
    const a = (0.08 + rand() * 0.42) * (1 - Math.abs(v) / (band * 1.7));
    if (a <= 0.012) continue;
    const r = rand() < 0.88 ? 0.4 : 0.7;
    ctx.beginPath();
    ctx.arc(u, v, r, 0, Math.PI * 2);
    ctx.fillStyle = withAlpha(star, a);
    ctx.fill();
  }

  ctx.restore();
}

/** Звезда далёкой россыпи, которая мерцает в кадре, а не запечена в фон. */
export interface FaintStar {
  x: number;
  y: number;
  r: number;
  alpha: number;
  tint: string;
  period: number;
  phase: number;
  amp: number;
}

/**
 * Порог, выше которого звезда россыпи оживает.
 *
 * Ярче него — мерцает в каждом кадре, слабее — остаётся в статическом слое.
 * Мерцать всей россыпью незачем: сотни точек в полпикселя дороже, а глаз
 * замечает дрожание только у тех, что различает поодиночке.
 */
const LIVE_ABOVE = 0.3;

/**
 * Далёкая звёздная россыпь по всему небу.
 *
 * Звёзды-дни — те, что считают разлуку, — их всего два-три десятка, и на
 * пустом небе экран выглядит бедно. Эта россыпь не имеет отношения к счёту:
 * это просто далёкое небо, на несколько порядков слабее. Звёзды-дни на её
 * фоне остаются заметно ярче, поэтому смысл «каждая ночь — звезда» не тонет.
 *
 * Слабая часть уходит в статический слой, заметная — возвращается списком:
 * её рисует кадр, и она дышит. Обе функции идут по одной и той же
 * последовательности с одним зерном, поэтому делят россыпь ровно пополам
 * по яркости и ничего не задваивают.
 */
export function drawFaintStars(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  groundYAt: (x: number) => number,
  tints: readonly string[],
) {
  walkFaintStars(w, h, groundYAt, tints, (s) => {
    if (s.alpha > LIVE_ABOVE) return;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fillStyle = withAlpha(s.tint, s.alpha);
    ctx.fill();
  });
}

/** Те же звёзды, что заметны поодиночке. Их рисует и колышет кадр. */
export function makeLiveFaintStars(
  w: number,
  h: number,
  groundYAt: (x: number) => number,
  tints: readonly string[],
): FaintStar[] {
  const live: FaintStar[] = [];
  walkFaintStars(w, h, groundYAt, tints, (s) => {
    if (s.alpha > LIVE_ABOVE) live.push(s);
  });
  return live;
}

/** Единственный проход по россыпи. Один и тот же для обоих потребителей. */
function walkFaintStars(
  w: number,
  h: number,
  groundYAt: (x: number) => number,
  tints: readonly string[],
  emit: (s: FaintStar) => void,
) {
  const rand = mulberry32(41720260630);
  const count = Math.round((w * h) / 1500);

  for (let i = 0; i < count; i++) {
    const x = rand() * w;
    const yFrac = Math.pow(rand(), 1.25); // к горизонту реже: там дымка
    const limit = groundYAt(x / w) * h;
    const y = yFrac * limit;
    const alpha = 0.06 + Math.pow(rand(), 2.4) * 0.5;
    const r = rand() < 0.82 ? 0.4 : 0.62;
    const tint = tints[Math.floor(rand() * tints.length)];
    const period = 2.6 + rand() * 4.4;
    const phase = rand() * Math.PI * 2;
    const amp = 0.3 + rand() * 0.45;
    // Числа тянем всегда, даже для отброшенной звезды: иначе оба прохода
    // разойдутся и россыпь развалится на две разные.
    if (y > limit - 4) continue;
    emit({ x, y, r, alpha, tint, period, phase, amp });
  }
}

/**
 * Тонкий слой дымки у самой земли. Даёт воздух между небом и силуэтом —
 * без него холмы выглядят наклейкой поверх фона.
 */
export function drawGroundHaze(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  horizonY: number,
  color: string,
) {
  const top = horizonY - h * 0.1;
  const g = ctx.createLinearGradient(0, top, 0, horizonY + h * 0.02);
  g.addColorStop(0, withAlpha(color, 0));
  g.addColorStop(0.55, withAlpha(color, 0.035));
  g.addColorStop(1, withAlpha(color, 0.07));
  ctx.fillStyle = g;
  ctx.fillRect(0, top, w, horizonY - top + h * 0.02);
}
