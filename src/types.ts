export type TransportType = 'smallwebrtc' | 'websocket' | 'mock';

export type TTSProviderType = 'elevenlabs' | 'cartesia' | 'deepgram' | 'webspeech';

export interface BotTTSConfig {
  provider: TTSProviderType;
  model: string;
  voiceId: string;
  voiceName: string;
  stability?: number;
  similarityBoost?: number;
}

export interface BotTemplate {
  id: string;
  name: string;
  description: string;
  category: 'Assistant' | 'Multi-Worker' | 'Specialized' | 'Telephony';
  features: string[];
  ttsProvider?: TTSProviderType;
  ttsConfig?: BotTTSConfig;
  pipeline: {
    stt: string;
    llm: string;
    tts: string;
    transport: string;
    workers?: string[];
  };
  samplePrompts: string[];
}

export interface PipelineEventItem {
  id: string;
  timestamp: string;
  type: string;
  direction: 'downstream' | 'upstream';
  summary: string;
  details?: Record<string, unknown>;
}

export interface SimulationSession {
  sessionId: string;
  botId: string;
  status: 'idle' | 'ready' | 'active' | 'speaking' | 'listening';
  createdAt: string;
}

export interface WorkerOperator {
  id: string;
  name: string;
  email: string;
  role: 'Super Administrator' | 'Worker Operator' | 'UI Controller' | 'Pipeline Supervisor';
  cluster: string;
  authType: 'google' | 'credentials' | 'demo';
  avatarUrl?: string;
  lastLogin: string;
}
