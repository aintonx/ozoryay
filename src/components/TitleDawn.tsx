"use client";

import { useEffect, useMemo, useState } from "react";
import { groundYAt } from "@/lib/sky/layout";
import { useReducedMotion } from "@/lib/useReducedMotion";

const FULL_MS = 10200; // подъём + 5с + уход, с запасом на снятие
const REDUCED_MS = 5600;

/**
 * Заголовок-рассвет. При открытии «ты озоряешь мою жизнь, принцесса» восходит
 * из-за линии холмов, как почти зарождающийся рассвет, держится пять секунд и
 * уходит обратно за горизонт — исчезая по самим линиям земли, а не за прямым
 * краем. Показывается один раз за загрузку: это вступление, не постоянный текст.
 *
 * Маска — clip-path по силуэту земли (та же функция groundYAt, что рисует
 * холмы), поэтому заголовок пропадает точно по контуру холмов. Полигон задан
 * в долях вьюпорта, значит не зависит от размера экрана и не требует пересчёта
 * на ресайз.
 */
export default function TitleDawn() {
  const reduced = useReducedMotion();
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setGone(true), reduced ? REDUCED_MS : FULL_MS);
    return () => window.clearTimeout(t);
  }, [reduced]);

  // Небо — всё, что выше силуэта земли. Заголовок клипается этой областью.
  const skyClip = useMemo(() => {
    const N = 48;
    const pts: string[] = ["0% 0%", "100% 0%"];
    for (let i = N; i >= 0; i--) {
      const x = i / N;
      pts.push(`${(x * 100).toFixed(2)}% ${(groundYAt(x) * 100).toFixed(2)}%`);
    }
    return `polygon(${pts.join(",")})`;
  }, []);

  if (gone) return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-20 select-none"
      style={{ clipPath: skyClip, WebkitClipPath: skyClip }}
      aria-hidden="true"
    >
      {/* Тёплое зарево у горизонта — «почти» рассвет. */}
      <div
        className={reduced ? undefined : "title-dawn-glow"}
        style={{
          position: "absolute",
          inset: 0,
          opacity: reduced ? 0.16 : undefined,
          background:
            "radial-gradient(130% 62% at 50% 84%, rgba(242,197,124,0.17), rgba(242,197,124,0.05) 34%, transparent 62%)",
        }}
      />

      <div
        className="absolute left-1/2 top-[64%] w-full max-w-[36rem] -translate-x-1/2 -translate-y-1/2 px-7 text-center"
      >
        <h1
          className={reduced ? "font-display" : "title-dawn font-display"}
          style={{
            margin: 0,
            fontWeight: 400,
            lineHeight: 1.16,
            letterSpacing: "0.01em",
            fontSize: "clamp(30px, 8vw, 62px)",
            color: "#FBEAD0",
            textShadow: "0 0 34px rgba(242,197,124,0.28), 0 0 10px rgba(255,227,176,0.22)",
            textWrap: "balance",
            opacity: reduced ? 1 : undefined,
          }}
        >
          Ты озоряешь мою жизнь, принцесса
        </h1>
      </div>
    </div>
  );
}
