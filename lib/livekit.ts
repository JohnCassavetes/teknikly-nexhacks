// LiveKit helpers for TalkCoach

import { Room, RoomEvent, LocalParticipant, LocalTrack, Track } from 'livekit-client';

export interface LiveKitConfig {
  url: string;
  token: string;
}

export interface MediaTracks {
  videoTrack: LocalTrack | null;
  audioTrack: LocalTrack | null;
}

// Simple local media capture without LiveKit server
// For hackathon MVP, we can capture media directly
export async function captureLocalMedia(): Promise<MediaStream | null> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: 'user',
      },
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
      },
    });
    return stream;
  } catch (error) {
    console.error('Failed to capture media:', error);
    return null;
  }
}

export function stopMediaStream(stream: MediaStream): void {
  stream.getTracks().forEach(track => track.stop());
}

// LiveKit room management (for when server is available)
export class LiveKitRoom {
  private room: Room | null = null;

  async connect(config: LiveKitConfig): Promise<boolean> {
    try {
      this.room = new Room({
        adaptiveStream: true,
        dynacast: true,
      });

      await this.room.connect(config.url, config.token);
      return true;
    } catch (error) {
      console.error('Failed to connect to LiveKit:', error);
      return false;
    }
  }

  async enableCamera(): Promise<void> {
    if (!this.room) return;
    await this.room.localParticipant.setCameraEnabled(true);
  }

  async enableMicrophone(): Promise<void> {
    if (!this.room) return;
    await this.room.localParticipant.setMicrophoneEnabled(true);
  }

  getLocalParticipant(): LocalParticipant | null {
    return this.room?.localParticipant || null;
  }

  onTrackSubscribed(callback: (track: Track) => void): void {
    if (!this.room) return;
    this.room.on(RoomEvent.TrackSubscribed, callback);
  }

  disconnect(): void {
    if (this.room) {
      this.room.disconnect();
      this.room = null;
    }
  }
}

// Generate a participant token (server-side only)
// This is a placeholder - in production, call the API route
export async function getParticipantToken(
  roomName: string,
  participantName: string
): Promise<string | null> {
  try {
    const response = await fetch('/api/livekit-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomName, participantName }),
    });

    if (!response.ok) {
      throw new Error('Failed to get token');
    }

    const data = await response.json();
    return data.token;
  } catch (error) {
    console.error('Failed to get participant token:', error);
    return null;
  }
}
