import Link from "next/link";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LanguageToggle } from "@/components/LanguageToggle";
import { MoneyStyleQuiz } from "@/components/MoneyStyleQuiz";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("moneyStyle");
  return { title: t("title"), description: t("lead") };
}

// Money Style quiz: public, no account needed, easy to share.
export default function Estilo() {
  return (
    <main className="page page--bare">
      <header className="topbar">
        <Link href="/" className="wordmark">
          Cuenta Clara
        </Link>
        <LanguageToggle />
      </header>
      <MoneyStyleQuiz />
    </main>
  );
}
