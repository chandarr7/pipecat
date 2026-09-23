import type { BotTemplate } from './types';
import type { TransportType } from './lib/transports';

export const PROJECT_NAME = 'Tilted Studio';
export const PLATFORM_TAGLINE = 'Pyvex Voice — Ultra-Low-Latency Multimodal AI';

export { type TransportType };

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
}

export const ELEVENLABS_FEMALE_VOICES: ElevenLabsVoice[] = [
  {
    id: '21m00Tcm4TlvDq8ikWAM',
    name: 'Rachel',
    gender: 'female',
    description: 'Calm, warm, and natural conversational American voice (Default)',
  },
  {
    id: 'EXAVITQu4vr4xnSDxMaL',
    name: 'Sarah',
    gender: 'female',
    description: 'Soft, articulate, and professional news-style voice',
  },
  {
    id: 'Xb7hH8MSUJpSbSDYk0k2',
    name: 'Alice',
    gender: 'female',
    description: 'Confident, clear, and articulate British voice',
  },
  {
    id: 'piTKgcLEGmPE4e6mEKli',
    name: 'Nicole',
    gender: 'female',
    description: 'Gentle, whispering, and soothing narrative voice',
  },
];

export const DEFAULT_ELEVENLABS_VOICE = ELEVENLABS_FEMALE_VOICES[0];

export const BOT_TEMPLATES: BotTemplate[] = [
  {
    id: 'voice-assistant',
    name: 'Voice Assistant',
    description: 'Conversational assistant with streaming STT, LLM context aggregation, and ElevenLabs female voice TTS.',
    category: 'Assistant',
    features: ['Low latency turn-taking', 'Context aggregation', 'ElevenLabs Rachel (Female) TTS', 'Smart interruptions'],
    pipeline: {
      stt: 'Deepgram (Nova-2)',
      llm: 'Gemini 2.5 Flash',
      tts: 'ElevenLabs (Rachel - Female)',
      transport: 'SmallWebRTC / WebSocket',
    },
    samplePrompts: [
      'Tell me about the Tilted architecture and frame processing.',
      'How does user turn detection work in Tilted?',
      'Can you explain uninterrupted frames in pipeline tasks?',
    ],
  },
];
