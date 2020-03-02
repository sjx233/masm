import { decode } from "@webassemblyjs/wasm-parser";
import { DataPack } from "minecraft-packs";
import ResourceLocation = require("resource-location");

const supportedTypes = ["i32"] as const;
type Type = typeof supportedTypes extends readonly (infer T)[] ? T : never;

interface ModuleFunction {
  type: "module";
  params: Type[];
  results: Type[];
  body: any;
}

interface ImportFunction {
  type: "import";
  params: Type[];
  results: Type[];
  body: ResourceLocation;
}

type WasmFunction = ModuleFunction | ImportFunction;

interface FunctionExport {
  name: string;
  value: number;
}

interface Context {
  pack: DataPack;
  namespace: string;
  functions: WasmFunction[];
  functionExports: FunctionExport[];
  funcPool: string[][];
}

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

function addInstructions(ctx: Context, index: number, insns: any[], commands: string[], depth = 0): number {
  const { namespace } = ctx;
  let minDepth = depth;
  block: for (let i = 0, len = insns.length; i < len; i++) {
    const insn = insns[i];
    switch (insn.id) {
      case "nop":
        break;
      case "block": {
        const [subId, subCommands] = newFunction(ctx);
        const subDepth = addInstructions(ctx, index, insn.instr, subCommands, depth + 1);
        if (subDepth < minDepth) minDepth = subDepth;
        const shouldJump = subDepth <= depth && i !== len - 1;
        if (shouldJump) commands.push(`scoreboard players set #br_depth ${namespace} 2147483647`);
        commands.push(`function ${subId}`);
        if (shouldJump) {
          const [controlId, controlCommands] = newFunction(ctx);
          commands.push(`execute unless score #br_depth ${namespace} matches ..${depth} run function ${controlId}`);
          commands = controlCommands;
        }
        break;
      }
      case "loop": {
        const [subId, subCommands] = newFunction(ctx);
        const subDepth = addInstructions(ctx, index, insn.instr, subCommands, depth + 1);
        if (subDepth < minDepth) minDepth = subDepth;
        const [wrapId, wrapCommands] = newFunction(ctx);
        wrapCommands.push(
          `scoreboard players set #br_depth ${namespace} 2147483647`,
          `function ${subId}`,
          `execute if score #br_depth ${namespace} matches ${depth + 1} run function ${wrapId}`
        );
        commands.push(`function ${wrapId}`);
        if (subDepth <= depth && i !== len - 1) {
          const [controlId, controlCommands] = newFunction(ctx);
          commands.push(`execute unless score #br_depth ${namespace} matches ..${depth} run function ${controlId}`);
          commands = controlCommands;
        }
        break;
      }
      case "if": {
        const [subId, subCommands] = newFunction(ctx);
        let altId: ResourceLocation | undefined;
        let subDepth = addInstructions(ctx, index, insn.consequent, subCommands, depth + 1);
        const hasElse = Boolean(insn.alternate?.length);
        if (hasElse) {
          const [subId, subCommands] = newFunction(ctx);
          altId = subId;
          const altDepth = addInstructions(ctx, index, insn.alternate, subCommands, depth + 1);
          if (altDepth < subDepth) subDepth = altDepth;
        }
        if (subDepth < minDepth) minDepth = subDepth;
        const shouldJump = subDepth <= depth && i !== len - 1;
        if (shouldJump) commands.push(`scoreboard players set #br_depth ${namespace} 2147483647`);
        if (hasElse) commands.push(
          `data modify storage ${namespace}:__internal conditions append from storage ${namespace}:__internal stack[-1]`,
          `data remove storage ${namespace}:__internal stack[-1]`,
          `execute store result score #a ${namespace} run data get storage ${namespace}:__internal conditions[-1]`,
          `execute unless score #a ${namespace} matches 0 run function ${subId}`,
          `execute store result score #a ${namespace} run data get storage ${namespace}:__internal conditions[-1]`,
          `execute if score #a ${namespace} matches 0 run function ${altId}`,
          `data remove storage ${namespace}:__internal conditions[-1]`
        );
        else commands.push(
          `execute store result score #a ${namespace} run data get storage ${namespace}:__internal stack[-1]`,
          `data remove storage ${namespace}:__internal stack[-1]`,
          `execute unless score #a ${namespace} matches 0 run function ${subId}`
        );
        if (shouldJump) {
          const [controlId, controlCommands] = newFunction(ctx);
          commands.push(`execute unless score #br_depth ${namespace} matches ..${depth} run function ${controlId}`);
          commands = controlCommands;
        }
        break;
      }
      case "br": {
        const subDepth = depth - insn.args[0].value;
        commands.push(`scoreboard players set #br_depth ${namespace} ${subDepth}`);
        if (subDepth < minDepth) minDepth = subDepth;
        break block;
      }
      case "br_if": {
        const subDepth = depth - insn.args[0].value;
        commands.push(
          `execute store result score #a ${namespace} run data get storage ${namespace}:__internal stack[-1]`,
          `data remove storage ${namespace}:__internal stack[-1]`,
          `execute unless score #a ${namespace} matches 0 run scoreboard players set #br_depth ${namespace} ${subDepth}`
        );
        if (subDepth < minDepth) minDepth = subDepth;
        break;
      }
      case "return":
        commands.push(`scoreboard players set #br_depth ${namespace} 0`);
        return 0;
      case "call":
        commands.push(`function ${namespace}:__internal/functions/${insn.index.value}`);
        break;
      case "drop":
        commands.push(`data remove storage ${namespace}:__internal stack[-1]`);
        break;
      case "select":
        commands.push(
          `execute store result score #a ${namespace} run data get storage ${namespace}:__internal stack[-1]`,
          `data remove storage ${namespace}:__internal stack[-1]`,
          `execute unless score #a ${namespace} matches 0 run data remove storage ${namespace}:__internal stack[-1]`,
          `execute if score #a ${namespace} matches 0 run data remove storage ${namespace}:__internal stack[-2]`
        );
        break;
      case "get_local":
        commands.push(`data modify storage ${namespace}:__internal stack append from storage ${namespace}:__internal frames[-1][${insn.args[0].value}]`);
        break;
      case "set_local":
        commands.push(
          `data modify storage ${namespace}:__internal frames[-1][${insn.args[0].value}] set from storage ${namespace}:__internal stack[-1]`,
          `data remove storage ${namespace}:__internal stack[-1]`
        );
        break;
      case "tee_local":
        commands.push(`data modify storage ${namespace}:__internal frames[-1][${insn.args[0].value}] set from storage ${namespace}:__internal stack[-1]`);
        break;
      case "const":
        checkType(insn.object);
        commands.push(`data modify storage ${namespace}:__internal stack append value ${insn.args[0].value}`);
        break;
      case "eqz": {
        checkType(insn.object);
        commands.push(
          `execute store result score #a ${namespace} run data get storage ${namespace}:__internal stack[-1]`,
          `execute store success storage ${namespace}:__internal stack[-1] int 1 if score #a ${namespace} matches 0`
        );
        break;
      }
      case "ne": {
        checkType(insn.object);
        commands.push(
          `execute store result score #b ${namespace} run data get storage ${namespace}:__internal stack[-1]`,
          `data remove storage ${namespace}:__internal stack[-1]`,
          `execute store result score #a ${namespace} run data get storage ${namespace}:__internal stack[-1]`,
          `execute store success storage ${namespace}:__internal stack[-1] int 1 unless score #a ${namespace} = #b ${namespace}`
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
          `execute store result score #b ${namespace} run data get storage ${namespace}:__internal stack[-1]`,
          `data remove storage ${namespace}:__internal stack[-1]`,
          `execute store result score #a ${namespace} run data get storage ${namespace}:__internal stack[-1]`,
          `execute store success storage ${namespace}:__internal stack[-1] int 1 if score #a ${namespace} ${op} #b ${namespace}`
        );
        break;
      }
      case "add":
      case "sub":
      case "mul": {
        checkType(insn.object);
        const op = binOp.get(insn.id);
        commands.push(
          `execute store result score #b ${namespace} run data get storage ${namespace}:__internal stack[-1]`,
          `data remove storage ${namespace}:__internal stack[-1]`,
          `execute store result score #a ${namespace} run data get storage ${namespace}:__internal stack[-1]`,
          `scoreboard players operation #a ${namespace} ${op} #b ${namespace}`,
          `execute store result storage ${namespace}:__internal stack[-1] int 1 run scoreboard players get #a ${namespace}`
        );
        break;
      }
      case "end":
        break;
      case "local":
        checkType(insn.args[0].name);
        commands.push(`data modify storage ${namespace}:__internal frames[-1] append value 0`);
        break;
      default:
        throw new Error(`instruction ${insn.id} is unsupported`);
    }
  }
  return minDepth;
}

