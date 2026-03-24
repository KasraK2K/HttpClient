import type { HistoryDoc, ProjectDoc, RequestDoc, User } from "@restify/shared";
import { Activity, Settings2, Shield, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { CreateSuperuserPage } from "../components/auth/CreateSuperuserPage";
import { LoginPage } from "../components/auth/LoginPage";
import { UnlockModal } from "../components/auth/UnlockModal";
import { PasswordSettings } from "../components/admin/PasswordSettings";
import { UserManagement } from "../components/admin/UserManagement";
import { EnvVarEditor } from "../components/environment/EnvVarEditor";
import { AppShell } from "../components/layout/AppShell";
import { RequestBuilder } from "../components/request-builder/RequestBuilder";
import { ResponseViewer } from "../components/response-viewer/ResponseViewer";
import { CreateEntityDialog } from "../components/sidebar/CreateEntityDialog";
import { WorkspaceTree } from "../components/sidebar/WorkspaceTree";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { api } from "../lib/http-client";
import { createEmptyRequest } from "../lib/request-helpers";
import type { InspectorTab } from "../types";
import { useActiveRequestStore } from "../store/activeRequest";
import { useAuthStore } from "../store/auth";
import { useEnvironmentStore } from "../store/environment";
import { useHistoryStore } from "../store/history";
import { useUnlockTokenStore } from "../store/unlockTokens";
import { useWorkspaceStore } from "../store/workspaces";

function reportError(error: unknown) {
  const message =
    error instanceof Error ? error.message : "Something went wrong";
  window.alert(message);
}

function buildProjectToken(project?: ProjectDoc, workspaceId?: string) {
  const unlockStore = useUnlockTokenStore.getState();
  if (project?.isPasswordProtected) {
    return unlockStore.getProjectToken(project._id);
  }
  return unlockStore.getWorkspaceToken(workspaceId);
}

function buildWorkspaceToken(workspaceId?: string) {
  return useUnlockTokenStore.getState().getWorkspaceToken(workspaceId);
}

type CreateDialogState =
  | { kind: "workspace" }
  | { kind: "project"; workspaceId: string; workspaceName?: string }
  | {
      kind: "folder";
      workspaceId: string;
      projectId: string;
      projectName?: string;
    }
  | null;

export default function App() {
  const {
    user,
    needsSuperuser,
    isInitializing,
    initialize,
    login,
    createSuperuser,
    logout,
  } = useAuthStore();
  const {
    workspaces,
    trees,
    activeWorkspaceId,
    activeProjectId,
    activeRequestId,
    loadWorkspaces,
    loadWorkspaceTree,
    selectWorkspace,
    selectProject,
    selectRequest,
  } = useWorkspaceStore();
  const {
    draft,
    response,
    isSending,
    activeTab,
    setDraft,
    setResponse,
    setSending,
    setActiveTab,
  } = useActiveRequestStore();
  const { envVars, setEnvVars, getEnvVars } = useEnvironmentStore();
  const { historyByProject, setHistory } = useHistoryStore();
  const { setWorkspaceToken, setProjectToken, clearAll } =
    useUnlockTokenStore();

  const [inspectorTab, setInspectorTab] = useState<InspectorTab>(
    "environment",
  );
  const [users, setUsers] = useState<User[]>([]);
  const [unlockTarget, setUnlockTarget] = useState<{
    scope: "workspace" | "project";
    id: string;
  } | null>(null);
  const [createDialog, setCreateDialog] = useState<CreateDialogState>(null);

  const activeWorkspace = useMemo(
    () =>
      workspaces.find((workspace) => workspace._id === activeWorkspaceId),
    [workspaces, activeWorkspaceId],
  );
  const activeTree = activeWorkspaceId ? trees[activeWorkspaceId] : undefined;
  const activeProject = useMemo(
    () =>
      activeTree?.projects.find((project) => project._id === activeProjectId),
    [activeTree, activeProjectId],
  );
  const activeRequest = useMemo<RequestDoc | undefined>(() => {
    if (!activeProject || !activeRequestId) {
      return undefined;
    }
    return [
      ...activeProject.requests,
      ...activeProject.folders.flatMap((folder) => folder.requests),
    ].find((request) => request._id === activeRequestId);
  }, [activeProject, activeRequestId]);
  const activeHistory = activeProject
    ? historyByProject[activeProject._id] ?? []
    : [];
  const activeProjectEnvVars = activeProject
    ? getEnvVars(activeProject._id)
    : [];

  useEffect(() => {
    initialize().catch(reportError);
  }, [initialize]);

  useEffect(() => {
    if (!user) {
      clearAll();
      setDraft(null);
      setResponse(null);
      return;
    }

    loadWorkspaces().catch(reportError);
  }, [user, clearAll, loadWorkspaces, setDraft, setResponse]);

  useEffect(() => {
    if (!user || !activeWorkspaceId) {
      return;
    }

    if (trees[activeWorkspaceId]) {
      return;
    }

    loadWorkspaceTree(activeWorkspaceId).catch(() => undefined);
  }, [user, activeWorkspaceId, trees, loadWorkspaceTree]);

  useEffect(() => {
    if (!activeProject) {
      return;
    }

    setEnvVars(activeProject._id, activeProject.envVars);
    api
      .getProjectHistory(
        activeProject._id,
        activeProject.workspaceId,
        buildProjectToken(activeProject, activeProject.workspaceId),
      )
      .then(({ history }) => setHistory(activeProject._id, history))
      .catch(() => undefined);
  }, [activeProject, setEnvVars, setHistory]);

  useEffect(() => {
    setDraft(activeRequest ? structuredClone(activeRequest) : null);
  }, [activeRequest, setDraft]);

  useEffect(() => {
    if (user?.role !== "superadmin") {
      return;
    }

    api
      .listUsers()
      .then(({ users: listedUsers }) => setUsers(listedUsers))
      .catch(() => undefined);
  }, [user]);

  const refreshWorkspaces = async () => {
    await loadWorkspaces();
    if (activeWorkspaceId) {
      await loadWorkspaceTree(activeWorkspaceId).catch(() => undefined);
    }
  };

  const refreshTree = async (workspaceId = activeWorkspaceId) => {
    if (!workspaceId) {
      return;
    }
    await loadWorkspaceTree(workspaceId);
  };

  const handleSelectWorkspace = async (workspaceId: string) => {
    selectWorkspace(workspaceId);
    try {
      await loadWorkspaceTree(workspaceId);
    } catch {
      return;
    }
  };

  const handleSelectProject = (projectId: string) => {
    selectProject(projectId);
    const project = activeTree?.projects.find((item) => item._id === projectId);
    const firstRequest =
      project?.requests[0]?._id ?? project?.folders[0]?.requests[0]?._id;
    selectRequest(firstRequest);
  };

  const openCreateWorkspaceDialog = () => {
    setCreateDialog({ kind: "workspace" });
  };

  const openCreateProjectDialog = () => {
    if (!activeWorkspace) {
      reportError(new Error("Select a workspace before creating a project."));
      return;
    }

    setCreateDialog({
      kind: "project",
      workspaceId: activeWorkspace._id,
      workspaceName: activeWorkspace.name,
    });
  };

  const openCreateFolderDialog = (projectId: string) => {
    if (!activeWorkspace || !activeTree) {
      reportError(new Error("Open a workspace before creating a folder."));
      return;
    }

    const project = activeTree.projects.find((item) => item._id === projectId);
    if (!project) {
      reportError(new Error("Project not found."));
      return;
    }

    setCreateDialog({
      kind: "folder",
      workspaceId: activeWorkspace._id,
      projectId,
      projectName: project.name,
    });
  };

  const handleCreateEntity = async (name: string) => {
    if (!createDialog) {
      return;
    }

    if (createDialog.kind === "workspace") {
      const { workspace } = await api.createWorkspace(name);
      await loadWorkspaces();
      selectWorkspace(workspace._id);
      await loadWorkspaceTree(workspace._id);
      return;
    }

    if (createDialog.kind === "project") {
      const { project } = await api.createProject(
        createDialog.workspaceId,
        name,
        buildWorkspaceToken(createDialog.workspaceId),
      );
      selectWorkspace(createDialog.workspaceId);
      selectProject(project._id);
      selectRequest(undefined);
      await loadWorkspaceTree(createDialog.workspaceId);
      return;
    }

    const targetProject = trees[createDialog.workspaceId]?.projects.find(
      (project) => project._id === createDialog.projectId,
    );

    await api.createFolder(
      createDialog.workspaceId,
      createDialog.projectId,
      name,
      buildProjectToken(targetProject, createDialog.workspaceId),
    );
    selectWorkspace(createDialog.workspaceId);
    selectProject(createDialog.projectId);
    await loadWorkspaceTree(createDialog.workspaceId);
  };

  const createRequest = async (projectId: string, folderId?: string | null) => {
    if (!activeWorkspace || !activeTree) {
      return;
    }
    const project = activeTree.projects.find((item) => item._id === projectId);
    if (!project) {
      return;
    }
    const requestDraft = createEmptyRequest(project, folderId);
    const { request } = await api.createRequest(
      {
        workspaceId: requestDraft.workspaceId,
        projectId: requestDraft.projectId,
        folderId: requestDraft.folderId,
        name: requestDraft.name,
        method: requestDraft.method,
        url: requestDraft.url,
        headers: requestDraft.headers,
        params: requestDraft.params,
        body: requestDraft.body,
        auth: requestDraft.auth,
        order: [
          ...project.requests,
          ...project.folders.flatMap((folder) => folder.requests),
        ].length,
      },
      buildProjectToken(project, activeWorkspace._id),
    );
    await refreshTree(activeWorkspace._id);
    selectProject(projectId);
    selectRequest(request._id);
  };

  const saveRequest = async () => {
    if (!draft) {
      return;
    }
    await api.updateRequest(
      draft._id,
      { ...draft, workspaceId: draft.workspaceId },
      buildProjectToken(activeProject, draft.workspaceId),
    );
    await refreshTree(draft.workspaceId);
  };

  const sendRequest = async (payload: Parameters<typeof api.execute>[0]) => {
    setSending(true);
    try {
      const result = await api.execute(
        payload,
        buildProjectToken(activeProject, payload.workspaceId),
      );
      setResponse(result);
      if (activeProject) {
        const { history } = await api.getProjectHistory(
          activeProject._id,
          activeProject.workspaceId,
          buildProjectToken(activeProject, activeProject.workspaceId),
        );
        setHistory(activeProject._id, history);
      }
    } catch (error) {
      reportError(error);
    } finally {
      setSending(false);
    }
  };

  const updateEnvironment = async () => {
    if (!activeProject || !activeWorkspace) {
      return;
    }
    await api.updateProject(
      activeProject._id,
      activeWorkspace._id,
      { envVars: envVars[activeProject._id] ?? [] },
      buildProjectToken(activeProject, activeWorkspace._id),
    );
    await refreshTree(activeWorkspace._id);
  };

  const refreshUsers = async () => {
    if (user?.role !== "superadmin") {
      return;
    }
    const response = await api.listUsers();
    setUsers(response.users);
  };

  const handleUnlockSubmit = async (password: string) => {
    if (!unlockTarget) {
      return;
    }

    if (unlockTarget.scope === "workspace") {
      const response = await api.unlockWorkspace(unlockTarget.id, password);
      setWorkspaceToken(unlockTarget.id, response.token);
      await refreshTree(unlockTarget.id);
      selectWorkspace(unlockTarget.id);
      return;
    }

    if (!activeWorkspace) {
      return;
    }

    const response = await api.unlockProject(
      unlockTarget.id,
      activeWorkspace._id,
      password,
      buildWorkspaceToken(activeWorkspace._id),
    );
    setProjectToken(unlockTarget.id, response.token);
    await refreshTree(activeWorkspace._id);
    selectProject(unlockTarget.id);
  };

  const deleteEntity = async (label: string, action: () => Promise<void>) => {
    if (!window.confirm(`Delete ${label}?`)) {
      return;
    }
    await action();
  };

  const createDialogConfig = useMemo(() => {
    if (!createDialog) {
      return null;
    }

    if (createDialog.kind === "workspace") {
      return {
        title: "Create Workspace",
        description:
          "Add a new workspace to organize projects, folders, and requests.",
        label: "Workspace",
        placeholder: "Workspace name",
        submitLabel: "Create Workspace",
      };
    }

    if (createDialog.kind === "project") {
      return {
        title: "Create Project",
        description: createDialog.workspaceName
          ? `Create a project inside ${createDialog.workspaceName}.`
          : "Create a project inside the selected workspace.",
        label: "Project",
        placeholder: "Project name",
        submitLabel: "Create Project",
      };
    }

    return {
      title: "Create Folder",
      description: createDialog.projectName
        ? `Group requests inside ${createDialog.projectName}.`
        : "Create a folder inside the selected project.",
      label: "Folder",
      placeholder: "Folder name",
      submitLabel: "Create Folder",
    };
  }, [createDialog]);

  if (isInitializing) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted">
        Starting Restify...
      </div>
    );
  }

  if (needsSuperuser && !user) {
    return <CreateSuperuserPage onSubmit={createSuperuser} />;
  }

  if (!user) {
    return <LoginPage onSubmit={login} />;
  }

  return (
    <>
      <AppShell
        user={user}
        activeWorkspaceName={activeWorkspace?.name}
        activeProjectName={activeProject?.name}
        activeRequestName={activeRequest?.name}
        onLogout={logout}
        sidebar={
          <WorkspaceTree
            workspaces={workspaces}
            tree={activeTree}
            activeWorkspaceId={activeWorkspaceId}
            activeProjectId={activeProjectId}
            activeRequestId={activeRequestId}
            onSelectWorkspace={(workspaceId) =>
              handleSelectWorkspace(workspaceId).catch(reportError)
            }
            onSelectProject={handleSelectProject}
            onSelectRequest={selectRequest}
            onCreateWorkspace={openCreateWorkspaceDialog}
            onCreateProject={openCreateProjectDialog}
            onCreateFolder={openCreateFolderDialog}
            onCreateRequest={(projectId, folderId) =>
              createRequest(projectId, folderId).catch(reportError)
            }
            onDuplicateWorkspace={(workspaceId) =>
              api.duplicateWorkspace(workspaceId).then(refreshWorkspaces).catch(reportError)
            }
            onDeleteWorkspace={(workspaceId) =>
              deleteEntity("workspace", () =>
                api.deleteWorkspace(workspaceId).then(refreshWorkspaces),
              ).catch(reportError)
            }
            onDuplicateProject={(projectId) =>
              activeWorkspace &&
              api
                .duplicateProject(
                  projectId,
                  activeWorkspace._id,
                  buildProjectToken(activeProject, activeWorkspace._id),
                )
                .then(() => refreshTree(activeWorkspace._id))
                .catch(reportError)
            }
            onDeleteProject={(projectId) =>
              activeWorkspace &&
              deleteEntity("project", () =>
                api.deleteProject(projectId, activeWorkspace._id).then(() =>
                  refreshTree(activeWorkspace._id),
                ),
              ).catch(reportError)
            }
            onDuplicateFolder={(folderId) =>
              activeWorkspace &&
              api
                .duplicateFolder(
                  folderId,
                  activeWorkspace._id,
                  buildProjectToken(activeProject, activeWorkspace._id),
                )
                .then(() => refreshTree(activeWorkspace._id))
                .catch(reportError)
            }
            onDeleteFolder={(folderId) =>
              activeWorkspace &&
              deleteEntity("folder", () =>
                api.deleteFolder(folderId, activeWorkspace._id).then(() =>
                  refreshTree(activeWorkspace._id),
                ),
              ).catch(reportError)
            }
            onDuplicateRequest={(requestId) =>
              activeWorkspace &&
              api
                .duplicateRequest(
                  requestId,
                  activeWorkspace._id,
                  buildProjectToken(activeProject, activeWorkspace._id),
                )
                .then(() => refreshTree(activeWorkspace._id))
                .catch(reportError)
            }
            onDeleteRequest={(requestId) =>
              activeWorkspace &&
              deleteEntity("request", () =>
                api.deleteRequest(requestId, activeWorkspace._id).then(() =>
                  refreshTree(activeWorkspace._id),
                ),
              ).catch(reportError)
            }
            onWorkspaceReorder={(orderedIds) =>
              api.reorderWorkspaces(orderedIds).then(refreshWorkspaces).catch(reportError)
            }
            onProjectReorder={(orderedIds) =>
              activeWorkspace &&
              api
                .reorderProjects(
                  activeWorkspace._id,
                  orderedIds,
                  buildWorkspaceToken(activeWorkspace._id),
                )
                .then(() => refreshTree(activeWorkspace._id))
                .catch(reportError)
            }
            onFolderReorder={(_projectId, orderedIds) =>
              activeWorkspace &&
              activeProject &&
              api
                .reorderFolders(
                  activeWorkspace._id,
                  activeProject._id,
                  orderedIds,
                  buildProjectToken(activeProject, activeWorkspace._id),
                )
                .then(() => refreshTree(activeWorkspace._id))
                .catch(reportError)
            }
            onRequestReorder={(orderedIds) =>
              activeWorkspace &&
              api
                .reorderRequests(
                  activeWorkspace._id,
                  orderedIds,
                  buildProjectToken(activeProject, activeWorkspace._id),
                )
                .then(() => refreshTree(activeWorkspace._id))
                .catch(reportError)
            }
            onUnlockWorkspace={(workspaceId) =>
              setUnlockTarget({ scope: "workspace", id: workspaceId })
            }
            onUnlockProject={(projectId) =>
              setUnlockTarget({ scope: "project", id: projectId })
            }
          />
        }
        builder={
          <RequestBuilder
            draft={draft}
            envVars={activeProjectEnvVars}
            activeTab={activeTab}
            isSending={isSending}
            onDraftChange={setDraft}
            onActiveTabChange={setActiveTab}
            onSave={() => saveRequest().catch(reportError)}
            onSend={(payload) => sendRequest(payload).catch(reportError)}
          />
        }
        response={<ResponseViewer response={response} />}
        inspector={
          <Tabs
            value={inspectorTab}
            onValueChange={(value) => setInspectorTab(value as InspectorTab)}
          >
            <TabsList className="mb-4 flex w-full justify-between">
              <TabsTrigger value="environment">
                <Settings2 className="mr-1 h-4 w-4" />Environment
              </TabsTrigger>
              <TabsTrigger value="history">
                <Activity className="mr-1 h-4 w-4" />History
              </TabsTrigger>
              <TabsTrigger value="security">
                <Shield className="mr-1 h-4 w-4" />Security
              </TabsTrigger>
              {user.role === "superadmin" ? (
                <TabsTrigger value="admin">
                  <Users className="mr-1 h-4 w-4" />Admin
                </TabsTrigger>
              ) : null}
            </TabsList>
            <TabsContent value="environment">
              <EnvVarEditor
                projectName={activeProject?.name}
                envVars={activeProjectEnvVars}
                onChange={(rows) =>
                  activeProject && setEnvVars(activeProject._id, rows)
                }
                onSave={() => updateEnvironment().catch(reportError)}
              />
            </TabsContent>
            <TabsContent value="history">
              <Card>
                <CardHeader>
                  <CardTitle>Request History</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {activeHistory.length === 0 ? (
                    <p className="text-sm text-muted">
                      The last 50 project executions will appear here.
                    </p>
                  ) : null}
                  {activeHistory.map((entry: HistoryDoc) => (
                    <div
                      key={entry._id}
                      className="rounded-2xl border border-white/8 bg-white/4 p-3"
                    >
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="font-medium text-foreground">
                          {entry.method}
                        </span>
                        <span className="text-muted">{entry.status}</span>
                      </div>
                      <div className="mt-1 truncate text-xs text-muted">
                        {entry.url}
                      </div>
                      <div className="mt-2 flex items-center justify-between text-xs text-muted">
                        <span>{new Date(entry.createdAt).toLocaleString()}</span>
                        <span>{entry.durationMs} ms</span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="security">
              <PasswordSettings
                workspace={activeWorkspace}
                project={activeProject}
                onSaveWorkspace={(enabled, password) =>
                  activeWorkspace
                    ? api
                        .updateWorkspaceSecurity(
                          activeWorkspace._id,
                          enabled,
                          password,
                        )
                        .then(() => refreshWorkspaces())
                    : Promise.resolve()
                }
                onSaveProject={(enabled, password) =>
                  activeProject && activeWorkspace
                    ? api
                        .updateProjectSecurity(
                          activeProject._id,
                          activeWorkspace._id,
                          enabled,
                          password,
                        )
                        .then(() => refreshTree(activeWorkspace._id))
                    : Promise.resolve()
                }
              />
            </TabsContent>
            {user.role === "superadmin" ? (
              <TabsContent value="admin">
                <UserManagement
                  users={users}
                  workspaces={workspaces}
                  onCreate={(payload) => api.createUser(payload).then(refreshUsers)}
                  onUpdate={(userId, payload) =>
                    api.updateUser(userId, payload).then(refreshUsers)
                  }
                  onDelete={(userId) =>
                    deleteEntity("user", () =>
                      api.deleteUser(userId).then(refreshUsers),
                    )
                  }
                />
              </TabsContent>
            ) : null}
          </Tabs>
        }
      />
      {createDialogConfig ? (
        <CreateEntityDialog
          open={Boolean(createDialog)}
          title={createDialogConfig.title}
          description={createDialogConfig.description}
          label={createDialogConfig.label}
          placeholder={createDialogConfig.placeholder}
          submitLabel={createDialogConfig.submitLabel}
          onOpenChange={(open) => !open && setCreateDialog(null)}
          onSubmit={handleCreateEntity}
        />
      ) : null}
      <UnlockModal
        open={Boolean(unlockTarget)}
        title={
          unlockTarget?.scope === "workspace"
            ? "Unlock Workspace"
            : "Unlock Project"
        }
        description={
          unlockTarget?.scope === "workspace"
            ? "Enter the workspace password to load its contents."
            : "Enter the project password to access its requests and settings."
        }
        onSubmit={handleUnlockSubmit}
        onOpenChange={(open) => !open && setUnlockTarget(null)}
      />
    </>
  );
}

