"use client";

import { useEffect, useMemo, useState } from "react";
import { projectorMetrics } from "@/lib/sky/layout";
import type { Letter } from "@/lib/letters";
import { useReducedMotion } from "@/lib/useReducedMotion";

const SEEN_KEY = "ozoryay.hintsSeen";
/** Ждём, пока отыграет заголовок-рассвет и первый прокат прожектора. */
const START_MS = 21000;
const STEP_MS = 7000;

interface HintsProps {
  letters: Letter[];
  /** Пока раскрыто письмо или горит прожектор — подсказки не мешают. */
  busy: boolean;
}

/**
 * Подсказки при самом первом визите — чтобы она поняла, что здесь можно
 * трогать. Две штуки, по очереди: жёлтые звёзды и прожектор.
 *
 * Мягкий круг обводки вокруг цели, тонкая рисованная стрелка от подписи к
 * нему. Появляются один раз в жизни (флаг в localStorage), сами тают,
 * исчезают от любого касания и не показываются при reduced-motion.
 */
export default function Hints({ letters, busy }: HintsProps) {
  const reduced = useReducedMotion();
  const [step, setStep] = useState(-1); // -1 — ещё не начали, 2 — закончили
  const [vp, setVp] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const measure = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  useEffect(() => {
    if (reduced) return;
    try {
      if (localStorage.getItem(SEEN_KEY)) return;
      localStorage.setItem(SEEN_KEY, "1");
    } catch {
      return; // приватный режим — просто не показываем
    }
    const timers = [
      window.setTimeout(() => setStep(0), START_MS),
      window.setTimeout(() => setStep(1), START_MS + STEP_MS),
      window.setTimeout(() => setStep(2), START_MS + STEP_MS * 2),
    ];
    return () => timers.forEach(clearTimeout);
  }, [reduced]);

  // Любое касание экрана — подсказки уходят: она уже разобралась.
  useEffect(() => {
    if (step < 0 || step > 1) return;
    const dismiss = () => setStep(2);
    window.addEventListener("pointerdown", dismiss, { once: true });
    return () => window.removeEventListener("pointerdown", dismiss);
  }, [step]);

  // Цель первой подсказки — самая заметная звезда-письмо в верхней половине.
  const star = useMemo(() => {
    const speaking = letters.filter((l) => !l.isEternal && l.text.trim().length > 0);
    return (
      speaking.find((l) => l.starY > 0.2 && l.starY < 0.42 && l.starX > 0.55) ?? speaking[0] ?? null
    );
  }, [letters]);

  if (step < 0 || step > 1 || busy || vp.w === 0 || !star) return null;

  const proj = projectorMetrics(vp.w, vp.h);
  const target =
    step === 0
      ? { x: star.starX * vp.w, y: star.starY * vp.h, r: 30 }
      : { x: proj.x, y: proj.base - proj.size * 0.5, r: 34 };

  // Подпись ставим по диагонали от цели, внутрь экрана. Ширину держим узкой,
  // чтобы строка переносилась и не наезжала на заголовок и края.
  const toLeft = target.x > vp.w * 0.5;
  const labelX = toLeft ? target.x - 112 : target.x + 112;
  const labelY = target.y + (step === 0 ? 92 : -132);
  const text = step === 0 ? "тёплые звёзды — мои письма тебе" : "а здесь наши воспоминания";

  return (
    <div className="hint-layer pointer-events-none fixed inset-0 z-40" aria-hidden="true">
      <svg className="absolute inset-0 h-full w-full" viewBox={`0 0 ${vp.w} ${vp.h}`}>
        {/* Мягкий круг вокруг цели */}
        <circle
          cx={target.x}
          cy={target.y}
          r={target.r}
          fill="none"
          stroke="#F2C57C"
          strokeOpacity={0.5}
          strokeWidth={1}
          strokeDasharray="3 5"
          className="hint-ring"
          style={{ transformOrigin: `${target.x}px ${target.y}px` }}
        />
        {/* Рисованная стрелка от подписи к цели */}
        <HandArrow
          from={{ x: labelX, y: labelY }}
          to={{ x: target.x, y: target.y }}
          r={target.r}
        />
      </svg>

      <div
        className="font-text absolute w-[9.5rem] text-[13px] leading-snug text-amber/85"
        style={{
          left: labelX,
          top: labelY,
          transform: `translate(${toLeft ? "-100%" : "0"}, -50%)`,
          textAlign: toLeft ? "right" : "left",
          textShadow: "0 0 12px rgba(5,7,15,0.9), 0 0 4px rgba(5,7,15,0.9)",
        }}
      >
        {text}
      </div>
    </div>
  );
}

/** Тонкая дуга с наконечником — от подписи к цели, чуть не доходя до круга. */
function HandArrow({
  from,
  to,
  r,
}: {
  from: { x: number; y: number };
  to: { x: number; y: number };
  r: number;
}) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  // Конец — на границе круга, чтобы стрелка не втыкалась в саму звезду.
  const end = { x: to.x - (dx / len) * (r + 6), y: to.y - (dy / len) * (r + 6) };
  // Контрольная точка сбоку от прямой — получается лёгкая рисованная дуга.
  const mid = { x: (from.x + end.x) / 2, y: (from.y + end.y) / 2 };
  const ctrl = { x: mid.x + (-dy / len) * 26, y: mid.y + (dx / len) * 26 };

  // Наконечник — две короткие чёрточки под углом к касательной в конце.
  const tan = { x: end.x - ctrl.x, y: end.y - ctrl.y };
  const tl = Math.hypot(tan.x, tan.y) || 1;
  const ux = tan.x / tl;
  const uy = tan.y / tl;
  const wing = (a: number) => ({
    x: end.x - (ux * Math.cos(a) - uy * Math.sin(a)) * 11,
    y: end.y - (ux * Math.sin(a) + uy * Math.cos(a)) * 11,
  });
  const w1 = wing(0.45);
  const w2 = wing(-0.45);

  return (
    <g stroke="#F2C57C" strokeOpacity={0.65} strokeWidth={1.2} fill="none" strokeLinecap="round">
      <path d={`M ${from.x} ${from.y} Q ${ctrl.x} ${ctrl.y} ${end.x} ${end.y}`} />
      <path d={`M ${w1.x} ${w1.y} L ${end.x} ${end.y} L ${w2.x} ${w2.y}`} />
    </g>
  );
}
