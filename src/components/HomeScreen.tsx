"use client";

import { useSyncExternalStore } from "react";
import TimerWidget from "./widgets/TimerWidget";
import DistanceWidget from "./widgets/DistanceWidget";
import { WidgetButton } from "./ui/Widget";
import { IconChevronUp, IconKiss, IconStars } from "./ui/Icons";
import type { Settings } from "@/lib/defaults";
import type { SeparationCounter } from "@/lib/time/useSeparationDays";

/** Подписка, которая никогда не срабатывает: значение меняется ровно раз. */
const subscribeNever = () => () => {};

interface HomeScreenProps {
  counter: SeparationCounter;
  settings: Settings;
  onKiss: () => void;
  onOpenSky: () => void;
  /** Поцелуй уже в пути — кнопка ждёт. */
  kissInFlight: boolean;
}

/**
 * Главный экран: четыре виджета и слово под ними.
 *
 * Одна колонка на телефоне, две на широком экране. Порядок один и тот же —
 * сначала время, потом расстояние, потом то, что можно сделать.
 */
export default function HomeScreen({
  counter,
  settings,
  onKiss,
  onOpenSky,
  kissInFlight,
}: HomeScreenProps) {
  // Секунды тикают, а страница собирается заранее: числа в готовом HTML
  // и в браузере разойдутся. Виджеты рождаются уже на клиенте.
  const mounted = useSyncExternalStore(subscribeNever, () => true, () => false);
  if (!mounted) return null;

  return (
    <div className="flex h-full w-full items-center justify-center overflow-y-auto overscroll-contain px-[1.15rem] py-[max(1.5rem,env(safe-area-inset-top))]">
      <div className="home-in w-full max-w-[26rem] sm:max-w-[44rem]">
        {/*
          Сетка домашнего экрана телефона: широкий виджет занимает обе колонки,
          маленький — одну. На телефоне время и расстояние идут во всю ширину,
          а две кнопки встают плиткой рядом; на широком экране всё
          раскладывается в квадрат два на два.
        */}
        <div className="grid grid-cols-2 gap-[0.85rem]">
          <TimerWidget counter={counter} className="col-span-2 sm:col-span-1" />
          <DistanceWidget
            distanceKm={settings.distanceKm}
            myCity={settings.myCity}
            herCity={settings.herCity}
            className="col-span-2 sm:col-span-1"
          />
          <WidgetButton
            layout="tile"
            icon={<IconKiss />}
            label="Отправить поцелуй"
            hint={kissInFlight ? "летит к тебе…" : "он улетит за горизонт"}
            onClick={onKiss}
            disabled={kissInFlight}
          />
          <WidgetButton
            layout="tile"
            icon={<IconStars />}
            label="Взгляни на небо"
            hint="оно прячет свои секреты"
            onClick={onOpenSky}
          />
        </div>

        {/* Слово под виджетами. */}
        <p className="font-system mx-auto mt-[1.3rem] max-w-[24rem] text-center text-[12.5px] leading-[1.6] text-star/42">
          Рассвет случится с твоим приездом, а пока здесь тьма и пустота — как
          интерпретация моей души без тебя, как сердце, запертое в темнице.
          «Озоряй» — это про тебя: про свет и про любовь.
        </p>

        {/* Подсказка про свайп. */}
        <button
          type="button"
          onClick={(e) => {
            if (e.detail > 0) e.currentTarget.blur();
            onOpenSky();
          }}
          className="font-system mx-auto mt-[1.1rem] flex items-center gap-[0.35em] text-[10.5px] tracking-[0.06em] text-star/28 transition-colors hover:text-star/50"
        >
          <IconChevronUp size={13} />
          смахни вверх
        </button>
      </div>
    </div>
  );
}
