"use client";

import { Widget } from "../ui/Widget";
import { IconPeople } from "../ui/Icons";
import type { Followers } from "@/lib/useFollowers";
import { plural, spaceThousands } from "@/lib/text/plural";

interface FollowersWidgetProps {
  data: Followers;
  className?: string;
}

/** Сколько дней показывает кривая. */
const WINDOW = 30;

/** Куда ведёт вся карточка целиком. */
const PROFILE_URL = "https://www.instagram.com/vladisunn/";

/**
 * Как ты её восхищаешь.
 *
 * Число — не статистика, а часть подарка: она следит за ним каждый день,
 * и здесь оно стоит рядом с днями разлуки и километрами между нами.
 * Вся карточка кликабельна — ведёт прямо в профиль, который тут считается.
 *
 * Обе цифры — счётчик и прирост внизу — правятся вручную, в одном файле:
 * `public/data/followers.json`. Инструкция — в README рядом с этим файлом.
 */
export default function FollowersWidget({ data, className }: FollowersWidgetProps) {
  const count = data.followers ?? 0;
  const points = data.history.slice(-WINDOW);

  return (
    <Widget
      icon={<IconPeople />}
      title="ТЫ ВОСХИЩАЕШЬ"
      href={PROFILE_URL}
      className={className}
    >
      <div className="flex items-baseline gap-[0.35em]">
        <span className="font-system text-[2.2rem] leading-none font-semibold tabular-nums tracking-[-0.03em] text-star">
          {spaceThousands(count)}
        </span>
        <span className="font-system text-[13px] text-star/50">
          {plural(count, "человек", "человека", "человек")}
        </span>
      </div>

      <Comet points={points.map((p) => p.n)} />

      {data.growthAmount != null && data.growthPeriod && (
        // truncate — по той же причине, что и у городов в DistanceWidget:
        // growthPeriod правится руками в JSON и не должен уметь перенести
        // строку, каким бы длинным его однажды ни вписали.
        <div className="font-system mt-[0.65rem] truncate text-center text-[10.5px] text-amber/85">
          {data.growthAmount > 0 ? "+" : data.growthAmount < 0 ? "−" : ""}
          {spaceThousands(Math.abs(data.growthAmount))} за {data.growthPeriod}
        </div>
      )}
    </Widget>
  );
}

/**
 * Хвост кометы вместо кривой роста.
 *
 * Тот же путь по точкам, что и раньше, но без заливки под линией: линия
 * гаснет к началу и разгорается к концу, а на самом кончике — светящаяся
 * голова. Смысл тот же — растёт или стоит, — но прочитывается как след,
 * а не как биржевой график.
 */
function Comet({ points }: { points: number[] }) {
  const H = 34;
  const W = 200;

  if (points.length < 2) {
    // Одна точка — линии ещё нет. Держим высоту, чтобы карточка не
    // подпрыгнула, когда назавтра появится вторая.
    return <div className="mt-[0.8rem]" style={{ height: `${H}px` }} />;
  }

  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const step = W / (points.length - 1);
  // Небольшие поля сверху и снизу: линия не должна упираться в край.
  const y = (n: number) => H - 4 - ((n - min) / span) * (H - 8);

  const d = points.map((n, i) => `${i === 0 ? "M" : "L"} ${(i * step).toFixed(1)} ${y(n).toFixed(1)}`).join(" ");
  const lastY = y(points[points.length - 1]);

  return (
    <div className="relative mt-[0.8rem]" style={{ height: `${H}px` }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="absolute inset-0 h-full w-full"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="followers-comet" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--color-amber-hot)" stopOpacity="0" />
            <stop offset="100%" stopColor="var(--color-amber-hot)" stopOpacity="0.9" />
          </linearGradient>
        </defs>
        <path
          d={d}
          fill="none"
          stroke="url(#followers-comet)"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      {/* Голова кометы — своим слоем и со свечением, иначе растяжение
          по ширине превратило бы её в овал без глубины. */}
      <span
        className="absolute h-[7px] w-[7px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-hot shadow-[0_0_10px_3px_rgba(255,227,176,0.55)]"
        style={{ left: "100%", top: `${(lastY / H) * 100}%` }}
      />
    </div>
  );
}