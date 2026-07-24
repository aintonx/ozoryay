"use client";

import { useEffect, useRef, useState } from "react";
import { clockInTz, separationDays, type Clock } from "./days";

const RESYNC_MS = 5 * 60 * 1000;
const TICK_MS = 1000;

export interface SeparationCounter extends Clock {
  days: number;
}

/**
 * Счётчик разлуки, который не имеет права соврать.
 *
 * Начальные значения приходят с сервера уже посчитанными, поэтому при загрузке
 * не мигают нули и нет сдвига вёрстки. Дальше клиент один раз снимает офсет
 * относительно серверных часов и тикает локально каждую секунду,
 * пересинхронизируясь раз в пять минут и при каждом возврате на вкладку.
 *
 * Дни только растут: если её часовой пояс сменится на западный, календарная
 * дата может откатиться назад — но разлука не может стать короче. Часы, минуты
 * и секунды — её текущее время суток; в её полночь всё обнуляется, а день
 * прибавляется.
 */
export function useSeparationCounter(
  initial: SeparationCounter,
  separationStartISO: string,
  tz: string,
): SeparationCounter {
  const [counter, setCounter] = useState(initial);
  const offset = useRef(0); // серверное время минус местное
  const peakDays = useRef(initial.days);

  useEffect(() => {
    let alive = true;

    async function sync() {
      const sent = Date.now();
      try {
        const res = await fetch("/api/now", { cache: "no-store" });
        const { now } = (await res.json()) as { now: number };
        const received = Date.now();
        // Половина времени обхода — поправка на дорогу ответа.
        offset.current = now + (received - sent) / 2 - received;
      } catch {
        // Сеть отвалилась — продолжаем с последним известным офсетом.
      }
      if (alive) recompute();
    }

    function recompute() {
      const serverNow = new Date(Date.now() + offset.current);
      const days = separationDays(separationStartISO, tz, serverNow, peakDays.current);
      peakDays.current = days;
      setCounter({ days, ...clockInTz(serverNow, tz) });
    }

    function onVisible() {
      if (document.visibilityState === "visible") sync();
    }

    sync();
    const tick = setInterval(recompute, TICK_MS);
    const resync = setInterval(sync, RESYNC_MS);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      alive = false;
      clearInterval(tick);
      clearInterval(resync);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [separationStartISO, tz]);

  return counter;
}
