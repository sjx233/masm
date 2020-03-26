import { decode } from "@webassemblyjs/wasm-parser";
import { DataPack } from "minecraft-packs";
import { inspect } from "util";
import { Context } from "./context";
import { addInstructions } from "./instructions";
import { checkSignature, checkType } from "./type";
import { buildTree, fillArray } from "./util";
import ResourceLocation = require("resource-location");

function addFunction(ctx: Context, index: number): void {
  const { pack, namespace } = ctx;
  const func = ctx.funcs[index];
  const commands: string[] = [];
  if (func.type === "module") addInstructions(ctx, func.body, commands, 0);
  else commands.push(`function ${func.id}`);
  pack.functions.set(new ResourceLocation(namespace, `__internal/funcs/${index}`), commands);
}

export const pageSize = 0x10000;
const emptyPage = `[B;${fillArray(pageSize, "0b")}]`;

function addMemory(ctx: Context, index: number): void {
  const { pack, namespace } = ctx;
  const memory = ctx.memories[index];
  if (memory.type === "module") {
    const { min, max } = memory;
    if (max > 0) {
      ctx.initCommands.push(
        `scoreboard players set #a masm ${min}`,
        `function ${namespace}:__internal/memories/${index}/grow_unchecked`
      );
      pack.functions
        .set(new ResourceLocation(namespace, `__internal/memories/${index}/swap_in`), [
          `data modify storage masm:__internal tmp set value "${namespace}:${index}"`,
          "execute store success score #b masm run data modify storage masm:__internal tmp set from storage masm:__internal memory.id",
          "execute store result storage masm:__internal tmp int 1 run scoreboard players operation #c masm = #a masm",
          "execute if score #b masm matches 0 store success score #b masm run data modify storage masm:__internal tmp set from storage masm:__internal memory.page",
          "execute unless score #b masm matches 0 function #masm:__internal/memories/swap_out",
          "scoreboard players operation #a masm = #c masm",
          `execute unless score #b masm matches 0 function ${buildTree({
            pack,
            id: new ResourceLocation(namespace, `__internal/memories/${index}/swap_in`),
            childCount: 4,
            getLeaf(pageIndex: number) {
              return `run data modify storage masm:__internal memory.data set from storage ${namespace}:__internal memories[${index}][${pageIndex}]`;
            }
          }, 0, max)}`,
          `data modify storage masm:__internal memory.id set value "${namespace}:${index}"`,
          "execute store result storage masm:__internal memory.page int 1 run scoreboard players get #a masm"
        ])
        .set(new ResourceLocation(namespace, `__internal/memories/${index}/swap_out`), [
          "execute store result score #a masm run data get storage masm:__internal memory.page",
          `function ${buildTree({
            pack,
            id: new ResourceLocation(namespace, `__internal/memories/${index}/swap_out`),
            childCount: 4,
            getLeaf(pageIndex: number) {
              return `run data modify storage ${namespace}:__internal memories[${index}][${pageIndex}] set from storage masm:__internal memory.data`;
            }
          }, 0, max)}`
        ])
        .set(new ResourceLocation(namespace, `__internal/memories/${index}/get`), [
          "scoreboard players operation #c masm = #a masm",
          "scoreboard players operation #a masm /= #page_size masm",
          `execute unless score #a masm matches 0.. run scoreboard players add #a ${pageSize}`,
          `function ${namespace}:__internal/memories/${index}/swap_in`,
          "scoreboard players operation #a masm = #c masm",
          "scoreboard players operation #a masm %= #page_size masm",
          "function masm:__internal/memory/get"
        ])
        .set(new ResourceLocation(namespace, `__internal/memories/${index}/set`), [
          "scoreboard players operation #c masm = #a masm",
          "scoreboard players operation #a masm /= #page_size masm",
          `execute unless score #a masm matches 0.. run scoreboard players add #a ${pageSize}`,
          `function ${namespace}:__internal/memories/${index}/swap_in`,
          "scoreboard players operation #a masm = #c masm",
          "scoreboard players operation #a masm %= #page_size masm",
          "function masm:__internal/memory/set"
        ])
        .set(new ResourceLocation(namespace, `__internal/memories/${index}/size`), [
          "data modify storage masm:__internal stack append value 0",
          `execute store result storage masm:__internal stack[-1] int 1 run data get storage ${namespace}:__internal memories[${index}]`
        ])
        .set(new ResourceLocation(namespace, `__internal/memories/${index}/grow`), [
          "execute store result score #a masm run data get storage masm:__internal stack[-1]",
          `execute store result score #b masm run data get storage ${namespace}:__internal memories[${index}]`,
          "scoreboard players operation #b masm += #a masm",
          `execute store success score #b masm if score #a masm matches 0..${max} if score #b masm matches 0..${max}`,
          "execute if score #b masm matches 0 run scoreboard players set #a masm 0",
          "scoreboard players remove #b masm 1",
          `execute if score #b masm matches 0 store result score #b masm run data get storage ${namespace}:__internal memories[${index}]`,
          `function ${namespace}:__internal/memories/${index}/grow_unchecked`,
          "execute store result storage masm:__internal stack[-1] int 1 run scoreboard players get #b masm"
        ])
        .set(new ResourceLocation(namespace, `__internal/memories/${index}/grow_unchecked`), [
          `execute if score #a masm matches 1.. run function ${namespace}:__internal/memories/${index}/grow_loop`
        ])
        .set(new ResourceLocation(namespace, `__internal/memories/${index}/grow_loop`), [
          "scoreboard players remove #a masm 1",
          `data modify storage ${namespace}:__internal memories[${index}] append value ${emptyPage}`,
          `function ${namespace}:__internal/memories/${index}/grow_unchecked`
        ]);
    } else pack.functions
      .set(new ResourceLocation(namespace, `__internal/memories/${index}/get`), [])
      .set(new ResourceLocation(namespace, `__internal/memories/${index}/set`), [])
      .set(new ResourceLocation(namespace, `__internal/memories/${index}/size`), [
        "data modify storage masm:__internal stack append value 0"
      ])
      .set(new ResourceLocation(namespace, `__internal/memories/${index}/grow`), [
        "execute store result score #a masm run data get storage masm:__internal stack[-1]",
        "execute store success score #a masm if score #a masm matches 0",
        "scoreboard players remove #a masm 1",
        "execute store result storage masm:__internal stack[-1] int 1 run scoreboard players get #a masm"
      ]);
  } else {
    const { id } = memory;
    pack.functions
      .set(new ResourceLocation(namespace, `__internal/memories/${index}/get`), [
        `function ${id.namespace}:__memories/${id.path}/get`
      ])
      .set(new ResourceLocation(namespace, `__internal/memories/${index}/set`), [
        `function ${id.namespace}:__memories/${id.path}/set`
      ])
      .set(new ResourceLocation(namespace, `__internal/memories/${index}/size`), [
        `function ${id.namespace}:__memories/${id.path}/size`
      ])
      .set(new ResourceLocation(namespace, `__internal/memories/${index}/grow`), [
        `function ${id.namespace}:__memories/${id.path}/grow`
      ]);
  }
}

