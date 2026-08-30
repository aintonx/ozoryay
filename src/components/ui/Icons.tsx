import { EMOJI_FONT, KISS } from "@/lib/emoji";

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
  style?: React.CSSProperties;
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
 * Поцелуй — системный эмодзи 💋, а не рисунок.
 *
 * Рисованный отпечаток на таком размере не читался: свою форму губ узнать
 * можно только зная, что ищешь. Системный глиф узнаётся мгновенно на любом
 * устройстве и одинаково выглядит и здесь, и в небе, где летит комета
 * (см. `drawKissMark`). Это единственное цветное пятно на сайте — и оно
 * ровно там, где нужен человеческий жест.
 */
export function IconKiss({ className, size }: IconProps) {
  return (
    <span
      className={className}
      style={{
        fontSize: typeof size === "number" ? `${size}px` : (size ?? "1em"),
        lineHeight: 1,
        fontFamily: EMOJI_FONT,
      }}
      aria-hidden="true"
    >
      {KISS}
    </span>
  );
}

/** Стрелка вперёд: «покажи следующее». */
export function IconNext({ className, size }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M4.6 12h13.4M13.2 7l5 5-5 5" />
    </svg>
  );
}

/**
 * Геометка: та самая капля с отверстием, какой города отмечают на картах.
 * Заливка, а не контур: на концах пунктирной дуги контурная метка теряется,
 * а точка вообще ничего не значит.
 */
export function IconMarker({ className, size, style }: IconProps) {
  return (
    <svg {...base(size)} className={className} style={style} stroke="none" fill="currentColor">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2.4c-3.9 0-7 3.1-7 7 0 4.9 5.5 10.9 6.3 11.7.4.4 1 .4 1.4 0 .8-.8 6.3-6.8 6.3-11.7 0-3.9-3.1-7-7-7zm0 9.6a2.6 2.6 0 1 1 0-5.2 2.6 2.6 0 0 1 0 5.2z"
      />
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

/** Замок: закрытое продолжение истории. */
export function IconLock({ className, size }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <rect x="5.2" y="10.2" width="13.6" height="9.2" rx="2.4" />
      <path d="M8.2 10.2V8a3.8 3.8 0 0 1 7.6 0v2.2" />
      <path d="M12 14v2" />
    </svg>
  );
}

/** Луч света: «зажги воспоминание» — проектор светит в небо. */
/**
 * Зона: свой маленький замкнутый мир со своим светом внутри. Один контур
 * и одна звезда — ничего похожего на решётку или ограду: это не про то,
 * что закрыто снаружи, а про то, что горит внутри, что бы ни случилось
 * со всем остальным небом.
 */
export function IconZona({ className, size }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <circle cx="12" cy="12" r="7.6" />
      <path d="M12 9l.8 1.9 1.9.8-1.9.8-.8 1.9-.8-1.9-1.9-.8 1.9-.8.8-1.9z" />
    </svg>
  );
}
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

/** Люди: заголовок виджета подписчиков. Двое, второй чуть позади. */
export function IconPeople({ className, size }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <circle cx="10" cy="8.4" r="3.4" />
      <path d="M3.8 19.4c0-3.1 2.8-5.2 6.2-5.2s6.2 2.1 6.2 5.2" />
      <path d="M16.4 5.6a3.4 3.4 0 0 1 0 5.6" />
      <path d="M18.2 14.8c1.4.8 2.3 2 2.3 3.6" />
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

/** Точка на карте: заголовок виджета расстояния. Контурная — это шапка. */
export function IconPin({ className, size }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M12 21s6.4-5.6 6.4-10.2A6.4 6.4 0 0 0 5.6 10.8C5.6 15.4 12 21 12 21z" />
      <circle cx="12" cy="10.6" r="2.4" />
    </svg>
  );
}

/**
 * Одна яркая звезда — не россыпь, а именно она: та самая цель полёта
 * к «Созвездию Вечного Смеха». Залита, не обведена — тонкие лучи
 * сверкающей звезды на контуре теряются точно так же, как носик капли
 * у `IconMarker` при том же размере, поэтому тут та же заливка.
 */
export function IconSparkleStar({ className, size }: IconProps) {
  return (
    <svg {...base(size)} className={className} stroke="none" fill="currentColor">
      <path d="M12 3.5L14.5 9.5L20.5 12L14.5 14.5L12 20.5L9.5 14.5L3.5 12L9.5 9.5Z" />
    </svg>
  );
}

/**
 * Динамик — звук включён. Тот же язык, что и у остальных: только контур.
 * Используется в путешествии к созвездию, а не системный эмодзи 🔊 — сайт
 * нигде больше эмодзи не показывает, кроме поцелуя (см. `IconKiss`), и
 * заводить второе исключение ради кнопки звука не стоило.
 */
export function IconSpeaker({ className, size }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M4.4 9.6h3.2l5-4v12.8l-5-4H4.4z" />
      <path d="M15.6 9.2a3.4 3.4 0 0 1 0 5.6" />
      <path d="M18.2 6.8a7.2 7.2 0 0 1 0 10.4" />
    </svg>
  );
}

/** Динамик — звук выключен: тот же корпус, зачёркнут одной линией. */
export function IconSpeakerOff({ className, size }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M4.4 9.6h3.2l5-4v12.8l-5-4H4.4z" />
      <path d="M15.4 9.4l4.4 5.2M19.8 9.4l-4.4 5.2" />
    </svg>
  );
}
