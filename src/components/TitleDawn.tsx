"use client";

import { useEffect, useMemo, useState } from "react";
import { groundYAt } from "@/lib/sky/layout";
import { useReducedMotion } from "@/lib/useReducedMotion";

const FULL_MS = 10200; // подъём + 5с + уход, с запасом на снятие
const REDUCED_MS = 5600;

const TEXT = "Ты озоряешь мою жизнь, принцесса";

/** Общая типографика обоих слоёв: контур свечения обязан совпасть с буквами. */
const titleType: React.CSSProperties = {
  margin: 0,
  fontWeight: 400,
  lineHeight: 1.16,
  letterSpacing: "0.01em",
  fontSize: "clamp(30px, 8vw, 62px)",
  textWrap: "balance",
};

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
      <div className="absolute left-1/2 top-[64%] w-full max-w-[36rem] -translate-x-1/2 -translate-y-1/2 px-7 text-center">
        {/*
          Рассвет случается по самим буквам.
          Свет идёт из-за надписи, поэтому зарево повторяет её контур: нижний
          слой — те же слова, размытые в свечение, верхний — чёткие буквы
          поверх. Так свет разливается ровно по линии букв, как солнце из-за
          горного хребта, а не абстрактным пятном.
        */}
        <div className="relative">
          <h1
            className={`title-halo font-display ${reduced ? "" : "title-dawn"}`}
            aria-hidden="true"
            style={{ ...titleType, opacity: reduced ? 0.85 : undefined }}
          >
            {TEXT}
          </h1>
          <h1
            className={`title-face font-display ${reduced ? "" : "title-dawn"}`}
            style={{ ...titleType, opacity: reduced ? 1 : undefined }}
          >
            {TEXT}
          </h1>
        </div>
      </div>
    </div>
  );
}