function addGlobal(ctx: Context, index: number): void {
  const { pack, namespace } = ctx;
  const global = ctx.globals[index];
  if (global.type === "module") {
    const { init } = global;
    addInstructions(ctx, init, ctx.initCommands, 0);
    ctx.initCommands.push(`function ${namespace}:__internal/globals/${index}/set`);
    pack.functions
      .set(new ResourceLocation(namespace, `__internal/globals/${index}/get`), [
        `data modify storage masm:__internal stack append from storage ${namespace}:__internal globals[${index}]`
      ])
      .set(new ResourceLocation(namespace, `__internal/globals/${index}/set`), [
        `data modify storage ${namespace}:__internal globals[${index}] set from storage masm:__internal stack[-1]`,
        "data remove storage masm:__internal stack[-1]"
      ]);
  } else {
    const { mutability, id } = global;
    pack.functions.set(new ResourceLocation(namespace, `__internal/globals/${index}/get`), [
      `function ${id.namespace}:__globals/${id.path}/get`
    ]);
    if (mutability === "var") pack.functions.set(new ResourceLocation(namespace, `__internal/globals/${index}/set`), [
      `function ${id.namespace}:__globals/${id.path}/set`
    ]);
  }
}

function addFuncExport(ctx: Context, index: number): void {
  const { pack, namespace } = ctx;
  const { name, value } = ctx.funcExports[index];
  pack.functions.set(new ResourceLocation(namespace, name), [
    `function ${namespace}:__internal/funcs/${value}`
  ]);
}

