import type { Metadata } from "next";
import { Archivo, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const archivo = Archivo({ subsets: ["latin"], variable: "--font-archivo", weight: ["600", "700", "800"] });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains" });

export const metadata: Metadata = {
  title: "Ritual Inference Explorer",
  description:
    "Etherscan for verifiable AI. A chain-wide, read-only explorer of every AI inference call on Ritual Chain — decoded input → output, executor, and TEE proof.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${archivo.variable} ${inter.variable} ${jetbrains.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
