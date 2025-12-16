declare module 'child-process-promise' {
  import { ChildProcess, ExecOptions, SpawnOptions } from 'child_process';

  interface PromiseResult {
    childProcess: ChildProcess;
    stdout: string;
    stderr: string;
  }

  export function exec(command: string, options?: ExecOptions): Promise<PromiseResult>;
  export function spawn(command: string, args?: string[], options?: SpawnOptions): Promise<PromiseResult>;
}
