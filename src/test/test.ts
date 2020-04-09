import { bold, gray, green, red } from "ansi-colors";
import { execFile as execFileAsync } from "child_process";
import { promises as fs } from "fs";
import { DataPack } from "minecraft-packs";
import * as path from "path";
import { Rcon, RconOptions } from "rcon-client";
import { isDeepStrictEqual, promisify } from "util";
import { compileTo } from "..";
import { genStd } from "../std";
import { checkType } from "../type";

const execFile = promisify(execFileAsync);

const host = process.env.HOST || "localhost";
if (process.env.PORT && !/^\d+$/.test(process.env.PORT)) throw new Error("PORT must be an integer");
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : undefined;
if (!process.env.PASSWORD) throw new Error("PASSWORD is not set");
const password = process.env.PASSWORD;
if (!process.env.WORLD_PATH) throw new Error("WORLD_PATH is not set");
const worldPath = path.resolve(process.env.WORLD_PATH);

interface Context {
  rcon: Rcon;
  loadedModule: string | undefined;
  lastModule: string | undefined;
  modules: Set<string>;
  namedModules: Map<string, string>;
  registeredModules: Map<string, string>;
  invalidModules: Map<string, string>;
}

interface WasmScript {
  source_filename: string;
  commands: Command[];
}

interface ModuleCommand {
  type: "module";
  line: number;
  name?: string;
  filename: string;
}

interface ActionCommand {
  type: "action";
  line: number;
  action: Action;
  expected: { type: string; }[];
}

interface RegisterCommand {
  type: "register";
  line: number;
  name?: string;
  as: string;
}

interface AssertReturnCommand {
  type: "assert_return";
  line: number;
  action: Action;
  expected: WasmValue[];
}

type Command = ModuleCommand | ActionCommand | RegisterCommand | AssertReturnCommand;

interface InvokeAction {
  type: "invoke";
  module?: string;
  field: string;
  args: WasmValue[];
}

interface GetAction {
  type: "get";
  module?: string;
  field: string;
}

type Action = InvokeAction | GetAction;

interface WasmValue {
  type: string;
  value: string;
}

interface Value {
  type: "i32";
  value: number;
}

const Value = {
  parse(s: string): Value {
    return { type: "i32", value: parseInt(s, 10) | 0 };
  },
  stringify({ type, value }: Value): string {
    checkType(type);
    return value.toString();
  }
};

function toValue({ type, value }: WasmValue): Value {
  checkType(type);
  return { type: "i32", value: parseInt(value, 10) | 0 };
}

function formatValueArray(arr: readonly Value[]): string {
  return `[${arr.map(Value.stringify).join(", ")}]`;
}

async function compileTests(srcDir: string, destDir: string, srcFiles?: string[]): Promise<string[]> {
  const destFiles: string[] = [];
  if (!srcFiles) srcFiles = (await fs.readdir(srcDir)).filter(name => path.extname(name) === ".wast");
  for (const srcFile of srcFiles) {
    const destFile = path.basename(srcFile, ".wast") + ".json";
    await execFile("wast2json", ["-o", path.join(destDir, destFile), path.join(srcDir, srcFile)]);
    destFiles.push(destFile);
  }
  return destFiles;
}

function writePack(name: string, pack: DataPack): Promise<void> {
  return pack.write(path.join(worldPath, "datapacks", name));
}

interface SuccessResult {
  status: "success";
  values?: readonly Value[];
}

interface FailureResult {
  status: "failure";
  expected: readonly Value[];
  actual: readonly Value[];
}

interface SkippedResult {
  status: "skipped";
  message: string;
}

type Result = SuccessResult | FailureResult | SkippedResult;

function success(results?: readonly Value[]): SuccessResult {
  return { status: "success", values: results };
}

function failure(expected: readonly Value[], actual: readonly Value[]): FailureResult {
  return { status: "failure", expected, actual };
}

async function test(description: string, prepareFunc: () => Promise<string | undefined>, testFunc: () => Promise<Result>): Promise<Result> {
  const message = await prepareFunc();
  if (message) return { status: "skipped", message };
  process.stdout.write(description + " ");
  const result = await testFunc();
  switch (result.status) {
    case "success":
      process.stdout.write(`${green("✓")}\n`);
      if (result.values) process.stdout.write(`    result: ${bold(formatValueArray(result.values))}\n`);
      break;
    case "failure":
      process.stdout.write(`${red("✗")}\n    expected: ${bold.green(formatValueArray(result.expected))}\n    actual: ${bold.red(formatValueArray(result.actual))}\n`);
      break;
  }
  return result;
}

