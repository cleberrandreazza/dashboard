import { useEffect, useRef } from "react";
import { useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "../../../convex/_generated/api";

/**
 * Encerra a sessão no cliente quando o usuário foi removido do banco
 * mas o token JWT ainda está no navegador.
 */
export function SessionGuard({ children }: { children: React.ReactNode }) {
  const me = useQuery(api.users.me);
  const { signOut } = useAuthActions();
  const signingOut = useRef(false);

  useEffect(() => {
    if (me === undefined || signingOut.current) return;

    if (me === null || me.deleted) {
      signingOut.current = true;
      void signOut().finally(() => {
        signingOut.current = false;
      });
    }
  }, [me, signOut]);

  if (me === undefined) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-muted-foreground">Verificando sessão...</p>
      </div>
    );
  }

  if (me === null || me.deleted) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-muted-foreground">Encerrando sessão...</p>
      </div>
    );
  }

  return <>{children}</>;
}
