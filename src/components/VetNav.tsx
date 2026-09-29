"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Icon, type IconName } from "./Icon";

/** Tabs across the three veteran tools. */
export function VetNav() {
  const t = useTranslations("veterans");
  const path = usePathname();
  const tabs: { href: string; label: string; icon: IconName }[] = [
    { href: "/app/veteranos", label: t("tabDisability"), icon: "shield" },
    { href: "/app/veteranos/gi-bill", label: t("tabGiBill"), icon: "target" },
    { href: "/app/veteranos/beneficios", label: t("tabBenefits"), icon: "check" },
  ];
  return (
    <nav className="vet-nav" aria-label={t("navLabel")}>
      {tabs.map((tab) => (
        <Link key={tab.href} href={tab.href} className="vet-nav__tab" aria-current={path === tab.href ? "page" : undefined}>
          <Icon name={tab.icon} size={16} />
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}

/** A label row with an on/off switch. */
export function SwitchRow({ label, help, checked, onChange }: { label: string; help?: string; checked: boolean; onChange: (on: boolean) => void }) {
  return (
    <label className="switch-row">
      <span className="grow stack-sm">
        <span className="t-body">{label}</span>
        {help && <span className="t-caption muted">{help}</span>}
      </span>
      <input type="checkbox" className="toggle" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}
