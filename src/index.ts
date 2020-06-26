import { DataPack } from "minecraft-packs";
import { Context } from "./context";
import { addInstrs } from "./instructions";
import { Limits, parse } from "./parser";
import { checkType } from "./type";
import { buildTree, fillArray } from "./util";
import ResourceLocation = require("resource-location");

function addFunc(ctx: Context, index: number): void {
  const { pack, namespace } = ctx;
  const func = ctx.funcs[index];
  const commands: string[] = [];
  if (func.type === "module") {
    for (const type of func.locals) {
      checkType(type);
      commands.push("data modify storage masm:__internal frames[-1] append value 0");
    }
    addInstrs(ctx, commands, func.body, ctx.types[func.funcType].results.length);
  } else commands.push(`function ${func.id}`);
  pack.functions.set(new ResourceLocation(namespace, `__internal/funcs/${index}`), commands);
}

export const pageSize = 0x10000;
const emptyPage = `[B;${fillArray(pageSize, "0b")}]`;

function parseLimits({ min, max }: Limits, defaultMax: number): { min: number; max: number; } {
  return { min, max: max === undefined ? defaultMax : max };
}

function addMem(ctx: Context, index: number): void {
  const { pack, namespace } = ctx;
  const mem = ctx.mems[index];
  if (mem.type === "module") {
    const { min, max } = parseLimits(mem.memType, 0x10000);
    if (max > 0) {
      ctx.initCommands.push(
        `scoreboard players set #a masm ${min}`,
        `function ${namespace}:__internal/mems/${index}/grow_unchecked`
      );
      pack.functions
        .set(new ResourceLocation(namespace, `__internal/mems/${index}/swap_in`), [
          `data modify storage masm:__internal tmp set value "${namespace}:${index}"`,
          "execute store success score #page_fault masm run data modify storage masm:__internal tmp set from storage masm:__internal mem.id",
          "execute store result storage masm:__internal tmp int 1 run scoreboard players operation #target_page masm = #index masm",
          "execute if score #page_fault masm matches 0 store success score #page_fault masm run data modify storage masm:__internal tmp set from storage masm:__internal mem.page",
          "execute unless score #page_fault masm matches 0 run function #masm:__internal/mems/swap_out",
          "scoreboard players operation #index masm = #target_page masm",
          `execute unless score #page_fault masm matches 0 run function ${buildTree({
            pack,
            id: new ResourceLocation(namespace, `__internal/mems/${index}/swap_in`),
            childCount: 16,
            getLeaf(pageIndex: number) {
              return `run data modify storage masm:__internal mem.data set from storage ${namespace}:__internal mems[${index}][${pageIndex}]`;
            }
          }, 0, max)}`,
          `data modify storage masm:__internal mem.id set value "${namespace}:${index}"`,
          "execute store result storage masm:__internal mem.page int 1 run scoreboard players get #target_page masm"
        ])
        .set(new ResourceLocation(namespace, `__internal/mems/${index}/swap_out`), [
          "execute store result score #index masm run data get storage masm:__internal mem.page",
          `function ${buildTree({
            pack,
            id: new ResourceLocation(namespace, `__internal/mems/${index}/swap_out`),
            childCount: 16,
            getLeaf(pageIndex: number) {
              return `run data modify storage ${namespace}:__internal mems[${index}][${pageIndex}] set from storage masm:__internal mem.data`;
            }
          }, 0, max)}`
        ])
        .set(new ResourceLocation(namespace, `__internal/mems/${index}/get`), [
          "scoreboard players operation #target_address masm = #index masm",
          "scoreboard players operation #index masm /= #page_size masm",
          `execute unless score #index masm matches 0.. run scoreboard players add #index ${pageSize}`,
          `function ${namespace}:__internal/mems/${index}/swap_in`,
          "scoreboard players operation #index masm = #target_address masm",
          "scoreboard players operation #index masm %= #page_size masm",
          "function masm:__internal/mem/get"
        ])
        .set(new ResourceLocation(namespace, `__internal/mems/${index}/set`), [
          "scoreboard players operation #target_address masm = #index masm",
          "scoreboard players operation #index masm /= #page_size masm",
          `execute unless score #index masm matches 0.. run scoreboard players add #index ${pageSize}`,
          `function ${namespace}:__internal/mems/${index}/swap_in`,
          "scoreboard players operation #index masm = #target_address masm",
          "scoreboard players operation #index masm %= #page_size masm",
          "function masm:__internal/mem/set"
        ])
        .set(new ResourceLocation(namespace, `__internal/mems/${index}/size`), [
          "data modify storage masm:__internal stack append value 0",
          `execute store result storage masm:__internal stack[-1] int 1 run data get storage ${namespace}:__internal mems[${index}]`
        ])
        .set(new ResourceLocation(namespace, `__internal/mems/${index}/grow`), [
          "execute store result score #a masm run data get storage masm:__internal stack[-1]",
          `execute store result score #b masm run data get storage ${namespace}:__internal mems[${index}]`,
          "scoreboard players operation #b masm += #a masm",
          `execute store success score #b masm if score #a masm matches 0..${max} if score #b masm matches 0..${max}`,
          "execute if score #b masm matches 0 run scoreboard players set #a masm 0",
          "scoreboard players remove #b masm 1",
          `execute if score #b masm matches 0 store result score #b masm run data get storage ${namespace}:__internal mems[${index}]`,
          `function ${namespace}:__internal/mems/${index}/grow_unchecked`,
          "execute store result storage masm:__internal stack[-1] int 1 run scoreboard players get #b masm"
        ])
        .set(new ResourceLocation(namespace, `__internal/mems/${index}/grow_unchecked`), [
          `execute if score #a masm matches 1.. run function ${namespace}:__internal/mems/${index}/grow_loop`
        ])
        .set(new ResourceLocation(namespace, `__internal/mems/${index}/grow_loop`), [
          "scoreboard players remove #a masm 1",
          `data modify storage ${namespace}:__internal mems[${index}] append value ${emptyPage}`,
          `function ${namespace}:__internal/mems/${index}/grow_unchecked`
        ]);
    } else pack.functions
      .set(new ResourceLocation(namespace, `__internal/mems/${index}/get`), [])
      .set(new ResourceLocation(namespace, `__internal/mems/${index}/set`), [])
      .set(new ResourceLocation(namespace, `__internal/mems/${index}/size`), [
        "data modify storage masm:__internal stack append value 0"
      ])
      .set(new ResourceLocation(namespace, `__internal/mems/${index}/grow`), [
        "execute store result score #a masm run data get storage masm:__internal stack[-1]",
        "execute store success score #a masm if score #a masm matches 0",
        "scoreboard players remove #a masm 1",
        "execute store result storage masm:__internal stack[-1] int 1 run scoreboard players get #a masm"
      ]);
  } else {
    const { id } = mem;
    pack.functions
      .set(new ResourceLocation(namespace, `__internal/mems/${index}/get`), [
        `function ${id.namespace}:__mems/${id.path}/get`
      ])
      .set(new ResourceLocation(namespace, `__internal/mems/${index}/set`), [
        `function ${id.namespace}:__mems/${id.path}/set`
      ])
      .set(new ResourceLocation(namespace, `__internal/mems/${index}/size`), [
        `function ${id.namespace}:__mems/${id.path}/size`
      ])
      .set(new ResourceLocation(namespace, `__internal/mems/${index}/grow`), [
        `function ${id.namespace}:__mems/${id.path}/grow`
      ]);
  }
}

