import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/context/ThemeContext";
import { OrderModeProvider } from "@/context/OrderModeContext";
import { OrderModeModal } from "@/components/OrderModeModal";

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
  themeColor: "#FAF6F0",
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
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var theme = localStorage.getItem('cnm_theme');
                if (theme === 'dark' || theme === 'light') {
                  document.documentElement.setAttribute('data-theme', theme);
                } else {
                  document.documentElement.setAttribute('data-theme', 'light');
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body>
        <ThemeProvider>
          <OrderModeProvider>
            {children}
            <OrderModeModal />
          </OrderModeProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
