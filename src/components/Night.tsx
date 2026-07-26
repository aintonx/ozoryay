"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import HomeScreen from "./HomeScreen";
import Screens, { type ScreenIndex } from "./Screens";
import SkyScreen, { type SparkKind } from "./SkyScreen";
import Sky from "./Sky";
import SparkText from "./SparkText";
import TitleDawn from "./TitleDawn";
import type { Settings } from "@/lib/defaults";
import { speakingLetters, type Letter } from "@/lib/letters";
import { MEMORIES } from "@/lib/memories";
import type { ProjectorImage } from "@/lib/sky/projector";
import { useDeck } from "@/lib/useDeck";
import { useMemories } from "@/lib/useMemories";
import { useObserver } from "@/lib/useObserver";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { useSeparationCounter } from "@/lib/time/useSeparationDays";

/** Сколько держится текст вспышки. */
const SPARK_MS = 9000;
/** Сколько висит подсказка. */
const HINT_MS = 5600;
/** Пока летит поцелуй, кнопка ждёт. */
const KISS_MS = 2600;
/** Реплики диалога получают номера отсюда — чтобы не путались с письмами. */
const DIALOG_ID_BASE = 1000;
/** Сколько отговоривших звёзд остаётся гореть, прежде чем самые старые гаснут. */
const LIT_LIMIT = 30;

const HINT_TEXT = "нажми ещё раз — загорится новая звезда";

interface NightProps {
  settings: Settings;
  letters: Letter[];
}

/** Что сейчас горит в небе. */
interface Spark {
  /** Свой у каждой звезды: по нему её узнаёт небо и не зажигает дважды. */
  id: number;
  /** Позиция звезды в долях вьюпорта. */
  x: number;
  y: number;
  text: string;
  /** Подпись под текстом: дата события или «моё послание». */
  note?: string;
  /** Чей голос — от этого зависит цвет текста. */
  voice?: "her" | "him";
}

/**
 * Владелец состояния ночи.
 *
 * Два экрана над одним небом: виджеты и само небо. Небо не перерисовывается
 * при переходе — уезжает только интерфейс, будто подняли глаза.
 */
