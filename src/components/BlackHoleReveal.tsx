"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useReducedMotion } from "@/lib/useReducedMotion";

interface BlackHoleRevealProps {
  children: ReactNode;
  className?: string;
}

/** От первого кадра до полностью раскрытой карточки. */
const DURATION_MS = 2200;
/** С этой доли от DURATION_MS карточка уже начинает проступать — внахлёст
 *  со схлопыванием, а не после него, иначе будет пустая пауза. */
const REVEAL_AT = 0.82;
/** Сколько точек тянется к центру. Для canvas дёшево даже на телефоне. */
const PARTICLE_COUNT = 110;
/** Радиус горизонта событий в момент полного схлопывания — в долях
 *  меньшей стороны экрана, чтобы эффект был соразмерным что на телефоне,
 *  что на широком экране. */
const HORIZON_R_FRACTION = 0.052;

interface Particle {
  angle: number;
  radius0: number;
  spin: number;
  size: number;
  /** Доля DURATION_MS, с которой частица начинает падать — не все стартуют
   *  разом, иначе дыра дышала бы одним вдохом, а не роем частиц. */
  delay: number;
}

function makeParticles(seedRadius: number): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    particles.push({
      angle: Math.random() * Math.PI * 2,
      radius0: seedRadius * (0.35 + Math.random() * 0.65),
      spin: (Math.random() < 0.5 ? -1 : 1) * (0.7 + Math.random() * 0.9),
      size: 0.6 + Math.random() * 1.6,
      delay: Math.random() * 0.28,
    });
  }
  return particles;
}

function easeInCubic(t: number) {
  return t * t * t;
}

/**
 * Схлопывание в чёрную дыру перед тем, как открыть форму входа в «Зону».
 *
 * Единственное место на сайте с фиолетовым — `--color-void` и
 * `--color-void-glow` в globals.css, разовое исключение из общей палитры
 * только для этого момента, нигде больше не используется.
 *
 * Слои рисуются в том порядке, в котором вёл бы себя настоящий свет: диск
 * аккреции и частицы — снизу, тёмный горизонт событий — поверх них (гасит
 * всё, что «упало» под него), тонкое яркое кольцо на его кромке — поверх
 * горизонта (фотонное кольцо — тот самый узнаваемый контур со снимка чёрной
 * дыры M87). Сложение слоёв — через `lighter`, а не обычное перекрытие:
 * там, где частицы и кольца накладываются друг на друга, они высветляются,
 * а не тускнеют, — от этого свечение выглядит настоящим, а не намалёванным
 * одним полупрозрачным кругом.
 *
 * Карточка (`children`) не подменяется и не ждёт своей очереди отдельным
 * элементом — она всё это время уже стоит в DOM с `scale(0.06)`, и
 * раскрывается из той же точки экрана, что и горизонт событий: как будто
 * это она и осталась после схлопывания, а не новый слой поверх старого.
 *
 * `prefers-reduced-motion` пропускает канвас целиком — только мягкое
 * проявление карточки без единой частицы.
 */
