import os from "node:os";
import path from "node:path";
import EmbeddedPostgres from "embedded-postgres";
const pg = new EmbeddedPostgres({
  databaseDir: path.join(os.tmpdir(), "autoprintflow-test-db-pg16"),
  user: "postgres",
  password: "local-test-only",
  port: 55432,
  persistent: true,
  postgresFlags: ["-h", "127.0.0.1"],
  onLog: () => {},
  onError: console.error,
});
await pg.initialise();
await pg.start();
try {
  await pg.createDatabase("autoprintflow_test");
} catch (error) {
  if (!String(error).includes("already exists")) throw error;
}
console.log("Local test PostgreSQL ready at 127.0.0.1:55432");
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, async () => {
    await pg.stop();
    process.exit(0);
  });
setInterval(() => {}, 60000);
