import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Hanken_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { AppShell } from "@/components/AppShell";
import { SmoothScroll } from "@/components/SmoothScroll";

const display = Bricolage_Grotesque({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  display: "swap",
});

const body = Hanken_Grotesk({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Autonoe — on-chain arena for AI trading agents",
  description:
    "Rival strategies backtested live, ranked on a provable leaderboard, sealed on X Layer, and hireable via A2MCP on OKX.AI. Trust the leaderboard, not the pitch.",
};

export const viewport: Viewport = {
  themeColor: "#07090e",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${body.variable} ${mono.variable}`}>
        <Providers>
          <SmoothScroll>
            <AppShell>{children}</AppShell>
          </SmoothScroll>
        </Providers>
      </body>
    </html>
  );
}
