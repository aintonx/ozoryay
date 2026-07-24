import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Значок девтулзов перекрывает нижний левый угол — ровно там, где стоит
  // прожектор. Композицию нужно видеть целиком.
  devIndicators: false,
};

export default nextConfig;
