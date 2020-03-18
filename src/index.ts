import { decode } from "@webassemblyjs/wasm-parser";
import { DataPack } from "minecraft-packs";
import { inspect } from "util";
import ResourceLocation = require("resource-location");

const supportedTypes = ["i32"] as const;
const relOp = new Map<string, string>([
  ["eq", "="],
  ["lt_s", "<"],
  ["gt_s", ">"],
  ["le_s", "<="],
  ["ge_s", ">="]
]);
const binOp = new Map<string, string>([
  ["add", "+="],
  ["sub", "-="],
  ["mul", "*="]
]);

type Type = typeof supportedTypes extends readonly (infer T)[] ? T : never;

interface ModuleFunc {
  type: "module";
  params: Type[];
  results: Type[];
  body: any;
}

interface ImportFunc {
  type: "import";
  params: Type[];
  results: Type[];
  body: ResourceLocation;
}

type Func = ModuleFunc | ImportFunc;

interface ModuleGlobal {
  type: "module";
  valueType: Type;
  mutability: string;
  init: any;
}

interface ImportGlobal {
  type: "import";
  valueType: Type;
  mutability: string;
  init: ResourceLocation;
}

type Global = ModuleGlobal | ImportGlobal;

interface FuncExport {
  name: string;
  value: number;
}

interface GlobalExport {
  name: string;
  value: number;
}

interface Context {
  pack: DataPack;
  namespace: string;
  funcs: Func[];
  globals: Global[];
  functionExports: FuncExport[];
  globalExports: GlobalExport[];
  start?: number;
  funcPool: string[][];
  initCommands: string[];
}

function checkType(type: string): Type {
  if (!supportedTypes.includes(type as Type)) throw new TypeError(`type '${type}' is unsupported`);
  return type as Type;
}

function checkSignature(signature: any): { params: Type[]; results: Type[]; } {
  return {
    params: signature.params.map((param: { valtype: string; }) => checkType(param.valtype)),
    results: signature.results.map(checkType)
  };
}

function newFunction({ namespace, funcPool }: Context): [ResourceLocation, string[]] {
  const index = funcPool.length;
  funcPool.push([]);
  return [new ResourceLocation(namespace, `__internal/func_pool/${index}`), funcPool[index]];
}

