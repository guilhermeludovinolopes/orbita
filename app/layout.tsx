import type { Metadata } from "next";
import { IBM_Plex_Mono, Instrument_Sans } from "next/font/google";
import "./globals.css";

const instrument = Instrument_Sans({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--fonte-texto",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--fonte-mono",
});

export const metadata: Metadata = {
  title: "Órbita · Guilherme Lopes",
  description: "Mapa pessoal das viagens de Guilherme Lopes.",
  icons: { icon: "/marca/orbita-simbolo.png" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${instrument.variable} ${plexMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
