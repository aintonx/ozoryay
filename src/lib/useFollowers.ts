"use client";

import { useEffect, useState } from "react";

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
 */
export function useFollowers(): Followers | null {
  const [data, setData] = useState<Followers | null>(null);

  useEffect(() => {
    let alive = true;
    // Путь относительный: сайт живёт и в корне домена, и в подпапке.
    fetch("data/followers.json", { cache: "no-cache" })
      .then((r) => (r.ok ? r.json() : null))
      .then((json: Followers | null) => {
        if (!alive || !json || typeof json.followers !== "number") return;
        setData({ ...json, history: Array.isArray(json.history) ? json.history : [] });
      })
      .catch(() => {
        // Нет файла или нет сети — виджета просто не будет.
      });
    return () => {
      alive = false;
    };
  }, []);

  return data;
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
