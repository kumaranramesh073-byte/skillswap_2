import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "My skills — SkillSwap" },
      {
        name: "description",
        content: "List what you can teach and what you want to learn so SkillSwap can find you a swap chain.",
      },
      { property: "og:title", content: "My skills — SkillSwap" },
      { property: "og:description", content: "Set what you teach and what you want to learn." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

function parseList(value: string) {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function Dashboard() {
  const { user } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [teaches, setTeaches] = useState("");
  const [wants, setWants] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const profileQuery = useQuery({
    queryKey: ["profile", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, teaches, wants")
        .eq("id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const membersQuery = useQuery({
    queryKey: ["members"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, teaches, wants")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  useEffect(() => {
    const p = profileQuery.data;
    if (!p) return;
    setName(p.display_name ?? "");
    setTeaches((p.teaches ?? []).join(", "));
    setWants((p.wants ?? []).join(", "));
  }, [profileQuery.data]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      display_name: name || (user.email ?? "").split("@")[0] || "Member",
      teaches: parseList(teaches),
      wants: parseList(wants),
    });
    if (error) setError(error.message);
    else {
      setSaved(true);
      await queryClient.invalidateQueries();
    }
    setSaving(false);
  }

  const others = (membersQuery.data ?? []).filter((m) => m.id !== user.id);

  return (
    <AppShell email={user.email ?? ""}>
      <section>
        <span className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
          Your profile
        </span>
        <h1 className="mt-3 text-3xl font-bold">My skills</h1>
        <p className="mt-2 max-w-xl text-muted-foreground">
          Everyone who signs in — on any computer — joins the same community. Fill this in and
          SkillSwap can link you into a swap chain.
        </p>

        <div className="mt-8 grid gap-6 md:grid-cols-[1.2fr_1fr]">
          <form onSubmit={save} className="surface space-y-5 p-6">
            <div>
              <label htmlFor="name" className="text-sm font-medium">
                Display name
              </label>
              <input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/25"
              />
            </div>
            <div>
              <label htmlFor="teaches" className="text-sm font-medium">
                I can teach
              </label>
              <input
                id="teaches"
                value={teaches}
                onChange={(e) => setTeaches(e.target.value)}
                placeholder="Guitar, Python, Spanish"
                className="mt-1.5 w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/25"
              />
              <p className="mt-1 text-xs text-muted-foreground">Separate each skill with a comma.</p>
            </div>
            <div>
              <label htmlFor="wants" className="text-sm font-medium">
                I want to learn
              </label>
              <input
                id="wants"
                value={wants}
                onChange={(e) => setWants(e.target.value)}
                placeholder="Photography, Cooking"
                className="mt-1.5 w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/25"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Use the same wording others would use — matching is by skill name.
              </p>
            </div>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            {saved ? <p className="text-sm text-primary">Saved.</p> : null}

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={saving}
                className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save my skills"}
              </button>
              <Link
                to="/chains"
                className="rounded-full border border-border px-5 py-2.5 text-sm font-semibold transition-colors hover:bg-secondary"
              >
                Find skill chains
              </Link>
            </div>
          </form>

          <section className="surface p-6">
            <h2 className="text-lg font-semibold">Community</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {membersQuery.isLoading
                ? "Loading members…"
                : `${others.length + 1} ${others.length === 0 ? "person" : "people"} signed up so far.`}
            </p>
            <ul className="mt-4 space-y-3">
              {others.map((m) => (
                <li key={m.id} className="rounded-xl border border-border p-3">
                  <div className="font-medium">{m.display_name || "Unnamed member"}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Teaches: {(m.teaches ?? []).join(", ") || "—"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Wants: {(m.wants ?? []).join(", ") || "—"}
                  </div>
                </li>
              ))}
              {!membersQuery.isLoading && others.length === 0 ? (
                <li className="text-sm text-muted-foreground">
                  No one else yet. Sign up on another computer to see them appear here.
                </li>
              ) : null}
            </ul>
          </section>
        </div>
      </section>
    </AppShell>
  );
}
