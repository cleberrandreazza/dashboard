import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings2, Plus, Pencil, Trash2 } from "lucide-react";
import {
  ProfileEditor,
  emptyProfileForm,
  profileToForm,
  type ProfileFormState,
} from "@/components/profiles/ProfileEditor";

type ProfileDoc = {
  _id: string;
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
};

export function ProfilesPage() {
  const profiles = useQuery(api.sheetProfiles.list) as ProfileDoc[] | undefined;
  const seed = useMutation(api.sheetProfiles.seedMultiplanDefault);
  const remove = useMutation(api.sheetProfiles.remove);

  const [mode, setMode] = useState<"list" | "edit" | "create">("list");
  const [editingForm, setEditingForm] = useState<ProfileFormState | null>(null);

  const startCreate = () => {
    setEditingForm(emptyProfileForm());
    setMode("create");
  };

  const startEdit = (p: ProfileDoc) => {
    setEditingForm(profileToForm(p));
    setMode("edit");
  };

  const handleDelete = async (profileId: string) => {
    if (!confirm(`Excluir perfil "${profileId}"?`)) return;
    try {
      await remove({ profileId });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao excluir");
    }
  };

  if (mode === "create" || mode === "edit") {
    if (!editingForm) return null;
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold">Perfis de leitura</h1>
          <p className="text-muted-foreground">
            Configure como o sistema interpreta cada aba do Excel.
          </p>
        </div>
        <ProfileEditor
          initial={editingForm}
          isNew={mode === "create"}
          onSaved={() => {
            setMode("list");
            setEditingForm(null);
          }}
          onCancel={() => {
            setMode("list");
            setEditingForm(null);
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Perfis & Governança</h1>
          <p className="text-muted-foreground max-w-2xl">
            Perfis definem o mapeamento de abas, domínios e layouts. Uploads usam
            o perfil padrão automaticamente.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => void seed({})}>
            Restaurar Multiplan
          </Button>
          <Button size="sm" className="gap-2" onClick={startCreate}>
            <Plus className="h-4 w-4" />
            Novo perfil
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings2 className="h-5 w-5" />
            Perfis cadastrados
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!profiles ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : profiles.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum perfil. Restaure o padrão Multiplan ou crie um novo.
            </p>
          ) : (
            profiles.map((p) => (
              <div
                key={p._id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border p-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{p.name}</p>
                    {p.isDefault && (
                      <span className="text-xs bg-primary/15 text-primary px-2 py-0.5 rounded-full">
                        Padrão
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {p.profileId} · {p.config.sheetRules.filter((r) => !r.skip).length}{" "}
                    abas ativas
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    onClick={() => startEdit(p)}
                  >
                    <Pencil className="h-3 w-3" />
                    Editar
                  </Button>
                  {p.profileId !== "multiplan_regional_sul" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => void handleDelete(p.profileId)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Governança</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>· Shoppings: PKB, BSS, PCN (regex no nome do arquivo)</p>
          <p>· Plataformas: use aliases (ex: ig → Instagram)</p>
          <p>· Layout matricial: Redes Sociais, Shopping, Fornecedores…</p>
          <p>· Layout tabela: Influs</p>
          <p>· Abas metadata: ignoradas no processamento</p>
        </CardContent>
      </Card>
    </div>
  );
}
