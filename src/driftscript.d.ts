declare module '*.drs' {
  export const __drift: {
    readonly module: string;
    readonly requires: readonly string[];
    readonly shapes: Readonly<Record<string, readonly string[]>>;
  };
}
