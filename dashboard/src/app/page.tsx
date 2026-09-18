"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { 
  AlertCircle, 
  CheckCircle2, 
  ShieldAlert,
  ChevronRight,
  ChevronDown,
  Terminal,
  BrainCircuit,
  Pause,
  Play,
  Search,
  Activity,
  DollarSign,
  Gauge
} from "lucide-react";

const SERVER_URL = "http://localhost:8000";

// --- Types ---
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

type Stats = {
  budget: { spent: number; max: number };
  threat_level: number;
  logs: string[];
};

// --- Main Page ---
export default function SentinelDashboard() {
  const [traces, setTraces] = useState<TraceEvent[]>([]);
  const [stats, setStats] = useState<Stats>({ budget: { spent: 0, max: 1 }, threat_level: 0, logs: [] });
  const [loading, setLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchData = async () => {
    try {
      const [traceRes, statsRes] = await Promise.all([
        fetch(`${SERVER_URL}/api/traces`),
        fetch(`${SERVER_URL}/api/stats`)
      ]);
      
      if (traceRes.ok) {
        const data = await traceRes.json();
        setTraces(data.traces);
      }
      if (statsRes.ok) {
        setStats(await statsRes.json());
      }
    } catch (e) {
      console.error("Error fetching data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(fetchData, 1000);
    return () => clearInterval(interval);
  }, [isPaused]);

  // Build the DAG / Tree from flat trace list
  const buildTree = (events: TraceEvent[]): TreeNode[] => {
    const nodeMap = new Map<string, TreeNode>();
    const roots: TreeNode[] = [];

    events.forEach(ev => {
      nodeMap.set(ev.span_id, { ...ev, children: [] });
    });

    nodeMap.forEach(node => {
      if (node.parent_span_id && nodeMap.has(node.parent_span_id)) {
        nodeMap.get(node.parent_span_id)!.children.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  };

  const filteredTraces = useMemo(() => {
    if (!searchQuery) return traces;
    const query = searchQuery.toLowerCase();
    return traces.filter(t => 
      t.name.toLowerCase().includes(query) || 
      t.status.toLowerCase().includes(query) ||
      t.event_type.toLowerCase().includes(query)
    );
  }, [traces, searchQuery]);

  const tree = buildTree(filteredTraces);
  
  // Calculate metrics
  const totalEvents = traces.length;
  const successEvents = traces.filter(t => t.status === "success").length;
  const errorEvents = traces.filter(t => t.status === "error").length;
  const successRate = totalEvents > 0 ? ((successEvents / totalEvents) * 100).toFixed(1) : "0";
  
  const pausedActions = traces.filter(t => t.status === "paused");

  return (
    <div className="min-h-screen bg-black text-slate-200 font-sans p-6 selection:bg-orange-900/50 relative overflow-hidden text-base">
      
      {/* --- Global Threat Overlay --- */}
      {pausedActions.length > 0 && (
        <div className="fixed inset-0 pointer-events-none z-50 shadow-[inset_0_0_150px_rgba(239,68,68,0.2)] animate-pulse" />
      )}

      {/* --- Ambient Black Hole Glow Background --- */}
      <div className="fixed top-[0%] left-[-10%] w-[120%] h-[120%] pointer-events-none overflow-hidden z-0 flex items-center justify-center">
        {/* Accretion disk core glow */}
        <div className="absolute w-[900px] h-[300px] bg-orange-600/30 rounded-[100%] blur-[100px] transform -rotate-12 animate-pulse" />
        <div className="absolute w-[1000px] h-[250px] bg-amber-500/10 rounded-[100%] blur-[60px] transform -rotate-12 animate-pulse" style={{ animationDuration: '3s' }} />
        <div className="absolute w-[1200px] h-[500px] border-[3px] border-orange-500/20 rounded-[100%] blur-[12px] transform -rotate-12 shadow-[0_0_150px_rgba(249,115,22,0.2)]" />
        {/* Deep space jets */}
        <div className="absolute w-[100px] h-[1000px] bg-orange-400/5 blur-[80px] transform rotate-12" />
        {/* The Black Hole (Event Horizon) */}
        <div className="absolute w-[450px] h-[450px] bg-black rounded-full shadow-[inset_0_0_100px_rgba(0,0,0,1),_0_0_80px_rgba(251,146,60,0.5)] transform -translate-y-8" />
      </div>

      <div className="relative z-10 mx-auto flex flex-col min-h-[90vh]">
        {/* Header */}
        <header className="flex items-center justify-between py-6 mb-4 border-b border-white/5">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-light tracking-tighter text-white">
              Sentinel<span className="font-bold text-orange-400">AI</span>
            </h1>
          </div>
          <div className="flex gap-6 items-center">
             <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500" />
                <input 
                  type="text" 
                  placeholder="Search traces..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-full pl-10 pr-4 py-1.5 text-sm focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 text-white placeholder-slate-500 transition-all w-64"
                />
             </div>
             
             <button 
               onClick={async () => {
                 try {
                   await fetch(`${SERVER_URL}/api/demo`, { method: "POST" });
                 } catch (e) {
                   console.error("Failed to start demo:", e);
                 }
               }}
               className="bg-orange-500 hover:bg-orange-400 text-black px-4 py-1.5 rounded-full text-sm font-bold shadow-[0_0_15px_rgba(249,115,22,0.4)] hover:shadow-[0_0_25px_rgba(249,115,22,0.6)] transition-all flex items-center gap-2"
             >
               <Play className="w-4 h-4 fill-current" />
               Run Demo
             </button>

             <button 
               onClick={() => setIsPaused(!isPaused)}
               className={`flex items-center gap-2 px-4 py-1.5 rounded-full border text-sm transition-all ${isPaused ? 'bg-orange-500/10 border-orange-500/30 text-orange-400' : 'bg-white/5 border-white/10 hover:bg-white/10 text-slate-300'}`}
             >
               {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
               {isPaused ? "Live Paused" : "Live Active"}
             </button>
          </div>
        </header>

        {/* 3-Column Layout */}
        <main className="grid grid-cols-1 xl:grid-cols-12 gap-6 flex-1 h-[calc(100vh-120px)]">
          
          {/* COLUMN 1: Threats & Status (Left) */}
          <div className="xl:col-span-3 flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar">
            
            {/* Interventions */}
            <section className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden group transition-all hover:border-orange-500/30 shrink-0">
              <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-orange-500/0 via-orange-500 to-orange-500/0 opacity-50" />
              
              <h2 className="text-lg font-light mb-4 flex items-center gap-3 text-white">
                <ShieldAlert className="w-4 h-4 text-orange-500" />
                Interventions
                {pausedActions.length > 0 && (
                  <span className="ml-auto bg-orange-500 text-black text-xs px-2 py-0.5 rounded-full font-bold">
                    {pausedActions.length} Action{pausedActions.length > 1 ? 's' : ''}
                  </span>
                )}
              </h2>

              {pausedActions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 text-slate-500">
                  <CheckCircle2 className="w-8 h-8 mb-2 opacity-20" />
                  <p className="text-xs tracking-wide">All systems nominal.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pausedActions.map(action => (
                    <InterventionCard key={action.span_id} action={action} onActionTaken={fetchData} />
                  ))}
                </div>
              )}
            </section>

            {/* Threat Level Gauge */}
            <section className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl shrink-0">
               <h2 className="text-lg font-light mb-4 flex items-center gap-3 text-white">
                <Gauge className="w-4 h-4 text-red-500" />
                Threat Level
              </h2>
              <div className="flex flex-col items-center justify-center relative py-4">
                 <ThreatGauge value={stats.threat_level} />
                 <div className="mt-4 text-center">
                   <p className={`text-2xl font-light ${stats.threat_level > 50 ? 'text-red-400' : 'text-emerald-400'}`}>
                     {stats.threat_level.toFixed(0)}%
                   </p>
                   <p className="text-[10px] uppercase tracking-widest text-slate-500 mt-1">Current Risk Score</p>
                 </div>
              </div>
            </section>

            {/* Agent Budget */}
            <section className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl shrink-0">
               <h2 className="text-lg font-light mb-4 flex items-center gap-3 text-white">
                <DollarSign className="w-4 h-4 text-emerald-500" />
                Agent Budget
              </h2>
              <div>
                 <div className="flex justify-between items-end mb-2">
                   <span className="text-2xl font-light text-white">${stats.budget.spent.toFixed(2)}</span>
                   <span className="text-xs text-slate-500 uppercase tracking-widest">/ ${stats.budget.max.toFixed(2)} Limit</span>
                 </div>
                 {/* Progress Bar */}
                 <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${stats.budget.spent >= stats.budget.max ? 'bg-red-500' : 'bg-emerald-500'}`}
                      style={{ width: `${Math.min(100, (stats.budget.spent / stats.budget.max) * 100)}%` }}
                    />
                 </div>
                 {stats.budget.spent >= stats.budget.max && (
                    <p className="text-xs text-red-400 mt-3 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> Budget Exceeded. Agent paused.
                    </p>
                 )}
              </div>
            </section>
            
          </div>

          {/* COLUMN 2: Trace DAG View (Center - Wider) */}
          <div className="xl:col-span-6 flex flex-col h-full overflow-hidden">
            <section className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col h-full">
              <div className="flex justify-between items-end mb-6 border-b border-white/10 pb-4 shrink-0">
                 <h2 className="text-xl font-light flex items-center gap-3 text-white">
                   <BrainCircuit className="w-5 h-5 text-orange-400" />
                   Execution Trace
                   {traces.some(t => t.status === "running") && (
                     <div className="ml-4 flex items-center gap-2 bg-amber-500/10 text-amber-400 border border-amber-500/30 px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                       <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>
                       <span className="absolute w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                       Agent Thinking
                     </div>
                   )}
                 </h2>
              </div>
              
              {loading ? (
                <div className="flex-1 flex justify-center items-center">
                  <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : tree.length === 0 ? (
                 <div className="flex-1 flex flex-col items-center justify-center text-slate-600">
                   <BrainCircuit className="w-10 h-10 mb-3 opacity-20" />
                   <p className="text-sm">No telemetry found.</p>
                 </div>
              ) : (
                <div className="space-y-4 overflow-y-auto flex-1 pr-2 custom-scrollbar">
                  {tree.map(node => (
                    <TraceNode key={node.span_id} node={node} />
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* COLUMN 3: Live Terminal & Stats (Right) */}
          <div className="xl:col-span-3 flex flex-col gap-6 h-full overflow-hidden">
            
            {/* Live Firewall Terminal */}
            <section className="bg-black/80 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col flex-1 min-h-[300px]">
               <h2 className="text-lg font-light mb-4 flex items-center gap-3 text-white shrink-0">
                <Terminal className="w-4 h-4 text-emerald-500" />
                Live Firewall Log
              </h2>
              <div className="flex-1 bg-black rounded-xl border border-white/10 p-4 font-mono text-[10px] sm:text-xs overflow-y-auto custom-scrollbar relative">
                <TerminalLogs logs={stats.logs} />
              </div>
            </section>

            {/* Quick Stats */}
            <section className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl shrink-0">
               <h2 className="text-lg font-light mb-4 flex items-center gap-3 text-white">
                <Activity className="w-4 h-4 text-amber-500" />
                Telemetry Stats
              </h2>
              <div className="grid grid-cols-2 gap-3">
                 <div className="bg-white/5 p-3 rounded-2xl border border-white/5">
                    <p className="text-[10px] text-slate-500 mb-1 tracking-wider uppercase">Active Traces</p>
                    <p className="text-2xl font-light text-white">{tree.length}</p>
                 </div>
                 <div className="bg-white/5 p-3 rounded-2xl border border-white/5">
                    <p className="text-[10px] text-slate-500 mb-1 tracking-wider uppercase">Success Rate</p>
                    <p className="text-2xl font-light text-emerald-400">{successRate}%</p>
                 </div>
                 <div className="bg-white/5 p-3 rounded-2xl border border-white/5">
                    <p className="text-[10px] text-slate-500 mb-1 tracking-wider uppercase">Error Count</p>
                    <p className="text-2xl font-light text-red-400">{errorEvents}</p>
                 </div>
                 <div className="bg-white/5 p-3 rounded-2xl border border-white/5">
                    <p className="text-[10px] text-slate-500 mb-1 tracking-wider uppercase">Total Events</p>
                    <p className="text-2xl font-light text-white">{traces.length}</p>
                 </div>
              </div>
            </section>

          </div>

        </main>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.02);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  );
}

// --- Components ---

function TerminalLogs({ logs }: { logs: string[] }) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="text-emerald-500/80 space-y-1.5">
      {logs.length === 0 ? (
        <span className="text-slate-600">Waiting for agent activity...</span>
      ) : (
        logs.map((log, i) => {
          let colorClass = "text-emerald-500/80";
          if (log.includes("❌")) colorClass = "text-red-400";
          if (log.includes("✅") || log.includes("🟢")) colorClass = "text-emerald-400";
          if (log.includes("Intercepted")) colorClass = "text-orange-400";

          return (
            <div key={i} className={colorClass}>
              <span className="opacity-50 mr-2">{'>'}</span>{log}
            </div>
          );
        })
      )}
      <div ref={bottomRef} />
    </div>
  );
}

function ThreatGauge({ value }: { value: number }) {
  const normalized = Math.min(100, Math.max(0, value));
  const strokeDasharray = 251.2; // 2 * pi * r (r=40)
  const strokeDashoffset = strokeDasharray - (strokeDasharray * normalized) / 100;

  let color = "#10b981"; // Emerald
  if (normalized > 30) color = "#f59e0b"; // Amber
  if (normalized > 70) color = "#ef4444"; // Red

  return (
    <div className="relative w-32 h-32 transform -rotate-90">
      <svg className="w-full h-full" viewBox="0 0 100 100">
        <circle 
          className="text-white/10 stroke-current" 
          strokeWidth="8" 
          cx="50" cy="50" r="40" 
          fill="transparent" 
        />
        <circle 
          className="stroke-current transition-all duration-1000 ease-out" 
          strokeWidth="8" 
          strokeLinecap="round" 
          cx="50" cy="50" r="40" 
          fill="transparent" 
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          style={{ color }}
        />
      </svg>
    </div>
  );
}

function InterventionCard({ action, onActionTaken }: { action: TraceEvent, onActionTaken: () => void }) {
  const [loading, setLoading] = useState(false);

  const handleDecision = async (decision: "approve" | "reject") => {
    setLoading(true);
    try {
      await fetch(`${SERVER_URL}/api/intervention/${action.span_id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: decision })
      });
      onActionTaken();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const reason = action.metadata?.pause_reason || action.metadata?.reason || "High Risk Action";

  return (
    <div className="bg-red-950/30 border border-red-500/50 rounded-2xl p-4 shadow-[0_0_40px_rgba(239,68,68,0.15)] relative overflow-hidden group hover:border-red-500/80 transition-colors animate-[pulse_2s_ease-in-out_infinite]">
      <div className="absolute -right-4 -top-4 p-4 opacity-[0.05] group-hover:opacity-15 transition-opacity">
        <ShieldAlert className="w-24 h-24 text-red-500" />
      </div>
      
      <div className="relative z-10">
        <div className="mb-3">
          <h3 className="text-red-400 font-medium text-sm flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
            <span className="absolute w-1.5 h-1.5 rounded-full bg-red-500 ml-0.5"></span>
            <span className="ml-1 tracking-widest uppercase">Blocked</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">{reason}</p>
        </div>
        
        <div className="mb-4 bg-black/50 p-3 rounded-xl border border-white/5 font-mono text-[10px] overflow-hidden">
          <p className="text-slate-400 mb-1">Target <span className="text-white ml-2">{action.name}</span></p>
          <p className="text-slate-400">Confidence <span className="text-orange-400 ml-2">{(action.confidence * 100).toFixed(0)}%</span></p>
        </div>

        <div className="flex gap-2">
          <button 
            onClick={() => handleDecision("reject")}
            disabled={loading}
            className="flex-1 bg-white/5 hover:bg-white/10 text-white border border-white/10 py-2 rounded-xl text-xs font-medium transition-all"
          >
            Reject
          </button>
          <button 
            onClick={() => handleDecision("approve")}
            disabled={loading}
            className="flex-1 bg-orange-500 hover:bg-orange-400 text-black shadow-[0_0_15px_rgba(249,115,22,0.4)] py-2 rounded-xl text-xs font-bold transition-all"
          >
            Approve
          </button>
        </div>
      </div>
    </div>
  );
}

function TraceNode({ node, depth = 0 }: { node: TreeNode, depth?: number }) {
  const [expanded, setExpanded] = useState(true);
  
  const hasChildren = node.children.length > 0;
  
  const statusColors: Record<string, string> = {
    success: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
    error: "text-red-400 bg-red-400/10 border-red-400/20",
    paused: "text-orange-400 bg-orange-400/10 border-orange-400/20 shadow-[0_0_10px_rgba(249,115,22,0.2)]",
    running: "text-amber-400 bg-amber-400/10 border-amber-400/20"
  };

  const statusColor = statusColors[node.status] || "text-slate-400 bg-white/5 border-white/10";

  return (
    <div className="relative" style={{ marginLeft: depth > 0 ? "1rem" : "0" }}>
      {/* Tree connecting lines */}
      {depth > 0 && (
        <div className="absolute -left-4 top-5 w-4 h-[1px] bg-white/10" />
      )}
      {depth > 0 && (
        <div className="absolute -left-4 -top-5 bottom-auto h-10 w-[1px] bg-white/10" />
      )}

      <div className="mb-3 bg-black/40 border border-white/5 rounded-2xl overflow-hidden transition-all hover:border-white/20 hover:bg-black/60 group">
        <div 
          className={`flex items-center gap-3 p-3 cursor-pointer select-none`}
          onClick={() => hasChildren && setExpanded(!expanded)}
        >
          {/* Collapse icon */}
          <div className="w-4 flex justify-center text-slate-500 group-hover:text-white transition-colors">
            {hasChildren ? (
              expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />
            ) : (
              <div className="w-1 h-1 rounded-full bg-slate-700" />
            )}
          </div>
          
          <div className="flex-1 min-w-0 flex items-center gap-3">
             <span className="font-medium text-sm text-slate-200 truncate">{node.name}</span>
             <span className="text-[9px] tracking-widest uppercase text-slate-500 border border-white/10 px-1.5 py-0.5 rounded-sm">{node.event_type}</span>
          </div>

          <div className={`px-2 py-1 rounded-full border text-[9px] font-medium flex items-center gap-1.5 tracking-wide ${statusColor}`}>
             {node.status === "running" && (
                <div className="relative flex items-center justify-center mr-0.5">
                  <span className="absolute w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>
                  <span className="relative w-1 h-1 rounded-full bg-amber-400"></span>
                </div>
             )}
             {node.status === "paused" && <AlertCircle className="w-2.5 h-2.5" />}
             {node.status}
          </div>
        </div>

        {/* Node Details (Input/Output) */}
        {expanded && (
          <div className="px-4 pb-4 pt-1 border-t border-white/5 font-mono text-[10px] space-y-3">
             {node.input_data && (
                <div>
                   <span className="text-slate-500 mb-1.5 block uppercase tracking-wider text-[9px]">Input</span>
                   <div className="bg-white/5 p-2.5 rounded-xl border border-white/5 text-slate-300 overflow-x-auto whitespace-pre-wrap">
                     {node.input_data}
                   </div>
                </div>
             )}
             
             {node.status === 'paused' && (node.metadata?.pause_reason || node.metadata?.reason) && (
                <div>
                   <span className="text-orange-500 mb-1.5 block uppercase tracking-wider text-[9px] font-bold">Intervention Reason</span>
                   <div className="bg-orange-500/10 p-2.5 rounded-xl border border-orange-500/30 text-orange-400 font-bold overflow-x-auto whitespace-pre-wrap">
                     {node.metadata?.pause_reason || node.metadata?.reason}
                   </div>
                </div>
             )}

             {node.status === 'error' && (node.metadata?.error || node.output_data) && (
                <div>
                   <span className="text-red-500 mb-1.5 block uppercase tracking-wider text-[9px] font-bold">Error Details</span>
                   <div className="bg-red-500/10 p-2.5 rounded-xl border border-red-500/30 text-red-400 font-bold overflow-x-auto whitespace-pre-wrap">
                     {node.metadata?.error || node.output_data}
                   </div>
                </div>
             )}

             {node.output_data && node.status !== 'error' && (
                <div>
                   <span className="text-slate-500 mb-1.5 block uppercase tracking-wider text-[9px]">Output</span>
                   <div className="bg-white/5 p-2.5 rounded-xl border border-white/5 text-slate-300 overflow-x-auto whitespace-pre-wrap">
                     {node.output_data}
                   </div>
                </div>
             )}
          </div>
        )}
      </div>

      {/* Children */}
      {expanded && hasChildren && (
        <div className="relative mt-2">
           <div className="absolute left-1 top-0 bottom-6 w-[1px] bg-white/10" />
           {node.children.map(child => (
             <TraceNode key={child.span_id} node={child} depth={depth + 1} />
           ))}
        </div>
      )}
    </div>
  );
}