export default function Night({ settings, letters }: NightProps) {
  const counter = useSeparationCounter(settings.separationStart, settings.herTimezone);
  const observer = useObserver({
    lat: settings.herLat,
    lon: settings.herLon,
    city: settings.herCity,
  });
  const reducedMotion = useReducedMotion();
  const { takeNext } = useMemories();

  const [screen, setScreen] = useState<ScreenIndex>(0);
  const [spark, setSpark] = useState<Spark | null>(null);
  // Отговорившие звёзды остаются в небе тёплым следом: за вечер оно
  // потихоньку заселяется тем, что мы друг другу сказали.
  const [lit, setLit] = useState<Array<{ id: number; x: number; y: number }>>([]);
  const [hint, setHint] = useState(false);
  const [projector, setProjector] = useState<{ image: ProjectorImage | null; token: number }>({
    image: null,
    token: 0,
  });
  const [projectorPlaying, setProjectorPlaying] = useState(false);
  const [kissToken, setKissToken] = useState(0);
  const [kissInFlight, setKissInFlight] = useState(false);

  const timers = useRef<number[]>([]);
  const sparkTimer = useRef<number | undefined>(undefined);
  const dialogCount = useRef(0);
  const hintSeen = useRef(false);

  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach((t) => window.clearTimeout(t));
      window.clearTimeout(sparkTimer.current);
    };
  }, []);

  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  }, []);

  // Письма, которым есть что сказать: без пустых слотов и без вечной звезды.
  const speaking = useMemo(() => speakingLetters(letters), [letters]);

  const letterDeck = useDeck(speaking);
  const dialogDeck = useDeck(MEMORIES);

  /**
   * Куда посадить звезду очередной реплики.
   *
   * У писем позиции свои, заданные навсегда. У реплик из переписки их нет —
   * поэтому раскладываем по золотому углу: точки ложатся равномерно и
   * не совпадают, сколько бы их ни было.
   */
  const dialogSpot = useCallback((n: number) => {
    const golden = 2.39996;
    const t = n * golden;
    const r = 0.14 + 0.28 * Math.sqrt((n % 9) / 9);
    return {
      x: Math.min(0.86, Math.max(0.14, 0.5 + Math.cos(t) * r * 1.2)),
      y: Math.min(0.56, Math.max(0.13, 0.33 + Math.sin(t) * r)),
    };
  }, []);

  const showSpark = useCallback(
    (s: Spark) => {
      window.clearTimeout(sparkTimer.current);
      setSpark(s);
      // Одна и та же звезда не заводится дважды: письма приходят со своими
      // номерами, и после нового круга колоды позиция бы просто задвоилась.
      setLit((prev) =>
        prev.some((p) => p.id === s.id)
          ? prev
          : [...prev, { id: s.id, x: s.x, y: s.y }].slice(-LIT_LIMIT),
      );
      sparkTimer.current = window.setTimeout(() => setSpark(null), SPARK_MS);

      // Подсказка — один раз за визит и только после того, как первая звезда
      // отговорила: поверх горящего текста она была бы суетой.
      if (!hintSeen.current) {
        hintSeen.current = true;
        later(() => setHint(true), SPARK_MS + 400);
        later(() => setHint(false), SPARK_MS + 400 + HINT_MS);
      }
    },
    [later],
  );

  const onSpark = useCallback(
    (kind: SparkKind) => {
      if (kind === "memory") {
        if (projectorPlaying) return;
        setSpark(null);
        setProjectorPlaying(true);
        void takeNext().then((image) => {
          setProjector((p) => ({ image, token: p.token + 1 }));
        });
        return;
      }

      if (kind === "letter") {
        const l = letterDeck.draw();
        if (!l) return;
        showSpark({ id: l.id, x: l.starX, y: l.starY, text: l.text, note: "моё послание" });
      } else {
        const m = dialogDeck.draw();
        if (!m) return;
        const n = dialogCount.current++;
        showSpark({
          id: DIALOG_ID_BASE + n,
          ...dialogSpot(n),
          text: m.text,
          note: m.note ? `${m.date} · ${m.note}` : m.date,
          voice: m.voice,
        });
      }
    },
    [projectorPlaying, takeNext, letterDeck, dialogDeck, dialogSpot, showSpark],
  );

  const onProjectorDone = useCallback(() => setProjectorPlaying(false), []);

  const onKiss = useCallback(() => {
    if (kissInFlight) return;
    setKissInFlight(true);
    setKissToken((t) => t + 1);
    later(() => setKissInFlight(false), KISS_MS);
  }, [kissInFlight, later]);

  // Всё, что за вечер уже зажглось: отговорившие светятся ровным следом,
  // говорящая прямо сейчас — на полную. Вечную лампу рендерер зажигает сам,
  // из LAYOUT, и она не гаснет ни при каком свете.
  const skyLetters = useMemo(
    () =>
      lit.map((l) => ({
        id: l.id,
        x: l.x,
        y: l.y,
        isEternal: false,
        opened: l.id !== spark?.id,
      })),
    [lit, spark],
  );

  const busy = spark !== null || projectorPlaying;

  return (
    <>
      <Sky
        days={counter.nights}
        bearingDeg={settings.bearingDeg}
        observer={observer}
        letters={skyLetters}
        chains={[]}
        openId={spark?.id ?? null}
        hintId={null}
        obsessionId={null}
        birthNight={null}
        projectorImage={projector.image}
        projectorToken={projector.token}
        onProjectorDone={onProjectorDone}
        cometToken={kissToken}
        reducedMotion={reducedMotion}
      />

      <Screens
        index={screen}
        onChange={setScreen}
        home={
          <HomeScreen
            counter={counter}
            settings={settings}
            onKiss={onKiss}
            onOpenSky={() => setScreen(1)}
            kissInFlight={kissInFlight}
          />
        }
        sky={
          <SkyScreen
            onSpark={onSpark}
            busy={busy}
            hint={hint ? HINT_TEXT : null}
            onBack={() => setScreen(0)}
          />
        }
      />

      {spark && (
        <SparkText
          x={spark.x}
          y={spark.y}
          text={spark.text}
          note={spark.note}
          voice={spark.voice}
          reducedMotion={reducedMotion}
        />
      )}

      <TitleDawn bearingDeg={settings.bearingDeg} />
    </>
  );
}
