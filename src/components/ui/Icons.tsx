/**
 * Иконки в системном духе: тонкий равномерный штрих, скруглённые концы,
 * одна оптическая сетка 24×24. Нарисованы здесь, а не взяты из системного
 * набора: SF Symbols нельзя переносить в веб по условиям Apple, но язык
 * форм — линия одной толщины и мягкие скругления — воспроизводим свободно.
 *
 * Цвет и размер наследуются от текста: иконка ведёт себя как буква.
 */

interface IconProps {
  className?: string;
  /** Размер в пикселях. По умолчанию наследует размер шрифта. */
  size?: number | string;
}

function base(size: IconProps["size"]) {
  return {
    width: size ?? "1em",
    height: size ?? "1em",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
}

/**
 * Поцелуй: губы. Единственная залитая иконка в наборе — контурные губы на
 * семнадцати пикселях читаются как чашка.
 *
 * Две доли с зазором по линии смыкания, а не один силуэт: цельная форма с
 * ложбинкой сверху на таком размере превращается в сердце, а сердец здесь
 * быть не должно. Зазор и ширина, вдвое больше высоты, не оставляют выбора
 * глазу — это губы.
 */
export function IconKiss({ className, size }: IconProps) {
  return (
    <svg {...base(size)} className={className} stroke="none" fill="currentColor">
      {/* Верхняя губа: два всхолмия и ложбинка ровно посередине. */}
      <path d="M3.4 12C4.2 7.6 8.4 6.2 12 9.6C15.6 6.2 19.8 7.6 20.6 12Z" />
      {/* Нижняя: одна широкая дуга, без острого низа. */}
      <path d="M3.4 13.1H20.6C19.4 17.4 16 19.6 12 19.6C8 19.6 4.6 17.4 3.4 13.1Z" />
    </svg>
  );
}

/** Звёзды: для кнопки перехода к небу. */
export function IconStars({ className, size }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M13.5 3.5l1.4 3.3 3.3 1.4-3.3 1.4-1.4 3.3-1.4-3.3L8.8 8.2l3.3-1.4 1.4-3.3z" />
      <path d="M6.4 13.4l.8 1.9 1.9.8-1.9.8-.8 1.9-.8-1.9-1.9-.8 1.9-.8.8-1.9z" />
      <path d="M17.8 15.2l.6 1.4 1.4.6-1.4.6-.6 1.4-.6-1.4-1.4-.6 1.4-.6.6-1.4z" />
    </svg>
  );
}

/** Луч света: «зажги воспоминание» — проектор светит в небо. */
export function IconBeam({ className, size }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M12 3.2v2.4M5.6 5.6l1.7 1.7M18.4 5.6l-1.7 1.7M3.2 12h2.4M18.4 12h2.4" />
      <circle cx="12" cy="12" r="3.4" />
      <path d="M9.6 14.4L5.8 20.8M14.4 14.4l3.8 6.4" />
    </svg>
  );
}

/** Реплика диалога: «зажги диалог». */
export function IconDialog({ className, size }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M20 12.4c0 3.6-3.6 6.5-8 6.5-.9 0-1.8-.1-2.6-.4L4.5 20l1.2-3.2C4.6 15.6 4 14.1 4 12.4 4 8.8 7.6 6 12 6s8 2.8 8 6.4z" />
    </svg>
  );
}

/** Конверт: «зажги послание». */
export function IconLetter({ className, size }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <rect x="3.2" y="5.8" width="17.6" height="12.4" rx="2.6" />
      <path d="M4.4 7.6l6.3 4.6c.8.6 1.8.6 2.6 0l6.3-4.6" />
    </svg>
  );
}

/** Стрелка вверх: подсказка о свайпе. */
export function IconChevronUp({ className, size }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M6.5 14.5L12 9l5.5 5.5" />
    </svg>
  );
}

/** Часы: заголовок виджета времени. */
export function IconClock({ className, size }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <circle cx="12" cy="12" r="8.4" />
      <path d="M12 7.4V12l3 1.8" />
    </svg>
  );
}

/** Точка на карте: заголовок виджета расстояния. */
export function IconPin({ className, size }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M12 21s6.4-5.6 6.4-10.2A6.4 6.4 0 0 0 5.6 10.8C5.6 15.4 12 21 12 21z" />
      <circle cx="12" cy="10.6" r="2.4" />
    </svg>
  );
}
