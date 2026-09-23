import React, { useState } from "react";
import { Check, Plus, Trash2, Mic, Bot, Sparkles, Workflow, ArrowRight, Zap, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface ShoppingItem {
  id: string;
  text: string;
  completed: boolean;
}

interface WorkerDemoPanelProps {
  onSimulateVoiceTurn?: (prompt: string) => void;
  isSimulating?: boolean;
}

export const WorkerDemoPanel: React.FC<WorkerDemoPanelProps> = ({
  onSimulateVoiceTurn,
  isSimulating = false,
}) => {
  const [items, setItems] = useState<ShoppingItem[]>([
    { id: "item-1", text: "Organic oat milk", completed: false },
    { id: "item-2", text: "Fresh sourdough bread", completed: true },
    { id: "item-3", text: "Fair-trade coffee beans", completed: false },
  ]);
  const [newItemText, setNewItemText] = useState("");
  const [workerLogs, setWorkerLogs] = useState<Array<{ time: string; worker: string; action: string }>>([
    { time: "10:14:02", worker: "PipelineWorker", action: "User utterance: 'add organic oat milk'" },
    { time: "10:14:03", worker: "WorkerBus", action: "Dispatched 'respond' job to 'ui' worker" },
    { time: "10:14:03", worker: "UIWorker", action: "Executed update_list(add='Organic oat milk') [silent]" },
  ]);

  const handleToggleItem = (id: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const nextState = !item.completed;
          logAction("UIWorker", `User manual toggle: '${item.text}' -> ${nextState ? 'done' : 'pending'}`);
          return { ...item, completed: nextState };
        }
        return item;
      })
    );
  };

  const handleAddItem = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newItemText.trim()) return;
    const text = newItemText.trim();
    const newItem: ShoppingItem = {
      id: `item-${Date.now()}`,
      text,
      completed: false,
    };
    setItems((prev) => [...prev, newItem]);
    setNewItemText("");
    logAction("UIWorker", `Direct mutation: added '${text}'`);
  };

  const handleDeleteItem = (id: string) => {
    const item = items.find((i) => i.id === id);
    setItems((prev) => prev.filter((i) => i.id !== id));
    if (item) {
      logAction("UIWorker", `Removed '${item.text}'`);
    }
  };

  const logAction = (worker: string, action: string) => {
    const time = new Date().toLocaleTimeString();
    setWorkerLogs((prev) => [{ time, worker, action }, ...prev.slice(0, 15)]);
  };

  const handleVoiceCommand = (commandText: string) => {
    logAction("PipelineWorker", `Received speech turn: "${commandText}"`);
    logAction("WorkerBus", "Publishing job payload to UIWorker...");
    
    // Local state reactive update
    const lower = commandText.toLowerCase();
    if (lower.includes("add") || lower.includes("milk") || lower.includes("berries") || lower.includes("eggs")) {
      const added = lower.includes("berries") ? "Fresh blueberries" : lower.includes("eggs") ? "Cage-free eggs" : "Organic Greek yogurt";
      setItems(prev => [...prev, { id: `item-${Date.now()}`, text: added, completed: false }]);
      logAction("UIWorker", `Auto-executed update_list(add='${added}')`);
    } else if (lower.includes("check off") || lower.includes("bread") || lower.includes("milk")) {
      setItems(prev => prev.map((item, idx) => idx === 0 ? { ...item, completed: true } : item));
      logAction("UIWorker", `Auto-executed update_list(check='item')`);
    }

    if (onSimulateVoiceTurn) {
      onSimulateVoiceTurn(commandText);
    }
  };

  return (
    <div id="worker-demo-panel" className="h-full flex flex-col p-4 md:p-6 overflow-y-auto max-w-5xl mx-auto w-full gap-6">
      {/* Pattern Banner */}
      <div className="bg-muted/40 border border-border rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary uppercase tracking-wider">
              Multi-Worker Pattern
            </span>
            <span className="text-xs text-muted-foreground">examples/multi-worker/ui-worker/shopping-list</span>
          </div>
          <h2 className="text-lg font-bold tracking-tight">Shopping List — Every Voice Turn Drives UI</h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Voice pipeline runs in parallel with a dedicated <code className="bg-muted px-1.5 py-0.5 rounded text-xs">UIWorker</code>. 
            Speech remains conversational and never mutates state directly; the worker silently synchronizes the on-screen snapshot.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 justify-end">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Bus Connected
            </div>
            <div className="text-xs text-muted-foreground">Snapshot synced (3 items)</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Shopping List Live Surface */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <Card className="p-5 flex flex-col h-full bg-card border-border shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                  UI
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Screen Snapshot State</h3>
                  <p className="text-xs text-muted-foreground">Live list controlled by voice turns or clicks</p>
                </div>
              </div>
              <span className="text-xs bg-muted px-2 py-1 rounded-md font-mono">
                {items.filter((i) => !i.completed).length} pending
              </span>
            </div>

            {/* List items */}
            <div className="flex-1 my-4 space-y-2 min-h-48">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-muted-foreground text-sm">
                  <p>Shopping list is empty.</p>
                  <p className="text-xs mt-1">Speak or type an item to add it!</p>
                </div>
              ) : (
                items.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleToggleItem(item.id)}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer group select-none ${
                      item.completed
                        ? "bg-muted/30 border-muted text-muted-foreground line-through"
                        : "bg-background border-border hover:border-primary/50 text-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`size-5 rounded flex items-center justify-center border transition-colors ${
                          item.completed
                            ? "bg-primary border-primary text-primary-foreground"
                            : "border-muted-foreground/40 group-hover:border-primary"
                        }`}
                      >
                        {item.completed && <Check className="size-3.5" />}
                      </div>
                      <span className="text-sm font-medium">{item.text}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 transition-opacity size-7 p-0 text-muted-foreground hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteItem(item.id);
                      }}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                ))
              )}
            </div>

            {/* Add item form */}
            <form onSubmit={handleAddItem} className="flex gap-2 pt-3 border-t border-border">
              <Input
                placeholder="Add grocery item manually..."
                value={newItemText}
                onChange={(e) => setNewItemText(e.target.value)}
                className="text-sm"
              />
              <Button type="submit" size="sm" className="gap-1 shrink-0">
                <Plus className="size-4" />
                Add
              </Button>
            </form>
          </Card>
        </div>

        {/* Voice Trigger & Bus Telemetry */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* Quick Voice Turns */}
          <Card className="p-5 bg-card border-border shadow-xs">
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-2">
              <Mic className="size-4 text-primary" />
              Simulate Voice Turn
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Click a sample speech utterance to test the multi-worker handoff without configuring external microphones.
            </p>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => handleVoiceCommand("Add fresh blueberries to the list")}
                disabled={isSimulating}
                className="text-left text-xs p-2.5 rounded-lg border border-border bg-background hover:bg-muted/50 transition-colors flex items-center justify-between group disabled:opacity-50"
              >
                <span>&ldquo;Add fresh blueberries to the list&rdquo;</span>
                <ArrowRight className="size-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
              </button>
              <button
                type="button"
                onClick={() => handleVoiceCommand("Check off the sourdough bread")}
                disabled={isSimulating}
                className="text-left text-xs p-2.5 rounded-lg border border-border bg-background hover:bg-muted/50 transition-colors flex items-center justify-between group disabled:opacity-50"
              >
                <span>&ldquo;Check off the sourdough bread&rdquo;</span>
                <ArrowRight className="size-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
              </button>
              <button
                type="button"
                onClick={() => handleVoiceCommand("What's left on my shopping list?")}
                disabled={isSimulating}
                className="text-left text-xs p-2.5 rounded-lg border border-border bg-background hover:bg-muted/50 transition-colors flex items-center justify-between group disabled:opacity-50"
              >
                <span>&ldquo;What&apos;s left on my shopping list?&rdquo;</span>
                <ArrowRight className="size-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
              </button>
            </div>
          </Card>

          {/* Inter-Worker Telemetry Log */}
          <Card className="p-5 bg-card border-border shadow-xs flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Workflow className="size-4 text-primary" />
                Inter-Worker Bus Trace
              </h3>
              <span className="text-[10px] text-muted-foreground uppercase font-mono">WorkerBus</span>
            </div>

            <div className="flex-1 bg-muted/40 rounded-lg p-3 overflow-y-auto max-h-48 font-mono text-[11px] space-y-2 border border-border/50">
              {workerLogs.map((log, index) => (
                <div key={index} className="flex flex-col gap-0.5">
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span className="font-semibold text-primary">{log.worker}</span>
                    <span>{log.time}</span>
                  </div>
                  <div className="text-foreground/90 pl-1 border-l-2 border-primary/30">
                    {log.action}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
