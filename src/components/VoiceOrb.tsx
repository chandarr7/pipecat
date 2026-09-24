import React, { useRef, useEffect } from "react";
import { Mic, Volume2, Sparkles, Radio } from "lucide-react";

export type VoiceState = "idle" | "listening" | "thinking" | "speaking";

interface VoiceOrbProps {
  state: VoiceState;
  audioLevel?: number; // 0 to 1
  frequencyData?: number[]; // Array of 0..1 values
  isMicActive?: boolean;
  onOrbClick?: () => void;
  voiceName?: string;
  size?: number; // default 280
  className?: string;
}

export const VoiceOrb: React.FC<VoiceOrbProps> = ({
  state,
  audioLevel = 0,
  frequencyData = [],
  isMicActive = false,
  onOrbClick,
  voiceName = "Sarah",
  size = 280,
  className = "",
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const phaseRef = useRef<number>(0);

  // State-specific palette and fluid water configurations
  const getTheme = () => {
    switch (state) {
      case "listening":
        return {
          waterBg: ["#041c30", "#062b48", "#031221"],
          waveLayers: [
            "rgba(0, 242, 254, 0.35)",
            "rgba(79, 172, 254, 0.55)",
            "rgba(36, 216, 237, 0.75)",
            "rgba(14, 116, 144, 0.9)",
          ],
          glowColor: "rgba(36, 216, 237, 0.45)",
          rimColor: "rgba(36, 216, 237, 0.85)",
          crestHighlight: "rgba(180, 250, 255, 0.9)",
          rippleColor: "rgba(36, 216, 237, 0.6)",
          speed: 0.045,
        };
      case "thinking":
        return {
          waterBg: ["#1c0a38", "#2d1054", "#0f0520"],
          waveLayers: [
            "rgba(168, 85, 247, 0.4)",
            "rgba(192, 132, 252, 0.55)",
            "rgba(244, 114, 182, 0.7)",
            "rgba(126, 34, 206, 0.9)",
          ],
          glowColor: "rgba(192, 132, 252, 0.5)",
          rimColor: "rgba(192, 132, 252, 0.85)",
          crestHighlight: "rgba(250, 210, 255, 0.9)",
          rippleColor: "rgba(192, 132, 252, 0.6)",
          speed: 0.06,
        };
      case "speaking":
        return {
          waterBg: ["#160c34", "#22134e", "#0c071e"],
          waveLayers: [
            "rgba(112, 71, 255, 0.4)",
            "rgba(132, 92, 255, 0.6)",
            "rgba(32, 233, 154, 0.65)",
            "rgba(49, 46, 129, 0.9)",
          ],
          glowColor: "rgba(132, 92, 255, 0.55)",
          rimColor: "rgba(132, 92, 255, 0.85)",
          crestHighlight: "rgba(215, 195, 255, 0.9)",
          rippleColor: "rgba(132, 92, 255, 0.6)",
          speed: 0.05,
        };
      case "idle":
      default:
        return {
          waterBg: ["#0b0e1a", "#12172a", "#080b14"],
          waveLayers: [
            "rgba(112, 71, 255, 0.25)",
            "rgba(132, 92, 255, 0.4)",
            "rgba(99, 102, 241, 0.5)",
            "rgba(30, 27, 75, 0.85)",
          ],
          glowColor: "rgba(112, 71, 255, 0.3)",
          rimColor: "rgba(112, 71, 255, 0.65)",
          crestHighlight: "rgba(196, 181, 253, 0.75)",
          rippleColor: "rgba(112, 71, 255, 0.4)",
          speed: 0.025,
        };
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let localPhase = phaseRef.current;
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;

    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const render = () => {
      ctx.clearRect(0, 0, size, size);
      const centerX = size / 2;
      const centerY = size / 2;
      const theme = getTheme();
      localPhase += theme.speed;
      phaseRef.current = localPhase;

      const energy = Math.min(Math.max(audioLevel, 0), 1);
      const orbRadius = size * 0.42;

      // 1. Soft Outer Atmospheric Glow Halo
      ctx.save();
      const glowGrad = ctx.createRadialGradient(
        centerX,
        centerY,
        orbRadius * 0.4,
        centerX,
        centerY,
        orbRadius * 1.32 + energy * 18
      );
      glowGrad.addColorStop(0, theme.glowColor);
      glowGrad.addColorStop(0.65, theme.glowColor.replace(/[\d.]+\)$/, "0.15)"));
      glowGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, orbRadius * 1.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 2. Outer Glass Ring / Sphere Perimeter
      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, orbRadius, 0, Math.PI * 2);
      ctx.strokeStyle = theme.rimColor;
      ctx.lineWidth = 2.5;
      ctx.shadowColor = theme.glowColor;
      ctx.shadowBlur = 20 + energy * 18;
      ctx.stroke();
      ctx.restore();

      // 3. Clip inside the orb to draw fluid water waves in the middle
      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, orbRadius - 1, 0, Math.PI * 2);
      ctx.clip();

      // 3a. Deep Water Ambient Background
      const bgGrad = ctx.createRadialGradient(
        centerX,
        centerY,
        0,
        centerX,
        centerY,
        orbRadius
      );
      bgGrad.addColorStop(0, theme.waterBg[0]);
      bgGrad.addColorStop(0.7, theme.waterBg[1]);
      bgGrad.addColorStop(1, theme.waterBg[2]);
      ctx.fillStyle = bgGrad;
      ctx.fillRect(centerX - orbRadius, centerY - orbRadius, orbRadius * 2, orbRadius * 2);

      // Water wave baseline in the middle of circle
      const baseLevel = centerY + (0.5 - energy * 0.4) * (orbRadius * 0.15);

      // Helper function to draw an undulating liquid water wave layer
      const drawWaterWave = (
        offsetY: number,
        amplitude: number,
        frequency: number,
        speed: number,
        fillColor: string | CanvasGradient,
        crestColor?: string
      ) => {
        ctx.beginPath();
        const startX = centerX - orbRadius - 10;
        const endX = centerX + orbRadius + 10;
        ctx.moveTo(startX, centerY + orbRadius + 10);

        const step = 3;
        for (let x = startX; x <= endX; x += step) {
          const relX = Math.max(0, Math.min(1, (x - startX) / (orbRadius * 2)));

          // Amplitude responds dynamically to frequency buckets and audio level
          const freqOffset = frequencyData.length > 0
            ? frequencyData[Math.floor(relX * frequencyData.length)] || 0
            : 0;

          const wave1 = Math.sin(x * frequency + localPhase * speed) * amplitude;
          const wave2 = Math.cos(x * frequency * 1.6 - localPhase * speed * 0.75) * (amplitude * 0.45);
          const audioWave = freqOffset * energy * 26 * Math.sin(relX * Math.PI);
          const y = baseLevel + offsetY + wave1 + wave2 - audioWave;

          ctx.lineTo(x, y);
        }

        ctx.lineTo(endX, centerY + orbRadius + 10);
        ctx.closePath();

        ctx.fillStyle = fillColor;
        ctx.fill();

        if (crestColor) {
          ctx.strokeStyle = crestColor;
          ctx.lineWidth = 1.8;
          ctx.stroke();
        }
      };

      // 3b. Water Wave 1 (Deep Back Wave)
      const grad1 = ctx.createLinearGradient(centerX, centerY - orbRadius, centerX, centerY + orbRadius);
      grad1.addColorStop(0, theme.waveLayers[0]);
      grad1.addColorStop(1, theme.waveLayers[1]);
      drawWaterWave(
        -10,
        9 + energy * 16,
        0.024,
        1.1,
        grad1
      );

      // 3c. Water Wave 2 (Middle Liquid Wave - flowing oppositely)
      const grad2 = ctx.createLinearGradient(centerX, centerY - orbRadius, centerX, centerY + orbRadius);
      grad2.addColorStop(0, theme.waveLayers[1]);
      grad2.addColorStop(1, theme.waveLayers[2]);
      drawWaterWave(
        4,
        12 + energy * 22,
        0.02,
        -1.4,
        grad2,
        theme.crestHighlight
      );

      // 3d. Water Wave 3 (Foreground Wave with bright glowing crest)
      const grad3 = ctx.createLinearGradient(centerX, centerY - orbRadius, centerX, centerY + orbRadius);
      grad3.addColorStop(0, theme.waveLayers[2]);
      grad3.addColorStop(1, theme.waveLayers[3]);
      drawWaterWave(
        16,
        15 + energy * 26,
        0.027,
        1.8,
        grad3,
        "rgba(255, 255, 255, 0.75)"
      );

      // 3e. Liquid Ripples expanding in the middle when speaking or listening
      if (energy > 0.15 || state === "speaking" || state === "listening") {
        for (let r = 1; r <= 3; r++) {
          const rippleRadius = ((localPhase * 22 * r) % (orbRadius * 0.85));
          const rippleAlpha = Math.max(0, 0.45 - (rippleRadius / (orbRadius * 0.85)) * 0.45) * (0.35 + energy * 0.65);
          ctx.beginPath();
          ctx.ellipse(
            centerX,
            baseLevel + 8,
            rippleRadius,
            rippleRadius * 0.36,
            0,
            0,
            Math.PI * 2
          );
          ctx.strokeStyle = theme.rippleColor.replace(/[\d.]+\)$/, `${rippleAlpha})`);
          ctx.lineWidth = 1.3;
          ctx.stroke();
        }
      }

      // 3f. Thinking Mode: Swirling Liquid Vortex Shimmer
      if (state === "thinking") {
        for (let s = 0; s < 5; s++) {
          const vortexAngle = localPhase * 2.8 + (s * Math.PI * 2) / 5;
          const vortexDist = 22 + Math.sin(localPhase * 3.5 + s) * 16;
          const vx = centerX + Math.cos(vortexAngle) * vortexDist;
          const vy = centerY + Math.sin(vortexAngle) * (vortexDist * 0.55);

          ctx.beginPath();
          ctx.arc(vx, vy, 3, 0, Math.PI * 2);
          ctx.fillStyle = "#FFFFFF";
          ctx.shadowColor = "#C084FC";
          ctx.shadowBlur = 10;
          ctx.fill();
        }
      }

      // 3g. 3D Glass Surface Reflections / Specular Highlights
      const specX = centerX - orbRadius * 0.36;
      const specY = centerY - orbRadius * 0.36;
      const specGrad = ctx.createRadialGradient(specX, specY, 2, specX, specY, orbRadius * 0.65);
      specGrad.addColorStop(0, "rgba(255, 255, 255, 0.5)");
      specGrad.addColorStop(0.3, "rgba(255, 255, 255, 0.14)");
      specGrad.addColorStop(0.8, "rgba(255, 255, 255, 0.02)");
      specGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.fillStyle = specGrad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, orbRadius, 0, Math.PI * 2);
      ctx.fill();

      // Lower internal reflection crescent
      ctx.beginPath();
      ctx.arc(centerX, centerY, orbRadius * 0.88, 0.25 * Math.PI, 0.75 * Math.PI);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.22)";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.restore(); // End clip

      animFrameIdRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [state, audioLevel, frequencyData, isMicActive, size]);

  const getStateDetails = () => {
    switch (state) {
      case "listening":
        return {
          label: "Listening",
          desc: isMicActive ? "Microphone active • Fluid water reactive VAD" : "Ready for user audio input",
          badgeBg: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
          icon: <Mic className="size-3 text-cyan-400 animate-pulse" />,
        };
      case "thinking":
        return {
          label: "Thinking",
          desc: "PyVex context aggregation & LLM reasoning...",
          badgeBg: "bg-purple-500/15 text-purple-400 border-purple-500/30",
          icon: <Sparkles className="size-3 text-purple-400 animate-spin" />,
        };
      case "speaking":
        return {
          label: "Speaking",
          desc: `ElevenLabs Turbo v2.5 streaming speech (${voiceName})`,
          badgeBg: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
          icon: <Volume2 className="size-3 text-emerald-400 animate-pulse" />,
        };
      case "idle":
      default:
        return {
          label: "Idle / Ready",
          desc: "Tap orb or mic to begin voice conversation",
          badgeBg: "bg-[#7047FF]/15 text-[#845CFF] border-[#7047FF]/30",
          icon: <Radio className="size-3 text-[#845CFF]" />,
        };
    }
  };

  const status = getStateDetails();

  return (
    <div className={`flex flex-col items-center justify-center relative select-none ${className}`}>
      {/* Interactive Fluid Water Orb Canvas (Pure Visualizer with No Center Logo) */}
      <div 
        onClick={onOrbClick}
        className="relative cursor-pointer group flex items-center justify-center transition-transform hover:scale-[1.02] active:scale-[0.98]"
        title="Tap fluid voice orb to talk or interrupt"
      >
        <canvas
          ref={canvasRef}
          style={{ width: `${size}px`, height: `${size}px` }}
          className="rounded-full drop-shadow-[0_0_45px_rgba(112,71,255,0.3)]"
        />
      </div>

      {/* Floating State Badge and Status Caption */}
      <div className="flex flex-col items-center gap-1.5 mt-2.5">
        <div className={`px-3 py-1 rounded-full text-xs font-semibold border flex items-center gap-2 backdrop-blur-md shadow-sm transition-all duration-300 ${status.badgeBg}`}>
          {status.icon}
          <span className="font-mono tracking-wide uppercase text-[11px]">{status.label}</span>
          {state === "speaking" && (
            <span className="size-1.5 rounded-full bg-emerald-400 animate-ping" />
          )}
          {state === "listening" && isMicActive && (
            <span className="size-1.5 rounded-full bg-cyan-400 animate-ping" />
          )}
        </div>
        <p className="text-xs text-[#A4A3B2] text-center max-w-sm px-4">
          {status.desc}
        </p>
      </div>
    </div>
  );
};
