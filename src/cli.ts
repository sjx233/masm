#!/usr/bin/env node

import { program } from "commander";
import * as fs from "fs";
import { DataPack } from "minecraft-packs";
import { promisify } from "util";
import { compileTo } from ".";
import { genStd } from "./std";
import { description, name, version } from "./version";

const readFile = promisify(fs.readFile);

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

async function compile(): Promise<DataPack> {
  const [filename] = program.args;
  if (!filename) program.help();
  const input = await readFile(filename === "-" ? 0 : filename);
  const pack = new DataPack(packDescription);
  compileTo(pack, namespace, input, dump);
  return pack;
}

(std ? genStd() : compile())
  .then(pack => pack.write(output))
  .catch(error => {
    process.stderr.write(`unexpected error: ${error}\n`);
    process.exit(1);
  });
