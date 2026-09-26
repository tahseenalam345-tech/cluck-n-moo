"use client";

import React, { useEffect, useRef } from "react";

interface DealMilestoneCelebrationProps {
  milestone: "5%" | "10%" | null;
  onComplete: () => void;
}

export function DealMilestoneCelebration({
  milestone,
  onComplete,
}: DealMilestoneCelebrationProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!milestone) return;

    // Check prefers-reduced-motion
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) {
      // Just a brief timer for reduced motion mode
      const timer = setTimeout(() => {
        onComplete();
      }, 1400);
      return () => clearTimeout(timer);
    }

    const canvas = canvasRef.current;
    if (!canvas) {
      const timer = setTimeout(onComplete, 1600);
      return () => clearTimeout(timer);
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      const timer = setTimeout(onComplete, 1600);
      return () => clearTimeout(timer);
    }

    // Set canvas dimensions
    const width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
    const height = (canvas.height = canvas.parentElement?.clientHeight || window.innerHeight);

    // Color palette: Brand Orange, Emerald, Golden Amber, White
    const colors = ["#ff8243", "#ea580c", "#10b981", "#059669", "#f59e0b", "#ffffff"];

    interface Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      color: string;
      alpha: number;
      rotation: number;
      rotSpeed: number;
      shape: "rect" | "circle";
    }

    // Generate 36 lightweight particles
    const particleCount = 36;
    const particles: Particle[] = [];
    const originX = width / 2;
    const originY = Math.min(height * 0.25, 180);

    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.4;
      const speed = 3.5 + Math.random() * 5.5;
      particles.push({
        x: originX,
        y: originY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed * 0.85 - 2.5, // initial upward kick
        size: 4 + Math.random() * 5,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        rotation: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 8,
        shape: Math.random() > 0.4 ? "rect" : "circle",
      });
    }

    let animationFrameId: number;
    const startTime = performance.now();
    const duration = 1500; // 1.5 seconds

    const render = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);

      ctx.clearRect(0, 0, width, height);

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.16; // soft gravity
        p.vx *= 0.98; // soft air drag
        p.rotation += p.rotSpeed;
        p.alpha = Math.max(0, 1 - progress * 1.1);

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;

        if (p.shape === "rect") {
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size * 0.45, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      });

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(render);
      } else {
        ctx.clearRect(0, 0, width, height);
        onComplete();
      }
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [milestone, onComplete]);

  if (!milestone) return null;

  return (
    <div
      className="milestone-celebration-container"
      aria-live="polite"
      role="status"
    >
      <canvas ref={canvasRef} className="milestone-canvas" />

      {/* Lightweight non-blocking celebratory banner */}
      <div className="milestone-pill-banner">
        <span className="banner-emoji">
          {milestone === "10%" ? "🏆" : "🎉"}
        </span>
        <span className="banner-text">
          {milestone === "10%"
            ? "10% Maximum Deal Discount Unlocked!"
            : "5% Deal Discount Unlocked!"}
        </span>
      </div>

      <style jsx>{`
        .milestone-celebration-container {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 100;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .milestone-canvas {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
        }

        .milestone-pill-banner {
          position: relative;
          margin-top: 14px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 7px 16px;
          border-radius: 9999px;
          background: ${milestone === "10%"
            ? "linear-gradient(135deg, #059669 0%, #10b981 100%)"
            : "linear-gradient(135deg, #ea580c 0%, #ff8243 100%)"};
          color: #ffffff;
          font-size: 13px;
          font-weight: 800;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35),
                      0 2px 8px rgba(0, 0, 0, 0.2);
          animation: bannerPop 1.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          pointer-events: none;
          max-width: 90%;
        }

        .banner-text {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        @keyframes bannerPop {
          0% {
            opacity: 0;
            transform: translateY(-16px) scale(0.9);
          }
          15% {
            opacity: 1;
            transform: translateY(0) scale(1.04);
          }
          25% {
            transform: translateY(0) scale(1);
          }
          80% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
          100% {
            opacity: 0;
            transform: translateY(-8px) scale(0.96);
          }
        }

        @media (max-width: 480px) {
          .milestone-pill-banner {
            font-size: 11.5px;
            padding: 5px 12px;
            margin-top: 10px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .milestone-canvas {
            display: none;
          }
          .milestone-pill-banner {
            animation: none;
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
