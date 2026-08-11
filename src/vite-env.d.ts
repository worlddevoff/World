/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TOKEN_MINT?: string;
  readonly VITE_SOL_USD?: string;
  /** Injected at build time from hosting env — never hardcode in source. */
  readonly VITE_PUMPPORTAL_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