function addGlobal(ctx: Context, index: number): void {
  const { pack, namespace } = ctx;
  const global = ctx.globals[index];
  checkType(global.globalType.valType);
  if (global.type === "module") {
    addInstrs(ctx, ctx.initCommands, global.init, 1);
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
    pack.functions.set(new ResourceLocation(namespace, `__internal/globals/${index}/get`), [
      `function ${global.id.namespace}:__globals/${global.id.path}/get`
    ]);
    if (global.globalType.mut === "var") pack.functions.set(new ResourceLocation(namespace, `__internal/globals/${index}/set`), [
      `function ${global.id.namespace}:__globals/${global.id.path}/set`
    ]);
  }
}

function addFuncExport(ctx: Context, index: number): void {
  const { pack, namespace } = ctx;
  const { name, func } = ctx.funcExports[index];
  pack.functions.set(new ResourceLocation(namespace, name), [
    `function ${namespace}:__internal/funcs/${func}`
  ]);
}

function addMemExport(ctx: Context, index: number): void {
  const { pack, namespace } = ctx;
  const { name, mem } = ctx.memExports[index];
  pack.functions.set(new ResourceLocation(namespace, `__mems/${name}/get`), [
    `function ${namespace}:__internal/mems/${mem}/get`
  ]);
  pack.functions.set(new ResourceLocation(namespace, `__mems/${name}/set`), [
    `function ${namespace}:__internal/mems/${mem}/set`
  ]);
  pack.functions.set(new ResourceLocation(namespace, `__mems/${name}/size`), [
    `function ${namespace}:__internal/mems/${mem}/size`
  ]);
  pack.functions.set(new ResourceLocation(namespace, `__mems/${name}/grow`), [
    `function ${namespace}:__internal/mems/${mem}/grow`
  ]);
}

function addGlobalExport(ctx: Context, index: number): void {
  const { pack, namespace } = ctx;
  const { name, global } = ctx.globalExports[index];
  pack.functions.set(new ResourceLocation(namespace, `__globals/${name}/get`), [
    `function ${namespace}:__internal/globals/${global}/get`
  ]);
  if (ctx.globals[global].globalType.mut === "var") pack.functions.set(new ResourceLocation(namespace, `__globals/${name}/set`), [
    `function ${namespace}:__internal/globals/${global}/set`
  ]);
}

