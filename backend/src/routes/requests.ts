import type {
  ExecuteRequestPayload,
  FolderDoc,
  HistoryDoc,
  ProjectDoc,
  RequestDoc,
  WorkspaceMeta,
} from "@restify/shared";
import type { FastifyPluginAsync } from "fastify";
import { getWorkspaceById } from "../db/bootstrap.js";
import {
  createId,
  isoNow,
  serializeDoc,
  serializeDocs,
  toObjectId,
  workspaceDataCollection,
} from "../db/collections.js";
import { executeHttpRequest } from "../lib/http-executor.js";
import { canAccessWorkspace, getRequiredUser } from "../lib/permissions.js";

async function requireWorkspace(
  app: Parameters<FastifyPluginAsync>[0],
  workspaceId: string,
): Promise<WorkspaceMeta> {
  const workspace = await getWorkspaceById(app.mongo, workspaceId);
  if (!workspace) {
    throw app.httpErrors.notFound("Workspace not found");
  }
  return workspace;
}

async function requireProject(
  app: Parameters<FastifyPluginAsync>[0],
  workspaceId: string,
  projectId: string,
): Promise<ProjectDoc> {
  const project = await workspaceDataCollection(app.mongo, workspaceId).findOne(
    { _id: toObjectId(projectId), entityType: "project" },
  );
  if (!project) {
    throw app.httpErrors.notFound("Project not found");
  }
  return serializeDoc(project) as ProjectDoc;
}

async function requireFolder(
  app: Parameters<FastifyPluginAsync>[0],
  workspaceId: string,
  folderId: string,
): Promise<FolderDoc> {
  const folder = await workspaceDataCollection(app.mongo, workspaceId).findOne({
    _id: toObjectId(folderId),
    entityType: "folder",
  });
  if (!folder) {
    throw app.httpErrors.notFound("Folder not found");
  }
  return serializeDoc(folder) as unknown as FolderDoc;
}

async function requireRequestDoc(
  app: Parameters<FastifyPluginAsync>[0],
  workspaceId: string,
  requestId: string,
): Promise<RequestDoc> {
  const requestDoc = await workspaceDataCollection(
    app.mongo,
    workspaceId,
  ).findOne({ _id: toObjectId(requestId), entityType: "request" });
  if (!requestDoc) {
    throw app.httpErrors.notFound("Request not found");
  }
  return serializeDoc(requestDoc) as RequestDoc;
}

async function trimHistory(
  app: Parameters<FastifyPluginAsync>[0],
  workspaceId: string,
  projectId: string,
) {
  const staleRecords = await workspaceDataCollection(app.mongo, workspaceId)
    .find({ entityType: "history", projectId })
    .sort({ createdAt: -1 })
    .skip(50)
    .project({ _id: 1 })
    .toArray();

  if (staleRecords.length > 0) {
    await workspaceDataCollection(app.mongo, workspaceId).deleteMany({
      _id: { $in: staleRecords.map((record) => record._id) },
    });
  }
}

