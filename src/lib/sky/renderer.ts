import { COMET_DURATION, drawComet } from "./comet";
import { dawnRise, drawDawn } from "./dawn";
import { LAYOUT, clipToSky, glowXFromBearing, groundYAt } from "./layout";
import { drawFaintStars, drawMilkyWay, makeLiveFaintStars, type FaintStar } from "./milkyway";
import { makeMoonSprite } from "./moon";
import { drawRealSky, moonOnScreen, type Observer, type RealSkyView } from "./realsky";
import {
  drawProjector,
  PROJECTOR_SWAP_AT,
  PROJECTOR_TOTAL,
  type ProjectorImage,
} from "./projector";
import {
  DayStar,
  makeDayStars,
  makeStarSprite,
  STAR_TINTS,
  twinkleAt,
  withAlpha,
} from "./stars";
import { drawTerrain } from "./terrain";

export const PALETTE = {
  nightDeep: "#05070F",
  night: "#0A0E1A",
  horizon: "#14203A",
  star: "#C9D6F0",
  amber: "#F2C57C",
  amberHot: "#FFE3B0",
} as const;

const TAU = Math.PI * 2;
const SPRITE_BUCKETS = 8;
const STAR_R_MIN = 0.45;
const STAR_R_MAX = 1.75;

/** Звезда с письмом в виде, нужном рендереру. */
export interface LetterStar {
  id: number;
  x: number;
  y: number;
  isEternal: boolean;
  opened: boolean;
}

export interface SkyOptions {
  /** Прожитых в разлуке ночей — столько же и звёзд. */
  days: number;
  bearingDeg: number;
  reducedMotion: boolean;
  /** Откуда смотрят на небо: от этого зависит, какие созвездия видны. */
  observer: Observer;
  letters: LetterStar[];
  /** Цепочки координат для линий созвездия. */
  chains: Array<Array<{ x: number; y: number }>>;
  /** Открытое письмо. Открыто всегда не больше одного. */
  openId: number | null;
  /** Звезда, которую тянет открыть следующей: разгорается на секунду. */
  hintId: number | null;
  /** Звезда обсессии в момент вспышки. */
  obsessionId: number | null;
  /**
   * Номер ночи, которая рождается прямо сейчас.
   *
   * Раз в сутки самая новая звезда разгорается из ничего у неё на глазах
   * и садится в общий ряд. Единственное событие на всём небе: всё остальное
   * либо неподвижно, либо еле дышит.
   */
  birthNight: number | null;
  /** Фото для прожектора. Меняется вместе с projectorToken. */
  projectorImage: ProjectorImage | null;
  /** Растёт при каждом запуске прожектора — по нему начинается новый прокат. */
  projectorToken: number;
  /** Растёт, когда прокат просят закончить досрочно. */
  projectorCancel: number;
  /** Вызывается один раз, когда прокат прожектора завершился. */
  onProjectorDone?: () => void;
  /** Растёт при отправке послания — по нему запускается падение кометы. */
  cometToken: number;
  /**
   * Идёт ли вступительный восход.
   *
   * Солнце живёт на канвасе, а не слоем поверх него: оно ближе звёзд и
   * дальше холмов, и только здесь этот порядок соблюдается сам собой.
   * Как только флаг снимут, солнце уходит за хребет, даже если не достояло.
   */
  dawn: boolean;
}

/** Сколько длится рождение звезды, секунд. */
const BIRTH_S = 6;
/** За сколько миллисекунд схлопывается прожектор, если его закрыли свайпом. */
const COLLAPSE_MS = 320;
/** За сколько уходит солнце, если вступление смахнули. */
const DAWN_CUT_MS = 420;

export interface SkyHandle {
  destroy(): void;
  setOptions(next: Partial<SkyOptions>): void;
}

