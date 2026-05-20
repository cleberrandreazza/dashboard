import { useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function formatAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (
    lower.includes("invalid password") ||
    lower.includes("mínimo 8") ||
    lower.includes("minimum")
  ) {
    return "A senha deve ter no mínimo 8 caracteres.";
  }
  if (lower.includes("invalid credentials")) {
    return "E-mail ou senha incorretos. Solicite acesso a um administrador.";
  }
  return message;
}

export function LoginPage() {
  const { signIn } = useAuthActions();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (password.length < 8) {
      setError("A senha deve ter no mínimo 8 caracteres.");
      setLoading(false);
      return;
    }

    try {
      await signIn("password", { email, password, flow: "signIn" });
    } catch (err) {
      const raw =
        err instanceof Error ? err.message : "Erro na autenticação";
      setError(formatAuthError(raw));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15">
            <BarChart3 className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="font-display text-2xl">DataInsight</CardTitle>
          <p className="text-sm text-muted-foreground">
            Plataforma de analytics Multiplan Regional Sul
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="email"
              placeholder="E-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
            <Input
              type="password"
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="current-password"
            />
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Aguarde..." : "Entrar"}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Novo usuário? Peça a um administrador logado em{" "}
              <strong>Usuários</strong> após entrar no sistema.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
