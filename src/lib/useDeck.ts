"use client";

import { useCallback, useRef, useState } from "react";

/**
 * Колода без повторов.
 *
 * Тасуем весь список и раздаём по одному, пока не кончится, — только потом
 * тасуем заново. Так одно и то же не выпадет дважды подряд и каждое будет
 * показано, прежде чем повторится.
 *
 * Порядок разный при каждом заходе на сайт: колода тасуется заново при
 * создании, а не хранится между визитами. Иначе в третий вечер она увидела
 * бы ту же последовательность, что и в первый.
 */
export function useDeck<T>(items: T[]) {
  const bag = useRef<number[]>([]);
  const [left, setLeft] = useState(items.length);

  const refill = useCallback(() => {
    const idx = Array.from({ length: items.length }, (_, i) => i);
    for (let i = idx.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [idx[i], idx[j]] = [idx[j], idx[i]];
    }
    bag.current = idx;
  }, [items.length]);

  const draw = useCallback((): T | null => {
    if (items.length === 0) return null;
    if (bag.current.length === 0) refill();
    const i = bag.current.pop();
    setLeft(bag.current.length);
    return i === undefined ? null : items[i];
  }, [items, refill]);

  return { draw, left };
}
