import { SpiralRibbonConfig, OrbParticle, AudioMetrics } from "./types";

export interface ProjectedPoint {
  x: number;
  y: number;
  z: number;
  scale: number;
  alpha: number;
}

export function createDefaultRibbons(): SpiralRibbonConfig[] {
  return [
    {
      id: "primary-electric",
      strandCount: 64,
      baseRadius: 36,
      pitch: 1.85,
      phaseOffset: 0,
      speed: 0.0016,
      colorStart: "#7047FF", // Electric Purple
      colorEnd: "#845CFF",   // Bright Neon Violet
      glowColor: "rgba(112, 71, 255, 0.45)",
      width: 2.8,
      depthZ: 45,
      sensitivity: {
        amplitude: 1.4,
        mids: 1.8,
        highs: 1.2,
      },
    },
    {
      id: "cyan-frequency",
      strandCount: 58,
      baseRadius: 42,
      pitch: 1.65,
      phaseOffset: Math.PI * 0.5,
      speed: -0.0013,
      colorStart: "#24D8ED", // Cyan Frequency
      colorEnd: "#7047FF",   // Electric Purple
      glowColor: "rgba(36, 216, 237, 0.4)",
      width: 2.2,
      depthZ: -35,
      sensitivity: {
        amplitude: 1.1,
        mids: 1.2,
        highs: 2.2,
      },
    },
    {
      id: "emerald-resonance",
      strandCount: 52,
      baseRadius: 30,
      pitch: 2.1,
      phaseOffset: Math.PI * 1.1,
      speed: 0.0019,
      colorStart: "#20E99A", // Emerald Active
      colorEnd: "#24D8ED",   // Cyan Frequency
      glowColor: "rgba(32, 233, 154, 0.35)",
      width: 1.9,
      depthZ: 25,
      sensitivity: {
        amplitude: 1.6,
        mids: 1.5,
        highs: 0.9,
      },
    },
    {
      id: "deep-indigo-core",
      strandCount: 48,
      baseRadius: 24,
      pitch: 2.3,
      phaseOffset: Math.PI * 1.6,
      speed: -0.0011,
      colorStart: "#845CFF",
      colorEnd: "#35246E",
      glowColor: "rgba(132, 92, 255, 0.3)",
      width: 3.2,
      depthZ: -20,
      sensitivity: {
        amplitude: 1.8,
        mids: 1.0,
        highs: 0.7,
      },
    },
  ];
}

export function generateOrbParticles(count: number): OrbParticle[] {
  const particles: OrbParticle[] = [];
  const palette = ["#7047FF", "#845CFF", "#24D8ED", "#20E99A", "#F4F2F8"];

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 20 + Math.random() * 85;
    const z = (Math.random() - 0.5) * 80;
    particles.push({
      x: Math.cos(angle) * dist,
      y: Math.sin(angle) * dist,
      z,
      radius: dist,
      angle,
      distFromCenter: dist,
      speed: (0.001 + Math.random() * 0.003) * (Math.random() > 0.5 ? 1 : -1),
      alpha: 0.2 + Math.random() * 0.7,
      color: palette[Math.floor(Math.random() * palette.length)],
      size: 1.2 + Math.random() * 2.2,
    });
  }

  return particles;
}

/**
 * 3D isometric/perspective projection with depth of field
 */
export function project3D(
  x: number,
  y: number,
  z: number,
  focalLength: number = 320,
  centerX: number = 0,
  centerY: number = 0
): ProjectedPoint {
  const distance = focalLength + z;
  const safeDistance = distance > 10 ? distance : 10;
  const scale = focalLength / safeDistance;

  // Natural depth fade
  const normalizedZ = Math.min(1, Math.max(-1, z / 100));
  const alpha = 0.35 + (normalizedZ + 1) * 0.325; // 0.35 front to 1.0

  return {
    x: centerX + x * scale,
    y: centerY + y * scale,
    z,
    scale,
    alpha: Math.min(1, Math.max(0.05, alpha)),
  };
}

/**
 * Procedural harmonic noise displacement along the spiral ribbon
 */
export function calculateHarmonicDisplacement(
  theta: number,
  time: number,
  metrics: AudioMetrics,
  config: SpiralRibbonConfig,
  stateIntensity: number
): number {
  // Harmonic waves simulating fluid eddies
  const wave1 = Math.sin(theta * 3.0 + time * 1.5) * 6;
  const wave2 = Math.cos(theta * 5.0 - time * 2.1) * 4;
  const wave3 = Math.sin(theta * 8.0 + time * 3.2) * 2;

  // Multi-band audio influence
  const bassDisplacement = metrics.bass * 22 * config.sensitivity.amplitude;
  const midsDisplacement = Math.sin(theta * 6 + time * 4) * (metrics.mids * 16 * config.sensitivity.mids);
  const highsDisplacement = Math.cos(theta * 12 + time * 7) * (metrics.highs * 9 * config.sensitivity.highs);

  const totalAudioDisp = (bassDisplacement + midsDisplacement + highsDisplacement) * stateIntensity;
  const ambientDisp = (wave1 + wave2 + wave3) * (0.4 + stateIntensity * 0.6);

  return ambientDisp + totalAudioDisp;
}
