import React, { useState, useEffect, useTransition } from "react";
import type { User } from "firebase/auth";
import {
  initAuth,
  googleSignIn,
  logoutGoogle,
  getAccessToken,
  GOOGLE_CALENDAR_SCOPES,
} from "@/lib/google-auth";
import {
  fetchCalendarList,
  fetchEvents,
  createCalendarEvent,
  deleteCalendarEvent,
  type CalendarListEntry,
  type CalendarEvent,
  type CreateEventPayload,
} from "@/lib/google-calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Calendar as CalendarIcon,
  Clock,
  Plus,
  Trash2,
  ExternalLink,
  RefreshCw,
  LogOut,
  MapPin,
  Users,
  Search,
  CheckCircle2,
  AlertTriangle,
  CalendarCheck,
  Sparkles,
} from "lucide-react";

interface GoogleCalendarPanelProps {
  onSendToVoiceAgent?: (message: string) => void;
}

export const GoogleCalendarPanel: React.FC<GoogleCalendarPanelProps> = ({
  onSendToVoiceAgent,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Calendar data
  const [calendars, setCalendars] = useState<CalendarListEntry[]>([]);
  const [selectedCalendarId, setSelectedCalendarId] = useState<string>("primary");
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Create Event state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    now.setMinutes(0, 0, 0);
    now.setHours(now.getHours() + 1);
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
  });
  const [endDate, setEndDate] = useState(() => {
    const now = new Date();
    now.setMinutes(0, 0, 0);
    now.setHours(now.getHours() + 2);
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
  });
  const [attendeeEmail, setAttendeeEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mandatory confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    actionType: "create" | "delete";
    onConfirm: () => Promise<void>;
  } | null>(null);

  const [, startTransition] = useTransition();

  // Listen to auth
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, token) => {
        setUser(currentUser);
        setAccessToken(token);
        loadCalendarsAndEvents(token);
      },
      () => {
        setUser(null);
        setAccessToken(null);
        setCalendars([]);
        setEvents([]);
      }
    );
    return () => {
      unsubscribe();
    };
  }, []);

  const handleLogin = async () => {
    setIsSigningIn(true);
    setAuthError(null);
    try {
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        setAccessToken(res.accessToken);
        await loadCalendarsAndEvents(res.accessToken);
      }
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to sign in with Google";
      setAuthError(errorMsg);
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleLogout = async () => {
    await logoutGoogle();
    setUser(null);
    setAccessToken(null);
    setCalendars([]);
    setEvents([]);
  };

  const loadCalendarsAndEvents = async (token?: string | null) => {
    const activeToken = token || accessToken || (await getAccessToken());
    if (!activeToken) return;

    setLoadingEvents(true);
    setAuthError(null);
    try {
      const cList = await fetchCalendarList(activeToken);
      setCalendars(cList);

      const evs = await fetchEvents(activeToken, selectedCalendarId);
      setEvents(evs);
    } catch (err: unknown) {
      console.error("Error loading calendars/events:", err);
      const msg = err instanceof Error ? err.message : "Error fetching calendar data";
      setAuthError(msg);
    } finally {
      setLoadingEvents(false);
    }
  };

  const handleCalendarChange = async (calId: string) => {
    setSelectedCalendarId(calId);
    const token = accessToken || (await getAccessToken());
    if (!token) return;

    setLoadingEvents(true);
    try {
      const evs = await fetchEvents(token, calId);
      setEvents(evs);
    } catch (err) {
      console.error("Error fetching events for calendar:", err);
    } finally {
      setLoadingEvents(false);
    }
  };

  // Trigger Create Event with Mandatory User Confirmation
  const promptCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setConfirmDialog({
      isOpen: true,
      title: "Confirm Event Creation",
      description: `Create new event "${newTitle}" on calendar from ${new Date(startDate).toLocaleString()} to ${new Date(endDate).toLocaleString()}?`,
      actionType: "create",
      onConfirm: async () => {
        const token = accessToken || (await getAccessToken());
        if (!token) throw new Error("No active access token found");

        setIsSubmitting(true);
        try {
          const payload: CreateEventPayload = {
            summary: newTitle.trim(),
            description: newDescription.trim() || undefined,
            location: newLocation.trim() || undefined,
            start: {
              dateTime: new Date(startDate).toISOString(),
            },
            end: {
              dateTime: new Date(endDate).toISOString(),
            },
            attendees: attendeeEmail.trim()
              ? [{ email: attendeeEmail.trim() }]
              : undefined,
          };

          await createCalendarEvent(token, selectedCalendarId, payload);
          setShowCreateModal(false);
          setNewTitle("");
          setNewDescription("");
          setNewLocation("");
          setAttendeeEmail("");
          await loadCalendarsAndEvents(token);
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Failed to create event";
          setAuthError(msg);
        } finally {
          setIsSubmitting(false);
          setConfirmDialog(null);
        }
      },
    });
  };

  // Trigger Delete Event with Mandatory User Confirmation
  const promptDeleteEvent = (event: CalendarEvent) => {
    setConfirmDialog({
      isOpen: true,
      title: "Confirm Event Deletion",
      description: `Are you sure you want to permanently delete event "${event.summary || "Untitled Event"}"? This action cannot be undone.`,
      actionType: "delete",
      onConfirm: async () => {
        const token = accessToken || (await getAccessToken());
        if (!token) throw new Error("No active access token");

        try {
          await deleteCalendarEvent(token, selectedCalendarId, event.id);
          await loadCalendarsAndEvents(token);
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Failed to delete event";
          setAuthError(msg);
        } finally {
          setConfirmDialog(null);
        }
      },
    });
  };

  const filteredEvents = events.filter((ev) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const summaryMatch = (ev.summary || "").toLowerCase().includes(query);
    const locMatch = (ev.location || "").toLowerCase().includes(query);
    const descMatch = (ev.description || "").toLowerCase().includes(query);
    return summaryMatch || locMatch || descMatch;
  });

  return (
    <div className="h-full flex flex-col gap-4 p-4 md:p-6 max-w-6xl mx-auto overflow-y-auto">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-[#292B3A] bg-[#0D0F13]/90 backdrop-blur-xl shadow-lg shadow-black/40">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-extrabold tracking-tight flex items-center gap-2 text-[#F4F2F8]">
              <CalendarIcon className="size-5 text-[#845CFF]" />
              Google Calendar Orchestration
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#7047FF]/20 text-[#845CFF] border border-[#7047FF]/30 uppercase font-semibold">
              Workspace Live API
            </span>
          </div>
          <p className="text-xs text-[#A4A3B2] mt-1">
            Access, view, search, and schedule appointments with user permission.
          </p>
        </div>

        {/* User Account / Auth Actions */}
        <div className="flex items-center gap-2.5">
          {user ? (
            <div className="flex items-center gap-3 bg-[#12141A] border border-[#292B3A] rounded-lg px-3 py-1.5">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || "User"}
                  className="size-7 rounded-full border border-[#7047FF]/40"
                />
              ) : (
                <div className="size-7 rounded-full bg-[#7047FF]/30 text-[#845CFF] flex items-center justify-center font-bold text-xs">
                  {user.displayName?.charAt(0) || "U"}
                </div>
              )}
              <div className="flex flex-col text-left">
                <span className="text-xs font-semibold text-[#F4F2F8] leading-tight">
                  {user.displayName || "Google Account"}
                </span>
                <span className="text-[10px] font-mono text-[#666879] truncate max-w-36">
                  {user.email}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="h-7 px-2 text-xs text-[#FF6269] hover:bg-[#FF6269]/10 hover:text-[#FF6269]"
                title="Sign out of Google"
              >
                <LogOut className="size-3.5" />
              </Button>
            </div>
          ) : (
            <div>
              {/* Official Google Sign-In Styled Button */}
              <button
                type="button"
                onClick={handleLogin}
                disabled={isSigningIn}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg border border-[#292B3A] bg-[#171820] hover:bg-[#1C1D25] hover:border-[#7047FF]/60 text-xs font-semibold text-[#F4F2F8] shadow-sm transition-all"
              >
                <svg
                  version="1.1"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 48 48"
                  className="size-4 shrink-0"
                >
                  <path
                    fill="#EA4335"
                    d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                  />
                  <path
                    fill="#34A853"
                    d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                  />
                  <path fill="none" d="M0 0h48v48H0z" />
                </svg>
                <span>{isSigningIn ? "Connecting..." : "Sign in with Google"}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {authError && (
        <div className="p-3.5 rounded-xl bg-[#FF6269]/10 border border-[#FF6269]/30 text-[#FF6269] text-xs flex items-start gap-2.5">
          <AlertTriangle className="size-4 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold">Notice:</span> {authError}
          </div>
          <button
            onClick={() => setAuthError(null)}
            className="text-[10px] uppercase font-mono hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Content Area */}
      {!user ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 rounded-xl border border-[#292B3A] bg-[#0D0F13]/90 text-center min-h-[380px]">
          <div className="size-16 rounded-2xl bg-gradient-to-br from-[#7047FF] to-[#35246E] flex items-center justify-center p-3 border border-[#845CFF]/40 shadow-[0_0_25px_rgba(112,71,255,0.4)] mb-4">
            <CalendarIcon className="size-8 text-white" />
          </div>
          <h3 className="text-base font-bold text-[#F4F2F8] mb-1">
            Connect Your Google Calendar
          </h3>
          <p className="text-xs text-[#A4A3B2] max-w-md mb-6 leading-relaxed">
            Grant permission to let Tilted Studio & Pyvex Voice sync with your events, check real-time availability, and coordinate meetings seamlessly.
          </p>

          <button
            type="button"
            onClick={handleLogin}
            disabled={isSigningIn}
            className="flex items-center gap-3 px-6 py-2.5 rounded-xl border border-[#7047FF]/50 bg-gradient-to-r from-[#7047FF] to-[#845CFF] hover:from-[#845CFF] hover:to-[#7047FF] text-white text-xs font-semibold shadow-[0_0_20px_rgba(112,71,255,0.4)] transition-all transform active:scale-95"
          >
            <CalendarCheck className="size-4" />
            <span>{isSigningIn ? "Authorizing Google Account..." : "Connect Google Calendar"}</span>
          </button>

          <div className="mt-8 flex flex-wrap justify-center gap-2 text-[10px] font-mono text-[#666879]">
            <span className="px-2 py-0.5 rounded bg-[#171820] border border-[#292B3A]">
              calendar.events
            </span>
            <span className="px-2 py-0.5 rounded bg-[#171820] border border-[#292B3A]">
              calendar.readonly
            </span>
            <span className="px-2 py-0.5 rounded bg-[#171820] border border-[#292B3A]">
              calendar.calendarlist
            </span>
            <span className="px-2 py-0.5 rounded bg-[#171820] border border-[#292B3A]">
              calendar.freebusy
            </span>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col gap-4 min-h-0">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-[#292B3A] bg-[#12141A]">
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-[#A4A3B2] whitespace-nowrap">
                Calendar:
              </label>
              <select
                value={selectedCalendarId}
                onChange={(e) => handleCalendarChange(e.target.value)}
                className="h-8 text-xs rounded-md border border-[#292B3A] bg-[#171820] px-2.5 text-[#F4F2F8] font-medium focus:border-[#7047FF] focus:outline-none"
              >
                {calendars.length === 0 && (
                  <option value="primary">Primary Calendar</option>
                )}
                {calendars.map((cal) => (
                  <option key={cal.id} value={cal.id}>
                    {cal.summary} {cal.primary ? "(Primary)" : ""}
                  </option>
                ))}
              </select>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => loadCalendarsAndEvents()}
                disabled={loadingEvents}
                className="h-8 px-2 text-[#A4A3B2] hover:text-[#F4F2F8] hover:bg-[#1C1D25]"
                title="Refresh calendar events"
              >
                <RefreshCw className={`size-3.5 ${loadingEvents ? "animate-spin" : ""}`} />
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative w-48 sm:w-56">
                <Search className="size-3.5 absolute left-2.5 top-2.5 text-[#666879]" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter events..."
                  className="pl-8 h-8 text-xs bg-[#171820] border-[#292B3A] text-[#F4F2F8] placeholder:text-[#666879] focus-visible:border-[#7047FF]"
                />
              </div>

              <Button
                size="sm"
                onClick={() => setShowCreateModal(true)}
                className="h-8 text-xs gap-1.5 font-semibold bg-[#7047FF] hover:bg-[#845CFF] text-white shadow-[0_0_12px_rgba(112,71,255,0.4)]"
              >
                <Plus className="size-3.5" />
                Schedule Event
              </Button>
            </div>
          </div>

          {/* AI Voice Assistant Prompt Banner */}
          {onSendToVoiceAgent && (
            <div className="p-3 rounded-lg border border-[#34365C] bg-[#171820]/80 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-[#A4A3B2]">
                <Sparkles className="size-4 text-[#24D8ED]" />
                <span>
                  Query schedule via voice:{" "}
                  <strong className="text-[#F4F2F8]">
                    "What does my schedule look like today?"
                  </strong>
                </span>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  onSendToVoiceAgent(
                    "Can you summarize my upcoming schedule on Google Calendar?"
                  )
                }
                className="h-7 text-[11px] border-[#7047FF]/40 text-[#845CFF] hover:bg-[#7047FF]/10 font-mono"
              >
                Ask Pyvex Voice
              </Button>
            </div>
          )}

          {/* Events List */}
          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
            {loadingEvents ? (
              <div className="flex flex-col items-center justify-center p-12 text-[#A4A3B2] gap-2">
                <RefreshCw className="size-6 animate-spin text-[#845CFF]" />
                <span className="text-xs">Fetching Google Calendar events...</span>
              </div>
            ) : filteredEvents.length === 0 ? (
              <div className="p-12 text-center rounded-xl border border-[#292B3A] bg-[#0D0F13]/60">
                <CalendarIcon className="size-8 mx-auto text-[#666879] mb-2 opacity-50" />
                <p className="text-sm font-semibold text-[#F4F2F8]">No events found</p>
                <p className="text-xs text-[#A4A3B2] mt-0.5">
                  {searchQuery
                    ? "Try adjusting your search query."
                    : "No upcoming events scheduled for this calendar."}
                </p>
              </div>
            ) : (
              filteredEvents.map((event) => {
                const startStr =
                  event.start.dateTime || event.start.date || "";
                const endStr = event.end.dateTime || event.end.date || "";
                const isAllDay = !event.start.dateTime && !!event.start.date;

                const startDateObj = startStr ? new Date(startStr) : null;
                const endDateObj = endStr ? new Date(endStr) : null;

                return (
                  <div
                    key={event.id}
                    className="p-3.5 rounded-xl border border-[#292B3A] bg-[#12141A] hover:border-[#34365C] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="size-10 rounded-lg bg-[#1C1D25] border border-[#292B3A] text-[#845CFF] flex flex-col items-center justify-center shrink-0">
                        <span className="text-[10px] font-mono uppercase leading-none font-bold">
                          {startDateObj
                            ? startDateObj.toLocaleString("default", {
                                month: "short",
                              })
                            : "EVT"}
                        </span>
                        <span className="text-sm font-extrabold leading-none mt-0.5 text-[#F4F2F8]">
                          {startDateObj ? startDateObj.getDate() : "--"}
                        </span>
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-[#F4F2F8] truncate">
                            {event.summary || "Untitled Event"}
                          </h4>
                          {isAllDay && (
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#24D8ED]/10 border border-[#24D8ED]/30 text-[#24D8ED]">
                              All Day
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-[#A4A3B2] mt-1">
                          <div className="flex items-center gap-1">
                            <Clock className="size-3 text-[#666879]" />
                            <span>
                              {isAllDay
                                ? "All day"
                                : `${startDateObj?.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - ${endDateObj?.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
                            </span>
                          </div>

                          {event.location && (
                            <div className="flex items-center gap-1 truncate max-w-56">
                              <MapPin className="size-3 text-[#20E99A]" />
                              <span className="truncate">{event.location}</span>
                            </div>
                          )}

                          {event.attendees && event.attendees.length > 0 && (
                            <div className="flex items-center gap-1">
                              <Users className="size-3 text-[#F5BD24]" />
                              <span>{event.attendees.length} attendees</span>
                            </div>
                          )}
                        </div>

                        {event.description && (
                          <p className="text-[11px] text-[#666879] mt-1 line-clamp-1">
                            {event.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      {event.htmlLink && (
                        <a
                          href={event.htmlLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="size-7 rounded-md border border-[#292B3A] bg-[#171820] text-[#A4A3B2] hover:text-[#F4F2F8] hover:border-[#7047FF]/50 flex items-center justify-center"
                          title="Open in Google Calendar"
                        >
                          <ExternalLink className="size-3.5" />
                        </a>
                      )}

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => promptDeleteEvent(event)}
                        className="size-7 p-0 text-[#FF6269] hover:bg-[#FF6269]/10 hover:text-[#FF6269]"
                        title="Delete event"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Create Event Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="bg-[#0D0F13] border border-[#292B3A] rounded-2xl w-full max-w-lg p-6 shadow-2xl shadow-black flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#292B3A]">
              <div className="flex items-center gap-2">
                <CalendarIcon className="size-5 text-[#7047FF]" />
                <h3 className="text-base font-bold text-[#F4F2F8]">
                  Schedule New Event
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-xs text-[#A4A3B2] hover:text-[#F4F2F8]"
              >
                ✕
              </button>
            </div>

            <form onSubmit={promptCreateEvent} className="flex flex-col gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#A4A3B2] mb-1">
                  Event Title *
                </label>
                <Input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. AI Strategy Sync with Team"
                  className="bg-[#12141A] border-[#292B3A] text-xs text-[#F4F2F8] focus-visible:border-[#7047FF]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#A4A3B2] mb-1">
                    Start Time *
                  </label>
                  <Input
                    type="datetime-local"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="bg-[#12141A] border-[#292B3A] text-xs text-[#F4F2F8] focus-visible:border-[#7047FF]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#A4A3B2] mb-1">
                    End Time *
                  </label>
                  <Input
                    type="datetime-local"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="bg-[#12141A] border-[#292B3A] text-xs text-[#F4F2F8] focus-visible:border-[#7047FF]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#A4A3B2] mb-1">
                  Location / Meet Link
                </label>
                <Input
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  placeholder="e.g. Google Meet or Conference Room 4A"
                  className="bg-[#12141A] border-[#292B3A] text-xs text-[#F4F2F8] focus-visible:border-[#7047FF]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#A4A3B2] mb-1">
                  Invite Attendee (Email)
                </label>
                <Input
                  type="email"
                  value={attendeeEmail}
                  onChange={(e) => setAttendeeEmail(e.target.value)}
                  placeholder="e.g. teammate@company.com"
                  className="bg-[#12141A] border-[#292B3A] text-xs text-[#F4F2F8] focus-visible:border-[#7047FF]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#A4A3B2] mb-1">
                  Notes / Description
                </label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Agenda items and details..."
                  className="w-full h-20 p-2.5 rounded-md bg-[#12141A] border border-[#292B3A] text-xs text-[#F4F2F8] focus:border-[#7047FF] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#292B3A]">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCreateModal(false)}
                  className="border-[#292B3A] bg-[#12141A] text-xs text-[#A4A3B2]"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmitting || !newTitle.trim()}
                  className="bg-[#7047FF] hover:bg-[#845CFF] text-white text-xs font-semibold shadow-[0_0_12px_rgba(112,71,255,0.4)]"
                >
                  Schedule Event
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mandatory User Confirmation Dialog */}
      {confirmDialog?.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="bg-[#0D0F13] border border-[#292B3A] rounded-2xl w-full max-w-md p-6 shadow-2xl shadow-black flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2.5 text-[#F4F2F8]">
              {confirmDialog.actionType === "delete" ? (
                <div className="size-8 rounded-lg bg-[#FF6269]/15 border border-[#FF6269]/30 text-[#FF6269] flex items-center justify-center">
                  <AlertTriangle className="size-4" />
                </div>
              ) : (
                <div className="size-8 rounded-lg bg-[#20E99A]/15 border border-[#20E99A]/30 text-[#20E99A] flex items-center justify-center">
                  <CheckCircle2 className="size-4" />
                </div>
              )}
              <h3 className="text-base font-bold">{confirmDialog.title}</h3>
            </div>

            <p className="text-xs text-[#A4A3B2] leading-relaxed">
              {confirmDialog.description}
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#292B3A]">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmDialog(null)}
                className="border-[#292B3A] bg-[#12141A] text-xs text-[#A4A3B2]"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => confirmDialog.onConfirm()}
                className={
                  confirmDialog.actionType === "delete"
                    ? "bg-[#FF6269] hover:bg-[#FF6269]/90 text-white text-xs font-semibold"
                    : "bg-[#7047FF] hover:bg-[#845CFF] text-white text-xs font-semibold"
                }
              >
                {confirmDialog.actionType === "delete"
                  ? "Yes, Delete Event"
                  : "Yes, Confirm Creation"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
