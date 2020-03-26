import * as childProcess from "child_process";
import { ChildProcess } from "child_process";

function test(args: string[]): ChildProcess {
  return childProcess.spawn(process.argv[0], [
    "lib/cli.js",
    ...args
  ], { stdio: "inherit" }).once("exit", code => {
    if (code) {
      process.stderr.write(`cli exited with code ${code}\n`);
      process.exit(1);
    }
  });
}

test([
  "-o", "test/pack",
  "-d", "\"masm test.\"",
  "-n", "masm_test",
  "--dump",
  "test/src.wasm"
]);
test([
  "-o", "test/std",
  "--std"
]);
