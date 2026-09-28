"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { useData } from "./DataProvider";
import { Icon } from "./Icon";
import { Button, Card } from "./ui";
import { getVeteranPref, setVeteranPref, type VeteranPref } from "@/lib/veteran-pref";

const TOOLS = [
  { href: "/app/veteranos", key: "disability" },
  { href: "/app/veteranos/gi-bill", key: "giBill" },
  { href: "/app/veteranos/beneficios", key: "benefits" },
] as const;

/** Home: asks once if the person is a veteran; if yes, shows the veteran tools. */
export function VeteranCard() {
  const t = useTranslations("veteranCard");
  const { profile } = useData();
  const [pref, setPref] = useState<VeteranPref | null | undefined>(undefined);

  useEffect(() => {
    if (profile) setPref(getVeteranPref(profile.id));
  }, [profile]);

  if (!profile || pref === undefined || pref === "no") return null;

  function answer(next: VeteranPref) {
    setVeteranPref(profile!.id, next);
    setPref(next);
  }

  if (pref === null) {
    return (
      <Card>
        <div className="stack-sm">
          <p className="t-heading">{t("question")}</p>
          <p className="t-caption muted">{t("why")}</p>
          <div className="field-row">
            <Button onClick={() => answer("yes")}>{t("yes")}</Button>
            <Button variant="secondary" onClick={() => answer("no")}>
              {t("no")}
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="stack-sm">
        <div className="row row--between">
          <p className="t-heading">{t("title")}</p>
          <Icon name="heart" size={20} />
        </div>
        <p className="t-caption muted">{t("thanks")}</p>
        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {TOOLS.map((tool) => (
            <li key={tool.key}>
              <Link href={tool.href} className="row" style={{ textDecoration: "none", minHeight: 44 }}>
                <span className="t-label grow">{t(tool.key)}</span>
                <Icon name="forward" size={20} />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}

/** Settings: turn the veteran card on Home on or off. */
export function VeteranSetting({ label, help }: { label: string; help: string }) {
  const { profile } = useData();
  const [on, setOn] = useState(false);

  useEffect(() => {
    if (profile) setOn(getVeteranPref(profile.id) === "yes");
  }, [profile]);

  if (!profile) return null;
  return (
    <label className="row" style={{ cursor: "pointer" }}>
      <div className="grow">
        <p className="t-label">{label}</p>
        <p className="t-caption muted">{help}</p>
      </div>
      <input
        type="checkbox"
        className="toggle"
        checked={on}
        onChange={(e) => {
          setVeteranPref(profile.id, e.target.checked ? "yes" : "no");
          setOn(e.target.checked);
        }}
      />
    </label>
  );
}
