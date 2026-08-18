import { equatorialToHorizontal, type Horizontal } from "./astro";
import { LAYOUT } from "./layout";

/**
 * Проекция настоящего неба на экран.
 *
 * Наблюдатель стоит на земле и смотрит в сторону её города. Небо — полусфера
 * над головой, экран — плоское окно в неё. Используется гномоническая
 * проекция: та же, что в объективе камеры. Прямые линии остаются прямыми,
 * поэтому рисунки созвездий не искривляются — именно так их и запоминают.
 */

const DEG = Math.PI / 180;

export interface Camera {
  /** Куда смотрим по горизонту, градусы (0 — север, 180 — юг). */
  azimuth: number;
  /** Насколько задран взгляд, градусы. */
  altitude: number;
  /** Поле зрения по горизонтали, градусы. */
  fov: number;
}

export interface Projected {
  x: number;
  y: number;
  /** Позади камеры — рисовать нельзя. */
  visible: boolean;
}

/**
 * Точка неба (азимут, высота) в координаты экрана.
 *
 * Горизонт кладём на линию земли, а не в середину экрана: небо занимает
 * четыре пятых кадра, как и было задумано.
 */
export function project(h: Horizontal, cam: Camera, w: number, hgt: number): Projected {
  const az = h.az * DEG;
  const alt = h.alt * DEG;
  const camAz = cam.azimuth * DEG;
  const camAlt = cam.altitude * DEG;

  // Единичный вектор направления на светило в системе наблюдателя.
  const x = Math.cos(alt) * Math.sin(az - camAz);
  const y = Math.sin(alt);
  const z = Math.cos(alt) * Math.cos(az - camAz);

  // Поворот на угол подъёма камеры.
  const cosA = Math.cos(camAlt);
  const sinA = Math.sin(camAlt);
  const yr = y * cosA - z * sinA;
  const zr = y * sinA + z * cosA;

  // Отсекаем всё, что почти сбоку от камеры. Гномоническая проекция делит на
  // zr, и у краёв поля зрения она растягивает расстояния до бесконечности:
  // две соседние на небе звезды превращаются в полосу через весь экран.
  // Порог с запасом от половины поля зрения — точки чуть за кадром ещё нужны,
  // чтобы линии созвездий не обрывались у самой рамки.
  if (zr <= 0.25) return { x: 0, y: 0, visible: false };

  // Масштаб из поля зрения: половина экрана = тангенс половины угла.
  const scale = w / 2 / Math.tan((cam.fov / 2) * DEG);
  // Горизонт (alt=0 при нулевом наклоне камеры) должен попасть на линию земли.
  const horizonY = LAYOUT.groundY * hgt;

  return {
    x: w / 2 + (x / zr) * scale,
    y: horizonY - (yr / zr) * scale,
    visible: true,
  };
}

/** Светило каталога сразу в экранных координатах. */
export function projectStar(
  ra: number,
  dec: number,
  lat: number,
  lon: number,
  jd: number,
  cam: Camera,
  w: number,
  h: number,
): Projected & { alt: number } {
  const hor = equatorialToHorizontal(ra, dec, lat, lon, jd);
  const p = project(hor, cam, w, h);
  return { ...p, alt: hor.alt };
}

/**
 * Камера подбирается под экран: на телефоне поле зрения шире, иначе в кадр
 * попадёт два созвездия и небо потеряет узнаваемость.
 */
export function makeCamera(azimuth: number, w: number, h: number): Camera {
  const portrait = h > w;
  return {
    azimuth,
    // Взгляд приподнят: под ногами смотреть нечего, а зенит должен влезать.
    altitude: portrait ? 46 : 34,
    fov: portrait ? 105 : 92,
  };
}
