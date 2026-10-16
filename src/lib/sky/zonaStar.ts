import { ZONA_REVEAL_MS, ZONA_STAR_FADE_MS } from "../zonaTiming";

/**
 * Как меняется яркость звезды «Зоны» — отдельно от рендерера, чтобы это
 * можно было проверить без канваса.
 *
 * Два режима, и выбирает их тот, кто держит звезду (`zona/page.tsx`):
 *
 *  - по времени (`trackMs` — `null`): вспышка за `ZONA_REVEAL_MS` в такт
 *    росту окна и протяжное затухание за `ZONA_STAR_FADE_MS`. Так звезда
 *    разгорается при открытии и гаснет на главном экране после возврата;
 *  - вслед за целью (`trackMs` — число): цель двигает палец, и яркость
 *    идёт за ней с запаздыванием в доли секунды. Так звезда ведёт себя,
 *    пока карточку тянут вниз и пока она доезжает после отпускания.
 *    Экспонента, а не линейная доводка, потому что цель в этом режиме
 *    может скакать (отпустили — `progress` сразу стал единицей), и
 *    скачок в яркости должен превращаться в плавный спад, а не в излом.
 */
export function stepZonaBoost(
  value: number,
  target: number,
  dtSec: number,
  opts: { reducedMotion: boolean; trackMs: number | null },
): number {
  if (opts.reducedMotion) return target;

  if (opts.trackMs !== null) {
    const tau = Math.max(0.001, opts.trackMs / 1000);
    const next = value + (target - value) * (1 - Math.exp(-dtSec / tau));
    // Не тащим хвост экспоненты бесконечно: ниже 0.2% глазом уже не видно.
    return Math.abs(target - next) < 0.002 ? target : next;
  }

  const ms = target > value ? ZONA_REVEAL_MS : ZONA_STAR_FADE_MS;
  const step = (1000 / ms) * dtSec;
  return value < target ? Math.min(target, value + step) : Math.max(target, value - step);
}

/** S-образная кривая — того же семейства, что `--ease-lift` у карточки
 *  входа: яркость звезды и рост окна из неё идут в одном ритме. */
function easeInOut(x: number): number {
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

/**
 * Яркость, с которой звезда рисуется.
 *
 * По времени — через S-кривую (так она и согласована с окном). Вслед за
 * пальцем — напрямую: S-кривая плоская у краёв, и первые 80 px жеста
 * звезда не реагировала бы вовсе, а закрытие засчитывается уже на 96.
 */
export function shownZonaBoost(value: number, tracking: boolean): number {
  return tracking ? value : easeInOut(value);
}
