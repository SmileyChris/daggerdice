declare const __APP_VERSION__: string;

declare module 'virtual:changelog' {
  export interface ChangeLogEntry {
    version: string;
    changes: string[];
    sig: string;
  }
  export const CHANGELOG: ChangeLogEntry[];
}

declare function confirm(message?: string): boolean;
