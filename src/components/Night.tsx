"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ContentOverlay from "./ContentOverlay";
import HomeScreen from "./HomeScreen";
import Screens, { type ScreenIndex } from "./Screens";
import SkyScreen, { type SparkKind } from "./SkyScreen";
import Sky from "./Sky";
import SparkText from "./SparkText";
import TitleDawn from "./TitleDawn";
import type { Settings } from "@/lib/defaults";
import { speakingLetters, type Letter } from "@/lib/letters";
import { AUTHOR, MEMORIES } from "@/lib/memories";
import type { ProjectorImage } from "@/lib/sky/projector";
import { useDeck } from "@/lib/useDeck";
import { useMemories } from "@/lib/useMemories";
import { useObserver } from "@/lib/useObserver";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { useSeparationCounter } from "@/lib/time/useSeparationDays";

/** Сколько держится текст вспышки, если её не закрыли раньше. */
const SPARK_MS = 9000;
/**
 * Пауза между вспышками.
 *
 * Одна звезда должна догореть, прежде чем разгорится следующая: подмена
 * текста на месте выглядит как перелистывание списка, а не как небо.
 * Совпадает со временем, за которое гаснет свеча вокруг звезды.
 */
const HANDOVER_MS = 460;
/** Сколько висит подсказка. */
const HINT_MS = 5600;
/** Пока летит поцелуй, кнопка ждёт. Чуть дольше самого полёта. */
const KISS_MS = 3000;
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
  /** Зачин над строкой: у писем есть, у реплик нет. */
  lead?: string;
  /** Кто сказал. */
  author?: string;
  /** Когда сказал. У писем даты нет. */
  date?: string;
  /** Чей голос — от этого зависит цвет текста. */
  voice?: "her" | "him";
  /** Какая кнопка это зажгла: по ней же даём следующее. */
  kind: SparkKind;
}

/**
 * Владелец состояния ночи.
 *
 * Два экрана над одним небом: виджеты и само небо. Небо не перерисовывается
 * при переходе — уезжает только интерфейс, будто подняли глаза.
 */