async function loadModule(ctx: Context, module: string): Promise<string | undefined> {
  if (ctx.loadedModule === module) return;
  if (ctx.invalidModules.has(module)) return ctx.invalidModules.get(module);
  const { rcon } = ctx;
  const pack = new DataPack("masm test.");
  try {
    compileTo(pack, "masm_test", await fs.readFile(module));
    for (const [registration, namespace] of ctx.registeredModules)
      compileTo(pack, namespace, await fs.readFile(registration));
  } catch (e) {
    const message = `failed to instantiate ${bold(path.basename(module))}: ${e}`;
    ctx.invalidModules.set(module, message);
    return message;
  }
  await writePack("masm-test", pack);
  await rcon.send("reload");
  if (!ctx.modules.has(module)) {
    await rcon.send("function masm_test:__init");
    ctx.modules.add(module);
  }
  ctx.loadedModule = module;
}

function getReferredModule(ctx: Context, name?: string): string {
  const module = name ? ctx.namedModules.get(name) : ctx.lastModule;
  if (!module) throw new Error(`module ${name} not found`);
  return module;
}

async function getStack({ rcon }: Context): Promise<Value[]> {
  const response = await rcon.send("data get storage masm:__internal stack");
  await rcon.send("data modify storage masm:__internal stack set value []");
  const content = response.slice(response.indexOf(": ") + 3, -1);
  return content ? content.split(", ").map(Value.parse) : [];
}

async function doAction(ctx: Context, action: Action): Promise<Value[]> {
  const { rcon } = ctx;
  switch (action.type) {
    case "invoke":
      await rcon.send(`data modify storage masm:__internal frames set value [[${action.args.map(val => Value.stringify(toValue(val))).join()}]]`);
      await rcon.send(`function masm_test:${action.field}`);
      await rcon.send("data remove storage masm:__internal frames[-1]");
      return await getStack(ctx);
    case "get":
      await rcon.send(`function masm_test:__globals/${action.field}/get`);
      return await getStack(ctx);
  }
}

async function testCommand(ctx: Context, command: ActionCommand | AssertReturnCommand): Promise<Result> {
  switch (command.type) {
    case "action":
      return success(await doAction(ctx, command.action));
    case "assert_return": {
      const actual = await doAction(ctx, command.action);
      const expected = command.expected.map(toValue);
      return isDeepStrictEqual(actual, expected) ? success() : failure(expected, actual);
    }
  }
}

async function runCommand(ctx: Context, command: Command): Promise<Result | undefined> {
  switch (command.type) {
    case "module":
      ctx.lastModule = command.filename;
      if (command.name) ctx.namedModules.set(command.name, command.filename);
      break;
    case "register":
      ctx.registeredModules.set(getReferredModule(ctx, command.name), command.as);
      break;
    case "action":
    case "assert_return":
      return test("  :" + command.line, () => loadModule(ctx, getReferredModule(ctx, command.action.module)), () => testCommand(ctx, command));
  }
}

(async () => {
  process.chdir(path.resolve(__dirname, "../../test"));
  const filenames = process.argv.slice(2);
  const tests = await compileTests("../testsuite", ".", filenames.length ? filenames : undefined);
  const ctx: Context = {
    rcon: await (() => {
      const options: RconOptions = { host, password, timeout: 300000 };
      if (port) options.port = port;
      return Rcon.connect(options);
    })(),
    loadedModule: undefined,
    lastModule: undefined,
    modules: new Set,
    namedModules: new Map,
    registeredModules: new Map,
    invalidModules: new Map
  };
  await writePack("masm-std", await genStd());
  await writePack("masm-test", new DataPack(""));
  await ctx.rcon.send("reload");
  await ctx.rcon.send("function masm:__init");
  for (const test of tests) {
    const { source_filename: src, commands }: WasmScript = JSON.parse(await fs.readFile(test, "utf8"));
    process.stdout.write(`${path.basename(src)}\n`);
    let successCount = 0;
    let failureCount = 0;
    let skippedCount = 0;
    for (const command of commands) {
      const result = await runCommand(ctx, command);
      if (result) switch (result.status) {
        case "success":
          successCount++;
          break;
        case "failure":
          failureCount++;
          break;
        case "skipped":
          skippedCount++;
          break;
      }
    }
    process.stdout.write(`${bold(successCount.toString())} ${green("success")}   ${bold(failureCount.toString())} ${red("failure")}   ${bold(skippedCount.toString())} ${gray("skipped")}\n`);
    ctx.modules.clear();
    ctx.namedModules.clear();
    ctx.registeredModules.clear();
    ctx.invalidModules.clear();
  }
  await ctx.rcon.end();
})().catch(error => {
  console.error(error);
  process.exit(1);
});
