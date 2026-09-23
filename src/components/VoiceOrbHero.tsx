import React, { useState, useRef } from "react";
import { 
  Bot, 
  Sparkles, 
  Volume2, 
  VolumeX, 
  Radio, 
  Zap, 
  Send, 
  CornerDownLeft,
  AudioWaveform
} from "lucide-react";
import { VoiceOrb, type VoiceOrbState } from "@/components/VoiceOrb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ELEVENLABS_FEMALE_VOICES, DEFAULT_ELEVENLABS_VOICE } from "@/config";

interface VoiceOrbHeroProps {
  activeBotId?: string;
}

export const VoiceOrbHero: React.FC<VoiceOrbHeroProps> = ({
  activeBotId = "voice-assistant",
}) => {
  const [selectedVoiceId, setSelectedVoiceId] = useState(DEFAULT_ELEVENLABS_VOICE.id);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isBotSpeaking, setIsBotSpeaking] = useState(false);
  const [orbSessionActive, setOrbSessionActive] = useState(false);
  const [orbState, setOrbState] = useState<VoiceOrbState>("idle");
  const [currentUtterance, setCurrentUtterance] = useState<string>(
    "Ready for speech session. Tap Start Voice to awaken the neural audio-reactive spiral."
  );
  const [inputText, setInputText] = useState("");
  const [latencyMetrics, setLatencyMetrics] = useState({ ttfb: 65, turnLatency: 178 });

  const activeAudioRef = useRef<HTMLAudioElement | null>(null);

  const activeVoice =
    ELEVENLABS_FEMALE_VOICES.find((v) => v.id === selectedVoiceId) || DEFAULT_ELEVENLABS_VOICE;

  const speakText = async (text: string) => {
    // Stop any existing playback
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current = null;
    }
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    try {
      const response = await fetch("/api/tts/elevenlabs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          voiceId: selectedVoiceId,
        }),
      });

      const contentType = response.headers.get("content-type") || "";

      if (response.ok && contentType.includes("audio/mpeg")) {
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        activeAudioRef.current = audio;

        audio.onplay = () => setIsBotSpeaking(true);
        audio.onended = () => {
          setIsBotSpeaking(false);
          URL.revokeObjectURL(audioUrl);
        };
        audio.onerror = () => {
          setIsBotSpeaking(false);
          URL.revokeObjectURL(audioUrl);
        };

        await audio.play();
        return;
      }
    } catch {
      // Fallback
    }

    // Browser Speech Synthesis Fallback
    if ("speechSynthesis" in window) {
      try {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 1.08;
        utterance.onstart = () => setIsBotSpeaking(true);
        utterance.onend = () => setIsBotSpeaking(false);
        utterance.onerror = () => setIsBotSpeaking(false);
        window.speechSynthesis.speak(utterance);
      } catch {
        setIsBotSpeaking(false);
      }
    } else {
      setIsBotSpeaking(false);
    }
  };

  const handleSendPrompt = async (textToSend: string) => {
    const text = textToSend.trim();
    if (!text || isProcessing) return;

    setInputText("");
    setIsProcessing(true);
    setCurrentUtterance(`Evaluating: "${text}"...`);

    try {
      const res = await fetch("/api/simulate/turn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: text,
          botId: activeBotId,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setCurrentUtterance(data.text);
        if (data.metrics) {
          setLatencyMetrics({
            ttfb: data.metrics.ttfb || 62,
            turnLatency: data.metrics.latency || 180,
          });
        }
        await speakText(data.text);
      } else {
        throw new Error("Turn failed");
      }
    } catch {
      const fallbackReply = `I'm streaming real-time audio through Pyvex Voice with ElevenLabs neural voice synthesis.`;
      setCurrentUtterance(fallbackReply);
      await speakText(fallbackReply);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleInterrupt = () => {
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current = null;
    }
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsBotSpeaking(false);
    setOrbState("listening");
    setCurrentUtterance("Interrupted. Listening for your turn...");
  };

  // Compute active derived state for VoiceOrb
  const computedState: VoiceOrbState = isProcessing
    ? "thinking"
    : isBotSpeaking
    ? "assistant_speaking"
    : orbSessionActive
    ? orbState
    : "idle";

  return (
    <div className="h-full flex flex-col items-center justify-between p-4 md:p-6 overflow-hidden max-w-4xl mx-auto w-full select-none">
      {/* Top Telemetry & Controls */}
      <div className="w-full flex flex-wrap items-center justify-between gap-3 bg-[#0D0F13]/90 border border-[#292B3A] rounded-xl px-4 py-2.5 backdrop-blur-xl shrink-0 shadow-lg shadow-black/40">
        <div className="flex items-center gap-2.5">
          <div className="size-8 rounded-lg bg-gradient-to-br from-[#7047FF] to-[#35246E] flex items-center justify-center text-white border border-[#7047FF]/40 shadow-[0_0_12px_rgba(112,71,255,0.4)]">
            <Radio className="size-4 text-[#20E99A]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs text-[#F4F2F8]">Pyvex Voice Orb</span>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-[#7047FF]/15 border border-[#7047FF]/30 text-[#845CFF]">
                60 FPS Web Audio
              </span>
            </div>
            <p className="text-[11px] text-[#A4A3B2]">
              Living Archimedean Spiral &bull; Multi-Band Frequency Displacement
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-[#666879] text-[11px]">Voice:</span>
            <Select value={selectedVoiceId} onValueChange={setSelectedVoiceId}>
              <SelectTrigger size="sm" className="h-7 text-xs min-w-36 bg-[#171820] border-[#292B3A] text-[#F4F2F8]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="start" className="bg-[#171820] border-[#292B3A] text-[#F4F2F8]">
                {ELEVENLABS_FEMALE_VOICES.map((v) => (
                  <SelectItem key={v.id} value={v.id} className="text-xs">
                    {v.name} ({v.gender})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-3 font-mono text-[11px] border-l border-[#292B3A] pl-3">
            <div>
              <span className="text-[#666879] block text-[9px] uppercase">TTFB</span>
              <span className="text-[#20E99A] font-bold">{latencyMetrics.ttfb}ms</span>
            </div>
            <div>
              <span className="text-[#666879] block text-[9px] uppercase">Latency</span>
              <span className="text-[#24D8ED] font-bold">{latencyMetrics.turnLatency}ms</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Centered Voice Orb Hero Stage */}
      <div className="flex-1 w-full flex flex-col items-center justify-center my-auto py-2">
        <VoiceOrb
          state={computedState}
          onStateChange={(st) => setOrbState(st)}
          onStartVoice={async () => {
            setOrbSessionActive(true);
            setOrbState("listening");
            setCurrentUtterance("Voice session active. Speak or select a turn below.");
          }}
          onEndVoice={() => {
            setOrbSessionActive(false);
            setOrbState("idle");
            if (activeAudioRef.current) {
              activeAudioRef.current.pause();
              activeAudioRef.current = null;
            }
            if ("speechSynthesis" in window) {
              window.speechSynthesis.cancel();
            }
            setIsBotSpeaking(false);
            setCurrentUtterance("Voice session ended. Tap Start Voice to resume.");
          }}
          onInterrupt={handleInterrupt}
          activeTranscript={currentUtterance}
          voiceName={activeVoice.name}
          externalAudioElement={activeAudioRef.current}
        />
      </div>

      {/* Bottom Conversational Turn Suggestions & Input */}
      <div className="w-full space-y-2.5 shrink-0">
        <div className="flex items-center gap-2 overflow-x-auto text-xs py-1 scrollbar-none justify-center">
          <span className="text-[10px] text-[#666879] whitespace-nowrap font-mono uppercase">Prompts:</span>
          <button
            type="button"
            onClick={() => handleSendPrompt("Explain how the spiral audio visualizer reacts to bass and mids frequencies.")}
            className="px-2.5 py-1 rounded-full bg-[#12141A] border border-[#292B3A] hover:border-[#7047FF]/50 text-[#A4A3B2] hover:text-[#F4F2F8] whitespace-nowrap transition-colors text-xs"
          >
            How does spiral audio reactivity work?
          </button>
          <button
            type="button"
            onClick={() => handleSendPrompt("Demonstrate conversational barge-in while you are speaking.")}
            className="px-2.5 py-1 rounded-full bg-[#12141A] border border-[#292B3A] hover:border-[#7047FF]/50 text-[#A4A3B2] hover:text-[#F4F2F8] whitespace-nowrap transition-colors text-xs"
          >
            Demonstrate barge-in
          </button>
          <button
            type="button"
            onClick={() => handleSendPrompt("What makes Pyvex Voice low-latency and natural?")}
            className="px-2.5 py-1 rounded-full bg-[#12141A] border border-[#292B3A] hover:border-[#7047FF]/50 text-[#A4A3B2] hover:text-[#F4F2F8] whitespace-nowrap transition-colors text-xs"
          >
            Low latency details
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (inputText.trim()) {
              handleSendPrompt(inputText);
            }
          }}
          className="flex items-center gap-2 max-w-xl mx-auto w-full"
        >
          <Input
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={`Say or type something to ${activeVoice.name}...`}
            className="flex-1 text-sm bg-[#12141A] border-[#292B3A] text-[#F4F2F8] placeholder:text-[#666879] focus-visible:border-[#7047FF] focus-visible:ring-1 focus-visible:ring-[#7047FF]"
            disabled={isProcessing}
          />
          <Button
            type="submit"
            size="sm"
            disabled={isProcessing || !inputText.trim()}
            className="gap-1.5 bg-[#7047FF] hover:bg-[#845CFF] text-white px-4 font-semibold shadow-[0_0_15px_rgba(112,71,255,0.4)]"
          >
            <Send className="size-3.5" />
            Send
          </Button>
        </form>
      </div>
    </div>
  );
};
