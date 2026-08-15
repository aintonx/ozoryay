import { EMOJI_FONT, KISS } from "../emoji";
import { glowXFromBearing } from "./layout";
import { mulberry32 } from "./prng";
import { withAlpha } from "./stars";

/**
 * Комета светит красным, а не амбером.
 *
 * Единственное отступление от палитры на всём сайте — и оно вынужденное:
 * голова кометы это отпечаток губ, он красный, и амберный шлейф за красной
 * головой смотрелся склейкой из двух разных картинок.
 */
const RED = "#E24A55";
const RED_HOT = "#FF9AA0";

/** Сколько длится падение кометы, секунд. */
export const COMET_DURATION = 2.9;

/**
 * Докуда доводится голова.
 *
 * Больше единицы намеренно: кривая продолжается за свою конечную точку, и
 * это нужно, чтобы за горизонт ушла не только голова, но и весь хвост.
 * Пока голова останавливалась на конце кривой, хвост оставался висеть в
 * небе и его приходилось гасить прозрачностью — комета переставала
 * полыхать на полпути, вместо того чтобы скрыться за холмами.
 */
const HEAD_END = 1.35;

/** Длина хвоста в долях траектории. */
const TAIL_SPAN = 0.3;
/** На сколько точек разбивается хвост при построении силуэта. */
const TAIL_STEPS = 40;
/** Сколько искр отрывается от головы. */
const EMBERS = 9;

/** Квадратичная кривая Безье по одной координате. */
function bezier(t: number, p0: number, c: number, p1: number): number {
  const u = 1 - t;
  return u * u * p0 + 2 * u * t * c + t * t * p1;
}

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

/**
 * Комета, падающая за горизонт, — поцелуй, отправленный в ночь.
 *
 * Летит из верхней части неба вниз к линии холмов, в сторону её города
 * (туда же, где зарево), и уходит за горизонт. Рисуется ДО силуэта земли,
 * поэтому у самого горизонта её скрывают холмы — она исчезает за ними,
 * а не гаснет в воздухе.
 *
 * Как это устроено и почему именно так.
 *
 * Свет нельзя рисовать одним радиальным градиентом: у него мало ступеней,
 * и на телефоне они видны кольцами, а край всегда получается резким. Здесь
 * весь светящийся материал — хвост, искры и сам отпечаток — сначала
 * собирается на отдельном холсте, а потом кладётся на небо в три приёма:
 * почти чёткий слой, средний ореол и широкое зарево. Средний и широкий
 * берутся с холста, уменьшенного вчетверо и размытого уже там: размытие на
 * маленькой картинке стоит копейки, а обратное увеличение само по себе
 * идеально гладкое — ступеней не остаётся вовсе.
 *
 * Хвост — не стопка отрезков, а цельное веретено: замкнутый контур, ширина
 * которого спадает от головы к концу, залитый продольным градиентом. Отрезки
 * со скруглёнными концами давали ровный клин с видимыми сочленениями, и
 * именно от них вся вещь выглядела дешёвой.
 *
 * `e` — секунды с начала полёта; `token` — номер запуска, по нему
 * выбирается новая траектория, чтобы два поцелуя подряд не летели
 * по одному и тому же следу.
 */
