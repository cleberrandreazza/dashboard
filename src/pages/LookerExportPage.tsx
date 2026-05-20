import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { usePeriodFilterArgs } from "@/stores/dashboardStore";
import { PeriodFilters } from "@/components/dashboard/PeriodFilters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  downloadLookerCsv,
  downloadLookerJson,
  buildLookerFilename,
} from "@/lib/looker-export";
import { ExternalLink, FileSpreadsheet, Download, CloudUpload } from "lucide-react";
export function LookerExportPage() {
  const periodArgs = usePeriodFilterArgs();
  const meta = useQuery(api.lookerExport.getMeta, periodArgs);
  const snapshots = useQuery(api.lookerExport.listSnapshots, { limit: 8 });
  const dataset = useQuery(api.lookerExport.getDataset, periodArgs);
  const createSnapshot = useMutation(api.lookerExport.createSnapshot);

  const [downloading, setDownloading] = useState<"csv" | "json" | null>(null);
  const [snapshotFormat, setSnapshotFormat] = useState<"csv" | "json">("csv");
  const [creatingSnapshot, setCreatingSnapshot] = useState(false);

  const filterLabel = [
    periodArgs.shopping,
    periodArgs.year,
    periodArgs.month ? `m${periodArgs.month}` : periodArgs.quarter ? `t${periodArgs.quarter}` : null,
  ]
    .filter(Boolean)
    .join("-");

  const handleDirectDownload = async (format: "csv" | "json") => {
    if (!dataset?.rows.length) return;
    setDownloading(format);
    try {
      const filename = buildLookerFilename(format, filterLabel);
      if (format === "csv") {
        downloadLookerCsv(dataset.rows, filename);
      } else {
        downloadLookerJson(dataset.rows, filename);
      }
    } finally {
      setDownloading(null);
    }
  };

  const handleCreateSnapshot = async () => {
    setCreatingSnapshot(true);
    try {
      await createSnapshot({ ...periodArgs, format: snapshotFormat });
    } finally {
      setCreatingSnapshot(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="font-display text-3xl font-bold">Exportação Looker</h1>
        <p className="text-muted-foreground mt-2">
          Gere arquivos no formato ideal para{" "}
          <strong>Looker Studio</strong> (Google): base longa, campo{" "}
          <code className="text-xs bg-muted px-1 rounded">date</code> ISO e
          dimensões de shopping, canal e métrica.
        </p>
      </div>

      <PeriodFilters />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileSpreadsheet className="h-5 w-5" />
            Resumo da base
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {!meta ? (
            <p className="text-muted-foreground">Carregando...</p>
          ) : (
            <>
              <p>
                <strong>{meta.rowCount.toLocaleString("pt-BR")}</strong> linhas
                prontas para o Looker
                {meta.totalRows !== meta.rowCount &&
                  ` (${meta.totalRows.toLocaleString("pt-BR")} no total da conta)`}
              </p>
              <p className="text-muted-foreground">
                Shoppings: {meta.shoppings.join(", ") || "—"} · Períodos:{" "}
                {meta.periods.length} meses
              </p>
              <p className="text-muted-foreground text-xs">
                Campo de data: <code>date</code> (YYYY-MM-01) · Valor numérico:{" "}
                <code>value_numeric</code>
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Download imediato</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button
            className="gap-2"
            disabled={!dataset?.rows.length || downloading !== null}
            onClick={() => void handleDirectDownload("csv")}
          >
            <Download className="h-4 w-4" />
            {downloading === "csv" ? "Gerando..." : "CSV para Looker Studio"}
          </Button>
          <Button
            variant="outline"
            className="gap-2"
            disabled={!dataset?.rows.length || downloading !== null}
            onClick={() => void handleDirectDownload("json")}
          >
            <Download className="h-4 w-4" />
            JSON
          </Button>
          {dataset?.truncated && (
            <p className="w-full text-xs text-amber-600">
              Export limitado a {dataset.maxRows.toLocaleString("pt-BR")} linhas.
              Use snapshot na nuvem para arquivo completo ou ajuste filtros.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CloudUpload className="h-5 w-5" />
            Snapshot na nuvem
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Gera um arquivo no storage do Convex com link de download — útil para
            arquivar ou subir no Google Drive / Sheets antes de conectar o Looker.
          </p>
          <div className="flex flex-wrap gap-3 items-center">
            <select
              className="h-9 rounded-lg border border-border bg-muted/50 px-3 text-sm"
              value={snapshotFormat}
              onChange={(e) =>
                setSnapshotFormat(e.target.value as "csv" | "json")
              }
            >
              <option value="csv">CSV</option>
              <option value="json">JSON</option>
            </select>
            <Button
              variant="outline"
              disabled={creatingSnapshot || !meta?.rowCount}
              onClick={() => void handleCreateSnapshot()}
            >
              {creatingSnapshot ? "Gerando..." : "Gerar snapshot"}
            </Button>
          </div>

          {snapshots && snapshots.length > 0 && (
            <ul className="space-y-2 text-sm border-t border-border pt-4">
              {snapshots.map((s) => (
                <li
                  key={s._id}
                  className="flex flex-wrap items-center justify-between gap-2"
                >
                  <span>
                    {s.fileName || "Processando..."}{" "}
                    <span className="text-muted-foreground">
                      · {s.status}
                      {s.rowCount > 0 &&
                        ` · ${s.rowCount.toLocaleString("pt-BR")} linhas`}
                    </span>
                  </span>
                  {s.status === "ready" && s.downloadUrl && (
                    <a
                      href={s.downloadUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:underline inline-flex items-center gap-1"
                    >
                      Baixar
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  {s.status === "failed" && (
                    <span className="text-destructive text-xs">
                      {s.errorMessage}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Conectar no Looker Studio</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <ol className="list-decimal list-inside space-y-1">
            <li>Baixe o CSV acima (ou snapshot).</li>
            <li>
              Importe no Google Sheets ou faça upload no Google Drive.
            </li>
            <li>
              No Looker Studio: Criar → Fonte de dados → Google Sheets ou
              Arquivo do Google Drive.
            </li>
            <li>
              Defina <code>date</code> como dimensão de data e{" "}
              <code>value_numeric</code> como métrica.
            </li>
          </ol>
          <p>
            Guia completo:{" "}
            <code className="text-xs bg-muted px-1 rounded">
              docs/LOOKER_STUDIO_SETUP.md
            </code>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
