"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import PlaceCard from "./PlaceCard";
import { IconNext } from "../ui/Icons";
import type { Place } from "@/lib/places";

// Leaflet трогает window уже при импорте — грузим карту только в браузере
// и только когда она правда понадобилась, чтобы не тянуть её в общий бандл
// ради людей, которые на карту вообще не откроют.
const PlacesMap = dynamic(() => import("./PlacesMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center">
      <span className="font-system caption text-[12px] text-star/55">карта загружается…</span>
    </div>
  ),
});

interface MapScreenProps {
  open: boolean;
  onClose: () => void;
  places: Place[];
}

const EASE = "transform 620ms cubic-bezier(0.32, 0.72, 0, 1)";

/**
 * Карта — отдельное окно поверх всего сайта, в духе того, как открывается
 * экран неба: выезжает снизу, уезжает вниз обратно. Своей логики свайпа
 * не заводим — жесты внутри отданы самой карте (пан и зум), поэтому
 * закрывается явной кнопкой «назад» и кликом по пустому месту карты
 * (тот сбрасывает только открытую карточку, см. PlacesMap).
 *
 * Небо под виджетами не трогаем: карта не часть двухэкранного Screens,
 * а самостоятельный слой поверх него — так безопаснее для уже настроенной
 * там логики свайпа между домом и небом.
 */
export default function MapScreen({ open, onClose, places }: MapScreenProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Карта тяжёлая: монтируем один раз при первом открытии и больше не
  // убираем из дерева — дальше, как и небо, она просто уезжает за край
  // экрана transform'ом, а не пересоздаётся каждый раз заново.
  //
  // setState прямо в теле рендера, а не в эффекте — react.dev рекомендует
  // именно так «подхватывать» проп без лишнего цикла рендер→эффект→рендер
  // (см. «Adjusting some state when a prop changes»).
  const [mounted, setMounted] = useState(open);
  if (open && !mounted) setMounted(true);

  const selected = useMemo(
    () => places.find((p) => p.id === selectedId) ?? null,
    [places, selectedId],
  );

  // Открывается сразу примерно по центру всех точек, а не видом на весь
  // мир — PlacesMap потом уточнит рамку через fitBounds.
  const initialCenter = useMemo<[number, number]>(() => {
    if (places.length === 0) return [20, 0];
    const lat = places.reduce((sum, p) => sum + p.lat, 0) / places.length;
    const lon = places.reduce((sum, p) => sum + p.lon, 0) / places.length;
    return [lat, lon];
  }, [places]);

  return (
    <div
      className="fixed inset-0 z-50"
      style={{
        transform: open ? "translate3d(0,0,0)" : "translate3d(0,100%,0)",
        transition: EASE,
        pointerEvents: open ? "auto" : "none",
      }}
      inert={!open}
    >
      <div className="absolute inset-0 bg-night-deep">
        {mounted && (
          <PlacesMap
            places={places}
            selectedId={selectedId}
            onSelect={setSelectedId}
            initialCenter={initialCenter}
          />
        )}
      </div>

      {/* Кнопка назад — тот же язык, что у «дальше» в ContentOverlay. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-start px-[1.15rem] pt-[max(1.15rem,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={() => {
            setSelectedId(null);
            onClose();
          }}
          className="glass font-system pointer-events-auto flex items-center gap-[0.5em] rounded-full py-[0.65rem] pr-[1.1rem] pl-[0.85rem] text-[13px] font-medium text-star/90 transition-transform duration-300 active:scale-[0.97]"
        >
          <IconNext size={15} className="rotate-180 text-amber/90" />
          назад
        </button>
      </div>

      <PlaceCard place={selected} onClose={() => setSelectedId(null)} />
    </div>
  );
}
