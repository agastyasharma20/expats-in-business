// First-run setup, cross-platform (Windows PowerShell, macOS, Linux).
//   npm run setup            → uses Docker for PostgreSQL + Mailpit
//   npm run setup:nodocker   → uses your own PostgreSQL 17 with pgvector (DATABASE_URL in .env)
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const useDocker = !process.argv.includes("--no-docker");
const MIN_NODE_MAJOR = 24;
const AUTH_SECRET_PLACEHOLDER = "replace-with-a-long-random-string";
// Host ports published by docker-compose.yml
const PORTS = { database: 5433, smtp: 1025, mailUi: 8025 };

const step = (message) => console.log(`\n▶ ${message}`);
const ok = (message) => console.log(`  ✓ ${message}`);

function fail(message, fix) {
  console.error(`\n✗ ${message}`);
  if (fix) console.error(`  How to fix: ${fix}`);
  process.exit(1);
}

function run(command, args, { quiet = false } = {}) {
  // shell: true lets Windows resolve npm.cmd / npx.cmd / docker.exe. Arguments are fixed strings.
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: quiet ? "ignore" : "inherit",
    shell: true,
  });
  return result.status === 0;
}

function checkNode() {
  step("Checking Node.js");
  const major = Number(process.versions.node.split(".")[0]);
  if (major < MIN_NODE_MAJOR) {
    fail(
      `Node.js ${process.versions.node} is too old; EiB needs Node ${MIN_NODE_MAJOR} LTS or newer.`,
      "install Node 24 LTS from https://nodejs.org (or `winget install OpenJS.NodeJS.LTS`), then open a new terminal.",
    );
  }
  ok(`Node ${process.versions.node}`);
}

function checkDocker() {
  step("Checking Docker");
  if (!run("docker", ["--version"], { quiet: true })) {
    fail(
      "Docker is not installed.",
      "install Docker Desktop (https://www.docker.com/products/docker-desktop/) or run `npm run setup:nodocker` with a local PostgreSQL 17 + pgvector.",
    );
  }
  if (!run("docker", ["info"], { quiet: true })) {
    fail(
      "Docker is installed but not running.",
      "start Docker Desktop, wait until it says 'Engine running', then run `npm run setup` again.",
    );
  }
  ok("Docker is running");
}

/** Resolves true if anything accepts TCP connections on localhost:port (IPv4 or IPv6). */
function isPortInUse(port) {
  const probe = (host) =>
    new Promise((resolve) => {
      const socket = net.connect({ host, port });
      const done = (inUse) => {
        socket.destroy();
        resolve(inUse);
      };
      socket.setTimeout(1_000);
      socket.once("connect", () => done(true));
      socket.once("timeout", () => done(false));
      socket.once("error", () => done(false));
    });
  return Promise.all([probe("127.0.0.1"), probe("::1")]).then((results) => results.some(Boolean));
}

function isEibStackRunning() {
  const result = spawnSync("docker", ["compose", "ps", "--status", "running", "-q"], {
    cwd: root,
    encoding: "utf8",
    shell: true,
  });
  return result.status === 0 && result.stdout.trim() !== "";
}

// Another program on our ports makes EiB silently talk to the wrong service (e.g. error P1000).
async function checkPortsFree() {
  step("Checking ports");
  if (isEibStackRunning()) {
    ok("EiB containers already running");
    return;
  }
  for (const [name, port] of Object.entries(PORTS)) {
    if (await isPortInUse(port)) {
      const findIt =
        process.platform === "win32"
          ? `in PowerShell: Get-Process -Id (Get-NetTCPConnection -LocalPort ${port} -State Listen).OwningProcess`
          : `run: lsof -i :${port}`;
      fail(
        `Port ${port} (${name}) is already used by another program.`,
        `find it (${findIt}), stop it, then run "npm run setup" again.`,
      );
    }
  }
  ok(`Ports ${Object.values(PORTS).join(", ")} are free`);
}

function createEnvFile() {
  step("Creating .env");
  const envPath = path.join(root, ".env");
  if (existsSync(envPath)) {
    ok(".env already exists, left unchanged");
    return;
  }
  // Built from .env.example; the existing .env is never read.
  const example = readFileSync(path.join(root, ".env.example"), "utf8");
  const secret = randomBytes(32).toString("base64url");
  writeFileSync(envPath, example.replace(AUTH_SECRET_PLACEHOLDER, secret), { flag: "wx" });
  ok(".env created from .env.example with a fresh BETTER_AUTH_SECRET");
  if (!useDocker) {
    console.log(
      "  → Edit DATABASE_URL in .env to point at your PostgreSQL, then re-run setup:nodocker.",
    );
  }
}

async function main() {
  console.log(`EiB setup (${useDocker ? "Docker" : "no Docker"})`);
  checkNode();
  if (useDocker) {
    checkDocker();
    await checkPortsFree();
  }

  step("Installing dependencies (npm ci)");
  if (!run("npm", ["ci"]))
    fail("npm ci failed.", "close running dev servers or editors locking node_modules and retry.");

  createEnvFile();

  if (useDocker) {
    step("Starting PostgreSQL and Mailpit");
    if (!run("docker", ["compose", "up", "-d", "--wait"])) {
      fail(
        "docker compose could not start the services.",
        `check that ports ${Object.values(PORTS).join(", ")} are free.`,
      );
    }
    ok(`Database on localhost:${PORTS.database}, Mailpit on http://localhost:${PORTS.mailUi}`);
  }

  step("Generating the Prisma client");
  if (!run("npx", ["prisma", "generate"])) fail("prisma generate failed.");

  step("Applying database migrations");
  if (!run("npx", ["prisma", "migrate", "deploy"])) {
    fail(
      "Migrations failed.",
      useDocker
        ? `check DATABASE_URL in .env uses port ${PORTS.database} (an .env made before this port change uses 5432: delete .env and re-run setup). P1000 means a different PostgreSQL answered.`
        : "check DATABASE_URL in .env and that the pgvector extension is installed.",
    );
  }

  step("Seeding base data");
  if (!run("npm", ["run", "db:seed"])) fail("Seeding failed.");

  step("Embedding guides");
  run("npm", ["run", "embed"]);

  console.log("\n✓ Setup complete. Start the app with `npm run dev` → http://localhost:3000");
}

await main();
