import type { Metadata } from "next";
import { Inconsolata, Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "@fontsource/bravura/400.css";

import { AppProviders } from "@/components/layout/app-providers";

import "./globals.css";
import componentStyles from "./layout.module.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const inconsolata = Inconsolata({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-inconsolata",
});

export const metadata: Metadata = {
  title: "MyFakebook — Online lead sheets",
  description: "Write, organize, hear, and export your lead sheets online.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html className={`${inter.variable} ${inconsolata.variable} ${componentStyles.style0}`} lang="en">
      <body className={componentStyles.style1}>
        <AppProviders>{children}</AppProviders>
        <Analytics />
      </body>
    </html>
  );
}
