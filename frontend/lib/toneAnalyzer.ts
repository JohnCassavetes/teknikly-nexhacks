// Audio Tone Analyzer using Web Audio API
// Analyzes volume, energy, and pitch trends from microphone input

import { ToneInfo } from './types';

interface ToneCallbacks {
  onToneUpdate: (tone: ToneInfo) => void;
}

class ToneAnalyzer {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private callbacks: ToneCallbacks | null = null;
  private isRunning = false;
  private animationFrame: number | null = null;

  // Rolling buffers for smoothing
  private volumeHistory: number[] = [];
  private pitchHistory: number[] = [];
  private readonly historySize = 10;

  // Current tone state
  private currentTone: ToneInfo = {
    volume: 'normal',
    energy: 'medium',
    pitchTrend: 'flat',
  };

  async initialize(stream: MediaStream): Promise<void> {
    try {
      this.audioContext = new AudioContext();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.8;

      this.source = this.audioContext.createMediaStreamSource(stream);
      this.source.connect(this.analyser);
    } catch (error) {
      console.error('Failed to initialize ToneAnalyzer:', error);
    }
  }

  start(callbacks: ToneCallbacks): void {
    if (!this.analyser) {
      console.warn('ToneAnalyzer not initialized');
      return;
    }

    this.callbacks = callbacks;
    this.isRunning = true;
    this.volumeHistory = [];
    this.pitchHistory = [];
    this.analyze();
  }

  private analyze = (): void => {
    if (!this.isRunning || !this.analyser) return;

    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const frequencyData = new Uint8Array(bufferLength);

    // Get time domain data (waveform) for volume
    this.analyser.getByteTimeDomainData(dataArray);
    
    // Get frequency data for pitch estimation
    this.analyser.getByteFrequencyData(frequencyData);

    // Calculate RMS volume (0-1)
    let sum = 0;
    for (let i = 0; i < bufferLength; i++) {
      const value = (dataArray[i] - 128) / 128;
      sum += value * value;
    }
    const rms = Math.sqrt(sum / bufferLength);

    // Calculate spectral centroid (rough pitch indicator)
    let weightedSum = 0;
    let totalEnergy = 0;
    for (let i = 0; i < bufferLength; i++) {
      const frequency = (i * this.audioContext!.sampleRate) / (2 * bufferLength);
      const magnitude = frequencyData[i];
      weightedSum += frequency * magnitude;
      totalEnergy += magnitude;
    }
    const spectralCentroid = totalEnergy > 0 ? weightedSum / totalEnergy : 0;

    // Update history buffers
    this.volumeHistory.push(rms);
    if (this.volumeHistory.length > this.historySize) {
      this.volumeHistory.shift();
    }

    this.pitchHistory.push(spectralCentroid);
    if (this.pitchHistory.length > this.historySize) {
      this.pitchHistory.shift();
    }

    // Classify volume
    const avgVolume = this.volumeHistory.reduce((a, b) => a + b, 0) / this.volumeHistory.length;
    let volume: ToneInfo['volume'] = 'normal';
    if (avgVolume < 0.02) {
      volume = 'quiet';
    } else if (avgVolume > 0.15) {
      volume = 'loud';
    }

    // Classify energy based on high frequency content
    const highFreqEnergy = frequencyData.slice(bufferLength / 2).reduce((a, b) => a + b, 0) / (bufferLength / 2);
    let energy: ToneInfo['energy'] = 'medium';
    if (highFreqEnergy < 20) {
      energy = 'low';
    } else if (highFreqEnergy > 60) {
      energy = 'high';
    }

    // Detect pitch trend (rising, falling, flat)
    let pitchTrend: ToneInfo['pitchTrend'] = 'flat';
    if (this.pitchHistory.length >= 5) {
      const recentPitches = this.pitchHistory.slice(-5);
      const firstHalf = recentPitches.slice(0, 2).reduce((a, b) => a + b, 0) / 2;
      const secondHalf = recentPitches.slice(-2).reduce((a, b) => a + b, 0) / 2;
      const diff = secondHalf - firstHalf;
      
      if (diff > 50) {
        pitchTrend = 'rising';
      } else if (diff < -50) {
        pitchTrend = 'falling';
      }
    }

    // Update current tone
    this.currentTone = { volume, energy, pitchTrend };

    // Notify callbacks (throttled to every 200ms)
    if (this.callbacks) {
      this.callbacks.onToneUpdate(this.currentTone);
    }

    // Continue analysis loop
    this.animationFrame = requestAnimationFrame(() => {
      setTimeout(this.analyze, 200); // Throttle to 5 updates/second
    });
  };

  getCurrentTone(): ToneInfo {
    return { ...this.currentTone };
  }

  stop(): void {
    this.isRunning = false;
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
    if (this.source) {
      this.source.disconnect();
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
  }
}

export function createToneAnalyzer(): ToneAnalyzer {
  return new ToneAnalyzer();
}