export function createSky(canvas: HTMLCanvasElement, initial: SkyOptions): SkyHandle {
  const ctx = canvas.getContext("2d", { alpha: false })!;
  let opts = { ...initial };

  let w = 0;
  let h = 0;
  // Больше двух пикселей на пиксель звёздному полю ничего не добавляют,
  // а на телефонах с dpr=3 съедают заметную часть кадра.
  let dpr = 1;

  let stars: DayStar[] = [];
  let buckets: number[] = []; // индекс спрайта для каждой звезды
  // Заметная часть далёкой россыпи. Живёт в кадре, а не в фоне: без неё на
  // небе дышали бы только два-три десятка звёзд-дней, и всё остальное
  // читалось бы как неподвижная картинка.
  let faint: FaintStar[] = [];
  let sprites: HTMLCanvasElement[] = [];
  let backdrop: HTMLCanvasElement | null = null; // градиент неба и зарево
  let ground: HTMLCanvasElement | null = null; // силуэт с прожектором
  let moon: HTMLCanvasElement | null = null;
  let moonR = 0;
  let moonIllum = -1; // фаза, под которую собран спрайт

  // Настоящее небо: созвездия над её городом. Слой пересобирается раз в
  // полминуты — за это время небо поворачивается на четверть градуса.
  let realSky: HTMLCanvasElement | null = null;
  let realSkyAt = -Infinity;
  const REAL_SKY_REFRESH_MS = 30000;

  let raf = 0;
  const start = performance.now();
  let last = start;
  /** Насколько раскрыто письмо: 0 — небо в покое, 1 — свеча на полную. */
  let openAmt = 0;
  let birthSeen: number | null = null;
  let birthStart = 0;
  let projToken = initial.projectorToken;
  let projCancel = initial.projectorCancel;
  let projStart = -Infinity;
  let projCollapseAt = -Infinity;
  let projDoneFired = true;
  let cometToken = initial.cometToken;
  let cometStart = -Infinity;
  // Если небо создано уже после вступления, восхода не было вовсе:
  // бесконечность в прошлом даёт нулевой подъём с первого же кадра.
  const dawnStart = initial.dawn ? start : -Infinity;
  let dawnCutAt = initial.dawn ? Infinity : -Infinity;

  function layer(): [HTMLCanvasElement, CanvasRenderingContext2D] {
    const c = document.createElement("canvas");
    c.width = Math.ceil(w * dpr);
    c.height = Math.ceil(h * dpr);
    const cx = c.getContext("2d")!;
    cx.scale(dpr, dpr);
    return [c, cx];
  }

  function buildBackdrop() {
    const [c, cx] = layer();

    // Горизонт держим тёмным. Если поднять его до --horizon по всей ширине,
    // подсветится вся линия земли и зареву будет нечего добавить.
    const sky = cx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, PALETTE.nightDeep);
    sky.addColorStop(0.55, PALETTE.night);
    sky.addColorStop(0.88, "#0D1424");
    sky.addColorStop(1, PALETTE.horizon);
    cx.fillStyle = sky;
    cx.fillRect(0, 0, w, h);

    // Млечный Путь и далёкая россыпь — фон для звёзд-дней, а не наложение.
    drawMilkyWay(cx, w, h, PALETTE.star);
    drawFaintStars(cx, w, h, groundYAt, STAR_TINTS);
    drawGlow(cx, w, h, glowXFromBearing(opts.bearingDeg), opts.days);
    // Дымки у земли здесь больше нет. Она задумывалась как воздух между
    // небом и силуэтом, но ложилась ровной полосой во всю ширину и читалась
    // как вторая, дальняя линия горизонта — лишняя и неуклюжая.
    applyDither(cx);
    backdrop = c;
  }

  function buildGround() {
    const [c, cx] = layer();
    drawTerrain(cx, w, h);
    ground = c;
  }

  /** Вид неба на текущий момент — из настроек наблюдателя. */
  function view(): RealSkyView {
    return { bearing: opts.bearingDeg, observer: opts.observer, at: new Date() };
  }

  function buildRealSky(now: number) {
    const [c, cx] = layer();
    drawRealSky(cx, w, h, view());
    realSky = c;
    realSkyAt = now;
  }

  /**
   * Спрайт Луны. Пересобирается только когда заметно изменилась фаза —
   * положение на небе считается каждый кадр отдельно и стоит копейки.
   */
  function buildMoon(illum: number, waxing: boolean) {
    // Считать от min(w,h) нельзя: на телефоне это ширина, и луна выходит
    // радиусом в 13px — фазу на таком размере не разглядеть, а фаза здесь
    // единственный честный образ. Ограничиваем обе стороны по отдельности:
    // ширина держит размер на телефоне, высота — на низком окне.
    moonR = Math.max(18, Math.min(34, w * 0.068, h * 0.055));
    moon = makeMoonSprite({ age: 0, illum, waxing }, moonR, PALETTE.star, dpr);
    moonIllum = illum;
  }

  function buildStars() {
    stars = makeDayStars(Math.max(0, opts.days));

    // За тысячей с лишним звёзд небо начинает белеть: уменьшаем размер,
    // но ни одной ночи не выбрасываем.
    const scale = stars.length > 1200 ? Math.max(0.62, 1200 / stars.length) : 1;

    // Спрайты на пересечении «яркость × оттенок». Пять оттенков дают небу
    // живость, а восемь ступеней яркости — глубину; всё считается один раз.
    sprites = [];
    for (let i = 0; i < SPRITE_BUCKETS; i++) {
      const t = i / (SPRITE_BUCKETS - 1);
      const r = (STAR_R_MIN + t * (STAR_R_MAX - STAR_R_MIN)) * scale;
      // Лучики — только у верхних ступеней яркости, и то короткие.
      const spikes = i >= SPRITE_BUCKETS - 2 ? (i === SPRITE_BUCKETS - 1 ? 9 : 6) : 0;
      for (const tint of STAR_TINTS) sprites.push(makeStarSprite(tint, r, dpr, spikes));
    }

    const TINTS = STAR_TINTS.length;
    buckets = stars.map((s) => {
      const mag = Math.min(SPRITE_BUCKETS - 1, Math.floor(s.mag * SPRITE_BUCKETS));
      const tint = Math.min(TINTS - 1, Math.floor(s.tint * TINTS));
      return mag * TINTS + tint;
    });
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const nextW = Math.max(1, Math.round(rect.width));
    const nextH = Math.max(1, Math.round(rect.height));
    const nextDpr = Math.min(2, window.devicePixelRatio || 1);
    if (nextW === w && nextH === h && nextDpr === dpr) return;

    w = nextW;
    h = nextH;
    dpr = nextDpr;

    canvas.width = Math.ceil(w * dpr);
    canvas.height = Math.ceil(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    buildStars();
    faint = makeLiveFaintStars(w, h, groundYAt, STAR_TINTS);
    buildBackdrop();
    buildGround();
    buildRealSky(performance.now());
    moonIllum = -1; // спрайт пересоберётся в кадре под новый размер
  }

  function frame(now: number) {
    const t = (now - start) / 1000;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    // Раскрытие приходит за 700 мс, а схлопывается за 300: всё, что уходит,
    // уходит быстрее, чем приходило.
    const target = opts.openId === null ? 0 : 1;
    const rate = target > openAmt ? 1 / 0.7 : 1 / 0.3;
    openAmt = approach(openAmt, target, rate * dt);
    const eased = easeOut(openAmt);

    if (opts.birthNight !== birthSeen) {
      birthSeen = opts.birthNight;
      birthStart = now;
    }
    const birthE = opts.birthNight === null ? -1 : (now - birthStart) / 1000;

    let projE = (now - projStart) / 1000;
    const wasRunning = projE >= 0 && projE <= PROJECTOR_TOTAL;

    if (opts.projectorToken !== projToken) {
      projToken = opts.projectorToken;
      // Луч уже поднят — не опускаем его ради смены кадра: перематываем на
      // тот момент, где он стоит и начинает проявлять фотографию.
      projStart = wasRunning ? now - PROJECTOR_SWAP_AT * 1000 : now;
      projE = wasRunning ? PROJECTOR_SWAP_AT : 0;
      projCollapseAt = -Infinity;
      projDoneFired = false;
    } else if (opts.projectorCancel !== projCancel) {
      projCancel = opts.projectorCancel;
      // Попросили закрыть — схлопываем сразу. Честный уход луча занимает две
      // секунды, и после свайпа это читается как «не сработало».
      if (wasRunning) projCollapseAt = now;
    }

    // Схлопывание: за COLLAPSE_MS всё гаснет и прокат считается законченным.
    const collapse =
      projCollapseAt === -Infinity ? 1 : 1 - clamp01((now - projCollapseAt) / COLLAPSE_MS);
    const projActive = projE >= 0 && projE <= PROJECTOR_TOTAL && collapse > 0.001;
    // Пока горит прожектор, всё вокруг притухает — как при раскрытии письма.
    // Огибающая повторяет луч: растёт с подъёмом, спадает при убирании.
    const projDim = projActive
      ? Math.min(easeOut(clamp01(projE / 1.4)), easeOut(clamp01((PROJECTOR_TOTAL - projE) / 1.0))) *
        collapse
      : 0;

    if (opts.cometToken !== cometToken) {
      cometToken = opts.cometToken;
      cometStart = now;
    }
    const cometE = (now - cometStart) / 1000;

    if (backdrop) ctx.drawImage(backdrop, 0, 0, w, h);

    // Настоящее небо над её городом: созвездия в том положении, в каком они
    // стоят прямо сейчас. Слой обновляется раз в полминуты — небо за это
    // время поворачивается на четверть градуса.
    if (now - realSkyAt > REAL_SKY_REFRESH_MS) buildRealSky(now);
    if (realSky) ctx.drawImage(realSky, 0, 0, w, h);

    // Свет рождения. Без него событие зависит от того, какая звезда выпала:
    // у слабой величины даже тройная яркость — это точка в полпикселя,
    // и рождение проходит незамеченным.
    if (birthE >= 0 && birthE < BIRTH_S) {
      const born = stars.find((s) => s.night === opts.birthNight);
      if (born) {
        const [mult, grow] = birthCurve(birthE);
        drawBirthHalo(ctx, born.x * w, born.y * h, Math.min(w, h) * 0.052 * grow, mult);
      }
    }

    // Далёкая россыпь: колышется вся разом, но каждая точка в своём ритме.
    if (!opts.reducedMotion) {
      for (const f of faint) {
        const a = f.alpha * twinkleAt(t, f.period, f.phase, f.amp);
        if (a <= 0.01) continue;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r, 0, TAU);
        ctx.fillStyle = withAlpha(f.tint, Math.min(1, a));
        ctx.fill();
      }
    } else {
      for (const f of faint) {
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r, 0, TAU);
        ctx.fillStyle = withAlpha(f.tint, f.alpha);
        ctx.fill();
      }
    }

    // Звёзды-дни.
    for (let i = 0; i < stars.length; i++) {
      const s = stars[i];
      // Дрейф прозрачности, а не моргание: это должно читаться как воздух.
      const tw = opts.reducedMotion ? 1 : twinkleAt(t, s.period, s.phase, s.amp);
      let alpha = (0.3 + s.mag * 0.62) * tw;
      let scale = 1;

      if (s.night === opts.birthNight && birthE >= 0 && birthE < BIRTH_S) {
        const [mult, grow] = birthCurve(birthE);
        alpha *= mult;
        scale = grow;
      }

      ctx.globalAlpha = Math.min(1, alpha);
      const sp = sprites[buckets[i]];
      const size = (sp.width / dpr) * scale;
      ctx.drawImage(sp, s.x * w - size / 2, s.y * h - size / 2, size, size);
    }
    ctx.globalAlpha = 1;

    drawConstellations(ctx, w, h, opts.chains);

    // Звёзды-письма: всё, кроме открытой прямо сейчас и вечной.
    for (const l of opts.letters) {
      if (l.isEternal || l.id === opts.openId) continue;
      drawLetterStar(ctx, w, h, l, t, opts, 1);
    }

    // Луна стоит там, где она на самом деле сейчас над её городом: восходит,
    // идёт по небу, садится за холмы. Иногда её просто нет — она под землёй,
    // и это честно.
    const mp = moonOnScreen(w, h, view());
    if (mp) {
      if (moonIllum < 0 || Math.abs(mp.illum - moonIllum) > 0.01) {
        buildMoon(mp.illum, mp.waxing);
      }
      if (moon) {
        const size = moon.width / dpr;
        // У горизонта воздух глушит свет — луна там тусклее и рыжее.
        ctx.globalAlpha = Math.max(0.35, Math.min(1, 0.45 + mp.alt / 22));
        ctx.drawImage(moon, mp.x - size / 2, mp.y - size / 2, size, size);
        ctx.globalAlpha = 1;
      }
    }

    // Комета — до силуэта земли: у горизонта её скрывают холмы, и она уходит
    // за них, а не гаснет в воздухе.
    if (cometE >= 0 && cometE <= COMET_DURATION) {
      drawComet(ctx, w, h, cometE, opts.bearingDeg, cometToken);
    }

    // Восход — после звёзд и до земли. Солнце гасит собой звёзды, а деревья
    // и крыши остаются перед ним: они ближе.
    const dawnE = (now - dawnStart) / 1000;
    if (!opts.dawn && dawnCutAt === Infinity) dawnCutAt = now;
    // Убрали досрочно — уходит быстро и целиком. Медленный уход после
    // жеста читается как «не сработало», а следом уже едут виджеты.
    const cut = dawnCutAt === Infinity ? 1 : 1 - clamp01((now - dawnCutAt) / DAWN_CUT_MS);
    // При выключенном движении солнце просто стоит, пока идёт вступление.
    const rise = (opts.reducedMotion && opts.dawn ? 1 : dawnRise(dawnE)) * cut;
    drawDawn(ctx, w, h, rise, opts.bearingDeg);

    if (ground) ctx.drawImage(ground, 0, 0, w, h);

    // Небо притухает до 40% — и при раскрытии письма, и при работе прожектора.
    // Всё, что должно остаться зажжённым, рисуется ниже, поверх этой заслонки.
    const dim = Math.max(eased, projDim);
    if (dim > 0.001) {
      ctx.globalAlpha = dim * 0.6;
      ctx.fillStyle = PALETTE.nightDeep;
      ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = 1;
    }

    // Прожектор поверх заслонки: луч рождается из линзы на холме, фото
    // проецируется в дымку выше. Пока он горит, всё вокруг в тени.
    if (projActive) {
      drawProjector(ctx, w, h, projE, opts.projectorImage, projToken, opts.reducedMotion, collapse);
    } else if (!projDoneFired) {
      projDoneFired = true;
      opts.onProjectorDone?.();
    }

    // Свеча раскрытого письма.
    const open = opts.openId === null ? null : opts.letters.find((l) => l.id === opts.openId);
    if (open && eased > 0.001) {
      drawOpenGlow(ctx, w, h, open, eased);
      // Вечную рисует drawEternalStar ниже — второй раз она не нужна.
      if (!open.isEternal) drawLetterStar(ctx, w, h, open, t, opts, 1 + eased * 0.9);
    }

    // Вечная звезда — последней. Она не гаснет не по условию в коде,
    // а потому что рисуется поверх всего, что могло бы её притушить.
    drawEternalStar(ctx, w, h, t, opts.reducedMotion);
    // Звезда путешествия — рядом же и точно так же: видна всегда, а не
    // только когда открыт экран неба с кнопками.
    drawJourneyStar(ctx, w, h, t, opts.reducedMotion);

    raf = requestAnimationFrame(frame);
  }

  const onResize = () => resize();
  const ro = new ResizeObserver(onResize);
  ro.observe(canvas);
  window.addEventListener("orientationchange", onResize);

  resize();
  raf = requestAnimationFrame(frame);

  return {
    destroy() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("orientationchange", onResize);
    },
    setOptions(next) {
      const daysChanged = next.days !== undefined && next.days !== opts.days;
      const bearingChanged = next.bearingDeg !== undefined && next.bearingDeg !== opts.bearingDeg;
      opts = { ...opts, ...next };
      if (daysChanged) buildStars();
      if (daysChanged || bearingChanged) buildBackdrop();
    },
  };
}

