import { useCallback, useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Upload, FileSpreadsheet, X, CheckCircle2, AlertCircle, Building2 } from "lucide-react";
import { parseMultiplanWorkbook } from "@shared/multiplan/workbookParser";
import { MULTIPLAN_DEFAULT_PROFILE } from "@shared/multiplan/defaultProfile";
import { extractShoppingFromFileName } from "@shared/multiplan/platformNormalize";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface QueuedFile {
  id: string;
  file: File;
  progress: number;
  status: "queued" | "uploading" | "processing" | "done" | "error";
  error?: string;
  preview?: {
    shopping: string;
    sheets: string[];
    totalRows: number;
    domains: Record<string, number>;
    warnings: string[];
  };
}

export function FileUploader() {
  const generateUrl = useMutation(api.uploads.generateUploadUrl);
  const createUpload = useMutation(api.uploads.create);
  const seedProfile = useMutation(api.sheetProfiles.seedMultiplanDefault);
  const profiles = useQuery(api.sheetProfiles.list);

  const [dragging, setDragging] = useState(false);
  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [parserType, setParserType] = useState<"multiplan" | "generic">("multiplan");
  const [profileId, setProfileId] = useState("multiplan_regional_sul");

  useEffect(() => {
    void seedProfile({});
  }, [seedProfile]);

  useEffect(() => {
    if (profiles?.length && !profiles.find((p: { profileId: string }) => p.profileId === profileId)) {
      const def = profiles.find((p: { isDefault: boolean }) => p.isDefault) ?? profiles[0];
      if (def) setProfileId(def.profileId);
    }
  }, [profiles, profileId]);

  const processFile = useCallback(
    async (item: QueuedFile) => {
      setQueue((q) =>
        q.map((f) =>
          f.id === item.id ? { ...f, status: "uploading", progress: 10 } : f
        )
      );

      try {
        const buffer = await item.file.arrayBuffer();
        let preview: QueuedFile["preview"];

        if (parserType === "multiplan") {
          const result = parseMultiplanWorkbook(
            buffer,
            item.file.name,
            MULTIPLAN_DEFAULT_PROFILE
          );
          const domains: Record<string, number> = {};
          for (const rec of result.records) {
            domains[rec.domain] = (domains[rec.domain] ?? 0) + 1;
          }
          preview = {
            shopping: result.shopping,
            sheets: result.sheetsProcessed,
            totalRows: result.records.length,
            domains,
            warnings: result.warnings,
          };
        } else {
          const shopping =
            extractShoppingFromFileName(item.file.name) ?? "—";
          preview = {
            shopping,
            sheets: ["detecção automática"],
            totalRows: 0,
            domains: {},
            warnings: [],
          };
        }

        setQueue((q) =>
          q.map((f) =>
            f.id === item.id ? { ...f, progress: 30, preview } : f
          )
        );

        const uploadUrl = await generateUrl();
        const result = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": item.file.type },
          body: item.file,
        });
        const { storageId } = (await result.json()) as { storageId: string };

        setQueue((q) =>
          q.map((f) =>
            f.id === item.id ? { ...f, progress: 70, status: "processing" } : f
          )
        );

        await createUpload({
          fileName: item.file.name,
          fileSize: item.file.size,
          mimeType:
            item.file.type ||
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          storageId: storageId as never,
          parserType,
          profileId: parserType === "multiplan" ? profileId : undefined,
        });

        setQueue((q) =>
          q.map((f) =>
            f.id === item.id
              ? { ...f, progress: 100, status: "done" }
              : f
          )
        );
      } catch (err) {
        setQueue((q) =>
          q.map((f) =>
            f.id === item.id
              ? {
                  ...f,
                  status: "error",
                  error: err instanceof Error ? err.message : "Erro no upload",
                }
              : f
          )
        );
      }
    },
    [createUpload, generateUrl, parserType, profileId]
  );

  const addFiles = useCallback(
    (files: FileList | File[]) => {
      const valid = [...files].filter((f) => /\.(xlsx|xls)$/i.test(f.name));
      const newItems: QueuedFile[] = valid.map((file) => ({
        id: crypto.randomUUID(),
        file,
        progress: 0,
        status: "queued",
      }));
      setQueue((q) => [...newItems, ...q]);
      newItems.forEach((item) => void processFile(item));
    },
    [processFile]
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Configuração do parser</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">
              Modo de leitura
            </label>
            <select
              className="h-10 rounded-lg border border-border bg-muted/50 px-3 text-sm"
              value={parserType}
              onChange={(e) =>
                setParserType(e.target.value as "multiplan" | "generic")
              }
            >
              <option value="multiplan">Multiplan (matricial PKB/BSS/PCN)</option>
              <option value="generic">Genérico (cabeçalho + linhas)</option>
            </select>
          </div>
          {parserType === "multiplan" && (
            <div>
              <label className="text-xs text-muted-foreground block mb-1">
                Perfil de abas (editável no banco)
              </label>
              <select
                className="h-10 rounded-lg border border-border bg-muted/50 px-3 text-sm min-w-[220px]"
                value={profileId}
                onChange={(e) => setProfileId(e.target.value)}
              >
                <option value="multiplan_regional_sul">
                  Multiplan Regional Sul (padrão)
                </option>
                {profiles?.map((p: { _id: string; profileId: string; name: string }) => (
                  <option key={p._id} value={p.profileId}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </CardContent>
      </Card>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
        }}
        className={cn(
          "relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-12 transition-all",
          dragging
            ? "border-primary bg-primary/5 scale-[1.01]"
            : "border-border hover:border-primary/50"
        )}
      >
        <Upload className="mb-4 h-12 w-12 text-primary" />
        <p className="font-display text-xl font-semibold">
          Arraste planilhas Excel dos shoppings
        </p>
        <p className="mt-2 text-sm text-muted-foreground text-center max-w-md">
          PKB, BSS ou PCN no nome do arquivo — estrutura matricial (métricas ×
          meses) detectada automaticamente
        </p>
        <label className="mt-6">
          <Button asChild>
            <span>Selecionar arquivos</span>
          </Button>
          <input
            type="file"
            accept=".xlsx,.xls"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) addFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
      </div>

      {queue.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Fila de upload</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {queue.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-4 rounded-lg border border-border p-4"
              >
                <FileSpreadsheet className="h-8 w-8 shrink-0 text-accent" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium truncate">{item.file.name}</p>
                    {item.status === "done" && (
                      <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
                    )}
                    {item.status === "error" && (
                      <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
                    )}
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-foreground"
                      onClick={() =>
                        setQueue((q) => q.filter((f) => f.id !== item.id))
                      }
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <Progress value={item.progress} className="mt-2" />
                  {item.preview && (
                    <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                      <p className="flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        Shopping:{" "}
                        <span className="text-foreground font-medium">
                          {item.preview.shopping}
                        </span>
                      </p>
                      <p>
                        Abas: {item.preview.sheets.join(", ")} ·{" "}
                        {item.preview.totalRows} métricas normalizadas
                      </p>
                      {Object.keys(item.preview.domains).length > 0 && (
                        <p>
                          Domínios:{" "}
                          {Object.entries(item.preview.domains)
                            .map(([k, v]) => `${k} (${v})`)
                            .join(", ")}
                        </p>
                      )}
                      {item.preview.warnings.length > 0 && (
                        <p className="text-amber-500">
                          {item.preview.warnings[0]}
                        </p>
                      )}
                    </div>
                  )}
                  {item.error && (
                    <p className="mt-1 text-xs text-destructive">{item.error}</p>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