function addFunction(ctx: Context, index: number): void {
  const { pack, namespace } = ctx;
  const { type, params, body } = ctx.functions[index];
  const commands: string[] = [`data modify storage ${namespace}:__internal frames append value []`];
  for (let i = params.length; i; i--)
    commands.push(`data modify storage ${namespace}:__internal frames[-1] append from storage ${namespace}:__internal stack[-${i}]`);
  for (let i = params.length; i; i--)
    commands.push(`data remove storage ${namespace}:__internal stack[-1]`);
  if (type === "module") addInstructions(ctx, index, body, commands);
  else commands.push(`function ${body}`);
  commands.push(`data remove storage ${namespace}:__internal frames[-1]`);
  pack.functions.set(new ResourceLocation(namespace, `__internal/functions/${index}`), commands);
}

function addFunctionExport(ctx: Context, index: number): void {
  const { pack, namespace } = ctx;
  const { name, value } = ctx.functionExports[index];
  pack.functions.set(new ResourceLocation(namespace, name), [
    `function ${namespace}:__internal/functions/${value}`
  ]);
}

function parseWasm(ctx: Context, data: Uint8Array): void {
  const ast = decode(data).body[0].fields;
  console.dir(ast, { depth: null });
  const moduleFuncs: ModuleFunction[] = [];
  for (const field of ast)
    switch (field.type) {
      case "Func":
        moduleFuncs.push({
          type: "module",
          ...checkSignature(field.signature),
          body: field.body
        });
        break;
      case "ModuleImport":
        switch (field.descr.type) {
          case "FuncImportDescr":
            ctx.functions.push({
              type: "import",
              ...checkSignature(field.descr.signature),
              body: new ResourceLocation(field.module, field.name)
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
        }
        break;
    }
  ctx.functions.push(...moduleFuncs);
}

export function compileTo(pack: DataPack, namespace: string, data: Uint8Array): void {
  if (namespace.length > 16) throw new RangeError("namespace is too long");
  const ctx: Context = {
    pack,
    namespace,
    functions: [],
    functionExports: [],
    funcPool: []
  };
  parseWasm(ctx, data);
  for (let i = 0, len = ctx.functions.length; i < len; i++)
    addFunction(ctx, i);
  for (let i = 0, len = ctx.functionExports.length; i < len; i++)
    addFunctionExport(ctx, i);
  for (let i = 0, len = ctx.funcPool.length; i < len; i++)
    pack.functions.set(new ResourceLocation(namespace, `__internal/func_pool/${i}`), ctx.funcPool[i]);
  pack.functions.set(new ResourceLocation(namespace, "__internal/init"), [
    `scoreboard objectives add ${namespace} dummy`,
    `data merge storage ${namespace}:__internal {frames:[],stack:[],conditions:[]}`
  ]);
}
