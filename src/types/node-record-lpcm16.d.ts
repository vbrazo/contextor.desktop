declare module 'node-record-lpcm16' {
  interface RecordOptions {
    sampleRateHertz?: number;
    threshold?: number;
    verbose?: boolean;
    recordProgram?: string;
    silence?: string;
  }

  interface RecordStream {
    on(event: string, callback: (data: any) => void): RecordStream;
    pipe(destination: any): RecordStream;
  }

  export function start(options?: RecordOptions): RecordStream;
  export function stop(): void;
} 