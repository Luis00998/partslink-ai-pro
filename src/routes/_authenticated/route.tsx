import { createFileRoute, Outlet, redirect, Link, useRouter, useLocation, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { Search, Sparkles, History, LogOut, Menu, X, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthedLayout,
});

const nav = [
  { to: "/busca", label: "Buscar peça", icon: Search },
  { to: "/parts-ai", label: "Parts AI", icon: Sparkles },
  { to: "/historico", label: "Histórico", icon: History },
];

function AuthedLayout() {
  const router = useRouter();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => setMobileOpen(false), [location.pathname]);

  const handleSignOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    toast.success("Sessão encerrada");
    navigate({ to: "/auth", replace: true });
    router.invalidate();
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="flex h-14 items-center justify-between border-b border-border bg-sidebar px-4 md:hidden">
        <Link to="/busca" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded bg-gradient-primary">
            <Layers className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-sm font-semibold">PartsLink AI</span>
        </Link>
        <Button variant="ghost" size="icon" onClick={() => setMobileOpen((v) => !v)}>
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      <div className="flex">
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-30 w-64 shrink-0 border-r border-sidebar-border bg-sidebar transition-transform md:sticky md:top-0 md:h-screen md:translate-x-0",
            mobileOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="hidden h-16 items-center gap-2 border-b border-sidebar-border px-6 md:flex">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gradient-primary shadow-glow">
              <Layers className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <div className="text-sm font-semibold leading-tight">PartsLink</div>
              <div className="text-[10px] uppercase tracking-widest text-primary">AI Pro</div>
            </div>
          </div>

          <nav className="flex flex-col gap-1 p-3">
            {nav.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="group flex items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground transition hover:bg-sidebar-accent"
                activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground font-medium" }}
              >
                <item.icon className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="absolute bottom-0 left-0 right-0 border-t border-sidebar-border p-3">
            <Button variant="ghost" size="sm" className="w-full justify-start" onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" /> Sair
            </Button>
          </div>
        </aside>

        {mobileOpen && (
          <button
            className="fixed inset-0 z-20 bg-black/50 md:hidden"
            onClick={() => setMobileOpen(false)}
            aria-label="Fechar menu"
          />
        )}

        <main className="min-h-screen flex-1 md:min-h-screen">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
