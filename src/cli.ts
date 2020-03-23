#!/usr/bin/env node

import * as fs from "fs";
import { DataPack } from "minecraft-packs";
import { compileTo } from ".";
import { description, name, version } from "./version";
import commander = require("commander");

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

(async () => {
  const input = fs.readFileSync(fileName === "-" ? 0 : fs.openSync(fileName, "r"));
  const pack = new DataPack(packDescription);
  compileTo(pack, namespace, input, dump);
  await pack.write(output);
})().catch(error => {
  process.stderr.write(`unexpected error: ${error && error.stack ? error.stack : error}\n`);
  process.exit(1);
});
