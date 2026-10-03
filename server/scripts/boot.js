import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd: root,
      stdio: "inherit",
      shell: true,
      env: process.env,
    });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} ${args.join(" ")} exited ${code}`));
    });
  });
}

async function main() {
  if (process.env.SEED_ON_BOOT === "true") {
    console.log("SEED_ON_BOOT=true → running prisma seed…");
    await run("node", ["prisma/seed.js"]);
  }
  await run("node", ["src/index.js"]);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
