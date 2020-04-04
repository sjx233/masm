import { bold, green, red } from "ansi-colors";
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
if (process.env.PORT && !/^\d+$/.test(process.env.PORT)) throw new SyntaxError("PORT must be an integer");
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
  invalidModules: Set<string>;
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
  expected: Value[];
}

type Command = ModuleCommand | ActionCommand | RegisterCommand | AssertReturnCommand;

interface InvokeAction {
  type: "invoke";
  module?: string;
  field: string;
  args: Value[];
}

interface GetAction {
  type: "get";
  module?: string;
  field: string;
}

type Action = InvokeAction | GetAction;

interface Value {
  type: string;
  value: string;
}

const Value = {
  parse(s: string): Value {
    return { type: "i32", value: s };
  },
  stringify({ type, value }: Value): string {
    checkType(type);
    return value;
  }
};

function formatValueArray(arr: readonly Value[]): string {
  return `[${arr.map(Value.stringify).join(", ")}]`;
}

async function compileTest(src: string, dest: string): Promise<string> {
  await execFile("wast2json", ["-o", dest, src]);
  return dest;
}

async function compileTests(srcDir: string, destDir: string): Promise<string[]> {
  const names: string[] = [];
  for (const name of await fs.readdir(srcDir))
    if (path.extname(name) === ".wast") names.push(await compileTest(
      path.join(srcDir, name),
      path.join(destDir, path.basename(name, ".wast") + ".json")
    ));
  return names;
}

function writePack(name: string, pack: DataPack): Promise<void> {
  return pack.write(path.join(worldPath, "datapacks", name));
}

const success = green("✓");
const failure = red("✗");

async function connectRcon(): Promise<Rcon> {
  const options: RconOptions = { host, password, timeout: 300000 };
  if (port) options.port = port;
  process.stdout.write(`connecting to ${bold(port ? `${host}:${port}` : host)}... `);
  const rcon = await Rcon.connect(options);
  process.stdout.write(`${success}\n`);
  return rcon;
}

async function loadModule(ctx: Context, module: string): Promise<boolean> {
  if (ctx.loadedModule === module) return true;
  if (ctx.invalidModules.has(module)) return false;
  const { rcon } = ctx;
  process.stdout.write(`  instantiating ${bold(path.basename(module))}... `);
  const pack = new DataPack("masm test.");
  try {
    compileTo(pack, "masm_test", await fs.readFile(module));
    for (const [registration, namespace] of ctx.registeredModules)
      compileTo(pack, namespace, await fs.readFile(registration));
  } catch (e) {
    process.stdout.write(`${failure}\n    ${e}\n`);
    ctx.invalidModules.add(module);
    return false;
  }
  await writePack("masm-test", pack);
  await rcon.send("reload");
  if (!ctx.modules.has(module)) {
    await rcon.send("function masm_test:__init");
    ctx.modules.add(module);
  }
  ctx.loadedModule = module;
  process.stdout.write(`${success}\n`);
  return true;
}

function getReferredModule(ctx: Context, name?: string): string {
  const module = name ? ctx.namedModules.get(name) : ctx.lastModule;
  if (!module) throw new Error(`module ${name} not found`);
  return module;
}

async function prepareAction(ctx: Context, action: Action): Promise<void> {
  if (!await loadModule(ctx, getReferredModule(ctx, action.module))) throw new Error("invalid module");
}

async function popStack({ rcon }: Context): Promise<Value[]> {
  const response = await rcon.send("data get storage masm:__internal stack");
  await rcon.send("data modify storage masm:__internal stack set value []");
  const content = response.slice(response.indexOf(": ") + 3, -1);
  return content ? content.split(", ").map(Value.parse) : [];
}

async function doAction(ctx: Context, action: Action): Promise<Value[]> {
  const { rcon } = ctx;
  switch (action.type) {
    case "invoke":
      await rcon.send(`data modify storage masm:__internal frames set value [[${action.args.map(Value.stringify).join()}]]`);
      await rcon.send(`function masm_test:${action.field}`);
      await rcon.send("data remove storage masm:__internal frames[-1]");
      return await popStack(ctx);
    case "get":
      await rcon.send(`function masm_test:__globals/${action.field}/get`);
      return await popStack(ctx);
  }
}

async function runCommand(ctx: Context, command: Command): Promise<void> {
  switch (command.type) {
    case "module":
      ctx.lastModule = command.filename;
      if (command.name) ctx.namedModules.set(command.name, command.filename);
      break;
    case "action": {
      try {
        await prepareAction(ctx, command.action);
      } catch (e) {
        break;
      }
      process.stdout.write(`  running ${bold(":" + command.line)}... `);
      const result = await doAction(ctx, command.action);
      process.stdout.write(`${success}\n    result: ${bold(`[${result.map(Value.stringify).join(", ")}]`)}\n`);
      break;
    }
    case "register":
      ctx.registeredModules.set(getReferredModule(ctx, command.name), command.as);
      break;
    case "assert_return": {
      const { action, expected } = command;
      try {
        await prepareAction(ctx, action);
      } catch (e) {
        break;
      }
      process.stdout.write(`  running ${bold(":" + command.line)}... `);
      const actual = await doAction(ctx, action);
      if (isDeepStrictEqual(actual, expected)) process.stdout.write(`${success}\n`);
      else process.stdout.write(`${failure}\n    expected: ${green(formatValueArray(expected))}\n    actual: ${red(formatValueArray(actual))}\n`);
      break;
    }
  }
}

(async () => {
  process.chdir(path.resolve(__dirname, "../../test"));
  process.stdout.write("compiling tests... ");
  const tests = await compileTests("../testsuite", ".");
  process.stdout.write(`${success}\n`);
  const ctx: Context = {
    rcon: await connectRcon(),
    loadedModule: undefined,
    lastModule: undefined,
    modules: new Set,
    namedModules: new Map,
    registeredModules: new Map,
    invalidModules: new Set
  };
  process.stdout.write("loading standard library... ");
  await writePack("masm-std", await genStd());
  await writePack("masm-test", new DataPack(""));
  await ctx.rcon.send("reload");
  await ctx.rcon.send("function masm:__init");
  process.stdout.write(`${success}\n`);
  for (const test of tests) {
    const { source_filename: src, commands }: WasmScript = JSON.parse(await fs.readFile(test, "utf8"));
    process.stdout.write(`${bold(path.basename(src))}\n`);
    for (const command of commands)
      await runCommand(ctx, command);
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
