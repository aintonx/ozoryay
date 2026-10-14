interface SettleOptions {
  /** Сколько кадров подряд должны уложиться в `maxDeltaMs`. */
  stableFrames?: number;
  /** Самый длинный кадр, который ещё считается плавным. 40 мс — это
   *  25 к/с: держит и режим энергосбережения (30 к/с), и 60/120 Гц. */
  maxDeltaMs?: number;
  /** Потолок ожидания: на совсем слабом устройстве не ждём вечно. */
  capMs?: number;
}

/**
 * Вызывает `cb`, когда главный поток отдышался: несколько кадров подряд
 * идут без провалов. Возвращает функцию отмены.
 *
 * Зачем. Только что смонтированная страница тяжёлая — канвас неба строит
 * слои, стекло виджетов растеризуется впервые. Если запустить въезд
 * виджетов в тот же кадр, первый кадр перехода выходит длинным, а
 * CSS-переход считает по часам, не по кадрам: следующий кадр прыгает
 * сразу на большую часть пути. Выглядит как рывок и случается не всегда —
 * зависит от устройства и от того, что успело отрисоваться. Здесь въезд
 * стартует с уже прогретого состояния.
 *
 * `requestAnimationFrame` не вызывается на скрытой вкладке, поэтому
 * ожидание само приостанавливается и продолжается, когда вкладку
 * открывают, — потолок `capMs` считается только по реально прошедшим
 * кадрам.
 */
export function whenFramesSettle(cb: () => void, options: SettleOptions = {}): () => void {
  const { stableFrames = 3, maxDeltaMs = 40, capMs = 700 } = options;
  let raf = 0;
  let last = 0;
  let calm = 0;
  let started = 0;
  let stopped = false;

  const tick = (now: number) => {
    if (stopped) return;
    if (started === 0) started = now;
    if (last !== 0) calm = now - last <= maxDeltaMs ? calm + 1 : 0;
    last = now;
    if (calm >= stableFrames || now - started >= capMs) {
      stopped = true;
      cb();
      return;
    }
    raf = requestAnimationFrame(tick);
  };

  raf = requestAnimationFrame(tick);
  return () => {
    stopped = true;
    cancelAnimationFrame(raf);
  };
}
