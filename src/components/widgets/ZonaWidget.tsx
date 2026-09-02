"use client";

import { useTilt, TILT_MAX_DEG_DEEP, TILT_MAX_DEG } from "../ui/Widget";
import type { Ref } from "react";

interface ZonaWidgetProps {
  /** Взгляд пошёл вверх, к «Зоне» — см. `ZonaLift` в `Night`. */
  onOpen: () => void;
  className?: string;
}

/**
 * Вход в «Зону» — разговор на случай, если однажды замолчит всё остальное.
 *
 * Раньше это была плитка со значком и подписью «то, что останется
 * всегда» — красиво, но непонятно, что вообще нажимать. Теперь карточка
 * сама выглядит как открытое поле ввода: курсор мигает, приглашение
 * написано от первого лица, а под чертой — не пример переписки, а то,
 * что «Зона» такое: место, которое остаётся нашим, что бы ни случилось
 * со всем остальным (тот же образ, что раньше нёс на себе один только
 * значок, — здесь он стал словами).
 *
 * Своя вёрстка, не через `WidgetButton`: у формата «поле ввода» нет
 * ничего общего с «бейдж + подпись + пояснение» — общие остаются только
 * стекло, наклон и глубина (`glass`, `glass-deep`, `tilt` — те же классы,
 * что и у остальных карточек сайта), взятые напрямую, а не через обёртку.
 */
export default function ZonaWidget({ onOpen, className = "" }: ZonaWidgetProps) {
  const tiltRef = useTilt(true, TILT_MAX_DEG_DEEP / TILT_MAX_DEG);

  return (
    <button
      ref={tiltRef as Ref<HTMLButtonElement>}
      type="button"
      onClick={(e) => {
        if (e.detail > 0) e.currentTarget.blur();
        onOpen();
      }}
      className={`glass glass-deep tilt flex min-h-[11.5rem] w-full flex-col rounded-[1.55rem] p-[1.05rem] text-left ${className}`}
    >
      <div className="mb-[0.6rem] font-system text-[13px] font-semibold tracking-[0.04em] text-amber/85">
        Зона
      </div>

      <div className="flex flex-1 items-center">
        <span className="font-system text-[17px] text-star/42">
          что у тебя на уме?
          <span
            aria-hidden="true"
            className="ml-[2px] inline-block w-[2px] translate-y-[2px] animate-[blink_1s_steps(1)_infinite] bg-amber-hot align-middle"
            style={{ height: "1.15em" }}
          />
        </span>
      </div>

      <div className="flex items-center justify-between gap-[0.7rem] border-t border-white/[0.08] pt-[0.65rem]">
        <span className="font-system min-w-0 truncate text-[12px] text-star/44">
          только наше, что бы ни случилось со всем остальным небом
        </span>
        <span className="flex h-[1.9rem] w-[1.9rem] shrink-0 items-center justify-center rounded-full bg-amber/16 text-amber-hot">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4.6 12h13.4M13.2 7l5 5-5 5" />
          </svg>
        </span>
      </div>
    </button>
  );
}
