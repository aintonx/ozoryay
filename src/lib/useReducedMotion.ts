"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void) {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

/**
 * Подписка на системную настройку движения.
 *
 * Через useSyncExternalStore, а не через useState в эффекте: значение живёт
 * снаружи React, и при таком чтении нет ни лишнего рендера после монтирования,
 * ни расхождения с разметкой сервера. Смену настройки на лету тоже ловим.
 */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false, // на сервере исходим из того, что движение разрешено
  );
}
