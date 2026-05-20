import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { FileUploader } from "@/components/upload/FileUploader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNumber } from "@/lib/utils";
import { useDashboardStore } from "@/stores/dashboardStore";
import type { Id } from "../../convex/_generated/dataModel";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

const statusLabel: Record<string, string> = {
  pending: "Pendente",
  uploading: "Enviando",
  processing: "Processando",
  completed: "Concluído",
  failed: "Falhou",
};

type UploadRow = {
  _id: string;
  fileName: string;
  createdAt: number;
  fileSize: number;
  status: string;
  rowCount?: number;
  sheetCount?: number;
  shopping?: string;
  errorMessage?: string;
};

export function UploadsPage() {
  const uploads = useQuery(api.uploads.list, { limit: 50 });
  const removeUpload = useMutation(api.uploads.remove);
  const setSelectedUpload = useDashboardStore((s) => s.setSelectedUpload);
  const selectedUploadId = useDashboardStore((s) => s.selectedUploadId);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const handleRemove = async (u: UploadRow) => {
    const metrics =
      u.rowCount != null
        ? `${u.rowCount.toLocaleString("pt-BR")} métricas`
        : "os dados deste upload";
    const ok = window.confirm(
      `Remover "${u.fileName}"?\n\nIsso apaga permanentemente o arquivo Excel e ${metrics} da base histórica. Esta ação não pode ser desfeita.`
    );
    if (!ok) return;

    setRemovingId(u._id);
    try {
      await removeUpload({ uploadId: u._id as Id<"uploads"> });
      if (selectedUploadId === u._id) {
        setSelectedUpload(null);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao remover";
      window.alert(msg);
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold">Uploads</h1>
        <p className="text-muted-foreground">
          Envie planilhas não padronizadas — o sistema detecta e normaliza
          automaticamente
        </p>
      </div>

      <FileUploader />

      <Card>
        <CardHeader>
          <CardTitle>Histórico de uploads</CardTitle>
        </CardHeader>
        <CardContent>
          {!uploads ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : uploads.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum upload ainda
            </p>
          ) : (
            <div className="space-y-3">
              {uploads.map((u: UploadRow) => {
                const isRemoving =
                  u.errorMessage === "__removing__" || removingId === u._id;
                const displayStatus = isRemoving
                  ? "Removendo..."
                  : (statusLabel[u.status] ?? u.status);

                return (
                  <div
                    key={u._id}
                    className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border p-4"
                  >
                    <div>
                      <p className="font-medium">{u.fileName}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(u.createdAt).toLocaleString("pt-BR")} ·{" "}
                        {formatNumber(u.fileSize)} bytes
                        {u.shopping && ` · ${u.shopping}`}
                        {u.rowCount != null && ` · ${u.rowCount} métricas`}
                        {u.sheetCount != null && ` · ${u.sheetCount} abas`}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          isRemoving
                            ? "bg-muted text-muted-foreground"
                            : u.status === "completed"
                              ? "bg-success/15 text-success"
                              : u.status === "failed"
                                ? "bg-destructive/15 text-destructive"
                                : "bg-primary/15 text-primary"
                        }`}
                      >
                        {displayStatus}
                      </span>
                      {u.status === "completed" && !isRemoving && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setSelectedUpload(u._id as Id<"uploads">)
                          }
                          asChild
                        >
                          <Link to="/">Ver dashboard</Link>
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        disabled={isRemoving}
                        onClick={() => void handleRemove(u)}
                        title="Remover upload e dados"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Remover</span>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
