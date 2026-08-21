"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { IconSpeaker, IconSpeakerOff } from "./ui/Icons";

interface ConstellationJourneyProps {
  /** Запустить (true) или остановить (false) путешествие */
  active: boolean;
  /** Вызывается при завершении путешествия */
  onComplete?: () => void;
  /** Вызывается при ручном закрытии */
  onClose?: () => void;
}

type Phase = "intro" | "journey" | "arrival";

const STARS = [
  { x: 12, y: 18, r: 1.2, d: 0 },
  { x: 23, y: 32, r: 0.8, d: 0.4 },
  { x: 34, y: 14, r: 1.4, d: 0.8 },
  { x: 47, y: 26, r: 0.9, d: 0.2 },
  { x: 58, y: 11, r: 1.1, d: 1.2 },
  { x: 69, y: 34, r: 1.5, d: 0.6 },
  { x: 81, y: 20, r: 0.7, d: 1 },
  { x: 91, y: 39, r: 1.2, d: 0.3 },
  { x: 8, y: 58, r: 0.9, d: 1.1 },
  { x: 19, y: 73, r: 1.4, d: 0.5 },
  { x: 31, y: 49, r: 0.8, d: 0.7 },
  { x: 42, y: 66, r: 1.1, d: 0.1 },
  { x: 53, y: 82, r: 1.5, d: 0.9 },
  { x: 65, y: 55, r: 0.7, d: 1.3 },
  { x: 76, y: 71, r: 1.2, d: 0.4 },
  { x: 88, y: 86, r: 0.9, d: 1.1 },
  { x: 96, y: 61, r: 1.3, d: 0.2 },
  { x: 5, y: 91, r: 0.7, d: 0.8 },
  { x: 28, y: 94, r: 1.1, d: 1.4 },
  { x: 49, y: 43, r: 0.6, d: 0.6 },
  { x: 73, y: 47, r: 0.9, d: 1 },
  { x: 84, y: 8, r: 1.3, d: 0.3 },
];

const JOURNEY_DURATION = 9500;
const INTRO_DURATION = 2200;
const ARRIVAL_DURATION = 2800;