function addInstructions(ctx: Context, insns: any[], commands: string[], depth: number): number {
  const { namespace } = ctx;
  let minDepth = depth;
  for (let i = 0, len = insns.length; i < len; i++) {
    const insn = insns[i];
    switch (insn.id) {
      case "nop":
        break;
      case "block": {
        const [subId, subCommands] = newFunction(ctx);
        const subDepth = addInstructions(ctx, insn.instr, subCommands, depth + 1);
        if (subDepth < minDepth) minDepth = subDepth;
        const shouldJump = subDepth <= depth;
        if (shouldJump) commands.push("scoreboard players set #br_depth masm 2147483647");
        commands.push(`function ${subId}`);
        if (shouldJump) {
          const [remId, remCommands] = newFunction(ctx);
          commands.push(`execute unless score #br_depth masm matches ..${depth} run function ${remId}`);
          commands = remCommands;
        }
        break;
      }
      case "loop": {
        const [subId, subCommands] = newFunction(ctx);
        const subDepth = addInstructions(ctx, insn.instr, subCommands, depth + 1);
        if (subDepth < minDepth) minDepth = subDepth;
        const [wrapId, wrapCommands] = newFunction(ctx);
        wrapCommands.push(
          "scoreboard players set #br_depth masm 2147483647",
          `function ${subId}`,
          `execute if score #br_depth masm matches ${depth + 1} run function ${wrapId}`
        );
        commands.push(`function ${wrapId}`);
        if (subDepth <= depth) {
          const [remId, remCommands] = newFunction(ctx);
          commands.push(`execute unless score #br_depth masm matches ..${depth} run function ${remId}`);
          commands = remCommands;
        }
        break;
      }
      case "if": {
        const [subId, subCommands] = newFunction(ctx);
        let altId: ResourceLocation | undefined;
        let subDepth = addInstructions(ctx, insn.consequent, subCommands, depth + 1);
        const hasElse = Boolean(insn.alternate?.length);
        if (hasElse) {
          const [subId, subCommands] = newFunction(ctx);
          altId = subId;
          const altDepth = addInstructions(ctx, insn.alternate, subCommands, depth + 1);
          if (altDepth < subDepth) subDepth = altDepth;
        }
        if (subDepth < minDepth) minDepth = subDepth;
        const shouldJump = subDepth <= depth;
        if (shouldJump) commands.push("scoreboard players set #br_depth masm 2147483647");
        if (hasElse) commands.push(
          "data modify storage masm:__internal conditions append from storage masm:__internal stack[-1]",
          "data remove storage masm:__internal stack[-1]",
          "execute store result score #a masm run data get storage masm:__internal conditions[-1]",
          `execute unless score #a masm matches 0 run function ${subId}`,
          "execute store result score #a masm run data get storage masm:__internal conditions[-1]",
          `execute if score #a masm matches 0 run function ${altId}`,
          "data remove storage masm:__internal conditions[-1]"
        );
        else commands.push(
          "execute store result score #a masm run data get storage masm:__internal stack[-1]",
          "data remove storage masm:__internal stack[-1]",
          `execute unless score #a masm matches 0 run function ${subId}`
        );
        if (shouldJump) {
          const [remId, remCommands] = newFunction(ctx);
          commands.push(`execute unless score #br_depth masm matches ..${depth} run function ${remId}`);
          commands = remCommands;
        }
        break;
      }
      case "br": {
        const toDepth = depth - insn.args[0].value;
        commands.push(`scoreboard players set #br_depth masm ${toDepth}`);
        if (toDepth < minDepth) minDepth = toDepth;
        return minDepth;
      }
      case "br_if": {
        const toDepth = depth - insn.args[0].value;
        const [remId, remCommands] = newFunction(ctx);
        commands.push(
          "execute store result score #a masm run data get storage masm:__internal stack[-1]",
          "data remove storage masm:__internal stack[-1]",
          `execute unless score #a masm matches 0 run scoreboard players set #br_depth masm ${toDepth}`,
          `execute if score #a masm matches 0 run function ${remId}`
        );
        commands = remCommands;
        if (toDepth < minDepth) minDepth = toDepth;
        break;
      }
      case "return":
        commands.push("scoreboard players set #br_depth masm 0");
        return 0;
      case "call": {
        const index = insn.index.value;
        const { params } = ctx.funcs[index];
        commands.push("data modify storage masm:__internal frames append value []");
        for (let i = params.length; i; i--)
          commands.push(`data modify storage masm:__internal frames[-1] append from storage masm:__internal stack[-${i}]`);
        for (let i = params.length; i; i--)
          commands.push("data remove storage masm:__internal stack[-1]");
        commands.push(
          `function ${namespace}:__internal/funcs/${index}`,
          "data remove storage masm:__internal frames[-1]"
        );
        break;
      }
      case "drop":
        commands.push("data remove storage masm:__internal stack[-1]");
        break;
      case "select":
        commands.push(
          "execute store result score #a masm run data get storage masm:__internal stack[-1]",
          "data remove storage masm:__internal stack[-1]",
          "execute unless score #a masm matches 0 run data remove storage masm:__internal stack[-1]",
          "execute if score #a masm matches 0 run data remove storage masm:__internal stack[-2]"
        );
        break;
      case "get_local":
        commands.push(`data modify storage masm:__internal stack append from storage masm:__internal frames[-1][${insn.args[0].value}]`);
        break;
      case "set_local":
        commands.push(
          `data modify storage masm:__internal frames[-1][${insn.args[0].value}] set from storage masm:__internal stack[-1]`,
          "data remove storage masm:__internal stack[-1]"
        );
        break;
      case "tee_local":
        commands.push(`data modify storage masm:__internal frames[-1][${insn.args[0].value}] set from storage masm:__internal stack[-1]`);
        break;
      case "get_global":
        commands.push(`function ${namespace}:__internal/globals/get/${insn.args[0].value}`);
        break;
      case "set_global":
        commands.push(`function ${namespace}:__internal/globals/set/${insn.args[0].value}`);
        break;
      case "const":
        checkType(insn.object);
        commands.push(`data modify storage masm:__internal stack append value ${insn.args[0].value}`);
        break;
      case "eqz": {
        checkType(insn.object);
        commands.push(
          "execute store result score #a masm run data get storage masm:__internal stack[-1]",
          "execute store success storage masm:__internal stack[-1] int 1 if score #a masm matches 0"
        );
        break;
      }
      case "ne": {
        checkType(insn.object);
        commands.push(
          "execute store result score #b masm run data get storage masm:__internal stack[-1]",
          "data remove storage masm:__internal stack[-1]",
          "execute store result score #a masm run data get storage masm:__internal stack[-1]",
          "execute store success storage masm:__internal stack[-1] int 1 unless score #a masm = #b masm"
        );
        break;
      }
      case "eq":
      case "lt_s":
      case "gt_s":
      case "le_s":
      case "ge_s": {
        checkType(insn.object);
        const op = relOp.get(insn.id);
        commands.push(
          "execute store result score #b masm run data get storage masm:__internal stack[-1]",
          "data remove storage masm:__internal stack[-1]",
          "execute store result score #a masm run data get storage masm:__internal stack[-1]",
          `execute store success storage masm:__internal stack[-1] int 1 if score #a masm ${op} #b masm`
        );
        break;
      }
      case "add":
      case "sub":
      case "mul": {
        checkType(insn.object);
        const op = binOp.get(insn.id);
        commands.push(
          "execute store result score #b masm run data get storage masm:__internal stack[-1]",
          "data remove storage masm:__internal stack[-1]",
          "execute store result score #a masm run data get storage masm:__internal stack[-1]",
          `scoreboard players operation #a masm ${op} #b masm`,
          "execute store result storage masm:__internal stack[-1] int 1 run scoreboard players get #a masm"
        );
        break;
      }
      case "end":
        break;
      case "local":
        for (const type of insn.args) {
          checkType(type.name);
          commands.push("data modify storage masm:__internal frames[-1] append value 0");
        }
        break;
      default:
        throw new Error(`instruction ${insn.id} is unsupported`);
    }
  }
  return minDepth;
}

