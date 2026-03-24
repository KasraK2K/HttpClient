import type { RequestDoc, WorkspaceMeta, WorkspaceTree as WorkspaceTreeModel } from "@restify/shared";
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, ChevronRight, Folder, FolderClosed, GripVertical, Layers3, Lock, Plus, Send, Workflow } from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "../../lib/cn";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { ContextMenus } from "./ContextMenus";
import { LockIcon } from "./LockIcon";

type SortableItem = { _id: string };

interface WorkspaceTreeProps {
  workspaces: WorkspaceMeta[];
  tree?: WorkspaceTreeModel;
  activeWorkspaceId?: string;
  activeProjectId?: string;
  activeRequestId?: string;
  onSelectWorkspace: (workspaceId: string) => void;
  onSelectProject: (projectId: string) => void;
  onSelectRequest: (requestId: string) => void;
  onCreateWorkspace: () => void;
  onCreateProject: () => void;
  onCreateFolder: (projectId: string) => void;
  onCreateRequest: (projectId: string, folderId?: string | null) => void;
  onDuplicateWorkspace: (workspaceId: string) => void;
  onDeleteWorkspace: (workspaceId: string) => void;
  onDuplicateProject: (projectId: string) => void;
  onDeleteProject: (projectId: string) => void;
  onDuplicateFolder: (folderId: string) => void;
  onDeleteFolder: (folderId: string) => void;
  onDuplicateRequest: (requestId: string) => void;
  onDeleteRequest: (requestId: string) => void;
  onWorkspaceReorder: (orderedIds: string[]) => void;
  onProjectReorder: (orderedIds: string[]) => void;
  onFolderReorder: (projectId: string, orderedIds: string[]) => void;
  onRequestReorder: (orderedIds: string[]) => void;
  onUnlockWorkspace: (workspaceId: string) => void;
  onUnlockProject: (projectId: string) => void;
}

