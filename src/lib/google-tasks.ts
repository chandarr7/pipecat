const TASKS_API_BASE = "https://tasks.googleapis.com/tasks/v1";

export interface GoogleTaskList {
  id: string;
  title: string;
}

export type GoogleTaskStatus = "needsAction" | "completed";

export interface GoogleTask {
  id: string;
  title: string;
  notes?: string;
  due?: string;
  status: GoogleTaskStatus;
  completed?: string;
}

export interface CreateTaskPayload {
  title: string;
  notes?: string;
  due?: string;
}

async function googleFetch<T>(token: string, path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${TASKS_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Google Tasks API error (${response.status}): ${body.slice(0, 300)}`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export async function fetchTaskLists(token: string): Promise<GoogleTaskList[]> {
  const data = await googleFetch<{ items?: GoogleTaskList[] }>(token, "/users/@me/lists");
  return data.items ?? [];
}

export async function createTaskList(token: string, title: string): Promise<GoogleTaskList> {
  return googleFetch<GoogleTaskList>(token, "/users/@me/lists", {
    method: "POST",
    body: JSON.stringify({ title }),
  });
}

export async function deleteTaskList(token: string, listId: string): Promise<void> {
  await googleFetch<void>(token, `/users/@me/lists/${encodeURIComponent(listId)}`, {
    method: "DELETE",
  });
}

export async function fetchTasks(token: string, listId: string): Promise<GoogleTask[]> {
  const params = new URLSearchParams({ showCompleted: "true", showHidden: "true" });
  const data = await googleFetch<{ items?: GoogleTask[] }>(
    token,
    `/lists/${encodeURIComponent(listId)}/tasks?${params.toString()}`,
  );
  return data.items ?? [];
}

export async function createTask(
  token: string,
  listId: string,
  payload: CreateTaskPayload,
): Promise<GoogleTask> {
  return googleFetch<GoogleTask>(token, `/lists/${encodeURIComponent(listId)}/tasks`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateTaskStatus(
  token: string,
  listId: string,
  taskId: string,
  nextStatus: GoogleTaskStatus,
): Promise<void> {
  await googleFetch<GoogleTask>(
    token,
    `/lists/${encodeURIComponent(listId)}/tasks/${encodeURIComponent(taskId)}`,
    { method: "PATCH", body: JSON.stringify({ status: nextStatus }) },
  );
}

export async function deleteTask(
  token: string,
  listId: string,
  taskId: string,
): Promise<void> {
  await googleFetch<void>(
    token,
    `/lists/${encodeURIComponent(listId)}/tasks/${encodeURIComponent(taskId)}`,
    { method: "DELETE" },
  );
}

export async function clearCompletedTasks(token: string, listId: string): Promise<void> {
  await googleFetch<void>(token, `/lists/${encodeURIComponent(listId)}/clear`, {
    method: "POST",
  });
}
