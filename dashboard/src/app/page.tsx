"use client";

import { useEffect, useState, useMemo } from "react";
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
  Activity
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

// --- Main Page ---
export default function SentinelDashboard() {
  const [traces, setTraces] = useState<TraceEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchTraces = async () => {
    try {
      const res = await fetch(`${SERVER_URL}/api/traces`);
      if (res.ok) {
        const data = await res.json();
        setTraces(data.traces);
      }
    } catch (e) {
      console.error("Error fetching traces:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTraces();
  }, []);

  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(fetchTraces, 2000);
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
    <div className="min-h-screen bg-black text-slate-200 font-sans p-6 selection:bg-orange-900/50 relative overflow-hidden">
      
      {/* --- Ambient Black Hole Glow Background --- */}
      <div className="fixed top-[0%] left-[-10%] w-[120%] h-[120%] pointer-events-none overflow-hidden z-0 flex items-center justify-center">
        {/* Accretion disk core glow */}
        <div className="absolute w-[900px] h-[300px] bg-orange-600/20 rounded-[100%] blur-[120px] transform -rotate-12" />
        <div className="absolute w-[700px] h-[150px] bg-amber-400/10 rounded-[100%] blur-[80px] transform -rotate-12" />
        <div className="absolute w-[1200px] h-[500px] border-[2px] border-orange-500/10 rounded-[100%] blur-[8px] transform -rotate-12 shadow-[0_0_120px_rgba(249,115,22,0.1)]" />
        {/* The Black Hole (Event Horizon) */}
        <div className="absolute w-[450px] h-[450px] bg-black rounded-full shadow-[inset_0_0_80px_rgba(0,0,0,1),_0_0_60px_rgba(251,146,60,0.3)] transform -translate-y-8" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto flex flex-col min-h-[90vh]">
        {/* Header */}
        <header className="flex items-center justify-between py-8 mb-4 border-b border-white/5">
          <div className="flex items-center gap-4">
            <h1 className="text-4xl font-light tracking-tighter text-white">
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
                  className="bg-white/5 border border-white/10 rounded-full pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 text-white placeholder-slate-500 transition-all w-64"
                />
             </div>
             
             <button 
               onClick={() => setIsPaused(!isPaused)}
               className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm transition-all ${isPaused ? 'bg-orange-500/10 border-orange-500/30 text-orange-400' : 'bg-white/5 border-white/10 hover:bg-white/10 text-slate-300'}`}
             >
               {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
               {isPaused ? "Live Paused" : "Live Active"}
             </button>
          </div>
        </header>

        {/* Hero Section */}
        <div className="py-12 max-w-2xl mb-8">
           <h2 className="text-6xl font-medium tracking-tight text-white mb-4 leading-tight">
             Intelligence <br/> Under Gravity
           </h2>
           <p className="text-slate-400 text-lg">
             Monitoring agent executions at the event horizon. Complete visibility, immutable traces.
           </p>
        </div>

        <main className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1">
          {/* Left Column: Alerts & Metrics */}
          <div className="lg:col-span-4 space-y-8">
            <section className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden group transition-all hover:border-orange-500/30">
              <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-orange-500/0 via-orange-500 to-orange-500/0 opacity-50" />
              
              <h2 className="text-xl font-light mb-6 flex items-center gap-3 text-white">
                <ShieldAlert className="w-5 h-5 text-orange-500" />
                Pending Interventions
                {pausedActions.length > 0 && (
                  <span className="ml-auto bg-orange-500 text-black text-xs px-3 py-1 rounded-full font-bold">
                    {pausedActions.length} Action{pausedActions.length > 1 ? 's' : ''}
                  </span>
                )}
              </h2>

              {pausedActions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                  <CheckCircle2 className="w-10 h-10 mb-3 opacity-20" />
                  <p className="text-sm tracking-wide">All systems nominal.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pausedActions.map(action => (
                    <InterventionCard key={action.span_id} action={action} onActionTaken={fetchTraces} />
                  ))}
                </div>
              )}
            </section>

            <section className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl">
               <h2 className="text-xl font-light mb-6 flex items-center gap-3 text-white">
                <Activity className="w-5 h-5 text-amber-500" />
                Telemetry Stats
              </h2>
              <div className="grid grid-cols-2 gap-4">
                 <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                    <p className="text-xs text-slate-500 mb-2 tracking-wider uppercase">Active Traces</p>
                    <p className="text-3xl font-light text-white">{tree.length}</p>
                 </div>
                 <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                    <p className="text-xs text-slate-500 mb-2 tracking-wider uppercase">Total Events</p>
                    <p className="text-3xl font-light text-white">{traces.length}</p>
                 </div>
                 <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                    <p className="text-xs text-slate-500 mb-2 tracking-wider uppercase">Success Rate</p>
                    <p className="text-3xl font-light text-emerald-400">{successRate}%</p>
                 </div>
                 <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                    <p className="text-xs text-slate-500 mb-2 tracking-wider uppercase">Error Count</p>
                    <p className="text-3xl font-light text-red-400">{errorEvents}</p>
                 </div>
              </div>
            </section>
          </div>

          {/* Right Column: Trace DAG View */}
          <div className="lg:col-span-8">
            <section className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl h-full min-h-[600px] flex flex-col">
              <div className="flex justify-between items-end mb-8 border-b border-white/10 pb-6">
                 <h2 className="text-xl font-light flex items-center gap-3 text-white">
                   <Terminal className="w-5 h-5 text-orange-400" />
                   Execution Trace
                 </h2>
                 <p className="text-sm text-slate-500">Real-time DAG visualization</p>
              </div>
              
              {loading ? (
                <div className="flex-1 flex justify-center items-center">
                  <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : tree.length === 0 ? (
                 <div className="flex-1 flex flex-col items-center justify-center py-20 text-slate-600">
                   <BrainCircuit className="w-12 h-12 mb-4 opacity-20" />
                   <p>No telemetry found.</p>
                   <p className="text-sm mt-2 opacity-50">Initiate an agent task to begin tracking.</p>
                 </div>
              ) : (
                <div className="space-y-4 overflow-y-auto flex-1 pr-2">
                  {tree.map(node => (
                    <TraceNode key={node.span_id} node={node} />
                  ))}
                </div>
              )}
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

// --- Components ---

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
    <div className="bg-orange-950/20 border border-orange-500/30 rounded-2xl p-5 shadow-[0_0_30px_rgba(249,115,22,0.05)] relative overflow-hidden group hover:border-orange-500/60 transition-colors">
      <div className="absolute -right-4 -top-4 p-4 opacity-[0.03] group-hover:opacity-10 transition-opacity">
        <ShieldAlert className="w-32 h-32 text-orange-500" />
      </div>
      
      <div className="relative z-10">
        <div className="mb-4">
          <h3 className="text-orange-400 font-medium text-lg flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
            Action Blocked
          </h3>
          <p className="text-sm text-slate-400 mt-1">{reason}</p>
        </div>
        
        <div className="mb-5 bg-black/50 p-4 rounded-xl border border-white/5 font-mono text-xs overflow-hidden">
          <p className="text-slate-400 mb-2">Target <span className="text-white ml-2">{action.name}</span></p>
          <p className="text-slate-400">Confidence <span className="text-orange-400 ml-2">{(action.confidence * 100).toFixed(0)}%</span></p>
        </div>

        <div className="flex gap-3">
          <button 
            onClick={() => handleDecision("reject")}
            disabled={loading}
            className="flex-1 bg-white/5 hover:bg-white/10 text-white border border-white/10 py-2.5 rounded-xl text-sm font-medium transition-all"
          >
            Reject
          </button>
          <button 
            onClick={() => handleDecision("approve")}
            disabled={loading}
            className="flex-1 bg-orange-500 hover:bg-orange-400 text-black shadow-[0_0_15px_rgba(249,115,22,0.4)] hover:shadow-[0_0_25px_rgba(249,115,22,0.6)] py-2.5 rounded-xl text-sm font-bold transition-all"
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
    <div className="relative" style={{ marginLeft: depth > 0 ? "1.5rem" : "0" }}>
      {/* Tree connecting lines */}
      {depth > 0 && (
        <div className="absolute -left-5 top-5 w-5 h-[1px] bg-white/10" />
      )}
      {depth > 0 && (
        <div className="absolute -left-5 -top-6 bottom-auto h-11 w-[1px] bg-white/10" />
      )}

      <div className="mb-4 bg-black/40 border border-white/5 rounded-2xl overflow-hidden transition-all hover:border-white/20 hover:bg-black/60 group">
        <div 
          className={`flex items-center gap-4 p-4 cursor-pointer select-none`}
          onClick={() => hasChildren && setExpanded(!expanded)}
        >
          {/* Collapse icon */}
          <div className="w-5 flex justify-center text-slate-500 group-hover:text-white transition-colors">
            {hasChildren ? (
              expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
            ) : (
              <div className="w-1.5 h-1.5 rounded-full bg-slate-700" />
            )}
          </div>
          
          <div className="flex-1 min-w-0 flex items-center gap-4">
             <span className="font-medium text-[15px] text-slate-200 truncate">{node.name}</span>
             <span className="text-[10px] tracking-widest uppercase text-slate-500 border border-white/10 px-2 py-0.5 rounded-md">{node.event_type}</span>
          </div>

          <div className={`px-3 py-1 rounded-full border text-[11px] font-medium flex items-center gap-2 tracking-wide ${statusColor}`}>
             {node.status === "running" && <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />}
             {node.status === "paused" && <AlertCircle className="w-3 h-3" />}
             {node.status}
          </div>
        </div>

        {/* Node Details (Input/Output) */}
        {expanded && (
          <div className="px-5 pb-5 pt-1 border-t border-white/5 font-mono text-xs space-y-4">
             {node.input_data && (
                <div>
                   <span className="text-slate-500 mb-2 block uppercase tracking-wider text-[10px]">Input</span>
                   <div className="bg-white/5 p-3 rounded-xl border border-white/5 text-slate-300 overflow-x-auto whitespace-pre-wrap">
                     {node.input_data}
                   </div>
                </div>
             )}
             {node.output_data && (
                <div>
                   <span className="text-slate-500 mb-2 block uppercase tracking-wider text-[10px]">Output</span>
                   <div className={`bg-white/5 p-3 rounded-xl border border-white/5 overflow-x-auto whitespace-pre-wrap ${node.status === 'error' ? 'text-red-400' : 'text-slate-300'}`}>
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

