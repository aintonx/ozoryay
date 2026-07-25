import type { NextConfig } from "next";

/**
 * Сайт собирается в набор статических файлов и живёт на GitHub Pages.
 *
 * Сервера нет — и не нужно: всё небо, письма, прожектор и счётчик работают
 * в браузере. Время счётчик берёт не у устройства, а из служебного заголовка
 * ответа сервера (см. useSeparationCounter), поэтому оно остаётся честным.
 *
 * BASE_PATH задаёт GitHub Actions: на своём домене он пустой, а на адресе
 * вида aintonx.github.io/ozoryay — равен "/ozoryay".
 */
const basePath = process.env.BASE_PATH ?? "";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  // Пути вида /ozoryay/... для картинок и скриптов на github.io.
  assetPrefix: basePath || undefined,
  // GitHub Pages отдаёт каталоги: /письмо/ → /письмо/index.html.
  trailingSlash: true,
  // Оптимизатор картинок — серверная штука, в статике недоступен.
  images: { unoptimized: true },
  // Значок девтулзов перекрывает нижний левый угол — ровно там, где стоит
  // прожектор. Композицию нужно видеть целиком.
  devIndicators: false,
};

export default nextConfig;
