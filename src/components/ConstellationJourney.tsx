"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

/**
 * Кинематографическое путешествие к «Созвездию вечного смеха».
 *
 * Фазы:
 * 1. warp      — ускорение вглубь космоса (звёздный туннель)
 * 2. approach  — пролёт мимо реальных галактик
 * 3. portal    — появление мягкого светящегося портала/созвездия
 * 4. playing   — видео-мем зациклено внутри портала
 * 5. exit      — обратный прыжок к обычному небу
 *
 * Свайп в любую сторону в фазах portal/playing запускает выход.
 */

type Phase = "warp" | "approach" | "portal" | "playing" | "exit";

interface ConstellationJourneyProps {
  /** Запустить (true) / остановить и убрать. */
  active: boolean;
  /** Когда анимация выхода закончилась — вернуть управление. */
  onDone: () => void;
  /** Путь к видео (относительно public/). */
  videoSrc?: string;
}

const VIDEO_SRC = "/memes/meme-esc.mov";
const GALAXIES = [
  "/galaxies/andromeda.jpg",
  "/galaxies/ngc4414.jpg",
  "/galaxies/sombrero.jpg",
];

const WARP_MS = 2800;
const APPROACH_MS = 2200;
const PORTAL_MS = 1800;
const EXIT_MS = 1600;

const SWIPE_THRESHOLD = 48;

