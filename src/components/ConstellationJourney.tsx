"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { IconSpeaker, IconSpeakerOff } from "./ui/Icons";

interface ConstellationJourneyProps {
  /** Запустить (true) / остановить и убрать. */
  active: boolean;
  /** Когда обратный полёт закончился — вернуть управление вызывающему. */
  onDone: () => void;
}

/**
 * Формат — обязательно .mp4, не .mov. Это не прихоть: у .mov MIME-тип
 * video/quicktime, и Chrome (в отличие от Safari) вообще отказывается
 * играть его через тег <video>, каким бы кодеком видео ни было снято
 * внутри. Экспорт/переименование в .mp4 решает это полностью — подробности
 * в public/memes/README.md.
 */
const VIDEO_SRC = "/memes/meme-esc.mp4";
const GALAXY_A = "/galaxies/andromeda.jpg";
const GALAXY_B = "/galaxies/ngc4414.jpg";

/** Долгий разгон и подлёт — не суетимся, космос никуда не спешит. */
const FORWARD_MS = 7600;
/** Обратный прыжок короче и резче — как рывок назад, а не второе путешествие. */
const REVERSE_MS = 1500;
/** Ровно тот же порог, что в `ContentOverlay` — один и тот же жест на сайте. */
const SWIPE = 44;

type Mode = "forward" | "arrived" | "reverse" | "done";

function clamp01(t: number) {
  return t < 0 ? 0 : t > 1 ? 1 : t;
}
function lerp(a: number, b: number, t: number) {
  return a + (b - a) * clamp01(t);
}
function mapRange(t: number, a: number, b: number) {
  return clamp01((t - a) / (b - a));
}
function easeOutCubic(t: number) {
  const c = clamp01(t);
  return 1 - Math.pow(1 - c, 3);
}
function easeInCubic(t: number) {
  const c = clamp01(t);
  return c * c * c;
}
function easeInOutCubic(t: number) {
  const c = clamp01(t);
  return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2;
}
/** Плавная трапеция: нарастает, держится на пике, гаснет — без швов на стыках. */
function trapezoid(t: number, riseEnd: number, fallStart: number) {
  const c = clamp01(t);
  if (c <= 0 || c >= 1) return 0;
  if (c < riseEnd) return easeOutCubic(c / riseEnd);
  if (c > fallStart) return 1 - easeInOutCubic((c - fallStart) / (1 - fallStart));
  return 1;
}

interface Star {
  x: number;
  y: number;
  z: number;
  speed: number;
  size: number;
  /** Небольшая доля звёзд горит тёплым — тем же приёмом, что и в остальном небе:
   *  холодный свет — фон, тёплый — то немногое, что особенное. */
  warm: boolean;
}

function makeStars(count: number): Star[] {
  const list: Star[] = [];
  for (let i = 0; i < count; i++) {
    list.push({
      x: (Math.random() - 0.5) * 2,
      y: (Math.random() - 0.5) * 2,
      z: Math.random() * 1.2 + 0.05,
      speed: 0.004 + Math.random() * 0.013,
      size: 0.6 + Math.random() * 1.8,
      warm: Math.random() < 0.16,
    });
  }
  return list;
}

/**
 * Кинематографическое путешествие к «Созвездию вечного смеха».
 *
 * Не серия сменяющих друг друга фаз, а один непрерывный полёт: скорость
 * тоннеля, яркость пролетающих галактик, размер звезды-цели — всё это
 * функция одного и того же плавно нарастающего числа. Сама звезда-цель
 * горит тёплым (amber-hot) с первого кадра — едва заметной точкой среди
 * обычных, холодных звёзд, — и по мере приближения именно она вырастает
 * в видео. Мысль в том, что видео не «появляется из портала», а было
 * этой самой звездой всё время, просто слишком далеко, чтобы разглядеть.
 *
 * Выход — свайп в любую сторону, ровно тот же жест, что уже закрывает
 * вспышки на небе (`ContentOverlay`): тот же порог движения пальца, та же
 * кривая, тот же «гаснущий» текст-подсказка при удержании.
 */
