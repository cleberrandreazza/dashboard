import { useState } from "react";
import { useAction, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserPlus, Users, Trash2 } from "lucide-react";
import type { Id } from "../../convex/_generated/dataModel";
import { cn } from "@/lib/utils";

export function UsersPage() {
  const users = useQuery(api.users.list);
  const createUser = useAction(api.users.createUser);
  const removeUser = useAction(api.users.remove);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      await createUser({
        email: email.trim(),
        password,
        name: name.trim() || undefined,
      });
      setSuccess(`Usuário ${email.trim()} criado com sucesso.`);
      setEmail("");
      setPassword("");
      setName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar usuário");
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (u: {
    _id: string;
    email: string;
    name: string;
    isSelf: boolean;
  }) => {
    if (u.isSelf) return;

    const ok = window.confirm(
      `Remover o usuário "${u.name || u.email}"?\n\nIsso apaga a conta, sessões de login e todos os uploads/dados desse usuário. Esta ação não pode ser desfeita.`
    );
    if (!ok) return;

    setError("");
    setSuccess("");
    setRemovingId(u._id);
    try {
      await removeUser({ userId: u._id as Id<"users"> });
      setSuccess(`Usuário ${u.email} removido.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao remover usuário");
    } finally {
      setRemovingId(null);
    }
  };

  const userCount = users?.length ?? 0;

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="font-display text-3xl font-bold">Usuários</h1>
        <p className="text-muted-foreground mt-2">
          Apenas usuários logados podem criar ou remover contas.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <UserPlus className="h-5 w-5" />
            Novo usuário
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => void handleCreate(e)} className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">
                Nome (opcional)
              </label>
              <Input
                placeholder="Nome do analista"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">
                E-mail
              </label>
              <Input
                type="email"
                placeholder="email@empresa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="off"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">
                Senha inicial (mín. 8 caracteres)
              </label>
              <Input
                type="password"
                placeholder="Senha temporária"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
            {success && (
              <p className="text-sm text-emerald-600 dark:text-emerald-400" role="status">
                {success}
              </p>
            )}
            <Button type="submit" disabled={loading}>
              {loading ? "Criando..." : "Criar usuário"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5" />
            Usuários cadastrados
            {userCount > 0 && (
              <span className="text-sm font-normal text-muted-foreground">
                ({userCount})
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!users ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : users.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum usuário encontrado.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {users.map((u) => (
                <li
                  key={u._id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div>
                    <p className="font-medium flex items-center gap-2">
                      {u.name || u.email}
                      {u.isSelf && (
                        <span className="text-xs font-normal rounded-full bg-primary/15 text-primary px-2 py-0.5">
                          Você
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">
                      {new Date(u.createdAt).toLocaleDateString("pt-BR")}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      className={cn(
                        "text-destructive hover:bg-destructive/10 hover:text-destructive",
                        (u.isSelf || userCount <= 1) && "opacity-40"
                      )}
                      disabled={
                        u.isSelf ||
                        userCount <= 1 ||
                        removingId === u._id
                      }
                      title={
                        u.isSelf
                          ? "Não é possível remover sua própria conta"
                          : userCount <= 1
                            ? "Deve existir pelo menos um usuário"
                            : "Remover usuário"
                      }
                      onClick={() => void handleRemove(u)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {userCount <= 1 && users && users.length > 0 && (
            <p className="text-xs text-muted-foreground mt-4 border-t border-border pt-4">
              O último usuário do sistema não pode ser removido.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
