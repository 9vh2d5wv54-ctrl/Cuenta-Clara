"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Icon, type IconName } from "./Icon";

const TABS: { href: string; key: "home" | "sends" | "add" | "goals" | "settings"; icon: IconName }[] = [
  { href: "/app", key: "home", icon: "home" },
  { href: "/app/envios", key: "sends", icon: "send" },
  { href: "/app/add", key: "add", icon: "plus" },
  { href: "/app/metas", key: "goals", icon: "target" },
  { href: "/app/ajustes", key: "settings", icon: "settings" },
];

export function TabBar() {
  const t = useTranslations("nav");
  const path = usePathname();
  if (path.startsWith("/app/setup")) return null;
  return (
    <nav className="tabbar" aria-label="Cuenta Clara">
      <div className="tabbar__inner">
        {TABS.map((tab) => {
          const active = path === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="tabbar__item"
              aria-current={active ? "page" : undefined}
            >
              <span className={tab.key === "add" ? "tabbar__icon tabbar__add" : "tabbar__icon"}>
                <Icon name={tab.icon} />
              </span>
              {t(tab.key)}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
