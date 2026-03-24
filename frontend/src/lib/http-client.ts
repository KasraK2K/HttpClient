import type {
  CreateSuperuserPayload,
  ExecuteRequestPayload,
  ExecuteRequestResult,
  HistoryResponse,
  ListUsersResponse,
  ListWorkspacesResponse,
  LoginPayload,
  MeResponse,
  ProjectDoc,
  ProjectEnvVar,
  RequestDoc,
  UnlockResponse,
  User,
  WorkspaceTreeResponse,
} from "@restify/shared";

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    credentials: "include",
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed with ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export const api = {
  bootstrapStatus: () =>
    requestJson<{ needsSuperuser: boolean }>("/auth/bootstrap-status"),
  me: () => requestJson<MeResponse>("/auth/me"),
  login: (body: LoginPayload) =>
    requestJson<MeResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  createSuperuser: (body: CreateSuperuserPayload) =>
    requestJson<MeResponse>("/auth/bootstrap-superuser", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  logout: () =>
    requestJson<{ success: boolean }>("/auth/logout", {
      method: "POST",
      body: JSON.stringify({}),
    }),
  listWorkspaces: () => requestJson<ListWorkspacesResponse>("/workspaces"),
  getWorkspaceTree: (workspaceId: string, unlockToken?: string) =>
    requestJson<WorkspaceTreeResponse>(`/workspaces/${workspaceId}/tree`, {
      headers: unlockToken ? { "X-Unlock-Token": unlockToken } : undefined,
    }),
  createWorkspace: (name: string) =>
    requestJson<{ workspace: unknown }>("/workspaces", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),
  renameWorkspace: (workspaceId: string, name: string) =>
    requestJson<{ workspace: unknown }>(`/workspaces/${workspaceId}`, {
      method: "PATCH",
      body: JSON.stringify({ name }),
    }),
  duplicateWorkspace: (workspaceId: string) =>
    requestJson<{ workspace: unknown }>(
      `/workspaces/${workspaceId}/duplicate`,
      { method: "POST", body: JSON.stringify({}) },
    ),
  reorderWorkspaces: (orderedIds: string[]) =>
    requestJson<{ success: boolean }>("/workspaces/reorder", {
      method: "POST",
      body: JSON.stringify({ orderedIds }),
    }),
  unlockWorkspace: (workspaceId: string, password: string) =>
    requestJson<UnlockResponse>(`/workspaces/${workspaceId}/unlock`, {
      method: "POST",
      body: JSON.stringify({ password }),
    }),
  updateWorkspaceSecurity: (
    workspaceId: string,
    enabled: boolean,
    password?: string,
  ) =>
    requestJson<{ workspace: unknown }>(`/workspaces/${workspaceId}/security`, {
      method: "PUT",
      body: JSON.stringify({ enabled, password }),
    }),
  deleteWorkspace: (workspaceId: string) =>
    requestJson<{ success: boolean }>(`/workspaces/${workspaceId}`, {
      method: "DELETE",
    }),
  createProject: (workspaceId: string, name: string, unlockToken?: string) =>
    requestJson<{ project: ProjectDoc }>("/projects", {
      method: "POST",
      body: JSON.stringify({ workspaceId, name }),
      headers: unlockToken ? { "X-Unlock-Token": unlockToken } : undefined,
    }),
  updateProject: (
    projectId: string,
    workspaceId: string,
    values: { name?: string; envVars?: ProjectEnvVar[] },
    unlockToken?: string,
  ) =>
    requestJson<{ project: ProjectDoc }>(`/projects/${projectId}`, {
      method: "PATCH",
      body: JSON.stringify({ workspaceId, ...values }),
      headers: unlockToken ? { "X-Unlock-Token": unlockToken } : undefined,
    }),
  duplicateProject: (
    projectId: string,
    workspaceId: string,
    unlockToken?: string,
  ) =>
    requestJson<{ project: ProjectDoc }>(`/projects/${projectId}/duplicate`, {
      method: "POST",
      body: JSON.stringify({ workspaceId }),
      headers: unlockToken ? { "X-Unlock-Token": unlockToken } : undefined,
    }),
  reorderProjects: (
    workspaceId: string,
    orderedIds: string[],
    unlockToken?: string,
  ) =>
    requestJson<{ success: boolean }>("/projects/reorder", {
      method: "POST",
      body: JSON.stringify({ workspaceId, orderedIds }),
      headers: unlockToken ? { "X-Unlock-Token": unlockToken } : undefined,
    }),
  unlockProject: (
    projectId: string,
    workspaceId: string,
    password: string,
    unlockToken?: string,
  ) =>
    requestJson<UnlockResponse>(`/projects/${projectId}/unlock`, {
      method: "POST",
      body: JSON.stringify({ workspaceId, password }),
      headers: unlockToken ? { "X-Unlock-Token": unlockToken } : undefined,
    }),
  updateProjectSecurity: (
    projectId: string,
    workspaceId: string,
    enabled: boolean,
    password?: string,
  ) =>
    requestJson<{ project: ProjectDoc }>(`/projects/${projectId}/security`, {
      method: "PUT",
      body: JSON.stringify({ workspaceId, enabled, password }),
    }),
  deleteProject: (projectId: string, workspaceId: string) =>
    requestJson<{ success: boolean }>(
      `/projects/${projectId}?workspaceId=${workspaceId}`,
      { method: "DELETE" },
    ),
  createFolder: (
    workspaceId: string,
    projectId: string,
    name: string,
    unlockToken?: string,
  ) =>
    requestJson<{ folder: unknown }>("/folders", {
      method: "POST",
      body: JSON.stringify({ workspaceId, projectId, name }),
      headers: unlockToken ? { "X-Unlock-Token": unlockToken } : undefined,
    }),
  updateFolder: (
    folderId: string,
    workspaceId: string,
    name: string,
    unlockToken?: string,
  ) =>
    requestJson<{ folder: unknown }>(`/folders/${folderId}`, {
      method: "PATCH",
      body: JSON.stringify({ workspaceId, name }),
      headers: unlockToken ? { "X-Unlock-Token": unlockToken } : undefined,
    }),
  duplicateFolder: (
    folderId: string,
    workspaceId: string,
    unlockToken?: string,
  ) =>
    requestJson<{ folder: unknown }>(`/folders/${folderId}/duplicate`, {
      method: "POST",
      body: JSON.stringify({ workspaceId }),
      headers: unlockToken ? { "X-Unlock-Token": unlockToken } : undefined,
    }),
  reorderFolders: (
    workspaceId: string,
    projectId: string,
    orderedIds: string[],
    unlockToken?: string,
  ) =>
    requestJson<{ success: boolean }>("/folders/reorder", {
      method: "POST",
      body: JSON.stringify({ workspaceId, projectId, orderedIds }),
      headers: unlockToken ? { "X-Unlock-Token": unlockToken } : undefined,
    }),
  deleteFolder: (folderId: string, workspaceId: string) =>
    requestJson<{ success: boolean }>(
      `/folders/${folderId}?workspaceId=${workspaceId}`,
      { method: "DELETE" },
    ),
  createRequest: (
    payload: Omit<
      RequestDoc,
      "_id" | "entityType" | "responseHistory" | "createdAt" | "updatedAt"
    >,
    unlockToken?: string,
  ) =>
    requestJson<{ request: RequestDoc }>("/requests", {
      method: "POST",
      body: JSON.stringify(payload),
      headers: unlockToken ? { "X-Unlock-Token": unlockToken } : undefined,
    }),
  updateRequest: (
    requestId: string,
    payload: Partial<RequestDoc> & { workspaceId: string },
    unlockToken?: string,
  ) =>
    requestJson<{ request: RequestDoc }>(`/requests/${requestId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
      headers: unlockToken ? { "X-Unlock-Token": unlockToken } : undefined,
    }),
  duplicateRequest: (
    requestId: string,
    workspaceId: string,
    unlockToken?: string,
  ) =>
    requestJson<{ request: RequestDoc }>(`/requests/${requestId}/duplicate`, {
      method: "POST",
      body: JSON.stringify({ workspaceId }),
      headers: unlockToken ? { "X-Unlock-Token": unlockToken } : undefined,
    }),
  reorderRequests: (
    workspaceId: string,
    orderedIds: string[],
    unlockToken?: string,
  ) =>
    requestJson<{ success: boolean }>("/requests/reorder", {
      method: "POST",
      body: JSON.stringify({ workspaceId, orderedIds }),
      headers: unlockToken ? { "X-Unlock-Token": unlockToken } : undefined,
    }),
  deleteRequest: (requestId: string, workspaceId: string) =>
    requestJson<{ success: boolean }>(
      `/requests/${requestId}?workspaceId=${workspaceId}`,
      { method: "DELETE" },
    ),
  execute: (payload: ExecuteRequestPayload, unlockToken?: string) =>
    requestJson<ExecuteRequestResult>("/execute", {
      method: "POST",
      body: JSON.stringify(payload),
      headers: unlockToken ? { "X-Unlock-Token": unlockToken } : undefined,
    }),
  getProjectHistory: (
    projectId: string,
    workspaceId: string,
    unlockToken?: string,
  ) =>
    requestJson<HistoryResponse>(
      `/projects/${projectId}/history?workspaceId=${workspaceId}`,
      { headers: unlockToken ? { "X-Unlock-Token": unlockToken } : undefined },
    ),
  listUsers: () => requestJson<ListUsersResponse>("/admin/users"),
  createUser: (payload: {
    username: string;
    password: string;
    role: "admin" | "member";
    workspaceIds?: string[];
  }) =>
    requestJson<{ user: User }>("/admin/users", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateUser: (
    userId: string,
    payload: {
      username?: string;
      password?: string;
      role?: "admin" | "member";
      workspaceIds?: string[];
    },
  ) =>
    requestJson<{ user: User }>(`/admin/users/${userId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  deleteUser: (userId: string) =>
    requestJson<{ success: boolean }>(`/admin/users/${userId}`, {
      method: "DELETE",
    }),
};
