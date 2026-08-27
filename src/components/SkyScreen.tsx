"use client";

import { WidgetButton } from "./ui/Widget";
import {
  IconBeam,
  IconChevronUp,
  IconDialog,
  IconLetter,
  IconSparkleStar,
} from "./ui/Icons";

export type SparkKind = "memory" | "dialog" | "letter" | "laugh";

interface SkyScreenProps {
  onSpark: (kind: SparkKind) => void;
  /** Подсказка после первой вспышки: можно ещё раз. */
  hint: string | null;
  /** Вернуться к виджетам. */
  onBack: () => void;
}

/**
 * Экран неба: кнопки внизу и всё остальное — небу.
 *
 * Пока что-то горит, весь этот экран уезжает вниз целиком (см. `Screens`) —
 * кнопки не должны спорить со светом. Здесь об этом заботиться не нужно.
 */
export default function SkyScreen({ onSpark, hint, onBack }: SkyScreenProps) {
  return (
    <div className="pointer-events-none flex h-full w-full flex-col px-[1.15rem] pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      {/* Дорога назад: тот же жест, что привёл сюда, только в другую сторону. */}
      <button
        type="button"
        onClick={(e) => {
          if (e.detail > 0) e.currentTarget.blur();
          onBack();
        }}
        className="font-system caption pointer-events-auto mx-auto flex items-center gap-[0.4em] text-[12px] font-medium tracking-[0.05em] text-star transition-opacity duration-300 hover:opacity-80"
      >
        <IconChevronUp size={13} className="rotate-180" />
        смахни вниз
      </button>

      <div className="flex-1" />

      {/* Подсказка — над кнопками, коротко и один раз. */}
      <div
        className="font-system caption mb-[0.8rem] text-center text-[11.5px] leading-snug text-amber/80 transition-opacity duration-500"
        style={{ opacity: hint ? 1 : 0 }}
      >
        {hint}
      </div>

      {/*
        На телефоне — одна колонка, на широком — три в ряд
        (четвёртая переносится на следующую строку).
      */}
      <div className="pointer-events-auto mx-auto grid w-full max-w-[26rem] grid-cols-1 gap-[0.7rem] sm:max-w-[49rem] sm:grid-cols-3">
        <WidgetButton
          icon={<IconSparkleStar />}
          label="Созвездие Вечного Смеха"
          hint="отправиться в путешествие"
          onClick={() => onSpark("laugh")}
        />
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
