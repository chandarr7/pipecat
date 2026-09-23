import React, { useState, useEffect } from "react";
import { 
  Workflow, 
  ArrowRight, 
  LogOut, 
  Server, 
  CheckCircle2, 
  Cpu, 
  Zap, 
  Activity, 
  Radio, 
  RefreshCw, 
  Send, 
  Terminal, 
  Play, 
  Layers
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MultiWorkerLoginPage } from "@/components/MultiWorkerLoginPage";
import { logoutGoogle } from "@/lib/google-auth";
import { saveOperatorProfile, recordBusEventLog } from "@/lib/firebase";
import type { WorkerOperator } from "@/types";

interface RegisteredWorker {
  id: string;
  name: string;
  type: "root" | "subagent" | "service" | "bridge";
  status: "active" | "ready" | "idle";
  jobsCompleted: number;
  latencyMs: number;
  description: string;
}

interface WorkerDemoPanelProps {
  onSimulateVoiceTurn?: (prompt: string) => void;
  isSimulating?: boolean;
}

export const WorkerDemoPanel: React.FC<WorkerDemoPanelProps> = ({
  onSimulateVoiceTurn,
  isSimulating = false,
}) => {
  const [operator, setOperator] = useState<WorkerOperator | null>(() => {
    try {
      const saved = localStorage.getItem("tilted_multi_worker_operator");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [workers, setWorkers] = useState<RegisteredWorker[]>([
    {
      id: "pipeline-root",
      name: "PipelineWorker (Voice Engine)",
      type: "root",
      status: "active",
      jobsCompleted: 142,
      latencyMs: 1.2,
      description: "Root pipeline worker wrapping VAD, turn detection, and audio frame routing.",
    },
    {
      id: "llm-context-worker",
      name: "LLMContextWorker (Context & Tools)",
      type: "subagent",
      status: "ready",
      jobsCompleted: 89,
      latencyMs: 2.8,
      description: "Maintains LLMContext aggregators, conversation memory, and @tool schemas.",
    },
    {
      id: "worker-registry",
      name: "WorkerRegistry (Node Discovery)",
      type: "service",
      status: "ready",
      jobsCompleted: 312,
      latencyMs: 0.4,
      description: "Local & distributed worker tracking, heartbeat monitoring, and bus watchers.",
    },
    {
      id: "bus-bridge-proxy",
      name: "WorkerBus Bridge (Network Node)",
      type: "bridge",
      status: "active",
      jobsCompleted: 64,
      latencyMs: 4.1,
      description: "Network queue proxy connecting in-process bus with Redis/PGMQ distributed brokers.",
    },
  ]);

  const [customJobAction, setCustomJobAction] = useState("sync_turn_context");
  const [targetWorkerId, setTargetWorkerId] = useState("llm-context-worker");
  const [isDispatching, setIsDispatching] = useState(false);

  const [workerLogs, setWorkerLogs] = useState<Array<{ 
    time: string; 
    worker: string; 
    action: string; 
    type: "job" | "system" | "bus" 
  }>>([
    { time: "10:20:01", worker: "WorkerRunner", action: "Runner initialized with auto_end=False on port 3000", type: "system" },
    { time: "10:20:02", worker: "WorkerRegistry", action: "Registered 4 local and bridged workers", type: "system" },
    { time: "10:20:03", worker: "WorkerBus", action: "AsyncQueueBus message loop established (latency: 0.3ms)", type: "bus" },
    { time: "10:20:04", worker: "PipelineWorker", action: "Pushed StartFrame downstream through audio processors", type: "job" },
  ]);

  useEffect(() => {
    if (operator) {
      logAction("WorkerRegistry", `Operator '${operator.name}' (${operator.role}) authenticated via ${operator.authType}`, "system");
      saveOperatorProfile(operator);
    }
  }, [operator]);

  const handleLogout = async () => {
    try {
      await logoutGoogle();
    } catch {
      // ignore
    }
    localStorage.removeItem("tilted_multi_worker_operator");
    setOperator(null);
  };

  const logAction = (worker: string, action: string, type: "job" | "system" | "bus" = "job") => {
    const time = new Date().toLocaleTimeString();
    setWorkerLogs((prev) => [{ time, worker, action, type }, ...prev.slice(0, 24)]);
    if (operator?.id) {
      recordBusEventLog(operator.id, "session-live", { worker, action, eventType: type });
    }
  };

  const dispatchJob = (workerId: string, actionName: string) => {
    setIsDispatching(true);
    const target = workers.find((w) => w.id === workerId);
    const targetName = target ? target.name.split(" ")[0] : workerId;

    logAction("WorkerBus", `Dispatched RPC self.job('${targetName}', action='${actionName}')`, "bus");

    setTimeout(() => {
      setWorkers((prev) =>
        prev.map((w) =>
          w.id === workerId ? { ...w, jobsCompleted: w.jobsCompleted + 1 } : w
        )
      );
      logAction(targetName, `Executed job '${actionName}' -> JobStatus.COMPLETED (code: 200)`, "job");
      setIsDispatching(false);
    }, 350);
  };

  const handleBroadcastInterruption = () => {
    setIsDispatching(true);
    logAction("PipelineWorker", "Broadcasting InterruptionFrame upstream & downstream...", "job");
    setTimeout(() => {
      logAction("WorkerBus", "WorkerBus propagated InterruptionFrame: flushed active processor queues", "bus");
      setIsDispatching(false);
    }, 200);
  };

  const handleProbeHeartbeat = () => {
    setIsDispatching(true);
    logAction("WorkerRegistry", "Dispatching self.job_group('*', 'heartbeat_ping')", "bus");
    setTimeout(() => {
      workers.forEach((w) => {
        logAction(w.name.split(" ")[0], `Heartbeat ACK: alive (latency: ${w.latencyMs}ms)`, "job");
      });
      setIsDispatching(false);
    }, 300);
  };

  if (!operator) {
    return <MultiWorkerLoginPage onLoginSuccess={(op) => setOperator(op)} />;
  }

  return (
    <div id="worker-demo-panel" className="h-full flex flex-col p-4 md:p-6 overflow-y-auto max-w-5xl mx-auto w-full gap-5">
      {/* Operator Status Header */}
      <div className="bg-[#171820] border border-[#292B3A] rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-3">
          {operator.avatarUrl ? (
            <img
              src={operator.avatarUrl}
              alt={operator.name}
              className="size-9 rounded-full object-cover border border-[#7047FF]/50"
            />
          ) : (
            <div className="size-9 rounded-full bg-[#7047FF]/20 border border-[#7047FF]/40 flex items-center justify-center text-[#845CFF] font-bold text-sm">
              {operator.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#F4F2F8]">{operator.name}</span>
              <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-[#7047FF]/40 text-[#845CFF] bg-[#7047FF]/10">
                {operator.role}
              </Badge>
              <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-emerald-500/30 text-emerald-400 bg-emerald-500/10 flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Bus Active
              </Badge>
              <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-amber-500/30 text-amber-400 bg-amber-500/10 flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-amber-400" />
                Firestore (us-east1)
              </Badge>
            </div>
            <div className="text-[11px] text-[#A4A3B2] flex items-center gap-2">
              <span>{operator.email}</span>
              <span>&bull;</span>
              <span className="font-mono text-[10px]">{operator.cluster}</span>
              <span>&bull;</span>
              <span className="text-[10px] text-[#A4A3B2]">Session ID: {operator.id}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="h-7 text-xs border-[#292B3A] bg-[#12141A] text-[#A4A3B2] hover:text-red-400 hover:border-red-900/50 hover:bg-red-950/20 transition-all flex items-center gap-1.5"
          >
            <LogOut className="size-3" />
            <span>Sign Out</span>
          </Button>
        </div>
      </div>

      {/* Cluster Overview Banner */}
      <div className="bg-[#171820] border border-[#292B3A] rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-md">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#7047FF]/15 border border-[#7047FF]/30 text-[#845CFF] uppercase tracking-wider">
              Distributed Architecture
            </span>
            <span className="text-xs text-[#A4A3B2] font-mono">WorkerBus &amp; WorkerRegistry RPC</span>
          </div>
          <h2 className="text-lg font-bold tracking-tight text-[#F4F2F8]">
            Multi-Worker Cluster Management
          </h2>
          <p className="text-xs text-[#A4A3B2] mt-1 max-w-2xl leading-relaxed">
            Coordinate cooperating workers with the shared <code className="bg-[#12141A] px-1.5 py-0.5 rounded border border-[#292B3A] text-xs font-mono text-[#F4F2F8]">WorkerBus</code>. 
            Root pipeline workers, context subagents, and bridge proxies exchange typed messages and non-blocking RPC jobs.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-medium text-emerald-400 flex items-center gap-1.5 justify-end">
              <span className="size-2 rounded-full bg-emerald-400 animate-pulse"></span>
              In-Process Bus Connected
            </div>
            <div className="text-xs text-[#A4A3B2] font-mono mt-0.5">
              {workers.length} registered workers &bull; 0 packet drops
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Active Registered Workers */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <Card className="p-4 bg-[#171820] border-[#292B3A] shadow-md flex flex-col gap-3">
            <div className="flex items-center justify-between pb-3 border-b border-[#292B3A]">
              <div className="flex items-center gap-2">
                <div className="size-7 rounded-lg bg-[#7047FF]/20 border border-[#7047FF]/40 flex items-center justify-center text-[#845CFF]">
                  <Cpu className="size-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-xs text-[#F4F2F8]">Registered Workers</h3>
                  <p className="text-[11px] text-[#A4A3B2]">Active units coordinated by WorkerRunner</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleProbeHeartbeat}
                disabled={isDispatching}
                className="h-7 text-xs border-[#292B3A] bg-[#12141A] text-[#A4A3B2] hover:text-[#F4F2F8] gap-1.5"
              >
                <RefreshCw className={`size-3 ${isDispatching ? "animate-spin" : ""}`} />
                <span>Probe Nodes</span>
              </Button>
            </div>

            <div className="space-y-2.5">
              {workers.map((worker) => (
                <div
                  key={worker.id}
                  className="p-3 rounded-lg border border-[#292B3A] bg-[#12141A] hover:border-[#7047FF]/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-[#F4F2F8]">{worker.name}</span>
                      <Badge
                        variant="outline"
                        className={`text-[10px] py-0 px-1.5 ${
                          worker.status === "active"
                            ? "border-emerald-500/40 text-emerald-400 bg-emerald-500/10"
                            : "border-cyan-500/40 text-cyan-400 bg-cyan-500/10"
                        }`}
                      >
                        {worker.status}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-[#A4A3B2] leading-relaxed">
                      {worker.description}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                    <div className="text-right">
                      <div className="text-[10px] text-[#A4A3B2]">RPC Jobs</div>
                      <div className="font-mono text-xs font-bold text-[#F4F2F8]">
                        {worker.jobsCompleted}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-[#A4A3B2]">Latency</div>
                      <div className="font-mono text-xs text-cyan-400">
                        {worker.latencyMs}ms
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => dispatchJob(worker.id, "ping_worker")}
                      disabled={isDispatching}
                      className="h-7 px-2 text-xs text-[#845CFF] hover:bg-[#7047FF]/20"
                    >
                      Ping
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Quick Actions & RPC Control */}
          <Card className="p-4 bg-[#171820] border-[#292B3A] shadow-md">
            <h4 className="text-xs font-semibold text-[#F4F2F8] flex items-center gap-2 mb-2.5">
              <Zap className="size-3.5 text-[#845CFF]" />
              Quick RPC Commands
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleBroadcastInterruption}
                disabled={isDispatching}
                className="h-8 text-xs justify-start border-[#292B3A] bg-[#12141A] text-[#F4F2F8] hover:bg-[#1C1D25] gap-2"
              >
                <Radio className="size-3.5 text-red-400 shrink-0" />
                <span className="truncate">Broadcast InterruptionFrame</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => dispatchJob("llm-context-worker", "sync_turn_context")}
                disabled={isDispatching}
                className="h-8 text-xs justify-start border-[#292B3A] bg-[#12141A] text-[#F4F2F8] hover:bg-[#1C1D25] gap-2"
              >
                <Layers className="size-3.5 text-cyan-400 shrink-0" />
                <span className="truncate">Sync LLMContext Aggregator</span>
              </Button>
            </div>
          </Card>
        </div>

        {/* Inter-Worker Telemetry & Job Dispatch Console */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* Dispatch Job Form */}
          <Card className="p-4 bg-[#171820] border-[#292B3A] shadow-md">
            <h3 className="text-xs font-semibold text-[#F4F2F8] flex items-center gap-2 mb-1">
              <Send className="size-3.5 text-[#845CFF]" />
              Dispatch Custom Worker Job
            </h3>
            <p className="text-[11px] text-[#A4A3B2] mb-3">
              Execute cross-worker RPC over the shared WorkerBus.
            </p>

            <div className="space-y-2.5">
              <div>
                <label className="text-[10px] font-medium text-[#A4A3B2] uppercase tracking-wider block mb-1">
                  Target Worker
                </label>
                <select
                  value={targetWorkerId}
                  onChange={(e) => setTargetWorkerId(e.target.value)}
                  className="w-full h-8 px-2.5 rounded-lg bg-[#12141A] border border-[#292B3A] text-xs text-[#F4F2F8] focus:outline-none focus:ring-1 focus:ring-[#7047FF]"
                >
                  {workers.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-medium text-[#A4A3B2] uppercase tracking-wider block mb-1">
                  Job Handler Name
                </label>
                <div className="flex gap-2">
                  <Input
                    value={customJobAction}
                    onChange={(e) => setCustomJobAction(e.target.value)}
                    placeholder="e.g. process_turn, reset_cache"
                    className="h-8 bg-[#12141A] border-[#292B3A] text-xs text-[#F4F2F8] font-mono"
                  />
                  <Button
                    size="sm"
                    onClick={() => dispatchJob(targetWorkerId, customJobAction)}
                    disabled={isDispatching || !customJobAction.trim()}
                    className="h-8 px-3 text-xs bg-[#7047FF] hover:bg-[#845CFF] text-white shrink-0"
                  >
                    Dispatch
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          {/* Inter-Worker Telemetry Log */}
          <Card className="p-4 bg-[#171820] border-[#292B3A] shadow-md flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-[#292B3A]">
              <div className="flex items-center gap-2">
                <Terminal className="size-3.5 text-[#845CFF]" />
                <h3 className="text-xs font-semibold text-[#F4F2F8]">Inter-Worker Bus Trace</h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setWorkerLogs([])}
                className="h-6 px-2 text-[10px] text-[#A4A3B2] hover:text-[#F4F2F8]"
              >
                Clear
              </Button>
            </div>

            <div className="flex-1 bg-[#12141A] rounded-lg p-2.5 overflow-y-auto max-h-56 font-mono text-[11px] space-y-2 border border-[#292B3A]">
              {workerLogs.length === 0 ? (
                <div className="text-center py-6 text-[11px] text-[#A4A3B2]">
                  No bus messages recorded yet.
                </div>
              ) : (
                workerLogs.map((log, index) => (
                  <div key={index} className="flex flex-col gap-0.5">
                    <div className="flex items-center justify-between text-[10px] text-[#A4A3B2]">
                      <span className={`font-semibold ${
                        log.type === "bus" ? "text-cyan-400" : log.type === "system" ? "text-[#845CFF]" : "text-emerald-400"
                      }`}>
                        {log.worker}
                      </span>
                      <span>{log.time}</span>
                    </div>
                    <div className="text-[#F4F2F8] pl-1.5 border-l-2 border-[#292B3A]">
                      {log.action}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
