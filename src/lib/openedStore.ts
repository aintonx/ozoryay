"use client";

/**
 * Какие письма уже открыты. Хранится в localStorage и читается через
 * useSyncExternalStore: прогресс — внешнее состояние, а не состояние React.
 *
 * Побочная выгода — событие storage: если она откроет сайт во второй вкладке,
 * прогресс совпадёт в обеих, а не разъедется.
 */
const KEY = "ozoryay.opened";
const EMPTY: number[] = [];

let cache: number[] = EMPTY;
let cacheRaw: string | null = null;
const listeners = new Set<() => void>();

function readRaw(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    // Приватный режим — прогресс просто не помнится.
    return null;
  }
}

/**
 * Ссылка должна оставаться той же, пока не изменилась строка в хранилище:
 * useSyncExternalStore сравнивает снимки по ссылке и на новом массиве
 * при каждом вызове ушёл бы в бесконечный цикл.
 */
export function getOpenedSnapshot(): number[] {
  const raw = readRaw();
  if (raw !== cacheRaw) {
    cacheRaw = raw;
    try {
      const parsed: unknown = raw ? JSON.parse(raw) : null;
      cache = Array.isArray(parsed) ? (parsed.filter((v) => typeof v === "number") as number[]) : EMPTY;
    } catch {
      cache = EMPTY;
    }
  }
  return cache;
}

export function getOpenedServerSnapshot(): number[] {
  return EMPTY;
}

export function subscribeOpened(onChange: () => void): () => void {
  listeners.add(onChange);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY || e.key === null) onChange();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

export function markOpened(id: number): void {
  const current = getOpenedSnapshot();
  if (current.includes(id)) return;
  const next = [...current, id];
  cache = next;
  cacheRaw = JSON.stringify(next);
  try {
    localStorage.setItem(KEY, cacheRaw);
  } catch {
    // см. выше
  }
  listeners.forEach((l) => l());
}
