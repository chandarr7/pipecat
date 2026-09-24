export type VisualizerState = "connecting" | "thinking" | "speaking" | "silent";

/** A frequency band as an inclusive range of FFT bin indices. */
export interface VisualizerBand {
  startBin: number;
  endBin: number;
}

const MIN_VOICE_FREQ_HZ = 80;
const MAX_VOICE_FREQ_HZ = 8000;

/**
 * Mel-scale frequency bands spanning the voice range, expressed as FFT bin
 * ranges. Mel spacing gives lower (more perceptually significant) frequencies
 * more bars than an even linear split would.
 */
export function createVoiceBands(
  barCount: number,
  sampleRate: number,
  frequencyBinCount: number,
): VisualizerBand[] {
  const nyquist = sampleRate / 2;
  const maxFreq = Math.min(MAX_VOICE_FREQ_HZ, nyquist);
  const hzToMel = (hz: number) => 2595 * Math.log10(1 + hz / 700);
  const melToHz = (mel: number) => 700 * (10 ** (mel / 2595) - 1);

  const minMel = hzToMel(MIN_VOICE_FREQ_HZ);
  const maxMel = hzToMel(maxFreq);

  const freqToBin = (hz: number) =>
    Math.min(frequencyBinCount - 1, Math.round((hz / nyquist) * frequencyBinCount));

  const bands: VisualizerBand[] = [];
  for (let i = 0; i < barCount; i++) {
    const melStart = minMel + ((maxMel - minMel) * i) / barCount;
    const melEnd = minMel + ((maxMel - minMel) * (i + 1)) / barCount;
    const startBin = freqToBin(melToHz(melStart));
    const endBin = Math.max(startBin, freqToBin(melToHz(melEnd)) - 1);
    bands.push({ startBin, endBin });
  }
  return bands;
}

/** Average magnitude (0–255) of a spectrum snapshot over a band's bins. */
export function readBand(spectrum: Uint8Array, band: VisualizerBand): number {
  const { startBin, endBin } = band;
  let sum = 0;
  let count = 0;
  for (let bin = startBin; bin <= endBin && bin < spectrum.length; bin++) {
    sum += spectrum[bin]!;
    count++;
  }
  return count > 0 ? sum / count : 0;
}

/**
 * Creates a Web Audio analyser fed by a media track. Callers should call
 * `dispose()` when the track changes or the component unmounts.
 */
export function createVisualizerAnalyser(track: MediaStreamTrack): {
  analyser: AnalyserNode;
  dispose: () => void;
} {
  const audioContext = new AudioContext();
  const stream = new MediaStream([track]);
  const source = audioContext.createMediaStreamSource(stream);
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 1024;
  analyser.smoothingTimeConstant = 0.6;
  source.connect(analyser);

  const dispose = () => {
    source.disconnect();
    if (audioContext.state !== "closed") {
      audioContext.close().catch(() => {});
    }
  };

  return { analyser, dispose };
}

/**
 * Resolves "currentColor", a "--css-variable" name, or a literal CSS color
 * to a concrete value a canvas 2D context can use directly.
 */
export function resolveVisualizerColor(
  color: string,
  element: HTMLElement | null,
): string {
  if (!element || typeof window === "undefined") {
    return color === "currentColor" || color.startsWith("--") ? "black" : color;
  }
  const computed = window.getComputedStyle(element);
  if (color === "currentColor") {
    return computed.color || "black";
  }
  if (color.startsWith("--")) {
    const value = computed.getPropertyValue(color).trim();
    return value || "black";
  }
  return color;
}
