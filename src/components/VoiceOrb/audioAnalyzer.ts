import { AudioMetrics } from "./types";

export class AudioPipelineAnalyzer {
  private audioContext: AudioContext | null = null;
  private micStream: MediaStream | null = null;
  private micSource: MediaStreamAudioSourceNode | null = null;
  private elementSource: MediaElementAudioSourceNode | null = null;
  private analyser: AnalyserNode | null = null;
  private timeDomainBuffer: Uint8Array | null = null;
  private frequencyBuffer: Uint8Array | null = null;

  // Smoothed metrics to avoid visual jitter
  private smoothedRms = 0;
  private smoothedBass = 0;
  private smoothedMids = 0;
  private smoothedHighs = 0;
  private voiceActiveCount = 0;

  // Smoothing weights
  private readonly attack = 0.35;
  private readonly decay = 0.15;
  private readonly vadThreshold = 0.035;

  private isRunning = false;

  async initMicrophone(): Promise<MediaStream> {
    if (this.micStream && this.micStream.active) {
      return this.micStream;
    }

    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

    if (!this.audioContext || this.audioContext.state === "closed") {
      this.audioContext = new AudioContextClass();
    }

    if (this.audioContext.state === "suspended") {
      await this.audioContext.resume();
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    this.micStream = stream;
    this.setupAnalyser();

    this.micSource = this.audioContext.createMediaStreamSource(stream);
    if (this.analyser) {
      this.micSource.connect(this.analyser);
    }

    this.isRunning = true;
    return stream;
  }

  attachAudioElement(audioElement: HTMLAudioElement): void {
    if (!this.audioContext || this.audioContext.state === "closed") {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioContext = new AudioContextClass();
    }

    if (this.audioContext.state === "suspended") {
      this.audioContext.resume().catch(() => {});
    }

    this.setupAnalyser();

    try {
      if (!this.elementSource && this.analyser) {
        this.elementSource = this.audioContext.createMediaElementSource(audioElement);
        this.elementSource.connect(this.analyser);
        this.analyser.connect(this.audioContext.destination);
      }
    } catch {
      // Element might already be hooked or CORS-restricted
    }
  }

  private setupAnalyser(): void {
    if (!this.audioContext || this.analyser) return;

    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 512;
    this.analyser.smoothingTimeConstant = 0.75;
    this.analyser.minDecibels = -90;
    this.analyser.maxDecibels = -10;

    this.timeDomainBuffer = new Uint8Array(this.analyser.fftSize);
    this.frequencyBuffer = new Uint8Array(this.analyser.frequencyBinCount);
  }

  getMetrics(): AudioMetrics {
    if (!this.analyser || !this.timeDomainBuffer || !this.frequencyBuffer || !this.isRunning) {
      return {
        rms: 0,
        spectralCentroid: 0,
        bass: 0,
        mids: 0,
        highs: 0,
        isVoiceActive: false,
      };
    }

    // Capture time-domain & frequency data
    // Cast to Uint8Array<ArrayBuffer> for TS 5.7+ Web Audio compatibility
    this.analyser.getByteTimeDomainData(this.timeDomainBuffer as unknown as Uint8Array<ArrayBuffer>);
    this.analyser.getByteFrequencyData(this.frequencyBuffer as unknown as Uint8Array<ArrayBuffer>);

    // Compute true RMS (Root Mean Square)
    let sumSquares = 0;
    for (let i = 0; i < this.timeDomainBuffer.length; i++) {
      const norm = (this.timeDomainBuffer[i] - 128) / 128;
      sumSquares += norm * norm;
    }
    const rawRms = Math.sqrt(sumSquares / this.timeDomainBuffer.length);

    // Compute frequency bands
    const binCount = this.frequencyBuffer.length;
    const sampleRate = this.audioContext ? this.audioContext.sampleRate : 44100;
    const hzPerBin = sampleRate / (binCount * 2);

    // Bass: 20Hz - 250Hz
    const bassEndBin = Math.min(binCount, Math.max(1, Math.floor(250 / hzPerBin)));
    let bassSum = 0;
    for (let i = 0; i < bassEndBin; i++) {
      bassSum += this.frequencyBuffer[i] / 255;
    }
    const rawBass = bassSum / Math.max(1, bassEndBin);

    // Mids: 250Hz - 2500Hz
    const midsEndBin = Math.min(binCount, Math.max(bassEndBin + 1, Math.floor(2500 / hzPerBin)));
    let midsSum = 0;
    for (let i = bassEndBin; i < midsEndBin; i++) {
      midsSum += this.frequencyBuffer[i] / 255;
    }
    const rawMids = midsSum / Math.max(1, midsEndBin - bassEndBin);

    // Highs: 2500Hz - 8000Hz
    const highsEndBin = Math.min(binCount, Math.max(midsEndBin + 1, Math.floor(8000 / hzPerBin)));
    let highsSum = 0;
    for (let i = midsEndBin; i < highsEndBin; i++) {
      highsSum += this.frequencyBuffer[i] / 255;
    }
    const rawHighs = highsSum / Math.max(1, highsEndBin - midsEndBin);

    // Spectral centroid (brightness / harmonic center)
    let weightedFreqSum = 0;
    let totalMagnitude = 0;
    for (let i = 0; i < binCount; i++) {
      const magnitude = this.frequencyBuffer[i];
      weightedFreqSum += i * magnitude;
      totalMagnitude += magnitude;
    }
    const spectralCentroid = totalMagnitude > 0 ? (weightedFreqSum / totalMagnitude) / binCount : 0;

    // Apply attack/decay envelope smoothing
    this.smoothedRms += (rawRms - this.smoothedRms) * (rawRms > this.smoothedRms ? this.attack : this.decay);
    this.smoothedBass += (rawBass - this.smoothedBass) * (rawBass > this.smoothedBass ? this.attack : this.decay);
    this.smoothedMids += (rawMids - this.smoothedMids) * (rawMids > this.smoothedMids ? this.attack : this.decay);
    this.smoothedHighs += (rawHighs - this.smoothedHighs) * (rawHighs > this.smoothedHighs ? this.attack : this.decay);

    // Voice Activity Detection with hysteresis
    if (this.smoothedRms > this.vadThreshold) {
      this.voiceActiveCount = Math.min(10, this.voiceActiveCount + 1);
    } else {
      this.voiceActiveCount = Math.max(0, this.voiceActiveCount - 1);
    }

    const isVoiceActive = this.voiceActiveCount > 2;

    return {
      rms: Math.min(1, Math.max(0, this.smoothedRms)),
      spectralCentroid: Math.min(1, Math.max(0, spectralCentroid)),
      bass: Math.min(1, Math.max(0, this.smoothedBass)),
      mids: Math.min(1, Math.max(0, this.smoothedMids)),
      highs: Math.min(1, Math.max(0, this.smoothedHighs)),
      isVoiceActive,
    };
  }

  stop(): void {
    this.isRunning = false;
    if (this.micStream) {
      this.micStream.getTracks().forEach((track) => track.stop());
      this.micStream = null;
    }
    if (this.micSource) {
      this.micSource.disconnect();
      this.micSource = null;
    }
    if (this.elementSource) {
      this.elementSource.disconnect();
      this.elementSource = null;
    }
    if (this.audioContext && this.audioContext.state !== "closed") {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
    this.analyser = null;
  }
}
