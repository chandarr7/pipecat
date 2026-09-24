import React, { useState, useEffect } from "react";
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  RefreshCw, 
  Volume2, 
  Play, 
  Pause, 
  Key, 
  Layers, 
  User, 
  Activity, 
  Search, 
  Filter,
  ExternalLink,
  ShieldCheck,
  Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export interface VoiceItem {
  voice_id: string;
  name: string;
  category: string;
  description?: string;
  accent?: string;
  gender?: string;
  preview_url?: string;
}

export interface VerificationResult {
  configured: boolean;
  reachable: boolean;
  statusCode?: number;
  latencyMs?: number;
  keyMask?: string;
  accountName?: string;
  tier?: string;
  creditsRemaining?: number;
  characterCountUsed?: number;
  characterLimit?: number;
  voiceCount?: number;
  premadeCount?: number;
  clonedCount?: number;
  configuredVoiceId?: string;
  voices?: VoiceItem[];
  error?: string;
}

export const ApiVerificationPanel: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [testSynthesisText, setTestSynthesisText] = useState("Hello! Your ElevenLabs API connection is successfully verified.");
  const [synthesisLoading, setSynthesisLoading] = useState(false);
  const [synthesisNotice, setSynthesisNotice] = useState<string | null>(null);

  const viteApiKey = (import.meta.env.VITE_ELEVENLABS_API_KEY as string | undefined) || "";

  const runVerification = async () => {
    setLoading(true);
    setSynthesisNotice(null);
    try {
      const headers: Record<string, string> = {};
      if (viteApiKey) {
        headers["xi-api-key"] = viteApiKey;
      }
      const res = await fetch("/api/tts/verify", { headers });
      const data = await res.json();
      setResult(data);
    } catch (err: unknown) {
      setResult({
        configured: true,
        reachable: false,
        error: err instanceof Error ? err.message : "Failed to execute verification request",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runVerification();
    return () => {
      if (audioElement) {
        audioElement.pause();
      }
    };
  }, []);

  const handlePlayPreview = (voice: VoiceItem) => {
    if (!voice.preview_url) return;

    if (playingVoiceId === voice.voice_id && audioElement) {
      audioElement.pause();
      setPlayingVoiceId(null);
      return;
    }

    if (audioElement) {
      audioElement.pause();
    }

    const audio = new Audio(voice.preview_url);
    setAudioElement(audio);
    setPlayingVoiceId(voice.voice_id);

    audio.onended = () => {
      setPlayingVoiceId(null);
    };
    audio.onerror = () => {
      setPlayingVoiceId(null);
    };

    audio.play().catch(() => setPlayingVoiceId(null));
  };

  const handleTestSynthesis = async (voiceId: string) => {
    setSynthesisLoading(true);
    setSynthesisNotice(null);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (viteApiKey) {
        headers["xi-api-key"] = viteApiKey;
      }
      const response = await fetch("/api/tts/elevenlabs", {
        method: "POST",
        headers,
        body: JSON.stringify({
          text: testSynthesisText,
          voiceId,
          apiKey: viteApiKey || undefined,
        }),
      });

      const contentType = response.headers.get("content-type") || "";

      if (response.ok && contentType.includes("audio/mpeg")) {
        const audioBlob = await response.blob();
        const url = URL.createObjectURL(audioBlob);
        const audio = new Audio(url);
        audio.onended = () => URL.revokeObjectURL(url);
        await audio.play();
        setSynthesisNotice(`Synthesis success: Audio streamed via ${voiceId}`);
      } else {
        const errData = await response.json();
        setSynthesisNotice(`API Error (${response.status}): ${errData.error || "Synthesis failed"}`);
      }
    } catch (err: unknown) {
      setSynthesisNotice(`Connection failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setSynthesisLoading(false);
    }
  };

  const filteredVoices = (result?.voices || []).filter((v) => {
    const matchesSearch =
      v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.voice_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (v.description && v.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (v.gender && v.gender.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory =
      categoryFilter === "all" || v.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="h-full flex flex-col gap-4 p-4 max-w-6xl mx-auto overflow-y-auto">
      {/* Header card with action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-[#292B3A] bg-[#0D0F13]/90 backdrop-blur-xl shadow-lg shadow-black/40">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-extrabold tracking-tight flex items-center gap-2 text-[#F4F2F8]">
              <ShieldCheck className="size-5 text-[#20E99A]" />
              ElevenLabs Telemetry & Connectivity Verification
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#7047FF]/20 text-[#845CFF] border border-[#7047FF]/30 uppercase font-semibold">
              Pyvex Diagnostic
            </span>
          </div>
          <p className="text-xs text-[#A4A3B2] mt-1">
            Real-time ping verification, response latency measurement, credit quota telemetry, and voice catalog explorer.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={runVerification}
            disabled={loading}
            className="gap-2 text-xs font-semibold bg-[#7047FF] hover:bg-[#845CFF] text-white shadow-[0_0_12px_rgba(112,71,255,0.4)]"
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Verifying Pipeline..." : "Re-test Connectivity"}
          </Button>
        </div>
      </div>

      {/* Connectivity & Health Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {/* Reachability Status */}
        <div className="p-3.5 rounded-xl border border-[#292B3A] bg-[#12141A] flex flex-col justify-between gap-2 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#A4A3B2]">Service Reachability</span>
            {result?.reachable ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#20E99A] bg-[#20E99A]/10 border border-[#20E99A]/30 px-2 py-0.5 rounded-full">
                <CheckCircle2 className="size-3" /> Reachable
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#FF6269] bg-[#FF6269]/10 border border-[#FF6269]/30 px-2 py-0.5 rounded-full">
                <XCircle className="size-3" /> {result?.configured ? "Unreachable" : "Missing Key"}
              </span>
            )}
          </div>
          <div className="text-xl font-bold font-mono text-[#F4F2F8]">
            {result?.statusCode ? `HTTP ${result.statusCode}` : result?.reachable ? "HTTP 200" : "Offline"}
          </div>
          <div className="text-[11px] text-[#A4A3B2] flex items-center gap-1">
            <Clock className="size-3 text-[#24D8ED]" />
            Latency: <span className="font-mono font-medium text-[#20E99A]">{result?.latencyMs ?? 0} ms</span>
          </div>
        </div>

        {/* API Key Info */}
        <div className="p-3.5 rounded-xl border border-[#292B3A] bg-[#12141A] flex flex-col justify-between gap-2 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#A4A3B2]">Configured Key</span>
            <Key className="size-3.5 text-[#845CFF]" />
          </div>
          <div className="text-sm font-bold font-mono text-[#F4F2F8] truncate" title={result?.keyMask}>
            {result?.keyMask || "No Key Configured"}
          </div>
          <div className="text-[11px] text-[#A4A3B2]">
            Account: <span className="font-medium text-[#F4F2F8]">{result?.accountName || "Unknown"}</span>
          </div>
        </div>

        {/* Credit Quota Remaining */}
        <div className="p-3.5 rounded-xl border border-[#292B3A] bg-[#12141A] flex flex-col justify-between gap-2 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#A4A3B2]">Credit Balance</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#1C1D25] border border-[#292B3A] text-[#845CFF] uppercase font-semibold">
              {result?.tier || "Free"}
            </span>
          </div>
          <div className="text-xl font-bold font-mono">
            <span className={result?.creditsRemaining && result.creditsRemaining > 0 ? "text-[#20E99A]" : "text-[#FF6269]"}>
              {(result?.creditsRemaining ?? 0).toLocaleString()}
            </span>
            <span className="text-xs text-[#666879] font-normal"> / {(result?.characterLimit ?? 10000).toLocaleString()}</span>
          </div>
          <div className="text-[11px] text-[#A4A3B2]">
            Used: <span className="font-mono text-[#F4F2F8] font-medium">{result?.characterCountUsed?.toLocaleString() ?? 0}</span> chars
          </div>
        </div>

        {/* Voice Catalog Counts */}
        <div className="p-3.5 rounded-xl border border-[#292B3A] bg-[#12141A] flex flex-col justify-between gap-2 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#A4A3B2]">Voice Catalog</span>
            <Layers className="size-3.5 text-[#24D8ED]" />
          </div>
          <div className="text-xl font-bold font-mono text-[#24D8ED]">
            {result?.voiceCount ?? 0} Voices
          </div>
          <div className="text-[11px] text-[#A4A3B2]">
            <span className="text-[#F4F2F8] font-medium">{result?.premadeCount ?? 0}</span> Premade • <span className="text-[#F4F2F8] font-medium">{result?.clonedCount ?? 0}</span> Cloned
          </div>
        </div>
      </div>

      {/* Error or Alert banner */}
      {result?.error && (
        <div className="p-3.5 rounded-xl bg-[#FF6269]/10 border border-[#FF6269]/30 text-[#FF6269] text-xs flex items-start gap-2.5">
          <AlertTriangle className="size-4 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Connectivity Notice:</span>
            <p className="mt-0.5 font-mono text-[11px]">{result.error}</p>
          </div>
        </div>
      )}

      {/* Synthesis Diagnostic Bar */}
      <div className="p-3.5 rounded-xl border border-[#292B3A] bg-[#0D0F13]/90 backdrop-blur-xl flex flex-col gap-2.5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span className="text-xs font-semibold flex items-center gap-1.5 text-[#F4F2F8]">
            <Volume2 className="size-4 text-[#845CFF]" />
            Direct Synthesis Diagnostic (Low-Latency Audio Streaming)
          </span>
          {synthesisNotice && (
            <span className={`text-[11px] font-mono px-2 py-0.5 rounded border ${
              synthesisNotice.startsWith("Synthesis success")
                ? "bg-[#20E99A]/10 border-[#20E99A]/30 text-[#20E99A]"
                : "bg-[#F5BD24]/10 border-[#F5BD24]/30 text-[#F5BD24]"
            }`}>
              {synthesisNotice}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Input
            value={testSynthesisText}
            onChange={(e) => setTestSynthesisText(e.target.value)}
            placeholder="Type short test phrase to synthesize directly from ElevenLabs..."
            className="text-xs h-8 bg-[#12141A] border-[#292B3A] text-[#F4F2F8] placeholder:text-[#666879] focus-visible:border-[#7047FF]"
          />
          <Button
            size="sm"
            onClick={() => handleTestSynthesis(result?.configuredVoiceId || "21m00Tcm4TlvDq8ikWAM")}
            disabled={synthesisLoading || !result?.reachable}
            className="h-8 text-xs shrink-0 font-semibold bg-[#7047FF] hover:bg-[#845CFF] text-white shadow-[0_0_10px_rgba(112,71,255,0.4)]"
          >
            {synthesisLoading ? "Synthesizing..." : "Stream Audio (Active Voice)"}
          </Button>
        </div>
      </div>

      {/* Voices List & Explorer */}
      <div className="flex-1 flex flex-col gap-3 min-h-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0">
          <div>
            <h3 className="text-sm font-bold text-[#F4F2F8]">Available Voice Models ({filteredVoices.length})</h3>
            <p className="text-xs text-[#A4A3B2]">
              Real-time directory fetched directly from the configured ElevenLabs API account.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative w-44 sm:w-56">
              <Search className="size-3.5 absolute left-2.5 top-2.5 text-[#666879]" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search voices or IDs..."
                className="pl-8 h-8 text-xs bg-[#12141A] border-[#292B3A] text-[#F4F2F8] placeholder:text-[#666879] focus-visible:border-[#7047FF]"
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="h-8 text-xs rounded-md border border-[#292B3A] bg-[#12141A] px-2 text-[#F4F2F8] font-medium"
            >
              <option value="all">All Categories</option>
              <option value="premade">Premade (Free API)</option>
              <option value="cloned">Cloned</option>
              <option value="generated">Generated</option>
              <option value="professional">Professional</option>
            </select>
          </div>
        </div>

        {/* Voices Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 overflow-y-auto pr-1">
          {filteredVoices.map((voice) => {
            const isConfigured = voice.voice_id === result?.configuredVoiceId;
            const isPlaying = playingVoiceId === voice.voice_id;

            return (
              <div
                key={voice.voice_id}
                className={`p-3 rounded-lg border text-xs flex flex-col justify-between gap-2 transition-all ${
                  isConfigured
                    ? "border-[#7047FF]/60 bg-[#7047FF]/10 ring-1 ring-[#7047FF]/30 shadow-[0_0_12px_rgba(112,71,255,0.15)]"
                    : "border-[#292B3A] bg-[#12141A] hover:border-[#34365C]"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-1.5">
                    <span className="font-semibold text-[#F4F2F8] truncate" title={voice.name}>
                      {voice.name}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      {isConfigured && (
                        <span className="px-1.5 py-0.2 rounded bg-[#7047FF]/30 text-[#845CFF] border border-[#7047FF]/40 text-[10px] font-bold">
                          Active
                        </span>
                      )}
                      <span className="px-1.5 py-0.2 rounded bg-[#1C1D25] border border-[#292B3A] text-[#A4A3B2] text-[10px] font-mono capitalize">
                        {voice.category}
                      </span>
                    </div>
                  </div>

                  <div className="mt-1 font-mono text-[10px] text-[#666879] truncate select-all">
                    ID: {voice.voice_id}
                  </div>

                  {voice.description && (
                    <p className="mt-1 text-[11px] text-[#A4A3B2] line-clamp-2 leading-relaxed">
                      {voice.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-1.5 border-t border-[#292B3A]/60 gap-2">
                  <div className="flex items-center gap-1 text-[10px] text-[#666879]">
                    {voice.gender && <span className="capitalize">{voice.gender}</span>}
                    {voice.accent && <span>• {voice.accent}</span>}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {voice.preview_url && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handlePlayPreview(voice)}
                        className="h-6 px-2 text-[10px] gap-1 text-[#A4A3B2] hover:text-[#F4F2F8] hover:bg-[#1C1D25]"
                        title="Listen to official sample preview"
                      >
                        {isPlaying ? (
                          <>
                            <Pause className="size-2.5 text-[#845CFF] fill-[#845CFF]" />
                            <span>Stop</span>
                          </>
                        ) : (
                          <>
                            <Play className="size-2.5" />
                            <span>Preview</span>
                          </>
                        )}
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleTestSynthesis(voice.voice_id)}
                      disabled={synthesisLoading || !result?.reachable}
                      className="h-6 px-2 text-[10px] border-[#292B3A] bg-[#171820] text-[#F4F2F8] hover:bg-[#1C1D25] hover:border-[#7047FF]/40"
                      title="Test live text synthesis with this voice"
                    >
                      Test
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
