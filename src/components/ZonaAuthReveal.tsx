"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ZONA_LIFT_ZOOM } from "@/components/ZonaLift";
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

/**
 * Звезда «Зоны» на экране — не `LAYOUT.zonaStar.y` сам по себе.
 *
 * `LiftedSky` (см. `ZonaLift.tsx`) растягивает весь канвас неба через
 * `transform: scale(ZONA_LIFT_ZOOM)` с якорем у верхней кромки
 * (`transformOrigin: "50% 0%"`), и на `/zona` эта растяжка уже полностью
 * включена (`t=1` при монтировании). Точка на доле `y` высоты канваса
 * съезжает за счёт этого на `y * ZONA_LIFT_ZOOM` от того же верхнего
 * края — то есть на `19% * 1.4 ≈ 26.6%`, а не на 19%, как было бы без
 * растяжки. Первая версия этого компонента считала без неё — отсюда и
 * видимый разрыв между лучом и настоящей звездой: луч сидел заметно
 * выше того места, где звезда оказывается на самом деле.
 */
const STAR_TOP = `${LAYOUT.zonaStar.y * ZONA_LIFT_ZOOM * 100}dvh`;

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
 * через `zonaStarBoost` (см. `zona/page.tsx`). Экранная координата для
 * луча ниже посчитана от неё же, через `ZONA_LIFT_ZOOM` (см. `STAR_TOP`
 * выше) — а не угадана заново.
 *
 * Луч между звездой и карточкой — не decoration ради decoration: без
 * него связь «карточка из звезды» читается плохо, особенно если разрыв
 * между ними на каком-то экране окажется больше ожидаемого. Разгорается
 * вместе с тьмой, до самого роста карточки, — свет виден до того, как
 * покажется то, что он освещает.
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
        // Простая вертикальная полоса вместо эллипса: доля высоты, на
        // которой стоит звезда, и высота самой карточки — два отдельных
        // числа, и эллипс в процентах от своего же радиуса — лишний повод
        // ошибиться в арифметике между ними. Здесь прозрачная полоса прямо
        // по числам: от написанного выше `STAR_TOP` с небольшим запасом
        // сверху и до уверенного «ниже любой карточки» снизу, тьма — только
        // за её пределами.
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 z-0"
          style={{
            background: `linear-gradient(to bottom, var(--color-night-deep) 0%, transparent calc(${STAR_TOP} - 7dvh), transparent 78dvh, var(--color-night-deep) 100%)`,
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
            height: "4.5rem",
            background:
              "linear-gradient(to bottom, color-mix(in srgb, var(--color-amber-hot) 75%, transparent), color-mix(in srgb, var(--color-amber) 35%, transparent) 55%, transparent 100%)",
            filter: "blur(2px)",
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
