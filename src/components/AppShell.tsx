import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LayoutDashboard, Link2, LogOut, Menu, X } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const TABS = [
  { to: "/dashboard", label: "My skills", icon: LayoutDashboard },
  { to: "/chains", label: "Skill chains", icon: Link2 },
] as const;

export function AppShell({ email, children }: { email?: string; children: React.ReactNode }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [mobileOpen, setMobileOpen] = useState(false);

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const nav = (
    <>
      <Link to="/dashboard" className="mb-8 block px-2 font-display text-lg font-bold tracking-tight">
        Skill<span className="text-gradient">Swap</span>
      </Link>

      <nav className="flex flex-1 flex-col gap-1">
        {TABS.map((tab) => {
          const active = pathname === tab.to;
          const Icon = tab.icon;
          return (
            <Link
              key={tab.to}
              to={tab.to}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
              }`}
            >
              <Icon className={`h-4 w-4 ${active ? "text-primary" : ""}`} strokeWidth={2} />
              {tab.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-3 border-t border-sidebar-border pt-4">
        {email ? <p className="truncate px-2 text-xs text-muted-foreground">{email}</p> : null}
        <button
          onClick={signOut}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground"
        >
          <LogOut className="h-4 w-4" strokeWidth={2} />
          Sign out
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen lg:flex">
      {/* mobile top bar */}
      <div className="flex items-center justify-between border-b border-border bg-card/70 px-4 py-3 backdrop-blur lg:hidden">
        <Link to="/dashboard" className="font-display text-lg font-bold tracking-tight">
          Skill<span className="text-gradient">Swap</span>
        </Link>
        <button
          onClick={() => setMobileOpen((v) => !v)}
          className="rounded-full border border-border p-2 text-foreground"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>
      {mobileOpen ? (
        <div className="flex flex-col border-b border-border bg-secondary/40 p-4 lg:hidden">{nav}</div>
      ) : null}

      {/* desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-sidebar-border bg-secondary/40 px-4 py-6 lg:flex">
        {nav}
      </aside>

      <main className="min-w-0 flex-1 px-4 py-8 sm:px-8 lg:py-10">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>
    </div>
  );
}