const requestRoutes: FastifyPluginAsync = async (app) => {
  app.post<{ Body: { workspaceId: string; projectId: string; name: string } }>(
    "/folders",
    { preHandler: app.authenticate },
    async (request) => {
      const workspace = await requireWorkspace(app, request.body.workspaceId);
      const project = await requireProject(
        app,
        workspace._id,
        request.body.projectId,
      );
      const user = getRequiredUser(request);
      if (!canAccessWorkspace(user, workspace)) {
        throw app.httpErrors.forbidden(
          "You do not have access to this workspace",
        );
      }

      await app.assertProjectUnlocked(request, project, workspace);

      const maxOrder = await workspaceDataCollection(app.mongo, workspace._id)
        .find({ entityType: "folder", projectId: project._id })
        .sort({ order: -1 })
        .limit(1)
        .toArray();

      const now = isoNow();
      const folder = {
        _id: createId(),
        entityType: "folder",
        workspaceId: workspace._id,
        projectId: project._id,
        name: request.body.name.trim(),
        order:
          ((maxOrder[0] as { order?: number } | undefined)?.order ?? -1) + 1,
        createdAt: now,
        updatedAt: now,
      };

      await workspaceDataCollection(app.mongo, workspace._id).insertOne(
        folder as never,
      );
      return { folder: serializeDoc(folder) };
    },
  );

  app.patch<{
    Params: { folderId: string };
    Body: { workspaceId: string; name: string };
  }>(
    "/folders/:folderId",
    { preHandler: app.authenticate },
    async (request) => {
      const workspace = await requireWorkspace(app, request.body.workspaceId);
      const folder = await requireFolder(
        app,
        workspace._id,
        request.params.folderId,
      );
      const project = await requireProject(
        app,
        workspace._id,
        folder.projectId,
      );
      const user = getRequiredUser(request);
      if (!canAccessWorkspace(user, workspace)) {
        throw app.httpErrors.forbidden(
          "You do not have access to this workspace",
        );
      }

      await app.assertProjectUnlocked(request, project, workspace);
      await workspaceDataCollection(app.mongo, workspace._id).updateOne(
        { _id: toObjectId(folder._id) },
        { $set: { name: request.body.name.trim(), updatedAt: isoNow() } },
      );

      return {
        folder: await requireFolder(
          app,
          workspace._id,
          request.params.folderId,
        ),
      };
    },
  );

  app.post<{ Params: { folderId: string }; Body: { workspaceId: string } }>(
    "/folders/:folderId/duplicate",
    { preHandler: app.authenticate },
    async (request) => {
      const workspace = await requireWorkspace(app, request.body.workspaceId);
      const folder = await requireFolder(
        app,
        workspace._id,
        request.params.folderId,
      );
      const project = await requireProject(
        app,
        workspace._id,
        folder.projectId,
      );
      const user = getRequiredUser(request);
      if (!canAccessWorkspace(user, workspace)) {
        throw app.httpErrors.forbidden(
          "You do not have access to this workspace",
        );
      }

      await app.assertProjectUnlocked(request, project, workspace);

      const requestDocs = await workspaceDataCollection(
        app.mongo,
        workspace._id,
      )
        .find({ entityType: "request", folderId: folder._id })
        .toArray();
      const newFolderId = createId();
      const now = isoNow();

      await workspaceDataCollection(app.mongo, workspace._id).insertOne({
        _id: newFolderId,
        entityType: "folder",
        workspaceId: workspace._id,
        projectId: folder.projectId,
        name: `${folder.name} Copy`,
        order: requestDocs.length,
        createdAt: now,
        updatedAt: now,
      } as never);

      if (requestDocs.length > 0) {
        const clonedRequests = requestDocs.map((requestDoc) => ({
          ...requestDoc,
          _id: createId(),
          folderId: newFolderId.toHexString(),
          createdAt: now,
          updatedAt: now,
        }));
        await workspaceDataCollection(app.mongo, workspace._id).insertMany(
          clonedRequests as never[],
        );
      }

      return {
        folder: await requireFolder(
          app,
          workspace._id,
          newFolderId.toHexString(),
        ),
      };
    },
  );

  app.post<{
    Body: { workspaceId: string; projectId: string; orderedIds: string[] };
  }>("/folders/reorder", { preHandler: app.authenticate }, async (request) => {
    const workspace = await requireWorkspace(app, request.body.workspaceId);
    const project = await requireProject(
      app,
      workspace._id,
      request.body.projectId,
    );
    const user = getRequiredUser(request);
    if (!canAccessWorkspace(user, workspace)) {
      throw app.httpErrors.forbidden(
        "You do not have access to this workspace",
      );
    }

    await app.assertProjectUnlocked(request, project, workspace);
    await Promise.all(
      request.body.orderedIds.map((folderId, index) =>
        workspaceDataCollection(app.mongo, workspace._id).updateOne(
          { _id: toObjectId(folderId), entityType: "folder" },
          { $set: { order: index, updatedAt: isoNow() } },
        ),
      ),
    );
    return { success: true };
  });

  app.delete<{
    Params: { folderId: string };
    Querystring: { workspaceId: string };
  }>(
    "/folders/:folderId",
    { preHandler: app.authenticate },
    async (request) => {
      const workspace = await requireWorkspace(app, request.query.workspaceId);
      const folder = await requireFolder(
        app,
        workspace._id,
        request.params.folderId,
      );
      const project = await requireProject(
        app,
        workspace._id,
        folder.projectId,
      );
      const user = getRequiredUser(request);
      if (!canAccessWorkspace(user, workspace)) {
        throw app.httpErrors.forbidden(
          "You do not have access to this workspace",
        );
      }

      await app.assertProjectUnlocked(request, project, workspace);
      await workspaceDataCollection(app.mongo, workspace._id).deleteMany({
        $or: [{ _id: toObjectId(folder._id) }, { folderId: folder._id }],
      });
      return { success: true };
    },
  );

  app.post<{
    Body: Omit<
      RequestDoc,
      "_id" | "entityType" | "createdAt" | "updatedAt" | "responseHistory"
    >;
  }>("/requests", { preHandler: app.authenticate }, async (request) => {
    const workspace = await requireWorkspace(app, request.body.workspaceId);
    const project = await requireProject(
      app,
      workspace._id,
      request.body.projectId,
    );
    const user = getRequiredUser(request);
    if (!canAccessWorkspace(user, workspace)) {
      throw app.httpErrors.forbidden(
        "You do not have access to this workspace",
      );
    }

    await app.assertProjectUnlocked(request, project, workspace);

    const requestId = createId();
    const now = isoNow();
    const requestDoc = {
      _id: requestId,
      entityType: "request",
      workspaceId: workspace._id,
      projectId: project._id,
      folderId: request.body.folderId ?? null,
      name: request.body.name,
      method: request.body.method,
      url: request.body.url,
      headers: request.body.headers,
      params: request.body.params,
      body: request.body.body,
      auth: request.body.auth,
      responseHistory: [],
      order: request.body.order,
      createdAt: now,
      updatedAt: now,
    };

    await workspaceDataCollection(app.mongo, workspace._id).insertOne(
      requestDoc as never,
    );
    return { request: serializeDoc(requestDoc) };
  });

  app.patch<{
    Params: { requestId: string };
    Body: Partial<RequestDoc> & { workspaceId: string };
  }>(
    "/requests/:requestId",
    { preHandler: app.authenticate },
    async (request) => {
      const workspace = await requireWorkspace(app, request.body.workspaceId);
      const requestDoc = await requireRequestDoc(
        app,
        workspace._id,
        request.params.requestId,
      );
      const project = await requireProject(
        app,
        workspace._id,
        requestDoc.projectId,
      );
      const user = getRequiredUser(request);
      if (!canAccessWorkspace(user, workspace)) {
        throw app.httpErrors.forbidden(
          "You do not have access to this workspace",
        );
      }

      await app.assertProjectUnlocked(request, project, workspace);

      const patch: Record<string, unknown> = {
        updatedAt: isoNow(),
      };

      [
        "name",
        "method",
        "url",
        "headers",
        "params",
        "body",
        "auth",
        "folderId",
        "order",
      ].forEach((key) => {
        if (key in request.body) {
          patch[key] = request.body[key as keyof typeof request.body];
        }
      });

      await workspaceDataCollection(app.mongo, workspace._id).updateOne(
        { _id: toObjectId(requestDoc._id) },
        { $set: patch },
      );

      return {
        request: await requireRequestDoc(app, workspace._id, requestDoc._id),
      };
    },
  );

  app.post<{ Params: { requestId: string }; Body: { workspaceId: string } }>(
    "/requests/:requestId/duplicate",
    { preHandler: app.authenticate },
    async (request) => {
      const workspace = await requireWorkspace(app, request.body.workspaceId);
      const requestDoc = await requireRequestDoc(
        app,
        workspace._id,
        request.params.requestId,
      );
      const project = await requireProject(
        app,
        workspace._id,
        requestDoc.projectId,
      );
      const user = getRequiredUser(request);
      if (!canAccessWorkspace(user, workspace)) {
        throw app.httpErrors.forbidden(
          "You do not have access to this workspace",
        );
      }

      await app.assertProjectUnlocked(request, project, workspace);

      const duplicateId = createId();
      const now = isoNow();
      await workspaceDataCollection(app.mongo, workspace._id).insertOne({
        ...requestDoc,
        _id: duplicateId,
        name: `${requestDoc.name} Copy`,
        responseHistory: [],
        createdAt: now,
        updatedAt: now,
      } as never);
      return {
        request: await requireRequestDoc(
          app,
          workspace._id,
          duplicateId.toHexString(),
        ),
      };
    },
  );

  app.post<{ Body: { workspaceId: string; orderedIds: string[] } }>(
    "/requests/reorder",
    { preHandler: app.authenticate },
    async (request) => {
      const workspace = await requireWorkspace(app, request.body.workspaceId);
      const user = getRequiredUser(request);
      if (!canAccessWorkspace(user, workspace)) {
        throw app.httpErrors.forbidden(
          "You do not have access to this workspace",
        );
      }

      await Promise.all(
        request.body.orderedIds.map((requestId, index) =>
          workspaceDataCollection(app.mongo, workspace._id).updateOne(
            { _id: toObjectId(requestId), entityType: "request" },
            { $set: { order: index, updatedAt: isoNow() } },
          ),
        ),
      );
      return { success: true };
    },
  );

  app.delete<{
    Params: { requestId: string };
    Querystring: { workspaceId: string };
  }>(
    "/requests/:requestId",
    { preHandler: app.authenticate },
    async (request) => {
      const workspace = await requireWorkspace(app, request.query.workspaceId);
      const requestDoc = await requireRequestDoc(
        app,
        workspace._id,
        request.params.requestId,
      );
      const project = await requireProject(
        app,
        workspace._id,
        requestDoc.projectId,
      );
      const user = getRequiredUser(request);
      if (!canAccessWorkspace(user, workspace)) {
        throw app.httpErrors.forbidden(
          "You do not have access to this workspace",
        );
      }

      await app.assertProjectUnlocked(request, project, workspace);
      await workspaceDataCollection(app.mongo, workspace._id).deleteOne({
        _id: toObjectId(requestDoc._id),
      });
      return { success: true };
    },
  );

  app.get<{
    Params: { projectId: string };
    Querystring: { workspaceId: string };
  }>(
    "/projects/:projectId/history",
    { preHandler: app.authenticate },
    async (request) => {
      const workspace = await requireWorkspace(app, request.query.workspaceId);
      const project = await requireProject(
        app,
        workspace._id,
        request.params.projectId,
      );
      const user = getRequiredUser(request);
      if (!canAccessWorkspace(user, workspace)) {
        throw app.httpErrors.forbidden(
          "You do not have access to this workspace",
        );
      }

      await app.assertProjectUnlocked(request, project, workspace);
      const history = serializeDocs(
        await workspaceDataCollection(app.mongo, workspace._id)
          .find({ entityType: "history", projectId: project._id })
          .sort({ createdAt: -1 })
          .toArray(),
      ) as HistoryDoc[];

      return { history };
    },
  );

  app.post<{ Body: ExecuteRequestPayload }>(
    "/execute",
    { preHandler: app.authenticate },
    async (request) => {
      const workspace = await requireWorkspace(app, request.body.workspaceId);
      const project = await requireProject(
        app,
        workspace._id,
        request.body.projectId,
      );
      const user = getRequiredUser(request);
      if (!canAccessWorkspace(user, workspace)) {
        throw app.httpErrors.forbidden(
          "You do not have access to this workspace",
        );
      }

      await app.assertProjectUnlocked(request, project, workspace);
      const result = await executeHttpRequest(request.body);
      const now = isoNow();

      const historyRecord = {
        _id: createId(),
        entityType: "history",
        workspaceId: workspace._id,
        projectId: project._id,
        requestId: request.body.requestId,
        method: request.body.method,
        url: request.body.url,
        status: result.status,
        durationMs: result.durationMs,
        sizeBytes: result.sizeBytes,
        createdAt: now,
        updatedAt: now,
      };

      await workspaceDataCollection(app.mongo, workspace._id).insertOne(
        historyRecord as never,
      );
      await trimHistory(app, workspace._id, project._id);

      if (request.body.requestId) {
        await workspaceDataCollection(app.mongo, workspace._id).updateOne(
          { _id: toObjectId(request.body.requestId), entityType: "request" },
          {
            $set: { updatedAt: now },
            $push: {
              responseHistory: {
                $each: [
                  {
                    requestId: request.body.requestId,
                    method: request.body.method,
                    url: request.body.url,
                    status: result.status,
                    durationMs: result.durationMs,
                    createdAt: now,
                  },
                ],
                $slice: -10,
              },
            },
          },
        );
      }

      return result;
    },
  );
};

export default requestRoutes;
