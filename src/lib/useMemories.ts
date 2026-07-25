"use client";

import { useCallback, useEffect, useRef } from "react";
import type { ProjectorImage } from "@/lib/sky/projector";

interface ManifestEntry {
  src: string;
  w: number;
  h: number;
}

/**
 * Колода воспоминаний для прожектора.
 *
 * Порядок — shuffle bag: тасуем весь список и раздаём по одному без повторов,
 * пока колода не кончится, потом тасуем заново. Так одно и то же фото не
 * выпадет дважды подряд и каждое покажется, прежде чем повторится.
 *
 * Картинки грузятся лениво и кэшируются: 3.7 МБ целиком тянуть незачем, но
 * первое фото подгружаем заранее — автозапуск на четвёртой секунде должен
 * успеть.
 */
export function useMemories() {
  const manifest = useRef<ManifestEntry[]>([]);
  const bag = useRef<number[]>([]);
  const cache = useRef<Map<number, ProjectorImage>>(new Map());
  const ready = useRef(false);

  useEffect(() => {
    let alive = true;
    // Путь относительный: сайт живёт и в корне домена, и в подпапке на github.io.
    fetch("memories/manifest.json", { cache: "force-cache" })
      .then((r) => (r.ok ? r.json() : []))
      .then((list: ManifestEntry[]) => {
        if (!alive || !Array.isArray(list) || list.length === 0) return;
        manifest.current = list;
        ready.current = true;
        // Подготовить первое фото заранее — под автозапуск.
        void load(peek());
      })
      .catch(() => {
        // Нет манифеста — прожектор просто не покажет фото, механика цела.
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function refill() {
    const n = manifest.current.length;
    const idx = Array.from({ length: n }, (_, i) => i);
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [idx[i], idx[j]] = [idx[j], idx[i]];
    }
    bag.current = idx;
  }

  /** Индекс следующего фото, не вынимая из колоды. */
  function peek(): number {
    if (bag.current.length === 0) refill();
    return bag.current[bag.current.length - 1] ?? 0;
  }

  function load(index: number): Promise<ProjectorImage | null> {
    const entry = manifest.current[index];
    if (!entry) return Promise.resolve(null);
    const cached = cache.current.get(index);
    if (cached) return Promise.resolve(cached);

    return new Promise((resolve) => {
      const img = new Image();
      img.decoding = "async";
      img.onload = () => {
        const item: ProjectorImage = { el: img, w: entry.w, h: entry.h };
        cache.current.set(index, item);
        resolve(item);
      };
      img.onerror = () => resolve(null);
      img.src = entry.src;
    });
  }

  /** Следующее фото: вынимает из колоды и подгружает следующее наперёд. */
  const takeNext = useCallback(async (): Promise<ProjectorImage | null> => {
    if (!ready.current) return null;
    if (bag.current.length === 0) refill();
    const index = bag.current.pop() ?? 0;
    const item = await load(index);
    // Прогреть следующее, пока текущее показывается.
    void load(peek());
    return item;
    // refill/peek/load работают только с рефами и стабильны между рендерами.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { takeNext };
}
