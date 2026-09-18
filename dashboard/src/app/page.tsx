"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  ArrowUpRight,
  Bell,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleDot,
  Clock3,
  Command,
  GitBranch,
  LayoutDashboard,
  Pause,
  Play,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  TerminalSquare,
  Zap,
} from "lucide-react";

const SERVER_URL = "http://localhost:8000";

type TraceEvent = {
  trace_id: string;
  parent_span_id: string | null;
  span_id: string;
  agent_id: string;
  event_type: string;
  name: string;
  input_data: string | null;
  output_data: string | null;
  confidence: number;
  status: string;
  metadata: any;
  timestamp: number;
};

type TreeNode = TraceEvent & { children: TreeNode[] };

const navItems = [
  { label: "Overview", icon: LayoutDashboard, active: true },
  { label: "Live traces", icon: Activity },
  { label: "Interventions", icon: ShieldCheck },
  { label: "Agents", icon: Sparkles },
];

export default function SentinelDashboard() {
  const [traces, setTraces] = useState<TraceEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchTraces = async () => {
    try {
      const res = await fetch(`${SERVER_URL}/api/traces`);
      if (res.ok) setTraces((await res.json()).traces);
    } catch (error) {
      console.error("Error fetching traces:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTraces(); }, []);
  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(fetchTraces, 2000);
    return () => clearInterval(interval);
  }, [isPaused]);

  const filteredTraces = useMemo(() => {
    const query = searchQuery.toLowerCase();
    if (!query) return traces;
    return traces.filter((trace) =>
      [trace.name, trace.status, trace.event_type, trace.agent_id].some((value) => value?.toLowerCase().includes(query)),
    );
  }, [traces, searchQuery]);

  const tree = useMemo(() => buildTree(filteredTraces), [filteredTraces]);
  const successEvents = traces.filter((trace) => trace.status === "success").length;
  const errorEvents = traces.filter((trace) => trace.status === "error").length;
  const pausedActions = traces.filter((trace) => trace.status === "paused");
  const successRate = traces.length ? ((successEvents / traces.length) * 100).toFixed(1) : "0.0";

  return (
    <div className="min-h-screen bg-[#0a0912] text-[#f3efff] selection:bg-violet-500/30">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-48 -top-44 size-[620px] rounded-full bg-violet-700/15 blur-[140px]" />
        <div className="absolute right-[-14%] top-[38%] size-[520px] rounded-full bg-fuchsia-700/10 blur-[160px]" />
        <div className="dashboard-grid absolute inset-0 opacity-40" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-[1600px]">
        <aside className="hidden w-[248px] shrink-0 flex-col border-r border-white/[0.07] px-5 py-7 lg:flex">
          <div className="flex items-center gap-3 px-3">
            <div className="brand-mark"><span /></div>
            <div><p className="text-[15px] font-semibold tracking-tight">Sentinel<span className="text-violet-300">AI</span></p><p className="mt-0.5 text-[10px] uppercase tracking-[0.2em] text-white/35">Control room</p></div>
          </div>
          <button className="mt-10 flex items-center gap-3 rounded-xl border border-violet-400/20 bg-violet-500/10 px-3.5 py-3 text-left text-sm text-violet-100 transition hover:bg-violet-500/15"><Plus data-icon="inline-start" className="size-4" />New monitor</button>
          <p className="mb-3 mt-9 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/30">Workspace</p>
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => <button key={item.label} className={`sidebar-link ${item.active ? "sidebar-link-active" : ""}`}><item.icon className="size-[17px]" />{item.label}{item.label === "Interventions" && pausedActions.length > 0 ? <span className="ml-auto rounded-full bg-violet-400 px-1.5 py-0.5 text-[10px] font-bold text-[#171021]">{pausedActions.length}</span> : null}</button>)}
          </nav>
          <p className="mb-3 mt-9 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/30">System</p>
          <nav className="flex flex-col gap-1"><button className="sidebar-link"><GitBranch className="size-[17px]" />Activity log</button><button className="sidebar-link"><Settings2 className="size-[17px]" />Settings</button></nav>
          <div className="mt-auto rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4"><div className="mb-3 flex items-center justify-between"><span className="text-xs font-medium text-white/70">API health</span><span className="flex items-center gap-1.5 text-[10px] text-emerald-300"><span className="size-1.5 rounded-full bg-emerald-300" />Operational</span></div><div className="h-1 rounded-full bg-white/10"><div className="h-full w-[94%] rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-400" /></div><p className="mt-2 text-[10px] text-white/35">99.98% uptime this month</p></div>
        </aside>

        <main className="min-w-0 flex-1 px-5 py-6 sm:px-8 lg:px-10 lg:py-8">
          <header className="flex items-center justify-between gap-4"><div className="flex items-center gap-3 lg:hidden"><div className="brand-mark"><span /></div><span className="font-semibold">Sentinel<span className="text-violet-300">AI</span></span></div><div className="hidden items-center gap-2 text-xs text-white/35 sm:flex"><span>Workspace</span><ChevronRight className="size-3" /><span className="text-white/65">Overview</span></div><div className="ml-auto flex items-center gap-3"><button className="icon-button"><Bell className="size-4" /></button><div className="hidden h-5 w-px bg-white/10 sm:block" /><div className="flex items-center gap-2"><div className="avatar">JD</div><span className="hidden text-sm text-white/70 sm:block">Jordan Davis</span><ChevronDown className="hidden size-3.5 text-white/35 sm:block" /></div></div></header>

          <section className="mt-12 flex flex-col justify-between gap-6 md:flex-row md:items-end"><div><div className="mb-4 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-200"><CircleDot className="size-3 animate-pulse" />Live monitoring</div><h1 className="max-w-2xl text-4xl font-light tracking-[-0.05em] text-white sm:text-5xl">Good evening, Jordan<span className="text-violet-300">.</span><br /><span className="text-white/45">Your agents are in motion.</span></h1><p className="mt-5 max-w-xl text-sm leading-6 text-white/45">A clear view into every decision, tool call, and intervention across your agent workspace.</p></div><div className="flex items-center gap-3"><div className="search-field"><Search className="size-4 text-white/30" /><input aria-label="Search traces" placeholder="Search traces" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} /><kbd><Command className="size-3" />K</kbd></div><button aria-label="Toggle live updates" onClick={() => setIsPaused(!isPaused)} className={`live-toggle ${isPaused ? "paused" : ""}`}>{isPaused ? <Play className="size-3.5" /> : <Pause className="size-3.5" />}{isPaused ? "Paused" : "Live"}</button></div></section>

          <section className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Total executions" value={traces.length.toLocaleString()} change="+12.8%" icon={Zap} tone="violet" />
            <MetricCard label="Success rate" value={`${successRate}%`} change="+2.4%" icon={CheckCircle2} tone="emerald" />
            <MetricCard label="Active agents" value={tree.length.toString()} change="3 running now" icon={Activity} tone="blue" />
            <MetricCard label="Needs attention" value={pausedActions.length.toString().padStart(2, "0")} change={`${errorEvents} errors today`} icon={AlertCircle} tone="amber" />
          </section>

          <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            <section className="panel min-h-[580px] overflow-hidden"><div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/[0.07] px-6 py-5"><div><div className="flex items-center gap-2.5"><div className="section-icon"><TerminalSquare className="size-4" /></div><div><h2 className="text-base font-medium text-white/90">Execution traces</h2><p className="mt-1 text-xs text-white/35">Real-time agent activity and decision paths</p></div></div></div><button className="subtle-button">View all <ArrowUpRight className="size-3.5" /></button></div><div className="px-3 py-3 sm:px-5">{loading ? <div className="flex min-h-[440px] items-center justify-center"><div className="loader" /></div> : tree.length === 0 ? <EmptyState /> : tree.map((node) => <TraceNode key={node.span_id} node={node} />)}</div></section>

            <aside className="flex flex-col gap-6"><section className="panel p-5"><div className="mb-5 flex items-center justify-between"><div><h2 className="text-base font-medium text-white/90">Interventions</h2><p className="mt-1 text-xs text-white/35">Review flagged actions</p></div><ShieldCheck className="size-5 text-violet-300" /></div>{pausedActions.length === 0 ? <div className="flex flex-col items-center rounded-xl border border-dashed border-white/10 px-4 py-10 text-center"><CheckCircle2 className="mb-3 size-7 text-emerald-300/70" /><p className="text-sm text-white/65">All clear for now</p><p className="mt-1 text-xs text-white/30">No actions need your attention.</p></div> : <div className="flex flex-col gap-3">{pausedActions.slice(0, 3).map((action) => <InterventionCard key={action.span_id} action={action} onActionTaken={fetchTraces} />)}</div>}</section><section className="panel p-5"><div className="mb-5 flex items-center justify-between"><div><h2 className="text-base font-medium text-white/90">Activity pulse</h2><p className="mt-1 text-xs text-white/35">Executions over the last 24h</p></div><Clock3 className="size-4 text-white/35" /></div><div className="flex h-28 items-end gap-1.5">{[38,52,45,63,57,76,61,84,70,91,68,77,96,73,88,64,79,58,72,46,62,51,67,43].map((height, index) => <div key={index} className="pulse-bar" style={{ height: `${height}%`, opacity: index > 19 ? 1 : 0.55 }} />)}</div><div className="mt-3 flex justify-between text-[10px] text-white/25"><span>12am</span><span>6am</span><span>12pm</span><span>Now</span></div></section></aside>
          </div>
        </main>
      </div>
    </div>
  );
}

