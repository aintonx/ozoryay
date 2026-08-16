"use client";

import {
  type CSSProperties,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import TimerWidget from "./widgets/TimerWidget";
import DistanceWidget from "./widgets/DistanceWidget";
import FollowersWidget from "./widgets/FollowersWidget";
import { useFollowers } from "@/lib/useFollowers";
import { Widget, WidgetButton } from "./ui/Widget";
import { IconChevronUp, IconKiss, IconLock, IconStars } from "./ui/Icons";
import type { Settings } from "@/lib/defaults";
import type { SeparationCounter } from "@/lib/time/useSeparationDays";

/** Подписка, которая никогда не срабатывает: значение меняется ровно раз. */
const subscribeNever = () => () => {};

/** Ниже этого не ужимаем: лучше подрезать поля, чем сделать текст нечитаемым. */
const MIN_SCALE = 0.76;
const WIDE_QUERY = "(min-width: 640px)";

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
  // Появляется, когда появляется файл с числом. Пока токена нет — виджета
  // нет, и разметка от этого не страдает: она пересчитается сама.
  const followers = useFollowers();

  const box = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [wide, setWide] = useState(false);
  const [visualWidth, setVisualWidth] = useState<number | null>(null);

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
    const availableWidth =
      outer.clientWidth - parseFloat(pad.paddingLeft) - parseFloat(pad.paddingRight);
    const rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const maxWidth = (window.matchMedia(WIDE_QUERY).matches ? 44 : 26) * rootFontSize;
    const nextWidth = Math.min(availableWidth, maxWidth);
    const next = natural > available ? Math.max(MIN_SCALE, available / natural) : 1;
    setVisualWidth((prev) =>
      prev === null || Math.abs(prev - nextWidth) > 0.5 ? nextWidth : prev,
    );
    setScale((prev) => (Math.abs(prev - next) > 0.004 ? next : prev));
  }, []);

  useLayoutEffect(() => {
    if (!mounted) return;
    const media = window.matchMedia(WIDE_QUERY);
    const syncWide = () => setWide(media.matches);
    syncWide();
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
      media.removeEventListener("change", syncWide);
      window.removeEventListener("resize", fit);
      window.removeEventListener("orientationchange", fit);
    };
  }, [mounted, fit]);

  if (!mounted) return null;

  const visualMaxRem = wide ? 44 : 26;
  const layoutWidth = visualWidth === null ? undefined : visualWidth / scale;
  const contentStyle = {
    width: layoutWidth === undefined ? "100%" : `${layoutWidth}px`,
    maxWidth: layoutWidth === undefined ? `${visualMaxRem}rem` : `${layoutWidth}px`,
    transform: `scale(${scale})`,
    transformOrigin: "center center",
  } satisfies CSSProperties;

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
        className="mx-auto shrink-0"
        style={contentStyle}
      >
        {/*
          Сетка домашнего экрана телефона: две равные колонки для основных
          действий, затем две полноширинные строки — закрытое продолжение и
          текст-послесловие. Весь блок масштабируется по высоте, но визуальная
          ширина остаётся той же, что у кнопок на экране неба.
        */}
        <div className="grid grid-cols-2 gap-[0.7rem]">
          <TimerWidget counter={counter} />
          <DistanceWidget
            distanceKm={settings.distanceKm}
            myCity={settings.myCity}
            herCity={settings.herCity}
          />
          <WidgetButton
            layout="tile"
            icon={<IconKiss />}
            label="Отправить поцелуй"
            hint={kissInFlight ? "летит ко мне…" : "он улетит за горизонт ко мне"}
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

          {followers && <FollowersWidget data={followers} className="col-span-2" />}
          <Widget className="col-span-2 items-center justify-center py-[1.1rem]">
            <span className="flex h-[2.65rem] w-[2.65rem] items-center justify-center rounded-full bg-amber/12 text-[1.25rem] text-amber/85">
              <IconLock />
            </span>
          </Widget>
          <div className="glass col-span-2 rounded-[1.55rem] px-[1.05rem] py-[0.8rem]">
            <p className="font-system caption text-center text-[13px] leading-[1.5] text-star/72">
              Рассвет случится с твоим приездом, а пока здесь тьма и пустота — как
              интерпретация моей души без тебя, как сердце, запертое в темнице.
              «Озоряй» — это про тебя: про свет и про любовь.
            </p>
          </div>
        </div>

        {/* Подсказка про свайп. */}
        <button
          type="button"
          onClick={(e) => {
            if (e.detail > 0) e.currentTarget.blur();
            onOpenSky();
          }}
          className="font-system caption mx-auto mt-[0.9rem] flex items-center gap-[0.4em] text-[12px] font-medium tracking-[0.05em] text-star transition-opacity duration-300 hover:opacity-80"
        >
          <IconChevronUp size={13} />
          смахни вверх
        </button>
      </div>
    </div>
  );
}
