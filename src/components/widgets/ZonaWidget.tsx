"use client";

import { WidgetButton } from "../ui/Widget";
import { IconZona } from "../ui/Icons";

interface ZonaWidgetProps {
  /** Взгляд пошёл вверх, к «Зоне» — см. `ZonaLift` в `Night`. */
  onOpen: () => void;
  className?: string;
}

/**
 * Вход в «Зону» — разговор на случай, если однажды замолчит всё остальное.
 *
 * Раньше на этом месте стоял замок с запиской, что открывался сам, по
 * таймеру (см. историю `LockWidget` в гите). Теперь это кнопка того же
 * размера и с тем же центрированием, что было у прежней карточки —
 * `layout="feature"` в `WidgetButton` — крупная, не теряется в общем ряду.
 *
 * Мягкое кольцо света вокруг значка — та же вспышка, что у точки «я» на
 * карте расстояния (`gentle-pulse` в globals.css), только помедленнее и
 * вокруг иконки: тихая, необъяснимая подсказка, что эта плитка — не совсем
 * такая, как остальные.
 */
export default function ZonaWidget({ onOpen, className = "" }: ZonaWidgetProps) {
  return (
    <WidgetButton
      icon={
        <span className="relative flex h-full w-full items-center justify-center">
          <span
            aria-hidden
            className="absolute inset-0 animate-[gentle-pulse_2.6s_ease-out_infinite] rounded-full bg-amber/40"
          />
          <IconZona />
        </span>
      }
      label="Зона"
      hint="то, что останется всегда"
      onClick={onOpen}
      layout="feature"
      className={className}
    />
  );
}
