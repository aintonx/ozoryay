/**
 * Астрономия: где на самом деле стоит светило над заданной точкой Земли.
 *
 * Всё считается прямо в браузере, без единого запроса наружу — каталог звёзд
 * лежит статическим файлом, остальное арифметика. Точности этих формул
 * (доли градуса) с запасом хватает: на экране градус — это пара пикселей.
 */

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;

export interface Horizontal {
  /** Высота над горизонтом, градусы. Отрицательная — светило под землёй. */
  alt: number;
  /** Азимут от севера по часовой стрелке, градусы: 0 — север, 180 — юг. */
  az: number;
}

/** Юлианская дата — общее время всей астрономии. */
export function julianDate(at: Date): number {
  return at.getTime() / 86400000 + 2440587.5;
}

/** Столетия от эпохи J2000 — аргумент почти всех формул. */
export function julianCenturies(jd: number): number {
  return (jd - 2451545) / 36525;
}

/**
 * Гринвичское среднее звёздное время в градусах.
 *
 * Звёздные сутки короче солнечных на четыре минуты — из-за этого небо
 * каждую ночь чуть смещается, и созвездия «переезжают» по сезонам.
 */
export function gmst(jd: number): number {
  const t = julianCenturies(jd);
  let x =
    280.46061837 +
    360.98564736629 * (jd - 2451545) +
    0.000387933 * t * t -
    (t * t * t) / 38710000;
  x %= 360;
  return x < 0 ? x + 360 : x;
}

/** Местное звёздное время: какая точка небесного экватора сейчас на юге. */
export function lst(jd: number, lonDeg: number): number {
  const x = (gmst(jd) + lonDeg) % 360;
  return x < 0 ? x + 360 : x;
}

/**
 * Экваториальные координаты (то, как записаны звёзды в каталогах) в
 * горизонтальные (то, куда смотреть с земли).
 *
 * ra, dec — градусы; lat, lon — широта и долгота наблюдателя.
 */
export function equatorialToHorizontal(
  ra: number,
  dec: number,
  lat: number,
  lon: number,
  jd: number,
): Horizontal {
  // Часовой угол — насколько светило отошло от юга.
  let ha = (lst(jd, lon) - ra) % 360;
  if (ha < 0) ha += 360;

  const haR = ha * DEG;
  const decR = dec * DEG;
  const latR = lat * DEG;

  const sinAlt =
    Math.sin(decR) * Math.sin(latR) + Math.cos(decR) * Math.cos(latR) * Math.cos(haR);
  const alt = Math.asin(Math.max(-1, Math.min(1, sinAlt)));

  const cosAz =
    (Math.sin(decR) - Math.sin(alt) * Math.sin(latR)) / (Math.cos(alt) * Math.cos(latR));
  let az = Math.acos(Math.max(-1, Math.min(1, cosAz))) * RAD;
  // Ветвь арккосинуса: до полудня светило на востоке, после — на западе.
  if (Math.sin(haR) > 0) az = 360 - az;

  return { alt: alt * RAD, az };
}

/**
 * Положение Луны на небе — упрощённый ряд Брауна.
 *
 * Луна ходит сложнее звёзд: её путь возмущают Солнце и сплюснутость Земли.
 * Взяты главные члены ряда — ошибка порядка десятых долей градуса, то есть
 * меньше её собственного диска. Для «луна вон там, над тем деревом» — точно.
 */
export function moonEquatorial(jd: number): { ra: number; dec: number } {
  const d = jd - 2451545;

  // Средние элементы орбиты, градусы.
  const L = 218.316 + 13.176396 * d; // средняя долгота
  const M = 134.963 + 13.064993 * d; // средняя аномалия Луны
  const F = 93.272 + 13.22935 * d; // аргумент широты
  const Ms = 357.529 + 0.98560028 * d; // средняя аномалия Солнца
  const D = 297.85 + 12.190749 * d; // средняя элонгация

  // Эклиптические координаты с главными возмущениями.
  const lambda =
    L +
    6.289 * Math.sin(M * DEG) +
    1.274 * Math.sin((2 * D - M) * DEG) + // эвекция
    0.658 * Math.sin(2 * D * DEG) + // вариация
    0.214 * Math.sin(2 * M * DEG) -
    0.186 * Math.sin(Ms * DEG) - // годичное уравнение
    0.114 * Math.sin(2 * F * DEG);
  const beta =
    5.128 * Math.sin(F * DEG) +
    0.281 * Math.sin((M + F) * DEG) -
    0.278 * Math.sin((F - M) * DEG) -
    0.173 * Math.sin((2 * D - F) * DEG);

  return eclipticToEquatorial(lambda, beta, jd);
}

/** Эклиптические координаты в экваториальные. */
export function eclipticToEquatorial(
  lambdaDeg: number,
  betaDeg: number,
  jd: number,
): { ra: number; dec: number } {
  const t = julianCenturies(jd);
  // Наклон земной оси — он медленно уменьшается.
  const eps = (23.439291 - 0.0130042 * t) * DEG;
  const l = lambdaDeg * DEG;
  const b = betaDeg * DEG;

  const sinDec = Math.sin(b) * Math.cos(eps) + Math.cos(b) * Math.sin(eps) * Math.sin(l);
  const dec = Math.asin(Math.max(-1, Math.min(1, sinDec)));
  const y = Math.sin(l) * Math.cos(eps) - Math.tan(b) * Math.sin(eps);
  const x = Math.cos(l);
  let ra = Math.atan2(y, x) * RAD;
  if (ra < 0) ra += 360;

  return { ra, dec: dec * RAD };
}

/**
 * Положение Солнца. Нужно и само по себе (когда рассвет), и для фазы Луны:
 * фаза — это угол между направлениями на Солнце и на Луну.
 */
export function sunEquatorial(jd: number): { ra: number; dec: number; lambda: number } {
  const d = jd - 2451545;
  const M = (357.529 + 0.98560028 * d) * DEG; // средняя аномалия
  const L = 280.459 + 0.98564736 * d; // средняя долгота
  // Уравнение центра: орбита Земли не круг, а эллипс.
  const lambda = L + 1.915 * Math.sin(M) + 0.02 * Math.sin(2 * M);
  const eq = eclipticToEquatorial(lambda, 0, jd);
  return { ...eq, lambda };
}

/**
 * Фаза Луны из истинного положения светил, а не из среднего периода.
 *
 * Средний синодический месяц врёт до нескольких часов — на глаз это разница
 * в толщине серпа. Здесь фаза берётся из настоящего углового расстояния
 * между Луной и Солнцем.
 */
export function moonPhaseAccurate(jd: number): { illum: number; waxing: boolean } {
  const m = moonEquatorial(jd);
  const s = sunEquatorial(jd);

  const raM = m.ra * DEG;
  const decM = m.dec * DEG;
  const raS = s.ra * DEG;
  const decS = s.dec * DEG;

  // Угловое расстояние Луна—Солнце.
  const cosElong =
    Math.sin(decM) * Math.sin(decS) + Math.cos(decM) * Math.cos(decS) * Math.cos(raM - raS);
  const elong = Math.acos(Math.max(-1, Math.min(1, cosElong)));

  // Освещённая доля диска.
  const illum = (1 - Math.cos(elong)) / 2;
  // Растёт ли Луна: восточнее Солнца — растущая.
  let diff = (m.ra - s.ra) % 360;
  if (diff < 0) diff += 360;

  return { illum, waxing: diff < 180 };
}