function parseWasm(ctx: Context, wasm: ArrayBuffer, dump?: boolean): void {
  const module = parse(wasm);
  if (dump) process.stderr.write(JSON.stringify(module, undefined, 2) + "\n");
  for (const type of module.types) {
    type.params.forEach(checkType);
    type.results.forEach(checkType);
    ctx.types.push(type);
  }
  for (const import_ of module.imports)
    switch (import_.desc.type) {
      case "func":
        ctx.funcs.push({
          type: "import",
          funcType: import_.desc.funcType,
          id: new ResourceLocation(import_.module, import_.name)
        });
        break;
      case "mem":
        ctx.mems.push({
          type: "import",
          id: new ResourceLocation(import_.module, import_.name)
        });
        break;
      case "global":
        checkType(import_.desc.globalType.valType);
        ctx.globals.push({
          type: "import",
          globalType: import_.desc.globalType,
          id: new ResourceLocation(import_.module, import_.name)
        });
        break;
      default:
        throw new Error(`unsupported import type '${import_.desc.type}'`);
    }
  for (const func of module.funcs)
    ctx.funcs.push({
      type: "module",
      funcType: func.type,
      locals: func.locals,
      body: func.body
    });
  for (const mem of module.mems)
    ctx.mems.push({
      type: "module",
      memType: mem.type
    });
  for (const global of module.globals)
    ctx.globals.push({
      type: "module",
      globalType: global.type,
      init: global.init
    });
  for (const export_ of module.exports)
    switch (export_.desc.type) {
      case "func":
        ctx.funcExports.push({
          name: export_.name,
          func: export_.desc.func
        });
        break;
      case "mem":
        ctx.memExports.push({
          name: export_.name,
          mem: export_.desc.mem
        });
        break;
      case "global":
        ctx.globalExports.push({
          name: export_.name,
          global: export_.desc.global
        });
        break;
      default:
        throw new Error(`unsupported import type '${export_.desc.type}'`);
    }
  ctx.data.push(...module.data);
  ctx.start = module.start;
}

export function compileTo(pack: DataPack, namespace: string, data: ArrayBuffer, dump?: boolean): void {
  if (namespace.length > 16) throw new RangeError("namespace is too long");
  const ctx: Context = {
    pack,
    namespace,
    types: [],
    funcs: [],
    mems: [],
    globals: [],
    funcExports: [],
    memExports: [],
    globalExports: [],
    data: [],
    start: null,
    funcPool: [],
    initCommands: []
  };
  parseWasm(ctx, data, dump);
  ctx.initCommands.push(`data modify storage ${namespace}:__internal mems set value [${fillArray(ctx.mems.length, "[]")}]`);
  ctx.initCommands.push(`data modify storage ${namespace}:__internal globals set value [${fillArray(ctx.globals.length, "0")}]`);
  const commands: string[] = [];
  for (let i = 0, len = ctx.mems.length; i < len; i++)
    if (ctx.mems[i].type === "module") commands.push(
      "data modify storage masm:__internal tmp set from storage masm:__internal mem.id",
      `execute store success score #a masm run data modify storage masm:__internal tmp set value "${namespace}:${i}"`,
      `execute if score #a masm matches 0 run function ${namespace}:__internal/mems/${i}/swap_out`
    );
  pack.functions.set(new ResourceLocation(namespace, "__internal/mems/swap_out"), commands);
  pack.tags.set(new ResourceLocation("masm", "__internal/mems/swap_out"), {
    values: [`${namespace}:__internal/mems/swap_out`]
  });
  for (let i = 0, len = ctx.funcs.length; i < len; i++)
    addFunc(ctx, i);
  for (let i = 0, len = ctx.mems.length; i < len; i++)
    addMem(ctx, i);
  for (let i = 0, len = ctx.globals.length; i < len; i++)
    addGlobal(ctx, i);
  for (let i = 0, len = ctx.funcExports.length; i < len; i++)
    addFuncExport(ctx, i);
  for (let i = 0, len = ctx.memExports.length; i < len; i++)
    addMemExport(ctx, i);
  for (let i = 0, len = ctx.globalExports.length; i < len; i++)
    addGlobalExport(ctx, i);
  for (const { data, offset, init } of ctx.data) {
    addInstrs(ctx, ctx.initCommands, offset, 1);
    ctx.initCommands.push(
      "execute store result score #index masm run data get storage masm:__internal stack[-1]",
      "data remove storage masm:__internal stack[-1]"
    );
    for (const elem of init)
      ctx.initCommands.push(
        `scoreboard players set #a masm ${elem}`,
        `function ${namespace}:__internal/mems/${data}/set`,
        "scoreboard players add #index masm 1"
      );
  }
  if (ctx.start) ctx.initCommands.push(`function ${namespace}:__internal/funcs/${ctx.start.func}`);
  for (let i = 0, len = ctx.funcPool.length; i < len; i++)
    pack.functions.set(new ResourceLocation(namespace, `__internal/func_pool/${i}`), ctx.funcPool[i]);
  pack.functions.set(new ResourceLocation(namespace, "__init"), ctx.initCommands);
}
