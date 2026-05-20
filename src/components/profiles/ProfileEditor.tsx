import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Save } from "lucide-react";
import { MULTIPLAN_DEFAULT_PROFILE } from "@shared/multiplan/defaultProfile";

export interface SheetRuleForm {
  sheetPattern: string;
  domain: string;
  layout: string;
  skip: boolean;
}

export interface ProfileFormState {
  profileId: string;
  name: string;
  description: string;
  isDefault: boolean;
  shoppingFromFileRegex: string;
  sheetRules: SheetRuleForm[];
  aliasesText: string;
}

const DOMAINS = [
  "social_media",
  "analytics",
  "multi_app",
  "shopping",
  "influencers",
  "vendors",
  "venue",
  "unknown",
];

const LAYOUTS = [
  { value: "matrix_metrics", label: "Matricial (métricas × meses)" },
  { value: "table_records", label: "Tabela (linhas)" },
  { value: "metadata", label: "Metadados (ignorar)" },
];

export function emptyProfileForm(): ProfileFormState {
  return {
    profileId: "",
    name: "",
    description: "",
    isDefault: false,
    shoppingFromFileRegex: "(PKB|BSS|PCN)",
    sheetRules: [
      {
        sheetPattern: "",
        domain: "social_media",
        layout: "matrix_metrics",
        skip: false,
      },
    ],
    aliasesText: "ig=Instagram\ninsta=Instagram",
  };
}

export function profileToForm(p: {
  profileId: string;
  name: string;
  description?: string;
  isDefault: boolean;
  config: {
    shoppingFromFileRegex: string;
    sheetRules: Array<{
      sheetPattern: string;
      domain: string;
      layout: string;
      skip?: boolean;
    }>;
    platformAliases?: Record<string, string>;
  };
}): ProfileFormState {
  const aliasesText = p.config.platformAliases
    ? Object.entries(p.config.platformAliases)
        .map(([k, v]) => `${k}=${v}`)
        .join("\n")
    : "";
  return {
    profileId: p.profileId,
    name: p.name,
    description: p.description ?? "",
    isDefault: p.isDefault,
    shoppingFromFileRegex: p.config.shoppingFromFileRegex,
    sheetRules: p.config.sheetRules.map((r) => ({
      sheetPattern: r.sheetPattern,
      domain: r.domain,
      layout: r.layout,
      skip: r.skip ?? false,
    })),
    aliasesText,
  };
}

function parseAliases(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || !trimmed.includes("=")) continue;
    const [k, ...rest] = trimmed.split("=");
    const key = k.trim().toLowerCase();
    const val = rest.join("=").trim();
    if (key && val) out[key] = val;
  }
  return out;
}

interface ProfileEditorProps {
  initial: ProfileFormState;
  isNew?: boolean;
  onSaved: () => void;
  onCancel: () => void;
}