function SortableRow({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  };

  return (
    <div ref={setNodeRef} style={style} className="group flex items-center gap-2">
      <button className="rounded-md p-1 text-muted hover:bg-white/8" {...attributes} {...listeners} type="button">
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

function ReorderableList<T extends SortableItem>({ items, onReorder, renderItem }: { items: T[]; onReorder: (orderedIds: string[]) => void; renderItem: (item: T) => React.ReactNode }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = items.findIndex((item) => item._id === active.id);
    const newIndex = items.findIndex((item) => item._id === over.id);
    onReorder(arrayMove(items, oldIndex, newIndex).map((item) => item._id));
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map((item) => item._id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-1">{items.map((item) => <SortableRow key={item._id} id={item._id}>{renderItem(item)}</SortableRow>)}</div>
      </SortableContext>
    </DndContext>
  );
}

function RequestRow({ request, activeRequestId, onSelectRequest, onDuplicateRequest, onDeleteRequest }: { request: RequestDoc; activeRequestId?: string; onSelectRequest: (requestId: string) => void; onDuplicateRequest: (requestId: string) => void; onDeleteRequest: (requestId: string) => void }) {
  return (
    <div className={cn("flex items-center gap-2 rounded-xl px-2 py-1.5", activeRequestId === request._id ? "bg-accent/15 text-foreground" : "text-muted hover:bg-white/6") }>
      <Send className="h-3.5 w-3.5" />
      <button className="min-w-0 flex-1 truncate text-left text-sm" onClick={() => onSelectRequest(request._id)} type="button">
        {request.name}
      </button>
      <ContextMenus onDuplicate={() => onDuplicateRequest(request._id)} onDelete={() => onDeleteRequest(request._id)} />
    </div>
  );
}

export function WorkspaceTree(props: WorkspaceTreeProps) {
  const {
    workspaces,
    tree,
    activeWorkspaceId,
    activeProjectId,
    activeRequestId,
    onSelectWorkspace,
    onSelectProject,
    onSelectRequest,
    onCreateWorkspace,
    onCreateProject,
    onCreateFolder,
    onCreateRequest,
    onDuplicateWorkspace,
    onDeleteWorkspace,
    onDuplicateProject,
    onDeleteProject,
    onDuplicateFolder,
    onDeleteFolder,
    onDuplicateRequest,
    onDeleteRequest,
    onWorkspaceReorder,
    onProjectReorder,
    onFolderReorder,
    onRequestReorder,
    onUnlockWorkspace,
    onUnlockProject
  } = props;

  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({});
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});

  const workspaceList = useMemo(() => [...workspaces].sort((a, b) => a.order - b.order), [workspaces]);

  return (
    <Card className="h-full overflow-hidden">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle>Workspace Tree</CardTitle>
            <p className="mt-1 text-xs text-muted">Workspaces, collections, folders, and requests.</p>
          </div>
          <Button className="h-9" onClick={onCreateWorkspace}>
            <Plus className="h-4 w-4" />
            Workspace
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 overflow-y-auto p-3">
        <ReorderableList
          items={workspaceList}
          onReorder={onWorkspaceReorder}
          renderItem={(workspace) => (
            <div className="rounded-2xl border border-white/8 bg-white/4 p-2">
              <div className={cn("flex items-center gap-2 rounded-xl px-2 py-2", activeWorkspaceId === workspace._id ? "bg-accent/10" : "hover:bg-white/6") }>
                <button className="flex min-w-0 flex-1 items-center gap-2 text-left" onClick={() => (workspace.isPasswordProtected ? onUnlockWorkspace(workspace._id) : onSelectWorkspace(workspace._id))} type="button">
                  <Layers3 className="h-4 w-4 text-accent" />
                  <span className="truncate text-sm font-medium">{workspace.name}</span>
                  <LockIcon locked={workspace.isPasswordProtected} />
                </button>
                <ContextMenus onCreate={activeWorkspaceId === workspace._id ? onCreateProject : undefined} onDuplicate={() => onDuplicateWorkspace(workspace._id)} onDelete={() => onDeleteWorkspace(workspace._id)} />
              </div>
              {tree && workspace._id === activeWorkspaceId ? (
                <div className="mt-2 space-y-2 pl-2">
                  <ReorderableList
                    items={[...tree.projects].sort((a, b) => a.order - b.order)}
                    onReorder={onProjectReorder}
                    renderItem={(project) => {
                      const expanded = expandedProjects[project._id] ?? true;
                      return (
                        <div className="rounded-xl border border-white/6 bg-slate-950/40 p-2">
                          <div className={cn("flex items-center gap-2 rounded-lg px-2 py-1.5", activeProjectId === project._id ? "bg-white/8" : "hover:bg-white/5") }>
                            <button className="rounded-md p-1 text-muted hover:bg-white/8" onClick={() => setExpandedProjects((state) => ({ ...state, [project._id]: !expanded }))} type="button">
                              {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                            </button>
                            <button className="flex min-w-0 flex-1 items-center gap-2 text-left" onClick={() => (project.isPasswordProtected ? onUnlockProject(project._id) : onSelectProject(project._id))} type="button">
                              <Workflow className="h-4 w-4 text-sky-300" />
                              <span className="truncate text-sm">{project.name}</span>
                              {project.isPasswordProtected ? <Lock className="h-3.5 w-3.5 text-amber-300" /> : null}
                            </button>
                            <ContextMenus onCreate={() => onCreateRequest(project._id)} onDuplicate={() => onDuplicateProject(project._id)} onDelete={() => onDeleteProject(project._id)} />
                          </div>
                          {expanded ? (
                            <div className="mt-2 space-y-2 pl-3">
                              {project.requests.length > 0 ? (
                                <ReorderableList
                                  items={[...project.requests].sort((a, b) => a.order - b.order)}
                                  onReorder={onRequestReorder}
                                  renderItem={(request) => <RequestRow request={request} activeRequestId={activeRequestId} onSelectRequest={onSelectRequest} onDuplicateRequest={onDuplicateRequest} onDeleteRequest={onDeleteRequest} />}
                                />
                              ) : null}
                              <ReorderableList
                                items={[...project.folders].sort((a, b) => a.order - b.order)}
                                onReorder={(orderedIds) => onFolderReorder(project._id, orderedIds)}
                                renderItem={(folder) => {
                                  const expandedFolder = expandedFolders[folder._id] ?? true;
                                  return (
                                    <div className="rounded-xl bg-white/5 p-2">
                                      <div className="flex items-center gap-2 rounded-lg px-1 py-1">
                                        <button className="rounded-md p-1 text-muted hover:bg-white/8" onClick={() => setExpandedFolders((state) => ({ ...state, [folder._id]: !expandedFolder }))} type="button">
                                          {expandedFolder ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                                        </button>
                                        {expandedFolder ? <Folder className="h-4 w-4 text-amber-300" /> : <FolderClosed className="h-4 w-4 text-amber-300" />}
                                        <span className="min-w-0 flex-1 truncate text-sm text-foreground">{folder.name}</span>
                                        <ContextMenus onCreate={() => onCreateRequest(project._id, folder._id)} onDuplicate={() => onDuplicateFolder(folder._id)} onDelete={() => onDeleteFolder(folder._id)} />
                                      </div>
                                      {expandedFolder ? (
                                        <div className="space-y-1 pl-4">
                                          {folder.requests.map((request) => (
                                            <RequestRow key={request._id} request={request} activeRequestId={activeRequestId} onSelectRequest={onSelectRequest} onDuplicateRequest={onDuplicateRequest} onDeleteRequest={onDeleteRequest} />
                                          ))}
                                        </div>
                                      ) : null}
                                    </div>
                                  );
                                }}
                              />
                              <Button variant="ghost" className="w-full justify-start" onClick={() => onCreateFolder(project._id)}>
                                <Plus className="h-4 w-4" />
                                Folder
                              </Button>
                            </div>
                          ) : null}
                        </div>
                      );
                    }}
                  />
                </div>
              ) : null}
            </div>
          )}
        />
      </CardContent>
    </Card>
  );
}

