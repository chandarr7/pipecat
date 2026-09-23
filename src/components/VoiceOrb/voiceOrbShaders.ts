import { VoiceOrbState } from "./types";

export interface StateTheme {
  primaryColor: string;
  secondaryColor: string;
  glowColor: string;
  centerGlow: string;
  rotationSpeedMult: number;
  expansionTarget: number;
  ribbonAlpha: number;
  particleActivity: number;
}

export const STATE_THEMES: Record<VoiceOrbState, StateTheme> = {
  idle: {
    primaryColor: "#7047FF",
    secondaryColor: "#35246E",
    glowColor: "rgba(112, 71, 255, 0.25)",
    centerGlow: "rgba(112, 71, 255, 0.12)",
    rotationSpeedMult: 0.35,
    expansionTarget: 0.82,
    ribbonAlpha: 0.45,
    particleActivity: 0.3,
  },
  listening: {
    primaryColor: "#24D8ED",
    secondaryColor: "#7047FF",
    glowColor: "rgba(36, 216, 237, 0.4)",
    centerGlow: "rgba(36, 216, 237, 0.18)",
    rotationSpeedMult: 0.85,
    expansionTarget: 1.05,
    ribbonAlpha: 0.75,
    particleActivity: 0.7,
  },
  user_speaking: {
    primaryColor: "#20E99A",
    secondaryColor: "#7047FF",
    glowColor: "rgba(32, 233, 154, 0.55)",
    centerGlow: "rgba(32, 233, 154, 0.28)",
    rotationSpeedMult: 1.4,
    expansionTarget: 1.25,
    ribbonAlpha: 0.95,
    particleActivity: 1.3,
  },
  thinking: {
    primaryColor: "#845CFF",
    secondaryColor: "#24D8ED",
    glowColor: "rgba(132, 92, 255, 0.5)",
    centerGlow: "rgba(132, 92, 255, 0.25)",
    rotationSpeedMult: 2.1,
    expansionTarget: 0.92,
    ribbonAlpha: 0.85,
    particleActivity: 0.9,
  },
  assistant_speaking: {
    primaryColor: "#7047FF",
    secondaryColor: "#24D8ED",
    glowColor: "rgba(112, 71, 255, 0.65)",
    centerGlow: "rgba(36, 216, 237, 0.32)",
    rotationSpeedMult: 1.25,
    expansionTarget: 1.28,
    ribbonAlpha: 0.92,
    particleActivity: 1.4,
  },
  error: {
    primaryColor: "#FF6269",
    secondaryColor: "#35246E",
    glowColor: "rgba(255, 98, 105, 0.4)",
    centerGlow: "rgba(255, 98, 105, 0.2)",
    rotationSpeedMult: 0.2,
    expansionTarget: 0.85,
    ribbonAlpha: 0.5,
    particleActivity: 0.25,
  },
};

/**
 * Spring interpolation helper
 */
export class SpringScalar {
  value: number;
  target: number;
  velocity: number;
  stiffness: number;
  damping: number;

  constructor(initial: number = 0, stiffness: number = 0.08, damping: number = 0.72) {
    this.value = initial;
    this.target = initial;
    this.velocity = 0;
    this.stiffness = stiffness;
    this.damping = damping;
  }

  update(): number {
    const force = (this.target - this.value) * this.stiffness;
    this.velocity = (this.velocity + force) * this.damping;
    this.value += this.velocity;
    return this.value;
  }

  setTarget(target: number): void {
    this.target = target;
  }

  reset(val: number): void {
    this.value = val;
    this.target = val;
    this.velocity = 0;
  }
}
