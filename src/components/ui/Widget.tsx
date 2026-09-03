"use client";

import { useEffect, useRef, type ReactNode, type Ref } from "react";
import { useReducedMotion } from "@/lib/useReducedMotion";

/** Насколько сильно карточка может повернуться вслед за курсором. */
export const TILT_MAX_DEG = 5;

/** То же самое, но для карточек с `depth` — им положено чуть больше веса. */
export const TILT_MAX_DEG_DEEP = 6.5;

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
 *
 * Нажатие — отдельным, всегда включённым эффектом ниже, а не через
 * псевдокласс `:active`: на iOS Safari он либо не успевает сработать на
 * быстром тапе, либо снимается рывком, без перехода, — то самое «резко
 * и рвано». Тот же Pointer Events API, что уже водит наклон и свайп между
 * экранами (`Screens`), просто переключает класс `.is-pressed`, а вход
 * и выход из него — уже с разным, каждый свой плавным переходом — задаёт
 * `.tilt`/`.tilt.is-pressed` в globals.css.
 */
export function useTilt(active: boolean, intensity = 1) {
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

  useEffect(() => {
    const el = ref.current;
    if (!active || !el) return;

    const press = () => el.classList.add("is-pressed");
    const release = () => el.classList.remove("is-pressed");

    el.addEventListener("pointerdown", press);
    el.addEventListener("pointerup", release);
    el.addEventListener("pointercancel", release);
    el.addEventListener("pointerleave", release);
    return () => {
      el.removeEventListener("pointerdown", press);
      el.removeEventListener("pointerup", release);
      el.removeEventListener("pointercancel", release);
      el.removeEventListener("pointerleave", release);
    };
  }, [active]);

  return ref;
}

interface WidgetProps {
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
 * телефона.
 *
 * Без значка в шапке: карточка называет себя одним словом («БЕЗ ТЕБЯ»,
 * «МЕЖДУ НАМИ»), тёплым и достаточно крупным, чтобы читаться само собой,
 * без пиктограммы рядом как костыля. Идентичность виджета несёт не значок,
 * а то, что на нём написано, и то, как это набрано.
 *
 * Стекло берётся из общего класса `.glass`, поэтому все карточки на сайте
 * выглядят одним набором. Поверх него — `.tilt`: общая для всех виджетов
 * формула наклона и блика (см. `useTilt` выше и `.tilt` в globals.css).
 */
export function Widget({ title, children, className = "", href, depth = false }: WidgetProps) {
  const tiltRef = useTilt(true, depth ? TILT_MAX_DEG_DEEP / TILT_MAX_DEG : 1);

  const header = title && (
    <div className="mb-[0.6rem] font-system text-[13px] font-semibold tracking-[0.04em] text-amber/85">
      {title}
    </div>
  );

  // Наклон и нажатие делят одно и то же свойство `transform`/`scale` —
  // формула обоих целиком живёт в `.tilt`/`.tilt.is-pressed` (globals.css),
  // а переключает класс уже сам `useTilt` выше — Tailwind-у здесь не
  // остаётся управлять ни тем, ни другим самому.
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
  label: string;
  /** Вторая строка — что случится по нажатию. */
  hint?: string;
  onClick: () => void;
  disabled?: boolean;
  /**
   * Графический акцент вместо иконки — необязательный, произвольной формы.
   * Не бейдж с пиктограммой внутри: свободная фигура (свечение, россыпь
   * точек, что угодно нефигуративное), которая говорит о смысле кнопки
   * настроением, а не символом-подписью к самой себе.
   */
  accent?: ReactNode;
  /**
   * `row` — широкая карточка, акцент слева от текста.
   * `tile` — маленький квадратный виджет: акцент сверху, подпись внизу.
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
  label,
  hint,
  onClick,
  disabled = false,
  accent,
  layout = "row",
  className = "",
}: WidgetButtonProps) {
  const tiltRef = useTilt(!disabled);

  // Высота, выравнивание и центрирование текста — по формату. Высота
  // `tile` ЗАФИКСИРОВАНА (не `min-h-`): `HomeScreen` меряет естественную
  // высоту сетки через ResizeObserver и подгоняет под неё масштаб, а
  // плавающая высота заворачивается в бесконечный дребезг при переносе
  // строк.
  const layoutClasses =
    layout === "tile"
      ? "h-[9.6rem] flex-col items-start gap-[0.85rem] overflow-hidden text-left"
      : "items-center gap-[0.9rem] text-left";

  const accentWrapClasses = layout === "tile" ? "h-[2.6rem] w-[2.6rem]" : "h-[2.4rem] w-[2.4rem] shrink-0";
  const labelClasses = layout === "tile" ? "text-[17px]" : "text-[16px]";
  const hintClasses = "text-[13.5px]";
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
      // тоже здесь не прописаны Tailwind-ом — обе живут в `.tilt`/
      // `.tilt.is-pressed` (globals.css), в `useTilt` выше.
      className={`glass tilt group flex w-full rounded-[1.55rem] p-[1.05rem] disabled:pointer-events-none ${layoutClasses} ${className}`}
    >
      {accent && (
        <span className={`relative flex shrink-0 items-center justify-center transition-opacity duration-300 group-disabled:opacity-40 ${accentWrapClasses}`}>
          {accent}
        </span>
      )}
      <span className={`min-w-0 transition-opacity duration-300 group-disabled:opacity-45 ${textWrapClasses}`}>
        <span className={`font-system block leading-tight font-semibold text-star/96 ${labelClasses}`}>
          {label}
        </span>
        {hint && (
          <span className={`font-system mt-[0.28em] block leading-snug text-star/60 ${hintClasses}`}>
            {hint}
          </span>
        )}
      </span>
    </button>
  );
}
