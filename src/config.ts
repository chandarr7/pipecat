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
      'Tell me about the Pipecat architecture and frame processing.',
      'How does user turn detection work in Pipecat?',
      'Can you explain uninterrupted frames in pipeline tasks?',
    ],
  },
  {
    id: 'shopping-list',
    name: 'Shopping List UIWorker',
    description: 'Every voice turn drives screen UI state while speech is incidental. Uses the dual-worker pattern with ElevenLabs TTS.',
    category: 'Multi-Worker',
    features: ['Dual-worker orchestration', 'Silent UI state updates', 'ElevenLabs female voice feedback'],
    pipeline: {
      stt: 'Deepgram STT',
      llm: 'Gemini 2.5 Flash',
      tts: 'ElevenLabs (Rachel - Female)',
      transport: 'SmallWebRTC',
      workers: ['PipelineWorker (main voice)', 'UIWorker (list manager)'],
    },
    samplePrompts: [
      'Add 2 cartons of oat milk and organic sourdough bread.',
      'Check off the bread from the list.',
      'What items are left on my shopping list?',
    ],
  },
  {
    id: 'form-fill',
    name: 'Form Fill Accessibility',
    description: 'Voice-directed form navigation and validation with visual field highlights and error announcements.',
    category: 'Multi-Worker',
    features: ['Field focus synchronization', 'Spoken validation', 'Auto-fill correction'],
    pipeline: {
      stt: 'Deepgram STT',
      llm: 'OpenAI GPT-4o / Gemini',
      tts: 'ElevenLabs (Rachel - Female)',
      transport: 'SmallWebRTC',
      workers: ['PipelineWorker', 'FormWorker'],
    },
    samplePrompts: [
      'Set my first name to Alex and email to alex@example.com.',
      'Can you review what fields are still missing?',
      'Submit the application now.',
    ],
  },
  {
    id: 'parallel-debate',
    name: 'Parallel Debate Bot',
    description: 'Two autonomous LLM workers debating a topic in real-time orchestrated by a moderator pipeline.',
    category: 'Specialized',
    features: ['Inter-worker job bus', 'Autonomous debate rounds', 'Dynamic turn arbitration'],
    pipeline: {
      stt: 'Deepgram STT',
      llm: 'Dual Gemini 2.5 Agents',
      tts: 'ElevenLabs (Rachel & Sarah)',
      transport: 'SmallWebRTC',
      workers: ['ModeratorWorker', 'AffirmativeDebater', 'OpposingDebater'],
    },
    samplePrompts: [
      'Debate the merits of local edge AI vs cloud APIs.',
      'Pause the debate and summarize the key arguments.',
    ],
  },
];
