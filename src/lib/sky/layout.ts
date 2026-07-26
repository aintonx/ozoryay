/**
 * Композиция экрана в долях вьюпорта. Единственный источник координат:
 * и canvas, и DOM-слои считают позиции отсюда, иначе они разъедутся.
 */
export const LAYOUT = {
  /** Базовая линия земли. Небо — всё, что выше. */
  groundY: 0.862,

  /**
   * Луна: высоко и чуть правее центра. Таймер встаёт слева от неё, надпись
   * с расстоянием — справа, поэтому ей нужен воздух с обеих сторон.
   */
  moon: { x: 0.56, y: 0.152 },

  /**
   * Откуда бьёт луч воспоминаний — от домика на дальнем краю деревни.
   * Самого прожектора не видно: просто в одном из домов кто-то не спит
   * и светит в небо.
   */
  projectorX: 0.703,

  /**
   * Вечная звезда. Самая нижняя у горизонта, в правой части —
   * по диагонали от прожектора, иначе экран становится симметричным.
   */
  eternalStar: { x: 0.842, y: 0.806 },

  /** Верхняя граница, выше которой звёзды не ставим: там край экрана. */
  skyTop: 0.02,
} as const;

/**
 * Профиль земли: сумма гауссиан. Гладко, натурально и, в отличие от кривых
 * Безье, позволяет дёшево узнать высоту земли в любой точке —
 * это нужно, чтобы деревья и дома стояли на склоне, а не висели.
 */
function bump(x: number, center: number, width: number, height: number) {
  const t = (x - center) / width;
  return height * Math.exp(-t * t * 2.2);
}

/** Высота силуэта земли в точке x (0..1). Возвращает долю вьюпорта. */
export function groundYAt(x: number): number {
  return (
    LAYOUT.groundY -
    bump(x, 0.17, 0.3, 0.073) - // главный холм
    bump(x, 0.62, 0.24, 0.013) + // едва заметная волна
    bump(x, 0.93, 0.2, 0.011) // лёгкая ложбина у правого края
  );
}

/**
 * Геометрия прожектора в пикселях. Один источник и для силуэта, и для луча:
 * иначе луч бьёт не из линзы, а рядом с ней, и конструкция разваливается.
 *
 * Короб задран поворотом, линза сидит на его срезе. И силуэт (terrain),
 * и луч (projector) обязаны брать эти же числа, поэтому позиция линзы
 * вычисляется тем же преобразованием, что рисует короб, а не на глаз.
 */
export const PROJECTOR_BOX = {
  widthRatio: 0.5, // ширина короба в долях size
  heightRatio: 0.26, // высота короба
  tilt: -0.24, // наклон короба (радианы), смотрит в небо
  lensRatio: 0.44, // где на коробе линза (доля полуширины от центра)
} as const;

export function projectorMetrics(w: number, h: number) {
  const x = LAYOUT.projectorX * w;
  const base = groundYAt(LAYOUT.projectorX) * h + 1;
  const size = Math.max(26, Math.min(46, h * 0.052));
  const headY = base - size * 0.62;

  const bh = size * PROJECTOR_BOX.heightRatio;
  const bw = size * PROJECTOR_BOX.widthRatio;
  // Центр поворота короба (translate в terrain) и локальная точка линзы.
  const pivotX = x;
  const pivotY = headY - bh * 0.3;
  const lensLocalX = bw * PROJECTOR_BOX.lensRatio;
  const cos = Math.cos(PROJECTOR_BOX.tilt);
  const sin = Math.sin(PROJECTOR_BOX.tilt);

  return {
    x,
    base,
    size,
    headY,
    pivot: { x: pivotX, y: pivotY },
    // Мировая точка линзы — ровно там, где короб рисует свой светящийся срез.
    lens: {
      x: pivotX + lensLocalX * cos,
      y: pivotY + lensLocalX * sin,
    },
  };
}

/** Горизонтальная позиция зарева из азимута на её город. */
export function glowXFromBearing(bearingDeg: number): number {
  // Горизонт — панорама в 180°, центр которой смотрит на юг.
  // При азимуте 178.7° получается 0.493: почти по центру, но не по центру.
  const x = 0.5 + (bearingDeg - 180) / 180;
  return Math.min(0.94, Math.max(0.06, x));
}
