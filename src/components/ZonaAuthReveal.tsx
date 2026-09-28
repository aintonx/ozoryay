"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { useReducedMotion } from "@/lib/useReducedMotion";

interface ZonaAuthRevealProps {
  children: ReactNode;
  className?: string;
}

/** От первого кадра до полностью раскрытой карточки. */
const REVEAL_MS = 640;

/**
 * Насколько разгорание звезды опережает рост карточки — она должна
 * читаться как причина, а не как одновременная с окном вспышка.
 */
const IGNITE_LEAD_MS = 160;

/** Смыкание тьмы вокруг звезды и карточки — тот же темп, что и разгорание. */
const DIM_MS = 320;

/**
 * Насколько выше верхнего края карточки висит звезда. Верхний край сам
 * не постоянен (высота карточки зависит от содержимого) — отступ же
 * должен быть один и тот же всегда, поэтому число здесь, а не в разметке
 * звезды.
 */
const STAR_GAP_PX = 30;

/** Не даём звезде уехать выше безопасной зоны на низких экранах. */
const STAR_MIN_TOP_PX = 20;

/**
 * Карточка входа в «Зону» не проявляется — она выпадает из звезды.
 *
 * Раньше здесь работал `SpaceArrival` (прилёт из глубины космоса,
 * растворение размытия): он остаётся в кодовой базе нетронутым — вдруг
 * пригодится ещё для чего-то, — но в самой «Зоне» вместо него теперь
 * этот компонент. Просили пересобрать именно появление, ничего больше.
 *
 * Три вещи происходят почти одновременно, но не совсем:
 *  1. гаснет свет вокруг — не то же самое, что виньетка `LiftedSky`
 *     (та лишь притемняет края уже поднятого неба); здесь в тень уходит
 *     всё поле зрения, кроме тесного пятна вокруг звезды и будущей
 *     карточки;
 *  2. чуть выше будущей карточки загорается новая звезда — своя, не с
 *     канваса (см. комментарий у `.zona-star__halo` в globals.css: канвас
 *     не отдаёт наружу координаты одной конкретной звезды);
 *  3. и только после этого сама карточка растёт из точки под звездой —
 *     не проявляется, а буквально льётся вниз, потому что схлопнута она
 *     ровно в этой точке (`transform-origin: 50% 0%`), а не в своей
 *     середине.
 *
 * Рост — единственное, что движет карточкой. Непрозрачность на ней не
 * трогается ни на кадр: у стекла от этого пропадает размытие, и оно
 * возвращается рывком (см. `.glass` и `WidgetButton` в globals.css/
 * Widget.tsx — то же правило соблюдено там). Хвостик-капля (`.zona-tail`
 * в разметке `zona/page.tsx`) заверстан в тот же схлопывающийся узел, что
 * и карточка, поэтому растёт вместе с ней, одной фигурой, а не сам по
 * себе рядом.
 *
 * Верхний край карточки — величина не постоянная, поэтому звезда меряет
 * его через `ResizeObserver`, а не стоит на глазок подобранном отступе от
 * края экрана. Мерить можно на любом кадре роста, не только в конце:
 * якорь трансформации — верхний край, он не сдвигается, пока меняется
 * масштаб, поэтому координата верна и у схлопнутой, и у полной карточки.
 *
 * `prefers-reduced-motion`: без тьмы и без звезды — только сама карточка,
 * сразу на своём месте, без перехода. Смотреть на разгорающуюся звезду
 * несколько сотен миллисекунд — само по себе движение, которое просили
 * не показывать.
 */
export default function ZonaAuthReveal({ children, className = "" }: ZonaAuthRevealProps) {
  const reducedMotion = useReducedMotion();
  const [revealed, setRevealed] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [starTop, setStarTop] = useState<number | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setRevealed(true), 20);
    return () => window.clearTimeout(t);
  }, []);

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el || reducedMotion) return;

    const measure = () => {
      const top = el.getBoundingClientRect().top;
      setStarTop(Math.max(top - STAR_GAP_PX, STAR_MIN_TOP_PX));
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [reducedMotion]);

  return (
    <>
      {!reducedMotion && (
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 z-0"
          style={{
            background:
              "radial-gradient(60% 46% at 50% 46%, transparent 0%, transparent 32%, var(--color-night-deep) 82%)",
            opacity: revealed ? 1 : 0,
            transition: `opacity ${DIM_MS}ms var(--ease-emerge)`,
          }}
        />
      )}

      {!reducedMotion && starTop !== null && (
        <div
          aria-hidden
          className="pointer-events-none fixed z-10 -translate-x-1/2"
          style={{
            top: starTop,
            left: "50%",
            opacity: revealed ? 1 : 0,
            transition: `opacity ${DIM_MS}ms var(--ease-emerge)`,
          }}
        >
          <span className="zona-star__halo" />
          <span className="zona-star__core" />
        </div>
      )}

      <div
        ref={wrapRef}
        className={`relative z-20 ${className}`}
        style={{
          transformOrigin: "50% 0%",
          transform: reducedMotion ? "scale(1)" : revealed ? "scale(1)" : "scale(0.045)",
          transition: reducedMotion
            ? "none"
            : `transform ${REVEAL_MS}ms ${IGNITE_LEAD_MS}ms var(--ease-lift)`,
        }}
      >
        {children}
      </div>
    </>
  );
}
