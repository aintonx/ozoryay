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
 * Две части, а не одно смешанное движение. Первая (примерно до половины
 * пути): полёт, торможение тоннеля и рост звезды-цели — вместе доходят
 * до нуля к одному и тому же моменту, а не порознь, иначе казалось бы,
 * что фон уже встал, а звезда всё ещё летит на нас. Вторая: сцена
 * полностью неподвижна, и только тогда, в этой самой неподвижности,
 * начинает раскрываться видео — не кроссфейдом поверх точки, а прорастая
 * из её же центра наружу, оставаясь расфокусированным почти до самого
 * конца. Сама звезда-цель горит тёплым (amber-hot) с первого кадра —
 * едва заметной точкой среди обычных, холодных звёзд, — мысль в том, что
 * видео не «появляется из портала», а было этой самой звездой всё время,
 * просто слишком далеко, чтобы разглядеть.
 *
 * Когда долетели — фон по-настоящему останавливается, а не просто
 * притормаживает: звёзды замирают на месте и лишь мерцают, каждая в своём
 * ритме, вместо того чтобы продолжать тихо течь мимо.
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

  // Рост звезды заканчивается заметно раньше конца пути (к p=0.55), а не
  // тянется до самогоp=1: раньше скорость тоннеля гасла быстрее, чем
  // растущая звезда, и получалось «фон уже встал, а звезда всё ещё летит
  // на нас» — тот самый разнобой. Теперь оба процесса — торможение тоннеля
  // и рост звезды — завершаются примерно вместе, и дальше, во второй
  // половине пути, сцена уже полностью неподвижна: там только раскрывается
  // видео, и больше ничто не отвлекает.
  const growthT = mapRange(p, 0, 0.55);
  const starGrowth = Math.pow(growthT, 2.4);
  const portalScale = Math.max(0.018, starGrowth);
  const haloScale = Math.max(0.05, Math.pow(growthT, 1.8));
  const haloOpacity = mapRange(p, 0.04, 0.5) * 0.9;

  // Видео не проступает кроссфейдом поверх точки — оно прорастает из её
  // же центра наружу, и всё это время остаётся расфокусированным, пока
  // мы не долетели по-настоящему. Кроссфейд между «мягким светом» и
  // «резким кадром» всегда читается как замена одного другим, сколько
  // секунд ему ни давай, — а не как «свет оказался движением»: контент
  // мгновенно меняет характер, даже если непрозрачность меняется плавно.
  // Поэтому вместо opacity управляем именно формой маски: сначала почти
  // весь круг прозрачен, кроме едва заметной точки в центре, — та же
  // точка, что и всегда была теплом внутри звезды, — и лишь эта точка
  // медленно раздаётся вширь, оставаясь мутной почти до самого конца.
  // Окно начинается ровно там, где кончается рост (0.55) — без зазора
  // и без наложения: звезда сперва долетает и замирает, и только потом,
  // уже в неподвижном кадре, начинает раскрываться.
  const revealT = easeInOutCubic(mapRange(p, 0.55, 1));
  const videoCore = lerp(0.5, 46, revealT);
  const videoEdge = lerp(24, 98, revealT);
  const videoBlur = lerp(11, 0, revealT);
  // circle closest-side — не просто «circle»: без этого ключевого слова
  // проценты меряются до дальнего угла коробки, а не до её края, и на
  // квадратном контейнере край почти не успевает погаснуть до самых углов —
  // видимый результат выглядит квадратом со слегка скруглёнными уголками,
  // а не кругом. Ровно это и превращало звезду в квадрат.
  const videoMask = `radial-gradient(circle closest-side, black ${videoCore}%, transparent ${videoEdge}%)`;

  // Тёплая точка не гаснет напротив видео — она остаётся тем самым фоном,
  // из которого прорастает свет, и лишь чуть отступает к самому финалу.
  const dotOpacity = lerp(1, 0.82, revealT);

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

      {/* Звезда-цель: горела тёплой точкой с первого кадра, теперь выросла
          и стала видео — не сменилась им, а проросла им из своего же
          центра. Внешнее гало шире и мягче, растёт чуть иначе, чем то,
          что внутри него светится. */}
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
        {/* Контейнер больше не обрезан в жёсткий круг: раньше overflow-hidden
            + rounded-full давали собственную ровную границу поверх маски
            видео, и на стыке двух разных краёв читался тонкий, но заметный
            «диск» — именно та резкость, на которую жаловались. Теперь
            форму целиком определяет сама маска ниже, а она растворяется
            в пустоте намного раньше, чем кончается коробка. */}
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
          <div
            className="absolute inset-0"
            style={{
              opacity: dotOpacity,
              transition: fadeTransition,
              background:
                "radial-gradient(circle closest-side at 50% 50%, #fff6e4 0%, rgba(255,227,176,0.92) 22%, rgba(242,197,124,0.55) 45%, rgba(242,197,124,0.12) 68%, transparent 85%)",
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
              transition: "filter 200ms linear",
              filter: `blur(${videoBlur}px)`,
              maskImage: videoMask,
              WebkitMaskImage: videoMask,
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

/**
 * Скорость тоннеля: быстро в начале, гасится к моменту прибытия почти
 * до нуля — не «медленнее», а по-настоящему «встали». Гасится к p=0.48,
 * чуть раньше, чем заканчивается рост звезды (p=0.55): торможение должно
 * завершиться первым, звезда — чуть позже него, и только тогда, когда
 * оба процесса действительно кончились, начинает раскрываться видео —
 * без пересечения, где одно как будто уже встало, а другое всё ещё летит.
 */
function speedFor(progress: number, mode: Mode) {
  if (mode === "reverse") return 3.2;
  const t = mapRange(progress, 0, 0.48);
  return lerp(2.2, 0.015, easeInOutCubic(t));
}
/** Яркость самого тоннеля: чуть гаснет по мере роста звезды, чтобы не спорить с её светом. */
function dimFor(progress: number, mode: Mode) {
  if (mode === "reverse") return 1;
  if (progress > 0.35) return lerp(1, 0.5, mapRange(progress, 0.35, 0.55));
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
  now: number,
) {
  const cx = w / 2;
  const cy = h * 0.46;

  ctx.fillStyle = "#05070f";
  ctx.fillRect(0, 0, w, h);

  // «arrived» — корабль встал. Звёзды не едут дальше по z и не оставляют
  // хвост: только мерцают каждая в своём ритме. Иначе даже остаточная
  // скорость 0.015 за много секунд идле-состояния накопится в заметный
  // снос, и небо будет выглядеть не остановившимся, а просто очень
  // медленно ползущим — то же ощущение обмана, только растянутое во времени.
  const stopped = mode === "arrived";
  const speedMul = speedFor(progress, mode);
  const dim = dimFor(progress, mode);

  for (const s of starsList) {
    if (!stopped) {
      s.z -= s.speed * speedMul * (dt / 16);
      if (s.z <= 0.02) {
        s.z = 1.15;
        s.x = (Math.random() - 0.5) * 2;
        s.y = (Math.random() - 0.5) * 2;
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
      const prevK = 0.55 / (s.z + s.speed * speedMul * 3);
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
