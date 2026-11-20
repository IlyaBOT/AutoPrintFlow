import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtemp,
  mkdir,
  readFile,
  writeFile,
  readdir,
  stat,
  rm,
  copyFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

async function scenario(failure = "", args: string[] = []) {
  const root = await mkdtemp(path.join(tmpdir(), "autoprintflow-update-"));
  await mkdir(path.join(root, "scripts"));
  await mkdir(path.join(root, "bin"));
  await copyFile(
    new URL("../scripts/update.sh", import.meta.url),
    path.join(root, "scripts/update.sh"),
  );
  await writeFile(
    path.join(root, ".env"),
    "COMPOSE_PROJECT_NAME=existing-production\nSESSION_SECRET=preserve-me\n",
  );
  await writeFile(path.join(root, "docker-compose.yml"), "services: {}\n");
  await writeFile(
    path.join(root, "bin/docker"),
    `#!/usr/bin/env bash
set -eu
printf '%s\\n' "$*" >> "$FAKE_DOCKER_LOG"
case "$*" in
  'compose ps --all -q app') if [[ "$FAKE_DOCKER_FAILURE" != missing ]]; then echo previous-container; fi ;;
  'container inspect --format {{.Image}} previous-container') echo previous-image ;;
  'compose build app') if [[ "$FAKE_DOCKER_FAILURE" == build ]]; then exit 2; fi ;;
  'compose exec -T postgres pg_restore --file=/dev/null')
    if [[ "$FAKE_DOCKER_FAILURE" == backup ]]; then exit 4; fi
    cat > /dev/null ;;
  'compose exec -T postgres '*) echo DATABASE_BACKUP ;;
  'compose run --rm --no-deps -T --entrypoint tar '*) tar -czf - .env ;;
  'compose up -d --no-build --no-deps --wait '*) if [[ "$FAKE_DOCKER_FAILURE" == health ]]; then exit 3; fi ;;
esac
`,
    { mode: 0o755 },
  );
  const log = path.join(root, "docker.log");
  const result = spawnSync(
    "bash",
    [path.join(root, "scripts/update.sh"), ...args],
    {
      cwd: root,
      encoding: "utf8",
      env: {
        ...process.env,
        PATH: `${path.join(root, "bin")}:${process.env.PATH}`,
        FAKE_DOCKER_LOG: log,
        FAKE_DOCKER_FAILURE: failure,
        AUTOPRINTFLOW_ROLLBACK_IMAGE:
          failure === "recovery" ? "recovery-image" : "",
      },
    },
  );
  return { root, result, log: await readFile(log, "utf8") };
}
test("update backs up existing configuration/files before replacing the app", async () => {
  const run = await scenario();
  try {
    assert.equal(run.result.status, 0, run.result.stderr);
    const dirs = await readdir(path.join(run.root, "backups"));
    const backup = path.join(run.root, "backups", dirs[0]);
    assert.equal(
      await readFile(path.join(backup, "environment.env"), "utf8"),
      await readFile(path.join(run.root, ".env"), "utf8"),
    );
    assert.equal(
      (await stat(path.join(backup, "environment.env"))).mode & 0o777,
      0o600,
    );
    assert.match(
      await readFile(path.join(backup, "rollback.yml"), "utf8"),
      /^services:\n  app:\n    image: "autoprintflow-rollback:[^"]+"\n    command: \["npm", "run", "start"\]\n$/,
    );
    assert.match(
      await readFile(path.join(backup, "database.dump"), "utf8"),
      /DATABASE_BACKUP/,
    );
    const storageArchive = spawnSync(
      "tar",
      ["-tzf", path.join(backup, "storage.tar.gz")],
      { encoding: "utf8" },
    );
    assert.equal(storageArchive.status, 0, storageArchive.stderr);
    assert.equal(storageArchive.stdout.trim(), ".env");
    assert.ok(
      run.log.indexOf("compose build app") <
        run.log.indexOf("compose stop app"),
    );
    assert.ok(
      run.log.indexOf("pg_dump") < run.log.indexOf("pg_restore") &&
        run.log.indexOf("pg_restore") <
          run.log.indexOf("compose up -d --no-build --no-deps --wait"),
    );
    assert.doesNotMatch(run.log, /down -v|volume rm/);
  } finally {
    await rm(run.root, { recursive: true, force: true });
  }
});
test("an imported image uses the same backup and health checks", async () => {
  const run = await scenario("recovery", ["--no-build"]);
  try {
    assert.equal(run.result.status, 0, run.result.stderr);
    assert.doesNotMatch(run.log, /compose build app/);
    assert.match(run.log, /image tag recovery-image autoprintflow-rollback:/);
    assert.match(run.log, /pg_restore --file=\/dev\/null/);
    assert.match(run.log, /compose up -d --no-build --no-deps --wait/);
  } finally {
    await rm(run.root, { recursive: true, force: true });
  }
});
test("a missing app container leaves the Compose project alone", async () => {
  const run = await scenario("missing");
  try {
    assert.notEqual(run.result.status, 0);
    assert.doesNotMatch(run.log, /compose (build|stop|up)/);
  } finally {
    await rm(run.root, { recursive: true, force: true });
  }
});
test("a build failure leaves the running app alone", async () => {
  const run = await scenario("build");
  try {
    assert.notEqual(run.result.status, 0);
    assert.doesNotMatch(run.log, /compose stop app/);
  } finally {
    await rm(run.root, { recursive: true, force: true });
  }
});
test("a backup verification failure rolls back before the new app starts", async () => {
  const run = await scenario("backup");
  try {
    assert.notEqual(run.result.status, 0);
    assert.doesNotMatch(run.log, /compose up -d --no-build --no-deps --wait/);
    assert.match(run.log, /rollback\.yml up -d --no-build --no-deps app/);
  } finally {
    await rm(run.root, { recursive: true, force: true });
  }
});
test("a health failure starts the saved previous image and reports failure", async () => {
  const run = await scenario("health");
  try {
    assert.notEqual(run.result.status, 0);
    assert.match(
      run.log,
      /compose -f docker-compose.yml -f backups\/[^\n]+\/rollback.yml up -d --no-build --no-deps app/,
    );
  } finally {
    await rm(run.root, { recursive: true, force: true });
  }
});
