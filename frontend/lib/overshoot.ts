// OverShoot wrapper for body language analysis
// With webcam-based fallback for MVP

import { BodySignals } from './types';

interface OverShootCallbacks {
  onSignals: (signals: BodySignals) => void;
}

class OverShootAnalyzer {
  private videoElement: HTMLVideoElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private callbacks: OverShootCallbacks | null = null;
  private isRunning = false;
  private animationFrame: number | null = null;

  // Motion detection
  private lastFrame: ImageData | null = null;
  private motionHistory: number[] = [];
  private readonly MOTION_HISTORY_SIZE = 30;

  // Eye contact proxy (face detection simulation)
  // In a real implementation, this would use face-api.js or similar
  private eyeContactHistory: number[] = [];
  private readonly EYE_CONTACT_HISTORY_SIZE = 30;

  initialize(videoElement: HTMLVideoElement): void {
    this.videoElement = videoElement;
    this.canvas = document.createElement('canvas');
    this.canvas.width = 320;
    this.canvas.height = 240;
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
  }

  start(callbacks: OverShootCallbacks): void {
    this.callbacks = callbacks;
    this.isRunning = true;
    this.motionHistory = [];
    this.eyeContactHistory = [];
    this.analyze();
  }

  private analyze = (): void => {
    if (!this.isRunning || !this.videoElement || !this.ctx || !this.canvas) {
      return;
    }

    try {
      // Draw current frame
      this.ctx.drawImage(
        this.videoElement,
        0, 0,
        this.canvas.width,
        this.canvas.height
      );

      const currentFrame = this.ctx.getImageData(
        0, 0,
        this.canvas.width,
        this.canvas.height
      );

      // Calculate motion energy
      const motionEnergy = this.calculateMotion(currentFrame);
      this.motionHistory.push(motionEnergy);
      if (this.motionHistory.length > this.MOTION_HISTORY_SIZE) {
        this.motionHistory.shift();
      }

      // Estimate eye contact (face position proxy)
      // In real implementation, would use face detection
      const eyeContact = this.estimateEyeContact(currentFrame);
      this.eyeContactHistory.push(eyeContact);
      if (this.eyeContactHistory.length > this.EYE_CONTACT_HISTORY_SIZE) {
        this.eyeContactHistory.shift();
      }

      // Calculate averages
      const avgMotion = this.motionHistory.reduce((a, b) => a + b, 0) / this.motionHistory.length;
      const avgEyeContact = this.eyeContactHistory.reduce((a, b) => a + b, 0) / this.eyeContactHistory.length;

      // Send signals
      this.callbacks?.onSignals({
        eye_contact_pct: Math.min(1, Math.max(0, avgEyeContact)),
        motion_energy: Math.min(1, Math.max(0, avgMotion)),
      });

      this.lastFrame = currentFrame;
    } catch (e) {
      console.error('OverShoot analysis error:', e);
    }

    // Run at ~10 fps
    this.animationFrame = window.setTimeout(() => {
      this.animationFrame = requestAnimationFrame(this.analyze);
    }, 100);
  };

  private calculateMotion(currentFrame: ImageData): number {
    if (!this.lastFrame) return 0.4; // Default motion level

    const current = currentFrame.data;
    const last = this.lastFrame.data;
    let diff = 0;

    // Sample every 4th pixel for performance
    for (let i = 0; i < current.length; i += 16) {
      const rDiff = Math.abs(current[i] - last[i]);
      const gDiff = Math.abs(current[i + 1] - last[i + 1]);
      const bDiff = Math.abs(current[i + 2] - last[i + 2]);
      diff += (rDiff + gDiff + bDiff) / 3;
    }

    // Normalize to 0-1 range
    const pixelCount = current.length / 16;
    const avgDiff = diff / pixelCount;

    // Map to 0-1 range (typical movement is 5-30 avg diff)
    return Math.min(1, avgDiff / 40);
  }

  private estimateEyeContact(frame: ImageData): number {
    // Simple brightness-based heuristic for face detection proxy
    // In real implementation, would use face-api.js or MediaPipe

    // Check center region of frame (where face likely is if looking at camera)
    const width = this.canvas?.width || 320;
    const height = this.canvas?.height || 240;
    const data = frame.data;

    // Sample center 50% of frame
    const startX = Math.floor(width * 0.25);
    const endX = Math.floor(width * 0.75);
    const startY = Math.floor(height * 0.1);
    const endY = Math.floor(height * 0.6);

    let brightness = 0;
    let skinTonePixels = 0;
    let sampleCount = 0;

    for (let y = startY; y < endY; y += 4) {
      for (let x = startX; x < endX; x += 4) {
        const i = (y * width + x) * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        brightness += (r + g + b) / 3;
        sampleCount++;

        // Simple skin tone detection
        if (r > 95 && g > 40 && b > 20 &&
            r > g && r > b &&
            Math.abs(r - g) > 15) {
          skinTonePixels++;
        }
      }
    }

    // If significant skin tone detected in center, assume looking at camera
    const skinRatio = skinTonePixels / sampleCount;

    // Return eye contact estimate based on skin detection in center
    // Add some randomness for more realistic behavior
    const baseContact = skinRatio > 0.15 ? 0.8 : 0.5;
    const noise = (Math.random() - 0.5) * 0.2;

    return Math.min(1, Math.max(0, baseContact + noise));
  }

  stop(): void {
    this.isRunning = false;
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }
}

// Factory function
export function createOverShootAnalyzer(): OverShootAnalyzer {
  return new OverShootAnalyzer();
}
