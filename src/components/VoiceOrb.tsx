"use client";

import { useEffect, useRef } from "react";

interface VoiceOrbProps {
  state: "idle" | "listening" | "speaking" | "thinking";
  color: string;
}

export default function VoiceOrb({ state, color }: VoiceOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener("resize", resize);

    let time = 0;

    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;
      const centerX = width / 2;
      const centerY = height / 2;

      ctx.clearRect(0, 0, width, height);

      let baseRadius = 72;
      let waveIntensity = 0;

      if (state === "idle") {
        baseRadius = 72 + Math.sin(time * 0.015) * 3;
        waveIntensity = 0.2;
      } else if (state === "listening") {
        baseRadius = 78 + Math.sin(time * 0.07) * 10;
        waveIntensity = 0.9;
      } else if (state === "speaking") {
        baseRadius = 74 + Math.sin(time * 0.05) * 10;
        waveIntensity = 0.7;
      } else if (state === "thinking") {
        baseRadius = 68 + Math.sin(time * 0.1) * 5;
        waveIntensity = 0.35;
      }

      // Draw outer glow rings - softer on light mode
      for (let i = 3; i >= 0; i--) {
        const ringRadius = baseRadius + i * 22 + Math.sin(time * 0.025 + i) * 4;
        const alpha = 0.08 - i * 0.018;
        const gradient = ctx.createRadialGradient(
          centerX,
          centerY,
          ringRadius * 0.4,
          centerX,
          centerY,
          ringRadius
        );
        gradient.addColorStop(0, hexToRgba(color, alpha));
        gradient.addColorStop(1, "rgba(247,245,242,0)");

        ctx.beginPath();
        ctx.arc(centerX, centerY, ringRadius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
      }

      // Draw main orb with wave distortion
      const points = 120;
      ctx.beginPath();

      for (let i = 0; i <= points; i++) {
        const angle = (i / points) * Math.PI * 2;
        let radius = baseRadius;

        if (waveIntensity > 0) {
          radius +=
            Math.sin(angle * 3 + time * 0.035) * 7 * waveIntensity +
            Math.sin(angle * 5 - time * 0.025) * 4 * waveIntensity +
            Math.sin(angle * 7 + time * 0.045) * 2 * waveIntensity;
        }

        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }

      ctx.closePath();

      // Orb fill gradient
      const orbGradient = ctx.createRadialGradient(
        centerX - baseRadius * 0.3,
        centerY - baseRadius * 0.3,
        0,
        centerX,
        centerY,
        baseRadius
      );
      orbGradient.addColorStop(0, lightenColor(color, 25));
      orbGradient.addColorStop(0.5, color);
      orbGradient.addColorStop(1, darkenColor(color, 20));

      ctx.fillStyle = orbGradient;
      ctx.fill();

      // Subtle inner highlight for 3D feel
      const highlightGradient = ctx.createRadialGradient(
        centerX - baseRadius * 0.2,
        centerY - baseRadius * 0.25,
        0,
        centerX,
        centerY,
        baseRadius * 0.65
      );
      highlightGradient.addColorStop(0, "rgba(255,255,255,0.35)");
      highlightGradient.addColorStop(1, "rgba(255,255,255,0)");

      ctx.beginPath();
      ctx.arc(centerX, centerY, baseRadius * 0.65, 0, Math.PI * 2);
      ctx.fillStyle = highlightGradient;
      ctx.fill();

      // Soft outer stroke for definition on light bg
      ctx.beginPath();
      ctx.arc(centerX, centerY, baseRadius, 0, Math.PI * 2);
      ctx.strokeStyle = hexToRgba(color, 0.15);
      ctx.lineWidth = 1;
      ctx.stroke();

      // Pulse ring for listening/thinking
      if (state === "listening" || state === "thinking") {
        const pulseAlpha = 0.2 + Math.sin(time * 0.06) * 0.1;
        ctx.beginPath();
        ctx.arc(centerX, centerY, baseRadius + 12, 0, Math.PI * 2);
        ctx.strokeStyle = hexToRgba(color, pulseAlpha);
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      time += 1;
      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationRef.current);
    };
  }, [state, color]);

  return (
    <canvas
      ref={canvasRef}
      className="w-[280px] h-[280px] md:w-[360px] md:h-[360px]"
      style={{ touchAction: "none" }}
    />
  );
}

function hexToRgba(hex: string, alpha: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const R = (num >> 16) & 0xff;
  const G = (num >> 8) & 0xff;
  const B = num & 0xff;
  return `rgba(${R},${G},${B},${alpha})`;
}

function lightenColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, (num >> 16) + amt);
  const G = Math.min(255, ((num >> 8) & 0x00ff) + amt);
  const B = Math.min(255, (num & 0x0000ff) + amt);
  return `rgb(${R},${G},${B})`;
}

function darkenColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.max(0, (num >> 16) - amt);
  const G = Math.max(0, ((num >> 8) & 0x00ff) - amt);
  const B = Math.max(0, (num & 0x0000ff) - amt);
  return `rgb(${R},${G},${B})`;
}
