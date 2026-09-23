import React, { useState } from "react";
import { 
  Bot, 
  Workflow, 
  Sliders, 
  Layers, 
  Radio, 
  Sparkles, 
  MessageSquare, 
  Activity, 
  Info,
  Terminal,
  ShieldCheck,
  Calendar,
  CheckSquare
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Console } from "@/components/pipecat/console/console";
import { TransportSelect } from "@/components/TransportSelect";
import { WorkerDemoPanel } from "@/components/WorkerDemoPanel";
import { PipelineArchitectureView } from "@/components/PipelineArchitectureView";
import { InteractiveChatSimulator } from "@/components/InteractiveChatSimulator";
import { ApiVerificationPanel } from "@/components/ApiVerificationPanel";
import { GoogleCalendarPanel } from "@/components/GoogleCalendarPanel";
import { GoogleTasksPanel } from "@/components/GoogleTasksPanel";
import { 
  AVAILABLE_TRANSPORTS, 
  DEFAULT_TRANSPORT, 
  PROJECT_NAME, 
  BOT_TEMPLATES, 
  type TransportType 
} from "@/config";

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"console" | "simulator" | "calendar" | "tasks" | "workers" | "architecture" | "verify">("simulator");
  const [selectedBotId, setSelectedBotId] = useState<string>("voice-assistant");
  const [transportType, setTransportType] = useState<TransportType>(DEFAULT_TRANSPORT);

  const selectedBot = BOT_TEMPLATES.find((b) => b.id === selectedBotId) || BOT_TEMPLATES[0];

  return (
    <div className="h-dvh flex flex-col bg-[#08090B] text-[#F4F2F8] overflow-hidden bg-ambient-atmosphere">
      {/* Top Application Bar */}
      <header className="h-14 border-b border-[#292B3A] bg-[#0D0F13]/90 backdrop-blur-xl px-4 flex items-center justify-between shrink-0 z-20 shadow-lg shadow-black/40">
        <div className="flex items-center gap-3.5">
          {/* Studio Brand */}
          <div className="flex items-center gap-2.5">
            <div className="relative flex items-center justify-center size-8 rounded-lg bg-gradient-to-br from-[#7047FF] to-[#35246E] p-0.5 border border-[#845CFF]/40 shadow-[0_0_12px_rgba(112,71,255,0.4)]">
              <Sparkles className="size-4 text-white" />
              <span className="absolute -bottom-0.5 -right-0.5 size-2 rounded-full bg-[#20E99A] ring-2 ring-[#0D0F13] animate-pulse" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm tracking-tight text-[#F4F2F8] flex items-center gap-1.5">
                Tilted Studio
              </span>
              <span className="text-[10px] font-mono uppercase font-semibold px-1.5 py-0.5 rounded border border-[#7047FF]/40 bg-[#7047FF]/15 text-[#845CFF] tracking-wider">
                Pyvex Voice
              </span>
            </div>
          </div>

          {/* 5-bar acoustic frequency equalizer */}
          <div className="hidden sm:flex items-center gap-0.5 h-4 px-1.5 py-0.5 rounded bg-[#171820] border border-[#292B3A]" title="Acoustic Frequency Engine Active">
            <span className="w-0.5 h-full bg-[#7047FF] rounded-full acoustic-bar-1" />
            <span className="w-0.5 h-full bg-[#845CFF] rounded-full acoustic-bar-2" />
            <span className="w-0.5 h-full bg-[#24D8ED] rounded-full acoustic-bar-3" />
            <span className="w-0.5 h-full bg-[#20E99A] rounded-full acoustic-bar-4" />
            <span className="w-0.5 h-full bg-[#7047FF] rounded-full acoustic-bar-5" />
          </div>

          <div className="h-4 w-px bg-[#292B3A] hidden sm:block mx-1" />

          {/* Bot Template Selector */}
          <div className="flex items-center gap-2">
            <Select value={selectedBotId} onValueChange={setSelectedBotId}>
              <SelectTrigger size="sm" className="h-8 text-xs min-w-44 max-w-64 border-[#292B3A] bg-[#12141A] text-[#F4F2F8] hover:border-[#7047FF]/50 transition-colors">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="start" className="bg-[#171820] border-[#292B3A] text-[#F4F2F8]">
                {BOT_TEMPLATES.map((bot) => (
                  <SelectItem key={bot.id} value={bot.id} className="text-xs hover:bg-[#1C1D25] focus:bg-[#1C1D25] focus:text-[#F4F2F8]">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-[#F4F2F8]">{bot.name}</span>
                      <span className="text-[10px] text-[#A4A3B2]">({bot.category})</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* View Mode Tabs */}
        <div className="flex items-center gap-2.5">
          <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as typeof activeTab)}>
            <TabsList className="h-8 bg-[#12141A] border border-[#292B3A] p-0.5">
              <TabsTrigger 
                value="simulator" 
                className="text-xs px-2.5 h-7 text-[#A4A3B2] data-[state=active]:bg-[#1C1D25] data-[state=active]:text-[#F4F2F8] data-[state=active]:shadow-sm transition-all"
              >
                <MessageSquare className="size-3.5 mr-1.5 text-[#845CFF]" />
                <span>Voice Stream</span>
              </TabsTrigger>
              <TabsTrigger 
                value="calendar" 
                className="text-xs px-2.5 h-7 text-[#A4A3B2] data-[state=active]:bg-[#1C1D25] data-[state=active]:text-[#F4F2F8] transition-all"
              >
                <Calendar className="size-3.5 mr-1.5 text-[#24D8ED]" />
                <span>Google Calendar</span>
              </TabsTrigger>
              <TabsTrigger 
                value="tasks" 
                className="text-xs px-2.5 h-7 text-[#A4A3B2] data-[state=active]:bg-[#1C1D25] data-[state=active]:text-[#F4F2F8] transition-all"
              >
                <CheckSquare className="size-3.5 mr-1.5 text-[#24D8ED]" />
                <span>Google Tasks</span>
              </TabsTrigger>
              <TabsTrigger 
                value="verify" 
                className="text-xs px-2.5 h-7 text-[#A4A3B2] data-[state=active]:bg-[#1C1D25] data-[state=active]:text-[#F4F2F8] transition-all"
              >
                <ShieldCheck className="size-3.5 mr-1.5 text-[#20E99A]" />
                <span>API Verify</span>
              </TabsTrigger>
              <TabsTrigger 
                value="workers" 
                className="text-xs px-2.5 h-7 text-[#A4A3B2] data-[state=active]:bg-[#1C1D25] data-[state=active]:text-[#F4F2F8] transition-all"
              >
                <Workflow className="size-3.5 mr-1.5 text-[#24D8ED]" />
                <span>Multi-Worker</span>
              </TabsTrigger>
              <TabsTrigger 
                value="architecture" 
                className="text-xs px-2.5 h-7 text-[#A4A3B2] data-[state=active]:bg-[#1C1D25] data-[state=active]:text-[#F4F2F8] transition-all"
              >
                <Layers className="size-3.5 mr-1.5 text-[#F5BD24]" />
                <span>Architecture</span>
              </TabsTrigger>
              <TabsTrigger 
                value="console" 
                className="text-xs px-2.5 h-7 text-[#A4A3B2] data-[state=active]:bg-[#1C1D25] data-[state=active]:text-[#F4F2F8] transition-all"
              >
                <Terminal className="size-3.5 mr-1.5 text-[#845CFF]" />
                <span>Console</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="h-4 w-px bg-[#292B3A] hidden md:block mx-0.5" />

          {/* Transport Picker */}
          <div className="hidden md:flex items-center gap-1.5">
            <TransportSelect
              transportType={transportType}
              onTransportChange={setTransportType}
              availableTransports={AVAILABLE_TRANSPORTS}
            />
          </div>
        </div>
      </header>

      {/* Main View Surface */}
      <main className="flex-1 overflow-hidden relative">
        {activeTab === "verify" && (
          <ApiVerificationPanel />
        )}

        {activeTab === "simulator" && (
          <InteractiveChatSimulator 
            activeBotId={selectedBotId} 
          />
        )}

        {activeTab === "calendar" && (
          <GoogleCalendarPanel 
            onSendToVoiceAgent={() => setActiveTab("simulator")}
          />
        )}

        {activeTab === "tasks" && (
          <GoogleTasksPanel 
            onSendToVoiceAgent={() => setActiveTab("simulator")}
          />
        )}

        {activeTab === "workers" && (
          <WorkerDemoPanel />
        )}

        {activeTab === "architecture" && (
          <PipelineArchitectureView />
        )}

        {activeTab === "console" && (
          <div className="h-full w-full">
            <Console
              key={transportType}
              transportType={transportType}
              titleText={`${selectedBot.name} Console`}
              startBotParams={{
                endpoint: "/api/start",
                headers: new Headers({ "Content-Type": "application/json" }),
                requestData: { botId: selectedBotId },
              }}
              connectParams={{
                endpoint: "/api/start",
                headers: new Headers({ "Content-Type": "application/json" }),
                requestData: { botId: selectedBotId },
              }}
              headerSlot={
                <div className="flex items-center gap-2 mr-2">
                  <span className="text-xs text-muted-foreground hidden lg:inline">
                    {selectedBot.pipeline.stt} &rarr; {selectedBot.pipeline.llm} &rarr; {selectedBot.pipeline.tts}
                  </span>
                </div>
              }
            />
          </div>
        )}
      </main>

      {/* Bottom Status Bar */}
      <footer className="h-7 border-t border-border bg-card/60 px-4 flex items-center justify-between text-[11px] text-muted-foreground shrink-0 select-none">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Tilted Node Host: Online (Port 3000)
          </span>
          <span className="hidden sm:inline">&bull;</span>
          <span className="hidden sm:inline font-mono">
            Active Bot: {selectedBot.name}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span>Transport: <span className="font-mono text-foreground">{transportType}</span></span>
        </div>
      </footer>
    </div>
  );
};
