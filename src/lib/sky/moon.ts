import { withAlpha } from "./stars";

const SYNODIC_MONTH = 29.530588853;
/** Новолуние 6 января 2000, 18:14 UTC — опорная точка. */
const KNOWN_NEW_MOON = Date.UTC(2000, 0, 6, 18, 14) / 86400000;

export interface MoonPhase {
  /** Возраст луны в сутках, 0..29.53. */
  age: number;
  /** Освещённая доля диска, 0..1. */
  illum: number;
  /** Растёт ли луна: определяет, с какой стороны освещённый край. */
  waxing: boolean;
}

/** Настоящая фаза на заданный момент. Луна одна на два города. */
export function moonPhase(at: Date): MoonPhase {
  const days = at.getTime() / 86400000 - KNOWN_NEW_MOON;
  const age = ((days % SYNODIC_MONTH) + SYNODIC_MONTH) % SYNODIC_MONTH;
  const illum = (1 - Math.cos((2 * Math.PI * age) / SYNODIC_MONTH)) / 2;
  return { age, illum, waxing: age < SYNODIC_MONTH / 2 };
}

/**
 * Луна в спрайт. Пересобирается только при ресайзе и смене суток,
 * в кадре она просто выкладывается одним drawImage.
 *
 * Ореол строится из самой формы освещённой части, а не из окружности диска.
 * Кольцевой ореол вокруг всего диска подсвечивает неосвещённую часть с обеих
 * сторон, и она проступает чёрным укусом на фоне неба. У настоящей луны
 * светится только освещённое — поэтому ореол здесь несимметричен.
 *
 * Всё построение идёт в пикселях устройства: ctx.filter трактует радиус
 * размытия по-разному в зависимости от текущей трансформации, и с ctx.scale
 * размытие поехало бы на экранах с разным dpr.
 */
export function makeMoonSprite(
  phase: MoonPhase,
  radius: number,
  color: string,
  dpr: number,
): HTMLCanvasElement {
  const size = Math.ceil(radius * 5.2 * 2 * dpr);
  const cx = size / 2;
  const cy = size / 2;
  const r = radius * dpr;

  // Слой с освещённой частью. Терминатор проецируется эллипсом с полуосью
  // r·|1−2k|; при такой границе площадь освещённого участка равна ровно k.
  const lit = document.createElement("canvas");
  lit.width = size;
  lit.height = size;
  const lc = lit.getContext("2d")!;
  const t = 1 - 2 * phase.illum;

  lc.save();
  if (!phase.waxing) {
    // Убывающая луна освещена слева — то же построение зеркально.
    lc.translate(size, 0);
    lc.scale(-1, 1);
  }
  lc.beginPath();
  lc.arc(cx, cy, r, -Math.PI / 2, Math.PI / 2, false);
  lc.ellipse(cx, cy, r * Math.abs(t), r, 0, Math.PI / 2, -Math.PI / 2, t > 0);
  lc.closePath();
  lc.fillStyle = withAlpha(color, 1);
  lc.fill();
  lc.restore();

  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d")!;

  // Ореол: тот же силуэт, дважды размытый на разном радиусе.
  ctx.globalAlpha = 0.12;
  ctx.filter = `blur(${r * 0.45}px)`;
  ctx.drawImage(lit, 0, 0);
  ctx.globalAlpha = 0.085;
  ctx.filter = `blur(${r * 1.7}px)`;
  ctx.drawImage(lit, 0, 0);

  // Сам диск. Размытие в доли радиуса снимает с терминатора резаную кромку,
  // но не расплывает лимб: больше 4% — и луна становится ватной.
  ctx.globalAlpha = 0.86;
  ctx.filter = `blur(${Math.max(0.5, r * 0.035)}px)`;
  ctx.drawImage(lit, 0, 0);
  ctx.filter = "none";
  ctx.globalAlpha = 1;

  // Потемнение к краю — только по уже нарисованному, иначе тень ляжет
  // на прозрачную неосвещённую часть и снова вырежет из неба чёрное пятно.
  ctx.globalCompositeOperation = "source-atop";
  const limb = ctx.createRadialGradient(cx, cy, r * 0.35, cx, cy, r);
  limb.addColorStop(0, "rgba(0,0,0,0)");
  limb.addColorStop(0.8, "rgba(0,0,0,0.04)");
  limb.addColorStop(1, "rgba(0,0,0,0.18)");
  ctx.fillStyle = limb;
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  ctx.globalCompositeOperation = "source-over";

  return c;
}
