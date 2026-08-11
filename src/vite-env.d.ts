/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TOKEN_MINT?: string;
  readonly VITE_SOL_USD?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
