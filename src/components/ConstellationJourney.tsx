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
 * внутри. Перепаковать (не перекодировать!) можно одной командой:
 * `ffmpeg -i исходник.mov -c copy -movflags +faststart meme-esc.mp4`.
 */
const VIDEO_SRC = "/memes/meme-esc.mp4";

/** Долгий разгон и подлёт — не суетимся, космос никуда не спешит. */
const FORWARD_MS = 7600;
/** Звезда сворачивается обратно — та же кривая, что открывала её, только быстрее. */
const CLOSE_MS = 950;
/** Настоящий рывок назад тоннелем — уже после того, как звезда свернулась. */
const REVERSE_MS = 1300;
/** Кнопка звука появляется рано: видео и так играет с первого кадра. */
const CONTROLS_DELAY_MS = 1400;
/** Ровно тот же порог, что в `ContentOverlay` — один и тот же жест на сайте. */
const SWIPE = 44;

type Mode = "forward" | "arrived" | "closing" | "reverse" | "done";

function clamp01(t: number) {
  return t < 0 ? 0 : t > 1 ? 1 : t;
}
function lerp(a: number, b: number, t: number) {
  return a + (b - a) * clamp01(t);
}
function mapRange(t: number, a: number, b: number) {
  return clamp01((t - a) / (b - a));
}
function easeInCubic(t: number) {
  const c = clamp01(t);
  return c * c * c;
}
function easeInOutCubic(t: number) {
  const c = clamp01(t);
  return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2;
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
  /** Свой ритм и своя фаза мерцания — на случай, когда полёт кончился
   *  и звёзды перестают лететь, но не должны застыть совсем мёртво. */
  twinkleSpeed: number;
  twinklePhase: number;
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
      twinkleSpeed: 0.5 + Math.random() * 1.2,
      twinklePhase: Math.random() * Math.PI * 2,
    });
  }
  return list;
}

