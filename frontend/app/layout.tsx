import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import { ThemeProvider } from "@/components/ui/ThemeProvider";
import { Providers } from "@/components/Providers";
import { Toaster } from "react-hot-toast";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-inter",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin", "latin-ext"],
  variable: "--font-playfair",
  display: "swap",
});

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "K1.ba";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://k1.ba";
const APP_DESC =
  process.env.NEXT_PUBLIC_APP_DESCRIPTION ||
  "Najbrži news portal u Bosni i Hercegovini – vijesti, politika, ekonomija, sport";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: `${APP_NAME} – Vijesti iz Bosne i Hercegovine`,
    template: `%s | ${APP_NAME}`,
  },
  description: APP_DESC,
  keywords: [
    "vijesti",
    "Bosna i Hercegovina",
    "BiH",
    "news",
    "portal",
    "politika",
    "ekonomija",
    "sport",
    "kultura",
  ],
  authors: [{ name: "K1 Redakcija" }],
  creator: "K1.ba",
  publisher: "K1.ba",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "bs_BA",
    alternateLocale: ["hr_HR", "sr_RS"],
    url: APP_URL,
    siteName: APP_NAME,
    title: `${APP_NAME} – Vijesti iz Bosne i Hercegovine`,
    description: APP_DESC,
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: `${APP_NAME} – Vijesti`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@k1ba",
    creator: "@k1ba",
  },
  alternates: {
    canonical: APP_URL,
    types: {
      "application/rss+xml": `${APP_URL}/feed.xml`,
    },
  },
  verification: {
    google: "your-google-verification-code",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f0f0f" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="bs"
      suppressHydrationWarning
      className={`${inter.variable} ${playfair.variable}`}
    >
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body className="min-h-screen bg-[hsl(var(--background))] font-sans antialiased">
        <Providers>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <div id="reading-progress" />
            {children}
            <Toaster
              position="bottom-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: "hsl(var(--card))",
                  color: "hsl(var(--foreground))",
                  border: "1px solid hsl(var(--border))",
                },
              }}
            />
          </ThemeProvider>
        </Providers>
      </body>
    </html>
  );
}
