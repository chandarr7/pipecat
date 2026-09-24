import React, { useState, useRef, useEffect, useCallback } from "react";
import { 
  Send, 
  Volume2, 
  VolumeX, 
  Bot, 
  User, 
  Zap, 
  Sparkles, 
  Play, 
  AudioWaveform, 
  CheckCircle2, 
  Settings2,
  Mic,
  MicOff,
  Square,
  Radio,
  Layers,
  Activity
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ELEVENLABS_VOICES,
  DEFAULT_ELEVENLABS_VOICE,
  ELEVENLABS_MODELS, 
  DEFAULT_ELEVENLABS_MODEL, 
  getBotTtsConfig, 
  getElevenLabsApiKey, 
  type ElevenLabsVoice, 
  type TTSProviderType 
} from "@/config";
import { VoiceOrb, type VoiceState } from "./VoiceOrb";

interface ChatMessage {
  id: string;
  role: "user" | "bot";
  text: string;
  timestamp: string;
  voiceInfo?: {
    name: string;
    provider: string;
  };
  metrics?: {
    ttfb: number;
    latency: number;
  };
}

interface FrameEvent {
  id: string;
  timestamp: string;
  type: string;
  direction: string;
  summary: string;
}

interface ElevenLabsAccountInfo {
  hasApiKey: boolean;
  keyMask?: string;
  userName?: string;
  tier?: string;
  status?: string;
  characterCountUsed?: number;
  characterLimit?: number;
  creditsRemaining?: number;
  nextResetDate?: string | null;
  configuredVoice?: {
    id: string;
    name: string;
    category: string;
    isLibraryVoice: boolean;
  };
}

interface InteractiveChatSimulatorProps {
  activeBotId?: string;
  onFrameEvents?: (events: FrameEvent[]) => void;
}

