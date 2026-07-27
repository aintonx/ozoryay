"use client";

import { useCallback, useEffect, useRef } from "react";
import type { ProjectorImage } from "@/lib/sky/projector";

interface ManifestEntry {
  src: string;
  kind: "image" | "video";
}

/**
 * Колода воспоминаний для прожектора.
 *
 * Список файлов собирает сборка (scripts/memories-manifest.mjs), поэтому
 * добавить воспоминание — значит положить файл в public/memories и
 * закоммитить: ни здесь, ни где-либо ещё код менять не нужно.
 *
 * Порядок — shuffle bag: тасуем весь список и раздаём по одному без повторов,
 * пока колода не кончится, потом тасуем заново. Так одно и то же фото не
 * выпадет дважды подряд и каждое покажется, прежде чем повторится.
 *
 * Файлы грузятся лениво и кэшируются: тянуть всю папку разом незачем, но
 * первое воспоминание подгружаем заранее — прожектор не должен ждать.
 */
export function useMemories() {
  const manifest = useRef<ManifestEntry[]>([]);
  const bag = useRef<number[]>([]);
  const cache = useRef<Map<number, ProjectorImage>>(new Map());
  const ready = useRef(false);
  /** Видео, которое идёт прямо сейчас: следующее его останавливает. */
  const playing = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    let alive = true;
    // Путь относительный: сайт живёт и в корне домена, и в подпапке на github.io.
    fetch("memories/manifest.json", { cache: "no-cache" })
      .then((r) => (r.ok ? r.json() : []))
      .then((list: ManifestEntry[]) => {
        if (!alive || !Array.isArray(list) || list.length === 0) return;
        manifest.current = list;
        ready.current = true;
        // Подготовить первое воспоминание заранее.
        void load(peek());
      })
      .catch(() => {
        // Нет описи — прожектор просто не покажет ничего, механика цела.
      });
    return () => {
      alive = false;
      playing.current?.pause();
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

  /** Индекс следующего воспоминания, не вынимая из колоды. */
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
      const done = (item: ProjectorImage) => {
        cache.current.set(index, item);
        resolve(item);
      };

      if (entry.kind === "video") {
        const v = document.createElement("video");
        // Без звука и «в потоке» — иначе телефон откажется играть сам,
        // а на весь сайт нет ни одного звука и быть не должно.
        v.muted = true;
        v.defaultMuted = true;
        v.loop = true;
        v.playsInline = true;
        v.preload = "auto";
        v.onloadeddata = () => done({ el: v, w: v.videoWidth, h: v.videoHeight });
        v.onerror = () => resolve(null);
        v.src = entry.src;
        return;
      }

      const img = new Image();
      img.decoding = "async";
      img.onload = () => done({ el: img, w: img.naturalWidth, h: img.naturalHeight });
      img.onerror = () => resolve(null);
      img.src = entry.src;
    });
  }

  /** Следующее воспоминание: вынимает из колоды и подгружает следующее наперёд. */
  const takeNext = useCallback(async (): Promise<ProjectorImage | null> => {
    if (!ready.current) return null;
    if (bag.current.length === 0) refill();
    const index = bag.current.pop() ?? 0;
    const item = await load(index);

    // Предыдущий ролик останавливаем: он крутится в петле и без остановки
    // будет молотить кадры до конца вечера.
    if (playing.current && playing.current !== item?.el) {
      playing.current.pause();
      playing.current = null;
    }
    if (item?.el instanceof HTMLVideoElement) {
      playing.current = item.el;
      item.el.currentTime = 0;
      void item.el.play().catch(() => {
        // Не дали играть — прожектор покажет первый кадр, и на том спасибо.
      });
    }

    // Прогреть следующее, пока текущее показывается.
    void load(peek());
    return item;
    // refill/peek/load работают только с рефами и стабильны между рендерами.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { takeNext };
}
