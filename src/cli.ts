#!/usr/bin/env node

import * as fs from "fs";
import { DataPack } from "minecraft-packs";
import { compileTo } from ".";
import { description, name, version } from "./version";
import commander = require("commander");
import ProgressBar = require("progress");

commander
  .name(name)
  .version(version)
  .description(description)
  .usage("[options] <file>")
  .option("-o, --output <file>", "output file", "out")
  .option("-d, --pack-description <description>", "data pack description", "")
  .option("-n, --namespace <namespace>", "module namespace", "module")
  .option("--dump", "dump WebAssembly AST")
  .parse(process.argv);
const [fileName] = commander.args;
if (!fileName) commander.help();
const {
  output,
  packDescription,
  namespace,
  dump
} = commander.opts() as {
  output: string;
  packDescription: string;
  namespace: string;
  dump?: true;
};

function createProgressBar(action: string, total: number): ProgressBar {
  return new ProgressBar("[:bar] :current/:total " + action, {
    clear: true,
    complete: "=",
    incomplete: " ",
    total,
    width: 18
  });
}

(async () => {
  const input = fs.readFileSync(fileName === "-" ? 0 : fs.openSync(fileName, "r"));
  const pack = new DataPack(packDescription);
  compileTo(pack, namespace, input, dump);
  const bar = createProgressBar("writing files: :id", pack.functions.size);
  await pack.write(output, (type, id) => type === "function" && bar.tick({ id }));
})().catch(error => {
  process.stderr.write(`unexpected error: ${error && error.stack ? error.stack : error}\n`);
  process.exit(1);
});