/**
 * Кинематографическое путешествие к «Созвездию Вечного Смеха».
 *
 * Звезда-цель — это и есть видео с самого первого кадра полёта. Меняется
 * не ЧТО показано, а КАК: пока далеко — сильно размыто и залито тёплой
 * дымкой поверх, читается просто как тёплая точка света; чем ближе — тем
 * дымка прозрачнее и резкость выше, и настоящий кадр проступает сквозь
 * неё же, а не появляется взамен. Единственное, что вообще меняет
 * размер, — масштаб всего этого целиком; форма мягкого круга постоянна.
 *
 * Три кривые — скорость тоннеля, рост звезды, ясность видео — идут по
 * одному и тому же `progress` от начала до конца полёта и доходят до
 * своего предела ровно вместе, к самому прибытию: лёгкое движение фона
 * сохраняется вплоть до финального размера звезды, а не гаснет заранее.
 * Резкая, полностью неподвижная остановка наступает только после этого,
 * в режиме `arrived`.
 *
 * Выход — три части, а не одна. Свайп сперва СВОРАЧИВАЕТ звезду: та же
 * самая кривая, что её открывала, только в обратную сторону и быстрее, —
 * ровно то же самое «удаление», что мы видели при входе, просто задом
 * наперёд. Только когда звезда уже свернулась, начинается настоящий
 * обратный полёт тоннелем — и это по-настоящему обратное движение:
 * звёзды не «летят вперёд быстрее», а удаляются к горизонту и гаснут,
 * сходясь к центру, а не расходясь от него.
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
  const closeStartRef = useRef(0);
  const reverseStartRef = useRef(0);
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

  // Главный цикл: старт, кадр за кадром, всё сворачивание и обратный
  // полёт — всё здесь.
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
    later(() => setShowControls(true), CONTROLS_DELAY_MS);

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
    // паузу после нажатия. Оно и правда играет с первого кадра — просто
    // пока неразличимо под размытием и тёплой дымкой.
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
        if (p >= 1) modeRef.current = "arrived";
      } else if (mode === "closing") {
        // Та же самая кривая, что растила звезду при входе, — прогнанная
        // назад, от 1 к 0, и заметно быстрее. Ничего специального для
        // самого свечения/резкости считать не нужно: те формулы ниже уже
        // читают progress напрямую, так что убывающий progress сам даёт
        // ровно обратную анимацию открытия.
        const t = clamp01((now - closeStartRef.current) / CLOSE_MS);
        progressRef.current = lerp(1, 0, easeInCubic(t));
        if (t >= 1) {
          modeRef.current = "reverse";
          reverseStartRef.current = now;
        }
      } else if (mode === "reverse") {
        // Звезда уже свёрнута (progress держим на 0) — дальше это чистый
        // рывок тоннелем назад, без неё.
        progressRef.current = 0;
        const rp = clamp01((now - reverseStartRef.current) / REVERSE_MS);
        if (rp >= 1) modeRef.current = "done";
      }

      drawTunnel(ctx, window.innerWidth, window.innerHeight, dt, stars.current, progressRef.current, modeRef.current, now);

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
    if (modeRef.current !== "arrived") return;
    modeRef.current = "closing";
    setShowControls(false);
    closeStartRef.current = performance.now();
    const v = videoRef.current;
    // Пауза — где-то в середине сворачивания: к этому моменту кадр уже
    // достаточно размыт и потушен дымкой, останавливать раньше незачем.
    if (v) later(() => v.pause(), CLOSE_MS * 0.55);
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

  // Рост звезды и торможение тоннеля (см. speedFor ниже) идут по одному
  // и тому же p от 0 до 1, без отдельно settle-ящихся окон: раньше
  // тоннель успокаивался заметно раньше, чем заканчивался рост звезды,
  // и получалось «фон уже встал, а звезда всё ещё летит» — ровно то,
  // на что жаловались. Форма мягкого круга при этом ПОСТОЯННА — растёт
  // только масштаб контейнера целиком, а не ещё и маска сама по себе:
  // если бы росло и то и другое — получались бы два независимых
  // увеличения сразу.
  const starGrowth = Math.pow(p, 2.6);
  const portalScale = Math.max(0.018, starGrowth);
  const haloScale = Math.max(0.05, Math.pow(p, 2));
  const haloOpacity = mapRange(p, 0.04, 0.9) * 0.9;

  // Звезда — это и есть видео с первого кадра, не два разных слоя. Пока
  // далеко — сильно размыто и залито тёплой дымкой поверх; чем ближе —
  // тем дымка прозрачнее и резкость выше, кадр проступает сквозь неё же.
  const clarity = easeInOutCubic(p);
  const videoBlur = lerp(16, 0, clarity);
  const warmthOpacity = lerp(0.95, 0.06, clarity);
  // circle closest-side — не просто «circle»: без этого ключевого слова
  // проценты меряются до дальнего угла коробки, а не до её края, и на
  // квадратном контейнере край почти не успевает погаснуть до самых углов —
  // видимый результат выглядит квадратом со слегка скруглёнными уголками.
  const videoMask = "radial-gradient(circle closest-side, black 50%, transparent 92%)";

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

      {/* Звезда-цель — видео с первого кадра, просто пока залито тёплым
          и размыто. Внешнее гало шире и мягче, растёт по тому же самому
          progress, что и всё остальное. */}
      <div className="pointer-events-none absolute" style={{ left: "50%", top: "46%" }}>
        <div
          className="absolute rounded-full"
          style={{
            width: "min(78vw, 540px)",
            height: "min(78vw, 540px)",
            left: 0,
            top: 0,
            transform: `translate(-50%, -50%) scale(${haloScale})`,
            opacity: haloOpacity,
            background:
              "radial-gradient(circle closest-side, rgba(255,227,176,0.24) 0%, rgba(242,197,124,0.12) 38%, rgba(201,214,240,0.06) 60%, transparent 82%)",
            filter: "blur(22px)",
            transition: portalTransition + ", opacity 200ms linear",
          }}
        />
        {/* Контейнер не обрезан в жёсткий круг — форму целиком определяет
            маска ниже. Масштаб — единственное, что здесь меняет размер. */}
        <div
          className="absolute"
          style={{
            width: "min(70vw, 420px)",
            height: "min(70vw, 420px)",
            left: 0,
            top: 0,
            transform: `translate(-50%, -50%) scale(${portalScale})`,
            transition: portalTransition,
          }}
        >
          {/* Маска и блюр — на ОДНОЙ обёртке над видео и дымкой вместе,
              а не порознь на каждом слое: раньше блюр стоял только на
              видео, а у дымки (та же маска, но без блюра) край оставался
              резче — на стыке двух по-разному смягчённых краёв был виден
              шов. Теперь у них общий край, потому что они в буквальном
              смысле один и тот же размытый кусок. */}
          <div
            className="absolute inset-0"
            style={{
              maskImage: videoMask,
              WebkitMaskImage: videoMask,
              filter: `blur(${videoBlur}px)`,
              transition: "filter 200ms linear",
            }}
          >
            <video
              ref={videoRef}
              src={VIDEO_SRC}
              loop
              playsInline
              muted={muted}
              preload="auto"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div
              className="absolute inset-0"
              style={{
                opacity: warmthOpacity,
                transition: fadeTransition,
                background:
                  "radial-gradient(circle at 50% 50%, #fff6e4 0%, rgba(255,227,176,0.92) 22%, rgba(242,197,124,0.55) 45%, rgba(242,197,124,0.12) 68%, transparent 85%)",
              }}
            />
          </div>
        </div>
      </div>

      {/* Управление: звук и подсказка выхода — тот же корпус и та же кривая,
          что у полосы внизу `ContentOverlay`. Подпись кнопки не меняется
          на «включить/выключить» — от этого сама кнопка меняла ширину при
          каждом нажатии; состояние показывает только иконка. Нажатие
          гасит непрозрачность, а не масштаб, — размер кнопки теперь
          зафиксирован при любом взаимодействии. */}
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
          className="glass font-system flex items-center gap-[0.5em] rounded-full py-[0.7rem] pr-[1.25rem] pl-[1.05rem] text-[13px] font-medium text-star/90 transition-opacity duration-150 active:opacity-70"
        >
          {muted ? <IconSpeakerOff size={16} className="text-amber/90" /> : <IconSpeaker size={16} className="text-amber/90" />}
          звук
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

