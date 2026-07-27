"use client";

import { useCallback, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import TimerWidget from "./widgets/TimerWidget";
import DistanceWidget from "./widgets/DistanceWidget";
import { WidgetButton } from "./ui/Widget";
import { IconChevronUp, IconKiss, IconStars } from "./ui/Icons";
import type { Settings } from "@/lib/defaults";
import type { SeparationCounter } from "@/lib/time/useSeparationDays";

/** Подписка, которая никогда не срабатывает: значение меняется ровно раз. */
const subscribeNever = () => () => {};

/** Ниже этого не ужимаем: лучше подрезать поля, чем сделать текст нечитаемым. */
const MIN_SCALE = 0.76;

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
 *
 * Экран не прокручивается ни при каких размерах: жесты целиком принадлежат
 * переходу между экранами, и прокрутка внутри отбирала бы их у него. Если
 * содержимое не помещается — оно ужимается, а не уезжает под край.
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

  const box = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  const fit = useCallback(() => {
    const outer = box.current;
    const inner = content.current;
    if (!outer || !inner) return;
    // Меряем всегда нетронутую высоту: если считать от уже ужатой, масштаб
    // с каждым замером уползал бы всё ниже.
    const natural = inner.scrollHeight;
    // clientHeight включает поля, а содержимому достаётся то, что между
    // ними, — иначе на низком экране виджеты упираются в самый край.
    const pad = getComputedStyle(outer);
    const available =
      outer.clientHeight - parseFloat(pad.paddingTop) - parseFloat(pad.paddingBottom);
    const next = natural > available ? Math.max(MIN_SCALE, available / natural) : 1;
    setScale((prev) => (Math.abs(prev - next) > 0.004 ? next : prev));
  }, []);

  useLayoutEffect(() => {
    if (!mounted) return;
    fit();
    const ro = new ResizeObserver(fit);
    if (box.current) ro.observe(box.current);
    if (content.current) ro.observe(content.current);
    // Наблюдателя мало: в фоновой вкладке он не срабатывает, а размер там
    // как раз и меняется — поворот экрана, адресная строка, окно на десктопе.
    window.addEventListener("resize", fit);
    window.addEventListener("orientationchange", fit);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", fit);
      window.removeEventListener("orientationchange", fit);
    };
  }, [mounted, fit]);

  if (!mounted) return null;

  return (
    <div
      ref={box}
      className="flex h-full w-full items-center justify-center overflow-hidden px-[1.15rem] py-[max(1.25rem,env(safe-area-inset-top))]"
    >
      {/*
        Пока летит поцелуй, весь этот экран уезжает вниз целиком (см.
        `Screens`) — небо должно быть видно без помех. Здесь остаётся только
        подгонка масштаба под высоту устройства.
      */}
      <div
        ref={content}
        className="w-full max-w-[26rem] sm:max-w-[44rem]"
        style={{ transform: `scale(${scale})`, transformOrigin: "center center" }}
      >
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
            hint={kissInFlight ? "летит ко мне…" : "он улетит за горизонт"}
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
        <p className="font-system caption mx-auto mt-[1.3rem] max-w-[24rem] text-center text-[13px] leading-[1.6] text-star/72">
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
          className="font-system caption mx-auto mt-[1.1rem] flex items-center gap-[0.4em] text-[12px] font-medium tracking-[0.05em] text-star transition-opacity duration-300 hover:opacity-80"
        >
          <IconChevronUp size={13} />
          смахни вверх
        </button>
      </div>
    </div>
  );
}