/**
 * Рождение звезды: из ничего разгорается ярче остальных, потом садится
 * в общий ряд. Возвращает множитель яркости и множитель размера.
 *
 * Пик на 2.5-й секунде, к шестой всё возвращается к единице — дальше звезда
 * ничем не отличается от прожитых ночей, и так будет всегда.
 */
function birthCurve(e: number): [number, number] {
  const rise = easeOut(Math.min(1, e / 2.5));
  const settle = easeOut(Math.max(0, (e - 2.5) / (BIRTH_S - 2.5)));
  const excess = 1 - settle;
  return [rise * (1 + 1.6 * excess), 1 + 1.2 * rise * excess];
}

/** Ореол разгорающейся звезды. Гаснет вместе с её лишней яркостью. */
function drawBirthHalo(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  mult: number,
) {
  const k = Math.min(1, mult / 2.6);
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, withAlpha(PALETTE.star, 0.4 * k));
  g.addColorStop(0.16, withAlpha(PALETTE.star, 0.17 * k));
  g.addColorStop(0.46, withAlpha(PALETTE.star, 0.05 * k));
  g.addColorStop(1, withAlpha(PALETTE.star, 0));
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

function approach(value: number, target: number, step: number): number {
  return value < target ? Math.min(target, value + step) : Math.max(target, value - step);
}

