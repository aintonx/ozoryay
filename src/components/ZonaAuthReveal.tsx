"use client";

import { useEffect, useState, type ReactNode } from "react";
import { LAYOUT } from "@/lib/sky/layout";
import { useReducedMotion } from "@/lib/useReducedMotion";

interface ZonaAuthRevealProps {
  children: ReactNode;
  className?: string;
}

/** От первого кадра до полностью раскрытой карточки. */
const REVEAL_MS = 640;

/** Смыкание тьмы и разгорание луча вокруг звезды и карточки. */
const DIM_MS = 320;

/** Звезда «Зоны» в `dvh` — тот же `LAYOUT.zonaStar`, что и у `drawZonaStar`
 *  в `renderer.ts`, а не число, подобранное здесь заново. Строкой, а не
 *  через измерение в рантайме: позиция фиксированная, `dvh` сам следит
 *  за высотой вьюпорта. */
const STAR_TOP = `${LAYOUT.zonaStar.y * 100}dvh`;

/**
 * Карточка входа в «Зону» не проявляется — она выпадает из звезды.
 *
 * Раньше здесь работал `SpaceArrival` (прилёт из глубины космоса,
 * растворение размытия): он остаётся в кодовой базе нетронутым — вдруг
 * пригодится ещё для чего-то, — но в самой «Зоне» вместо него теперь этот
 * компонент.
 *
 * Сама звезда, из которой всё растёт, здесь не рисуется: она — часть
 * настоящего неба (`LAYOUT.zonaStar`, отрисовка — `drawZonaStar` в
 * `renderer.ts`), горит всегда, ещё до первого нажатия, и становится ярче
 * через `zonaStarBoost` (см. `zona/page.tsx`).
 *
 * Между звездой и верхним краем карточки на большинстве экранов остаётся
 * пустой промежуток (звезда стоит на фиксированной высоте, карточка —
 * по центру, её отступ от звезды зависит от высоты экрана и содержимого).
 * Без ничего в этом промежутке связь «карточка из звезды» читается плохо —
 * просто звезда сверху и отдельно карточка снизу. Луч (`--beam` ниже) —
 * не decoration ради decoration, а то, что физически заполняет этот
 * промежуток: мягкая вертикальная растяжка от звезды вниз, к хвостику
 * карточки (`.glass.zona-window` в globals.css). Разгорается вместе
 * с тьмой, до самого роста карточки, — свет должен быть виден до того,
 * как покажется то, что он освещает.
 *
 * Рост карточки — единственное, что её движет. Непрозрачность на ней не
 * трогается ни на кадр: у стекла от этого пропадает размытие, и оно
 * возвращается рывком (см. `.glass` в globals.css). Луч и тьма фона
 * прозрачность трогают свободно — у них самих блюра нет.
 *
 * `prefers-reduced-motion`: без тьмы и без луча — только сама карточка,
 * сразу на своём месте, без перехода.
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
            // Эллипс заведомо шире звезды и карточки вместе — прежний,
            // более тесный вариант затемнял саму звезду вместо того,
            // чтобы её выделять. Прозрачно до 55% радиуса (звезда на
            // ~19dvh, центр пятна на 38dvh — это меньше трети радиуса
            // в любую сторону), тьма только у самых краёв экрана.
            background:
              "radial-gradient(75% 60% at 50% 38dvh, transparent 0%, transparent 55%, var(--color-night-deep) 95%)",
            opacity: revealed ? 1 : 0,
            transition: `opacity ${DIM_MS}ms var(--ease-emerge)`,
          }}
        />
      )}

      {!reducedMotion && (
        <div
          aria-hidden
          className="pointer-events-none fixed left-1/2 z-10 w-[2px] -translate-x-1/2"
          style={{
            top: STAR_TOP,
            height: "11rem",
            background:
              "linear-gradient(to bottom, color-mix(in srgb, var(--color-amber-hot) 70%, transparent), color-mix(in srgb, var(--color-amber) 30%, transparent) 45%, transparent 90%)",
            filter: "blur(2.5px)",
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
