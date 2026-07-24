"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import LetterField from "./LetterField";
import Overlay from "./Overlay";
import Projector from "./Projector";
import Sky from "./Sky";
import TitleDawn from "./TitleDawn";
import type { Settings } from "@/lib/defaults";
import type { ProjectorImage } from "@/lib/sky/projector";
import { useMemories } from "@/lib/useMemories";
import { constellationChains, speakingLetters, type Letter } from "@/lib/letters";
import {
  getOpenedServerSnapshot,
  getOpenedSnapshot,
  markOpened,
  subscribeOpened,
} from "@/lib/openedStore";
import { makeDayStar } from "@/lib/sky/stars";
import { useReducedMotion } from "@/lib/useReducedMotion";

const NIGHT_KEY = "ozoryay.lastNight";
const PROJECTOR_SEEN_KEY = "ozoryay.projectorSeen";
const OBSESSION_MS = 2600;
const HINT_MS = 1100;
const BIRTH_DELAY_MS = 1500;
const BIRTH_TOTAL_MS = 7200;
// После заголовка-рассвета (~10с): сначала слова из-за горизонта, потом память.
const PROJECTOR_AUTOFIRE_MS = 10800;

interface NightProps {
  days: number;
  hours: number;
  settings: Settings;
  letters: Letter[];
}

/**
 * Владелец состояния ночи. Небо, текст и письма должны знать друг о друге:
 * когда письмо раскрывается, небо притухает, а строки счётчика уходят в тень.
 */
