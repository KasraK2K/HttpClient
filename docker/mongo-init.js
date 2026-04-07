const appDatabase = process.env.MONGODB_DATABASE || "restify";
const appUsername = process.env.MONGODB_APP_USERNAME || "httpclient";
const appPassword = process.env.MONGODB_APP_PASSWORD;

if (!appPassword) {
  throw new Error("MONGODB_APP_PASSWORD is required for MongoDB initialization.");
}

db = db.getSiblingDB(appDatabase);

const existingUser = db.getUser(appUsername);
if (!existingUser) {
  db.createUser({
    user: appUsername,
    pwd: appPassword,
    roles: [
      {
        role: "readWrite",
        db: appDatabase,
      },
    ],
  });
}