function easeOut(x: number): number {
  return 1 - Math.pow(1 - x, 3);
}

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

/** Тонкие линии между якорями. Настолько слабые, что видны не сразу. */
function drawConstellations(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  chains: Array<Array<{ x: number; y: number }>>,
) {
  if (chains.length === 0) return;
  ctx.save();
  ctx.strokeStyle = withAlpha(PALETTE.amber, 0.065);
  ctx.lineWidth = 1;
  for (const chain of chains) {
    ctx.beginPath();
    chain.forEach((p, i) =>
      i === 0 ? ctx.moveTo(p.x * w, p.y * h) : ctx.lineTo(p.x * w, p.y * h),
    );
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Звезда с письмом: теплее остальных, чуть крупнее и дышит.
 *
 * Дыхание — единственная подсказка, что на неё можно нажать, и её достаточно.
 * Отговорившая звезда перестаёт дышать и оставляет ровный тёплый след:
 * так прогресс виден на небе, а не в списке.
 */
function drawLetterStar(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  l: LetterStar,
  t: number,
  opts: SkyOptions,
  boost: number,
) {
  const x = l.x * w;
  const y = l.y * h;
  // Чуть крупнее обычной звезды — и только. Ореол сопоставим с самой яркой
  // звездой-днём: девятнадцать амберных фонарей превращают ночь в гирлянду.
  const base = Math.max(1.3, Math.min(w, h) * 0.0028);

  let alpha: number;
  if (opts.obsessionId === l.id) {
    // Намеренно неровное частое мерцание: произведение двух несоизмеримых
    // синусов не даёт узору повториться.
    alpha = 0.3 + 0.7 * Math.abs(Math.sin(t * 19.3) * Math.sin(t * 7.1));
  } else if (l.opened) {
    alpha = 0.42;
  } else if (opts.reducedMotion) {
    alpha = 0.85;
  } else {
    alpha = 0.775 + 0.225 * Math.sin((t / 4.5) * TAU + ((l.id * 1.7) % TAU));
  }
  if (opts.hintId === l.id) alpha = Math.min(1, alpha + 0.45);

  const a = Math.min(1, alpha * boost);
  const r = base * (l.opened ? 0.85 : 1) * Math.min(1.9, boost);
  const halo = r * (l.opened ? 4.4 : 7) * Math.min(1.8, boost);

  const g = ctx.createRadialGradient(x, y, 0, x, y, halo);
  g.addColorStop(0, withAlpha(PALETTE.amberHot, 0.36 * a));
  g.addColorStop(0.1, withAlpha(PALETTE.amber, 0.19 * a));
  g.addColorStop(0.38, withAlpha(PALETTE.amber, 0.045 * a));
  g.addColorStop(1, withAlpha(PALETTE.amber, 0));
  ctx.fillStyle = g;
  ctx.fillRect(x - halo, y - halo, halo * 2, halo * 2);

  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fillStyle = withAlpha(PALETTE.amberHot, a);
  ctx.fill();
}

/**
 * Свеча раскрытого письма: тёплое радиальное пятно, в котором проявляется
 * текст. Не окно, не карточка — только свет.
 */
function drawOpenGlow(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  l: LetterStar,
  k: number,
) {
  const x = l.x * w;
  const y = l.y * h;
  // Радиус берётся с запасом на текст: он проявляется внутри пятна,
  // а не рядом с ним, иначе строки висят в пустоте.
  const r = Math.max(300, Math.min(w, h) * 0.62) * (0.36 + 0.64 * k);

  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, withAlpha(PALETTE.amberHot, 0.3 * k));
  g.addColorStop(0.12, withAlpha(PALETTE.amber, 0.19 * k));
  g.addColorStop(0.4, withAlpha(PALETTE.amber, 0.075 * k));
  g.addColorStop(0.7, withAlpha(PALETTE.amber, 0.022 * k));
  g.addColorStop(1, withAlpha(PALETTE.amber, 0));
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

/**
 * Дизеринг: в каждый канал подмешивается меньше одного уровня шума.
 *
 * Ночное небо — это градиент по трём-четырём соседним значениям на восьми
 * битах, и без шума он неизбежно расслаивается видимыми ступенями.
 * Считается один раз при сборке слоя, в кадре не участвует.
 */
function applyDither(ctx: CanvasRenderingContext2D) {
  const c = ctx.canvas;
  const img = ctx.getImageData(0, 0, c.width, c.height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    // Uint8ClampedArray сам округляет — дробная добавка и даёт дизеринг.
    const n = Math.random() * 3 - 1.5;
    d[i] += n;
    d[i + 1] += n;
    d[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
}

/**
 * Зарево у горизонта с её стороны. Растёт примерно на волосок в неделю —
 * это должно быть заметно только тому, кто помнит, как было месяц назад.
 */
function drawGlow(ctx: CanvasRenderingContext2D, w: number, h: number, xFrac: number, days: number) {
  const cx = xFrac * w;
  const gy = groundYAt(xFrac) * h;
  const gh = (0.05 + days * 0.00042) * h;
  const gw = Math.max(w * 0.52, gh * 5.4);
  const a = Math.min(0.3, 0.15 + days * 0.00042);

  ctx.save();
  clipToSky(ctx, w, h);

  // Холодная широкая подложка — даёт зареву глубину, а не плоское пятно.
  paint(gw * 0.72, gh * 1.7, PALETTE.horizon, a);
  // Тёплое ядро.
  paint(gw * 0.5, gh, PALETTE.amber, a * 0.5);

  ctx.restore();

  function paint(rx: number, ry: number, color: string, alpha: number) {
    ctx.save();
    ctx.translate(cx, gy);
    ctx.scale(1, ry / rx);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
    g.addColorStop(0, withAlpha(color, alpha));
    g.addColorStop(0.34, withAlpha(color, alpha * 0.5));
    g.addColorStop(0.68, withAlpha(color, alpha * 0.13));
    g.addColorStop(1, withAlpha(color, 0));
    ctx.fillStyle = g;
    ctx.fillRect(-rx, -rx, rx * 2, rx * 2);
    ctx.restore();
  }
}

/**
 * Вечная звезда. Горит всегда на полную — это не письмо, это лампа,
 * оставленная включённой. Дышит чуть заметно, чтобы читалась как живая.
 */
function drawEternalStar(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  t: number,
  reducedMotion: boolean,
) {
  const x = LAYOUT.eternalStar.x * w;
  const y = LAYOUT.eternalStar.y * h;
  const pulse = reducedMotion ? 1 : 1 + 0.04 * Math.sin((t / 6.5) * TAU);
  const r = Math.max(1.6, Math.min(w, h) * 0.0035);
  const halo = r * 13 * pulse;

  const g = ctx.createRadialGradient(x, y, 0, x, y, halo);
  g.addColorStop(0, withAlpha(PALETTE.amberHot, 0.5));
  g.addColorStop(0.12, withAlpha(PALETTE.amber, 0.2));
  g.addColorStop(0.4, withAlpha(PALETTE.amber, 0.05));
  g.addColorStop(1, withAlpha(PALETTE.amber, 0));
  ctx.fillStyle = g;
  ctx.fillRect(x - halo, y - halo, halo * 2, halo * 2);

  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fillStyle = PALETTE.amberHot;
  ctx.fill();
}

/**
 * Звезда «Созвездия Вечного Смеха» — тот же тёплый язык, что у вечной
 * звезды (это одно и то же небо, не два разных), но дышит чуть шире
 * и заметнее: это не забытая лампа, а маяк, до которого можно долететь.
 * Стоит здесь всегда, до всякого нажатия кнопки, — полёт в
 * `ConstellationJourney` начинается именно с этой точки (см.
 * `LAYOUT.journeyStar`, единственный источник её координат), поэтому
 * видео-звезда не появляется из ниоткуда, а оказывается той самой
 * точкой света, что уже была видна.
 */
function drawJourneyStar(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  t: number,
  reducedMotion: boolean,
) {
  const x = LAYOUT.journeyStar.x * w;
  const y = LAYOUT.journeyStar.y * h;
  const pulse = reducedMotion ? 1 : 1 + 0.09 * Math.sin((t / 4.2) * TAU);
  const r = Math.max(1.7, Math.min(w, h) * 0.0038);
  const halo = r * 15 * pulse;

  const g = ctx.createRadialGradient(x, y, 0, x, y, halo);
  g.addColorStop(0, withAlpha(PALETTE.amberHot, 0.55));
  g.addColorStop(0.12, withAlpha(PALETTE.amber, 0.22));
  g.addColorStop(0.4, withAlpha(PALETTE.amber, 0.06));
  g.addColorStop(1, withAlpha(PALETTE.amber, 0));
  ctx.fillStyle = g;
  ctx.fillRect(x - halo, y - halo, halo * 2, halo * 2);

  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fillStyle = PALETTE.amberHot;
  ctx.fill();
}