export default function Night({ days, hours, settings, letters }: NightProps) {
  const [openId, setOpenId] = useState<number | null>(null);
  const [hintId, setHintId] = useState<number | null>(null);
  const [obsessionId, setObsessionId] = useState<number | null>(null);
  const [birthNight, setBirthNight] = useState<number | null>(null);
  const [projector, setProjector] = useState<{ image: ProjectorImage | null; token: number }>({
    image: null,
    token: 0,
  });
  const [projectorPlaying, setProjectorPlaying] = useState(false);
  const timers = useRef<number[]>([]);
  const reducedMotion = useReducedMotion();
  const { takeNext } = useMemories();
  const openedIds = useSyncExternalStore(
    subscribeOpened,
    getOpenedSnapshot,
    getOpenedServerSnapshot,
  );

  useEffect(() => {
    // Рождение звезды — раз в сутки, а не на каждую перезагрузку.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    try {
      const seen = Number(localStorage.getItem(NIGHT_KEY) ?? 0);
      if (days > seen) {
        localStorage.setItem(NIGHT_KEY, String(days));
        timers.current.push(window.setTimeout(() => setBirthNight(days), BIRTH_DELAY_MS));
        timers.current.push(
          window.setTimeout(() => setBirthNight(null), BIRTH_DELAY_MS + BIRTH_TOTAL_MS),
        );
      }
    } catch {
      // Без хранилища рождение просто не показывается — небо от этого не страдает.
    }
  }, [days]);

  // Запуск прожектора. Пока идёт прокат — новый клик игнорируется.
  const fireProjector = useCallback(async () => {
    setProjectorPlaying((busy) => {
      if (busy) return busy;
      // Раскрытое письмо закрываем: два источника света спорить не должны.
      setOpenId(null);
      setObsessionId(null);
      void takeNext().then((image) => {
        setProjector((p) => ({ image, token: p.token + 1 }));
      });
      return true;
    });
  }, [takeNext]);

  const onProjectorDone = useCallback(() => setProjectorPlaying(false), []);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((t) => clearTimeout(t));
  }, []);

  // При первом визите прожектор срабатывает сам — иначе половина гостей
  // не догадается кликнуть. Только один раз и не при reduced-motion.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    try {
      if (localStorage.getItem(PROJECTOR_SEEN_KEY)) return;
      localStorage.setItem(PROJECTOR_SEEN_KEY, "1");
    } catch {
      return;
    }
    timers.current.push(window.setTimeout(() => void fireProjector(), PROJECTOR_AUTOFIRE_MS));
  }, [fireProjector]);

  // Звезда без текста на небо не выходит: слот 19 ждёт своих слов.
  const visible = useMemo(
    () => letters.filter((l) => l.isEternal || l.text.trim().length > 0),
    [letters],
  );
  const speaking = useMemo(() => speakingLetters(letters), [letters]);
  const chains = useMemo(
    () => constellationChains(letters).map((c) => c.map((l) => ({ x: l.starX, y: l.starY }))),
    [letters],
  );

  const skyLetters = useMemo(
    () =>
      visible.map((l) => ({
        id: l.id,
        x: l.starX,
        y: l.starY,
        isEternal: l.isEternal,
        opened: openedIds.includes(l.id),
      })),
    [visible, openedIds],
  );

  const activate = useCallback((l: Letter) => {
    if (l.special === "obsession") {
      // Это не письмо: панель не открывается, звезда просто заходится.
      setOpenId(null);
      setObsessionId(l.id);
      markOpened(l.id);
      timers.current.push(window.setTimeout(() => setObsessionId(null), OBSESSION_MS));
      return;
    }
    setObsessionId(null);
    setHintId(null);
    setOpenId(l.id);
    markOpened(l.id);
  }, []);

  const close = useCallback(() => {
    const current = openId;
    setOpenId(null);
    if (current === null) return;

    // Ближайшая неоткрытая звезда на секунду разгорается ярче — тянет дальше.
    // Получается тропинка через всё небо, но никто не заставляет.
    const from = visible.find((l) => l.id === current);
    if (!from) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let best: Letter | null = null;
    let bestDist = Infinity;
    for (const l of speaking) {
      if (l.id === current || openedIds.includes(l.id)) continue;
      const dx = (l.starX - from.starX) * vw;
      const dy = (l.starY - from.starY) * vh;
      const d = dx * dx + dy * dy;
      if (d < bestDist) {
        bestDist = d;
        best = l;
      }
    }
    if (best) {
      setHintId(best.id);
      timers.current.push(window.setTimeout(() => setHintId(null), HINT_MS));
    }
  }, [openId, visible, speaking, openedIds]);

  const openedCount = useMemo(
    () => speaking.filter((l) => openedIds.includes(l.id)).length,
    [speaking, openedIds],
  );

  return (
    <>
      <Sky
        days={days}
        bearingDeg={settings.bearingDeg}
        letters={skyLetters}
        chains={chains}
        openId={openId}
        hintId={hintId}
        obsessionId={obsessionId}
        birthNight={birthNight}
        projectorImage={projector.image}
        projectorToken={projector.token}
        onProjectorDone={onProjectorDone}
        reducedMotion={reducedMotion}
      />
      <Overlay
        initial={{ days, hours }}
        separationStart={settings.separationStart}
        herTimezone={settings.herTimezone}
        distanceKm={settings.distanceKm}
        dimmed={openId !== null || projectorPlaying}
        lettersTotal={speaking.length}
        lettersOpened={openedCount}
      />
      <LetterField
        letters={visible}
        openId={openId}
        obsessionId={obsessionId}
        onActivate={activate}
        onClose={close}
        reducedMotion={reducedMotion}
      />
      <Projector onFire={fireProjector} playing={projectorPlaying} />
      {birthNight !== null && <BirthLabel night={birthNight} />}
      <TitleDawn />
    </>
  );
}

/**
 * Подпись к рождающейся звезде. Проступает, когда звезда уже разгорелась,
 * и тает вместе с её лишней яркостью.
 */
function BirthLabel({ night }: { night: number }) {
  const star = makeDayStar(night);
  // У правого края подпись разворачивается влево, иначе уезжает за экран.
  const toLeft = star.x > 0.72;

  return (
    <div
      className="birth-label font-mono pointer-events-none fixed z-30 text-[11px] font-extralight tracking-[0.2em] whitespace-nowrap text-star/55"
      style={{
        left: `${star.x * 100}%`,
        top: `${star.y * 100}%`,
        transform: toLeft ? "translate(calc(-100% - 14px), -50%)" : "translate(14px, -50%)",
      }}
      aria-hidden="true"
    >
      ночь №{night}
    </div>
  );
}
