import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";

import { auth } from "@/lib/firebase";

export const GOOGLE_CALENDAR_SCOPES = "https://www.googleapis.com/auth/calendar";
export const GOOGLE_TASKS_SCOPES = "https://www.googleapis.com/auth/tasks";

const REQUESTED_SCOPES = [GOOGLE_CALENDAR_SCOPES, GOOGLE_TASKS_SCOPES];

// The Google OAuth access token (for Calendar/Tasks API calls) is separate
// from the Firebase ID token and isn't persisted by the Firebase SDK across
// reloads, so it's cached here for the lifetime of the tab.
let cachedAccessToken: string | null = null;

/**
 * Subscribes to Firebase auth state; returns an unsubscribe function.
 * `onSignedIn` fires with the user and any cached access token when signed
 * in, `onSignedOut` fires (with no arguments) when signed out.
 */
export function initAuth(
  onSignedIn: (user: User, token?: string | null) => void,
  onSignedOut?: () => void,
): () => void {
  return onAuthStateChanged(auth, (user) => {
    if (user) {
      onSignedIn(user, cachedAccessToken);
    } else {
      onSignedOut?.();
    }
  });
}

/** Opens the Google sign-in popup with Calendar + Tasks scopes. */
export async function googleSignIn(): Promise<{ user: User; accessToken?: string } | null> {
  const provider = new GoogleAuthProvider();
  REQUESTED_SCOPES.forEach((scope) => provider.addScope(scope));
  provider.setCustomParameters({ prompt: "consent" });

  const result = await signInWithPopup(auth, provider);
  const credential = GoogleAuthProvider.credentialFromResult(result);
  cachedAccessToken = credential?.accessToken ?? null;

  return { user: result.user, accessToken: cachedAccessToken ?? undefined };
}

export async function logoutGoogle(): Promise<void> {
  cachedAccessToken = null;
  await signOut(auth);
}

/** The cached Google OAuth access token, or null if not signed in this session. */
export async function getAccessToken(): Promise<string | null> {
  return cachedAccessToken;
}
