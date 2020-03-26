#!/usr/bin/env node

import { program } from "commander";
import * as fs from "fs";
import { DataPack } from "minecraft-packs";
import { compileTo } from ".";
import { genStd } from "./std";
import { description, name, version } from "./version";

program
  .name(name)
  .version(version)
  .description(description)
  .usage("[options] <file>")
  .option("-o, --output <file>", "output file", "out")
  .option("-d, --pack-description <description>", "data pack description", "")
  .option("-n, --namespace <namespace>", "module namespace", "module")
  .option("--std", "generate standard library")
  .option("--dump", "dump WebAssembly AST")
  .parse(process.argv);
const {
  output,
  packDescription,
  namespace,
  std,
  dump
} = program.opts() as {
  output: string;
  packDescription: string;
  namespace: string;
  std?: true;
  dump?: true;
};

function compile(): DataPack {
  const [fileName] = program.args;
  if (!fileName) program.help();
  const input = fs.readFileSync(fileName === "-" ? 0 : fs.openSync(fileName, "r"));
  const pack = new DataPack(packDescription);
  compileTo(pack, namespace, input, dump);
  return pack;
}

(async () => {
  const pack = std ? await genStd() : compile();
  await pack.write(output);
})().catch(error => {
  process.stderr.write(`unexpected error: ${error && error.stack ? error.stack : error}\n`);
  process.exit(1);
});
