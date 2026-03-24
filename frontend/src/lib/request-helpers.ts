import type {
  FormValueRow,
  HeaderRow,
  ProjectDoc,
  QueryParamRow,
  RequestDoc,
  RequestHistorySummary,
} from "@restify/shared";

function createRow<T extends HeaderRow | QueryParamRow | FormValueRow>(): T {
  return {
    id: crypto.randomUUID(),
    key: "",
    value: "",
    enabled: true,
  } as T;
}

export function createHeaderRow(): HeaderRow {
  return createRow<HeaderRow>();
}

export function createQueryParamRow(): QueryParamRow {
  return createRow<QueryParamRow>();
}

export function createFormValueRow(): FormValueRow {
  return createRow<FormValueRow>();
}

export function createEmptyRequest(
  project: ProjectDoc,
  folderId?: string | null,
): RequestDoc {
  return {
    _id: crypto.randomUUID(),
    entityType: "request",
    workspaceId: project.workspaceId,
    projectId: project._id,
    folderId: folderId ?? null,
    name: "New Request",
    method: "POST",
    url: "https://api.example.com/resource",
    headers: [createHeaderRow()],
    params: [createQueryParamRow()],
    body: {
      type: "json",
      content: '{\n  "hello": "world"\n}',
    },
    auth: {
      type: "none",
    },
    responseHistory: [] as RequestHistorySummary[],
    order: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