/**
 * Скорость тоннеля: быстро в начале, гасится к моменту прибытия почти
 * до нуля — не «медленнее», а по-настоящему «встали», — но доходит до
 * этого предела ровно к p=1, вместе с ростом звезды, а не раньше него.
 * Лёгкое движение фона сохраняется вплоть до финального размера звезды —
 * раньше тоннель успокаивался заметно раньше, и получалось «одно уже
 * встало, другое всё ещё летит».
 */
function speedFor(progress: number, mode: Mode) {
  if (mode === "reverse") return 3.4;
  return lerp(2.2, 0.015, easeInOutCubic(progress));
}
/** Яркость самого тоннеля: гаснет по мере роста звезды, чтобы не спорить с её светом. */
function dimFor(progress: number, mode: Mode) {
  if (mode === "reverse") return 1;
  return lerp(1, 0.55, easeInOutCubic(progress));
}

function drawTunnel(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  dt: number,
  starsList: Star[],
  progress: number,
  mode: Mode,
  now: number,
) {
  const cx = w / 2;
  const cy = h * 0.46;

  ctx.fillStyle = "#05070f";
  ctx.fillRect(0, 0, w, h);

  // «arrived» и «closing» — тоннель стоит: звёзды не едут дальше по z
  // и не оставляют хвост, только мерцают каждая в своём ритме. «closing»
  // намеренно входит сюда же: пока звезда сворачивается, фон остаётся
  // неподвижным — это ЕЁ собственное закрытие, не полёт тоннелем ещё раз.
  //
  // «reverse» — единственная фаза настоящего обратного движения. Раньше
  // здесь просто ускоряли тот же самый «полёт вперёд» (z продолжала
  // уменьшаться, только быстрее) — отсюда и жалоба «снова летим прямо
  // к звезде». Настоящее движение назад — это z, которая РАСТЁТ: звёзды
  // удаляются к горизонту, сходясь к центру и гаснущие, а не расходящиеся
  // от него.
  const stopped = mode === "arrived" || mode === "closing";
  const reversing = mode === "reverse";
  const speedMul = speedFor(progress, mode);
  const dim = dimFor(progress, mode);

  for (const s of starsList) {
    if (!stopped) {
      const delta = s.speed * speedMul * (dt / 16);
      if (reversing) {
        s.z += delta;
        if (s.z >= 1.2) {
          s.z = 0.04 + Math.random() * 0.08;
          s.x = (Math.random() - 0.5) * 2;
          s.y = (Math.random() - 0.5) * 2;
        }
      } else {
        s.z -= delta;
        if (s.z <= 0.02) {
          s.z = 1.15;
          s.x = (Math.random() - 0.5) * 2;
          s.y = (Math.random() - 0.5) * 2;
        }
      }
    }

    const k = 0.55 / s.z;
    const px = cx + s.x * k * w * 0.55;
    const py = cy + s.y * k * h * 0.55;

    const base = Math.min(1, (1.1 - s.z) * 1.4);
    let alpha: number;
    if (stopped) {
      // Независимое дыхание света — небо стоит, но не мертво.
      const twinkle = 0.72 + 0.28 * Math.sin(now * 0.0015 * s.twinkleSpeed + s.twinklePhase);
      alpha = base * twinkle * dim;
    } else {
      alpha = base * dim;
    }
    if (alpha < 0.03) continue;

    const color = s.warm ? "255, 227, 176" : "201, 214, 240";

    if (!stopped) {
      const trailDelta = s.speed * speedMul * 3;
      const prevZ = reversing ? Math.max(0.02, s.z - trailDelta) : s.z + trailDelta;
      const prevK = 0.55 / prevZ;
      const prevX = cx + s.x * prevK * w * 0.55;
      const prevY = cy + s.y * prevK * h * 0.55;
      ctx.beginPath();
      ctx.strokeStyle = `rgba(${color}, ${alpha * 0.8})`;
      ctx.lineWidth = Math.max(0.6, s.size * (1.2 - s.z) * 1.1);
      ctx.moveTo(prevX, prevY);
      ctx.lineTo(px, py);
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.fillStyle = `rgba(${color}, ${alpha})`;
    ctx.arc(px, py, Math.max(0.4, s.size * (1.15 - s.z) * 0.55), 0, Math.PI * 2);
    ctx.fill();
  }
}
