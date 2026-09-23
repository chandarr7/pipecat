export type TransportType = 'smallwebrtc' | 'websocket' | 'mock';

export interface BotTemplate {
  id: string;
  name: string;
  description: string;
  category: 'Assistant' | 'Multi-Worker' | 'Specialized' | 'Telephony';
  features: string[];
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
