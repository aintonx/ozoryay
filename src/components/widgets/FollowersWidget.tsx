"use client";

import { Widget } from "../ui/Widget";
import { IconPeople } from "../ui/Icons";
import { growthOver, type Followers } from "@/lib/useFollowers";
import { plural, spaceThousands } from "@/lib/text/plural";

interface FollowersWidgetProps {
  data: Followers;
  className?: string;
}

/** Сколько дней показывает кривая. */
const WINDOW = 30;

/**
 * Сколько людей её читает.
 *
 * Число — не статистика, а часть подарка: она следит за ним каждый день,
 * и здесь оно стоит рядом с днями разлуки и километрами между нами.
 * Поэтому ни процентов, ни «охватов» — только сколько людей и насколько
 * стало больше за неделю.
 */
export default function FollowersWidget({ data, className }: FollowersWidgetProps) {
  const count = data.followers ?? 0;
  const week = growthOver(data.history, 7);
  const points = data.history.slice(-WINDOW);

  return (
    <Widget icon={<IconPeople />} title="ТЕБЯ ЧИТАЮТ" className={className}>
      <div className="flex items-baseline gap-[0.35em]">
        <span className="font-system text-[2.35rem] leading-none font-semibold tabular-nums tracking-[-0.03em] text-star">
          {spaceThousands(count)}
        </span>
        <span className="font-system text-[13px] text-star/50">
          {plural(count, "человек", "человека", "человек")}
        </span>
      </div>

      <Sparkline points={points.map((p) => p.n)} />

      <div className="font-system mt-[0.5rem] flex items-baseline justify-between text-[10.5px]">
        <span className="text-star/40">{points.length > 1 ? "за месяц" : " "}</span>
        {week !== null && (
          <span className={week > 0 ? "text-amber/85" : "text-star/45"}>
            {week > 0 ? "+" : week < 0 ? "−" : ""}
            {spaceThousands(Math.abs(week))} за неделю
          </span>
        )}
      </div>
    </Widget>
  );
}

/**
 * Кривая роста.
 *
 * Ось не подписана и нуля не показывает: важно не «сколько именно было
 * во вторник», а форма — растёт или стоит. Поэтому масштаб берётся по
 * самим значениям, и даже прибавка в десяток человек видна изгибом.
 */
function Sparkline({ points }: { points: number[] }) {
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
  const area = `${d} L ${W} ${H} L 0 ${H} Z`;
  const lastX = W;
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
          <linearGradient id="followers-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-amber)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--color-amber)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#followers-fill)" />
        <path
          d={d}
          fill="none"
          stroke="var(--color-amber)"
          strokeOpacity={0.75}
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      {/* Точка «сегодня» — своим слоем, иначе растяжение по ширине
          превратило бы её в овал. */}
      <span
        className="absolute h-[7px] w-[7px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-hot"
        style={{ left: `${(lastX / W) * 100}%`, top: `${(lastY / H) * 100}%` }}
      />
    </div>
  );
}
