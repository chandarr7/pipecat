import type { BotTemplate, TTSProviderType, BotTTSConfig } from './types';
import type { TransportType } from './lib/transports';

export const PROJECT_NAME = 'Tilted Studio';
export const PLATFORM_TAGLINE = 'Pyvex Voice — Ultra-Low-Latency Multimodal AI';

export { type TransportType, type TTSProviderType, type BotTTSConfig };

export const AVAILABLE_TRANSPORTS: TransportType[] = [
  'smallwebrtc',
  'websocket',
  'mock',
];

export const TRANSPORT_LABELS: Record<TransportType, string> = {
  daily: 'Daily WebRTC',
  smallwebrtc: 'SmallWebRTC',
  'small-webrtc': 'SmallWebRTC',
  websocket: 'WebSocket',
  moq: 'Media over QUIC',
  livekit: 'LiveKit',
  mock: 'Pipeline Simulator',
};

export const DEFAULT_TRANSPORT: TransportType = 'smallwebrtc';

export interface ElevenLabsVoice {
  id: string;
  name: string;
  gender: 'female' | 'male';
  description: string;
  previewUrl?: string;
}

export const ELEVENLABS_FEMALE_VOICES: ElevenLabsVoice[] = [
  {
    id: 'EXAVITQu4vr4xnSDxMaL',
    name: 'Sarah',
    gender: 'female',
    description: 'Mature, reassuring, confident voice (Default Premade)',
  },
  {
    id: 'Xb7hH8MSUJpSbSDYk0k2',
    name: 'Alice',
    gender: 'female',
    description: 'Clear, engaging educator with British accent',
  },
  {
    id: 'cgSgspJ2msm6clMCkdW9',
    name: 'Jessica',
    gender: 'female',
    description: 'Playful, bright, warm American female voice',
  },
  {
    id: 'hpp4J3VqNfWAUOO0d1Us',
    name: 'Bella',
    gender: 'female',
    description: 'Warm, professional, bright narrative quality',
  },
  {
    id: 'pFZP5JQG7iQjIQuC4Bku',
    name: 'Lily',
    gender: 'female',
    description: 'Velvety British female voice with warmth and clarity',
  },
];

export const DEFAULT_ELEVENLABS_VOICE = ELEVENLABS_FEMALE_VOICES[0];

export const ELEVENLABS_MODELS = [
  { id: 'eleven_turbo_v2_5', name: 'Eleven Turbo v2.5 (Fastest, ~100ms)' },
  { id: 'eleven_multilingual_v2', name: 'Eleven Multilingual v2 (Rich Expressiveness)' },
  { id: 'eleven_monolingual_v1', name: 'Eleven Monolingual v1 (Standard)' },
];

export const DEFAULT_ELEVENLABS_MODEL = 'eleven_turbo_v2_5';

/**
 * Retrieves the ElevenLabs API Key from Vite environment variables.
 */
export function getElevenLabsApiKey(): string | null {
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_ELEVENLABS_API_KEY) {
    return import.meta.env.VITE_ELEVENLABS_API_KEY;
  }
  return null;
}

/**
 * Default ElevenLabs TTS configuration for bots.
 */
export const DEFAULT_ELEVENLABS_TTS_CONFIG: BotTTSConfig = {
  provider: 'elevenlabs',
  model: DEFAULT_ELEVENLABS_MODEL,
  voiceId: DEFAULT_ELEVENLABS_VOICE.id,
  voiceName: DEFAULT_ELEVENLABS_VOICE.name,
  stability: 0.5,
  similarityBoost: 0.8,
};

export const BOT_TEMPLATES: BotTemplate[] = [
  {
    id: 'voice-assistant',
    name: 'ElevenLabs Voice Assistant',
    description: 'Conversational assistant with streaming STT, LLM context aggregation, and ElevenLabs Turbo v2.5 TTS.',
    category: 'Assistant',
    ttsProvider: 'elevenlabs',
    ttsConfig: {
      provider: 'elevenlabs',
      model: 'eleven_turbo_v2_5',
      voiceId: 'EXAVITQu4vr4xnSDxMaL',
      voiceName: 'Sarah',
      stability: 0.5,
      similarityBoost: 0.8,
    },
    features: [
      'ElevenLabs Turbo v2.5 Neural TTS',
      'Low latency turn-taking (~180ms)',
      'Pipecat LLM Context aggregation',
      'Configurable female premade voices',
    ],
    pipeline: {
      stt: 'Deepgram (Nova-2)',
      llm: 'Gemini 2.5 Flash',
      tts: 'ElevenLabs (Turbo v2.5 - Sarah)',
      transport: 'SmallWebRTC / WebSocket',
    },
    samplePrompts: [
      'Tell me about the Tilted architecture and frame processing.',
      'How does user turn detection work in Tilted?',
      'Can you explain uninterrupted frames in pipeline tasks?',
    ],
  },
  {
    id: 'customer-support',
    name: 'Customer Support Agent',
    description: 'Empathetic support agent utilizing ElevenLabs for clear, natural conversational tone.',
    category: 'Specialized',
    ttsProvider: 'elevenlabs',
    ttsConfig: {
      provider: 'elevenlabs',
      model: 'eleven_turbo_v2_5',
      voiceId: 'cgSgspJ2msm6clMCkdW9',
      voiceName: 'Jessica',
      stability: 0.6,
      similarityBoost: 0.85,
    },
    features: [
      'ElevenLabs Jessica Voice Synthesis',
      'Support ticket resolution context',
      'Active turn interruption guard',
    ],
    pipeline: {
      stt: 'Deepgram (Nova-2)',
      llm: 'Gemini 2.5 Flash',
      tts: 'ElevenLabs (Jessica - Friendly)',
      transport: 'SmallWebRTC / WebSocket',
    },
    samplePrompts: [
      'I need assistance with my multi-worker cluster configuration.',
      'How do I test my audio synthesis and verify API status?',
    ],
  },
  {
    id: 'multi-worker-coordinator',
    name: 'Multi-Worker Supervisor',
    description: 'WorkerRunner and WorkerBus supervisor providing real-time voice alerts through ElevenLabs.',
    category: 'Multi-Worker',
    ttsProvider: 'elevenlabs',
    ttsConfig: {
      provider: 'elevenlabs',
      model: 'eleven_turbo_v2_5',
      voiceId: 'Xb7hH8MSUJpSbSDYk0k2',
      voiceName: 'Alice',
      stability: 0.55,
      similarityBoost: 0.8,
    },
    features: [
      'WorkerBus event audio notifications',
      'ElevenLabs Alice (British) TTS',
      'Multi-agent pipeline supervision',
    ],
    pipeline: {
      stt: 'Deepgram (Nova-2)',
      llm: 'Gemini 2.5 Flash',
      tts: 'ElevenLabs (Alice - British)',
      transport: 'SmallWebRTC / WebSocket',
      workers: ['PipelineWorker', 'LLMContextWorker', 'WorkerRegistry', 'BusBridgeProxy'],
    },
    samplePrompts: [
      'Report status of all local and bridged worker nodes.',
      'Simulate an asynchronous job handoff through the bus.',
    ],
  },
];

/**
 * Resolves the TTS configuration for a given bot template or fallback.
 */
export function getBotTtsConfig(botId?: string): BotTTSConfig {
  const bot = BOT_TEMPLATES.find((b) => b.id === botId);
  if (bot?.ttsConfig) {
    return bot.ttsConfig;
  }
  return DEFAULT_ELEVENLABS_TTS_CONFIG;
}

