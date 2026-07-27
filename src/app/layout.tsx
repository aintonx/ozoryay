import type { Metadata, Viewport } from "next";
import { Prata, Spectral, Golos_Text, JetBrains_Mono } from "next/font/google";
import "./globals.css";

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

export const metadata: Metadata = {
  title: "Озоряй",
  description: "Ты озоряешь мою жизнь, принцесса",
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