export default function BlackHoleReveal({ children, className = "" }: BlackHoleRevealProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef<number | undefined>(undefined);
  const startRef = useRef<number | undefined>(undefined);
  const reducedMotion = useReducedMotion();
  const [revealed, setRevealed] = useState(false);
  const [animDone, setAnimDone] = useState(false);

  useEffect(() => {
    if (reducedMotion) {
      const t = window.setTimeout(() => setRevealed(true), 60);
      return () => window.clearTimeout(t);
    }

    startRef.current = undefined;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      particlesRef.current = makeParticles(Math.min(width, height) * 0.62);
    };
    resize();
    window.addEventListener("resize", resize);

    const revealTimer = window.setTimeout(() => setRevealed(true), DURATION_MS * REVEAL_AT);
    const hideCanvasTimer = window.setTimeout(() => setAnimDone(true), DURATION_MS + 550);

    const tick = (now: number) => {
      if (startRef.current === undefined) startRef.current = now;
      const elapsed = now - startRef.current;
      const t = Math.min(elapsed / DURATION_MS, 1);
      const cx = width / 2;
      const cy = height / 2;
      const minSide = Math.min(width, height);
      const horizonR = minSide * HORIZON_R_FRACTION * easeInCubic(Math.min(t / 0.86, 1));

      // Короткий, а не полный клир — оставляет частицам едва тающий след:
      // от этого читается движение кадр за кадром, а не мигание точек.
      ctx.fillStyle = "rgba(5, 7, 15, 0.32)";
      ctx.fillRect(0, 0, width, height);

      // Диск аккреции: несколько сплюснутых по вертикали колец (эллипс —
      // диск, видимый почти с ребра) на разных радиусах и с разной
      // прозрачностью, каждое на своей скорости вращения — от этого он
      // читается объёмным, а не одной плоской окружностью.
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.translate(cx, cy);
      const diskSpin = t * 2.4;
      const ringCount = 4;
      for (let i = 0; i < ringCount; i++) {
        const rr = minSide * (0.1 + i * 0.045) * (0.4 + 0.6 * t);
        const alpha = (1 - i / ringCount) * 0.22 * Math.min(t / 0.3, 1);
        ctx.save();
        ctx.rotate(diskSpin + i * 0.6);
        ctx.scale(1, 0.38);
        ctx.beginPath();
        ctx.arc(0, 0, rr, 0, Math.PI * 2);
        ctx.lineWidth = minSide * 0.016;
        // Дальние кольца — фиолетовые (--color-void-glow), ближние к центру —
        // тёплые (--color-amber-hot): диск остывает по мере удаления от
        // горизонта, и заодно перекидывает мостик к обычной палитре сайта.
        const hue = i < 2 ? "155, 93, 229" : "242, 197, 124";
        ctx.strokeStyle = `rgba(${hue}, ${alpha})`;
        ctx.stroke();
        ctx.restore();
      }
      ctx.restore();

      // Частицы: тянутся к центру с ускорением, вращаясь всё быстрее, чем
      // ближе к дыре, — приближённое, а не точное сохранение углового
      // момента, но общее ощущение узнаваемо верное.
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (const p of particlesRef.current) {
        const pt = Math.max(0, Math.min((t - p.delay) / (1 - p.delay), 1));
        const eased = easeInCubic(pt);
        const r = p.radius0 * (1 - eased);
        if (r < horizonR * 0.7) continue; // упала за горизонт — больше не рисуем
        const angle = p.angle + p.spin * (2.2 + eased * 9) * pt;
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r * 0.82;
        const closeness = 1 - r / p.radius0;
        const size = p.size * (0.7 + closeness * 1.6);
        const warm = closeness > 0.6;
        ctx.beginPath();
        ctx.fillStyle = warm ? "rgba(255, 227, 176, 0.9)" : "rgba(155, 93, 229, 0.75)";
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // Горизонт событий: тёмный эллипс поверх всего нарисованного выше —
      // гасит то, что «упало» под него, как и положено. Тонкая яркая кромка
      // сразу за его краем — фотонное кольцо, самая узнаваемая деталь.
      if (horizonR > 0.5) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.beginPath();
        ctx.fillStyle = "#05070f";
        ctx.ellipse(0, 0, horizonR, horizonR * 0.82, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(0, 0, horizonR * 1.06, horizonR * 0.88, 0, 0, Math.PI * 2);
        ctx.lineWidth = Math.max(1, minSide * 0.0025);
        ctx.strokeStyle = `rgba(255, 227, 176, ${0.55 * Math.min(t / 0.5, 1)})`;
        ctx.stroke();
        ctx.restore();
      }

      // Вспышка схлопывания у самого конца — короткая, гаснет сама, без
      // выброса за пределы экрана.
      if (t > 0.86) {
        const flashT = Math.min((t - 0.86) / 0.14, 1);
        const flashAlpha = Math.sin(flashT * Math.PI) * 0.5;
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, minSide * 0.5);
        grad.addColorStop(0, `rgba(255, 227, 176, ${flashAlpha})`);
        grad.addColorStop(0.4, `rgba(155, 93, 229, ${flashAlpha * 0.5})`);
        grad.addColorStop(1, "rgba(155, 93, 229, 0)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
      }

      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("resize", resize);
      window.clearTimeout(revealTimer);
      window.clearTimeout(hideCanvasTimer);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [reducedMotion]);

  return (
    <div className={`relative ${className}`}>
      {!reducedMotion && !animDone && (
        <canvas
          ref={canvasRef}
          aria-hidden
          className="pointer-events-none fixed inset-0 z-20"
          style={{
            opacity: revealed ? 0 : 1,
            transition: "opacity 550ms var(--ease-emerge)",
          }}
        />
      )}
      <div
        className="relative z-30"
        style={{
          transform: reducedMotion ? "scale(1)" : revealed ? "scale(1)" : "scale(0.06)",
          opacity: revealed ? 1 : 0,
          filter: reducedMotion ? "blur(0)" : revealed ? "blur(0)" : "blur(2px)",
          transition: reducedMotion
            ? "opacity 420ms var(--ease-emerge)"
            : "transform 620ms var(--ease-lift), opacity 500ms var(--ease-emerge), filter 500ms var(--ease-emerge)",
        }}
      >
        {children}
      </div>
    </div>
  );
}
