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
  /**
   * Убрать интерфейс с глаз: он уезжает вниз за край экрана.
   *
   * Нужен на время вступления, поцелуя и любой вспышки — всего, ради чего
   * стоит смотреть на небо, а не на кнопки. Именно движением, а не
   * прозрачностью: у стекла внутри от прозрачности пропадает размытие.
   */
  hidden?: boolean;
}

/** Пикселей пальцем, после которых свайп считается намеренным. */
const THRESHOLD = 52;
/** Сопротивление: экран идёт за пальцем медленнее пальца, как у резинки. */
const RUBBER = 0.42;
/** Пока жест короче этого, не решаем, наш он или чужой. */
const SLOP = 5;

const EASE = "transform 620ms cubic-bezier(0.32, 0.72, 0, 1)";

/**
 * Два экрана над одним небом.
 *
 * Небо остаётся на месте — уезжает только интерфейс: виджеты уходят вверх,
 * открывая то, что за ними. Так переход читается не как смена страницы,
 * а как «поднять глаза».
 *
 * Жесты слушаются здесь целиком: у контейнера `touch-action: none`, поэтому
 * браузер не пытается прокрутить страницу вместо нас и не отбирает касание
 * на середине движения. Ради этого содержимое экранов обязано помещаться
 * в экран — прокручивать внутри нечего.
 */
export default function Screens({ home, sky, index, onChange, hidden = false }: ScreensProps) {
  const startY = useRef(0);
  const startX = useRef(0);
  /** null — ещё не решили; true — свайп наш; false — жест не вертикальный. */
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
    if (hidden) return;
    // Нажатия по кнопкам не должны начинать свайп.
    if ((e.target as HTMLElement).closest("button, a, input")) return;
    startY.current = e.clientY;
    startX.current = e.clientX;
    owns.current = null;
    setDragging(true);
    // Захват — чтобы палец, ушедший за пределы элемента, не обрывал жест.
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragging) return;
    const dy = e.clientY - startY.current;
    const dx = e.clientX - startX.current;

    if (owns.current === null) {
      if (Math.abs(dy) < SLOP && Math.abs(dx) < SLOP) return;
      owns.current = Math.abs(dy) > Math.abs(dx);
      if (!owns.current) return;
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
    setDragging(false);
    setDrag(0);
  }

  const homeOffset = index === 0 ? `${drag}px` : "-100%";
  const skyOffset = index === 1 ? `${drag}px` : `calc(100% + ${drag}px)`;

  return (
    <div
      className="fixed inset-0 z-10 overflow-hidden"
      style={{
        touchAction: "none",
        transform: hidden ? "translate3d(0, 100%, 0)" : "translate3d(0, 0, 0)",
        transition: EASE,
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {/* Главный экран */}
      <div
        className="absolute inset-0"
        inert={index !== 0 || hidden}
        style={{
          transform: `translate3d(0, ${homeOffset}, 0)`,
          transition: dragging ? "none" : EASE,
        }}
      >
        {home}
      </div>

      {/* Экран неба */}
      <div
        className="absolute inset-0"
        inert={index !== 1 || hidden}
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