export function drawComet(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  e: number,
  bearingDeg: number,
  token: number,
) {
  const p = e / COMET_DURATION;
  if (p < 0 || p > 1) return;

  const glowX = glowXFromBearing(bearingDeg);
  // Траектория в долях вьюпорта: старт где-то в верхней части неба, конец —
  // за горизонтом на её стороне. Контрольная точка выгибает дугу падения.
  //
  // Точка старта своя у каждого запуска: полёт по одному и тому же следу
  // на третий раз читается как зацикленная гифка. Конец остаётся у зарева —
  // туда, куда поцелуй и отправляется.
  const path = mulberry32(token * 2654435761 + 17);
  const S = { x: 0.08 + path() * 0.86, y: 0.02 + path() * 0.2 };
  const E = { x: glowX + (path() - 0.5) * 0.2, y: 1.08 };
  // Контрольная точка держится между стартом и концом, но со сдвигом вбок —
  // от него зависит, в какую сторону и насколько выгнется дуга. Разброс
  // большой намеренно: одна и та же дуга со смещённым началом всё равно
  // читается как повтор.
  const C = {
    x: (S.x + E.x) / 2 + (path() - 0.5) * 0.7,
    y: 0.34 + path() * 0.3,
  };

  // Падение ускоряется к земле и продолжается за конец кривой.
  const head = Math.pow(p, 1.35) * HEAD_END;
  const bx = (t: number) => bezier(t, S.x, C.x, E.x) * w;
  const by = (t: number) => bezier(t, S.y, C.y, E.y) * h;

  // Только проявление. Гасить нечем и незачем: к этому моменту и голова,
  // и хвост уже за холмами, а холмы рисуются поверх.
  const alpha = clamp01(p / 0.08);
  if (alpha <= 0.002) return;

  const unit = Math.min(w, h);
  const hx = bx(head);
  const hy = by(head);

  // Куда он летит прямо сейчас — по касательной к кривой. Отпечаток идёт
  // по своей длинной оси: уголок губ впереди, хвост позади.
  const ahead = head + 0.015;
  const behind = Math.max(0, head - 0.015);
  const course = Math.atan2(by(ahead) - by(behind), bx(ahead) - bx(behind));

  const hr = Math.min(14, Math.max(7.5, unit * 0.024));
  const kissSize = hr * 1.5;
  // Жила тонкая до неприличия, оболочка широкая и почти прозрачная. Одна
  // полоса средней ширины и средней плотности — это и был тот «брусок»,
  // из-за которого комета выглядела дешёвой.
  const coreW = hr * 0.16;
  const envW = hr * 0.8;

  // Точки хвоста позади головы вдоль кривой.
  const spine: Array<{ x: number; y: number; nx: number; ny: number; f: number }> = [];
  for (let i = 0; i < TAIL_STEPS; i++) {
    const f = i / (TAIL_STEPS - 1);
    const t = head - TAIL_SPAN * f;
    if (t < 0) break;
    const x = bx(t);
    const y = by(t);
    // Нормаль берём из соседней точки кривой, а не из соседа по списку:
    // у самого конца шаги мельчают и направление начинает дрожать.
    const dx = bx(t + 0.01) - bx(Math.max(0, t - 0.01));
    const dy = by(t + 0.01) - by(Math.max(0, t - 0.01));
    const len = Math.hypot(dx, dy) || 1;
    spine.push({ x, y, nx: -dy / len, ny: dx / len, f });
  }
  if (spine.length < 3) return;

  // Границы холста: всё, чего касается комета, плюс запас под самый широкий
  // ореол. Без запаса зарево обрезалось бы по краю буфера видимой рамкой.
  const halo = unit * 0.09;
  let minX = hx;
  let minY = hy;
  let maxX = hx;
  let maxY = hy;
  for (const s of spine) {
    minX = Math.min(minX, s.x);
    minY = Math.min(minY, s.y);
    maxX = Math.max(maxX, s.x);
    maxY = Math.max(maxY, s.y);
  }
  const pad = halo + kissSize;
  minX -= pad;
  minY -= pad;
  maxX += pad;
  maxY += pad;
  const bw = Math.ceil(maxX - minX);
  const bh = Math.ceil(maxY - minY);
  if (bw <= 0 || bh <= 0) return;

  // ── Светящийся материал на отдельном холсте ──────────────────────────
  const light = cometScratch(bw, bh);
  const g = light.getContext("2d")!;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalCompositeOperation = "source-over";
  g.globalAlpha = 1;
  g.filter = "none";
  g.clearRect(0, 0, bw, bh);
  g.save();
  g.translate(-minX, -minY);

  drawTail(g, spine, coreW, envW);
  drawEmbers(g, spine, hr);
  drawNucleus(g, hx, hy, hr);

  // Сам отпечаток тоже идёт в этот холст — тогда ореол вокруг него будет
  // светом его собственной формы, а не абстрактным пятном под ним.
  g.save();
  g.translate(hx, hy);
  g.rotate(course);
  // Отражение по горизонтали: после него вперёд по курсу смотрит левый
  // уголок губ — он и работает носом ракеты, а верх отпечатка остаётся
  // верхом. Без отражения вперёд шёл бы правый край, хвостом вперёд.
  g.scale(-1, 1);
  drawKissMark(g, kissSize);
  g.restore();

  g.restore();

  // ── Ореол: тот же холст вчетверо меньше и размытый ───────────────────
  const qw = Math.max(1, Math.ceil(bw / 4));
  const qh = Math.max(1, Math.ceil(bh / 4));
  const bloom = bloomScratch(qw, qh);
  const q = bloom.getContext("2d")!;
  q.setTransform(1, 0, 0, 1, 0, 0);
  q.globalCompositeOperation = "source-over";
  q.globalAlpha = 1;
  q.clearRect(0, 0, qw, qh);
  q.filter = `blur(${Math.max(1.2, unit * 0.004)}px)`;
  q.drawImage(light, 0, 0, qw, qh);
  q.filter = "none";

  // ── Композиция: три слоя света ───────────────────────────────────────
  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  // Ядро — почти чёткое, но всё-таки размытое: идеально резкий край у
  // веретена сразу выдаёт нарисованную фигуру, а не свет.
  ctx.globalAlpha = alpha * 0.8;
  ctx.filter = `blur(${Math.max(1, unit * 0.0032)}px)`;
  ctx.drawImage(light, minX, minY);
  ctx.filter = "none";

  // Средний ореол — уменьшенная копия обратно в свой размер.
  ctx.globalAlpha = alpha * 0.55;
  ctx.drawImage(bloom, minX, minY, bw, bh);

  // Широкое зарево — та же копия, растянутая вокруг головы. Ещё одно
  // размытие обошлось бы дороже, а разницы на глаз нет.
  const spread = 2.4;
  ctx.globalAlpha = alpha * 0.2;
  ctx.drawImage(
    bloom,
    hx - (hx - minX) * spread,
    hy - (hy - minY) * spread,
    bw * spread,
    bh * spread,
  );

  ctx.restore();

  // ── Сам отпечаток поверх света ───────────────────────────────────────
  // Без этого слоя губы тонут в собственном ореоле и превращаются в пятно.
  // Складывать его с фоном («lighter») нельзя: цветной глиф выцветает добела.
  ctx.save();
  ctx.globalAlpha = alpha * 0.95;
  ctx.filter = `blur(${Math.max(0.3, hr * 0.028)}px)`;
  ctx.translate(hx, hy);
  ctx.rotate(course);
  ctx.scale(-1, 1);
  drawKissMark(ctx, kissSize);
  ctx.filter = "none";
  ctx.restore();
}

