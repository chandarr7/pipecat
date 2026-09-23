import { AudioMetrics, VoiceOrbState, OrbParticle } from "./types";
import {
  createDefaultRibbons,
  generateOrbParticles,
  project3D,
  calculateHarmonicDisplacement,
} from "./spiralGeometry";
import { STATE_THEMES, SpringScalar } from "./voiceOrbShaders";

export class VoiceOrbRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private animFrameId: number | null = null;

  // Geometry & Particles
  private ribbons = createDefaultRibbons();
  private particles: OrbParticle[] = [];

  // Springs for smooth organic transitions
  private scaleSpring = new SpringScalar(1.0, 0.07, 0.75);
  private intensitySpring = new SpringScalar(0.0, 0.1, 0.7);
  private rotationSpring = new SpringScalar(0.001, 0.05, 0.8);

  // Animation timeline
  private time = 0;
  private globalRotation = 0;
  private tiltX = 0.22; // subtle isometric perspective
  private tiltY = 0.15;

  private currentState: VoiceOrbState = "idle";
  private currentMetrics: AudioMetrics = {
    rms: 0,
    spectralCentroid: 0,
    bass: 0,
    mids: 0,
    highs: 0,
    isVoiceActive: false,
  };

  private reducedMotion = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext("2d", { alpha: true });
    if (!context) {
      throw new Error("Unable to obtain 2D rendering context for VoiceOrb");
    }
    this.ctx = context;
    this.particles = generateOrbParticles(120);

    // Detect prefers-reduced-motion
    if (typeof window !== "undefined" && window.matchMedia) {
      this.reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }

    this.resize();
  }

  resize(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = this.canvas.getBoundingClientRect();
    const width = rect.width || 320;
    const height = rect.height || 320;

    this.canvas.width = Math.floor(width * dpr);
    this.canvas.height = Math.floor(height * dpr);

    this.ctx.resetTransform?.();
    this.ctx.scale(dpr, dpr);
  }

  setState(state: VoiceOrbState): void {
    this.currentState = state;
    const theme = STATE_THEMES[state] || STATE_THEMES.idle;
    this.scaleSpring.setTarget(theme.expansionTarget);
    this.rotationSpring.setTarget(theme.rotationSpeedMult * (this.reducedMotion ? 0.2 : 1.0));
  }

  setMetrics(metrics: AudioMetrics): void {
    this.currentMetrics = metrics;

    // Modulate scale and intensity by speech amplitude and bass
    const theme = STATE_THEMES[this.currentState] || STATE_THEMES.idle;
    const audioExpansion = metrics.rms * 0.45 + metrics.bass * 0.25;
    this.scaleSpring.setTarget(theme.expansionTarget + audioExpansion);

    const activeIntensity = metrics.isVoiceActive ? 1.0 : metrics.rms * 1.5;
    this.intensitySpring.setTarget(Math.min(1.5, activeIntensity));
  }

  start(): void {
    if (this.animFrameId) return;

    let lastTime = performance.now();

    const loop = (now: number) => {
      const delta = Math.min(50, now - lastTime);
      lastTime = now;

      this.update(delta);
      this.render();

      this.animFrameId = requestAnimationFrame(loop);
    };

    this.animFrameId = requestAnimationFrame(loop);
  }

  stop(): void {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  private update(delta: number): void {
    const deltaSec = delta / 1000;
    this.time += deltaSec;

    const currentScale = this.scaleSpring.update();
    const currentIntensity = this.intensitySpring.update();
    const rotSpeed = this.rotationSpring.update();

    // Rotate the overall orb
    this.globalRotation += rotSpeed * deltaSec * 0.8;

    // Thinking state has distinct inward rotation
    if (this.currentState === "thinking") {
      this.globalRotation -= deltaSec * 1.6;
    }

    // Update 3D orbiting particles
    const theme = STATE_THEMES[this.currentState];
    const particleSpeedMultiplier = (theme.particleActivity + this.currentMetrics.highs * 2.0) * (this.reducedMotion ? 0.3 : 1.0);

    for (const p of this.particles) {
      p.angle += p.speed * particleSpeedMultiplier;
      p.z += Math.sin(this.time * 2 + p.angle) * 0.3;

      // Radial displacement from audio highs & centroid
      const activeRadius = p.distFromCenter * currentScale + (this.currentMetrics.highs * 15);
      p.x = Math.cos(p.angle) * activeRadius;
      p.y = Math.sin(p.angle) * activeRadius;
    }
  }

  private render(): void {
    const ctx = this.ctx;
    const rect = this.canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const centerX = width / 2;
    const centerY = height / 2;

    // Clear frame
    ctx.clearRect(0, 0, width, height);

    const theme = STATE_THEMES[this.currentState] || STATE_THEMES.idle;
    const currentScale = this.scaleSpring.value;
    const currentIntensity = this.intensitySpring.value;

    // 1. Ambient Central Core Glow
    const coreRadius = Math.max(10, 48 * currentScale);
    const ambientGrad = ctx.createRadialGradient(
      centerX,
      centerY,
      coreRadius * 0.15,
      centerX,
      centerY,
      coreRadius * 2.2
    );
    ambientGrad.addColorStop(0, theme.centerGlow);
    ambientGrad.addColorStop(0.5, theme.glowColor);
    ambientGrad.addColorStop(1, "rgba(0, 0, 0, 0)");

    ctx.save();
    ctx.fillStyle = ambientGrad;
    ctx.beginPath();
    ctx.arc(centerX, centerY, coreRadius * 2.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 2. Render 3D Spiral Ribbons
    ctx.save();
    for (const ribbon of this.ribbons) {
      const strandPoints: { x: number; y: number; z: number; alpha: number }[] = [];
      const totalStrands = ribbon.strandCount;
      const ribbonPhase = ribbon.phaseOffset + this.globalRotation + (this.time * ribbon.speed * 1000);

      for (let i = 0; i < totalStrands; i++) {
        const stepNorm = i / totalStrands; // 0 to 1
        // Archimedean spiral basis: r = a + b*theta
        const theta = stepNorm * Math.PI * 4.2;
        const baseR = (ribbon.baseRadius + theta * ribbon.pitch * 9.5) * currentScale;

        // Add harmonic wave & audio displacement
        const displacement = calculateHarmonicDisplacement(
          theta,
          this.time,
          this.currentMetrics,
          ribbon,
          currentIntensity
        );

        const r = Math.max(8, baseR + displacement);

        // 3D Cartesian coordinates
        const angle = theta + ribbonPhase;
        const x3d = r * Math.cos(angle);
        const y3d = r * Math.sin(angle);
        const z3d = ribbon.depthZ + Math.sin(theta * 2 + this.time * 2) * 18 * currentScale;

        // Apply 3D tilt rotation
        const cosTiltX = Math.cos(this.tiltX);
        const sinTiltX = Math.sin(this.tiltX);
        const cosTiltY = Math.cos(this.tiltY);
        const sinTiltY = Math.sin(this.tiltY);

        // Rotate around Y then X
        const xRot = x3d * cosTiltY + z3d * sinTiltY;
        const zRotTemp = -x3d * sinTiltY + z3d * cosTiltY;
        const yRot = y3d * cosTiltX - zRotTemp * sinTiltX;
        const zRot = y3d * sinTiltX + zRotTemp * cosTiltX;

        // Project onto 2D
        const proj = project3D(xRot, yRot, zRot, 300, centerX, centerY);
        strandPoints.push({
          x: proj.x,
          y: proj.y,
          z: proj.z,
          alpha: proj.alpha * theme.ribbonAlpha,
        });
      }

      // Draw Ribbon Path with smooth quadratic curve interpolation
      if (strandPoints.length > 2) {
        ctx.beginPath();
        ctx.moveTo(strandPoints[0].x, strandPoints[0].y);

        for (let i = 1; i < strandPoints.length - 1; i++) {
          const xc = (strandPoints[i].x + strandPoints[i + 1].x) / 2;
          const yc = (strandPoints[i].y + strandPoints[i + 1].y) / 2;
          ctx.quadraticCurveTo(strandPoints[i].x, strandPoints[i].y, xc, yc);
        }

        // Apply dynamic gradient along the ribbon
        const grad = ctx.createLinearGradient(
          strandPoints[0].x,
          strandPoints[0].y,
          strandPoints[strandPoints.length - 1].x,
          strandPoints[strandPoints.length - 1].y
        );
        grad.addColorStop(0, ribbon.colorStart);
        grad.addColorStop(0.7, ribbon.colorEnd);
        grad.addColorStop(1, "rgba(255, 255, 255, 0.15)");

        ctx.strokeStyle = grad;
        ctx.lineWidth = ribbon.width * currentScale;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.stroke();

        // Subtle soft ribbon glow pass
        ctx.lineWidth = ribbon.width * 2.8 * currentScale;
        ctx.strokeStyle = ribbon.glowColor;
        ctx.globalAlpha = 0.35;
        ctx.stroke();
        ctx.globalAlpha = 1.0;
      }
    }
    ctx.restore();

    // 3. Render Orbital 3D Particle Cloud
    ctx.save();
    for (const p of this.particles) {
      // Rotate particle around Y/X tilt
      const cosTiltX = Math.cos(this.tiltX);
      const sinTiltX = Math.sin(this.tiltX);
      const cosTiltY = Math.cos(this.tiltY);
      const sinTiltY = Math.sin(this.tiltY);

      const xRot = p.x * cosTiltY + p.z * sinTiltY;
      const zRotTemp = -p.x * sinTiltY + p.z * cosTiltY;
      const yRot = p.y * cosTiltX - zRotTemp * sinTiltX;
      const zRot = p.y * sinTiltX + zRotTemp * cosTiltX;

      const proj = project3D(xRot, yRot, zRot, 300, centerX, centerY);

      // Depth of field particle sizing
      const renderSize = Math.max(0.6, p.size * proj.scale * (1.0 + this.currentMetrics.highs * 0.8));
      const finalAlpha = Math.min(1.0, p.alpha * proj.alpha * (theme.particleActivity + this.currentMetrics.rms * 0.8));

      ctx.beginPath();
      ctx.arc(proj.x, proj.y, renderSize, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = finalAlpha;
      ctx.fill();

      // Sparkle on voice active high frequencies
      if (this.currentMetrics.highs > 0.4 && Math.random() > 0.85) {
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, renderSize * 2.2, 0, Math.PI * 2);
        ctx.fillStyle = "#FFFFFF";
        ctx.globalAlpha = finalAlpha * 0.6;
        ctx.fill();
      }
    }
    ctx.restore();

    // 4. Ethereal Inner Core Ring (Clean, quiet center)
    ctx.save();
    const innerRingRadius = Math.max(4, 14 * currentScale);
    ctx.beginPath();
    ctx.arc(centerX, centerY, innerRingRadius, 0, Math.PI * 2);
    ctx.strokeStyle = theme.primaryColor;
    ctx.globalAlpha = 0.45;
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Core tiny pulse beacon
    ctx.beginPath();
    ctx.arc(centerX, centerY, 3.5 * (1 + this.currentMetrics.rms * 1.5), 0, Math.PI * 2);
    ctx.fillStyle = theme.primaryColor;
    ctx.globalAlpha = 0.85;
    ctx.fill();
    ctx.restore();
  }

  destroy(): void {
    this.stop();
  }
}
