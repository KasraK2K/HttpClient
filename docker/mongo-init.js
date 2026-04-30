const appDatabase = process.env.MONGODB_DATABASE || "reqloom";
const appUsername = process.env.MONGODB_APP_USERNAME || "reqloom";
const appPassword = process.env.MONGODB_APP_PASSWORD;

if (!appPassword) {
  throw new Error("MONGODB_APP_PASSWORD is required for MongoDB initialization.");
}

db = db.getSiblingDB(appDatabase);

const appUserRoles = [
  {
    role: "readWrite",
    db: appDatabase,
  },
];
const existingUser = db.getUser(appUsername);
if (!existingUser) {
  db.createUser({
    user: appUsername,
    pwd: appPassword,
    roles: appUserRoles,
  });
  print(`Created MongoDB application user "${appUsername}" for database "${appDatabase}".`);
} else {
  db.updateUser(appUsername, {
    pwd: appPassword,
    roles: appUserRoles,
  });
  print(`Updated MongoDB application user "${appUsername}" for database "${appDatabase}".`);
}
