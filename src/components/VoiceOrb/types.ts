export type VoiceOrbState =
  | "idle"
  | "listening"
  | "user_speaking"
  | "thinking"
  | "assistant_speaking"
  | "error";

export interface AudioMetrics {
  rms: number;          // Root Mean Square amplitude [0, 1]
  spectralCentroid: number; // Brightness / high-freq concentration
  bass: number;         // Low frequencies [0, 1]
  mids: number;         // Mid frequencies [0, 1]
  highs: number;        // High frequencies [0, 1]
  isVoiceActive: boolean;
}

export interface SpiralRibbonConfig {
  id: string;
  strandCount: number;
  baseRadius: number;
  pitch: number;
  phaseOffset: number;
  speed: number;
  colorStart: string;
  colorEnd: string;
  glowColor: string;
  width: number;
  depthZ: number;
  sensitivity: {
    amplitude: number;
    mids: number;
    highs: number;
  };
}

export interface OrbParticle {
  x: number;
  y: number;
  z: number;
  radius: number;
  angle: number;
  distFromCenter: number;
  speed: number;
  alpha: number;
  color: string;
  size: number;
}

export interface VoiceOrbProps {
  state?: VoiceOrbState;
  onStateChange?: (state: VoiceOrbState) => void;
  onStartVoice?: () => Promise<void> | void;
  onEndVoice?: () => void;
  onMuteToggle?: (muted: boolean) => void;
  onInterrupt?: () => void;
  isMuted?: boolean;
  activeTranscript?: string;
  lastSpeakerText?: string;
  voiceName?: string;
  errorMessage?: string;
  className?: string;
  externalAudioStream?: MediaStream | null;
  externalAudioElement?: HTMLAudioElement | null;
}
