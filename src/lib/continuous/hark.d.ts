declare module "hark" {
  interface SpeechEvents {
    on(event: "speaking" | "stopped_speaking", listener: () => void): void;
    stop(): void;
  }
  export default function hark(stream: MediaStream, options: {
    audioContext: AudioContext; threshold: number; interval: number; history: number; play: boolean;
  }): SpeechEvents;
}