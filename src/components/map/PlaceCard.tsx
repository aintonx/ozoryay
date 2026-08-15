"use client";

import { PLACE_KIND_LABEL, type Place } from "@/lib/places";

interface PlaceCardProps {
  place: Place | null;
  onClose: () => void;
}

/**
 * Карточка выбранной точки — снизу экрана, тем же стеклом, что и весь
 * остальной сайт (см. .glass в globals.css). Открыта только когда есть
 * выбранное место; закрывается крестиком либо кликом по пустой карте
 * (см. ClickCatcher в PlacesMap.tsx).
 */
export default function PlaceCard({ place, onClose }: PlaceCardProps) {
  const open = place !== null;
  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-10 flex justify-center px-[1.15rem] pb-[max(1.15rem,env(safe-area-inset-bottom))]"
      style={{
        transform: open ? "translate3d(0,0,0)" : "translate3d(0,120%,0)",
        transition: "transform 520ms cubic-bezier(0.32, 0.72, 0, 1)",
      }}
    >
      {place && (
        <div className="glass pointer-events-auto w-full max-w-[30rem] rounded-[1.55rem] p-[1.15rem]">
          <div className="flex items-start justify-between gap-[0.8rem]">
            <div className="min-w-0">
              <div className="font-system text-[11px] font-medium tracking-[0.02em] text-amber/85">
                {PLACE_KIND_LABEL[place.kind]}
                {place.date ? ` · ${place.date}` : ""}
              </div>
              <div className="font-display mt-[0.15em] truncate text-[1.15rem] text-star/95">
                {place.title}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="закрыть карточку"
              className="font-system shrink-0 rounded-full px-[0.5rem] py-[0.25rem] text-[15px] text-star/55 transition-opacity duration-300 hover:opacity-85"
            >
              ✕
            </button>
          </div>

          {place.photo && (
            <div className="mt-[0.85rem] overflow-hidden rounded-[1rem]">
              {/* Фото пользователя произвольного размера — next/image здесь
                  потребовал бы наперёд знать ширину/высоту каждого файла. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={place.photo}
                alt={place.title}
                className="h-[11rem] w-full object-cover"
              />
            </div>
          )}

          {place.description && (
            <p className="font-text mt-[0.85rem] text-[13.5px] leading-[1.55] text-star/78">
              {place.description}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
