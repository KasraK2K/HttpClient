import fp from "fastify-plugin";
import type {
  ProjectDoc,
  UnlockTokenPayload,
  WorkspaceMeta,
} from "@restify/shared";

export default fp(async function unlockPlugin(app) {
  app.decorate(
    "issueUnlockToken",
    async (payload: Omit<UnlockTokenPayload, "exp">) => {
      return app.jwt.sign(payload, {
        expiresIn: `${app.config.unlockTtlMinutes}m`,
      });
    },
  );

  app.decorate("readUnlockToken", async (request) => {
    const raw = request.headers["x-unlock-token"];
    const token = Array.isArray(raw) ? raw[0] : raw;
    if (!token) {
      return null;
    }

    try {
      const decoded = await app.jwt.verify<UnlockTokenPayload>(token);
      if (!("scope" in decoded) || !("resourceId" in decoded)) {
        return null;
      }
      return decoded;
    } catch {
      return null;
    }
  });

  app.decorate(
    "assertWorkspaceUnlocked",
    async (request, workspace: WorkspaceMeta) => {
      const user = request.currentUser;
      if (!workspace.isPasswordProtected || user?.role === "superadmin") {
        return;
      }

      const token = await app.readUnlockToken(request);
      if (token?.scope === "workspace" && token.resourceId === workspace._id) {
        return;
      }

      throw app.httpErrors.unauthorized("Workspace is locked");
    },
  );

  app.decorate(
    "assertProjectUnlocked",
    async (request, project: ProjectDoc, workspace?: WorkspaceMeta) => {
      const user = request.currentUser;
      if (user?.role === "superadmin") {
        return;
      }

      const token = await app.readUnlockToken(request);

      if (project.isPasswordProtected) {
        if (token?.scope === "project" && token.resourceId === project._id) {
          return;
        }
        throw app.httpErrors.unauthorized("Project is locked");
      }

      if (workspace?.isPasswordProtected) {
        if (
          token?.scope === "workspace" &&
          token.resourceId === workspace._id
        ) {
          return;
        }
        throw app.httpErrors.unauthorized("Workspace is locked");
      }
    },
  );
});
