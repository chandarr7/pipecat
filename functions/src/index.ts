import { onRequest } from "firebase-functions/v2/https";
import type { Express } from "express";

// Copied from ../app.ts by the "prebuild" npm script, so this function
// deploys the exact same Express app used for local dev / Docker.
import { buildApp } from "./app";

let appPromise: Promise<Express> | null = null;

export const server = onRequest(
  {
    region: "us-central1",
    secrets: ["GOOGLE_API_KEY", "ELEVENLABS_API_KEY", "ELEVENLABS_VOICE_ID"],
  },
  async (req, res) => {
    if (!appPromise) {
      appPromise = buildApp();
    }
    const app = await appPromise;
    app(req, res);
  },
);