type Spine = Array<{ x: number; y: number; nx: number; ny: number; f: number }>;

/**
 * Хвост из двух слоёв.
 *
 * У настоящего следа две разные части: тонкая раскалённая жила, которая
 * почти не имеет ширины, и вокруг неё широкое разреженное свечение, у
 * которого нет краёв вовсе. Пока это рисовалось одной полосой средней
 * ширины, получался брусок с двумя чёткими сторонами — то самое, что
 * выдаёт дешёвую графику. Разведённые по отдельности, они складываются
 * в след, у которого не видно, где он кончается.
 */
function drawTail(g: CanvasRenderingContext2D, spine: Spine, coreW: number, envW: number) {
  // Оболочка: шире, длиннее, почти прозрачная.
  spindle(
    g,
    spine,
    (f) => envW * Math.pow(1 - f, 0.5),
    [
      [0, withAlpha(RED_HOT, 0.22)],
      [0.18, withAlpha(RED, 0.13)],
      [0.45, withAlpha(RED, 0.05)],
      [0.75, withAlpha(RED, 0.012)],
      [1, withAlpha(RED, 0)],
    ],
  );

  // Жила: тонкая и яркая, гаснет быстрее.
  spindle(
    g,
    spine,
    (f) => coreW * Math.pow(1 - f, 1.3),
    [
      [0, withAlpha(RED_HOT, 0.95)],
      [0.1, withAlpha(RED_HOT, 0.62)],
      [0.28, withAlpha(RED, 0.28)],
      [0.55, withAlpha(RED, 0.08)],
      [0.8, withAlpha(RED, 0.02)],
      [1, withAlpha(RED, 0)],
    ],
  );
}

/**
 * Веретено вдоль позвоночника.
 *
 * Обходим его вперёд по одной стороне и назад по другой, отступая по
 * нормали на заданную ширину. Получается замкнутый контур без сочленений;
 * он заливается продольным градиентом, поэтому яркость тает вдоль хвоста
 * непрерывно, а не ступенями по отрезкам.
 */
