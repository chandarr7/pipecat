import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { doc, setDoc, collection, addDoc, getFirestore, serverTimestamp } from "firebase/firestore";

import type { WorkerOperator } from "@/types";

const firebaseConfig = {
  projectId: "gen-lang-client-0140738589",
  appId: "1:585651158263:web:d47f7d39ae70624fb6a7f2",
  apiKey: "AIzaSyDast3Om6yMmgCRlAx90AWdlq1WQ05H25I",
  authDomain: "gen-lang-client-0140738589.firebaseapp.com",
  storageBucket: "gen-lang-client-0140738589.firebasestorage.app",
  messagingSenderId: "585651158263",
};

const FIRESTORE_DATABASE_ID = "ai-studio-pipecat-f7f5a6be-78a1-4e48-b304-a48aec3718d6";

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app, FIRESTORE_DATABASE_ID);

/** Upserts an operator's profile at /operators/{operatorId}. */
export async function saveOperatorProfile(operator: WorkerOperator): Promise<void> {
  await setDoc(
    doc(db, "operators", operator.id),
    {
      id: operator.id,
      email: operator.email,
      name: operator.name,
      role: operator.role,
      authType: operator.authType,
      cluster: operator.cluster,
      lastLogin: operator.lastLogin,
      createdAt: serverTimestamp(),
    },
    { merge: true },
  );
}

/**
 * Appends a bus event under
 * /operators/{operatorId}/sessions/{sessionId}/bus_events/{eventId}.
 */
export async function recordBusEventLog(
  operatorId: string,
  sessionId: string,
  event: { worker: string; action: string; eventType: string },
): Promise<void> {
  const eventsRef = collection(
    db,
    "operators",
    operatorId,
    "sessions",
    sessionId,
    "bus_events",
  );
  await addDoc(eventsRef, {
    sessionId,
    worker: event.worker,
    action: event.action,
    eventType: event.eventType,
    timestamp: serverTimestamp(),
  });
}
