import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { AngkutProvider } from "@/context/AngkutContext";
import "./globals.css";

const jakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Angkut.in • Sistem GeoQR Tong Sampah & Pelacak Gerobak Merjosari",
  description:
    "Prototipe Smart City MVP untuk transparansi jadwal pengangkutan sampah, pelacak pasif IoT gerobak tanpa aplikasi pekerja (Zero-UI), dan Smart Routing ke RT/RW & DLH Kota Malang.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#fafafa",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${jakartaSans.variable} ${jetbrainsMono.variable}`}
    >
      <body className="font-sans">
        <AngkutProvider>{children}</AngkutProvider>
      </body>
    </html>
  );
}

