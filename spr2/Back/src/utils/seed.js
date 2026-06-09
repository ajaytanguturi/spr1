require("dotenv").config();

const { spawn } = require("node:child_process");

const scripts = [
  "src/utils/seedNodes.js",
  "src/utils/seedOwner.js"
];

const runScript = (script) =>
  new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script], {
      stdio: "inherit"
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${script} exited with code ${code}`));
      }
    });
  });

(async () => { // NOSONAR - top-level await is unavailable in CommonJS modules
  try {
    for (const script of scripts) {
      await runScript(script);
    }

    console.log("All seeders completed");
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();