import React, { useRef, useEffect, useState } from "react";
import { Mic, MicOff, Square, Sparkles, AlertCircle, Radio, CornerDownLeft, Volume2 } from "lucide-react";
import { VoiceOrbProps, VoiceOrbState } from "./types";
import { VoiceOrbRenderer } from "./VoiceOrbRenderer";
import { useVoiceVisualizer } from "./useVoiceVisualizer";

export const VoiceOrb: React.FC<VoiceOrbProps> = ({
  state: controlledState,
  onStateChange,
  onStartVoice,
  onEndVoice,
  onMuteToggle,
  onInterrupt,
  activeTranscript,
  lastSpeakerText,
  voiceName = "ElevenLabs Turbo v2.5",
  errorMessage: propError,
  className = "",
  externalAudioElement,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<VoiceOrbRenderer | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [isStarting, setIsStarting] = useState(false);

  // Hook handles mic stream, audio analysis, VAD, state transitions
  const {
    state: hookState,
    setState: setHookState,
    isMuted,
    toggleMute,
    errorMessage: hookError,
    startSession,
    endSession,
    triggerInterrupt,
    getMetrics,
  } = useVoiceVisualizer({
    initialState: controlledState || "idle",
    onStateChange,
    onStartVoice,
    onEndVoice,
    onInterrupt,
    externalAudioElement,
  });

  const activeState: VoiceOrbState = controlledState !== undefined ? controlledState : hookState;
  const activeError = propError || hookError;

  // Initialize Canvas Renderer
  useEffect(() => {
    if (!canvasRef.current) return;

    try {
      const renderer = new VoiceOrbRenderer(canvasRef.current);
      rendererRef.current = renderer;
      renderer.start();

      const handleResize = () => {
        renderer.resize();
      };
      window.addEventListener("resize", handleResize);

      return () => {
        window.removeEventListener("resize", handleResize);
        renderer.destroy();
        rendererRef.current = null;
      };
    } catch (e) {
      console.error("Failed to initialize VoiceOrbRenderer", e);
    }
  }, []);

  // Update renderer state when activeState changes
  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.setState(activeState);
    }
  }, [activeState]);

  // Feed real-time audio metrics directly to the Canvas renderer at 60 FPS
  useEffect(() => {
    let animId: number;

    const pumpMetrics = () => {
      if (rendererRef.current) {
        const metrics = getMetrics();
        rendererRef.current.setMetrics(metrics);
      }
      animId = requestAnimationFrame(pumpMetrics);
    };

    animId = requestAnimationFrame(pumpMetrics);
    return () => cancelAnimationFrame(animId);
  }, [getMetrics]);

  const handleStart = async () => {
    setIsStarting(true);
    try {
      await startSession();
    } finally {
      setIsStarting(false);
    }
  };

  const handleEnd = () => {
    endSession();
  };

  const handleMuteClick = () => {
    toggleMute();
    onMuteToggle?.(!isMuted);
  };

  const handleInterruptClick = () => {
    triggerInterrupt();
  };

  // State label & color mapping
  const stateMeta: Record<VoiceOrbState, { label: string; badgeClass: string; dotClass: string }> = {
    idle: {
      label: "Ready to Speak",
      badgeClass: "bg-[#171820] text-[#A4A3B2] border-[#292B3A]",
      dotClass: "bg-[#A4A3B2]",
    },
    listening: {
      label: "Listening",
      badgeClass: "bg-[#24D8ED]/10 text-[#24D8ED] border-[#24D8ED]/30",
      dotClass: "bg-[#24D8ED] animate-pulse",
    },
    user_speaking: {
      label: "User Speaking",
      badgeClass: "bg-[#20E99A]/10 text-[#20E99A] border-[#20E99A]/30",
      dotClass: "bg-[#20E99A] animate-ping",
    },
    thinking: {
      label: "Thinking",
      badgeClass: "bg-[#845CFF]/15 text-[#845CFF] border-[#845CFF]/30",
      dotClass: "bg-[#845CFF] animate-spin",
    },
    assistant_speaking: {
      label: "Speaking",
      badgeClass: "bg-[#7047FF]/15 text-[#845CFF] border-[#7047FF]/30",
      dotClass: "bg-[#7047FF] animate-bounce",
    },
    error: {
      label: "Audio Disconnected",
      badgeClass: "bg-[#FF6269]/10 text-[#FF6269] border-[#FF6269]/30",
      dotClass: "bg-[#FF6269]",
    },
  };

  const currentMeta = stateMeta[activeState] || stateMeta.idle;
  const isSessionActive = activeState !== "idle";

  return (
    <div
      ref={containerRef}
      role="region"
      aria-label="Pyvex Voice Orb Visualizer"
      className={`relative flex flex-col items-center justify-center transition-all duration-500 w-full select-none ${className}`}
    >
      {/* 1. INITIAL MINIMAL STATE: [ Start Voice ] Button */}
      {!isSessionActive && (
        <div className="flex flex-col items-center gap-4 py-8 animate-fade-in">
          <div className="relative group">
            {/* Ambient Backlight Glow Ring */}
            <div className="absolute -inset-1.5 bg-gradient-to-r from-[#7047FF] via-[#24D8ED] to-[#845CFF] rounded-full blur-md opacity-40 group-hover:opacity-75 transition duration-500 animate-pulse" />

            <button
              type="button"
              onClick={handleStart}
              disabled={isStarting}
              aria-label="Start Voice Session"
              className="relative size-32 sm:size-36 rounded-full bg-[#0D0F13] border border-[#7047FF]/50 p-2 flex flex-col items-center justify-center gap-2 shadow-2xl hover:scale-105 active:scale-95 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#845CFF] focus:ring-offset-2 focus:ring-offset-[#08090B]"
            >
              {/* Inner animated concentric wave ring */}
              <div className="size-20 rounded-full bg-gradient-to-tr from-[#7047FF]/20 to-[#24D8ED]/10 border border-[#7047FF]/30 flex items-center justify-center">
                <Mic className="size-8 text-[#845CFF] group-hover:text-[#24D8ED] transition-colors" />
              </div>
              <span className="text-xs font-bold text-[#F4F2F8] tracking-wider uppercase">
                {isStarting ? "Connecting..." : "Start Voice"}
              </span>
            </button>
          </div>

          <div className="text-center space-y-1">
            <p className="text-xs text-[#A4A3B2] font-medium flex items-center justify-center gap-1.5">
              <Radio className="size-3 text-[#20E99A]" />
              Tap to activate audio-reactive spiral session
            </p>
            <p className="text-[11px] text-[#666879] font-mono">
              Pyvex Voice Engine &bull; {voiceName}
            </p>
          </div>
        </div>
      )}

      {/* 2. ACTIVE SESSION STATE: Living 3D Spiral Voice Orb */}
      {isSessionActive && (
        <div className="w-full flex flex-col items-center animate-fade-in space-y-3">
          {/* Status Header Badge */}
          <div className="flex items-center gap-2.5">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border backdrop-blur-md transition-all duration-300 ${currentMeta.badgeClass}`}
            >
              <span className={`size-2 rounded-full ${currentMeta.dotClass}`} />
              {currentMeta.label}
            </span>

            {isMuted && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-[#FF6269]/15 border border-[#FF6269]/30 text-[#FF6269] font-semibold flex items-center gap-1">
                <MicOff className="size-3" />
                Mic Muted
              </span>
            )}
          </div>

          {/* Interactive 3D Canvas Orb Canvas Container */}
          <div className="relative flex items-center justify-center w-full max-w-[420px] aspect-square">
            {/* Subtle Ethereal Ambient Radial Background */}
            <div className="absolute inset-8 rounded-full bg-gradient-to-tr from-[#7047FF]/15 via-[#24D8ED]/10 to-[#845CFF]/15 blur-2xl pointer-events-none" />

            <canvas
              ref={canvasRef}
              className="w-full h-full cursor-pointer z-10"
              style={{ width: "100%", height: "100%", touchAction: "none" }}
              title="Pyvex Voice Orb - Click to cycle audio state"
              onClick={() => {
                // Interactive cycle for developer inspection & testing
                if (activeState === "listening") setHookState("user_speaking");
                else if (activeState === "user_speaking") setHookState("thinking");
                else if (activeState === "thinking") setHookState("assistant_speaking");
                else if (activeState === "assistant_speaking") setHookState("listening");
              }}
            />

            {/* In-canvas Barge-in shortcut beacon if assistant is speaking */}
            {activeState === "assistant_speaking" && (
              <button
                type="button"
                onClick={handleInterruptClick}
                className="absolute bottom-4 z-20 px-3 py-1 rounded-full bg-[#12141A]/90 hover:bg-[#1C1D25] border border-[#7047FF]/50 text-[11px] font-medium text-[#24D8ED] shadow-lg flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 animate-pulse"
                title="Interrupt assistant speech immediately"
              >
                <CornerDownLeft className="size-3 text-[#24D8ED]" />
                Interrupt Assistant
              </button>
            )}
          </div>

          {/* Error Banner if applicable */}
          {activeError && (
            <div className="max-w-md w-full px-3 py-2 rounded-lg bg-[#FF6269]/10 border border-[#FF6269]/30 text-[#FF6269] text-xs flex items-center gap-2">
              <AlertCircle className="size-4 shrink-0" />
              <span>{activeError}</span>
            </div>
          )}

          {/* Transcript / Utterance Subtitle Bar */}
          <div className="max-w-lg w-full min-h-11 px-4 py-2 rounded-xl bg-[#0D0F13]/80 border border-[#292B3A] backdrop-blur-md flex items-center justify-center text-center">
            {activeTranscript ? (
              <p className="text-xs text-[#F4F2F8] font-medium animate-fade-in line-clamp-2">
                &ldquo;{activeTranscript}&rdquo;
              </p>
            ) : lastSpeakerText ? (
              <p className="text-xs text-[#A4A3B2] line-clamp-2">
                &ldquo;{lastSpeakerText}&rdquo;
              </p>
            ) : (
              <p className="text-[11px] text-[#666879] italic font-mono flex items-center gap-1.5">
                <Sparkles className="size-3 text-[#7047FF]" />
                Speak naturally &bull; Audio-reactive spiral responds in real-time
              </p>
            )}
          </div>

          {/* Minimal Floating Session Controls */}
          <div className="flex items-center gap-3 pt-1">
            {/* Mute Button */}
            <button
              type="button"
              onClick={handleMuteClick}
              aria-label={isMuted ? "Unmute microphone" : "Mute microphone"}
              className={`size-11 rounded-full border flex items-center justify-center transition-all ${
                isMuted
                  ? "bg-[#FF6269]/20 border-[#FF6269]/50 text-[#FF6269]"
                  : "bg-[#171820] border-[#292B3A] text-[#A4A3B2] hover:text-[#F4F2F8] hover:border-[#7047FF]/50"
              }`}
              title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
            >
              {isMuted ? <MicOff className="size-4" /> : <Mic className="size-4" />}
            </button>

            {/* End Voice Button */}
            <button
              type="button"
              onClick={handleEnd}
              aria-label="End Voice Session"
              className="px-5 h-11 rounded-full bg-[#FF6269]/15 hover:bg-[#FF6269]/25 border border-[#FF6269]/30 text-[#FF6269] font-semibold text-xs flex items-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-black/40"
              title="End Voice Session"
            >
              <Square className="size-3.5 fill-[#FF6269]" />
              End Voice
            </button>

            {/* Quick State Simulation Menu (For testing different states cleanly) */}
            <div className="flex items-center gap-1 bg-[#12141A] p-1 rounded-full border border-[#292B3A] text-[10px]">
              <button
                type="button"
                onClick={() => setHookState("listening")}
                className={`px-2 py-1 rounded-full font-mono transition-colors ${
                  activeState === "listening" ? "bg-[#24D8ED]/20 text-[#24D8ED] font-bold" : "text-[#666879] hover:text-[#A4A3B2]"
                }`}
                title="Set to Listening mode"
              >
                Listen
              </button>
              <button
                type="button"
                onClick={() => setHookState("thinking")}
                className={`px-2 py-1 rounded-full font-mono transition-colors ${
                  activeState === "thinking" ? "bg-[#845CFF]/20 text-[#845CFF] font-bold" : "text-[#666879] hover:text-[#A4A3B2]"
                }`}
                title="Set to Thinking mode"
              >
                Think
              </button>
              <button
                type="button"
                onClick={() => setHookState("assistant_speaking")}
                className={`px-2 py-1 rounded-full font-mono transition-colors ${
                  activeState === "assistant_speaking" ? "bg-[#7047FF]/20 text-[#845CFF] font-bold" : "text-[#666879] hover:text-[#A4A3B2]"
                }`}
                title="Set to Assistant Speaking mode"
              >
                Speak
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
