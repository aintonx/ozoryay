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
import ZonaWidget from "./widgets/ZonaWidget";
import { useFollowers } from "@/lib/useFollowers";
import { WidgetButton } from "./ui/Widget";
import { IconChevronUp } from "./ui/Icons";
import type { Settings } from "@/lib/defaults";
import type { SeparationCounter } from "@/lib/time/useSeparationDays";

/** Подписка, которая никогда не срабатывает: значение меняется ровно раз. */
const subscribeNever = () => () => {};

/** Ниже этого не ужимаем: лучше подрезать поля, чем сделать текст нечитаемым. */
const MIN_SCALE = 0.76;
const WIDE_QUERY = "(min-width: 640px)";

/**
 * Акцент «Поцелуя» — не значок, а тёплая светящаяся точка. В полёте вокруг
 * нее расходится кольцо (то же `gentle-pulse`, что и у метки «я» на карте
 * расстояния, только быстрее — 1.1с вместо 2.6с): ощущение, что что-то
 * прямо сейчас происходит, без картинки самого поцелуя.
 */
function KissAccent({ inFlight }: { inFlight: boolean }) {
  return (
    <span className="relative flex h-full w-full items-center justify-center">
      <span
        aria-hidden="true"
        className="h-[0.85rem] w-[0.85rem] rounded-full bg-amber-hot/85"
        style={{ boxShadow: "0 0 20px 6px rgba(255, 227, 176, 0.45)" }}
      />
      {inFlight && (
        <span
          aria-hidden="true"
          className="absolute h-[0.85rem] w-[0.85rem] animate-[gentle-pulse_1.1s_ease-out_infinite] rounded-full bg-amber-hot/55"
        />
      )}
    </span>
  );
}

/**
 * Акцент «Неба» — три тихо мерцающие точки-звезды, а не значок звезды.
 * Разные размеры, задержки и длительности, чтобы россыпь не читалась
 * как один и тот же повторяющийся элемент трижды.
 */
function SkyAccent() {
  return (
    <span className="relative flex h-full w-full items-center justify-center" aria-hidden="true">
      <span
        className="absolute h-[0.5rem] w-[0.5rem] rounded-full bg-star/70"
        style={{ left: "26%", top: "30%", animation: "twinkle-soft 3.2s ease-in-out infinite", animationDelay: "-0.4s" }}
      />
      <span
        className="absolute h-[0.34rem] w-[0.34rem] rounded-full bg-star/55"
        style={{ left: "64%", top: "22%", animation: "twinkle-soft 2.6s ease-in-out infinite", animationDelay: "-1.5s" }}
      />
      <span
        className="absolute h-[0.4rem] w-[0.4rem] rounded-full bg-amber-hot/70"
        style={{ left: "50%", top: "60%", animation: "twinkle-soft 3.6s ease-in-out infinite", animationDelay: "-2.1s" }}
      />
    </span>
  );
}

interface HomeScreenProps {
  counter: SeparationCounter;
  settings: Settings;
  onKiss: () => void;
  onOpenSky: () => void;
  /** Поцелуй уже в пути — кнопка ждёт. */
  kissInFlight: boolean;
  /** Нажали на «Зону» — взгляд пошёл вверх, к странице входа. */
  onOpenZona: () => void;
}

/**
 * Главный экран: виджеты домашнего экрана телефона.
 *
 * Раскладка внутри каждого виджета одна и та же на любой ширине окна —
 * сама сетка растёт от одной широкой колонки на телефоне до просторной
 * на десктопе (см. `visualMaxRem` ниже), но то, что происходит внутри
 * отдельной карточки, от этого не зависит: иначе на границе брейкпоинта
 * соседние виджеты в одной строке рассинхронизируются между собой.
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
  onOpenZona,
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
          действий, затем полноширинная строка — вход в «Зону» (см. `ZonaWidget`
          и подъём взгляда в `Night`). Весь блок масштабируется по высоте, но
          визуальная ширина остаётся той же, что у кнопок на экране неба.
        */}
        <div className="grid grid-cols-2 gap-[0.7rem]">
          <TimerWidget
            counter={counter}
            separationStartISO={settings.separationStart}
            tz={settings.herTimezone}
          />
          <DistanceWidget
            distanceKm={settings.distanceKm}
            myCity={settings.myCity}
            herCity={settings.herCity}
            bearingDeg={settings.bearingDeg}
          />
          <WidgetButton
            layout="tile"
            accent={<KissAccent inFlight={kissInFlight} />}
            label="Отправить поцелуй"
            hint={kissInFlight ? "летит ко мне…" : "он улетит ко мне"}
            onClick={onKiss}
            disabled={kissInFlight}
          />
          <WidgetButton
            layout="tile"
            accent={<SkyAccent />}
            label="Взгляни на небо"
            // Неразрывный пробел держит «свои секреты» одним куском, чтобы
            // перенос (если он вообще случится на узкой колонке) прошёл
            // после «прячет», а не разбил фразу на «свои» отдельно от
            // «секреты» — так подпись остаётся читаемой при любой ширине.
            hint={"оно прячет свои\u00A0секреты"}
            onClick={onOpenSky}
          />

          {followers && (
            <FollowersWidget data={followers} tz={settings.herTimezone} className="col-span-2" />
          )}
          <ZonaWidget onOpen={onOpenZona} className="col-span-2" />
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
