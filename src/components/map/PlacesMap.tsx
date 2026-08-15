"use client";

import { useEffect } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import type { Place } from "@/lib/places";

/**
 * Ключ MapTiler — берётся из окружения сборки, поэтому должен начинаться
 * с NEXT_PUBLIC_, иначе Next не положит его в клиентский бандл (см. README
 * репозитория / инструкцию рядом с этим файлом).
 *
 * Без ключа откатываемся на обычные тайлы OpenStreetMap: карта работает
 * сразу, просто не в тёмном фирменном стиле — пока ключ не появится.
 */
const MAPTILER_KEY = process.env.NEXT_PUBLIC_MAPTILER_KEY;

const TILE_URL = MAPTILER_KEY
  ? `https://api.maptiler.com/maps/dataviz-dark/256/{z}/{x}/{y}.png?key=${MAPTILER_KEY}`
  : "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

const TILE_ATTRIBUTION = MAPTILER_KEY
  ? '&copy; <a href="https://www.maptiler.com/copyright/" target="_blank">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap contributors</a>'
  : '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap contributors</a>';

/** Та же капля, что IconMarker в ui/Icons.tsx — здесь строкой, для Leaflet. */
const PIN_PATH =
  "M12 2.4c-3.9 0-7 3.1-7 7 0 4.9 5.5 10.9 6.3 11.7.4.4 1 .4 1.4 0 .8-.8 6.3-6.8 6.3-11.7 0-3.9-3.1-7-7-7zm0 9.6a2.6 2.6 0 1 1 0-5.2 2.6 2.6 0 0 1 0 5.2z";

/** Метка крупнее и светлее, когда её карточка открыта. */
function buildPinIcon(active: boolean) {
  const size = active ? 38 : 30;
  return L.divIcon({
    className: "",
    html: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" style="display:block;filter:drop-shadow(0 3px 8px rgba(5,7,15,0.65))"><path d="${PIN_PATH}" fill="${active ? "#ffe3b0" : "#f2c57c"}" /></svg>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
  });
}

/** Закрывает открытую карточку по клику на пустое место карты. */
function ClickCatcher({ onClear }: { onClear: () => void }) {
  useMapEvents({ click: () => onClear() });
  return null;
}

/** Подгоняет вид под все точки сразу после монтирования. */
function FitToPlaces({ places }: { places: Place[] }) {
  const map = useMap();
  useEffect(() => {
    if (places.length === 0) return;
    if (places.length === 1) {
      map.setView([places[0].lat, places[0].lon], 12);
      return;
    }
    const bounds = L.latLngBounds(places.map((p): [number, number] => [p.lat, p.lon]));
    map.fitBounds(bounds, { padding: [48, 48] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);
  return null;
}

interface PlacesMapProps {
  places: Place[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  initialCenter: [number, number];
}

export default function PlacesMap({ places, selectedId, onSelect, initialCenter }: PlacesMapProps) {
  return (
    <MapContainer
      center={initialCenter}
      zoom={4}
      className="h-full w-full"
      zoomControl={false}
      attributionControl={true}
    >
      <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
      <ClickCatcher onClear={() => onSelect(null)} />
      <FitToPlaces places={places} />
      {places.map((p) => (
        <Marker
          key={p.id}
          position={[p.lat, p.lon]}
          icon={buildPinIcon(p.id === selectedId)}
          eventHandlers={{ click: () => onSelect(p.id) }}
        />
      ))}
    </MapContainer>
  );
}
