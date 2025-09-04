declare module 'node-record-lpcm16' {
  import { Readable } from 'stream';

  interface RecordOptions {
    sampleRateHertz?: number;
    threshold?: number;
    verbose?: boolean;
    recordProgram?: string;
    silence?: string;
  }

  interface Recording {
    options: any;
    cmd: string;
    args: string[];
    cmdOptions: any;
    process: any;
    _stream: Readable;
    start(): void;
    stop(): void;
    pause(): void;
    resume(): void;
    isPaused(): boolean;
    stream(): Readable;
  }

  function record(options?: RecordOptions): Recording;
  
  export { record };
}
