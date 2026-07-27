import { glowXFromBearing, groundYAt } from "./layout";
import { withAlpha } from "./stars";

const AMBER = "#F2C57C";
const AMBER_HOT = "#FFE3B0";

/** Сколько длится весь восход: подъём, пять секунд стоя и уход. */
export const DAWN_TOTAL = 10;
const RISE_END = 2.6;
/** Момент, с которого солнце начинает уходить обратно за холмы. */
export const DAWN_HOLD_END = 7.4;
const HOLD_END = DAWN_HOLD_END;

/**
 * Насколько солнце поднялось: 0 — целиком за холмами, 1 — на своей высоте.
 *
 * Кривая повторяет CSS-анимацию заголовка (`title-dawn`): подъём с сильным
 * замедлением к вершине, пять секунд покоя, уход с ускорением. Заголовок
 * едет по DOM, солнце — по канвасу, и разъезжаться им нельзя.
 */
export function dawnRise(t: number): number {
  if (t <= 0) return 0;
  if (t < RISE_END) return 1 - Math.pow(1 - t / RISE_END, 5);
  if (t < HOLD_END) return 1;
  if (t < DAWN_TOTAL) {
    const k = (t - HOLD_END) / (DAWN_TOTAL - HOLD_END);
    return 1 - k * k;
  }
  return 0;
}

/**
 * Восход — на самом канвасе, а не слоем поверх него.
 *
 * Это важнее, чем кажется: солнце ближе звёзд и дальше холмов. Пока оно
 * рисовалось в DOM над всей картиной, сквозь него просвечивали и звёзды,
 * и деревья. Здесь оно ложится после звёзд и до силуэта земли — и всё
 * встаёт на свои места само собой.
 *
 * `rise` — насколько солнце поднялось, от 0 до 1.
 */
export function drawDawn(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  rise: number,
  bearingDeg: number,
) {
  if (rise <= 0.001) return;

  const x = glowXFromBearing(bearingDeg) * w;
  const ground = groundYAt(glowXFromBearing(bearingDeg)) * h;
  // Внизу солнце спрятано за хребтом целиком; наверху центр стоит на линии
  // земли, и над ней остаётся купол.
  const y = ground + (1 - rise) * h * 0.3;

  ctx.save();
  // Всё, что ниже линии холмов, всё равно закроет силуэт земли, но клип
  // избавляет от лишней заливки на полэкрана в каждом кадре.
  ctx.beginPath();
  ctx.rect(0, 0, w, ground + 2);
  ctx.clip();

  // Высокий слабый отсвет: небо над рассветом.
  paint(x, y, w * 0.75, h * 0.31, [
    [0, withAlpha(AMBER, 0.1 * rise)],
    [0.34, withAlpha(AMBER, 0.042 * rise)],
    [1, withAlpha(AMBER, 0)],
  ]);

  // Узкая яркая полоса у самой земли.
  paint(x, y, w * 1.15, h * 0.17, [
    [0, withAlpha(AMBER_HOT, 0.34 * rise)],
    [0.26, withAlpha(AMBER, 0.18 * rise)],
    [0.52, withAlpha(AMBER, 0.06 * rise)],
    [1, withAlpha(AMBER, 0)],
  ]);

  // Сам диск. Края у него нет — граница растворяется в собственном свете,
  // иначе это читается как восходящая луна, а не как начало рассвета.
  const r = Math.min(w * 0.26, h * 0.16);
  paint(x, y, r, r, [
    [0, withAlpha(AMBER_HOT, 0.92 * rise)],
    [0.36, withAlpha(AMBER_HOT, 0.82 * rise)],
    [0.52, withAlpha(AMBER_HOT, 0.44 * rise)],
    [0.66, withAlpha(AMBER, 0.16 * rise)],
    [0.82, withAlpha(AMBER, 0.04 * rise)],
    [1, withAlpha(AMBER, 0)],
  ]);

  ctx.restore();

  /** Эллиптическое пятно: круглый градиент, растянутый по осям. */
  function paint(cx: number, cy: number, rx: number, ry: number, stops: Array<[number, string]>) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(1, ry / rx);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
    for (const [at, color] of stops) g.addColorStop(at, color);
    ctx.fillStyle = g;
    ctx.fillRect(-rx, -rx, rx * 2, rx * 2);
    ctx.restore();
  }
}
