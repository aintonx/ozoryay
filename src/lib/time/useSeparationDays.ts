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
  separationStartISO: string,
  tz: string,
): SeparationCounter {
  // Первое значение считаем сразу по часам устройства — чтобы не мигали нули
  // и не прыгала вёрстка. Через мгновение оно уточнится по времени сервера.
  const [counter, setCounter] = useState<SeparationCounter>(() =>
    compute(separationStartISO, tz, new Date(), 0),
  );
  const offset = useRef(0); // серверное время минус местное
  const peakDays = useRef(counter.days);

  useEffect(() => {
    let alive = true;

    /**
     * Время берём у сервера, а не у устройства: у части телефонов часы сбиты
     * на минуты, а то и на сутки, и счётчик соврал бы.
     *
     * Сайт статический, своего эндпоинта нет — поэтому спрашиваем время у
     * самого хостинга: в каждом HTTP-ответе есть служебный заголовок `Date`
     * с временем сервера. Достаточно лёгкого HEAD-запроса без тела.
     */
    async function sync() {
      const sent = Date.now();
      try {
        // Спрашиваем саму страницу: она есть всегда, а HEAD не тянет тело.
        const res = await fetch(`./?t=${sent}`, { method: "HEAD", cache: "no-store" });
        const header = res.headers.get("date");
        if (header) {
          const serverNow = new Date(header).getTime();
          const received = Date.now();
          if (Number.isFinite(serverNow)) {
            // Половина времени обхода — поправка на дорогу ответа.
            offset.current = serverNow + (received - sent) / 2 - received;
          }
        }
      } catch {
        // Сеть отвалилась — продолжаем с последним известным офсетом.
      }
      if (alive) recompute();
    }

    function recompute() {
      const next = compute(separationStartISO, tz, new Date(Date.now() + offset.current), peakDays.current);
      peakDays.current = next.days;
      setCounter(next);
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

/** Дни разлуки и её время суток на заданный момент. */
function compute(
  separationStartISO: string,
  tz: string,
  at: Date,
  floorDays: number,
): SeparationCounter {
  return {
    days: separationDays(separationStartISO, tz, at, floorDays),
    ...clockInTz(at, tz),
  };
}
