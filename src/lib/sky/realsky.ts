import { julianDate, moonEquatorial, moonPhaseAccurate } from "./astro";
import { CONSTELLATIONS } from "./catalog";
import { makeCamera, projectStar, type Camera } from "./projection";
import { STAR_TINTS, withAlpha } from "./stars";

/**
 * Настоящее небо над её городом.
 *
 * Это не украшение, а факт: те самые созвездия, что видно с её балкона,
 * в том положении, в каком они стоят прямо сейчас. Небо поворачивается,
 * как настоящее, — за час сдвиг заметен, за ночь Медведица успевает
 * обойти Полярную.
 *
 * Всё считается локально, каталог лежит в коде: ни одного запроса наружу.
 */

export interface Observer {
  lat: number;
  lon: number;
  /** Как называть место — подпись под небом. */
  city: string;
}

export interface RealSkyView {
  /** Куда смотрит наблюдатель, градусы азимута. */
  bearing: number;
  observer: Observer;
  /** Момент, на который считается небо. */
  at: Date;
}

/** Яркость звезды из её величины: пятая величина едва видна, первая — сияет. */
function magToAlpha(mag: number): number {
  return Math.max(0.1, Math.min(1, (5.4 - mag) / 5.2));
}

function magToRadius(mag: number, unit: number): number {
  const t = Math.max(0, Math.min(1, (5.2 - mag) / 5.6));
  return unit * (0.0008 + Math.pow(t, 2.1) * 0.0036);
}

/**
 * Рисует настоящее небо: линии созвездий, звёзды, их имена.
 *
 * Слой пересобирается раз в полминуты — небо поворачивается на четверть
 * градуса за это время, глазу этого не уловить, а перерисовывать каждый
 * кадр несколько сотен звёзд с текстом незачем.
 */
export function drawRealSky(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  view: RealSkyView,
) {
  const { lat, lon } = view.observer;
  const jd = julianDate(view.at);
  const cam = makeCamera(view.bearing, w, h);
  const unit = Math.min(w, h);
  const maxLine = Math.hypot(w, h) * 0.32;

  // Линии созвездий — сперва, чтобы звёзды легли поверх узлов.
  ctx.save();
  ctx.lineWidth = 1;
  for (const con of CONSTELLATIONS) {
    const pts = con.stars.map((s) => projectStar(s.ra, s.dec, lat, lon, jd, cam, w, h));

    for (const [a, b] of con.lines) {
      const p = pts[a];
      const q = pts[b];
      if (!p?.visible || !q?.visible) continue;
      // Обе звезды должны стоять над горизонтом: линия, уходящая в землю,
      // выдаёт, что это рисунок, а не небо.
      if (p.alt < 0.5 || q.alt < 0.5) continue;
      // У краёв кадра проекция растягивает расстояния, и связь между двумя
      // соседними на небе звёздами превращается в полосу через весь экран.
      if (Math.hypot(q.x - p.x, q.y - p.y) > maxLine) continue;
      // У горизонта воздух гасит свет — линии тают.
      const fade = Math.min(1, Math.min(p.alt, q.alt) / 22);
      ctx.strokeStyle = withAlpha("#C9D6F0", 0.05 * fade);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(q.x, q.y);
      ctx.stroke();
    }

    // Названия созвездий не подписываем: подписи объясняют небо, а не создают
    // его, и превращают кадр в страницу атласа. Рисунок пусть угадывается.
  }
  ctx.restore();

  // Звёзды.
  for (const con of CONSTELLATIONS) {
    for (const s of con.stars) {
      const p = projectStar(s.ra, s.dec, lat, lon, jd, cam, w, h);
      if (!p.visible || p.alt < 0.5) continue;

      // Атмосферное поглощение: у горизонта звёзды тусклее и краснее.
      const ext = Math.min(1, p.alt / 18);
      const a = magToAlpha(s.mag) * (0.35 + 0.65 * ext);
      const r = magToRadius(s.mag, unit);
      // Низкие звёзды теплеют — так их и видно сквозь толщу воздуха.
      const tint = ext < 0.5 ? STAR_TINTS[4] : STAR_TINTS[2];

      const halo = r * (s.mag < 1.6 ? 9 : 5);
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, halo);
      g.addColorStop(0, withAlpha(tint, 0.5 * a));
      g.addColorStop(0.25, withAlpha(tint, 0.14 * a));
      g.addColorStop(1, withAlpha(tint, 0));
      ctx.fillStyle = g;
      ctx.fillRect(p.x - halo, p.y - halo, halo * 2, halo * 2);

      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fillStyle = withAlpha(tint, a);
      ctx.fill();

      // Имена отдельных звёзд не подписываем: вместе с названиями созвездий
      // они превращают небо в атлас. Кто захочет — узнает их сам.
    }
  }
}

/** Где сейчас Луна на экране и какая у неё фаза. Null — она за горизонтом. */
export function moonOnScreen(
  w: number,
  h: number,
  view: RealSkyView,
): { x: number; y: number; alt: number; illum: number; waxing: boolean } | null {
  const jd = julianDate(view.at);
  const { ra, dec } = moonEquatorial(jd);
  const cam = makeCamera(view.bearing, w, h);
  const p = projectStar(ra, dec, view.observer.lat, view.observer.lon, jd, cam, w, h);
  // Чуть ниже горизонта ещё показываем: луна красиво садится за холмы.
  if (!p.visible || p.alt < -2) return null;
  const ph = moonPhaseAccurate(jd);
  return { x: p.x, y: p.y, alt: p.alt, ...ph };
}

export type { Camera };
