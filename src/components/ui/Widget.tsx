"use client";

import type { ReactNode } from "react";

interface WidgetProps {
  /** Иконка в шапке — как у системных виджетов. */
  icon?: ReactNode;
  /** Короткая шапка: одно-два слова. */
  title?: string;
  children: ReactNode;
  className?: string;
  /**
   * Если задан — вся карточка становится ссылкой (новая вкладка).
   * Нужен, когда виджет ведёт куда-то за пределы сайта, например в профиль.
   */
  href?: string;
}

/**
 * Виджет — прямоугольная карточка со скруглением, в языке домашнего экрана
 * телефона: сверху мелкая шапка с иконкой, ниже — содержимое.
 *
 * Стекло берётся из общего класса `.glass`, поэтому все карточки на сайте
 * выглядят одним набором, а не собранием разных панелей.
 *
 * Иконка в шапке стоит в собственном кружке-бейдже, а не просто рядом
 * с текстом: так у всех карточек один и тот же якорь — верхний левый угол
 * бейджа, — и заголовки выравниваются между собой сами, каким бы ни было
 * содержимое ниже.
 */
export function Widget({ icon, title, children, className = "", href }: WidgetProps) {
  const header = (icon || title) && (
    <div className="mb-[0.75rem] flex items-center gap-[0.5rem]">
      {icon && (
        <span className="flex h-[1.5rem] w-[1.5rem] shrink-0 items-center justify-center rounded-full bg-amber/14 text-[0.8rem] text-amber">
          {icon}
        </span>
      )}
      {title && (
        <span className="font-system text-[11.5px] font-semibold tracking-[0.05em] text-star/54">
          {title}
        </span>
      )}
    </div>
  );

  const classes = `glass flex flex-col rounded-[1.55rem] p-[1.05rem] ${
    href ? "transition-transform duration-300 active:scale-[0.985]" : ""
  } ${className}`;

  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={classes}>
        {header}
        {children}
      </a>
    );
  }

  return (
    <div className={classes}>
      {header}
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
   * `feature` — крупная карточка с центрированием: бейдж, подпись и
   * пояснение друг под другом посередине, как раньше стояла запись
   * в `LockWidget` — для входа, который того стоит и не должен теряться
   * в общем ряду.
   */
  layout?: "row" | "tile" | "feature";
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
  // Высота, выравнивание и центрирование текста — по формату. У `tile`
  // высота ЗАФИКСИРОВАНА (не `min-h-`) по той же причине, что и раньше:
  // `HomeScreen` меряет естественную высоту сетки через ResizeObserver
  // и подгоняет под неё масштаб, а плавающая высота заворачивается
  // в бесконечный дребезг при переносе строк. У `feature` высота тоже
  // фиксирована — 11rem, ровно как у прежнего `LockWidget`, чтобы карточка
  // входа не потерялась среди соседних плиток размером.
  const layoutClasses =
    layout === "tile"
      ? "h-[8.8rem] flex-col items-start gap-[0.75rem] overflow-hidden text-left"
      : layout === "feature"
        ? "h-[11rem] flex-col items-center justify-center gap-[0.55rem] overflow-hidden text-center"
        : "items-center gap-[0.85rem] text-left";

  const badgeClasses =
    layout === "tile"
      ? "h-[2.4rem] w-[2.4rem] text-[1.2rem]"
      : layout === "feature"
        ? "h-[2.9rem] w-[2.9rem] text-[1.3rem]"
        : "h-[2.15rem] w-[2.15rem] text-[1.08rem]";

  const labelClasses = layout === "feature" ? "text-[16px]" : layout === "tile" ? "text-[15px]" : "text-[14.5px]";
  const hintClasses = layout === "row" ? "text-[12px]" : "text-[12.5px]";
  const textWrapClasses = layout === "row" ? "flex-1" : "";

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
      className={`glass group flex w-full rounded-[1.55rem] p-[1.05rem] transition-transform duration-300 active:scale-[0.985] disabled:pointer-events-none ${layoutClasses} ${className}`}
    >
      <span
        className={`flex shrink-0 items-center justify-center rounded-full bg-amber/12 text-amber/90 transition-opacity duration-300 group-hover:bg-amber/18 group-disabled:opacity-40 ${badgeClasses}`}
      >
        {icon}
      </span>
      <span
        className={`min-w-0 transition-opacity duration-300 group-disabled:opacity-45 ${textWrapClasses}`}
      >
        <span className={`font-system block leading-tight font-semibold text-star/94 ${labelClasses}`}>
          {label}
        </span>
        {hint && (
          <span className={`font-system mt-[0.22em] block leading-snug text-star/54 ${hintClasses}`}>
            {hint}
          </span>
        )}
      </span>
    </button>
  );
}
