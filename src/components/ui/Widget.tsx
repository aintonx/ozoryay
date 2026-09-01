"use client";

import { useEffect, useRef, type ReactNode, type Ref } from "react";
import { useReducedMotion } from "@/lib/useReducedMotion";

/** Насколько сильно карточка может повернуться вслед за курсором. */
const TILT_MAX_DEG = 5;

/** То же самое, но для карточек с `depth` — им положено чуть больше веса. */
const TILT_MAX_DEG_DEEP = 6.5;

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n));
}

/**
 * Наклон стекла вслед за курсору — и блик, который скользит следом за ним.
 *
 * Всё состояние живёт в CSS-переменных прямо на узле (`--tilt-rx`,
 * `--tilt-ry`, `--mx`, `--my`, `--glow`; формулы, которые их используют, —
 * в `.tilt` в globals.css), а не в React: движению мыши не пристало вызывать
 * полсотни перерисовок в секунду ради эффекта, который к состоянию
 * приложения не имеет никакого отношения.
 *
 * Наклон появляется только там, где есть настоящая мышь (`hover: hover`
 * и `pointer: fine`) и где движение не отключено системной настройкой:
 * на тач-экране наклон нечем ловить, а лишнее вычисление на каждый кадр
 * прикосновения того не стоит. Переменные в этом случае просто никогда
 * не отходят от нуля — карточка остаётся плоской, но живой во всём
 * остальном (свет, зерно, тени уже заложены в саму `.glass`).
 */
function useTilt(active: boolean, intensity = 1) {
  const ref = useRef<HTMLElement | null>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!active || reducedMotion || !el) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    let frame = 0;

    const onMove = (e: PointerEvent) => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;
        const px = clamp01((e.clientX - rect.left) / rect.width);
        const py = clamp01((e.clientY - rect.top) / rect.height);
        const rx = (0.5 - py) * TILT_MAX_DEG * intensity;
        const ry = (px - 0.5) * TILT_MAX_DEG * intensity;
        el.style.setProperty("--tilt-rx", `${rx.toFixed(2)}deg`);
        el.style.setProperty("--tilt-ry", `${ry.toFixed(2)}deg`);
        el.style.setProperty("--mx", `${(px * 100).toFixed(1)}%`);
        el.style.setProperty("--my", `${(py * 100).toFixed(1)}%`);
        el.style.setProperty("--glow", "1");
      });
    };

    const onLeave = () => {
      if (frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
      el.style.setProperty("--tilt-rx", "0deg");
      el.style.setProperty("--tilt-ry", "0deg");
      el.style.setProperty("--glow", "0");
    };

    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
    };
  }, [active, reducedMotion, intensity]);

  return ref;
}

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
  /**
   * Карточка, которая значит больше остальных: чуть глубже тень, чуть
   * заметнее наклон. Не новый визуальный язык — тот же самый, на полтона
   * громче. Использовать точечно: если весомым станет всё, весомым
   * не окажется ничто.
   */
  depth?: boolean;
}

/**
 * Виджет — прямоугольная карточка со скруглением, в языке домашнего экрана
 * телефона: сверху мелкая шапка с иконкой, ниже — содержимое.
 *
 * Стекло берётся из общего класса `.glass`, поэтому все карточки на сайте
 * выглядят одним набором, а не собранием разных панелей. Поверх него —
 * `.tilt`: общая для всех виджетов формула наклона и блика (см. `useTilt`
 * выше и `.tilt` в globals.css).
 *
 * Иконка в шапке стоит в собственном кружке-бейдже, а не просто рядом
 * с текстом: так у всех карточек один и тот же якорь — верхний левый угол
 * бейджа, — и заголовки выравниваются между собой сами, каким бы ни было
 * содержимое ниже.
 */
export function Widget({ icon, title, children, className = "", href, depth = false }: WidgetProps) {
  const tiltRef = useTilt(true, depth ? TILT_MAX_DEG_DEEP / TILT_MAX_DEG : 1);

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

  // Наклон и нажатие делят одно и то же свойство `transform` — формула
  // обоих целиком живёт в `.tilt` (globals.css), поэтому здесь Tailwind-у
  // не остаётся управлять `transform` самому: `active:scale` тут больше
  // не нужен, о нажатии заботится `.tilt:active`.
  const classes = `glass tilt ${depth ? "glass-deep" : ""} flex flex-col rounded-[1.55rem] p-[1.05rem] ${className}`;

  if (href) {
    return (
      <a
        ref={tiltRef as Ref<HTMLAnchorElement>}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={classes}
      >
        {header}
        {children}
      </a>
    );
  }

  return (
    <div ref={tiltRef as Ref<HTMLDivElement>} className={classes}>
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
 *
 * `feature` — самый весомый формат (сейчас это вход в «Зону»), поэтому
 * ему достаётся `glass-deep` и чуть более заметный наклон, без отдельного
 * пропа: это следствие уже существующего смысла `layout`, а не новая ручка
 * управления.
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
  const tiltRef = useTilt(!disabled, layout === "feature" ? TILT_MAX_DEG_DEEP / TILT_MAX_DEG : 1);

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
      ref={tiltRef as Ref<HTMLButtonElement>}
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
      // Гаснет только содержимое. Наклон и нажатие («подача под пальцем»)
      // тоже здесь не прописаны Tailwind-ом — обе живут в `.tilt`
      // (globals.css) через одну и ту же формулу transform.
      className={`glass tilt ${layout === "feature" ? "glass-deep" : ""} group flex w-full rounded-[1.55rem] p-[1.05rem] disabled:pointer-events-none ${layoutClasses} ${className}`}
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
