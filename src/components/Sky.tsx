"use client";

import { useEffect, useRef } from "react";
import { createSky, type LetterStar, type SkyHandle } from "@/lib/sky/renderer";
import type { ProjectorImage } from "@/lib/sky/projector";

export interface SkyProps {
  days: number;
  bearingDeg: number;
  letters: LetterStar[];
  chains: Array<Array<{ x: number; y: number }>>;
  openId: number | null;
  hintId: number | null;
  obsessionId: number | null;
  birthNight: number | null;
  projectorImage: ProjectorImage | null;
  projectorToken: number;
  onProjectorDone: () => void;
  reducedMotion: boolean;
}

export default function Sky(props: SkyProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  const handle = useRef<SkyHandle | null>(null);
  const latest = useRef(props);

  // Запись в ref делается в эффекте, а не в теле рендера: эффекты выполняются
  // в порядке объявления, поэтому к моменту создания неба здесь уже свежие
  // пропсы, а рендер остаётся чистым.
  useEffect(() => {
    latest.current = props;
  });

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;

    // Небо живёт одним непрерывным циклом: пересоздавать его на смену пропсов
    // нельзя, иначе мерцание и дыхание будут дёргаться при каждом рендере.
    handle.current = createSky(canvas, latest.current);
    return () => {
      handle.current?.destroy();
      handle.current = null;
    };
  }, []);

  useEffect(() => {
    handle.current?.setOptions(props);
  }, [props]);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className="fixed inset-0 h-full w-full"
      style={{ height: "100dvh" }}
    />
  );
}