export default function ConstellationJourney({ active, onDone }: ConstellationJourneyProps) {
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const [muted, setMuted] = useState(true);
  const [showControls, setShowControls] = useState(false);
  const [held, setHeld] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const modeRef = useRef<Mode>("forward");
  const progressRef = useRef(0);
  const startTimeRef = useRef(0);
  const reverseStartRef = useRef(0);
  const reverseFromRef = useRef(0);
  const rafRef = useRef<number>(0);
  const stars = useRef<Star[]>([]);
  const timers = useRef<number[]>([]);
  const doneCalledRef = useRef(false);
  const startPointer = useRef<{ x: number; y: number } | null>(null);

  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  }, []);
  const clearTimers = useCallback(() => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  }, []);

  // Главный цикл: старт, кадр за кадром, обратный прыжок — всё здесь.
  useEffect(() => {
    if (!active) {
      // Сам этот проход ничего не запускает: либо путешествие уже
      // корректно свернулось собственным циклом (он сбрасывает video/rAF
      // и вызывает onDone из requestAnimationFrame — не отсюда, поэтому
      // sync setState здесь не нужен), либо это заканчивает cleanup-функция
      // предыдущего запуска ниже.
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d") ?? null;
    if (!canvas || !ctx) return;

    setVisible(true);
    setShowControls(false);
    setMuted(true);
    doneCalledRef.current = false;
    modeRef.current = "forward";
    progressRef.current = 0;
    setProgress(0);
    stars.current = makeStars(340);
    startTimeRef.current = performance.now();

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    // Видео заводим сразу, приглушённым: звук браузеры разрешают надёжнее
    // включить у УЖЕ играющего элемента, чем запустить с нуля спустя долгую
    // паузу после нажатия. Пока портал не дорос — просто не видно.
    const videoEl = videoRef.current;
    if (videoEl) {
      videoEl.currentTime = 0;
      videoEl.muted = true;
      void videoEl.play().catch(() => {});
    }

    let last = performance.now();
    let lastStateUpdate = 0;

    const tick = (now: number) => {
      const mode = modeRef.current;
      const dt = Math.min(32, now - last);
      last = now;

      if (mode === "forward") {
        const p = clamp01((now - startTimeRef.current) / FORWARD_MS);
        progressRef.current = p;
        if (p >= 1) {
          modeRef.current = "arrived";
          later(() => setShowControls(true), 450);
        }
      } else if (mode === "reverse") {
        const rp = clamp01((now - reverseStartRef.current) / REVERSE_MS);
        progressRef.current = reverseFromRef.current * (1 - easeInCubic(rp));
        if (rp >= 1) modeRef.current = "done";
      }

      drawTunnel(ctx, window.innerWidth, window.innerHeight, dt, stars.current, progressRef.current, modeRef.current);

      if (now - lastStateUpdate > 45) {
        lastStateUpdate = now;
        setProgress(progressRef.current);
      }

      if (modeRef.current === "done") {
        if (!doneCalledRef.current) {
          doneCalledRef.current = true;
          setVisible(false);
          onDone();
        }
        return;
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(rafRef.current);
      clearTimers();
      if (videoEl) {
        videoEl.pause();
        videoEl.currentTime = 0;
        videoEl.muted = true;
      }
      modeRef.current = "forward";
      progressRef.current = 0;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const beginExit = useCallback(() => {
    if (modeRef.current === "reverse" || modeRef.current === "done") return;
    modeRef.current = "reverse";
    setShowControls(false);
    reverseFromRef.current = progressRef.current;
    reverseStartRef.current = performance.now();
    const v = videoRef.current;
    if (v) later(() => v.pause(), 260);
  }, [later]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (modeRef.current !== "arrived") return;
    if ((e.target as HTMLElement).closest("button")) return;
    startPointer.current = { x: e.clientX, y: e.clientY };
    setHeld(true);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const s = startPointer.current;
    if (!s) return;
    if (Math.hypot(e.clientX - s.x, e.clientY - s.y) > SWIPE) {
      startPointer.current = null;
      setHeld(false);
      beginExit();
    }
  };
  const endPointer = () => {
    startPointer.current = null;
    setHeld(false);
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  };

  if (!active && !visible) return null;

  // --- всё ниже — чистые функции одного и того же progress, без своего состояния ---
  const p = progress;

  const aWin = mapRange(p, 0.08, 0.46);
  const aShape = trapezoid(aWin, 0.28, 0.72);
  const bWin = mapRange(p, 0.4, 0.8);
  const bShape = trapezoid(bWin, 0.28, 0.72);

  const starGrowth = Math.pow(p, 2.6);
  const portalScale = Math.max(0.018, starGrowth);
  const haloScale = Math.max(0.05, Math.pow(p, 2));
  const haloOpacity = mapRange(p, 0.04, 0.9) * 0.9;

  const videoOpacity = mapRange(p, 0.84, 1);
  const dotOpacity = 1 - videoOpacity;

  const galaxyTransition = "opacity 200ms linear, transform 200ms linear, filter 200ms linear";
  const portalTransition = "transform 160ms linear";
  const fadeTransition = "opacity 180ms linear";

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden"
      style={{
        touchAction: "none",
        opacity: visible && active ? 1 : 0,
        transition: "opacity 700ms ease",
        background: "var(--color-night-deep)",
        pointerEvents: visible && active ? "auto" : "none",
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endPointer}
      onPointerCancel={endPointer}
    >
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden />

      {/* Галактика на пролёте — большая, с мягким эллиптическим угасанием
          к краю, а не вырезанная кругом: у настоящего снимка нет края.
          Обычный <img>, не next/image: сайт — статический экспорт без
          сервера для его оптимизации, а трансформ/маска/blur пересчитываются
          на лету и меняются каждый кадр — next/image тут не даёт ничего,
          кроме лишнего слоя между стилями и разметкой. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={GALAXY_A}
        alt=""
        aria-hidden
        className="pointer-events-none absolute h-[118vmin] w-[118vmin] max-w-none select-none object-cover"
        style={{
          left: "32%",
          top: "38%",
          opacity: aShape * 0.85,
          transform: `translate(-50%, -50%) translate(${-4 + 8 * aWin}%, ${3 - 5 * aWin}%) scale(${1 + 0.16 * aWin})`,
          filter: `brightness(0.82) contrast(1.08) saturate(1.1) blur(${(1 - aShape) * 5}px)`,
          maskImage: "radial-gradient(ellipse 60% 56% at 50% 50%, black 28%, transparent 74%)",
          WebkitMaskImage: "radial-gradient(ellipse 60% 56% at 50% 50%, black 28%, transparent 74%)",
          transition: galaxyTransition,
        }}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={GALAXY_B}
        alt=""
        aria-hidden
        className="pointer-events-none absolute h-[112vmin] w-[112vmin] max-w-none select-none object-cover"
        style={{
          left: "68%",
          top: "60%",
          opacity: bShape * 0.85,
          transform: `translate(-50%, -50%) translate(${5 - 9 * bWin}%, ${-3 + 6 * bWin}%) scale(${1 + 0.14 * bWin})`,
          filter: `brightness(0.82) contrast(1.08) saturate(1.1) blur(${(1 - bShape) * 5}px)`,
          maskImage: "radial-gradient(ellipse 58% 54% at 50% 50%, black 28%, transparent 74%)",
          WebkitMaskImage: "radial-gradient(ellipse 58% 54% at 50% 50%, black 28%, transparent 74%)",
          transition: galaxyTransition,
        }}
      />

      {/* Звезда-цель: горела тёплой точкой с первого кадра, теперь выросла
          и стала видео. Внешнее гало и сама точка — разные слои: гало шире
          и мягче, растёт чуть иначе, чем то, что внутри него светится. */}
      <div className="pointer-events-none absolute" style={{ left: "50%", top: "46%" }}>
        <div
          className="absolute rounded-full"
          style={{
            width: "min(70vw, 480px)",
            height: "min(70vw, 480px)",
            left: 0,
            top: 0,
            transform: `translate(-50%, -50%) scale(${haloScale})`,
            opacity: haloOpacity,
            background:
              "radial-gradient(circle, rgba(255,227,176,0.22) 0%, rgba(201,214,240,0.08) 45%, transparent 72%)",
            filter: "blur(14px)",
            transition: portalTransition + ", opacity 200ms linear",
          }}
        />
        <div
          className="absolute overflow-hidden rounded-full"
          style={{
            width: "min(70vw, 420px)",
            height: "min(70vw, 420px)",
            left: 0,
            top: 0,
            transform: `translate(-50%, -50%) scale(${portalScale})`,
            transition: portalTransition,
          }}
        >
          <div
            className="absolute inset-0"
            style={{
              opacity: dotOpacity,
              transition: fadeTransition,
              background:
                "radial-gradient(circle at 50% 50%, #fff6e4 0%, rgba(255,227,176,0.92) 22%, rgba(242,197,124,0.55) 45%, rgba(242,197,124,0.12) 68%, transparent 85%)",
            }}
          />
          <video
            ref={videoRef}
            src={VIDEO_SRC}
            loop
            playsInline
            muted={muted}
            preload="auto"
            className="absolute inset-0 h-full w-full object-cover"
            style={{
              opacity: videoOpacity,
              transition: "opacity 220ms linear",
              maskImage: "radial-gradient(circle, black 64%, transparent 96%)",
              WebkitMaskImage: "radial-gradient(circle, black 64%, transparent 96%)",
            }}
          />
        </div>
      </div>

      {/* Управление: звук и подсказка выхода — тот же корпус и та же кривая,
          что у полосы внизу `ContentOverlay`. */}
      <div
        className="pointer-events-auto absolute inset-x-0 bottom-0 flex flex-col items-center gap-[0.6rem] px-[1.15rem] pb-[max(1.5rem,env(safe-area-inset-bottom))]"
        style={{
          transform: showControls ? "translate3d(0,0,0)" : "translate3d(0, 120%, 0)",
          transition: "transform 520ms cubic-bezier(0.32, 0.72, 0, 1)",
        }}
      >
        <button
          type="button"
          onClick={(e) => {
            if (e.detail > 0) e.currentTarget.blur();
            toggleMute();
          }}
          className="glass font-system flex items-center gap-[0.5em] rounded-full py-[0.7rem] pr-[1.25rem] pl-[1.05rem] text-[13px] font-medium text-star/90 transition-transform duration-300 active:scale-[0.97]"
        >
          {muted ? <IconSpeakerOff size={16} className="text-amber/90" /> : <IconSpeaker size={16} className="text-amber/90" />}
          {muted ? "включить звук" : "выключить звук"}
        </button>
        <span
          className="font-system caption text-[12px] font-medium tracking-[0.05em] text-star transition-opacity duration-300"
          style={{ opacity: held ? 0.25 : 1 }}
        >
          смахни, чтобы вернуться
        </span>
      </div>
    </div>
  );
}

/** Скорость тоннеля: быстро в начале, плавно гасится к моменту прибытия. */
function speedFor(progress: number, mode: Mode) {
  if (mode === "reverse") return 3.2;
  return lerp(2.2, 0.35, easeInOutCubic(progress));
}
/** Яркость самого тоннеля: чуть гаснет к финалу, чтобы не спорить со светом портала. */
function dimFor(progress: number, mode: Mode) {
  if (mode === "reverse") return 1;
  if (progress > 0.82) return lerp(1, 0.5, mapRange(progress, 0.82, 1));
  return 1;
}

function drawTunnel(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  dt: number,
  starsList: Star[],
  progress: number,
  mode: Mode,
) {
  const cx = w / 2;
  const cy = h * 0.46;

  ctx.fillStyle = "#05070f";
  ctx.fillRect(0, 0, w, h);

  const speedMul = speedFor(progress, mode);
  const dim = dimFor(progress, mode);

  for (const s of starsList) {
    s.z -= s.speed * speedMul * (dt / 16);
    if (s.z <= 0.02) {
      s.z = 1.15;
      s.x = (Math.random() - 0.5) * 2;
      s.y = (Math.random() - 0.5) * 2;
    }

    const k = 0.55 / s.z;
    const px = cx + s.x * k * w * 0.55;
    const py = cy + s.y * k * h * 0.55;
    const prevK = 0.55 / (s.z + s.speed * speedMul * 3);
    const prevX = cx + s.x * prevK * w * 0.55;
    const prevY = cy + s.y * prevK * h * 0.55;

    const alpha = Math.min(1, dim * (1.1 - s.z) * 1.4);
    if (alpha < 0.03) continue;

    const color = s.warm ? "255, 227, 176" : "201, 214, 240";

    ctx.beginPath();
    ctx.strokeStyle = `rgba(${color}, ${alpha * 0.8})`;
    ctx.lineWidth = Math.max(0.6, s.size * (1.2 - s.z) * 1.1);
    ctx.moveTo(prevX, prevY);
    ctx.lineTo(px, py);
    ctx.stroke();

    ctx.beginPath();
    ctx.fillStyle = `rgba(${color}, ${alpha})`;
    ctx.arc(px, py, Math.max(0.4, s.size * (1.15 - s.z) * 0.55), 0, Math.PI * 2);
    ctx.fill();
  }
}
