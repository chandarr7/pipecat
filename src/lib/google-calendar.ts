const CALENDAR_API_BASE = "https://www.googleapis.com/calendar/v3";

export interface CalendarListEntry {
  id: string;
  summary: string;
  primary?: boolean;
  backgroundColor?: string;
  accessRole?: string;
}

export interface CalendarEventDateTime {
  dateTime?: string;
  date?: string;
  timeZone?: string;
}

export interface CalendarEventAttendee {
  email: string;
  displayName?: string;
  responseStatus?: string;
}

export interface CalendarEvent {
  id: string;
  summary?: string;
  description?: string;
  location?: string;
  start: CalendarEventDateTime;
  end: CalendarEventDateTime;
  attendees?: CalendarEventAttendee[];
  htmlLink?: string;
  status?: string;
}

export interface CreateEventPayload {
  summary: string;
  description?: string;
  location?: string;
  start: CalendarEventDateTime;
  end: CalendarEventDateTime;
  attendees?: { email: string }[];
}

async function googleFetch<T>(token: string, path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${CALENDAR_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Google Calendar API error (${response.status}): ${body.slice(0, 300)}`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export async function fetchCalendarList(token: string): Promise<CalendarListEntry[]> {
  const data = await googleFetch<{ items?: CalendarListEntry[] }>(
    token,
    "/users/me/calendarList",
  );
  return data.items ?? [];
}

export async function fetchEvents(
  token: string,
  calendarId: string,
): Promise<CalendarEvent[]> {
  const params = new URLSearchParams({
    orderBy: "startTime",
    singleEvents: "true",
    maxResults: "50",
    timeMin: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  });
  const data = await googleFetch<{ items?: CalendarEvent[] }>(
    token,
    `/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`,
  );
  return data.items ?? [];
}

export async function createCalendarEvent(
  token: string,
  calendarId: string,
  payload: CreateEventPayload,
): Promise<CalendarEvent> {
  return googleFetch<CalendarEvent>(
    token,
    `/calendars/${encodeURIComponent(calendarId)}/events`,
    { method: "POST", body: JSON.stringify(payload) },
  );
}

export async function deleteCalendarEvent(
  token: string,
  calendarId: string,
  eventId: string,
): Promise<void> {
  await googleFetch<void>(
    token,
    `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    { method: "DELETE" },
  );
}
