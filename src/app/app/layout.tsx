import { getTranslations } from "next-intl/server";
import { DataProvider } from "@/components/DataProvider";
import { TabBar } from "@/components/TabBar";
import { isDemo } from "@/lib/demo";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("common");
  return (
    <>
      {isDemo && <p className="banner">{t("demoBanner")}</p>}
      <DataProvider
        fallback={
          <main className="page">
            <p className="muted" role="status">
              {t("loading")}
            </p>
          </main>
        }
      >
        {children}
        <TabBar />
      </DataProvider>
    </>
  );
}
