"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useReducedMotion } from "@/lib/useReducedMotion";

interface ZonaAuthRevealProps {
  children: ReactNode;
  className?: string;
}

/** От первого кадра до полностью раскрытой карточки. */
const REVEAL_MS = 640;

/** Смыкание тьмы вокруг звезды и карточки. */
const DIM_MS = 320;

/**
 * Карточка входа в «Зону» не проявляется — она выпадает из звезды.
 *
 * Раньше здесь работал `SpaceArrival` (прилёт из глубины космоса,
 * растворение размытия): он остаётся в кодовой базе нетронутым — вдруг
 * пригодится ещё для чего-то, — но в самой «Зоне» вместо него теперь этот
 * компонент.
 *
 * Сама звезда, из которой всё растёт, здесь не рисуется: она — часть
 * настоящего неба (`LAYOUT.zonaStar` в `lib/sky/layout.ts`, отрисовка —
 * `drawZonaStar` в `renderer.ts`), горит всегда, ещё до первого нажатия,
 * и просто становится ярче ровно в этот момент через `zonaStarBoost`
 * (см. `zona/page.tsx`). Раньше она была отдельным DOM-узлом, который
 * зажигался из ничего и которому приходилось на глаз мерить положение
 * карточки, чтобы встать точно над ней, — то есть ровно то, от чего
 * просили отказаться: звезда обязана быть настоящей, а не нарисованной
 * специально под этот момент.
 *
 * Здесь остаются только две вещи:
 *  1. гаснет свет вокруг — не то же самое, что виньетка `LiftedSky` (та
 *     лишь притемняет края уже поднятого неба); здесь в тень уходит
 *     всё поле зрения, кроме тесного пятна у центра, где и звезда, и
 *     будущая карточка;
 *  2. сама карточка растёт из точки чуть выше своего верхнего края —
 *     не проявляется, а буквально льётся вниз, потому что схлопнута она
 *     ровно в этой точке (`transform-origin: 50% 0%`), а не в своей
 *     середине. Хвостик — часть самой карточки (`.glass.zona-window`
 *     в globals.css, единый `clip-path`), поэтому растёт одной фигурой,
 *     а не сам по себе рядом.
 *
 * Рост — единственное, что движет карточкой. Непрозрачность на ней не
 * трогается ни на кадр: у стекла от этого пропадает размытие, и оно
 * возвращается рывком (см. `.glass` в globals.css).
 *
 * `prefers-reduced-motion`: без тьмы — только сама карточка, сразу на
 * своём месте, без перехода.
 */
export default function ZonaAuthReveal({ children, className = "" }: ZonaAuthRevealProps) {
  const reducedMotion = useReducedMotion();
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setRevealed(true), 20);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <>
      {!reducedMotion && (
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 z-0"
          style={{
            background:
              "radial-gradient(62% 48% at 50% 40%, transparent 0%, transparent 28%, var(--color-night-deep) 80%)",
            opacity: revealed ? 1 : 0,
            transition: `opacity ${DIM_MS}ms var(--ease-emerge)`,
          }}
        />
      )}

      <div
        className={`relative z-20 ${className}`}
        style={{
          transformOrigin: "50% 0%",
          transform: reducedMotion ? "scale(1)" : revealed ? "scale(1)" : "scale(0.045)",
          transition: reducedMotion ? "none" : `transform ${REVEAL_MS}ms var(--ease-lift)`,
        }}
      >
        {children}
      </div>
    </>
  );
}
