"use client";

import { useEffect, useSyncExternalStore } from "react";

export interface FollowersPoint {
  /** День в виде ГГГГ-ММ-ДД. */
  d: string;
  n: number;
}

export interface Followers {
  updatedAt: string | null;
  username: string | null;
  followers: number | null;
  history: FollowersPoint[];
  /**
   * Прирост, который стоит внизу виджета, — «+153 за 3 недели».
   *
   * Не считается из истории: она ведётся вручную и незачем требовать
   * от человека, который правит файл руками, ещё и накопление точных
   * дневных отметок. Оба поля — просто число и просто подпись к нему.
   * Нет значения — строка с приростом просто не появится.
   */
  growthAmount: number | null;
  growthPeriod: string | null;
  /**
   * Разовая веха — «стала тысячницей» и момент, когда это случилось.
   *
   * Как и прирост выше, вручную: история хранит точку в лучшем случае
   * раз в пару дней, а точное время конкретного момента в ней просто
   * не с чем взять. `milestoneLabel` — уже готовое склонённое слово
   * («тысячницей», «двухтысячницей»...), а не число, из которого его
   * пришлось бы собирать по правилам русского языка в коде.
   */
  milestoneAt: string | null;
  milestoneLabel: string | null;
}

/**
 * Сколько людей её читает.
 *
 * Число лежит готовым файлом: его раз в три часа обновляет GitHub Actions
 * (scripts/fetch-followers.mjs). Здесь остаётся только прочитать — ни
 * ключей, ни запросов к инстаграму из браузера, ни ожидания на экране.
 *
 * Пока файл пуст — а он пуст, пока не выдан токен, — возвращается null,
 * и виджет просто не появляется. Пустая карточка с прочерком выглядела бы
 * поломкой, а её отсутствие никто не заметит.
 *
 * Данные живут в модуле, а не в состоянии компонента. Раньше каждый
 * монтаж главного экрана заново ходил за файлом (`no-cache` — то есть
 * на сервер, а не в кэш браузера), а виджет появлялся только после ответа.
 * При первом заходе это пряталось под заставкой, а при возврате из
 * «Зоны» виджеты выезжают через доли секунды после монтажа, и ответ
 * приходил посреди этого выезда: в сетке вдруг появлялась ещё одна
 * карточка, `fit()` пересчитывал масштаб, и ВСЕ виджеты прыгали на
 * глазах. Случалось не всегда — зависело от того, кто быстрее: сеть или
 * выезд.
 *
 * Правило, которое держит модуль: пока главный экран на виду, набор
 * карточек не меняется. До «успокоения» (`settled`) данные можно
 * публиковать сразу — виджеты ещё под занавесом, — а всё, что приходит
 * позже, ждёт момента, когда подписчиков не осталось (то есть главный
 * экран уже размонтирован), и подставляется только к следующему показу.
 */
interface Snapshot {
  data: Followers | null;
  /** Набор карточек определён: дальше при открытом экране он не меняется. */
  settled: boolean;
}

const SERVER_SNAPSHOT: Snapshot = { data: null, settled: false };

/** Как часто можно перепроверять файл при очередном показе экрана. */
const REVALIDATE_AFTER_MS = 10 * 60 * 1000;

let snapshot: Snapshot = SERVER_SNAPSHOT;
/** Ответ, пришедший, когда набор карточек уже зафиксирован. */
let pending: Snapshot | null = null;
let inflight = false;
let fetchedAt = 0;
/** Прошлая попытка не дала ответа — стоит повторить при следующем показе. */
let needsRetry = false;
const listeners = new Set<() => void>();

function normalize(json: Followers | null): Followers | null {
  if (!json || typeof json.followers !== "number") return null;
  return {
    ...json,
    history: Array.isArray(json.history) ? json.history : [],
    growthAmount: typeof json.growthAmount === "number" ? json.growthAmount : null,
    growthPeriod: typeof json.growthPeriod === "string" ? json.growthPeriod : null,
    milestoneAt: typeof json.milestoneAt === "string" ? json.milestoneAt : null,
    milestoneLabel: typeof json.milestoneLabel === "string" ? json.milestoneLabel : null,
  };
}

function publish(next: Snapshot) {
  snapshot = next;
  listeners.forEach((l) => l());
}

function receive(data: Followers | null) {
  const next: Snapshot = { data, settled: true };
  if (!snapshot.settled) {
    publish(next);
  } else if (listeners.size === 0) {
    snapshot = next;
  } else {
    pending = next;
  }
}

/**
 * Запрашивает файл, если пора. Можно звать сколько угодно раз: лишний
 * вызов при уже идущем запросе ничего не делает.
 */
export function loadFollowers(): void {
  if (typeof window === "undefined" || inflight) return;
  const stale = snapshot.settled && Date.now() - fetchedAt > REVALIDATE_AFTER_MS;
  if (snapshot.settled && !needsRetry && !stale) return;

  inflight = true;
  // Путь относительный: сайт живёт и в корне домена, и в подпапке.
  // `fetch` в try: в совсем древнем браузере его просто нет, и бросок из
  // эффекта уронил бы весь экран ради одной необязательной карточки.
  let request: Promise<Response>;
  try {
    request = fetch("data/followers.json", { cache: "no-cache" });
  } catch {
    request = Promise.reject(new Error("fetch unavailable"));
  }
  request
    .then((r) => {
      needsRetry = !r.ok && r.status >= 500;
      return r.ok ? r.json() : null;
    })
    .then((json: Followers | null) => {
      fetchedAt = Date.now();
      receive(normalize(json));
    })
    .catch(() => {
      // Нет сети — виджета не будет, а повторим при следующем показе.
      needsRetry = true;
      fetchedAt = Date.now();
      receive(null);
    })
    .finally(() => {
      inflight = false;
    });
}

/**
 * Фиксирует набор карточек как есть. Зовёт тот, кто собирается показать
 * экран и больше не может ждать ответа: всё, что придёт после, дождётся
 * следующего показа и экран не тронет.
 */
export function freezeFollowers(): void {
  if (snapshot.settled) return;
  publish({ data: snapshot.data, settled: true });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && pending) {
      snapshot = pending;
      pending = null;
    }
  };
}

function getSnapshot(): Snapshot {
  return snapshot;
}

function getServerSnapshot(): Snapshot {
  return SERVER_SNAPSHOT;
}

export function useFollowers(): Followers | null {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  useEffect(() => {
    loadFollowers();
  }, []);
  return snap.data;
}

/** Набор карточек определён, и экран можно показывать, не боясь, что он
 *  поменяется на ходу. */
export function useFollowersSettled(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot).settled;
}

/**
 * Насколько выросло за `days` дней.
 *
 * Берём самую свежую точку не новее нужной даты: замеры идут не строго
 * каждый день, и требовать точного совпадения значило бы то и дело
 * оставаться без ответа.
 */
export function growthOver(history: FollowersPoint[], days: number): number | null {
  if (history.length < 2) return null;
  const last = history[history.length - 1];
  const target = new Date(last.d);
  target.setDate(target.getDate() - days);
  const cutoff = target.toISOString().slice(0, 10);

  let base: FollowersPoint | null = null;
  for (const p of history) {
    if (p.d <= cutoff) base = p;
  }
  // Истории короче запрошенного срока — считаем от самой первой точки.
  if (!base) base = history[0];
  if (base.d === last.d) return null;
  return last.n - base.n;
}
