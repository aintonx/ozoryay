import type { Metadata, Viewport } from "next";
import { Prata, Spectral, Golos_Text, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import "leaflet/dist/leaflet.css";

// Заголовок: Prata — контрастная антиква с характером, «дорогая». Появляется
// редко (рассвет-заголовок и строка настоящего рассвета), поэтому может себе
// позволить голос.
const prata = Prata({
  subsets: ["cyrillic", "latin"],
  weight: ["400"],
  variable: "--font-prata",
  display: "swap",
});

// Письма: Spectral — тёплая литературная антиква, красиво держит короткую
// строку в тёплом свете.
const spectral = Spectral({
  subsets: ["cyrillic", "latin"],
  weight: ["300", "400"],
  variable: "--font-spectral",
  display: "swap",
});

const golos = Golos_Text({
  subsets: ["cyrillic", "latin"],
  weight: ["400", "500"],
  variable: "--font-golos",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["cyrillic", "latin"],
  weight: ["200", "300"],
  variable: "--font-jetbrains",
  display: "swap",
});

const TITLE = "Озоряй";
const DESCRIPTION = "Ты озоряешь мою жизнь, принцесса";

/**
 * Тот же префикс, что в next.config: на своём домене пустой, на адресе вида
 * aintonx.github.io/ozoryay — «/ozoryay». Значки лежат в public и потому
 * префикс к ним нужно приписать руками.
 */
const base = process.env.BASE_PATH ?? "";

export const metadata: Metadata = {
  // Нужен, чтобы относительные пути картинок превратились в абсолютные:
  // телеграм и все прочие показывают превью только по полному адресу.
  metadataBase: new URL("https://ozoryay.space"),
  title: TITLE,
  description: DESCRIPTION,
  applicationName: TITLE,
  icons: {
    // Первым идёт svg: он один остаётся резким на любом экране и в любом
    // размере, png — запасной вариант для тех, кто svg в значках не умеет.
    icon: [
      { url: `${base}/icon.svg`, type: "image/svg+xml" },
      { url: `${base}/icon-32.png`, sizes: "32x32", type: "image/png" },
      { url: `${base}/icon-192.png`, sizes: "192x192", type: "image/png" },
    ],
    apple: `${base}/apple-touch-icon.png`,
    shortcut: `${base}/favicon.ico`,
  },
  manifest: `${base}/site.webmanifest`,
  openGraph: {
    type: "website",
    locale: "ru_RU",
    url: "https://ozoryay.space",
    siteName: TITLE,
    title: TITLE,
    description: DESCRIPTION,
    images: [
      { url: `${base}/og.png`, width: 1200, height: 630, alt: "Рассвет над холмами", type: "image/png" },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [`${base}/og.png`],
  },
  appleWebApp: {
    capable: true,
    title: TITLE,
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#05070F",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  // Это не документ, а один экран: зумить и таскать его нечего. Случайный
  // щипок иначе оставляет сайт съехавшим вбок, и вернуть его обратно
  // на телефоне почти невозможно.
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ru"
      className={`${prata.variable} ${spectral.variable} ${golos.variable} ${jetbrains.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
