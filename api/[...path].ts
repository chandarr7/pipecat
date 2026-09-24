import type { IncomingMessage, ServerResponse } from "http";
import { buildApp } from "../app";

// Reused across warm invocations of the same serverless instance.
let appPromise: ReturnType<typeof buildApp> | null = null;

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (!appPromise) {
    appPromise = buildApp();
  }
  const app = await appPromise;
  app(req as any, res as any);
}
