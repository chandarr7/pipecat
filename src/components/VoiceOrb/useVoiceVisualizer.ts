import { useState, useRef, useEffect, useCallback } from "react";
import { VoiceOrbState, AudioMetrics } from "./types";
import { AudioPipelineAnalyzer } from "./audioAnalyzer";

export interface UseVoiceVisualizerOptions {
  initialState?: VoiceOrbState;
  onStateChange?: (state: VoiceOrbState) => void;
  onStartVoice?: () => Promise<void> | void;
  onEndVoice?: () => void;
  onInterrupt?: () => void;
  externalAudioElement?: HTMLAudioElement | null;
}

export function useVoiceVisualizer({
  initialState = "idle",
  onStateChange,
  onStartVoice,
  onEndVoice,
  onInterrupt,
  externalAudioElement,
}: UseVoiceVisualizerOptions = {}) {
  const [state, setState] = useState<VoiceOrbState>(initialState);
  const [isMuted, setIsMuted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const analyzerRef = useRef<AudioPipelineAnalyzer | null>(null);
  const metricsRef = useRef<AudioMetrics>({
    rms: 0,
    spectralCentroid: 0,
    bass: 0,
    mids: 0,
    highs: 0,
    isVoiceActive: false,
  });

  const stateRef = useRef<VoiceOrbState>(state);
  stateRef.current = state;

  const updateState = useCallback(
    (newState: VoiceOrbState) => {
      setState(newState);
      onStateChange?.(newState);
    },
    [onStateChange]
  );

  // Initialize or resume microphone audio analyzer
  const startSession = useCallback(async () => {
    try {
      setErrorMessage(null);
      if (!analyzerRef.current) {
        analyzerRef.current = new AudioPipelineAnalyzer();
      }

      await analyzerRef.current.initMicrophone();
      if (externalAudioElement) {
        analyzerRef.current.attachAudioElement(externalAudioElement);
      }

      updateState("listening");
      await onStartVoice?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Microphone access denied";
      setErrorMessage(msg);
      updateState("error");
    }
  }, [externalAudioElement, onStartVoice, updateState]);

  const endSession = useCallback(() => {
    if (analyzerRef.current) {
      analyzerRef.current.stop();
      analyzerRef.current = null;
    }
    updateState("idle");
    onEndVoice?.();
  }, [onEndVoice, updateState]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
  }, []);

  const triggerInterrupt = useCallback(() => {
    if (stateRef.current === "assistant_speaking" || stateRef.current === "thinking") {
      updateState("listening");
      onInterrupt?.();
    }
  }, [onInterrupt, updateState]);

  // Connect external audio element if provided (e.g. for assistant speech playback)
  useEffect(() => {
    if (externalAudioElement && analyzerRef.current) {
      analyzerRef.current.attachAudioElement(externalAudioElement);
    }
  }, [externalAudioElement]);

  // Audio metrics polling loop for audio-reactive states (VAD & barge-in)
  useEffect(() => {
    let animId: number;

    const poll = () => {
      if (analyzerRef.current) {
        const metrics = analyzerRef.current.getMetrics();
        metricsRef.current = isMuted
          ? { rms: 0, spectralCentroid: 0, bass: 0, mids: 0, highs: 0, isVoiceActive: false }
          : metrics;

        const currentState = stateRef.current;

        // VAD-driven transitions when listening
        if (currentState === "listening" && !isMuted) {
          if (metrics.isVoiceActive && metrics.rms > 0.05) {
            updateState("user_speaking");
          }
        } else if (currentState === "user_speaking" && !isMuted) {
          if (!metrics.isVoiceActive && metrics.rms < 0.03) {
            // User stopped speaking -> can revert to listening or trigger thinking
            updateState("listening");
          }
        } else if (
          (currentState === "assistant_speaking" || currentState === "thinking") &&
          !isMuted &&
          metrics.isVoiceActive &&
          metrics.rms > 0.12 // higher threshold for intentional barge-in
        ) {
          // Automatic acoustic barge-in
          updateState("user_speaking");
          onInterrupt?.();
        }
      }

      animId = requestAnimationFrame(poll);
    };

    animId = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(animId);
  }, [isMuted, onInterrupt, updateState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (analyzerRef.current) {
        analyzerRef.current.stop();
      }
    };
  }, []);

  return {
    state,
    setState: updateState,
    isMuted,
    toggleMute,
    errorMessage,
    startSession,
    endSession,
    triggerInterrupt,
    getMetrics: () => metricsRef.current,
  };
}