export const InteractiveChatSimulator: React.FC<InteractiveChatSimulatorProps> = ({
  activeBotId = "voice-assistant",
  onFrameEvents,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "msg-0",
      role: "bot",
      text: "Welcome to Pyvex Voice by Tilted Studio. Real-time neural voice pipeline active with ultra-low latency. Speak or type to begin conversational turn orchestration.",
      timestamp: new Date().toLocaleTimeString(),
      voiceInfo: {
        name: "Boo / Rachel",
        provider: "ElevenLabs Neural TTS",
      },
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isBotSpeaking, setIsBotSpeaking] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);

  // ElevenLabs environment API key from Vite
  const viteElevenLabsApiKey =
    (import.meta.env.VITE_ELEVENLABS_API_KEY as string | undefined) ||
    getElevenLabsApiKey() ||
    "";

  const [activeTtsProvider, setActiveTtsProvider] = useState<TTSProviderType>("elevenlabs");
  const [selectedModelId, setSelectedModelId] = useState<string>(DEFAULT_ELEVENLABS_MODEL);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>(DEFAULT_ELEVENLABS_VOICE.id);
  const [currentMetrics, setCurrentMetrics] = useState({ ttfb: 72, latency: 185, tokensPerSec: 54 });
  const [simulatedFrequencies, setSimulatedFrequencies] = useState<number[]>(new Array(16).fill(0));
  const [liveEvents, setLiveEvents] = useState<FrameEvent[]>([]);
  const [isAuditioning, setIsAuditioning] = useState(false);
  const [ttsConfig, setTtsConfig] = useState<{
    hasApiKey: boolean;
    configuredVoiceId?: string;
    model?: string;
    isViteKeyConfigured?: boolean;
  }>({ hasApiKey: false });
  const [accountInfo, setAccountInfo] = useState<ElevenLabsAccountInfo | null>(null);
  const [showAccountDetails, setShowAccountDetails] = useState(false);
  const [customVoice, setCustomVoice] = useState<ElevenLabsVoice | null>(null);
  const [apiNotice, setApiNotice] = useState<string | null>(null);
  const [allowBrowserFallback, setAllowBrowserFallback] = useState(false);
  const [lastAudioSource, setLastAudioSource] = useState<"elevenlabs" | "browser_fallback" | null>(null);
  const [isTestingElevenLabs, setIsTestingElevenLabs] = useState(false);
  const [elevenLabsTestResult, setElevenLabsTestResult] = useState<{
    status: "success" | "error";
    message: string;
  } | null>(null);

  // Real-time microphone & Voice Orb reactive state
  const [isMicListening, setIsMicListening] = useState(false);
  const [micAudioLevel, setMicAudioLevel] = useState(0);
  const [micFrequencyData, setMicFrequencyData] = useState<number[]>(new Array(32).fill(0));
  const [viewMode, setViewMode] = useState<"orb" | "split">("orb");
  const [activeSubtitle, setActiveSubtitle] = useState<string>(
    "Ready to converse. Tap the PyVex Voice Orb or activate your microphone."
  );

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micMediaStreamRef = useRef<MediaStream | null>(null);
  const micAnimRef = useRef<number | null>(null);
  const recognitionRef = useRef<any>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);

  // Synchronize TTS settings whenever active bot changes
  useEffect(() => {
    const botConfig = getBotTtsConfig(activeBotId);
    if (botConfig.provider) {
      setActiveTtsProvider(botConfig.provider);
    }
    if (botConfig.voiceId) {
      setSelectedVoiceId(botConfig.voiceId);
    }
    if (botConfig.model) {
      setSelectedModelId(botConfig.model);
    }
  }, [activeBotId]);

  useEffect(() => {
    const headers: Record<string, string> = {};
    if (viteElevenLabsApiKey) {
      headers["xi-api-key"] = viteElevenLabsApiKey;
    }

    fetch("/api/tts/config", { headers })
      .then((res) => res.json())
      .then((data) => {
        setTtsConfig(data);
      })
      .catch(() => {});

    fetch("/api/tts/account", { headers })
      .then((res) => res.json())
      .then((data: ElevenLabsAccountInfo) => {
        if (data && data.hasApiKey) {
          setAccountInfo(data);
          if (data.configuredVoice) {
            const custom: ElevenLabsVoice = {
              id: data.configuredVoice.id,
              name: data.configuredVoice.name,
              gender: "female",
              description: `${data.configuredVoice.category === "premade" ? "Premade" : "Library"} Voice (${data.configuredVoice.id})`,
            };
            setCustomVoice(custom);
            setSelectedVoiceId(data.configuredVoice.id);
          }
        }
      })
      .catch(() => {});
  }, [viteElevenLabsApiKey]);

  const availableVoices = customVoice
    ? [customVoice, ...ELEVENLABS_VOICES]
    : ELEVENLABS_VOICES;

  const activeVoice: ElevenLabsVoice =
    availableVoices.find((v) => v.id === selectedVoiceId) || DEFAULT_ELEVENLABS_VOICE;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Audio wave animation when bot is speaking
  useEffect(() => {
    if (isBotSpeaking) {
      const updateFrequencies = () => {
        setSimulatedFrequencies(
          Array.from({ length: 32 }, () => Math.random() * 0.85 + 0.15)
        );
        animationFrameRef.current = requestAnimationFrame(updateFrequencies);
      };
      animationFrameRef.current = requestAnimationFrame(updateFrequencies);
    } else {
      setSimulatedFrequencies(new Array(32).fill(0.05));
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isBotSpeaking]);

  const stopMicListening = useCallback(() => {
    setIsMicListening(false);
    setMicAudioLevel(0);
    setMicFrequencyData(new Array(32).fill(0));

    if (micAnimRef.current) {
      cancelAnimationFrame(micAnimRef.current);
      micAnimRef.current = null;
    }
    if (micMediaStreamRef.current) {
      micMediaStreamRef.current.getTracks().forEach((track) => track.stop());
      micMediaStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }
  }, []);

  const startMicListening = useCallback(async () => {
    // If bot was speaking, interrupt it when user starts listening
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current = null;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsBotSpeaking(false);

    try {
      if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        setIsMicListening(true);
        setActiveSubtitle("Simulated microphone listening active • Speak or send a turn");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micMediaStreamRef.current = stream;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      setIsMicListening(true);
      setActiveSubtitle("Listening... Speak naturally to PyVex");

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateMicData = () => {
        analyser.getByteFrequencyData(dataArray);

        let sum = 0;
        const normalized: number[] = [];
        for (let i = 0; i < dataArray.length; i++) {
          const val = dataArray[i] / 255;
          normalized.push(val);
          sum += val;
        }

        const avg = sum / dataArray.length;
        setMicAudioLevel(avg);
        setMicFrequencyData(normalized);

        micAnimRef.current = requestAnimationFrame(updateMicData);
      };

      micAnimRef.current = requestAnimationFrame(updateMicData);

      // Web Speech recognition integration if supported
      const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRec) {
        const recognition = new SpeechRec();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-US";

        recognition.onresult = (event: any) => {
          let interimTranscript = "";
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              const finalTranscript = event.results[i][0].transcript.trim();
              if (finalTranscript) {
                setInputText(finalTranscript);
                setActiveSubtitle(`User: "${finalTranscript}"`);
              }
            } else {
              interimTranscript += event.results[i][0].transcript;
            }
          }
          if (interimTranscript) {
            setInputText(interimTranscript);
            setActiveSubtitle(`Hearing: "${interimTranscript}..."`);
          }
        };

        recognition.onerror = () => {};
        recognition.onend = () => {
          if (isMicListening) {
            try {
              recognition.start();
            } catch {}
          }
        };

        try {
          recognition.start();
          recognitionRef.current = recognition;
        } catch {}
      }
    } catch (err) {
      console.warn("Microphone access prompt dismissed or failed, using simulated VAD:", err);
      setIsMicListening(true);
      setActiveSubtitle("Microphone simulated active • Detecting speech harmonics");

      let t = 0;
      const simLoop = () => {
        t += 0.05;
        const level = Math.sin(t) * 0.35 + 0.35;
        setMicAudioLevel(level);
        setMicFrequencyData(Array.from({ length: 32 }, () => Math.random() * level));
        micAnimRef.current = requestAnimationFrame(simLoop);
      };
      micAnimRef.current = requestAnimationFrame(simLoop);
    }
  }, [isMicListening]);

  const toggleMic = () => {
    if (isMicListening) {
      stopMicListening();
      setActiveSubtitle("Microphone paused. Ready for next turn.");
    } else {
      startMicListening();
    }
  };

  const handleInterrupt = () => {
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current = null;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsBotSpeaking(false);

    const interruptEvent: FrameEvent = {
      id: `evt-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      type: "InterruptionFrame",
      direction: "upstream/downstream",
      summary: "User turn start triggered VAD interruption broadcast",
    };

    setLiveEvents((prev) => [interruptEvent, ...prev.slice(0, 4)]);
    onFrameEvents?.([interruptEvent]);
    setActiveSubtitle("Agent speech interrupted by user • Pipeline cleared");
  };

  useEffect(() => {
    return () => {
      stopMicListening();
    };
  }, [stopMicListening]);

  // Derived current voice state
  const voiceState: VoiceState = isBotSpeaking
    ? "speaking"
    : isProcessing
    ? "thinking"
    : isMicListening
    ? "listening"
    : "idle";

  const currentAudioLevel = isBotSpeaking
    ? Math.max(0.35, Math.min(1, Math.random() * 0.6 + 0.35))
    : isMicListening
    ? micAudioLevel
    : isProcessing
    ? 0.25
    : 0.08;

  const currentFrequencies = isBotSpeaking
    ? simulatedFrequencies
    : isMicListening
    ? micFrequencyData
    : isProcessing
    ? simulatedFrequencies.map((f) => f * 0.4)
    : simulatedFrequencies.map((f) => f * 0.1);

  const speakText = async (text: string, voiceOverride?: string) => {
    if (!audioEnabled || typeof window === "undefined") return;

    const voiceToUse = voiceOverride || selectedVoiceId;

    // Stop any ongoing audio
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current = null;
    }
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    // Direct Web Speech synthesis if webspeech provider selected
    if (activeTtsProvider === "webspeech") {
      setLastAudioSource("browser_fallback");
      fallbackWebSpeech(text);
      return;
    }

    try {
      // 1. Attempt server-side ElevenLabs synthesis with VITE_ELEVENLABS_API_KEY
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (viteElevenLabsApiKey) {
        headers["xi-api-key"] = viteElevenLabsApiKey;
      }

      const response = await fetch("/api/tts/elevenlabs", {
        method: "POST",
        headers,
        body: JSON.stringify({
          text,
          voiceId: voiceToUse,
          apiKey: viteElevenLabsApiKey || undefined,
          modelId: selectedModelId,
        }),
      });

      const contentType = response.headers.get("content-type") || "";

      if (response.ok && contentType.includes("audio/mpeg")) {
        setApiNotice(null);
        setLastAudioSource("elevenlabs");
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
          if (allowBrowserFallback) {
            setLastAudioSource("browser_fallback");
            fallbackWebSpeech(text);
          }
        };

        await audio.play();
        return;
      } else {
        try {
          const errData = await response.json();
          if (errData.error) {
            setApiNotice(errData.error);
          }
        } catch {
          // ignore json parse error
        }
      }
    } catch {
      // Server error or network fallback
    }

    if (allowBrowserFallback) {
      setLastAudioSource("browser_fallback");
      fallbackWebSpeech(text);
    } else {
      setIsBotSpeaking(false);
    }
  };

  const handleDirectTestElevenLabs = async () => {
    if (isTestingElevenLabs || isBotSpeaking) return;
    setIsTestingElevenLabs(true);
    setElevenLabsTestResult(null);

    // Stop any ongoing audio
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current = null;
    }
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (viteElevenLabsApiKey) {
        headers["xi-api-key"] = viteElevenLabsApiKey;
      }

      const response = await fetch("/api/tts/elevenlabs", {
        method: "POST",
        headers,
        body: JSON.stringify({
          text: `Hello from ${activeVoice.name}. ElevenLabs real-time neural audio stream is active.`,
          voiceId: selectedVoiceId,
          apiKey: viteElevenLabsApiKey || undefined,
          modelId: selectedModelId,
        }),
      });

      const contentType = response.headers.get("content-type") || "";

      if (response.ok && contentType.includes("audio/mpeg")) {
        setApiNotice(null);
        setLastAudioSource("elevenlabs");
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        activeAudioRef.current = audio;

        audio.onplay = () => setIsBotSpeaking(true);
        audio.onended = () => {
          setIsBotSpeaking(false);
          URL.revokeObjectURL(audioUrl);
        };
        await audio.play();
        setElevenLabsTestResult({
          status: "success",
          message: `Success! Streaming authentic ElevenLabs MP3 audio (${activeVoice.name} • ${selectedModelId})`,
        });
      } else {
        const errData = await response.json();
        const msg = errData.error || "ElevenLabs returned an error";
        setApiNotice(msg);
        setElevenLabsTestResult({
          status: "error",
          message: msg,
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Connection failed";
      setElevenLabsTestResult({
        status: "error",
        message: msg,
      });
    } finally {
      setIsTestingElevenLabs(false);
    }
  };

  const fallbackWebSpeech = (text: string) => {
    if (!("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.08; // Slightly elevated pitch for clean natural female resonance

      const voices = window.speechSynthesis.getVoices();
      // Select best matching natural female English voice
      const preferredFemaleVoice = voices.find(
        (v) =>
          v.lang.startsWith("en") &&
          (v.name.toLowerCase().includes("female") ||
            v.name.toLowerCase().includes("samantha") ||
            v.name.toLowerCase().includes("zira") ||
            v.name.toLowerCase().includes("victoria") ||
            v.name.toLowerCase().includes("karen") ||
            v.name.toLowerCase().includes("natural") ||
            v.name.toLowerCase().includes("google us english"))
      ) || voices.find((v) => v.lang.startsWith("en"));

      if (preferredFemaleVoice) {
        utterance.voice = preferredFemaleVoice;
      }

      utterance.onstart = () => setIsBotSpeaking(true);
      utterance.onend = () => setIsBotSpeaking(false);
      utterance.onerror = () => setIsBotSpeaking(false);
      window.speechSynthesis.speak(utterance);
    } catch {
      setIsBotSpeaking(false);
    }
  };

  const handleAuditionVoice = async () => {
    if (isAuditioning || isBotSpeaking) return;
    setIsAuditioning(true);
    const sampleText = `Hello, I'm ${activeVoice.name}. This is the default female voice for ElevenLabs text-to-speech in Tilted.`;
    await speakText(sampleText);
    setIsAuditioning(false);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isProcessing) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      text,
      timestamp: new Date().toLocaleTimeString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText("");
    setIsProcessing(true);

    try {
      const response = await fetch("/api/simulate/turn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: text,
          botId: activeBotId,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const botMessage: ChatMessage = {
          id: `bot-${Date.now()}`,
          role: "bot",
          text: data.text,
          timestamp: new Date().toLocaleTimeString(),
          voiceInfo: {
            name: activeVoice.name,
            provider: activeTtsProvider === "elevenlabs"
              ? `ElevenLabs (${selectedModelId === "eleven_turbo_v2_5" ? "Turbo v2.5" : "Neural"})`
              : "Web Speech API",
          },
          metrics: {
            ttfb: data.metrics?.ttfb || 68,
            latency: data.metrics?.latency || 190,
          },
        };

        setMessages((prev) => [...prev, botMessage]);
        if (data.metrics) {
          setCurrentMetrics(data.metrics);
        }
        if (data.events) {
          setLiveEvents(data.events);
          onFrameEvents?.(data.events);
        }

        speakText(data.text);
      } else {
        throw new Error("Pipeline API error");
      }
    } catch {
      const fallbackText = `I processed your request "${text}" through the Tilted audio pipeline with ElevenLabs TTS.`;
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-${Date.now()}`,
          role: "bot",
          text: fallbackText,
          timestamp: new Date().toLocaleTimeString(),
          voiceInfo: {
            name: activeVoice.name,
            provider: activeTtsProvider === "elevenlabs"
              ? `ElevenLabs (${selectedModelId === "eleven_turbo_v2_5" ? "Turbo v2.5" : "Neural"})`
              : "Web Speech API",
          },
        },
      ]);
      speakText(fallbackText);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div id="interactive-chat-simulator" className="h-full flex flex-col p-4 md:p-6 overflow-hidden max-w-5xl mx-auto w-full gap-4">
      {/* Top Banner: ElevenLabs TTS & Voice Selection */}
      <div className="bg-[#0D0F13]/90 border border-[#292B3A] rounded-xl p-4 shadow-lg shadow-black/40 backdrop-blur-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative">
            <div className={`size-11 rounded-xl flex items-center justify-center transition-all ${
              isBotSpeaking 
                ? "bg-gradient-to-br from-[#7047FF] to-[#35246E] text-white animate-vad-pulse shadow-[0_0_20px_rgba(112,71,255,0.6)]" 
                : "bg-[#171820] text-[#A4A3B2] border border-[#292B3A]"
            }`}>
              <Bot className="size-5" />
            </div>
            {isBotSpeaking && (
              <span className="absolute -top-1 -right-1 size-3 bg-[#20E99A] rounded-full ring-2 ring-[#0D0F13] animate-pulse" />
            )}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-bold tracking-tight text-[#F4F2F8]">Pyvex Voice Stream</h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#7047FF]/15 border border-[#7047FF]/30 text-[#845CFF] font-semibold flex items-center gap-1">
                <Sparkles className="size-2.5" />
                ElevenLabs {selectedModelId === "eleven_turbo_v2_5" ? "Turbo v2.5" : "Neural TTS"}
              </span>
              {viteElevenLabsApiKey ? (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#20E99A]/15 border border-[#20E99A]/30 text-[#20E99A] font-semibold flex items-center gap-1" title="Active VITE_ELEVENLABS_API_KEY from environment">
                  <span className="size-1.5 rounded-full bg-[#20E99A] animate-pulse" />
                  VITE Key Active
                </span>
              ) : ttsConfig.hasApiKey ? (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#20E99A]/10 border border-[#20E99A]/30 text-[#20E99A] font-medium flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-[#20E99A] animate-pulse" />
                  Live Stream
                </span>
              ) : (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#F5BD24]/10 border border-[#F5BD24]/30 text-[#F5BD24]">
                  Key Missing
                </span>
              )}
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#24D8ED]/10 border border-[#24D8ED]/30 text-[#24D8ED]">
                16kHz PCM
              </span>
            </div>
            <p className="text-xs text-[#A4A3B2] mt-0.5">
              {isBotSpeaking
                ? `Streaming neural audio via ElevenLabs (${activeVoice.name} • ${selectedModelId})...`
                : isProcessing
                ? "Orchestration pipeline evaluating turn..."
                : `Listening for voice/text turn • Provider: ${activeTtsProvider === "elevenlabs" ? "ElevenLabs Neural TTS" : "Web Speech"}`}
            </p>
          </div>
        </div>

        {/* Live Audio Visualizer Bars */}
        <div className="flex items-center gap-1.5 h-9 px-3.5 py-1 bg-[#12141A] rounded-lg border border-[#292B3A]">
          {simulatedFrequencies.map((freq, idx) => (
            <div
              key={idx}
              className={`w-1 rounded-full transition-all duration-75 ${
                isBotSpeaking 
                  ? "bg-gradient-to-t from-[#7047FF] via-[#845CFF] to-[#24D8ED] shadow-[0_0_6px_rgba(112,71,255,0.5)]" 
                  : "bg-[#292B3A]"
              }`}
              style={{
                height: `${Math.max(4, freq * 28)}px`,
              }}
            />
          ))}
        </div>

        {/* Latency Telemetry & Audio Toggle */}
        <div className="flex items-center gap-4 text-xs shrink-0">
          <div className="text-right">
            <span className="text-[#666879] block text-[10px] font-mono uppercase">TTFB</span>
            <span className="font-mono font-bold text-[#20E99A]">{currentMetrics.ttfb}ms</span>
          </div>
          <div className="text-right">
            <span className="text-[#666879] block text-[10px] font-mono uppercase">Turn Latency</span>
            <span className="font-mono font-bold text-[#24D8ED]">{currentMetrics.latency}ms</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAudioEnabled(!audioEnabled)}
            className="size-8 p-0 border-[#292B3A] bg-[#171820] hover:bg-[#1C1D25] hover:border-[#7047FF]/50 text-[#F4F2F8]"
            title={audioEnabled ? "Voice output enabled" : "Voice output muted"}
          >
            {audioEnabled ? <Volume2 className="size-4 text-[#845CFF]" /> : <VolumeX className="size-4 text-[#666879]" />}
          </Button>
        </div>
      </div>

      {/* ElevenLabs API Account Notice if applicable */}
      {apiNotice && (
        <div className="bg-amber-500/10 border border-amber-500/25 text-amber-900 dark:text-amber-200 px-3.5 py-2 rounded-lg text-xs flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-amber-700 dark:text-amber-300">ElevenLabs Account Notice:</span>
            <span>{apiNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setShowAccountDetails(!showAccountDetails)}
            className="text-[10px] bg-amber-500/20 hover:bg-amber-500/30 px-2 py-0.5 rounded font-medium text-amber-800 dark:text-amber-200 shrink-0 transition-colors"
          >
            {showAccountDetails ? "Hide Balance Details" : "View Balance Breakdown"}
          </button>
        </div>
      )}

      {/* Account Balance Inspection Panel */}
      {showAccountDetails && accountInfo && (
        <div className="bg-card border border-border rounded-xl p-4 shadow-xs text-xs space-y-3 animate-fade-in">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <span className="font-bold flex items-center gap-1.5 text-foreground">
              <Sparkles className="size-3.5 text-primary" />
              ElevenLabs Account Telemetry & Credit Breakdown
            </span>
            <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-muted text-muted-foreground uppercase">
              Tier: {accountInfo.tier}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-2.5 rounded-lg bg-muted/40 border border-border">
              <span className="text-[10px] text-muted-foreground block">Plan Total Limit</span>
              <span className="font-mono font-bold text-foreground text-sm">
                {(accountInfo.characterLimit || 10000).toLocaleString()} credits
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-muted/40 border border-border">
              <span className="text-[10px] text-muted-foreground block">Credits Used (Current Cycle)</span>
              <span className="font-mono font-bold text-amber-600 dark:text-amber-400 text-sm">
                {(accountInfo.characterCountUsed || 10000).toLocaleString()} credits
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-muted/40 border border-border">
              <span className="text-[10px] text-muted-foreground block">Remaining Balance</span>
              <span className="font-mono font-bold text-foreground text-sm">
                {(accountInfo.creditsRemaining || 0).toLocaleString()} credits
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-muted/40 border border-border">
              <span className="text-[10px] text-muted-foreground block">Next Quota Reset</span>
              <span className="font-mono font-bold text-foreground text-sm">
                {accountInfo.nextResetDate || "Next cycle"}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg bg-muted/40 border border-border text-[11px] font-mono">
            <div>
              <span className="text-muted-foreground">Active Key Loaded: </span>
              <span className="font-bold text-foreground">{accountInfo.keyMask || "None"}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Registered User: </span>
              <span className="font-bold text-foreground">{accountInfo.userName || "Account"}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Credits Left on this Key: </span>
              <span className={`font-bold ${accountInfo.creditsRemaining ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                {accountInfo.creditsRemaining ?? 0}
              </span>
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-muted/20 border border-border text-[11px] leading-relaxed text-muted-foreground space-y-1">
            <p>
              <strong className="text-foreground">Why your dashboard shows &ldquo;Total 10,000 credits&rdquo;:</strong> In ElevenLabs, &ldquo;Total 10,000&rdquo; represents your plan&apos;s full monthly allowance. The live API reports <span className="font-mono text-foreground">{accountInfo.characterCountUsed?.toLocaleString()}</span> of <span className="font-mono text-foreground">{accountInfo.characterLimit?.toLocaleString()}</span> characters consumed on this key (<span className="text-amber-600 dark:text-amber-400 font-semibold">{accountInfo.creditsRemaining} remaining</span>).
            </p>
            <p>
              <strong className="text-foreground">Premade vs Library Voice:</strong> Free tier accounts can only call official premade voices via the API (like <span className="font-mono text-foreground">Sarah</span>: EXAVITQu4vr4xnSDxMaL or <span className="font-mono text-foreground">Rachel</span>: 21m00Tcm4TlvDq8ikWAM) once credits are available.
            </p>
          </div>
        </div>
      )}

      {/* Direct ElevenLabs Test Result Notification */}
      {elevenLabsTestResult && (
        <div
          className={`p-3 rounded-lg text-xs border flex items-center justify-between gap-3 ${
            elevenLabsTestResult.status === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-200"
              : "bg-rose-500/10 border-rose-500/30 text-rose-900 dark:text-rose-200"
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="font-bold">
              {elevenLabsTestResult.status === "success" ? "ElevenLabs Stream Active:" : "ElevenLabs API Notice:"}
            </span>
            <span>{elevenLabsTestResult.message}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setElevenLabsTestResult(null)}
            className="h-6 px-2 text-[10px]"
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* ElevenLabs Voice & TTS Provider Control Bar */}
      <div className="bg-[#0D0F13]/90 border border-[#292B3A] rounded-xl px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* TTS Provider Selector */}
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-[#A4A3B2] flex items-center gap-1">
              <Sparkles className="size-3 text-[#7047FF]" />
              Provider:
            </span>
            <Select
              value={activeTtsProvider}
              onValueChange={(val) => setActiveTtsProvider(val as TTSProviderType)}
            >
              <SelectTrigger size="sm" className="h-7 text-xs w-32 bg-[#171820] border-[#292B3A] text-[#F4F2F8]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="start" className="bg-[#171820] border-[#292B3A] text-[#F4F2F8]">
                <SelectItem value="elevenlabs" className="text-xs font-medium text-[#845CFF]">
                  ElevenLabs
                </SelectItem>
                <SelectItem value="webspeech" className="text-xs text-[#A4A3B2]">
                  Web Speech (Native)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Model Selector (for ElevenLabs) */}
          {activeTtsProvider === "elevenlabs" && (
            <div className="flex items-center gap-1.5">
              <span className="text-[#A4A3B2]">Model:</span>
              <Select value={selectedModelId} onValueChange={setSelectedModelId}>
                <SelectTrigger size="sm" className="h-7 text-xs w-36 bg-[#171820] border-[#292B3A] text-[#F4F2F8]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="start" className="bg-[#171820] border-[#292B3A] text-[#F4F2F8]">
                  {ELEVENLABS_MODELS.map((m) => (
                    <SelectItem key={m.id} value={m.id} className="text-xs">
                      {m.name.split(" (")[0]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Voice Selector */}
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-[#A4A3B2] flex items-center gap-1">
              <AudioWaveform className="size-3.5 text-[#845CFF]" />
              Voice:
            </span>
            <Select value={selectedVoiceId} onValueChange={setSelectedVoiceId}>
              <SelectTrigger size="sm" className="h-7 text-xs min-w-36 bg-[#171820] border-[#292B3A] text-[#F4F2F8]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="start" className="bg-[#171820] border-[#292B3A] text-[#F4F2F8]">
                {availableVoices.map((voice) => (
                  <SelectItem key={voice.id} value={voice.id} className="text-xs hover:bg-[#1C1D25] focus:bg-[#1C1D25] focus:text-[#F4F2F8]">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-[#F4F2F8]">{voice.name}</span>
                      <span className="text-[10px] text-[#A4A3B2]">({voice.gender})</span>
                      {voice.id === DEFAULT_ELEVENLABS_VOICE.id && (
                        <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-[#7047FF]/20 text-[#845CFF]">
                          Default
                        </span>
                      )}
                      {customVoice && voice.id === customVoice.id && (
                        <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-[#20E99A]/15 text-[#20E99A]">
                          Env
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleAuditionVoice}
            disabled={isBotSpeaking || isAuditioning}
            className="h-7 text-xs px-2 text-[#A4A3B2] hover:text-[#F4F2F8] hover:bg-[#1C1D25]"
            title="Audition voice with short greeting"
          >
            Audition
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {/* Browser Fallback Toggle */}
          <button
            type="button"
            onClick={() => setAllowBrowserFallback(!allowBrowserFallback)}
            className={`h-7 px-2.5 rounded-md text-[11px] font-medium border flex items-center gap-1.5 transition-colors ${
              allowBrowserFallback
                ? "bg-[#F5BD24]/15 border-[#F5BD24]/30 text-[#F5BD24]"
                : "bg-[#171820] border-[#292B3A] text-[#A4A3B2] hover:text-[#F4F2F8]"
            }`}
            title={
              allowBrowserFallback
                ? "Device speech synthesis fallback is ON (plays if ElevenLabs quota is exhausted)"
                : "Device speech synthesis fallback is OFF (only streams ElevenLabs audio)"
            }
          >
            <span>Fallback Audio:</span>
            <span className="font-bold font-mono">{allowBrowserFallback ? "ON" : "OFF"}</span>
          </button>

          {accountInfo && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAccountDetails(!showAccountDetails)}
              className="h-7 text-xs gap-1 font-mono border-[#292B3A] bg-[#171820] text-[#A4A3B2] hover:text-[#F4F2F8]"
            >
              Balance ({accountInfo.creditsRemaining || 0} left)
            </Button>
          )}

          <Button
            variant="secondary"
            size="sm"
            onClick={handleDirectTestElevenLabs}
            disabled={isBotSpeaking || isTestingElevenLabs}
            className="h-7 text-xs gap-1.5 font-medium bg-[#7047FF]/20 border border-[#7047FF]/40 text-[#845CFF] hover:bg-[#7047FF]/30"
            title="Send direct synthesis request to ElevenLabs API using VITE_ELEVENLABS_API_KEY"
          >
            <Play className="size-3 text-[#845CFF] fill-[#845CFF]" />
            {isTestingElevenLabs ? "Streaming..." : `Test ElevenLabs (${activeVoice.name.split(" ")[0]})`}
          </Button>
        </div>
      </div>

      {/* Main Conversational Voice Stage & Reactive Radial Orb */}
      <Card className="flex-1 flex flex-col p-4 sm:p-6 bg-[#0D0F13]/95 border-[#292B3A] overflow-hidden min-h-[460px] shadow-2xl shadow-black/60 backdrop-blur-2xl relative">
        {/* Stage Top Bar: View Mode Switcher & Real-Time Status Pill */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#292B3A]/80">
          <div className="flex items-center gap-2">
            <div className="flex items-center p-0.5 rounded-lg bg-[#12141A] border border-[#292B3A]">
              <button
                type="button"
                onClick={() => setViewMode("orb")}
                className={`px-3 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all ${
                  viewMode === "orb"
                    ? "bg-[#7047FF] text-white shadow-md shadow-[#7047FF]/30 font-semibold"
                    : "text-[#A4A3B2] hover:text-[#F4F2F8]"
                }`}
              >
                <Radio className="size-3.5" />
                Voice Orb Stage
              </button>
              <button
                type="button"
                onClick={() => setViewMode("split")}
                className={`px-3 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all ${
                  viewMode === "split"
                    ? "bg-[#7047FF] text-white shadow-md shadow-[#7047FF]/30 font-semibold"
                    : "text-[#A4A3B2] hover:text-[#F4F2F8]"
                }`}
              >
                <Layers className="size-3.5" />
                Split Transcript
              </button>
            </div>
            <span className="text-[11px] text-[#666879] hidden md:inline font-mono">
              PyVex Reactive VAD • Fluid Water Wave Visualizer
            </span>
          </div>

          <div className="flex items-center gap-2">
            {isBotSpeaking && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleInterrupt}
                className="h-7 text-xs gap-1.5 bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30 animate-pulse font-semibold"
                title="Broadcast Pipecat InterruptionFrame upstream & downstream"
              >
                <Square className="size-3 fill-rose-300" />
                Interrupt Speech
              </Button>
            )}

            <button
              type="button"
              onClick={toggleMic}
              className={`h-7 px-3 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-all ${
                isMicListening
                  ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-300 shadow-[0_0_15px_rgba(36,216,237,0.3)] animate-pulse"
                  : "bg-[#171820] border-[#292B3A] text-[#A4A3B2] hover:text-[#F4F2F8] hover:border-[#7047FF]/40"
              }`}
              title={isMicListening ? "Microphone active • Tap to pause" : "Activate microphone for hands-free live voice input"}
            >
              {isMicListening ? <Mic className="size-3.5 text-cyan-400" /> : <MicOff className="size-3.5 text-[#666879]" />}
              <span>{isMicListening ? "Mic Listening" : "Enable Mic"}</span>
            </button>
          </div>
        </div>

        {/* Central Stage: Radial Voice Orb & Reactive Fluid Audio */}
        <div className={`flex-1 flex ${viewMode === "split" ? "flex-col lg:flex-row gap-6" : "flex-col"} items-center justify-center py-4 overflow-y-auto`}>
          {/* Reactive Radial Waveform / Voice Orb Container */}
          <div className="flex flex-col items-center justify-center w-full max-w-md py-2">
            <VoiceOrb
              state={voiceState}
              audioLevel={currentAudioLevel}
              frequencyData={currentFrequencies}
              isMicActive={isMicListening}
              onOrbClick={() => {
                if (isBotSpeaking) {
                  handleInterrupt();
                } else {
                  toggleMic();
                }
              }}
              voiceName={activeVoice.name}
              size={viewMode === "split" ? 220 : 270}
            />

            {/* Dynamic Captions / Live Subtitle Box */}
            <div className="mt-4 w-full bg-[#12141A]/90 border border-[#292B3A] rounded-xl px-4 py-3 shadow-lg flex items-center gap-3 backdrop-blur-md">
              <div className={`size-8 rounded-lg flex items-center justify-center shrink-0 ${
                voiceState === "speaking"
                  ? "bg-[#7047FF]/20 text-[#845CFF]"
                  : voiceState === "listening"
                  ? "bg-cyan-500/20 text-cyan-400"
                  : voiceState === "thinking"
                  ? "bg-purple-500/20 text-purple-400"
                  : "bg-[#171820] text-[#666879]"
              }`}>
                {voiceState === "speaking" ? (
                  <Volume2 className="size-4 animate-pulse" />
                ) : voiceState === "listening" ? (
                  <Mic className="size-4 animate-bounce" />
                ) : voiceState === "thinking" ? (
                  <Sparkles className="size-4 animate-spin" />
                ) : (
                  <Activity className="size-4" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] uppercase font-mono tracking-wider text-[#666879] block">
                  {voiceState === "speaking"
                    ? `${activeVoice.name} (${selectedModelId.replace("eleven_", "")})`
                    : voiceState === "listening"
                    ? "Microphone Input (PyVex VAD)"
                    : voiceState === "thinking"
                    ? "Turn Evaluation & Aggregation"
                    : "Voice Stream Ready"}
                </span>
                <p className="text-xs text-[#F4F2F8] truncate font-medium mt-0.5">
                  {activeSubtitle}
                </p>
              </div>
            </div>

            {/* Radial Orb Interaction Hints */}
            <div className="flex items-center gap-3 mt-3 text-[11px] text-[#A4A3B2]">
              <span className="flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-cyan-400" /> Mic: {isMicListening ? "Active" : "Muted"}
              </span>
              <span>&bull;</span>
              <span className="flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-[#7047FF]" /> Voice: {activeVoice.name.split(" ")[0]}
              </span>
              <span>&bull;</span>
              <span className="flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-emerald-400" /> TTS: ElevenLabs
              </span>
            </div>
          </div>

          {/* In Split Mode: Conversation Transcript Canvas */}
          {viewMode === "split" && (
            <div className="flex-1 w-full max-h-72 lg:max-h-96 overflow-y-auto space-y-3 pr-2 bg-[#12141A]/50 border border-[#292B3A] rounded-xl p-3">
              <div className="text-[11px] font-mono uppercase text-[#666879] border-b border-[#292B3A] pb-1.5 flex items-center justify-between">
                <span>Recent Pipeline Turns</span>
                <span>{messages.length} messages</span>
              </div>
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-2.5 text-xs ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {msg.role === "bot" && (
                    <div className="size-6 rounded-md bg-[#7047FF]/20 text-[#845CFF] flex items-center justify-center shrink-0 mt-0.5">
                      <Bot className="size-3.5" />
                    </div>
                  )}
                  <div
                    className={`max-w-[85%] rounded-lg px-3 py-2 ${
                      msg.role === "user"
                        ? "bg-[#7047FF] text-white"
                        : "bg-[#171820] border border-[#292B3A] text-[#F4F2F8]"
                    }`}
                  >
                    <p className="leading-relaxed">{msg.text}</p>
                    <div className="flex items-center justify-between gap-2 mt-1 text-[9px] opacity-75">
                      <span>{msg.timestamp}</span>
                      {msg.voiceInfo && (
                        <span>{msg.voiceInfo.provider}: {msg.voiceInfo.name}</span>
                      )}
                    </div>
                  </div>
                  {msg.role === "user" && (
                    <div className="size-6 rounded-md bg-[#7047FF] text-white flex items-center justify-center shrink-0 mt-0.5">
                      <User className="size-3.5" />
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Quick Conversational Prompt Suggestions */}
        <div className="pt-2 pb-1 border-t border-[#292B3A] flex items-center gap-2 overflow-x-auto text-xs scrollbar-none">
          <span className="text-[11px] text-[#666879] whitespace-nowrap font-mono uppercase">Prompts:</span>
          <button
            type="button"
            onClick={() => handleSendMessage("How does Pyvex Voice handle interruptions during ElevenLabs audio playback?")}
            className="px-2.5 py-1 rounded-md bg-[#171820] border border-[#292B3A] hover:border-[#7047FF]/50 text-[#A4A3B2] hover:text-[#F4F2F8] whitespace-nowrap transition-colors text-xs"
          >
            Interruption handling?
          </button>
          <button
            type="button"
            onClick={() => handleSendMessage("Tell me about the default neural voice configuration in Pyvex Voice.")}
            className="px-2.5 py-1 rounded-md bg-[#171820] border border-[#292B3A] hover:border-[#7047FF]/50 text-[#A4A3B2] hover:text-[#F4F2F8] whitespace-nowrap transition-colors text-xs"
          >
            Voice configuration?
          </button>
          <button
            type="button"
            onClick={() => handleSendMessage("Can you give me a quick overview of the FrameProcessor architecture in Tilted Studio?")}
            className="px-2.5 py-1 rounded-md bg-[#171820] border border-[#292B3A] hover:border-[#7047FF]/50 text-[#A4A3B2] hover:text-[#F4F2F8] whitespace-nowrap transition-colors text-xs"
          >
            Pipeline architecture?
          </button>
        </div>

        {/* User Input Bar with Integrated Mic & Action Buttons */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2 pt-2"
        >
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={toggleMic}
            className={`size-9 p-0 rounded-lg shrink-0 transition-all ${
              isMicListening
                ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-[0_0_12px_rgba(36,216,237,0.4)] animate-pulse"
                : "bg-[#171820] border-[#292B3A] text-[#A4A3B2] hover:text-[#F4F2F8]"
            }`}
            title={isMicListening ? "Microphone active • Tap to pause" : "Activate microphone for voice input"}
          >
            {isMicListening ? <Mic className="size-4 text-cyan-400" /> : <MicOff className="size-4 text-[#A4A3B2]" />}
          </Button>

          <Input
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              isMicListening
                ? "Listening to your voice... (or type here)"
                : `Speak or type to converse with ${activeVoice.name} (ElevenLabs)...`
            }
            className="flex-1 text-sm bg-[#12141A] border-[#292B3A] text-[#F4F2F8] placeholder:text-[#666879] focus-visible:border-[#7047FF] focus-visible:ring-1 focus-visible:ring-[#7047FF]"
            disabled={isProcessing}
          />

          <Button
            type="submit"
            size="sm"
            disabled={isProcessing || !inputText.trim()}
            className="gap-1.5 bg-[#7047FF] hover:bg-[#845CFF] text-white shadow-[0_0_15px_rgba(112,71,255,0.4)] px-4 font-semibold"
          >
            <Send className="size-4" />
            Send Turn
          </Button>
        </form>
      </Card>

      {/* Frame Timeline Ticker */}
      {liveEvents.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-3 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold flex items-center gap-1.5">
              <Zap className="size-3.5 text-primary" />
              Latest Frame Bus Activity
            </span>
            <span className="text-[10px] text-muted-foreground font-mono">{liveEvents.length} frames logged</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {liveEvents.map((ev) => (
              <div key={ev.id} className="p-2 rounded-lg bg-muted/30 border border-border text-[11px]">
                <div className="font-semibold text-primary truncate">{ev.type}</div>
                <div className="text-[10px] text-muted-foreground truncate">{ev.summary}</div>
                <div className="text-[9px] text-muted-foreground/70 font-mono mt-0.5">{ev.timestamp}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
