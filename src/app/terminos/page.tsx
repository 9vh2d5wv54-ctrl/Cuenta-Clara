import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { LegalPage } from "@/components/LegalPage";
import { TERMS } from "@/lib/legal";

export async function generateMetadata(): Promise<Metadata> {
  const d = TERMS[(await getLocale()) === "en" ? "en" : "es"];
  return { title: d.title, description: d.lead };
}

export default function Page() {
  return <LegalPage doc={TERMS} />;
}
