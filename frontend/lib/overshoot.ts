// OverShoot SDK integration for real-time body language analysis
// Uses the OverShoot RealtimeVision API for AI-powered analysis

import { BodySignals } from './types';

interface OverShootCallbacks {
  onSignals: (signals: BodySignals) => void;
}

// OverShoot result schema for body language analysis
interface BodyLanguageResult {
  eye_contact: boolean;
  eye_contact_confidence: number;
  posture: 'good' | 'slouching' | 'leaning' | 'neutral';
  motion_level: 'still' | 'low' | 'moderate' | 'high' | 'excessive';
  gesture_detected: boolean;
}

class OverShootAnalyzer {
  private vision: any = null;
  private callbacks: OverShootCallbacks | null = null;
  private isRunning = false;
  private videoElement: HTMLVideoElement | null = null;
  private apiKey: string | null = null;

  // Rolling averages for smoothing
  private eyeContactHistory: number[] = [];
  private motionHistory: number[] = [];
  private readonly HISTORY_SIZE = 10;

  // Fallback detection (used when API unavailable)
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private lastFrame: ImageData | null = null;
  private useFallback = false;

  // Public status for debugging
  public getStatus(): { usingAPI: boolean; apiKey: boolean } {
    return {
      usingAPI: !this.useFallback && this.vision !== null,
      apiKey: this.apiKey !== null,
    };
  }

  async initialize(videoElement: HTMLVideoElement): Promise<void> {
    this.videoElement = videoElement;
    
    // Try to get API key
    try {
      const response = await fetch('/api/overshoot-key');
      if (response.ok) {
        const data = await response.json();
        this.apiKey = data.apiKey;
        console.log('✅ OverShoot API key loaded');
      } else {
        console.warn('⚠️ OverShoot API key not configured');
      }
    } catch (error) {
      console.warn('❌ Failed to get OverShoot API key, using fallback');
    }

    // Setup fallback canvas
    this.canvas = document.createElement('canvas');
    this.canvas.width = 320;
    this.canvas.height = 240;
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
  }

  async start(callbacks: OverShootCallbacks): Promise<void> {
    this.callbacks = callbacks;
    this.isRunning = true;
    this.eyeContactHistory = [];
    this.motionHistory = [];

    if (this.apiKey && this.videoElement) {
      try {
        console.log('🔄 Attempting to start OverShoot with API key:', this.apiKey.substring(0, 10) + '...');
        await this.startOverShoot();
        console.log('🚀 OverShoot AI Vision started - using real API');
      } catch (error) {
        console.error('❌ Failed to start OverShoot, using fallback:', error);
        this.useFallback = true;
        this.startFallback();
      }
    } else {
      console.log('📷 OverShoot using local fallback', { hasApiKey: !!this.apiKey, hasVideo: !!this.videoElement });
      this.useFallback = true;
      this.startFallback();
    }
  }

  private async startOverShoot(): Promise<void> {
    // Dynamic import to avoid SSR issues
    console.log('📦 Importing OverShoot SDK...');
    const { RealtimeVision } = await import('@overshoot/sdk');
    console.log('✅ OverShoot SDK imported');

    const prompt = `Analyze this person's body language for public speaking coaching. Return JSON with:
- eye_contact: boolean (true if looking at camera/audience)
- eye_contact_confidence: number 0-1
- posture: "good" | "slouching" | "leaning" | "neutral"
- motion_level: "still" | "low" | "moderate" | "high" | "excessive"
- gesture_detected: boolean`;

    const outputSchema = {
      type: 'object',
      properties: {
        eye_contact: { type: 'boolean' },
        eye_contact_confidence: { type: 'number' },
        posture: { type: 'string', enum: ['good', 'slouching', 'leaning', 'neutral'] },
        motion_level: { type: 'string', enum: ['still', 'low', 'moderate', 'high', 'excessive'] },
        gesture_detected: { type: 'boolean' },
      },
      required: ['eye_contact', 'eye_contact_confidence', 'posture', 'motion_level', 'gesture_detected'],
    };

    console.log('🔧 Creating RealtimeVision instance...');
    this.vision = new RealtimeVision({
      apiUrl: 'https://cluster1.overshoot.ai/api/v0.2',
      apiKey: this.apiKey!,
      prompt,
      outputSchema,
      source: { type: 'camera', cameraFacing: 'user' },
      debug: true,  // Enable SDK debug logging
      processing: {
        fps: 10,
        sampling_ratio: 0.2,
        clip_length_seconds: 1.0,
        delay_seconds: 1.0,
      },
      onResult: (result) => {
        if (!this.isRunning) return;
        
        if (!result.ok) {
          console.warn('⚠️ OverShoot result not OK:', result.error);
          return;
        }

        try {
          const data: BodyLanguageResult = JSON.parse(result.result);
          console.log('🎯 OverShoot AI Result:', {
            eye_contact: data.eye_contact,
            confidence: data.eye_contact_confidence,
            posture: data.posture,
            motion: data.motion_level,
            gesture: data.gesture_detected,
            latency: result.total_latency_ms + 'ms'
          });
          this.processOverShootResult(data);
        } catch (e) {
          console.error('❌ Failed to parse OverShoot result:', e, result.result);
        }
      },
      onError: (error) => {
        console.error('❌ OverShoot error:', error);
        // Fall back to local detection on error
        if (this.isRunning && !this.useFallback) {
          this.useFallback = true;
          this.startFallback();
        }
      },
    });

    console.log('▶️ Starting OverShoot vision.start()...');
    await this.vision.start();
    console.log('✅ OverShoot vision started successfully');
  }

