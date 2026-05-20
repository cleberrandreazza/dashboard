import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Upload,
  Presentation,
  LogOut,
  BarChart3,
  Settings2,
  LineChart,
  Users,
} from "lucide-react";
import { useAuthActions } from "@convex-dev/auth/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/uploads", label: "Uploads", icon: Upload },
  { to: "/presentations", label: "Apresentações", icon: Presentation },
  { to: "/profiles", label: "Perfis & Governança", icon: Settings2 },
  { to: "/looker", label: "Export Looker", icon: LineChart },
  { to: "/users", label: "Usuários", icon: Users },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { signOut } = useAuthActions();

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 shrink-0 border-r border-border bg-card/40 p-4 flex flex-col">
        <div className="mb-8 flex items-center gap-2 px-2">
          <BarChart3 className="h-7 w-7 text-primary" />
          <div>
            <p className="font-display text-lg font-bold">DataInsight</p>
            <p className="text-xs text-muted-foreground">Multiplan Regional Sul</p>
          </div>
        </div>
        <nav className="flex flex-col gap-1 flex-1">
          {nav.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                location.pathname === to
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>
        <Button
          variant="ghost"
          className="justify-start gap-2 text-muted-foreground"
          onClick={() => void signOut()}
        >
          <LogOut className="h-4 w-4" />
          Sair
        </Button>
      </aside>
      <main className="flex-1 overflow-auto p-8">{children}</main>
    </div>
  );
}
