"use client";

import { useEffect, useMemo, useState } from "react";
import { glowXFromBearing, groundYAt } from "@/lib/sky/layout";
import { useReducedMotion } from "@/lib/useReducedMotion";

const FULL_MS = 10200; // подъём + 5с + уход, с запасом на снятие
const REDUCED_MS = 5600;

const TEXT = "Ты озоряешь мою жизнь, принцесса";

interface TitleDawnProps {
  /** Азимут на её город: рассвет случается ровно с её стороны. */
  bearingDeg: number;
}

/**
 * Единственный рассвет, который здесь бывает до её приезда.
 *
 * При открытии из-за линии холмов восходит солнце — настоящий диск с заревом,
 * а не свечение вокруг букв, — и выносит на себе «ты озоряешь мою жизнь,
 * принцесса». Держится пять секунд и уходит обратно за горизонт. Один раз
 * за загрузку: это вступление, а не постоянный текст.
 *
 * Восходит с её стороны — по тому же азимуту, где всю ночь тлеет зарево
 * над Краснодаром. Маска — clip-path по силуэту земли (та же функция
 * groundYAt, что рисует холмы), поэтому солнце появляется из-за холмов
 * и за них же садится, а не всплывает поверх них. Полигон задан в долях
 * вьюпорта, значит не зависит от размера экрана и не требует пересчёта.
 */
export default function TitleDawn({ bearingDeg }: TitleDawnProps) {
  const reduced = useReducedMotion();
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setGone(true), reduced ? REDUCED_MS : FULL_MS);
    return () => window.clearTimeout(t);
  }, [reduced]);

  // Небо — всё, что выше силуэта земли. Слой клипается этой областью.
  const skyClip = useMemo(() => {
    const N = 48;
    const pts: string[] = ["0% 0%", "100% 0%"];
    for (let i = N; i >= 0; i--) {
      const x = i / N;
      pts.push(`${(x * 100).toFixed(2)}% ${(groundYAt(x) * 100).toFixed(2)}%`);
    }
    return `polygon(${pts.join(",")})`;
  }, []);

  // Точка восхода: та же, где зарево, и высота земли ровно в ней.
  const sunX = glowXFromBearing(bearingDeg);
  const sunY = groundYAt(sunX);

  if (gone) return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-20 select-none"
      style={{ clipPath: skyClip, WebkitClipPath: skyClip }}
      aria-hidden="true"
    >
      {/*
        Солнце и слова едут одним движением: свет не может опередить надпись
        или отстать от неё — они восходят как одно целое.
      */}
      <div className={`absolute inset-0 ${reduced ? "" : "title-dawn"}`}>
        {/* Высокий слабый отсвет и узкая яркая полоса у самой земли. */}
        <div className="dawn-halo" style={{ left: `${sunX * 100}%`, top: `${sunY * 100}%` }} />
        <div className="dawn-glow" style={{ left: `${sunX * 100}%`, top: `${sunY * 100}%` }} />
        {/* Диск: центр на самой линии земли, поэтому виден только купол. */}
        <div className="dawn-sun" style={{ left: `${sunX * 100}%`, top: `${sunY * 100}%` }} />

        {/* Слова — выше купола, в самом свете. */}
        <h1
          className="font-display title-face absolute left-1/2 w-full max-w-[36rem] -translate-x-1/2 -translate-y-1/2 px-7 text-center"
          style={{
            top: `${(sunY - 0.215) * 100}%`,
            margin: 0,
            fontWeight: 400,
            lineHeight: 1.16,
            letterSpacing: "0.01em",
            fontSize: "clamp(30px, 8vw, 62px)",
            textWrap: "balance",
          }}
        >
          {TEXT}
        </h1>
      </div>
    </div>
  );
}
