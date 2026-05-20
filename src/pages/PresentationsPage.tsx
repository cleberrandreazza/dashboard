import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  generatePdfBlob,
  generatePptxBlob,
  buildSlidesFromDashboard,
} from "@/lib/presentation-export";
import { FileText, Presentation } from "lucide-react";
import type { DashboardSnapshot } from "@shared/types";

export function PresentationsPage() {
  const dashboards = useQuery(api.dashboards.list, {});
  const presentations = useQuery(api.presentations.list);
  const createPresentation = useMutation(api.presentations.create);
  const generateUrl = useMutation(api.presentations.generateUploadUrl);
  const [generating, setGenerating] = useState(false);

  const snapshot: DashboardSnapshot | undefined = dashboards?.[0]?.snapshot;

  const handleExport = async (format: "pptx" | "pdf") => {
    if (!snapshot) return;
    setGenerating(true);
    try {
      const title = "Relatório Executivo — DataInsight";
      const blob =
        format === "pptx"
          ? await generatePptxBlob(title, snapshot)
          : await generatePdfBlob(title, snapshot);

      const uploadUrl = await generateUrl();
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          "Content-Type":
            format === "pptx"
              ? "application/vnd.openxmlformats-officedocument.presentationml.presentation"
              : "application/pdf",
        },
        body: blob,
      });
      const { storageId } = (await result.json()) as { storageId: string };

      const slides = buildSlidesFromDashboard(title, snapshot);

      await createPresentation({
        title,
        format,
        dashboardId: dashboards?.[0]?._id,
        uploadId: dashboards?.[0]?.uploadId,
        slides,
        storageId: storageId as never,
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `datainsight-report.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold">Apresentações</h1>
        <p className="text-muted-foreground">
          Gere relatórios executivos em PPTX ou PDF com insights e gráficos
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 max-w-xl">
        <Button
          size="lg"
          className="gap-2"
          disabled={!snapshot || generating}
          onClick={() => void handleExport("pptx")}
        >
          <Presentation className="h-5 w-5" />
          Exportar PowerPoint
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="gap-2"
          disabled={!snapshot || generating}
          onClick={() => void handleExport("pdf")}
        >
          <FileText className="h-5 w-5" />
          Exportar PDF
        </Button>
      </div>

      {!snapshot && (
        <p className="text-sm text-muted-foreground">
          Processe um upload primeiro para gerar apresentações.
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Histórico de apresentações</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {presentations?.map((p: {
            _id: string;
            title: string;
            format: string;
            createdAt: number;
            status: string;
          }) => (
            <div
              key={p._id}
              className="flex items-center justify-between rounded-lg border border-border p-4"
            >
              <div>
                <p className="font-medium">{p.title}</p>
                <p className="text-xs text-muted-foreground">
                  {p.format.toUpperCase()} ·{" "}
                  {new Date(p.createdAt).toLocaleString("pt-BR")}
                </p>
              </div>
              <span className="text-xs text-muted-foreground">{p.status}</span>
            </div>
          ))}
          {presentations?.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nenhuma apresentação gerada
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
