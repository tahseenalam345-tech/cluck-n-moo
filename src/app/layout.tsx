import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/context/ThemeContext";
import { OrderModeProvider } from "@/context/OrderModeContext";

export const metadata: Metadata = {
  title: "Cluck N Moo (CNM) — juiciest in town | Kharian, Pakistan",
  description:
    "Official online ordering for Cluck N Moo (CNM), Main GT Road Kharian. Smash burgers, crispy zinger, fried chicken, and deals. Delivery, pickup & dine-in.",
  applicationName: "Cluck N Moo",
  manifest: "/manifest.json",
  icons: {
    icon: "/logo.png",
    apple: "/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0C0C0C",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="light">

      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body>
        <ThemeProvider>
          <OrderModeProvider>
            {children}
          </OrderModeProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
