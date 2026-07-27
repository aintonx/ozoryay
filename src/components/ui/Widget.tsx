"use client";

import type { ReactNode } from "react";

interface WidgetProps {
  /** Иконка в шапке — как у системных виджетов. */
  icon?: ReactNode;
  /** Короткая шапка: одно-два слова. */
  title?: string;
  children: ReactNode;
  className?: string;
}

/**
 * Виджет — прямоугольная карточка со скруглением, в языке домашнего экрана
 * телефона: сверху мелкая шапка с иконкой, ниже — содержимое.
 *
 * Стекло берётся из общего класса `.glass`, поэтому все карточки на сайте
 * выглядят одним набором, а не собранием разных панелей.
 */
export function Widget({ icon, title, children, className = "" }: WidgetProps) {
  return (
    <div className={`glass flex flex-col rounded-[1.55rem] p-[1.05rem] ${className}`}>
      {(icon || title) && (
        <div className="font-system mb-[0.7rem] flex items-center gap-[0.4em] text-[11px] font-medium tracking-[0.02em] text-star/45">
          {icon}
          {title}
        </div>
      )}
      {children}
    </div>
  );
}

interface WidgetButtonProps {
  icon: ReactNode;
  label: string;
  /** Вторая строка — что случится по нажатию. */
  hint?: string;
  onClick: () => void;
  disabled?: boolean;
  /**
   * `row` — широкая карточка, иконка слева от текста.
   * `tile` — маленький квадратный виджет: иконка сверху, подпись внизу.
   * Ровно два формата домашнего экрана телефона, третьего там нет.
   */
  layout?: "row" | "tile";
  className?: string;
}

/**
 * Виджет-кнопка. Тот же корпус, но нажимается: чуть подаётся под пальцем
 * и подсвечивается. Зона нажатия — вся карточка, поэтому в неё легко
 * попасть большим пальцем на ходу.
 */
export function WidgetButton({
  icon,
  label,
  hint,
  onClick,
  disabled = false,
  layout = "row",
  className = "",
}: WidgetButtonProps) {
  const tile = layout === "tile";
  return (
    <button
      type="button"
      onClick={(e) => {
        // После касания снимаем фокус: иначе на карточке остаётся кольцо,
        // которое здесь читается как рамка интерфейса.
        if (e.detail > 0) e.currentTarget.blur();
        onClick();
      }}
      disabled={disabled}
      // Прозрачность самой карточки не трогаем ни при каком состоянии:
      // у стекла от неё пропадает размытие и оно возвращается рывком.
      // Гаснет только содержимое.
      className={`glass group flex w-full rounded-[1.55rem] p-[1.05rem] text-left transition-transform duration-300 active:scale-[0.985] disabled:pointer-events-none ${
        tile
          ? // Плитка — формат телефона. На широком экране места хватает, и она
            // разворачивается в ту же строку, что и все остальные карточки.
            "min-h-[6.6rem] flex-col justify-between gap-[0.8rem] sm:min-h-0 sm:flex-row sm:items-center sm:gap-[0.85rem]"
          : "items-center gap-[0.85rem]"
      } ${className}`}
    >
      <span className="flex h-[2.1rem] w-[2.1rem] shrink-0 items-center justify-center rounded-full bg-amber/12 text-[1.05rem] text-amber/90 transition-opacity duration-300 group-hover:bg-amber/18 group-disabled:opacity-40">
        {icon}
      </span>
      <span
        className={`transition-opacity duration-300 group-disabled:opacity-45 ${
          tile ? "block sm:min-w-0 sm:flex-1" : "min-w-0 flex-1"
        }`}
      >
        <span className="font-system block text-[13.5px] leading-tight font-medium text-star/92">
          {label}
        </span>
        {hint && (
          <span className="font-system mt-[0.15em] block text-[11px] leading-snug text-star/42">
            {hint}
          </span>
        )}
      </span>
    </button>
  );
}
