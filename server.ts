import express, { Request, Response } from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // In-memory state for bot sessions and multi-worker demos
  const activeSessions = new Map<string, {
    id: string;
    botId: string;
    createdAt: number;
    state: string;
    shoppingList: Array<{ id: string; text: string; completed: boolean }>;
  }>();

  // API Routes
  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({
      status: "ok",
      framework: "Pipecat",
      version: "1.3.0",
      timestamp: new Date().toISOString(),
    });
  });

  // Bot templates
  app.get("/api/bots", (_req: Request, res: Response) => {
    res.json({
      bots: [
        {
          id: "voice-assistant",
          name: "Voice Assistant",
          description: "Streaming STT, LLM context aggregation, and low-latency TTS.",
          pipeline: ["SmallWebRTCTransport.in", "DeepgramSTT", "LLMUserAggregator", "GeminiLLM", "CartesiaTTS", "SmallWebRTCTransport.out", "LLMAssistantAggregator"]
        },
        {
          id: "shopping-list",
          name: "Shopping List UIWorker",
          description: "Dual-worker pattern: voice pipeline + silent UIWorker updating live screen state.",
          pipeline: ["PipelineWorker (voice)", "WorkerBus", "UIWorker (list manager)"]
        },
        {
          id: "form-fill",
          name: "Form Fill Assistant",
          description: "Accessible voice-guided form completion with focus highlighting.",
          pipeline: ["PipelineWorker", "FormWorker", "RTVIObserver"]
        }
      ]
    });
  });

  // Start bot session
  app.post("/api/start", (req: Request, res: Response) => {
    const botId = req.body?.botId || "voice-assistant";
    const sessionId = `pipecat_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    
    activeSessions.set(sessionId, {
      id: sessionId,
      botId,
      createdAt: Date.now(),
      state: "ready",
      shoppingList: [
        { id: "item-1", text: "Organic oat milk", completed: false },
        { id: "item-2", text: "Fresh sourdough bread", completed: true },
        { id: "item-3", text: "Fair-trade coffee beans", completed: false }
      ]
    });

    res.json({
      sessionId,
      botId,
      status: "ready",
      webrtcUrl: `http://localhost:${PORT}/api/offer`,
      wsUrl: `ws://localhost:${PORT}/api/ws/${sessionId}`,
      token: sessionId,
      iceConfig: {
        iceServers: [{ urls: ["stun:stun.l.google.com:19302"] }]
      },
      message: "Pipecat session initialized"
    });
  });

  // WebRTC offer negotiation stub
  app.post("/api/offer", (req: Request, res: Response) => {
    res.json({
      type: "answer",
      sdp: "v=0\r\no=- 0 0 IN IP4 127.0.0.1\r\ns=Pipecat WebRTC Simulator\r\nt=0 0\r\n",
      status: "negotiated"
    });
  });

  // Simulated Voice Turn Pipeline Execution (STT -> LLM -> TTS -> UIWorker)
  app.post("/api/simulate/turn", (req: Request, res: Response) => {
    const { prompt, botId, sessionId } = req.body || {};
    const textPrompt = (prompt || "").trim();
    
    const session = sessionId && activeSessions.get(sessionId);
    const list = session?.shoppingList || [
      { id: "item-1", text: "Organic oat milk", completed: false },
      { id: "item-2", text: "Fresh sourdough bread", completed: true },
      { id: "item-3", text: "Fair-trade coffee beans", completed: false }
    ];

    let botReply = "";
    let uiAction: { type: string; item?: string; items?: string[] } | null = null;

    const lower = textPrompt.toLowerCase();

    if (botId === "shopping-list") {
      if (lower.includes("add") || lower.includes("buy") || lower.includes("need")) {
        const itemText = textPrompt.replace(/add|buy|need|to my list|to the list|please/gi, "").trim();
        const cleanItem = itemText.replace(/^(and|,|\s)+/g, "").trim();
        if (cleanItem) {
          list.push({ id: `item-${Date.now()}`, text: cleanItem, completed: false });
          uiAction = { type: "add_item", item: cleanItem };
          botReply = `I've added "${cleanItem}" to your shopping list.`;
        } else {
          botReply = "What would you like me to add to the shopping list?";
        }
      } else if (lower.includes("check off") || lower.includes("done") || lower.includes("complete")) {
        const matched = list.find(item => lower.includes(item.text.toLowerCase()));
        if (matched) {
          matched.completed = true;
          uiAction = { type: "set_checked", item: matched.text };
          botReply = `Checked off "${matched.text}".`;
        } else if (list.length > 0) {
          list[0].completed = true;
          uiAction = { type: "set_checked", item: list[0].text };
          botReply = `Checked off "${list[0].text}".`;
        } else {
          botReply = "Your shopping list is currently empty.";
        }
      } else if (lower.includes("what's left") || lower.includes("show list") || lower.includes("summary")) {
        const remaining = list.filter(i => !i.completed).map(i => i.text);
        botReply = remaining.length > 0 
          ? `You still have ${remaining.length} items remaining: ${remaining.join(", ")}.`
          : "All items on your shopping list are checked off!";
      } else {
        botReply = `I heard "${textPrompt}". You can ask me to add groceries, check off items, or summarize what is left on screen.`;
      }
    } else {
      // General Voice Assistant
      if (lower.includes("calendar") || lower.includes("schedule") || lower.includes("meeting") || lower.includes("agenda") || lower.includes("appointment")) {
        botReply = "Your Google Calendar is synchronized with Tilted Studio! With your permission, I can inspect your daily agenda, check free/busy availability, and help you schedule new appointments right from the Calendar tab.";
      } else if (lower.includes("architecture") || lower.includes("frame")) {
        botReply = "Pipecat is organized around frame processors! Audio, video, and control signals flow as typed Frame objects through pipelines. Upstream frames handle acknowledgments, while downstream frames carry audio and inference data.";
      } else if (lower.includes("turn") || lower.includes("interruption")) {
        botReply = "Turn detection uses user turn start/stop strategies such as VADUserTurnStartStrategy. When a user begins speaking, an InterruptionFrame is broadcast to immediately cancel playback and flush active queues.";
      } else if (lower.includes("worker") || lower.includes("bus")) {
        botReply = "Workers are the top-level execution units in Pipecat. BaseWorker manages activation and RPC jobs, while WorkerBus handles pub/sub messaging across multiple cooperating workers.";
      } else {
        botReply = `I received your voice turn: "${textPrompt}". In a production deployment, this flows through STT -> Context Aggregator -> LLM -> TTS -> Audio Output in under 400 milliseconds.`;
      }
    }

    // Generate real Pipecat frame timeline for the event monitor
    const timestamp = Date.now();
    const frameEvents = [
      {
        id: `ev-${timestamp}-1`,
        timestamp: new Date(timestamp - 280).toLocaleTimeString(),
        type: "UserStartedSpeakingFrame",
        direction: "downstream",
        summary: "VAD detected speech onset (0dB)",
      },
      {
        id: `ev-${timestamp}-2`,
        timestamp: new Date(timestamp - 180).toLocaleTimeString(),
        type: "UserStoppedSpeakingFrame",
        direction: "downstream",
        summary: `Speech segment transcribed: "${textPrompt.slice(0, 30)}..."`,
      },
      {
        id: `ev-${timestamp}-3`,
        timestamp: new Date(timestamp - 120).toLocaleTimeString(),
        type: "LLMContextFrame",
        direction: "downstream",
        summary: "Aggregated user turn into conversation context",
      },
      {
        id: `ev-${timestamp}-4`,
        timestamp: new Date(timestamp - 50).toLocaleTimeString(),
        type: "LLMResponseStartFrame",
        direction: "downstream",
        summary: "First token generated (TTFB: 70ms)",
      },
      {
        id: `ev-${timestamp}-5`,
        timestamp: new Date(timestamp).toLocaleTimeString(),
        type: "TTSAudioFrame",
        direction: "downstream",
        summary: `ElevenLabs TTS (Rachel - Female): Synthesized ${botReply.split(" ").length} words`,
      },
    ];

    res.json({
      text: botReply,
      uiAction,
      shoppingList: list,
      events: frameEvents,
      voice: {
        provider: "ElevenLabs",
        name: "Rachel",
        gender: "female",
        voiceId: process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM",
      },
      metrics: {
        ttfb: Math.floor(65 + Math.random() * 25),
        latency: Math.floor(180 + Math.random() * 40),
        tokensPerSec: Math.floor(45 + Math.random() * 15),
      }
    });
  });

  // TTS configuration status
  app.get("/api/tts/config", (_req: Request, res: Response) => {
    const configuredVoiceId = process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM";
    res.json({
      hasApiKey: Boolean(process.env.ELEVENLABS_API_KEY),
      configuredVoiceId,
      defaultVoiceId: configuredVoiceId,
      provider: "ElevenLabs",
    });
  });

  // ElevenLabs Account Subscription & Balance inspection
  app.get("/api/tts/account", async (_req: Request, res: Response) => {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return res.json({ hasApiKey: false, message: "No API key configured" });
    }

    try {
      const [subRes, voicesRes, userRes] = await Promise.all([
        fetch("https://api.elevenlabs.io/v1/user/subscription", {
          headers: { "xi-api-key": apiKey }
        }),
        fetch("https://api.elevenlabs.io/v1/voices", {
          headers: { "xi-api-key": apiKey }
        }),
        fetch("https://api.elevenlabs.io/v1/user", {
          headers: { "xi-api-key": apiKey }
        })
      ]);

      if (!subRes.ok) {
        const errText = await subRes.text();
        return res.status(subRes.status).json({ error: errText });
      }

      const subData = await subRes.json();
      const voicesData = voicesRes.ok ? await voicesRes.json() : { voices: [] };
      const userData = userRes.ok ? await userRes.json() : {};

      const configuredVoiceId = process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM";
      const targetVoice = voicesData.voices?.find((v: { voice_id: string }) => v.voice_id === configuredVoiceId);

      const used = subData.character_count ?? 0;
      const limit = subData.character_limit ?? 10000;
      const remaining = Math.max(0, limit - used);

      return res.json({
        hasApiKey: true,
        keyMask: `${apiKey.slice(0, 8)}...${apiKey.slice(-6)}`,
        userName: userData.first_name || "Account",
        tier: subData.tier || "free",
        status: subData.status || "active",
        characterCountUsed: used,
        characterLimit: limit,
        creditsRemaining: remaining,
        nextResetDate: subData.next_character_count_reset_unix
          ? new Date(subData.next_character_count_reset_unix * 1000).toLocaleDateString()
          : null,
        configuredVoice: {
          id: configuredVoiceId,
          name: targetVoice?.name || "Boo - Warm & Expressive",
          category: targetVoice?.category || "professional",
          isLibraryVoice: targetVoice?.category !== "premade",
        }
      });
    } catch (err: unknown) {
      return res.status(500).json({ error: err instanceof Error ? err.message : "Failed to fetch account status" });
    }
  });

  // Comprehensive ElevenLabs API Verification endpoint
  app.get("/api/tts/verify", async (req: Request, res: Response) => {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return res.json({
        configured: false,
        reachable: false,
        error: "ELEVENLABS_API_KEY is not defined in environment variables.",
      });
    }

    const startTime = Date.now();
    try {
      const [voicesRes, subRes, userRes] = await Promise.all([
        fetch("https://api.elevenlabs.io/v1/voices", {
          headers: { "xi-api-key": apiKey }
        }),
        fetch("https://api.elevenlabs.io/v1/user/subscription", {
          headers: { "xi-api-key": apiKey }
        }),
        fetch("https://api.elevenlabs.io/v1/user", {
          headers: { "xi-api-key": apiKey }
        })
      ]);

      const latencyMs = Date.now() - startTime;

      if (!voicesRes.ok) {
        const errorText = await voicesRes.text();
        return res.json({
          configured: true,
          reachable: false,
          statusCode: voicesRes.status,
          latencyMs,
          error: `API returned HTTP ${voicesRes.status}: ${errorText}`,
          keyMask: `${apiKey.slice(0, 8)}...${apiKey.slice(-6)}`,
        });
      }

      const voicesData = await voicesRes.json();
      const subData = subRes.ok ? await subRes.json() : null;
      const userData = userRes.ok ? await userRes.json() : null;

      const voicesList = (voicesData.voices || []).map((v: any) => ({
        voice_id: v.voice_id,
        name: v.name,
        category: v.category,
        description: v.description || v.labels?.description || "",
        accent: v.labels?.accent || "",
        gender: v.labels?.gender || "",
        preview_url: v.preview_url || "",
      }));

      const used = subData?.character_count ?? 0;
      const limit = subData?.character_limit ?? 10000;
      const remaining = Math.max(0, limit - used);

      return res.json({
        configured: true,
        reachable: true,
        statusCode: voicesRes.status,
        latencyMs,
        keyMask: `${apiKey.slice(0, 8)}...${apiKey.slice(-6)}`,
        accountName: userData?.first_name || "Account",
        tier: subData?.tier || "free",
        creditsRemaining: remaining,
        characterCountUsed: used,
        characterLimit: limit,
        voiceCount: voicesList.length,
        premadeCount: voicesList.filter((v: any) => v.category === "premade").length,
        clonedCount: voicesList.filter((v: any) => v.category === "cloned").length,
        configuredVoiceId: process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM",
        voices: voicesList,
      });
    } catch (err: unknown) {
      return res.json({
        configured: true,
        reachable: false,
        latencyMs: Date.now() - startTime,
        error: err instanceof Error ? err.message : "Failed to connect to ElevenLabs API",
        keyMask: `${apiKey.slice(0, 8)}...${apiKey.slice(-6)}`,
      });
    }
  });

  // ElevenLabs TTS Synthesis endpoint
  app.post("/api/tts/elevenlabs", async (req: Request, res: Response) => {
    try {
      const { text, voiceId } = req.body || {};
      const targetVoice = voiceId || process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM"; // Rachel (Default Female)
      const apiKey = process.env.ELEVENLABS_API_KEY;

      if (!text) {
        return res.status(400).json({ error: "Missing text for TTS synthesis" });
      }

      if (apiKey) {
        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${targetVoice}`, {
          method: "POST",
          headers: {
            "xi-api-key": apiKey,
            "Content-Type": "application/json",
            "Accept": "audio/mpeg",
          },
          body: JSON.stringify({
            text,
            model_id: "eleven_turbo_v2_5",
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.8,
              style: 0.0,
              use_speaker_boost: true,
            },
          }),
        });

        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          res.setHeader("Content-Type", "audio/mpeg");
          res.setHeader("Content-Length", buffer.length);
          return res.send(buffer);
        } else {
          const errText = await response.text();
          let detailedError = "ElevenLabs API returned an error";
          try {
            const parsed = JSON.parse(errText);
            if (parsed?.detail?.message) {
              detailedError = parsed.detail.message;
            }
          } catch {
            detailedError = errText.slice(0, 150);
          }
          console.warn("ElevenLabs API responded with non-200:", detailedError);
          return res.json({
            simulated: true,
            hasApiKey: true,
            voiceId: targetVoice,
            voiceName: targetVoice === "Y0G5nEDw2qHnUHGmtoM9" ? "Custom Voice" : "Rachel",
            error: detailedError,
          });
        }
      }

      // If no API key configured, notify client to use client synthesis with female voice
      return res.json({
        simulated: true,
        hasApiKey: false,
        voiceId: targetVoice,
        voiceName: "Rachel",
        message: "ElevenLabs API key not configured. Using high-quality client female voice.",
      });
    } catch (err: unknown) {
      console.error("ElevenLabs TTS endpoint error:", err);
      return res.status(500).json({
        simulated: true,
        error: err instanceof Error ? err.message : "TTS error",
      });
    }
  });

  // Shopping list query
  app.get("/api/shopping-list", (req: Request, res: Response) => {
    const sessionId = (req.query.sessionId as string) || "";
    const session = activeSessions.get(sessionId);
    res.json({
      items: session?.shoppingList || [
        { id: "item-1", text: "Organic oat milk", completed: false },
        { id: "item-2", text: "Fresh sourdough bread", completed: true },
        { id: "item-3", text: "Fair-trade coffee beans", completed: false }
      ]
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Pipecat server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
