"use client";

import { useRef, useState } from "react";
import { IconNext } from "./ui/Icons";

interface ContentOverlayProps {
  /** Показан ли сейчас какой-то контент. */
  open: boolean;
  /** Закрыть — по свайпу в любую сторону. */
  onDismiss: () => void;
  /** Показать следующее, не закрывая текущее. */
  onNext: () => void;
  /** Что написать на кнопке: у фотографий и у слов это разные вещи. */
  nextLabel: string;
}

/** Пикселей пальцем, после которых это точно свайп, а не дрожь руки. */
const SWIPE = 44;

/**
 * Слой поверх зажжённого контента: закрыть и перейти к следующему.
 *
 * Ждать, пока текст догорит, не должно приходиться: любой свайп по экрану
 * закрывает вспышку сразу. А кнопка рядом даёт следующее, не заставляя
 * сначала закрыть текущее и снова искать ту же кнопку внизу.
 *
 * Ловит жесты на всю площадь, но ничего не рисует поверх текста — только
 * узкая полоса управления внизу.
 */
export default function ContentOverlay({
  open,
  onDismiss,
  onNext,
  nextLabel,
}: ContentOverlayProps) {
  const start = useRef<{ x: number; y: number } | null>(null);
  const [held, setHeld] = useState(false);

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest("button")) return;
    start.current = { x: e.clientX, y: e.clientY };
    setHeld(true);
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const s = start.current;
    if (!s) return;
    if (Math.hypot(e.clientX - s.x, e.clientY - s.y) > SWIPE) {
      start.current = null;
      setHeld(false);
      onDismiss();
    }
  }

  function end() {
    start.current = null;
    setHeld(false);
  }

  return (
    <div
      className="fixed inset-0 z-40"
      style={{ touchAction: "none", pointerEvents: open ? "auto" : "none" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={end}
      onPointerCancel={end}
    >
      {/* Полоса управления. Уезжает вниз за край, а не гаснет: внутри стекло. */}
      <div
        className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-[0.6rem] px-[1.15rem] pb-[max(1.5rem,env(safe-area-inset-bottom))]"
        style={{
          transform: open ? "translate3d(0,0,0)" : "translate3d(0, 120%, 0)",
          transition: "transform 520ms cubic-bezier(0.32, 0.72, 0, 1)",
        }}
      >
        <button
          type="button"
          onClick={(e) => {
            if (e.detail > 0) e.currentTarget.blur();
            onNext();
          }}
          className="glass font-system flex items-center gap-[0.5em] rounded-full py-[0.7rem] pr-[1.25rem] pl-[1.05rem] text-[13px] font-medium text-star/90 transition-transform duration-300 active:scale-[0.97]"
        >
          <IconNext size={16} className="text-amber/90" />
          {nextLabel}
        </button>

        <span
          className="font-system caption text-[10.5px] tracking-[0.05em] text-star/40 transition-opacity duration-300"
          style={{ opacity: held ? 0.15 : 1 }}
        >
          смахни, чтобы закрыть
        </span>
      </div>
    </div>
  );
}
