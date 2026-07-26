import { LAYOUT } from "./layout";
import { mulberry32, r2 } from "./prng";

export interface DayStar {
  /** Порядковый номер ночи. Звезда №57 всегда в одной и той же точке. */
  night: number;
  x: number; // 0..1
  y: number; // 0..1
  /** Яркость 0..1: определяет и размер, и базовую прозрачность. */
  mag: number;
  /** Период мерцания в секундах, 3..8. */
  period: number;
  /** Начальная фаза, чтобы небо не дышало в такт. */
  phase: number;
  /** Оттенок 0..1: 0 — голубая звезда, 1 — тёплая. Их цвет — это температура. */
  tint: number;
}

/**
 * Оттенки звёздного света: от голубовато-белого до чуть тёплого.
 *
 * Настоящие звёзды не одинаково белые — их цвет зависит от температуры.
 * Одинаковые точки читаются как заставка; разброс оттенков превращает поле
 * в небо. Гамма остаётся холодной: единственный тёплый цвет проекта —
 * амбер писем и прожектора, и он сюда не заходит.
 */
export const STAR_TINTS = [
  "#A9C2F2", // голубая
  "#BCCFF3", //
  "#C9D6F0", // основная (--star)
  "#DCE0F0", //
  "#EFE6E2", // тёплый белый
] as const;

/**
 * Звёзды-дни. Позиция выводится только из номера ночи, поэтому небо
 * не перетасовывается между визитами — оно растёт.
 *
 * База — последовательность R2 (почти равномерная, без следа решётки),
 * поверх неё мелкое дрожание от mulberry32: без дрожания расположение
 * читается как узор, с чистым random — как комки.
 */
export function makeDayStars(count: number): DayStar[] {
  const stars: DayStar[] = [];
  for (let n = 1; n <= count; n++) stars.push(makeDayStar(n));
  return stars;
}

/**
 * Зона вокруг луны, куда звёзды не ставятся.
 *
 * Рядом с луной слабые звёзды не видны и в настоящем небе — засветка съедает
 * их. Но здесь важнее другое: без этой зоны любая звезда может выпасть прямо
 * на диск и потеряться. Именно так случилось с ночью №24 — рождение звезды,
 * ради которого всё затевалось, произошло бы в ореоле луны и осталось
 * незамеченным.
 */
const MOON_KEEP_OUT = { rx: 0.125, ry: 0.088 };

function insideMoonHalo(x: number, y: number): boolean {
  const dx = (x - LAYOUT.moon.x) / MOON_KEEP_OUT.rx;
  const dy = (y - LAYOUT.moon.y) / MOON_KEEP_OUT.ry;
  return dx * dx + dy * dy < 1;
}

/**
 * Одна звезда по номеру ночи. Считается без остальных: нужна для подписи.
 *
 * Если позиция попала в засветку луны, звезда переставляется по другому
 * индексу той же последовательности. Выбор остаётся детерминированным:
 * звезда №57 всегда окажется там же, где была вчера.
 */
export function makeDayStar(n: number): DayStar {
  for (let attempt = 0; attempt < 8; attempt++) {
    const s = placeStar(n, n + attempt * 7919);
    if (!insideMoonHalo(s.x, s.y)) return s;
  }
  // За восемь попыток промахнуться мимо неба нельзя, но пусть будет ответ.
  return placeStar(n, n + 7 * 7919);
}

function placeStar(night: number, seed: number): DayStar {
  const [rx, ry] = r2(seed);
  const rand = mulberry32(seed * 2654435761);

  // Дрожание крупное намеренно: при малом числе звёзд решётка R2
  // просвечивает диагональными рядами и небо читается как узор.
  const jitterX = (rand() - 0.5) * 0.13;
  const jitterY = (rand() - 0.5) * 0.13;

  const x = clamp01(rx + jitterX);

  // Плотность падает к горизонту: там, где дымка, звёзд видно меньше.
  const shaped = Math.pow(clamp01(ry + jitterY), 1.16);
  const y = LAYOUT.skyTop + shaped * (LAYOUT.groundY - 0.055 - LAYOUT.skyTop);

  // Ярких звёзд мало, слабых много — как в настоящем небе.
  const mag = Math.pow(rand(), 2.6);
  const period = 3 + rand() * 5;
  const phase = rand() * Math.PI * 2;
  // Оттенок тяготеет к середине шкалы: крайние цвета — редкость.
  const tint = (rand() + rand()) / 2;

  return { night, x, y, mag, period, phase, tint };
}

function clamp01(v: number) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/**
 * Спрайт звезды: мягкое пятно с плавным затуханием.
 *
 * Рисовать сотни радиальных градиентов в каждом кадре недопустимо, поэтому
 * градиент считается один раз, а дальше выкладывается через drawImage.
 */
export function makeStarSprite(
  color: string,
  radius: number,
  dpr: number,
  /** Длина лучиков в радиусах. 0 — без них: они уместны только у ярких. */
  spikes = 0,
): HTMLCanvasElement {
  // Ореол тем шире, чем ярче звезда: у слабых он почти отсутствует,
  // иначе мелкие звёзды превращаются в одинаковые ватные пятна.
  const spread = 2.4 + (radius / 1.75) * 2.6;
  const outer = Math.max(radius * spread, radius * spikes * 1.15);
  const size = Math.max(4, Math.ceil(outer * 2 * dpr));
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;

  const ctx = c.getContext("2d")!;
  const mid = size / 2;
  const rPx = radius * dpr;

  // Лучики — то, как глаз видит яркую звезду. Рисуются под ореолом,
  // поэтому расходятся из свечения, а не лежат поверх него.
  if (spikes > 0) {
    const len = radius * spikes * dpr;
    ctx.save();
    ctx.translate(mid, mid);
    for (const [dx, dy, k] of [
      [1, 0, 1],
      [0, 1, 0.82], // вертикальный чуть короче — так живее
    ] as const) {
      const g = ctx.createLinearGradient(-dx * len * k, -dy * len * k, dx * len * k, dy * len * k);
      g.addColorStop(0, withAlpha(color, 0));
      g.addColorStop(0.42, withAlpha(color, 0.12));
      g.addColorStop(0.5, withAlpha(color, 0.34));
      g.addColorStop(0.58, withAlpha(color, 0.12));
      g.addColorStop(1, withAlpha(color, 0));
      ctx.fillStyle = g;
      const thick = Math.max(0.7, rPx * 0.5);
      if (dx) ctx.fillRect(-len * k, -thick / 2, len * k * 2, thick);
      else ctx.fillRect(-thick / 2, -len * k, thick, len * k * 2);
    }
    ctx.restore();
  }

  const g = ctx.createRadialGradient(mid, mid, 0, mid, mid, radius * spread * dpr);
  g.addColorStop(0, withAlpha(color, 0.85));
  g.addColorStop(0.16, withAlpha(color, 0.4));
  g.addColorStop(0.42, withAlpha(color, 0.09));
  g.addColorStop(0.72, withAlpha(color, 0.015));
  g.addColorStop(1, withAlpha(color, 0));

  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);

  // Плотное ядро: без него звезда выглядит размытым пятном, а не точкой.
  ctx.beginPath();
  ctx.arc(mid, mid, rPx, 0, Math.PI * 2);
  ctx.fillStyle = withAlpha(color, 1);
  ctx.fill();

  return c;
}

export function withAlpha(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