export default function Night({ settings, letters }: NightProps) {
  const counter = useSeparationCounter(settings.separationStart, settings.herTimezone);
  const where = useMemo(
    () => ({ lat: settings.herLat, lon: settings.herLon, city: settings.herCity }),
    [settings.herLat, settings.herLon, settings.herCity],
  );
  const observer = useObserver(where);
  const reducedMotion = useReducedMotion();
  const { takeNext } = useMemories();

  const [screen, setScreen] = useState<ScreenIndex>(0);
  /**
   * Вступление: 0 — идёт, 1 — уходит, 2 — кончилось.
   *
   * Две ступени, а не одна: по первой канвас начинает убирать солнце, по
   * второй выезжают виджеты. Если выпускать их сразу, они наезжают на ещё
   * горящий свет и спорят с ним за середину экрана.
   */
  const [intro, setIntro] = useState<0 | 1 | 2>(0);
  const [spark, setSpark] = useState<Spark | null>(null);
  /** Горящая звезда уходит: слова тают, свеча гаснет, следующая ждёт. */
  const [leaving, setLeaving] = useState(false);
  // Отговорившие звёзды остаются в небе тёплым следом: за вечер оно
  // потихоньку заселяется тем, что мы друг другу сказали.
  const [lit, setLit] = useState<Array<{ id: number; x: number; y: number }>>([]);
  const [hint, setHint] = useState(false);
  const [projector, setProjector] = useState<{
    image: ProjectorImage | null;
    token: number;
    cancel: number;
  }>({ image: null, token: 0, cancel: 0 });
  const [projectorPlaying, setProjectorPlaying] = useState(false);
  const [kissToken, setKissToken] = useState(0);
  const [kissInFlight, setKissInFlight] = useState(false);

  const timers = useRef<number[]>([]);
  const sparkTimer = useRef<number | undefined>(undefined);
  const dialogCount = useRef(0);
  const hintSeen = useRef(false);
  const projectorRun = useRef(0);

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
      setLeaving(false);
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

  const runProjector = useCallback(() => {
    projectorRun.current += 1;
    setSpark(null);
    setProjectorPlaying(true);
    void takeNext().then((image) => {
      setProjector((p) => ({ ...p, image, token: p.token + 1 }));
    });
  }, [takeNext]);

  const onSpark = useCallback(
    (kind: SparkKind) => {
      if (kind === "memory") {
        runProjector();
        return;
      }

      if (kind === "letter") {
        const l = letterDeck.draw();
        if (!l) return;
        // Зачин, а не подпись: письма — это то, что я про тебя знаю,
        // и фраза должна вводить строку, а не стоять после неё.
        showSpark({
          id: l.id,
          x: l.starX,
          y: l.starY,
          text: l.text,
          lead: "я знаю, что…",
          kind,
        });
      } else {
        const m = dialogDeck.draw();
        if (!m) return;
        const n = dialogCount.current++;
        showSpark({
          id: DIALOG_ID_BASE + n,
          ...dialogSpot(n),
          text: m.text,
          author: AUTHOR[m.voice],
          date: m.note ? `${m.date} · ${m.note}` : m.date,
          voice: m.voice,
          kind,
        });
      }
    },
    [runProjector, letterDeck, dialogDeck, dialogSpot, showSpark],
  );

  /** Закрыть то, что горит сейчас. */
  const dismiss = useCallback(() => {
    if (spark) {
      window.clearTimeout(sparkTimer.current);
      setLeaving(false);
      setSpark(null);
    }
    if (projectorPlaying) {
      setProjector((p) => ({ ...p, cancel: p.cancel + 1 }));
      // Обычно об окончании сообщает само небо. Но если вкладка была свёрнута
      // и кадры не шли, сообщать некому — а интерфейс должен вернуться в
      // любом случае, иначе экран остаётся пустым навсегда.
      const run = projectorRun.current;
      later(() => {
        if (projectorRun.current === run) setProjectorPlaying(false);
      }, 520);
    }
  }, [spark, projectorPlaying, later]);

  /**
   * Показать следующее того же рода.
   *
   * Не подменяет текст на месте: сначала гаснет горящая звезда вместе со
   * своими словами, и только потом разгорается новая. Полсекунды тишины —
   * это и есть вся разница между «небом» и «списком».
   */
  const next = useCallback(() => {
    if (projectorPlaying) {
      runProjector();
      return;
    }
    if (!spark || leaving) return;
    const kind = spark.kind;
    setLeaving(true);
    later(() => {
      setLeaving(false);
      onSpark(kind);
    }, HANDOVER_MS);
  }, [projectorPlaying, runProjector, spark, leaving, later, onSpark]);

  const onProjectorDone = useCallback(() => setProjectorPlaying(false), []);
  const onIntroLeave = useCallback(() => setIntro(1), []);
  const onIntroDone = useCallback(() => setIntro(2), []);

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

  const showing = spark !== null || projectorPlaying;
  // Интерфейс уходит с глаз на всё, ради чего стоит смотреть на небо.
  const veiled = intro !== 2 || showing || kissInFlight;

  return (
    <>
      <Sky
        days={counter.nights}
        bearingDeg={settings.bearingDeg}
        observer={observer}
        letters={skyLetters}
        chains={[]}
        openId={leaving ? null : (spark?.id ?? null)}
        hintId={null}
        obsessionId={null}
        birthNight={null}
        projectorImage={projector.image}
        projectorToken={projector.token}
        projectorCancel={projector.cancel}
        onProjectorDone={onProjectorDone}
        cometToken={kissToken}
        dawn={intro === 0}
        reducedMotion={reducedMotion}
      />

      <Screens
        index={screen}
        onChange={setScreen}
        hidden={veiled}
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
          <SkyScreen onSpark={onSpark} hint={hint ? HINT_TEXT : null} onBack={() => setScreen(0)} />
        }
      />

      {spark && (
        <SparkText
          x={spark.x}
          y={spark.y}
          text={spark.text}
          lead={spark.lead}
          author={spark.author}
          date={spark.date}
          voice={spark.voice}
          leaving={leaving}
          reducedMotion={reducedMotion}
        />
      )}

      <ContentOverlay
        open={showing}
        onDismiss={dismiss}
        onNext={next}
        nextLabel="дальше"
      />

      {/* Снимает себя сам: свет уже пошёл на убыль, а строка ещё уезжает. */}
      <TitleDawn
        bearingDeg={settings.bearingDeg}
        onLeave={onIntroLeave}
        onDone={onIntroDone}
      />
    </>
  );
}
