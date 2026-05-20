import { useState, type ReactNode } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { RecordsTable } from "./RecordsTable";
import { PeriodFilters } from "./PeriodFilters";
import { Button } from "@/components/ui/button";
import { Download, LineChart } from "lucide-react";
import { Link } from "react-router-dom";
import { downloadCsv, recordsToCsv } from "@/lib/export-csv";
import { cn } from "@/lib/utils";
import {
  useDashboardStore,
  useDashboardFilterArgs,
  usePeriodFilterArgs,
} from "@/stores/dashboardStore";
import {
  RegionalView,
  TemporalView,
  MediaView,
  SocialView,
  ExecutiveSummaryView,
  ShoppingDetailView,
} from "./HistoricalPanels";
import { KpiGrid } from "./KpiGrid";
import { TimeSeriesChart, CategoryBarChart } from "./Charts";

const TABS = [
  { id: "regional", label: "Regional" },
  { id: "comparative", label: "Por shopping" },
  { id: "temporal", label: "Evolução histórica" },
  { id: "media", label: "Mídia" },
  { id: "social", label: "Social & creators" },
  { id: "executive", label: "Executivo" },
  { id: "crm", label: "CRM" },
  { id: "ops", label: "Operacional" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function ExecutiveDashboard() {
  const filterArgs = useDashboardFilterArgs();
  const periodArgs = usePeriodFilterArgs();
  const executive = useQuery(api.dashboards.getExecutive, filterArgs);
  const exportData = useQuery(api.records.exportConsolidated, periodArgs);
  const selectedUploadId = useDashboardStore((s) => s.selectedUploadId);
  const [tab, setTab] = useState<TabId>("regional");
  const [shopTab, setShopTab] = useState<string>("");

  if (executive === undefined) {
    return <p className="text-muted-foreground">Carregando dashboard...</p>;
  }

  if (!executive) {
    return (
      <p className="text-muted-foreground">
        Nenhum dado para os filtros selecionados. Ajuste período/shopping ou faça
        upload de planilhas (append mensal na base única).
      </p>
    );
  }

  const shoppings = executive.shoppings;
  const activeShop = shopTab || shoppings[0] || "";

  const handleExport = () => {
    if (!exportData?.length) return;
    const csv = recordsToCsv(exportData);
    const suffix = executive.filterLabel.replace(/\s+/g, "-").replace(/\//g, "-");
    downloadCsv(
      csv,
      `datainsight-${suffix}-${new Date().toISOString().slice(0, 10)}.csv`
    );
  };

  let content: ReactNode = null;

  if (tab === "regional") {
    content = <RegionalView data={executive.regional} />;
  } else if (tab === "comparative" && activeShop && executive.byShopping[activeShop]) {
    content = (
      <ShoppingDetailView
        data={executive.byShopping[activeShop]}
        shopping={activeShop}
      />
    );
  } else if (tab === "comparative") {
    content = <RegionalView data={executive.comparative} />;
  } else if (tab === "temporal") {
    content = <TemporalView data={executive.temporal} />;
  } else if (tab === "media") {
    content = <MediaView data={executive.media} />;
  } else if (tab === "social") {
    content = <SocialView data={executive.social} />;
  } else if (tab === "executive") {
    content = (
      <ExecutiveSummaryView data={executive.executive ?? executive.regional} />
    );
  } else if (tab === "crm") {
    content = (
      <div className="space-y-6">
        <KpiGrid kpis={executive.crm.kpis} />
        <TimeSeriesChart data={executive.crm.timeSeries} title="CRM — evolução" />
        <CategoryBarChart data={executive.crm.byCategory} title="Por canal" />
      </div>
    );
  } else if (tab === "ops") {
    content = (
      <div className="space-y-6">
        <KpiGrid kpis={executive.shopping.kpis} />
        <div className="grid gap-6 lg:grid-cols-2">
          <TimeSeriesChart data={executive.shopping.timeSeries} title="Shopping" />
          <TimeSeriesChart data={executive.multi.timeSeries} title="Multi / App" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PeriodFilters />

      <p className="text-xs text-muted-foreground">
        Base histórica única · {executive.recordCount.toLocaleString("pt-BR")}{" "}
        métricas
        {executive.totalRecords !== executive.recordCount &&
          ` (de ${executive.totalRecords.toLocaleString("pt-BR")} no total)`}
        {" · "}
        {executive.filterLabel}
      </p>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                tab === t.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <Button variant="outline" size="sm" className="gap-2" asChild>
          <Link to="/looker">
            <LineChart className="h-4 w-4" />
            Export Looker
          </Link>
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={handleExport}
          disabled={!exportData?.length}
        >
          <Download className="h-4 w-4" />
          CSV rápido
        </Button>
      </div>

      {tab === "comparative" && shoppings.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {shoppings.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setShopTab(s)}
              className={cn(
                "rounded-lg border px-4 py-2 text-sm font-medium transition-colors",
                activeShop === s
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:bg-muted"
              )}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {content}

      <RecordsTable uploadId={selectedUploadId ?? undefined} />
    </div>
  );
}
