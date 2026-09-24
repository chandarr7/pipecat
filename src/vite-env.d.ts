/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ELEVENLABS_API_KEY?: string;
  readonly VITE_DEEPGRAM_API_KEY?: string;
  readonly VITE_CARTESIA_API_KEY?: string;
  readonly VITE_GOOGLE_CLIENT_ID?: string;
  [key: string]: any;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
