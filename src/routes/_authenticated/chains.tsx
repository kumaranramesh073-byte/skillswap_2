import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { findChains, type Chain, type Member } from "@/lib/chains";

export const Route = createFileRoute("/_authenticated/chains")({
  head: () => ({
    meta: [
      { title: "Skill chains — SkillSwap" },
      {
        name: "description",
        content:
          "SkillSwap checks every signed-up member and shows the swap chains where everyone teaches the next person what they want to learn.",
      },
      { property: "og:title", content: "Skill chains — SkillSwap" },
      {
        property: "og:description",
        content: "See the swap loops formed by everyone in your community.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Chains,
});

function ChainDiagram({ chain }: { chain: Chain }) {
  const n = chain.members.length;
  const size = 340;
  const r = 118;
  const c = size / 2;
  const pos = chain.members.map((_, i) => {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    return { x: c + r * Math.cos(a), y: c + r * Math.sin(a) };
  });

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="mx-auto w-full max-w-sm">
      <defs>
        <marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
          <path d="M0,0 L7,3 L0,6 z" fill="currentColor" className="text-primary" />
        </marker>
      </defs>
      {pos.map((p, i) => {
        const q = pos[(i + 1) % n]!;
        const dx = q.x - p.x;
        const dy = q.y - p.y;
        const len = Math.hypot(dx, dy) || 1;
        const pad = 34;
        return (
          <line
            key={i}
            x1={p.x + (dx / len) * pad}
            y1={p.y + (dy / len) * pad}
            x2={q.x - (dx / len) * pad}
            y2={q.y - (dy / len) * pad}
            stroke="currentColor"
            className="text-primary/50"
            strokeWidth="1.5"
            markerEnd="url(#arrow)"
          />
        );
      })}
      {pos.map((p, i) => (
        <g key={chain.members[i]!.id}>
          <circle cx={p.x} cy={p.y} r="30" className="fill-accent stroke-primary/40" strokeWidth="1.5" />
          <text
            x={p.x}
            y={p.y + 4}
            textAnchor="middle"
            className="fill-accent-foreground text-[10px] font-semibold"
          >
            {(chain.members[i]!.display_name || "?").slice(0, 9)}
          </text>
        </g>
      ))}
    </svg>
  );
}

function Chains() {
  const { user } = Route.useRouteContext();

  const membersQuery = useQuery({
    queryKey: ["members"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, teaches, wants")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Member[];
    },
  });

  const members = membersQuery.data ?? [];
  const chains = findChains(members);
  const mine = chains.filter((ch) => ch.members.some((m) => m.id === user.id));
  const others = chains.filter((ch) => !ch.members.some((m) => m.id === user.id));

  return (
    <AppShell email={user.email ?? ""}>
      <section>
        <span className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
          Community loops
        </span>
        <h1 className="mt-3 text-3xl font-bold">Skill chains</h1>
        <p className="mt-2 max-w-xl text-muted-foreground">
          SkillSwap checks every member of the community and looks for loops where each person
          teaches the next one exactly what they asked to learn.
        </p>
        <button
          onClick={() => membersQuery.refetch()}
          className="mt-5 rounded-full border border-border px-5 py-2.5 text-sm font-semibold transition-colors hover:bg-secondary"
        >
          {membersQuery.isFetching ? "Checking…" : "Check again"}
        </button>

        {membersQuery.isLoading ? (
          <p className="mt-10 text-muted-foreground">Looking through the community…</p>
        ) : chains.length === 0 ? (
          <div className="surface mt-8 p-10 text-center">
            <h2 className="text-xl font-semibold">No chain yet</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              A chain needs at least two people whose skills link back around. Make sure your own
              skills are filled in, and invite more people to sign in from their computers.
            </p>
            <Link
              to="/dashboard"
              className="mt-6 inline-block rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              Update my skills
            </Link>
          </div>
        ) : (
          <div className="mt-8 space-y-8">
            <ChainList title="Chains that include you" chains={mine} highlightId={user.id} />
            <ChainList title="Other chains in the community" chains={others} highlightId={user.id} />
          </div>
        )}
      </section>
    </AppShell>
  );
}

function ChainList({
  title,
  chains,
  highlightId,
}: {
  title: string;
  chains: Chain[];
  highlightId: string;
}) {
  if (chains.length === 0) return null;
  return (
    <section>
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-4 grid gap-6 lg:grid-cols-2">
        {chains.map((chain) => (
          <article key={chain.key} className="surface p-6">
            <span className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
              {chain.members.length}-person chain found
            </span>
            <h3 className="mt-3 text-lg font-bold">
              {chain.members.map((m) => m.display_name || "Unnamed").join(" → ")} →{" "}
              {chain.members[0]!.display_name || "Unnamed"}
            </h3>
            <ChainDiagram chain={chain} />
            <ul className="mt-4 space-y-2 text-sm">
              {chain.links.map((link, i) => (
                <li
                  key={i}
                  className={
                    link.from.id === highlightId || link.to.id === highlightId
                      ? "font-medium"
                      : "text-muted-foreground"
                  }
                >
                  {link.from.display_name || "Unnamed"} teaches{" "}
                  <span className="text-primary">{link.skill}</span> to{" "}
                  {link.to.display_name || "Unnamed"}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
