import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Icon } from "@/components/Icon";
import { LESSONS, lessonBySlug } from "@/lib/lessons";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return LESSONS.map((l) => ({ slug: l.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lesson = lessonBySlug((await params).slug);
  if (!lesson) return {};
  const text = lesson[(await getLocale()) === "en" ? "en" : "es"];
  return { title: text.title, description: text.summary };
}

export default async function LessonPage({ params }: Props) {
  const { slug } = await params;
  const lesson = lessonBySlug(slug);
  if (!lesson) notFound();
  const t = await getTranslations("academy");
  const text = lesson[(await getLocale()) === "en" ? "en" : "es"];
  const next = LESSONS[(LESSONS.indexOf(lesson) + 1) % LESSONS.length];
  const nextText = next[(await getLocale()) === "en" ? "en" : "es"];

  return (
    <main className="page page--bare">
      <header className="topbar">
        <Link href="/aprende" className="t-label" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          <Icon name="back" size={20} />
          {t("all")}
        </Link>
        <LanguageToggle />
      </header>

      <article className="stack">
        <div className="stack-sm">
          <p className="t-caption muted">{t("minutes", { n: lesson.minutes })}</p>
          <h1 className="t-title">{text.title}</h1>
          <p className="t-body muted">{text.summary}</p>
        </div>
        {text.blocks.map((b, i) =>
          "p" in b ? (
            <p key={i} className="t-body">
              {b.p}
            </p>
          ) : "list" in b ? (
            <ul key={i} className="t-body stack-sm" style={{ margin: 0, paddingInlineStart: 20 }}>
              {b.list.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : (
            <div key={i} className="card card--clara stack-sm">
              <p className="t-label">{t("example")}</p>
              <p className="t-body">{b.example}</p>
            </div>
          ),
        )}
      </article>

      <Link href={lesson.tryHref} className="btn btn--primary btn--block">
        {text.tryLabel}
      </Link>
      <Link href={`/aprende/${next.slug}`} className="card row" style={{ textDecoration: "none" }}>
        <span className="grow stack-sm">
          <span className="t-caption muted">{t("next")}</span>
          <span className="t-label">{nextText.title}</span>
        </span>
        <Icon name="forward" size={20} />
      </Link>
      <p className="t-caption muted">{t("notAdvice")}</p>
    </main>
  );
}
