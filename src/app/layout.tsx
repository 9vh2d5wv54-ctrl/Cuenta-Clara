import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Bricolage_Grotesque, Figtree } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { AnalyticsScripts } from "@/components/AnalyticsScripts";
import { parseTheme, THEME_COOKIE } from "@/lib/theme";
import { SITE_URL } from "@/lib/brand";
import "./globals.css";

// Brand type: Bricolage Grotesque for titles and money, Figtree for everything else.
const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["700"],
  variable: "--font-bricolage",
  display: "swap",
});
const figtree = Figtree({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-figtree",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("landing");
  return {
    metadataBase: new URL(SITE_URL),
    title: "Pocket Recon",
    description: t("sub"),
    applicationName: "Pocket Recon",
    // How the app ranks what it is: Clara (AI) finance, technology, business, education, then veterans and Spanish.
    category: "finance",
    keywords: [
      "AI money coach",
      "AI finance app",
      "budget app",
      "business finance for self-employed",
      "side hustle income",
      "gig work budget",
      "tax set-aside",
      "productivity",
      "financial education",
      "veterans",
      "Spanish budget app",
    ],
    // The link preview picture is src/app/opengraph-image.png (and twitter-image.png).
    openGraph: { title: "Pocket Recon", description: t("sub"), siteName: "Pocket Recon", type: "website", url: "/" },
    twitter: { card: "summary_large_image", title: "Pocket Recon", description: t("sub") },
    // Full screen with the Pocket Recon name when opened from the iPhone home screen.
    appleWebApp: { capable: true, title: "Pocket Recon", statusBarStyle: "default" },
  };
}

export async function generateViewport(): Promise<Viewport> {
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);
  const night = "#07152f";
  const day = "#f8f8f4";
  return {
    width: "device-width",
    initialScale: 1,
    themeColor:
      theme === "auto"
        ? [
            { media: "(prefers-color-scheme: light)", color: day },
            { media: "(prefers-color-scheme: dark)", color: night },
          ]
        : theme === "light"
          ? day
          : night,
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);
  return (
    <html lang={locale} data-theme={theme} className={`${bricolage.variable} ${figtree.variable}`}>
      <body>
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
        <AnalyticsScripts />
      </body>
    </html>
  );
}
