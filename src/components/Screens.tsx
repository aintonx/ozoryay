"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export type ScreenIndex = 0 | 1;

interface ScreensProps {
  /** Главный экран: виджеты. */
  home: ReactNode;
  /** Второй экран: небо и то, что можно в нём зажечь. */
  sky: ReactNode;
  index: ScreenIndex;
  onChange: (i: ScreenIndex) => void;
}

/** Пикселей пальцем, после которых свайп считается намеренным. */
const THRESHOLD = 56;
/** Сопротивление: экран идёт за пальцем медленнее пальца, как у резинки. */
const RUBBER = 0.42;
/** Пока жест короче этого, не решаем, наш он или чужой. */
const SLOP = 6;

const EASE = "transform 620ms cubic-bezier(0.32, 0.72, 0, 1)";

/**
 * Два экрана над одним небом.
 *
 * Небо остаётся на месте — уезжает только интерфейс: виджеты уходят вверх,
 * открывая то, что за ними. Так переход читается не как смена страницы,
 * а как «поднять глаза».
 *
 * Свайп вертикальный: горизонтальный на телефоне спорит с жестом «назад»
 * в браузере. Клавиши со стрелками делают то же самое для десктопа.
 */
export default function Screens({ home, sky, index, onChange }: ScreensProps) {
  const startY = useRef(0);
  const startX = useRef(0);
  /** Прокручиваемый предок под пальцем, если есть. */
  const scroller = useRef<HTMLElement | null>(null);
  /** null — ещё не решили; true — свайп наш; false — отдали прокрутке. */
  const owns = useRef<boolean | null>(null);

  const [drag, setDrag] = useState(0);
  // Отдельный флаг вместо чтения рефа в рендере: пока палец на экране,
  // движение обязано идти без анимации, иначе оно отстаёт от пальца.
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "PageDown") onChange(1);
      if (e.key === "ArrowUp" || e.key === "PageUp") onChange(0);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onChange]);

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    // Нажатия по кнопкам не должны начинать свайп.
    if ((e.target as HTMLElement).closest("button, a, input")) return;
    startY.current = e.clientY;
    startX.current = e.clientX;
    scroller.current = scrollableUnder(e.target as HTMLElement, e.currentTarget);
    owns.current = null;
    setDragging(true);
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragging) return;
    const dy = e.clientY - startY.current;
    const dx = e.clientX - startX.current;

    if (owns.current === null) {
      if (Math.abs(dy) < SLOP && Math.abs(dx) < SLOP) return;
      // Жест больше горизонтальный — не наш.
      if (Math.abs(dx) > Math.abs(dy)) {
        owns.current = false;
        return;
      }
      // Содержимое под пальцем ещё можно прокрутить в эту сторону — сначала
      // прокрутка, свайп только с самого края. Так виджеты, не влезшие
      // в экран, остаются доступными и не спорят с переходом.
      owns.current = !canScroll(scroller.current, dy);
      if (!owns.current) return;
      // Палец уже прошёл slop — не роняем эти пиксели, иначе экран дёргается.
      e.currentTarget.setPointerCapture?.(e.pointerId);
    }
    if (!owns.current) return;

    // Тянуть можно только туда, куда есть куда идти.
    const allowed = index === 0 ? Math.min(0, dy) : Math.max(0, dy);
    setDrag(allowed * RUBBER);
  }

  function onPointerUp() {
    if (!dragging) return;
    if (index === 0 && drag < -THRESHOLD * RUBBER) onChange(1);
    if (index === 1 && drag > THRESHOLD * RUBBER) onChange(0);
    owns.current = null;
    scroller.current = null;
    setDragging(false);
    setDrag(0);
  }

  const homeOffset = index === 0 ? `${drag}px` : "-100%";
  const skyOffset = index === 1 ? `${drag}px` : `calc(100% + ${drag}px)`;

  return (
    <div
      className="fixed inset-0 z-10 touch-pan-y overflow-hidden"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {/* Главный экран */}
      <div
        className="absolute inset-0"
        inert={index !== 0}
        style={{
          transform: `translate3d(0, ${homeOffset}, 0)`,
          opacity: index === 0 ? 1 : 0,
          transition: dragging ? "none" : `${EASE}, opacity 620ms ease`,
        }}
      >
        {home}
      </div>

      {/* Экран неба */}
      <div
        className="absolute inset-0"
        inert={index !== 1}
        style={{
          transform: `translate3d(0, ${skyOffset}, 0)`,
          transition: dragging ? "none" : EASE,
        }}
      >
        {sky}
      </div>
    </div>
  );
}

/** Ближайший прокручиваемый предок под точкой касания, не выше контейнера. */
function scrollableUnder(from: HTMLElement, stop: HTMLElement): HTMLElement | null {
  let el: HTMLElement | null = from;
  while (el && el !== stop.parentElement) {
    if (el.scrollHeight > el.clientHeight + 1) {
      const overflow = getComputedStyle(el).overflowY;
      if (overflow === "auto" || overflow === "scroll") return el;
    }
    el = el.parentElement;
  }
  return null;
}

/** Осталось ли куда прокручивать в сторону движения пальца. */
function canScroll(el: HTMLElement | null, dy: number): boolean {
  if (!el) return false;
  // Палец вверх (dy < 0) — содержимое едет к концу.
  if (dy < 0) return el.scrollTop + el.clientHeight < el.scrollHeight - 1;
  return el.scrollTop > 1;
}