export function ProfileEditor({
  initial,
  isNew = false,
  onSaved,
  onCancel,
}: ProfileEditorProps) {
  const upsert = useMutation(api.sheetProfiles.upsert);
  const [form, setForm] = useState<ProfileFormState>(initial);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const updateRule = (index: number, patch: Partial<SheetRuleForm>) => {
    setForm((f) => ({
      ...f,
      sheetRules: f.sheetRules.map((r, i) =>
        i === index ? { ...r, ...patch } : r
      ),
    }));
  };

  const addRule = () => {
    setForm((f) => ({
      ...f,
      sheetRules: [
        ...f.sheetRules,
        {
          sheetPattern: "",
          domain: "social_media",
          layout: "matrix_metrics",
          skip: false,
        },
      ],
    }));
  };

  const removeRule = (index: number) => {
    setForm((f) => ({
      ...f,
      sheetRules: f.sheetRules.filter((_, i) => i !== index),
    }));
  };

  const loadDefaultTemplate = () => {
    const p = MULTIPLAN_DEFAULT_PROFILE;
    setForm({
      profileId: p.id,
      name: p.name,
      description: p.description ?? "",
      isDefault: true,
      shoppingFromFileRegex: p.shoppingFromFileRegex,
      sheetRules: p.sheetRules.map((r) => ({
        sheetPattern: r.sheetPattern,
        domain: r.domain,
        layout: r.layout,
        skip: r.skip ?? false,
      })),
      aliasesText: Object.entries(p.platformAliases ?? {})
        .map(([k, v]) => `${k}=${v}`)
        .join("\n"),
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      await upsert({
        profileId: form.profileId.trim(),
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        isDefault: form.isDefault,
        config: {
          shoppingFromFileRegex: form.shoppingFromFileRegex.trim(),
          sheetRules: form.sheetRules
            .filter((r) => r.sheetPattern.trim())
            .map((r) => ({
              sheetPattern: r.sheetPattern.trim(),
              domain: r.domain,
              layout: r.layout,
              skip: r.skip || r.layout === "metadata",
            })),
          platformAliases: parseAliases(form.aliasesText),
        },
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{isNew ? "Novo perfil" : "Editar perfil"}</CardTitle>
        {isNew && (
          <Button variant="outline" size="sm" onClick={loadDefaultTemplate}>
            Usar template Multiplan
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs text-muted-foreground">ID (único)</label>
            <Input
              value={form.profileId}
              onChange={(e) => setForm({ ...form, profileId: e.target.value })}
              disabled={!isNew}
              placeholder="multiplan_regional_sul"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Nome</label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs text-muted-foreground">Descrição</label>
            <Input
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs text-muted-foreground">
              Regex shopping no arquivo (ex: (PKB|BSS|PCN))
            </label>
            <Input
              value={form.shoppingFromFileRegex}
              onChange={(e) =>
                setForm({ ...form, shoppingFromFileRegex: e.target.value })
              }
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isDefault}
              onChange={(e) =>
                setForm({ ...form, isDefault: e.target.checked })
              }
            />
            Perfil padrão para novos uploads
          </label>
        </div>

        <div>
          <label className="text-xs text-muted-foreground block mb-1">
            Aliases de plataforma (um por linha: chave=valor)
          </label>
          <textarea
            className="w-full min-h-[80px] rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm font-mono"
            value={form.aliasesText}
            onChange={(e) => setForm({ ...form, aliasesText: e.target.value })}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium">Regras de abas</p>
            <Button variant="outline" size="sm" className="gap-1" onClick={addRule}>
              <Plus className="h-3 w-3" />
              Adicionar aba
            </Button>
          </div>
          <div className="space-y-3">
            {form.sheetRules.map((rule, index) => (
              <div
                key={index}
                className="grid gap-2 sm:grid-cols-12 items-end rounded-lg border border-border p-3"
              >
                <div className="sm:col-span-4">
                  <label className="text-xs text-muted-foreground">
                    Padrão da aba
                  </label>
                  <Input
                    value={rule.sheetPattern}
                    onChange={(e) =>
                      updateRule(index, { sheetPattern: e.target.value })
                    }
                    placeholder="Redes Sociais"
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="text-xs text-muted-foreground">Domínio</label>
                  <select
                    className="h-10 w-full rounded-lg border border-border bg-muted/50 px-2 text-sm"
                    value={rule.domain}
                    onChange={(e) =>
                      updateRule(index, { domain: e.target.value })
                    }
                  >
                    {DOMAINS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-3">
                  <label className="text-xs text-muted-foreground">Layout</label>
                  <select
                    className="h-10 w-full rounded-lg border border-border bg-muted/50 px-2 text-sm"
                    value={rule.layout}
                    onChange={(e) =>
                      updateRule(index, {
                        layout: e.target.value,
                        skip: e.target.value === "metadata",
                      })
                    }
                  >
                    {LAYOUTS.map((l) => (
                      <option key={l.value} value={l.value}>
                        {l.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2 flex justify-end">
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={form.sheetRules.length <= 1}
                    onClick={() => removeRule(index)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex gap-3">
          <Button className="gap-2" onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4" />
            {saving ? "Salvando..." : "Salvar perfil"}
          </Button>
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
