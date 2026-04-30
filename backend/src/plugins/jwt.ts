import fp from "fastify-plugin";
import fastifyCookie from "@fastify/cookie";
import fastifyJwt from "@fastify/jwt";
import { findSessionUserById } from "../db/bootstrap.js";
import type { UserSessionToken } from "@reqloom/shared";

export default fp(async function jwtPlugin(app) {
  app.decorateRequest("currentUser", null);

  await app.register(fastifyCookie);
  await app.register(fastifyJwt, {
    secret: app.config.jwtSecret,
    cookie: {
      cookieName: app.config.cookieName,
      signed: false,
    },
  });

  app.decorate("authenticate", async (request) => {
    const payload = await request.jwtVerify<UserSessionToken>();
    const currentUser = await findSessionUserById(app.mongo, payload.sub);
    if (!currentUser) {
      throw app.httpErrors.unauthorized("Session is no longer valid");
    }
    request.currentUser = currentUser;
  });
});