export default function ConstellationJourney({
  active,
  onComplete,
  onClose,
}: ConstellationJourneyProps) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [progress, setProgress] = useState(0);
  const [muted, setMuted] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const startedAtRef = useRef<number | null>(null);

  const stopAudio = useCallback(() => {
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => undefined);
      audioContextRef.current = null;
    }
  }, []);

  const playAmbient = useCallback(() => {
    if (muted) return;

    try {
      const AudioCtx =
        window.AudioContext ||
        (window as typeof window & {
          webkitAudioContext?: typeof AudioContext;
        }).webkitAudioContext;

      if (!AudioCtx) return;

      const context = new AudioCtx();
      audioContextRef.current = context;

      const master = context.createGain();
      master.gain.setValueAtTime(0.0001, context.currentTime);
      master.gain.exponentialRampToValueAtTime(
        0.07,
        context.currentTime + 2,
      );
      master.connect(context.destination);

      const oscillator = context.createOscillator();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(55, context.currentTime);

      const gain = context.createGain();
      gain.gain.setValueAtTime(0.0001, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(
        0.16,
        context.currentTime + 3,
      );

      oscillator.connect(gain);
      gain.connect(master);

      const shimmer = context.createOscillator();
      shimmer.type = "sine";
      shimmer.frequency.setValueAtTime(220, context.currentTime);

      const shimmerGain = context.createGain();
      shimmerGain.gain.setValueAtTime(0.0001, context.currentTime);
      shimmerGain.gain.exponentialRampToValueAtTime(
        0.025,
        context.currentTime + 4,
      );

      shimmer.connect(shimmerGain);
      shimmerGain.connect(master);

      oscillator.start();
      shimmer.start();

      oscillator.stop(context.currentTime + 16);
      shimmer.stop(context.currentTime + 16);
    } catch {
      // Звук является декоративным элементом, поэтому молча игнорируем ошибку.
    }
  }, [muted]);

  useEffect(() => {
    if (!active) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }

      stopAudio();
      setPhase("intro");
      setProgress(0);
      startedAtRef.current = null;

      return;
    }

    setPhase("intro");
    setProgress(0);
    startedAtRef.current = performance.now();

    playAmbient();

    const animate = (now: number) => {
      const startedAt = startedAtRef.current ?? now;
      const elapsed = now - startedAt;

      if (elapsed < INTRO_DURATION) {
        setPhase("intro");
        setProgress(0);
      } else if (elapsed < INTRO_DURATION + JOURNEY_DURATION) {
        setPhase("journey");

        const journeyElapsed = elapsed - INTRO_DURATION;
        const journeyProgress = Math.min(
          1,
          journeyElapsed / JOURNEY_DURATION,
        );

        setProgress(journeyProgress);
      } else if (
        elapsed <
        INTRO_DURATION + JOURNEY_DURATION + ARRIVAL_DURATION
      ) {
        setPhase("arrival");
        setProgress(1);
      } else {
        setPhase("arrival");
        setProgress(1);

        animationFrameRef.current = null;
        stopAudio();
        onComplete?.();

        return;
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }

      stopAudio();
    };
  }, [active, onComplete, playAmbient, stopAudio]);

  useEffect(() => {
    if (!active) return;

    if (muted) {
      stopAudio();
      return;
    }

    if (audioContextRef.current) return;

    playAmbient();
  }, [active, muted, playAmbient, stopAudio]);

  if (!active) return null;

  const journeyScale = 1 + progress * 5.5;
  const tunnelOpacity =
    phase === "journey"
      ? Math.min(1, progress * 3)
      : phase === "arrival"
        ? 1
        : 0;

  const destinationOpacity =
    phase === "arrival"
      ? 1
      : Math.max(0, (progress - 0.82) / 0.18);

  const showIntro = phase === "intro";

  return (
    <div
      className="fixed inset-0 z-[100] overflow-hidden bg-[#020205] text-white"
      aria-label="Путешествие по созвездиям"
      role="dialog"
      aria-modal="true"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,#141321_0%,#07070c_42%,#020205_78%)]" />

      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
        }}
      />

      <div className="absolute inset-0 overflow-hidden">
        {STARS.map((star, index) => {
          const centerX = 50;
          const centerY = 50;

          const dx = star.x - centerX;
          const dy = star.y - centerY;

          const x =
            phase === "journey"
              ? centerX + dx * journeyScale
              : star.x;

          const y =
            phase === "journey"
              ? centerY + dy * journeyScale
              : star.y;

          const opacity =
            phase === "intro"
              ? 0.25 + ((index % 5) / 5) * 0.55
              : phase === "journey"
                ? Math.max(0, 1 - progress * 0.65)
                : 0.12;

          return (
            <span
              key={`${star.x}-${star.y}-${index}`}
              className="absolute rounded-full bg-white"
              style={{
                left: `${x}%`,
                top: `${y}%`,
                width: `${star.r * 2}px`,
                height: `${star.r * 2}px`,
                opacity,
                transform: "translate(-50%, -50%)",
                boxShadow:
                  star.r > 1
                    ? `0 0 ${star.r * 5}px rgba(255,255,255,0.85)`
                    : "0 0 4px rgba(255,255,255,0.55)",
                transition:
                  phase === "journey"
                    ? "left 80ms linear, top 80ms linear, opacity 120ms linear"
                    : "opacity 350ms ease",
                animation: `constellationTwinkle 2.8s ${star.d}s ease-in-out infinite alternate`,
              }}
            />
          );
        })}
      </div>

      <div
        className="absolute left-1/2 top-1/2 h-[2px] w-[2px] rounded-full bg-white"
        style={{
          transform: `translate(-50%, -50%) scale(${phase === "journey" ? 1 + progress * 20 : 1})`,
          opacity: phase === "journey" ? 0.25 + progress * 0.7 : 0,
          boxShadow:
            "0 0 25px 8px rgba(255,255,255,0.25), 0 0 100px 35px rgba(120,110,255,0.12)",
          transition: "transform 120ms linear, opacity 200ms ease",
        }}
      />

      <div
        className="pointer-events-none absolute inset-0"
        style={{
          opacity: tunnelOpacity,
          background:
            "radial-gradient(circle at center, transparent 0%, transparent 4%, rgba(110,90,255,0.05) 14%, rgba(255,255,255,0.02) 25%, transparent 42%)",
        }}
      />

      <div
        className="pointer-events-none absolute inset-0"
        style={{
          opacity: phase === "journey" ? Math.min(0.7, progress * 0.9) : 0,
          background:
            "radial-gradient(ellipse at center, rgba(255,255,255,0.12) 0%, rgba(173,154,255,0.05) 20%, transparent 60%)",
          transform: `scale(${1 + progress * 1.8})`,
          transition: "opacity 200ms ease, transform 120ms linear",
        }}
      />

      <div
        className="pointer-events-none absolute inset-0"
        style={{
          opacity:
            phase === "arrival"
              ? Math.min(
                  0.95,
                  0.3 +
                    ((performance.now() -
                      (startedAtRef.current ?? performance.now()) -
                      INTRO_DURATION -
                      JOURNEY_DURATION) /
                      ARRIVAL_DURATION) *
                      0.7,
                )
              : 0,
          background:
            "radial-gradient(circle at 50% 48%, rgba(255,255,255,0.95) 0%, rgba(232,226,255,0.55) 8%, rgba(161,136,255,0.2) 25%, transparent 52%)",
          transition: "opacity 800ms ease",
        }}
      />

      <div className="absolute left-1/2 top-1/2 z-10 flex w-full max-w-3xl -translate-x-1/2 -translate-y-1/2 flex-col items-center px-6 text-center">
        <div
          className="transition-all duration-1000 ease-out"
          style={{
            opacity: showIntro ? 1 : 0,
            transform: showIntro
              ? "translateY(0px) scale(1)"
              : "translateY(-20px) scale(0.97)",
            pointerEvents: showIntro ? "auto" : "none",
          }}
        >
          <div className="mb-6 text-[10px] font-medium uppercase tracking-[0.5em] text-white/45 sm:text-xs">
            Apertura
          </div>

          <h1 className="font-serif text-4xl font-light tracking-tight text-white sm:text-6xl md:text-7xl">
            Путешествие начинается
          </h1>

          <p className="mx-auto mt-6 max-w-md text-sm leading-7 text-white/45 sm:text-base">
            Один импульс.
            <br />
            Одно направление.
            <br />
            И бесконечность между ними.
          </p>
        </div>

        <div
          className="absolute w-full transition-all duration-700 ease-out"
          style={{
            opacity: phase === "journey" ? 1 : 0,
            transform:
              phase === "journey"
                ? "translateY(0px)"
                : "translateY(14px)",
          }}
        >
          <div className="text-[10px] font-medium uppercase tracking-[0.5em] text-white/35 sm:text-xs">
            Сигнал принят
          </div>

          <div className="mt-6 font-serif text-2xl font-light text-white/90 sm:text-4xl">
            Следуй за светом
          </div>

          <div className="mx-auto mt-8 h-px w-44 overflow-hidden bg-white/10">
            <div
              className="h-full bg-white/80 transition-[width] duration-100"
              style={{ width: `${progress * 100}%` }}
            />
          </div>

          <div className="mt-3 text-[10px] tracking-[0.25em] text-white/30">
            {Math.round(progress * 100)}%
          </div>
        </div>

        <div
          className="absolute w-full transition-all duration-[1200ms] ease-out"
          style={{
            opacity: destinationOpacity,
            transform:
              destinationOpacity > 0
                ? "translateY(0px) scale(1)"
                : "translateY(24px) scale(0.98)",
          }}
        >
          <div className="mb-5 text-[10px] uppercase tracking-[0.55em] text-white/45">
            Координаты совпали
          </div>

          <div className="font-serif text-4xl font-light tracking-tight text-white sm:text-6xl">
            Ты прибыл
          </div>

          <p className="mx-auto mt-6 max-w-md text-sm leading-7 text-white/50 sm:text-base">
            Некоторые вещи находят нас
            <br />
            раньше, чем мы успеваем
            <br />
            начать их искать.
          </p>
        </div>
      </div>

      <div className="absolute left-0 right-0 top-0 z-20 flex items-center justify-between px-5 py-5 sm:px-8 sm:py-7">
        <button
          type="button"
          onClick={() => setMuted((value) => !value)}
          className="group flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/10 text-white/55 backdrop-blur-sm transition hover:border-white/25 hover:text-white"
          aria-label={muted ? "Включить звук" : "Выключить звук"}
        >
          {muted ? (
            <IconSpeakerOff className="h-4 w-4" />
          ) : (
            <IconSpeaker className="h-4 w-4" />
          )}
        </button>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-[10px] uppercase tracking-[0.28em] text-white/30 transition hover:text-white/75"
          >
            Пропустить
          </button>
        )}
      </div>

      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-[#020205] via-[#020205]/30 to-transparent" />

      <style jsx>{`
        @keyframes constellationTwinkle {
          0% {
            opacity: 0.35;
            transform: translate(-50%, -50%) scale(0.85);
          }

          100% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1.2);
          }
        }
      `}</style>
    </div>
  );
}