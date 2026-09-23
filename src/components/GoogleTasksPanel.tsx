import React, { useState, useEffect } from "react";
import type { User } from "firebase/auth";
import {
  initAuth,
  googleSignIn,
  logoutGoogle,
  getAccessToken,
} from "@/lib/google-auth";
import {
  fetchTaskLists,
  createTaskList,
  deleteTaskList,
  fetchTasks,
  createTask,
  updateTaskStatus,
  deleteTask,
  clearCompletedTasks,
  type GoogleTaskList,
  type GoogleTask,
  type CreateTaskPayload,
} from "@/lib/google-tasks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CheckSquare,
  Square,
  ListTodo,
  Plus,
  Trash2,
  RefreshCw,
  LogOut,
  Calendar,
  Search,
  CheckCircle2,
  AlertTriangle,
  FolderPlus,
  Sparkles,
  Check,
  Clock,
  ExternalLink,
} from "lucide-react";

interface GoogleTasksPanelProps {
  onSendToVoiceAgent?: (message: string) => void;
}

export const GoogleTasksPanel: React.FC<GoogleTasksPanelProps> = ({
  onSendToVoiceAgent,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Task Lists
  const [taskLists, setTaskLists] = useState<GoogleTaskList[]>([]);
  const [selectedListId, setSelectedListId] = useState<string>("@default");
  const [tasks, setTasks] = useState<GoogleTask[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "completed">("all");

  // Create Task Modal state
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskNotes, setNewTaskNotes] = useState("");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);

  // Create Task List Modal state
  const [showCreateListModal, setShowCreateListModal] = useState(false);
  const [newListTitle, setNewListTitle] = useState("");
  const [isSubmittingList, setIsSubmittingList] = useState(false);

  // Mandatory Confirmation Dialog State
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    actionType: "create" | "delete" | "toggle" | "clear";
    onConfirm: () => Promise<void>;
  } | null>(null);

  // Initialize Auth
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, token) => {
        setUser(currentUser);
        setAccessToken(token);
        loadTaskListsAndTasks(token);
      },
      () => {
        setUser(null);
        setAccessToken(null);
        setTaskLists([]);
        setTasks([]);
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
        await loadTaskListsAndTasks(res.accessToken);
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
    setTaskLists([]);
    setTasks([]);
  };

  const loadTaskListsAndTasks = async (token?: string | null) => {
    const activeToken = token || accessToken || (await getAccessToken());
    if (!activeToken) return;

    setLoadingTasks(true);
    setAuthError(null);
    try {
      const lists = await fetchTaskLists(activeToken);
      setTaskLists(lists);

      const targetListId =
        selectedListId === "@default" && lists.length > 0 ? lists[0].id : selectedListId;
      if (lists.length > 0 && selectedListId === "@default") {
        setSelectedListId(lists[0].id);
      }

      const items = await fetchTasks(activeToken, targetListId);
      setTasks(items);
    } catch (err: unknown) {
      console.error("Error loading task lists/tasks:", err);
      const msg = err instanceof Error ? err.message : "Error fetching Google Tasks";
      setAuthError(msg);
    } finally {
      setLoadingTasks(false);
    }
  };

  const handleListChange = async (listId: string) => {
    setSelectedListId(listId);
    const token = accessToken || (await getAccessToken());
    if (!token) return;

    setLoadingTasks(true);
    try {
      const items = await fetchTasks(token, listId);
      setTasks(items);
    } catch (err) {
      console.error("Error fetching tasks for list:", err);
    } finally {
      setLoadingTasks(false);
    }
  };

  // Trigger Create Task List with Mandatory Confirmation
  const promptCreateList = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListTitle.trim()) return;

    setConfirmDialog({
      isOpen: true,
      title: "Confirm New Task List",
      description: `Create new Google Task list named "${newListTitle.trim()}"?`,
      actionType: "create",
      onConfirm: async () => {
        const token = accessToken || (await getAccessToken());
        if (!token) throw new Error("No active access token found");

        setIsSubmittingList(true);
        try {
          const created = await createTaskList(token, newListTitle.trim());
          setShowCreateListModal(false);
          setNewListTitle("");
          setSelectedListId(created.id);
          await loadTaskListsAndTasks(token);
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Failed to create task list";
          setAuthError(msg);
        } finally {
          setIsSubmittingList(false);
          setConfirmDialog(null);
        }
      },
    });
  };

  // Trigger Delete Task List with Mandatory Confirmation
  const promptDeleteList = (listId: string, listTitle: string) => {
    setConfirmDialog({
      isOpen: true,
      title: "Confirm Task List Deletion",
      description: `Are you sure you want to permanently delete task list "${listTitle}" and all its tasks? This action cannot be undone.`,
      actionType: "delete",
      onConfirm: async () => {
        const token = accessToken || (await getAccessToken());
        if (!token) throw new Error("No active access token found");

        try {
          await deleteTaskList(token, listId);
          setSelectedListId("@default");
          await loadTaskListsAndTasks(token);
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Failed to delete task list";
          setAuthError(msg);
        } finally {
          setConfirmDialog(null);
        }
      },
    });
  };

  // Trigger Create Task with Mandatory Confirmation
  const promptCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const listName = taskLists.find((l) => l.id === selectedListId)?.title || "Current List";

    setConfirmDialog({
      isOpen: true,
      title: "Confirm Task Creation",
      description: `Create new task "${newTaskTitle}" in "${listName}"${newTaskDueDate ? ` due on ${new Date(newTaskDueDate).toLocaleDateString()}` : ""}?`,
      actionType: "create",
      onConfirm: async () => {
        const token = accessToken || (await getAccessToken());
        if (!token) throw new Error("No active access token found");

        setIsSubmittingTask(true);
        try {
          const payload: CreateTaskPayload = {
            title: newTaskTitle.trim(),
            notes: newTaskNotes.trim() || undefined,
            due: newTaskDueDate ? new Date(newTaskDueDate).toISOString() : undefined,
          };

          await createTask(token, selectedListId, payload);
          setShowCreateTaskModal(false);
          setNewTaskTitle("");
          setNewTaskNotes("");
          setNewTaskDueDate("");
          await loadTaskListsAndTasks(token);
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Failed to create task";
          setAuthError(msg);
        } finally {
          setIsSubmittingTask(false);
          setConfirmDialog(null);
        }
      },
    });
  };

  // Trigger Toggle Status (Complete / Incomplete) with Mandatory Confirmation
  const promptToggleTaskStatus = (task: GoogleTask) => {
    const isCurrentlyCompleted = task.status === "completed";
    const nextStatus = isCurrentlyCompleted ? "needsAction" : "completed";
    const actionLabel = isCurrentlyCompleted ? "mark as incomplete" : "mark as completed";

    setConfirmDialog({
      isOpen: true,
      title: `Confirm Task Update`,
      description: `Do you want to ${actionLabel} "${task.title || "Untitled Task"}"?`,
      actionType: "toggle",
      onConfirm: async () => {
        const token = accessToken || (await getAccessToken());
        if (!token) throw new Error("No active access token");

        try {
          await updateTaskStatus(token, selectedListId, task.id, nextStatus);
          await loadTaskListsAndTasks(token);
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Failed to update task";
          setAuthError(msg);
        } finally {
          setConfirmDialog(null);
        }
      },
    });
  };

  // Trigger Delete Task with Mandatory Confirmation
  const promptDeleteTask = (task: GoogleTask) => {
    setConfirmDialog({
      isOpen: true,
      title: "Confirm Task Deletion",
      description: `Are you sure you want to permanently delete task "${task.title || "Untitled Task"}"? This action cannot be undone.`,
      actionType: "delete",
      onConfirm: async () => {
        const token = accessToken || (await getAccessToken());
        if (!token) throw new Error("No active access token");

        try {
          await deleteTask(token, selectedListId, task.id);
          await loadTaskListsAndTasks(token);
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Failed to delete task";
          setAuthError(msg);
        } finally {
          setConfirmDialog(null);
        }
      },
    });
  };

  // Trigger Clear Completed with Mandatory Confirmation
  const promptClearCompleted = () => {
    const listName = taskLists.find((l) => l.id === selectedListId)?.title || "Current List";
    const completedCount = tasks.filter((t) => t.status === "completed").length;

    setConfirmDialog({
      isOpen: true,
      title: "Clear Completed Tasks",
      description: `Permanently clear all ${completedCount} completed tasks from "${listName}"?`,
      actionType: "clear",
      onConfirm: async () => {
        const token = accessToken || (await getAccessToken());
        if (!token) throw new Error("No active access token");

        try {
          await clearCompletedTasks(token, selectedListId);
          await loadTaskListsAndTasks(token);
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Failed to clear completed tasks";
          setAuthError(msg);
        } finally {
          setConfirmDialog(null);
        }
      },
    });
  };

  const filteredTasks = tasks.filter((task) => {
    // Status filter
    if (statusFilter === "active" && task.status !== "needsAction") return false;
    if (statusFilter === "completed" && task.status !== "completed") return false;

    // Search query
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const titleMatch = (task.title || "").toLowerCase().includes(query);
    const notesMatch = (task.notes || "").toLowerCase().includes(query);
    return titleMatch || notesMatch;
  });

  const activeCount = tasks.filter((t) => t.status === "needsAction").length;
  const completedCount = tasks.filter((t) => t.status === "completed").length;

  return (
    <div className="h-full flex flex-col gap-4 p-4 md:p-6 max-w-6xl mx-auto overflow-y-auto">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-[#292B3A] bg-[#0D0F13]/90 backdrop-blur-xl shadow-lg shadow-black/40">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-extrabold tracking-tight flex items-center gap-2 text-[#F4F2F8]">
              <ListTodo className="size-5 text-[#24D8ED]" />
              Google Tasks Orchestration
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#24D8ED]/15 text-[#24D8ED] border border-[#24D8ED]/30 uppercase font-semibold">
              Tasks Live API
            </span>
          </div>
          <p className="text-xs text-[#A4A3B2] mt-1">
            Organize to-do lists, manage deadlines, track deliverables, and sync voice action items.
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
                  className="size-7 rounded-full border border-[#24D8ED]/40"
                />
              ) : (
                <div className="size-7 rounded-full bg-[#24D8ED]/20 text-[#24D8ED] flex items-center justify-center font-bold text-xs">
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
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg border border-[#292B3A] bg-[#171820] hover:bg-[#1C1D25] hover:border-[#24D8ED]/60 text-xs font-semibold text-[#F4F2F8] shadow-sm transition-all"
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
          <div className="size-16 rounded-2xl bg-gradient-to-br from-[#24D8ED] to-[#0A4F6E] flex items-center justify-center p-3 border border-[#24D8ED]/40 shadow-[0_0_25px_rgba(36,216,237,0.4)] mb-4">
            <CheckSquare className="size-8 text-white" />
          </div>
          <h3 className="text-base font-bold text-[#F4F2F8] mb-1">
            Connect Your Google Tasks
          </h3>
          <p className="text-xs text-[#A4A3B2] max-w-md mb-6 leading-relaxed">
            Grant permission to let Tilted Studio & Pyvex Voice sync with your Google Tasks lists, track deadlines, and create to-dos seamlessly.
          </p>

          <button
            type="button"
            onClick={handleLogin}
            disabled={isSigningIn}
            className="flex items-center gap-3 px-6 py-2.5 rounded-xl border border-[#24D8ED]/50 bg-gradient-to-r from-[#24D8ED] to-[#7047FF] hover:from-[#7047FF] hover:to-[#24D8ED] text-white text-xs font-semibold shadow-[0_0_20px_rgba(36,216,237,0.4)] transition-all transform active:scale-95"
          >
            <CheckSquare className="size-4" />
            <span>{isSigningIn ? "Authorizing Google Account..." : "Connect Google Tasks"}</span>
          </button>

          <div className="mt-8 flex flex-wrap justify-center gap-2 text-[10px] font-mono text-[#666879]">
            <span className="px-2 py-0.5 rounded bg-[#171820] border border-[#292B3A]">
              https://www.googleapis.com/auth/tasks
            </span>
            <span className="px-2 py-0.5 rounded bg-[#171820] border border-[#292B3A]">
              https://www.googleapis.com/auth/tasks.readonly
            </span>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col gap-4 min-h-0">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-[#292B3A] bg-[#12141A]">
            <div className="flex items-center gap-2 flex-wrap">
              <label className="text-xs font-medium text-[#A4A3B2] whitespace-nowrap">
                List:
              </label>
              <select
                value={selectedListId}
                onChange={(e) => handleListChange(e.target.value)}
                className="h-8 text-xs rounded-md border border-[#292B3A] bg-[#171820] px-2.5 text-[#F4F2F8] font-medium focus:border-[#24D8ED] focus:outline-none"
              >
                {taskLists.length === 0 && (
                  <option value="@default">Default Tasks</option>
                )}
                {taskLists.map((list) => (
                  <option key={list.id} value={list.id}>
                    {list.title}
                  </option>
                ))}
              </select>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCreateListModal(true)}
                className="h-8 px-2 text-xs text-[#24D8ED] hover:bg-[#24D8ED]/10"
                title="Create a new task list"
              >
                <FolderPlus className="size-3.5 mr-1" />
                New List
              </Button>

              {taskLists.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const curList = taskLists.find((l) => l.id === selectedListId);
                    if (curList) promptDeleteList(curList.id, curList.title);
                  }}
                  className="h-8 px-2 text-xs text-[#FF6269] hover:bg-[#FF6269]/10"
                  title="Delete current task list"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={() => loadTaskListsAndTasks()}
                disabled={loadingTasks}
                className="h-8 px-2 text-[#A4A3B2] hover:text-[#F4F2F8] hover:bg-[#1C1D25]"
                title="Refresh tasks"
              >
                <RefreshCw className={`size-3.5 ${loadingTasks ? "animate-spin" : ""}`} />
              </Button>
            </div>

            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              {/* Filter Tabs */}
              <div className="flex items-center bg-[#171820] border border-[#292B3A] rounded-lg p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setStatusFilter("all")}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    statusFilter === "all"
                      ? "bg-[#24D8ED]/20 text-[#24D8ED] font-semibold"
                      : "text-[#A4A3B2] hover:text-[#F4F2F8]"
                  }`}
                >
                  All ({tasks.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("active")}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    statusFilter === "active"
                      ? "bg-[#7047FF]/20 text-[#845CFF] font-semibold"
                      : "text-[#A4A3B2] hover:text-[#F4F2F8]"
                  }`}
                >
                  Active ({activeCount})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("completed")}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    statusFilter === "completed"
                      ? "bg-[#20E99A]/20 text-[#20E99A] font-semibold"
                      : "text-[#A4A3B2] hover:text-[#F4F2F8]"
                  }`}
                >
                  Done ({completedCount})
                </button>
              </div>

              {/* Search */}
              <div className="relative w-40 sm:w-48">
                <Search className="size-3.5 absolute left-2.5 top-2.5 text-[#666879]" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search tasks..."
                  className="pl-8 h-8 text-xs bg-[#171820] border-[#292B3A] text-[#F4F2F8] placeholder:text-[#666879] focus-visible:border-[#24D8ED]"
                />
              </div>

              <Button
                size="sm"
                onClick={() => setShowCreateTaskModal(true)}
                className="h-8 text-xs gap-1.5 font-semibold bg-[#24D8ED] hover:bg-[#20b8cb] text-[#08090B] shadow-[0_0_12px_rgba(36,216,237,0.4)]"
              >
                <Plus className="size-3.5" />
                Add Task
              </Button>
            </div>
          </div>

          {/* AI Voice Assistant Prompt Banner */}
          {onSendToVoiceAgent && (
            <div className="p-3 rounded-lg border border-[#34365C] bg-[#171820]/80 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-[#A4A3B2]">
                <Sparkles className="size-4 text-[#20E99A]" />
                <span>
                  Query to-dos via voice:{" "}
                  <strong className="text-[#F4F2F8]">
                    "What are my pending tasks in Google Tasks?"
                  </strong>
                </span>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  onSendToVoiceAgent(
                    "Can you summarize my active tasks and pending to-dos from Google Tasks?"
                  )
                }
                className="h-7 text-[11px] border-[#24D8ED]/40 text-[#24D8ED] hover:bg-[#24D8ED]/10 font-mono"
              >
                Ask Pyvex Voice
              </Button>
            </div>
          )}

          {/* Tasks List */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {loadingTasks ? (
              <div className="flex flex-col items-center justify-center p-12 text-[#A4A3B2] gap-2">
                <RefreshCw className="size-6 animate-spin text-[#24D8ED]" />
                <span className="text-xs">Fetching Google Tasks...</span>
              </div>
            ) : filteredTasks.length === 0 ? (
              <div className="p-12 text-center rounded-xl border border-[#292B3A] bg-[#0D0F13]/60">
                <CheckSquare className="size-8 mx-auto text-[#666879] mb-2 opacity-50" />
                <p className="text-sm font-semibold text-[#F4F2F8]">No tasks found</p>
                <p className="text-xs text-[#A4A3B2] mt-0.5">
                  {searchQuery
                    ? "Try adjusting your search query."
                    : statusFilter === "completed"
                    ? "No completed tasks yet."
                    : "No active tasks in this list. Click '+ Add Task' to create one."}
                </p>
              </div>
            ) : (
              filteredTasks.map((task) => {
                const isCompleted = task.status === "completed";
                const dueDateObj = task.due ? new Date(task.due) : null;
                const isOverdue =
                  dueDateObj &&
                  !isCompleted &&
                  dueDateObj.getTime() < new Date().setHours(0, 0, 0, 0);

                return (
                  <div
                    key={task.id}
                    className={`p-3 rounded-xl border transition-all flex items-start justify-between gap-3 shadow-xs ${
                      isCompleted
                        ? "border-[#292B3A]/60 bg-[#12141A]/50 opacity-70"
                        : "border-[#292B3A] bg-[#12141A] hover:border-[#34365C]"
                    }`}
                  >
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      {/* Completion Checkbox Button with Confirmation Prompt */}
                      <button
                        type="button"
                        onClick={() => promptToggleTaskStatus(task)}
                        className={`size-6 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                          isCompleted
                            ? "bg-[#20E99A] border-[#20E99A] text-[#08090B] shadow-[0_0_10px_rgba(32,233,154,0.4)]"
                            : "border-[#34365C] bg-[#171820] hover:border-[#24D8ED] text-transparent hover:text-[#24D8ED]/40"
                        }`}
                        title={
                          isCompleted
                            ? "Click to mark as incomplete (opens confirmation)"
                            : "Click to complete task (opens confirmation)"
                        }
                      >
                        <Check className="size-3.5 stroke-[3]" />
                      </button>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-sm font-semibold truncate ${
                              isCompleted
                                ? "line-through text-[#666879]"
                                : "text-[#F4F2F8]"
                            }`}
                          >
                            {task.title || "Untitled Task"}
                          </span>

                          {isCompleted && (
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#20E99A]/10 border border-[#20E99A]/30 text-[#20E99A]">
                              Completed
                            </span>
                          )}

                          {isOverdue && (
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#FF6269]/10 border border-[#FF6269]/30 text-[#FF6269]">
                              Overdue
                            </span>
                          )}
                        </div>

                        {task.notes && (
                          <p className="text-xs text-[#A4A3B2] mt-1 whitespace-pre-line leading-relaxed">
                            {task.notes}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#666879] mt-1.5">
                          {dueDateObj && (
                            <div
                              className={`flex items-center gap-1 font-mono ${
                                isOverdue
                                  ? "text-[#FF6269]"
                                  : isCompleted
                                  ? "text-[#666879]"
                                  : "text-[#24D8ED]"
                              }`}
                            >
                              <Calendar className="size-3" />
                              <span>Due {dueDateObj.toLocaleDateString()}</span>
                            </div>
                          )}

                          {task.completed && (
                            <div className="flex items-center gap-1 font-mono text-[#20E99A]/80">
                              <CheckCircle2 className="size-3" />
                              <span>
                                Done {new Date(task.completed).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => promptDeleteTask(task)}
                        className="size-7 p-0 text-[#FF6269] hover:bg-[#FF6269]/10 hover:text-[#FF6269]"
                        title="Delete task"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })
            )}

            {/* Clear Completed Action Button at Bottom */}
            {completedCount > 0 && (
              <div className="pt-2 flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={promptClearCompleted}
                  className="h-7 text-xs border-[#292B3A] text-[#A4A3B2] hover:text-[#FF6269] hover:border-[#FF6269]/40 bg-[#12141A]"
                >
                  <Trash2 className="size-3 mr-1.5 text-[#FF6269]" />
                  Clear {completedCount} Completed Tasks
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Task Modal */}
      {showCreateTaskModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="bg-[#0D0F13] border border-[#292B3A] rounded-2xl w-full max-w-md p-6 shadow-2xl shadow-black flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#292B3A]">
              <div className="flex items-center gap-2">
                <CheckSquare className="size-5 text-[#24D8ED]" />
                <h3 className="text-base font-bold text-[#F4F2F8]">
                  Add Google Task
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateTaskModal(false)}
                className="text-xs text-[#A4A3B2] hover:text-[#F4F2F8]"
              >
                ✕
              </button>
            </div>

            <form onSubmit={promptCreateTask} className="flex flex-col gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#A4A3B2] mb-1">
                  Task Title *
                </label>
                <Input
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="e.g. Implement pipeline observer tests"
                  className="bg-[#12141A] border-[#292B3A] text-xs text-[#F4F2F8] focus-visible:border-[#24D8ED]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#A4A3B2] mb-1">
                  Due Date (Optional)
                </label>
                <Input
                  type="date"
                  value={newTaskDueDate}
                  onChange={(e) => setNewTaskDueDate(e.target.value)}
                  className="bg-[#12141A] border-[#292B3A] text-xs text-[#F4F2F8] focus-visible:border-[#24D8ED]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#A4A3B2] mb-1">
                  Details / Notes (Optional)
                </label>
                <textarea
                  value={newTaskNotes}
                  onChange={(e) => setNewTaskNotes(e.target.value)}
                  placeholder="Add context, subtasks, or reference links..."
                  className="w-full h-24 p-2.5 rounded-md bg-[#12141A] border border-[#292B3A] text-xs text-[#F4F2F8] focus:border-[#24D8ED] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#292B3A]">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCreateTaskModal(false)}
                  className="border-[#292B3A] bg-[#12141A] text-xs text-[#A4A3B2]"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmittingTask || !newTaskTitle.trim()}
                  className="bg-[#24D8ED] hover:bg-[#20b8cb] text-[#08090B] text-xs font-semibold shadow-[0_0_12px_rgba(36,216,237,0.4)]"
                >
                  Create Task
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Task List Modal */}
      {showCreateListModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="bg-[#0D0F13] border border-[#292B3A] rounded-2xl w-full max-w-sm p-6 shadow-2xl shadow-black flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#292B3A]">
              <div className="flex items-center gap-2">
                <FolderPlus className="size-5 text-[#24D8ED]" />
                <h3 className="text-base font-bold text-[#F4F2F8]">
                  New Task List
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateListModal(false)}
                className="text-xs text-[#A4A3B2] hover:text-[#F4F2F8]"
              >
                ✕
              </button>
            </div>

            <form onSubmit={promptCreateList} className="flex flex-col gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#A4A3B2] mb-1">
                  List Title *
                </label>
                <Input
                  value={newListTitle}
                  onChange={(e) => setNewListTitle(e.target.value)}
                  placeholder="e.g. Sprints, Work, Research"
                  className="bg-[#12141A] border-[#292B3A] text-xs text-[#F4F2F8] focus-visible:border-[#24D8ED]"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#292B3A]">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCreateListModal(false)}
                  className="border-[#292B3A] bg-[#12141A] text-xs text-[#A4A3B2]"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmittingList || !newListTitle.trim()}
                  className="bg-[#24D8ED] hover:bg-[#20b8cb] text-[#08090B] text-xs font-semibold"
                >
                  Create List
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
              {confirmDialog.actionType === "delete" || confirmDialog.actionType === "clear" ? (
                <div className="size-8 rounded-lg bg-[#FF6269]/15 border border-[#FF6269]/30 text-[#FF6269] flex items-center justify-center">
                  <AlertTriangle className="size-4" />
                </div>
              ) : (
                <div className="size-8 rounded-lg bg-[#24D8ED]/15 border border-[#24D8ED]/30 text-[#24D8ED] flex items-center justify-center">
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
                  confirmDialog.actionType === "delete" || confirmDialog.actionType === "clear"
                    ? "bg-[#FF6269] hover:bg-[#FF6269]/90 text-white text-xs font-semibold"
                    : "bg-[#24D8ED] hover:bg-[#20b8cb] text-[#08090B] text-xs font-semibold"
                }
              >
                {confirmDialog.actionType === "delete"
                  ? "Yes, Delete"
                  : confirmDialog.actionType === "clear"
                  ? "Yes, Clear Tasks"
                  : "Yes, Confirm"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