function MetricCard({ label, value, change, icon: Icon, tone }: { label: string; value: string; change: string; icon: any; tone: string }) {
  return <div className="metric-card"><div className={`metric-icon ${tone}`}><Icon className="size-4" /></div><div className="mt-5 flex items-end justify-between gap-3"><div><p className="text-[11px] uppercase tracking-[0.16em] text-white/35">{label}</p><p className="mt-2 text-3xl font-light tracking-tight text-white">{value}</p></div><span className={`text-[10px] ${tone === "amber" ? "text-amber-200/70" : "text-emerald-300/70"}`}>{change}</span></div></div>;
}

function InterventionCard({ action, onActionTaken }: { action: TraceEvent; onActionTaken: () => void }) {
  const [busy, setBusy] = useState(false);
  const decide = async (decision: "approve" | "reject") => { setBusy(true); try { await fetch(`${SERVER_URL}/api/intervention/${action.span_id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: decision }) }); onActionTaken(); } finally { setBusy(false); } };
  const reason = action.metadata?.pause_reason || action.metadata?.reason || "High-risk action detected";
  return <div className="intervention-card"><div className="flex items-start justify-between gap-3"><div><p className="flex items-center gap-2 text-xs font-medium text-amber-200"><span className="size-1.5 animate-pulse rounded-full bg-amber-300" />Action paused</p><p className="mt-2 text-sm leading-5 text-white/65">{reason}</p></div><AlertCircle className="size-4 shrink-0 text-amber-300/70" /></div><div className="mt-4 rounded-lg border border-white/[0.07] bg-black/20 px-3 py-2.5"><p className="truncate font-mono text-[11px] text-white/55">{action.name}</p><p className="mt-1 text-[10px] text-white/30">Confidence <span className="text-violet-200">{(action.confidence * 100).toFixed(0)}%</span></p></div><div className="mt-3 grid grid-cols-2 gap-2"><button disabled={busy} onClick={() => decide("reject")} className="action-button">Dismiss</button><button disabled={busy} onClick={() => decide("approve")} className="action-button action-button-primary"><Check className="size-3" />Approve</button></div></div>;
}

function TraceNode({ node, depth = 0 }: { node: TreeNode; depth?: number }) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children.length > 0;
  return <div className={depth ? "trace-child" : ""}><div className="trace-row" onClick={() => hasChildren && setExpanded(!expanded)}><div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] text-white/35">{hasChildren ? (expanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />) : <CircleDot className="size-3" />}</div><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><span className="truncate text-sm font-medium text-white/80">{node.name}</span><span className="hidden rounded border border-white/[0.08] px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-white/30 sm:inline">{node.event_type}</span></div><p className="mt-1 truncate font-mono text-[10px] text-white/25">{node.agent_id || "sentinel-agent"} · {new Date(node.timestamp * 1000 || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p></div><StatusBadge status={node.status} /><ArrowUpRight className="hidden size-3.5 text-white/20 sm:block" /></div>{expanded && (node.input_data || node.output_data) && <div className="trace-details">{node.input_data && <div><span>Input</span><p>{node.input_data}</p></div>}{node.output_data && <div><span>Output</span><p className={node.status === "error" ? "text-red-300/80" : ""}>{node.output_data}</p></div>}</div>}{expanded && hasChildren && <div className="ml-4 border-l border-violet-300/10 pl-3">{node.children.map((child) => <TraceNode key={child.span_id} node={child} depth={depth + 1} />)}</div>}</div>;
}

function StatusBadge({ status }: { status: string }) { const styles: Record<string, string> = { success: "status-success", error: "status-error", paused: "status-paused", running: "status-running" }; return <span className={`status-badge ${styles[status] || ""}`}>{status === "running" && <span className="size-1.5 animate-pulse rounded-full bg-current" />}{status}</span>; }
function EmptyState() { return <div className="flex min-h-[440px] flex-col items-center justify-center text-center"><div className="mb-4 rounded-2xl border border-violet-300/10 bg-violet-400/[0.06] p-4"><TerminalSquare className="size-8 text-violet-200/50" /></div><p className="text-sm text-white/60">No telemetry found</p><p className="mt-2 max-w-xs text-xs leading-5 text-white/30">Initiate an agent task to see its execution path appear here.</p></div>; }
function buildTree(events: TraceEvent[]): TreeNode[] { const nodes = new Map<string, TreeNode>(); const roots: TreeNode[] = []; events.forEach((event) => nodes.set(event.span_id, { ...event, children: [] })); nodes.forEach((node) => { if (node.parent_span_id && nodes.has(node.parent_span_id)) nodes.get(node.parent_span_id)!.children.push(node); else roots.push(node); }); return roots; }