export default function ConstellationJourney({
  active,
  onDone,
  videoSrc = VIDEO_SRC,
}: ConstellationJourneyProps) {
  const [phase, setPhase] = useState<Phase>("warp");
  const [muted, setMuted] = useState(true);
  const [visible, setVisible] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const rafRef = useRef<number>(0);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const timers = useRef<number[]>([]);
  const phaseStart = useRef(0);
  const stars = useRef<
    Array<{ x: number; y: number; z: number; speed: number; size: number }>
  >([]);

  const clearTimers = useCallback(() => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  }, []);

  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  }, []);

  // Инициализация и запуск при active=true
  useEffect(() => {
    if (!active) {
      setVisible(false);
      setPhase("warp");
      clearTimers();
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      }
      return;
    }

    setVisible(true);
    setPhase("warp");
    setMuted(true);
    phaseStart.current = performance.now();

    // Генерируем звёзды для туннеля
    const list: typeof stars.current = [];
    for (let i = 0; i < 420; i++) {
      list.push({
        x: (Math.random() - 0.5) * 2,
        y: (Math.random() - 0.5) * 2,
        z: Math.random() * 1.2 + 0.05,
        speed: 0.004 + Math.random() * 0.012,
        size: 0.6 + Math.random() * 1.8,
      });
    }
    stars.current = list;

    later(() => setPhase("approach"), WARP_MS);
    later(() => setPhase("portal"), WARP_MS + APPROACH_MS);
    later(() => {
      setPhase("playing");
      const v = videoRef.current;
      if (v) {
        v.currentTime = 0;
        v.muted = true;
        void v.play().catch(() => {});
      }
    }, WARP_MS + APPROACH_MS + PORTAL_MS);

    return () => clearTimers();
  }, [active, clearTimers, later]);

  // Canvas анимация звёздного туннеля
  useEffect(() => {
    if (!active || !visible) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

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

    let last = performance.now();
    const draw = (now: number) => {
      const dt = Math.min(32, now - last);
      last = now;
      const w = window.innerWidth;
      const h = window.innerHeight;
      const cx = w / 2;
      const cy = h / 2;

      // Фон
      ctx.fillStyle = "#02040a";
      ctx.fillRect(0, 0, w, h);

      // В фазах approach/portal/playing слегка приглушаем туннель
      const intensity =
        phase === "warp"
          ? 1
          : phase === "approach"
            ? 0.55
            : phase === "portal"
              ? 0.25
              : phase === "exit"
                ? 0.7
                : 0.12;

      const speedMul =
        phase === "warp"
          ? 1.8
          : phase === "approach"
            ? 0.9
            : phase === "exit"
              ? 2.4
              : 0.15;

      for (const s of stars.current) {
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

        const alpha = Math.min(1, intensity * (1.1 - s.z) * 1.4);
        if (alpha < 0.03) continue;

        ctx.beginPath();
        ctx.strokeStyle = `rgba(200, 220, 255, ${alpha * 0.85})`;
        ctx.lineWidth = Math.max(0.6, s.size * (1.2 - s.z) * 1.1);
        ctx.moveTo(prevX, prevY);
        ctx.lineTo(px, py);
        ctx.stroke();

        // Яркая точка
        ctx.beginPath();
        ctx.fillStyle = `rgba(240, 248, 255, ${alpha})`;
        ctx.arc(px, py, Math.max(0.4, s.size * (1.15 - s.z) * 0.55), 0, Math.PI * 2);
        ctx.fill();
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [active, visible, phase]);

  // Свайп для выхода
  const onPointerDown = (e: React.PointerEvent) => {
    if (phase !== "portal" && phase !== "playing") return;
    if ((e.target as HTMLElement).closest("button")) return;
    startRef.current = { x: e.clientX, y: e.clientY };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const s = startRef.current;
    if (!s) return;
    if (Math.hypot(e.clientX - s.x, e.clientY - s.y) > SWIPE_THRESHOLD) {
      startRef.current = null;
      beginExit();
    }
  };

  const endPointer = () => {
    startRef.current = null;
  };

  const beginExit = useCallback(() => {
    if (phase === "exit") return;
    setPhase("exit");
    const v = videoRef.current;
    if (v) {
      // плавное затухание звука/видео
      v.style.transition = "opacity 0.9s ease";
      v.style.opacity = "0";
      later(() => {
        v.pause();
      }, 900);
    }
    later(() => {
      setVisible(false);
      onDone();
    }, EXIT_MS);
  }, [phase, later, onDone]);

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  };

  if (!active && !visible) return null;

  const showPortal = phase === "portal" || phase === "playing" || phase === "exit";
  const showVideo = phase === "playing" || phase === "exit";
  const showGalaxies = phase === "approach" || phase === "portal";

  return (
    <div
      className="fixed inset-0 z-50"
      style={{
        touchAction: "none",
        opacity: visible ? 1 : 0,
        transition: "opacity 0.5s ease",
        background: "#02040a",
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endPointer}
      onPointerCancel={endPointer}
    >
      {/* Звёздный туннель */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full"
        aria-hidden
      />

      {/* Реальные галактики — пролетают на фазе approach */}
      {showGalaxies && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {GALAXIES.map((src, i) => (
            <img
              key={src}
              src={src}
              alt=""
              className="absolute rounded-full object-cover opacity-0"
              style={{
                width: `${38 + i * 12}vmin`,
                height: `${38 + i * 12}vmin`,
                left: `${18 + i * 28}%`,
                top: `${12 + (i % 2) * 40}%`,
                filter: "brightness(0.75) contrast(1.1) saturate(1.15)",
                animation: `galaxy-drift ${4.5 + i * 0.8}s ease-in-out ${i * 0.35}s both`,
                boxShadow: "0 0 60px 20px rgba(80,120,200,0.15)",
              }}
            />
          ))}
        </div>
      )}

      {/* Портал + видео */}
      <div
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
        style={{
          opacity: showPortal ? 1 : 0,
          transition: "opacity 1.1s ease",
        }}
      >
        {/* Внешнее свечение портала */}
        <div
          className="absolute"
          style={{
            width: "min(86vw, 520px)",
            height: "min(86vw, 520px)",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(242,197,124,0.18) 0%, rgba(100,140,220,0.08) 45%, transparent 70%)",
            filter: "blur(8px)",
            transform: showVideo ? "scale(1.05)" : "scale(0.55)",
            transition: "transform 1.6s cubic-bezier(0.16, 1, 0.3, 1)",
            animation: phase === "portal" ? "portal-pulse 2.4s ease-in-out infinite" : undefined,
          }}
        />

        {/* Само «созвездие-портал» */}
        <div
          className="relative overflow-hidden"
          style={{
            width: "min(78vw, 440px)",
            aspectRatio: "1",
            borderRadius: "50%",
            boxShadow:
              "0 0 40px 8px rgba(242,197,124,0.25), 0 0 80px 20px rgba(120,160,255,0.12), inset 0 0 60px rgba(20,30,60,0.6)",
            transform: showVideo ? "scale(1)" : "scale(0.4)",
            opacity: showPortal ? 1 : 0,
            transition:
              "transform 1.7s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.9s ease",
            background: "radial-gradient(circle at 40% 35%, #0a1228 0%, #03060f 100%)",
          }}
        >
          {/* Точки-созвездие (видны пока видео не полностью проявилось) */}
          <div
            className="absolute inset-0"
            style={{
              opacity: showVideo ? 0 : 1,
              transition: "opacity 1.4s ease 0.3s",
            }}
          >
            {[
              [50, 28],
              [38, 42],
              [62, 42],
              [32, 58],
              [68, 58],
              [44, 70],
              [56, 70],
              [50, 48],
            ].map(([x, y], i) => (
              <span
                key={i}
                className="absolute rounded-full bg-amber"
                style={{
                  left: `${x}%`,
                  top: `${y}%`,
                  width: i === 7 ? 5 : 3.5,
                  height: i === 7 ? 5 : 3.5,
                  transform: "translate(-50%, -50%)",
                  boxShadow: "0 0 10px 2px rgba(242,197,124,0.7)",
                  animation: `star-twinkle ${1.6 + (i % 3) * 0.4}s ease-in-out ${i * 0.12}s infinite`,
                }}
              />
            ))}
            {/* Лёгкие линии созвездия */}
            <svg className="absolute inset-0 h-full w-full opacity-40" viewBox="0 0 100 100">
              <path
                d="M50 28 L38 42 L32 58 L44 70 M50 28 L62 42 L68 58 L56 70 M38 42 L50 48 L62 42"
                fill="none"
                stroke="rgba(242,197,124,0.55)"
                strokeWidth="0.6"
              />
            </svg>
          </div>

          {/* Видео внутри портала */}
          <video
            ref={videoRef}
            src={videoSrc}
            loop
            playsInline
            muted={muted}
            preload="auto"
            className="absolute inset-0 h-full w-full object-cover"
            style={{
              opacity: showVideo ? 1 : 0,
              transition: "opacity 1.5s ease",
              borderRadius: "50%",
              // Мягкие края через маску
              maskImage: "radial-gradient(circle, black 62%, transparent 88%)",
              WebkitMaskImage: "radial-gradient(circle, black 62%, transparent 88%)",
            }}
          />
        </div>
      </div>

      {/* Управление: mute + подсказка свайпа */}
      {(phase === "playing" || phase === "portal") && (
        <div
          className="pointer-events-auto absolute inset-x-0 bottom-0 flex flex-col items-center gap-3 px-4 pb-[max(1.6rem,env(safe-area-inset-bottom))]"
          style={{
            opacity: phase === "playing" ? 1 : 0,
            transition: "opacity 0.8s ease 0.6s",
          }}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleMute();
            }}
            className="glass font-system flex items-center gap-2 rounded-full px-4 py-2.5 text-[13px] font-medium text-star/90 transition-transform active:scale-[0.97]"
          >
            {muted ? (
              <>
                <span aria-hidden>🔇</span>
                включить звук
              </>
            ) : (
              <>
                <span aria-hidden>🔊</span>
                выключить звук
              </>
            )}
          </button>
          <span className="font-system caption text-[12px] font-medium tracking-[0.05em] text-star/70">
            смахни, чтобы вернуться
          </span>
        </div>
      )}

      <style>{`
        @keyframes galaxy-drift {
          0% {
            opacity: 0;
            transform: scale(0.35) translateY(40px);
          }
          25% {
            opacity: 0.85;
          }
          70% {
            opacity: 0.7;
          }
          100% {
            opacity: 0;
            transform: scale(1.35) translateY(-30px) translateX(20px);
          }
        }
        @keyframes portal-pulse {
          0%,
          100% {
            opacity: 0.85;
            transform: scale(1);
          }
          50% {
            opacity: 1;
            transform: scale(1.04);
          }
        }
        @keyframes star-twinkle {
          0%,
          100% {
            opacity: 0.55;
            transform: translate(-50%, -50%) scale(1);
          }
          50% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1.35);
          }
        }
      `}</style>
    </div>
  );
}