  private processOverShootResult(data: BodyLanguageResult): void {
    // Calculate eye contact percentage
    const eyeContact = data.eye_contact ? data.eye_contact_confidence : 0;
    this.eyeContactHistory.push(eyeContact);
    if (this.eyeContactHistory.length > this.HISTORY_SIZE) {
      this.eyeContactHistory.shift();
    }

    // Convert motion level to numeric value
    const motionMap: Record<string, number> = {
      'still': 0.1,
      'low': 0.3,
      'moderate': 0.5,
      'high': 0.7,
      'excessive': 0.9,
    };
    const motionEnergy = motionMap[data.motion_level] || 0.5;
    this.motionHistory.push(motionEnergy);
    if (this.motionHistory.length > this.HISTORY_SIZE) {
      this.motionHistory.shift();
    }

    // Calculate averages
    const avgEyeContact = this.eyeContactHistory.reduce((a, b) => a + b, 0) / this.eyeContactHistory.length;
    const avgMotion = this.motionHistory.reduce((a, b) => a + b, 0) / this.motionHistory.length;

    console.log('📊 Processed metrics:', {
      eye_contact_pct: Math.round(avgEyeContact * 100) + '%',
      motion_energy: Math.round(avgMotion * 100) + '%'
    });

    this.callbacks?.onSignals({
      eye_contact_pct: Math.min(1, Math.max(0, avgEyeContact)),
      motion_energy: Math.min(1, Math.max(0, avgMotion)),
    });
  }

  // ==================== FALLBACK DETECTION ====================
  // Used when OverShoot API is unavailable
  
  private fallbackAnimationFrame: number | null = null;
  private fallbackLogCounter = 0;

  private startFallback(): void {
    this.fallbackLogCounter = 0;
    this.analyzeFallback();
  }

  private analyzeFallback = (): void => {
    if (!this.isRunning || !this.videoElement || !this.ctx || !this.canvas) {
      return;
    }

    try {
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
      if (this.motionHistory.length > this.HISTORY_SIZE) {
        this.motionHistory.shift();
      }

      // Estimate eye contact
      const eyeContact = this.estimateEyeContact(currentFrame);
      this.eyeContactHistory.push(eyeContact);
      if (this.eyeContactHistory.length > this.HISTORY_SIZE) {
        this.eyeContactHistory.shift();
      }

      // Calculate averages
      const avgMotion = this.motionHistory.reduce((a, b) => a + b, 0) / this.motionHistory.length;
      const avgEyeContact = this.eyeContactHistory.reduce((a, b) => a + b, 0) / this.eyeContactHistory.length;

      // Log every 10th frame to avoid console spam
      this.fallbackLogCounter++;
      if (this.fallbackLogCounter % 10 === 0) {
        console.log('📷 Fallback metrics:', {
          eye_contact_pct: Math.round(avgEyeContact * 100) + '%',
          motion_energy: Math.round(avgMotion * 100) + '%',
          mode: 'local pixel analysis'
        });
      }

      this.callbacks?.onSignals({
        eye_contact_pct: Math.min(1, Math.max(0, avgEyeContact)),
        motion_energy: Math.min(1, Math.max(0, avgMotion)),
      });

      this.lastFrame = currentFrame;
    } catch (e) {
      console.error('Fallback analysis error:', e);
    }

    // Run at ~10 fps
    this.fallbackAnimationFrame = window.setTimeout(() => {
      this.fallbackAnimationFrame = requestAnimationFrame(this.analyzeFallback);
    }, 100) as unknown as number;
  };

  private calculateMotion(currentFrame: ImageData): number {
    if (!this.lastFrame) return 0.4;

    const current = currentFrame.data;
    const last = this.lastFrame.data;
    let diff = 0;

    for (let i = 0; i < current.length; i += 16) {
      const rDiff = Math.abs(current[i] - last[i]);
      const gDiff = Math.abs(current[i + 1] - last[i + 1]);
      const bDiff = Math.abs(current[i + 2] - last[i + 2]);
      diff += (rDiff + gDiff + bDiff) / 3;
    }

    const pixelCount = current.length / 16;
    const avgDiff = diff / pixelCount;
    return Math.min(1, avgDiff / 40);
  }

  private estimateEyeContact(frame: ImageData): number {
    const width = this.canvas?.width || 320;
    const height = this.canvas?.height || 240;
    const data = frame.data;

    const startX = Math.floor(width * 0.25);
    const endX = Math.floor(width * 0.75);
    const startY = Math.floor(height * 0.1);
    const endY = Math.floor(height * 0.6);

    let skinTonePixels = 0;
    let sampleCount = 0;

    for (let y = startY; y < endY; y += 4) {
      for (let x = startX; x < endX; x += 4) {
        const i = (y * width + x) * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        sampleCount++;

        if (r > 95 && g > 40 && b > 20 &&
            r > g && r > b &&
            Math.abs(r - g) > 15) {
          skinTonePixels++;
        }
      }
    }

    const skinRatio = skinTonePixels / sampleCount;
    const baseContact = skinRatio > 0.15 ? 0.8 : 0.5;
    const noise = (Math.random() - 0.5) * 0.2;

    return Math.min(1, Math.max(0, baseContact + noise));
  }

  async stop(): Promise<void> {
    this.isRunning = false;

    if (this.vision) {
      try {
        await this.vision.stop();
      } catch (e) {
        console.error('Error stopping OverShoot:', e);
      }
      this.vision = null;
    }

    if (this.fallbackAnimationFrame) {
      clearTimeout(this.fallbackAnimationFrame);
      cancelAnimationFrame(this.fallbackAnimationFrame);
      this.fallbackAnimationFrame = null;
    }
  }
}

// Factory function
export function createOverShootAnalyzer(): OverShootAnalyzer {
  return new OverShootAnalyzer();
}