function addMemoryExport(ctx: Context, index: number): void {
  const { pack, namespace } = ctx;
  const { name, value } = ctx.memoryExports[index];
  pack.functions.set(new ResourceLocation(namespace, `__memories/${name}/get`), [
    `function ${namespace}:__internal/memories/${value}/get`
  ]);
  pack.functions.set(new ResourceLocation(namespace, `__memories/${name}/set`), [
    `function ${namespace}:__internal/memories/${value}/set`
  ]);
  pack.functions.set(new ResourceLocation(namespace, `__memories/${name}/size`), [
    `function ${namespace}:__internal/memories/${value}/size`
  ]);
  pack.functions.set(new ResourceLocation(namespace, `__memories/${name}/grow`), [
    `function ${namespace}:__internal/memories/${value}/grow`
  ]);
}

function addGlobalExport(ctx: Context, index: number): void {
  const { pack, namespace } = ctx;
  const { name, value } = ctx.globalExports[index];
  pack.functions.set(new ResourceLocation(namespace, `__globals/${name}/get`), [
    `function ${namespace}:__internal/globals/${value}/get`
  ]);
  if (ctx.globals[value].mutability === "var") pack.functions.set(new ResourceLocation(namespace, `__globals/${name}/set`), [
    `function ${namespace}:__internal/globals/${value}/set`
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
      case "Memory":
        ctx.memories.push({
          type: "module",
          min: field.limits.min,
          max: field.limits.max ?? 0x10000
        });
        break;
      case "Global":
        ctx.globals.push({
          type: "module",
          valueType: checkType(field.globalType.valtype),
          mutability: field.globalType.mutability,
          init: field.init
        });
        break;
      case "ModuleImport":
        switch (field.descr.type) {
          case "FuncImportDescr":
            ctx.funcs.push({
              type: "import",
              ...checkSignature(field.descr.signature),
              id: new ResourceLocation(field.module, field.name)
            });
            break;
          case "Memory":
            ctx.memories.push({
              type: "import",
              id: new ResourceLocation(field.module, field.name)
            });
            break;
          case "GlobalType":
            ctx.globals.push({
              type: "import",
              valueType: checkType(field.descr.valtype),
              mutability: field.descr.mutability,
              id: new ResourceLocation(field.module, field.name)
            });
            break;
        }
        break;
      case "ModuleExport":
        switch (field.descr.exportType) {
          case "Func":
            ctx.funcExports.push({
              name: field.name,
              value: field.descr.id.value
            });
            break;
          case "Mem":
            ctx.memoryExports.push({
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
    memories: [],
    globals: [],
    funcExports: [],
    memoryExports: [],
    globalExports: [],
    funcPool: [],
    initCommands: []
  };
  parseWasm(ctx, data, dump);
  ctx.initCommands.push(`data modify storage ${namespace}:__internal memories set value [${fillArray(ctx.memories.length, "[]")}]`);
  ctx.initCommands.push(`data modify storage ${namespace}:__internal globals set value [${fillArray(ctx.globals.length, "0")}]`);
  const commands: string[] = [];
  for (let i = 0, len = ctx.memories.length; i < len; i++) {
    if (ctx.memories[i].type !== "module") continue;
    commands.push(
      "data modify storage masm:__internal tmp set from storage masm:__internal memory.id",
      `execute store success score #a masm run data modify storage masm:__internal tmp set value "${namespace}:${i}"`,
      `execute if score #a masm matches 0 run function ${namespace}:__internal/memories/${i}/swap_out`
    );
  }
  pack.functions.set(new ResourceLocation(namespace, "__internal/memories/swap_out"), commands);
  pack.tags.set(new ResourceLocation("masm", "__internal/memories/swap_out"), {
    values: [`${namespace}:__internal/memories/swap_out`]
  });
  for (let i = 0, len = ctx.funcs.length; i < len; i++)
    addFunction(ctx, i);
  for (let i = 0, len = ctx.memories.length; i < len; i++)
    addMemory(ctx, i);
  for (let i = 0, len = ctx.globals.length; i < len; i++)
    addGlobal(ctx, i);
  for (let i = 0, len = ctx.funcExports.length; i < len; i++)
    addFuncExport(ctx, i);
  for (let i = 0, len = ctx.memoryExports.length; i < len; i++)
    addMemoryExport(ctx, i);
  for (let i = 0, len = ctx.globalExports.length; i < len; i++)
    addGlobalExport(ctx, i);
  if (ctx.start !== undefined)
    ctx.initCommands.push(`function ${namespace}:__internal/funcs/${ctx.start}`);
  for (let i = 0, len = ctx.funcPool.length; i < len; i++)
    pack.functions.set(new ResourceLocation(namespace, `__internal/func_pool/${i}`), ctx.funcPool[i]);
  pack.functions.set(new ResourceLocation(namespace, "__init"), ctx.initCommands);
}
