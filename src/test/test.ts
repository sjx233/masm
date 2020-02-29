import * as childProcess from "child_process";

childProcess.spawn(process.argv[0], [
  "lib/cli.js",
  "-o", "test/pack",
  "-d", "\"masm test.\"",
  "-n", "masm_test",
  "test/src.wasm"
], { stdio: "inherit" }).once("exit", code => {
  if (code) {
    process.stderr.write(`cli exited with code ${code}\n`);
    process.exit(1);
  }
});
