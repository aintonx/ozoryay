"use client";

import { WidgetButton } from "./ui/Widget";
import { IconBeam, IconChevronUp, IconDialog, IconLetter } from "./ui/Icons";

export type SparkKind = "memory" | "dialog" | "letter";

interface SkyScreenProps {
  onSpark: (kind: SparkKind) => void;
  /** Что-то уже горит в небе — кнопки уходят, чтобы не мешать смотреть. */
  busy: boolean;
  /** Подсказка после первой вспышки: можно ещё раз. */
  hint: string | null;
  /** Вернуться к виджетам. */
  onBack: () => void;
}

/**
 * Экран неба: три кнопки внизу и всё остальное — небу.
 *
 * Пока что-то горит, кнопки уходят целиком: они не должны спорить со светом
 * и перекрывать то, ради чего всё затевалось.
 */
export default function SkyScreen({ onSpark, busy, hint, onBack }: SkyScreenProps) {
  return (
    <div className="pointer-events-none flex h-full w-full flex-col px-[1.15rem] pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      {/* Дорога назад: тот же жест, что привёл сюда, только в другую сторону. */}
      <button
        type="button"
        onClick={(e) => {
          if (e.detail > 0) e.currentTarget.blur();
          onBack();
        }}
        className="font-system pointer-events-auto mx-auto flex items-center gap-[0.35em] text-[10.5px] tracking-[0.06em] text-star/28 transition-opacity duration-500 hover:text-star/50"
        style={{ opacity: busy ? 0 : 1 }}
      >
        <IconChevronUp size={13} className="rotate-180" />
        смахни вниз
      </button>

      <div className="flex-1" />

      {/* Подсказка — над кнопками, коротко и один раз. */}
      <div
        className="font-system mb-[0.8rem] text-center text-[11.5px] leading-snug text-amber/70 transition-opacity duration-500"
        style={{ opacity: hint && !busy ? 1 : 0 }}
      >
        {hint}
      </div>

      <div
        className="pointer-events-auto mx-auto grid w-full max-w-[26rem] gap-[0.7rem] transition-all duration-500 sm:max-w-[49rem] sm:grid-cols-3"
        style={{
          opacity: busy ? 0 : 1,
          transform: busy ? "translateY(14px)" : "none",
          pointerEvents: busy ? "none" : "auto",
        }}
      >
        <WidgetButton
          icon={<IconBeam />}
          label="Зажги воспоминание"
          hint="луч из домика на холме"
          onClick={() => onSpark("memory")}
        />
        <WidgetButton
          icon={<IconDialog />}
          label="Зажги диалог"
          hint="то, что мы правда сказали"
          onClick={() => onSpark("dialog")}
        />
        <WidgetButton
          icon={<IconLetter />}
          label="Зажги послание"
          hint="моё письмо тебе"
          onClick={() => onSpark("letter")}
        />
      </div>
    </div>
  );
}
