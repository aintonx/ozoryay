"use client";

import { useEffect, useState } from "react";
import type { Observer } from "@/lib/sky/realsky";

const KEY = "ozoryay.observer";

/**
 * Откуда смотрят на небо.
 *
 * По умолчанию — её город из настроек. Если она разрешит браузеру сообщить
 * местоположение, небо поедет за ней: уедет в другой город — увидит созвездия
 * оттуда. Разрешение спрашивается один раз и запоминается.
 *
 * Никаких сервисов геолокации: координаты даёт сам браузер, а всё остальное
 * считается на месте.
 */
export function useObserver(fallback: Observer): Observer {
  // Запомненное с прошлого раза читаем сразу, а не в эффекте: небо должно
  // строиться из верного места с первого кадра. Значение уходит только
  // в canvas, поэтому расхождения с разметкой сервера тут быть не может.
  const [observer, setObserver] = useState<Observer>(() => {
    if (typeof window === "undefined") return fallback;
    try {
      const raw = localStorage.getItem(KEY);
      const saved = raw ? (JSON.parse(raw) as Observer) : null;
      if (saved && Number.isFinite(saved.lat) && Number.isFinite(saved.lon)) return saved;
    } catch {
      // приватный режим — просто берём город из настроек
    }
    return fallback;
  });

  useEffect(() => {
    if (!navigator.geolocation) return;
    let alive = true;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (!alive) return;
        const next: Observer = {
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          // Название места не запрашиваем: это стоило бы обращения наружу,
          // а «где-то» здесь честнее выдуманного города.
          city: "",
        };
        setObserver(next);
        try {
          localStorage.setItem(KEY, JSON.stringify(next));
        } catch {
          // см. выше
        }
      },
      () => {
        // Отказала или не получилось — остаёмся при её городе.
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 24 * 3600 * 1000 },
    );

    return () => {
      alive = false;
    };
  }, []);

  return observer;
}