function addFunction(ctx: Context, index: number): void {
  const { pack, namespace } = ctx;
  const { type, body } = ctx.funcs[index];
  const commands: string[] = [];
  if (type === "module") addInstructions(ctx, body, commands, 0);
  else commands.push(`function ${body}`);
  pack.functions.set(new ResourceLocation(namespace, `__internal/funcs/${index}`), commands);
}

function addGlobal(ctx: Context, index: number): void {
  const { pack, namespace } = ctx;
  const { type, mutability, init } = ctx.globals[index];
  if (type === "module") {
    init.push({
      type: "Instr",
      id: "set_global",
      args: [{ type: "NumberLiteral", value: index }]
    });
    addInstructions(ctx, init, ctx.initCommands, 0);
    pack.functions.set(new ResourceLocation(namespace, `__internal/globals/get/${index}`), [
      `data modify storage masm:__internal stack append from storage ${namespace}:__internal globals[${index}]`
    ]);
    pack.functions.set(new ResourceLocation(namespace, `__internal/globals/set/${index}`), [
      `data modify storage ${namespace}:__internal globals[${index}] set from storage masm:__internal stack[-1]`,
      "data remove storage masm:__internal stack[-1]"
    ]);
  } else {
    pack.functions.set(new ResourceLocation(namespace, `__internal/globals/get/${index}`), [
      `function ${init.namespace}:__globals/get/${init.path}`
    ]);
    if (mutability === "var") pack.functions.set(new ResourceLocation(namespace, `__internal/globals/set/${index}`), [
      `function ${init.namespace}:__globals/set/${init.path}`
    ]);
  }
}

