import type { Metadata, Viewport } from "next";
import { Inconsolata, Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";

import { AppProviders } from "@/components/app-shell/app-providers";
import { ServiceWorkerRegistration } from "@/components/app-shell/service-worker-registration";

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
  applicationName: "MyFakebook",
  appleWebApp: {
    capable: true,
    title: "MyFakebook",
    statusBarStyle: "default",
  },
  icons: {
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#5d54d9",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html className={`${inter.variable} ${inconsolata.variable} ${componentStyles.fontVariables}`} lang="en">
      <body className={componentStyles.pageBody}>
        <AppProviders>{children}</AppProviders>
        <ServiceWorkerRegistration />
        <Analytics />
      </body>
    </html>
  );
}
