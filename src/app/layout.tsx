import type { Metadata, Viewport } from "next";
import { Inter, Roboto_Flex, Roboto_Mono } from "next/font/google";
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

const robotoMono = Roboto_Mono({
  subsets: ["latin"],
  variable: "--font-roboto-mono",
  display: "swap",
});

const robotoFlex = Roboto_Flex({
  subsets: ["latin"],
  variable: "--font-roboto-flex",
  display: "swap",
});

export const metadata: Metadata = {
  title: "MyFakeBook — Online lead sheets",
  description: "Write, organize, hear, and export your lead sheets online.",
  applicationName: "MyFakeBook",
  appleWebApp: {
    capable: true,
    title: "MyFakeBook",
    statusBarStyle: "default",
  },
  icons: {
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#E10600",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html className={`${inter.variable} ${robotoMono.variable} ${robotoFlex.variable} ${componentStyles.fontVariables}`} lang="en">
      <body className={componentStyles.pageBody}>
        <AppProviders>{children}</AppProviders>
        <ServiceWorkerRegistration />
        <Analytics />
      </body>
    </html>
  );
}