function addFunctionExport(ctx: Context, index: number): void {
  const { pack, namespace } = ctx;
  const { name, value } = ctx.functionExports[index];
  pack.functions.set(new ResourceLocation(namespace, name), [
    `function ${namespace}:__internal/funcs/${value}`
  ]);
}

function addGlobalExport(ctx: Context, index: number): void {
  const { pack, namespace } = ctx;
  const { name, value } = ctx.globalExports[index];
  pack.functions.set(new ResourceLocation(namespace, "__globals/get/" + name), [
    `function ${namespace}:__internal/globals/get/${value}`
  ]);
  if (ctx.globals[value].mutability === "var") pack.functions.set(new ResourceLocation(namespace, "__globals/set/" + name), [
    `function ${namespace}:__internal/globals/set/${value}`
  ]);
}

function parseWasm(ctx: Context, data: Uint8Array, dump?: boolean): void {
  const ast = decode(data, { ignoreCustomNameSection: true }).body[0].fields;
  if (dump) process.stderr.write(inspect(ast, { depth: null }) + "\n");
  for (const field of ast)
    switch (field.type) {
      case "Func":
        ctx.funcs.push({
          type: "module",
          ...checkSignature(field.signature),
          body: field.body
        });
        break;
      case "Global": {
        ctx.globals.push({
          type: "module",
          valueType: checkType(field.globalType.valtype),
          mutability: field.globalType.mutability,
          init: field.init
        });
        break;
      }
      case "ModuleImport":
        switch (field.descr.type) {
          case "FuncImportDescr":
            ctx.funcs.push({
              type: "import",
              ...checkSignature(field.descr.signature),
              body: new ResourceLocation(field.module, field.name)
            });
            break;
          case "GlobalType":
            ctx.globals.push({
              type: "import",
              valueType: checkType(field.descr.valtype),
              mutability: field.descr.mutability,
              init: new ResourceLocation(field.module, field.name)
            });
            break;
        }
        break;
      case "ModuleExport":
        switch (field.descr.exportType) {
          case "Func":
            ctx.functionExports.push({
              name: field.name,
              value: field.descr.id.value
            });
            break;
          case "Global":
            ctx.globalExports.push({
              name: field.name,
              value: field.descr.id.value
            });
            break;
        }
        break;
      case "Start":
        ctx.start = field.index.value;
        break;
    }
}

export function compileTo(pack: DataPack, namespace: string, data: Uint8Array, dump?: boolean): void {
  if (namespace.length > 16) throw new RangeError("namespace is too long");
  const ctx: Context = {
    pack,
    namespace,
    funcs: [],
    globals: [],
    functionExports: [],
    globalExports: [],
    funcPool: [],
    initCommands: []
  };
  parseWasm(ctx, data, dump);
  ctx.initCommands.push(`data merge storage ${namespace}:__internal {globals:[${new Uint8Array(ctx.globals.length)}]}`);
  for (let i = 0, len = ctx.funcs.length; i < len; i++)
    addFunction(ctx, i);
  for (let i = 0, len = ctx.globals.length; i < len; i++)
    addGlobal(ctx, i);
  for (let i = 0, len = ctx.functionExports.length; i < len; i++)
    addFunctionExport(ctx, i);
  for (let i = 0, len = ctx.globalExports.length; i < len; i++)
    addGlobalExport(ctx, i);
  if (ctx.start !== undefined)
    ctx.initCommands.push(`function ${namespace}:__internal/funcs/${ctx.start}`);
  for (let i = 0, len = ctx.funcPool.length; i < len; i++)
    pack.functions.set(new ResourceLocation(namespace, `__internal/func_pool/${i}`), ctx.funcPool[i]);
  pack.functions.set(new ResourceLocation(namespace, "__init"), ctx.initCommands);
}
