const { spawn } = require("child_process");
const electronPath = require("electron");

const [, , scriptPath, ...args] = process.argv;

if (!scriptPath) {
  console.error("Usage: node scripts/run-electron-node.cjs <script> [...args]");
  process.exit(1);
}

const child = spawn(electronPath, [scriptPath, ...args], {
  env: {
    ...process.env,
    ELECTRON_RUN_AS_NODE: "1",
  },
  stdio: "inherit",
  windowsHide: true,
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