function spindle(
  g: CanvasRenderingContext2D,
  spine: Spine,
  width: (f: number) => number,
  stops: Array<[number, string]>,
) {
  g.beginPath();
  g.moveTo(spine[0].x + spine[0].nx * width(0), spine[0].y + spine[0].ny * width(0));
  for (let i = 1; i < spine.length; i++) {
    const s = spine[i];
    const k = width(s.f);
    g.lineTo(s.x + s.nx * k, s.y + s.ny * k);
  }
  for (let i = spine.length - 1; i >= 0; i--) {
    const s = spine[i];
    const k = width(s.f);
    g.lineTo(s.x - s.nx * k, s.y - s.ny * k);
  }
  g.closePath();

  const tip = spine[spine.length - 1];
  const grad = g.createLinearGradient(spine[0].x, spine[0].y, tip.x, tip.y);
  for (const [at, color] of stops) grad.addColorStop(at, color);
  g.fillStyle = grad;
  g.fill();
}

/**
 * Раскалённое ядро у самой головы.
 *
 * Складываясь с ореолом и хвостом при аддитивном наложении, оно уводит
 * центр к белому, а края оставляет красными — так свет ведёт себя на самом
 * деле, и именно этот переход отличает горящее тело от красного пятна.
 */
function drawNucleus(g: CanvasRenderingContext2D, x: number, y: number, hr: number) {
  const r = hr * 0.85;
  const core = g.createRadialGradient(x, y, 0, x, y, r);
  // Не ярче, чем нужно: за ядром стоит отпечаток губ, и если залить это
  // место светом, от него останется красное пятно без формы.
  core.addColorStop(0, withAlpha(RED_HOT, 0.5));
  core.addColorStop(0.3, withAlpha(RED_HOT, 0.26));
  core.addColorStop(0.6, withAlpha(RED, 0.09));
  core.addColorStop(1, withAlpha(RED, 0));
  g.fillStyle = core;
  g.fillRect(x - r, y - r, r * 2, r * 2);
}

/**
 * Искры, отстающие от головы.
 *
 * Именно они отличают комету от полоски света: у настоящей за головой тянется
 * не сплошная лента, а осыпающийся след. Разброс детерминированный — считается
 * от номера искры, — поэтому искры едут вместе с кометой, а не мельтешат
 * заново в каждом кадре.
 */
function drawEmbers(g: CanvasRenderingContext2D, spine: Spine, hr: number) {
  const rand = mulberry32(20260726);
  for (let k = 0; k < EMBERS; k++) {
    const at = 0.1 + rand() * 0.75;
    const side = (rand() - 0.5) * 2;
    const size = hr * (0.06 + rand() * 0.1);

    const i = Math.min(spine.length - 1, Math.round(at * (spine.length - 1)));
    const s = spine[i];
    // Разлёт растёт вдоль хвоста: у головы искры ещё в струе, дальше расходятся.
    const off = side * hr * (0.25 + s.f * 1.5);
    const a = 0.75 * Math.pow(1 - s.f, 1.6);
    if (a <= 0.01) continue;

    g.beginPath();
    g.arc(s.x + s.nx * off, s.y + s.ny * off, size, 0, Math.PI * 2);
    g.fillStyle = withAlpha(RED_HOT, a);
    g.fill();
  }
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

/** Холст со светящимся материалом кометы. */
let cometCanvas: HTMLCanvasElement | null = null;
function cometScratch(w: number, h: number): HTMLCanvasElement {
  if (!cometCanvas) cometCanvas = document.createElement("canvas");
  if (cometCanvas.width !== w) cometCanvas.width = w;
  if (cometCanvas.height !== h) cometCanvas.height = h;
  return cometCanvas;
}

/** Он же вчетверо меньше — на нём считается ореол. */
let bloomCanvas: HTMLCanvasElement | null = null;
function bloomScratch(w: number, h: number): HTMLCanvasElement {
  if (!bloomCanvas) bloomCanvas = document.createElement("canvas");
  if (bloomCanvas.width !== w) bloomCanvas.width = w;
  if (bloomCanvas.height !== h) bloomCanvas.height = h;
  return bloomCanvas;
}
