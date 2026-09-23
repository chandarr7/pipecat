import React, { useState } from "react";
import { 
  Radio, 
  Cpu, 
  Layers, 
  Volume2, 
  MessageSquare, 
  ArrowRight, 
  Zap, 
  ShieldAlert, 
  Activity, 
  Play,
  RotateCcw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const PipelineArchitectureView: React.FC = () => {
  const [activeStage, setActiveStage] = useState<number | null>(null);
  const [isSimulatingRun, setIsSimulatingRun] = useState(false);
  const [activeFrameType, setActiveFrameType] = useState<string>("AudioRawFrame");

  const stages = [
    {
      id: "input-transport",
      title: "Input Transport",
      subtitle: "WebRTC / WebSocket / Daily",
      desc: "Captures microphone audio frames and video frames from the client.",
      frame: "AudioRawFrame (16kHz PCM)",
      icon: Radio,
      badge: "I/O Layer",
    },
    {
      id: "turn-strategy",
      title: "VAD & Turn Strategy",
      subtitle: "Silero / WebRTC VAD",
      desc: "Detects speech onset and generates UserStartedSpeakingFrame.",
      frame: "UserStartedSpeakingFrame",
      icon: Activity,
      badge: "Audio Intelligence",
    },
    {
      id: "stt",
      title: "STT Service",
      subtitle: "Deepgram / Whisper / Gladia",
      desc: "Streams audio chunks and emits TranscriptionFrame tokens.",
      frame: "TranscriptionFrame",
      icon: MessageSquare,
      badge: "Speech to Text",
    },
    {
      id: "user-agg",
      title: "User Aggregator",
      subtitle: "LLMContextAggregatorPair",
      desc: "Accumulates user speech into conversation history and detects turn boundaries.",
      frame: "LLMContextFrame",
      icon: Layers,
      badge: "Context Memory",
    },
    {
      id: "llm",
      title: "LLM Service",
      subtitle: "Gemini / OpenAI / Anthropic",
      desc: "Streams completions and executes registered tool calls (@tool).",
      frame: "LLMResponseStartFrame",
      icon: Cpu,
      badge: "Reasoning Core",
    },
    {
      id: "tts",
      title: "TTS Service",
      subtitle: "ElevenLabs (Rachel - Female) / Cartesia",
      desc: "Synthesizes streaming text tokens into natural female voice audio chunks using ElevenLabs Turbo v2.5.",
      frame: "TTSAudioFrame (ElevenLabs 16kHz PCM)",
      icon: Volume2,
      badge: "Voice Synthesis",
    },
    {
      id: "output-transport",
      title: "Output Transport",
      subtitle: "SmallWebRTC / LiveKit / Twilio",
      desc: "Delivers low-latency audio to the remote client or phone dialout.",
      frame: "OutputAudioFrame",
      icon: Radio,
      badge: "I/O Layer",
    },
  ];

  const handleSimulatePipeline = () => {
    if (isSimulatingRun) return;
    setIsSimulatingRun(true);
    let step = 0;
    setActiveStage(0);
    setActiveFrameType(stages[0].frame);

    const interval = setInterval(() => {
      step++;
      if (step < stages.length) {
        setActiveStage(step);
        setActiveFrameType(stages[step].frame);
      } else {
        clearInterval(interval);
        setTimeout(() => {
          setIsSimulatingRun(false);
          setActiveStage(null);
        }, 800);
      }
    }, 450);
  };

  return (
    <div id="pipeline-architecture-view" className="h-full flex flex-col p-4 md:p-6 overflow-y-auto max-w-5xl mx-auto w-full gap-6">
      {/* Top Header Card */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary uppercase tracking-wider">
              Pipecat Core
            </span>
            <span className="text-xs text-muted-foreground">Frame-based Pipeline Architecture</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight">FrameProcessor Pipeline Flow</h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            In Pipecat, all data and control signals flow as <code className="text-primary font-mono text-xs">Frame</code> objects. 
            Processors push downstream (input to output) and broadcast upstream for interruptions and errors.
          </p>
        </div>
        <Button
          onClick={handleSimulatePipeline}
          disabled={isSimulatingRun}
          className="gap-2 shrink-0 font-medium"
        >
          {isSimulatingRun ? (
            <>
              <RotateCcw className="size-4 animate-spin" />
              Pushing Frame...
            </>
          ) : (
            <>
              <Play className="size-4" />
              Trace Pipeline Run
            </>
          )}
        </Button>
      </div>

      {/* Frame Active Indicator */}
      {isSimulatingRun && (
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 flex items-center justify-between animate-fade-in text-xs">
          <div className="flex items-center gap-2">
            <Zap className="size-4 text-amber-500 animate-pulse" />
            <span className="font-semibold text-foreground">Current Active Frame:</span>
            <code className="bg-primary/10 px-2 py-0.5 rounded text-primary font-mono">{activeFrameType}</code>
          </div>
          <span className="text-muted-foreground">Stage {((activeStage ?? 0) + 1)} of {stages.length}</span>
        </div>
      )}

      {/* Pipeline Stage Visualizer */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {stages.map((stage, idx) => {
          const Icon = stage.icon;
          const isActive = activeStage === idx;
          return (
            <Card
              key={stage.id}
              onClick={() => setActiveStage(idx)}
              className={`p-4 border transition-all cursor-pointer relative overflow-hidden ${
                isActive
                  ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-md"
                  : "border-border bg-card hover:border-primary/40"
              }`}
            >
              {isActive && (
                <div className="absolute top-0 left-0 right-0 h-1 bg-primary animate-pulse" />
              )}
              <div className="flex items-start justify-between mb-3">
                <div className={`p-2 rounded-lg ${isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'}`}>
                  <Icon className="size-5" />
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-[10px] text-muted-foreground font-mono">Stage 0{idx + 1}</span>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-muted text-muted-foreground">
                    {stage.badge}
                  </span>
                </div>
              </div>

              <h3 className="font-bold text-sm tracking-tight">{stage.title}</h3>
              <p className="text-xs text-primary font-medium mt-0.5">{stage.subtitle}</p>
              <p className="text-xs text-muted-foreground mt-2 line-clamp-2 leading-relaxed">
                {stage.desc}
              </p>

              <div className="mt-3 pt-3 border-t border-border/60 flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">Frame Output:</span>
                <span className="font-mono text-xs font-semibold text-foreground truncate max-w-40">
                  {stage.frame}
                </span>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Architecture Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4 bg-card border-border">
          <h3 className="text-sm font-bold flex items-center gap-2 mb-2 text-foreground">
            <ShieldAlert className="size-4 text-amber-500" />
            Smart Interruption Handling
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            When user turn detection triggers, an <code className="text-foreground font-mono">InterruptionFrame</code> is 
            broadcast upstream and downstream. Active TTS audio queues are instantly flushed without blocking processor loops.
            Uninterruptible frames (such as <code className="text-foreground font-mono">EndFrame</code>) remain safely protected.
          </p>
        </Card>

        <Card className="p-4 bg-card border-border">
          <h3 className="text-sm font-bold flex items-center gap-2 mb-2 text-foreground">
            <Activity className="size-4 text-emerald-500" />
            Zero-Delay Asynchronous Workers
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Pipecat&apos;s <code className="text-foreground font-mono">BaseWorker</code> and <code className="text-foreground font-mono">WorkerRunner</code> coordinate
            distributed or local workers over a pub/sub bus. Heavy tasks like vision inference or database sync run silently in parallel background tasks.
          </p>
        </Card>
      </div>
    </div>
  );
};
