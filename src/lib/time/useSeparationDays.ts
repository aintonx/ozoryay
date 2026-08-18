"use client";

import { useEffect, useRef, useState } from "react";
import { elapsedMs, elapsedSince, separationDays, type Elapsed } from "./days";

const RESYNC_MS = 5 * 60 * 1000;
const TICK_MS = 1000;

export interface SeparationCounter extends Elapsed {
  /**
   * Календарные ночи в её поясе — по ним растёт небо. Считаются отдельно от
   * `days`: звезда рождается в её полночь, а не в час расставания.
   */
  nights: number;
}

/**
 * Счётчик разлуки, который не имеет права соврать.
 *
 * Тикает от самой минуты расставания: дни, часы, минуты, секунды. Время
 * берётся у сервера (заголовок `Date` в ответе), а не у часов устройства —
 * у половины телефонов они сбиты.
 *
 * Значение только растёт. Достигнутый максимум хранится в миллисекундах и
 * переживает любые поправки часов: разлука не может стать короче.
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
  const peakMs = useRef(elapsedMs(separationStartISO, new Date()));

  useEffect(() => {
    let alive = true;

    /**
     * Сайт статический, своего эндпоинта нет — поэтому спрашиваем время у
     * самого хостинга: в каждом HTTP-ответе есть служебный заголовок `Date`
     * с временем сервера. Достаточно лёгкого HEAD-запроса без тела.
     */
    async function sync() {
      const sent = Date.now();
      try {
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
      const now = new Date(Date.now() + offset.current);
      peakMs.current = Math.max(peakMs.current, elapsedMs(separationStartISO, now));
      setCounter(compute(separationStartISO, tz, now, peakMs.current));
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

function compute(
  separationStartISO: string,
  tz: string,
  at: Date,
  floorMs: number,
): SeparationCounter {
  return {
    ...elapsedSince(separationStartISO, at, floorMs),
    nights: separationDays(separationStartISO, tz, at),
  };
}
