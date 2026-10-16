import "server-only";

import { spawn } from "child_process";

function runCommand(command: string, args: string[], input?: Buffer) {
  return new Promise<Buffer>((resolve, reject) => {
    const child = spawn(command, args, {
      env: process.env,
      stdio: ["pipe", "pipe", "pipe"],
    });

    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];

    child.stdout.on("data", (chunk) => stdout.push(Buffer.from(chunk)));
    child.stderr.on("data", (chunk) => stderr.push(Buffer.from(chunk)));
    child.on("error", reject);
    child.stdin.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve(Buffer.concat(stdout));
        return;
      }

      reject(
        new Error(
          Buffer.concat(stderr).toString("utf8") ||
            `${command} exited with code ${code}`,
        ),
      );
    });

    if (input) {
      child.stdin.write(input);
    }
    child.stdin.end();
  });
}

function postgresUrl(value: string) {
  const url = new URL(value);
  for (const key of [
    "schema",
    "connection_limit",
    "pool_timeout",
    "pgbouncer",
    "connect_timeout",
  ])
    url.searchParams.delete(key);
  return url.toString();
}

export async function exportDatabaseSql() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not configured.");
  }

  return runCommand("pg_dump", [
    "--dbname",
    postgresUrl(databaseUrl),
    "--clean",
    "--if-exists",
    "--no-owner",
    "--no-privileges",
    "--format=plain",
  ]);
}

export async function importDatabaseSql(sql: Buffer) {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not configured.");
  }

  await runCommand(
    "psql",
    [
      "--dbname",
      postgresUrl(databaseUrl),
      "--single-transaction",
      "-v",
      "ON_ERROR_STOP=1",
    ],
    sql,
  );
}
