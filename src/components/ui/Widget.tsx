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
    <div className="mb-[0.75rem] flex items-center gap-[0.45rem]">
      {icon && (
        <span className="flex h-[1.35rem] w-[1.35rem] shrink-0 items-center justify-center rounded-full bg-amber/14 text-[0.72rem] text-amber">
          {icon}
        </span>
      )}
      {title && (
        <span className="font-system text-[10.5px] font-semibold tracking-[0.05em] text-star/48">
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
      //
      // У плитки один и тот же порядок в потоке при любой ширине экрана:
      // бейдж, затем подпись, затем пояснение — сверху вниз, без переключения
      // на строку по брейкпоинту. Раньше на широком экране плитка становилась
      // строкой, а на телефоне — с текстом, прижатым к низу карточки через
      // `justify-between`; из-за этого у двух соседних плиток с текстом разной
      // длины бейджи и подписи оказывались на разной высоте. Теперь якорь
      // один — верхний край, — и все плитки растут вниз одинаково.
      //
      // Высота плитки — ЗАФИКСИРОВАНА (`h-`, не `min-h-`), и это не косметика:
      // `HomeScreen` меряет естественную высоту всей сетки через ResizeObserver
      // и подгоняет под неё масштаб. Если бы высота плитки зависела от того,
      // как перенеслась строка пояснения, — пересчитанная ширина могла бы
      // сама менять перенос строк, что меняет высоту, что снова меняет
      // ширину — и это заворачивается в бесконечный дребезг. `overflow-hidden`
      // на случай, если однажды подпись всё же станет длиннее отведённого.
      // 8.3rem — с запасом под бейдж, подпись и двухстрочное пояснение;
      // раньше было тесно (6.6rem), и вторая строка пояснения местами
      // подрезалась этим же `overflow-hidden`.
      className={`glass group flex w-full rounded-[1.55rem] p-[1.05rem] text-left transition-transform duration-300 active:scale-[0.985] disabled:pointer-events-none ${
        tile
          ? "h-[8.3rem] flex-col items-start gap-[0.75rem] overflow-hidden"
          : "items-center gap-[0.85rem]"
      } ${className}`}
    >
      <span
        className={`flex shrink-0 items-center justify-center rounded-full bg-amber/12 text-amber/90 transition-opacity duration-300 group-hover:bg-amber/18 group-disabled:opacity-40 ${
          tile ? "h-[2.3rem] w-[2.3rem] text-[1.15rem]" : "h-[2.1rem] w-[2.1rem] text-[1.05rem]"
        }`}
      >
        {icon}
      </span>
      <span
        className={`min-w-0 transition-opacity duration-300 group-disabled:opacity-45 ${tile ? "" : "flex-1"}`}
      >
        <span
          className={`font-system block leading-tight font-medium text-star/92 ${tile ? "text-[14px]" : "text-[13.5px]"}`}
        >
          {label}
        </span>
        {hint && (
          <span
            className={`font-system mt-[0.2em] block leading-snug text-star/42 ${tile ? "text-[11.5px]" : "text-[11px]"}`}
          >
            {hint}
          </span>
        )}
      </span>
    </button>
  );
}
