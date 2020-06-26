import { Context, Label } from "./context";
import { BlockType, FuncType, Instr, LabelIdx } from "./parser";
import ResourceLocation = require("resource-location");

function newFunction({ namespace, funcPool }: Context): [ResourceLocation, string[]] {
  const index = funcPool.length;
  funcPool.push([]);
  return [new ResourceLocation(namespace, `__internal/func_pool/${index}`), funcPool[index]];
}

function resolveType(ctx: Context, type: BlockType): FuncType {
  if (type === null) return { params: [], results: [] };
  if (typeof type === "string") return { params: [], results: [type] };
  return ctx.types[type];
}

function br(index: LabelIdx, commands: string[], depth: number, stackSize: number, labels: Label[]): { toDepth: number; newSize: number; } {
  const toDepth = depth - index;
  const label = labels[labels.length - 1 - index];
  const newSize = label.index + label.arity;
  const dropCount = stackSize - newSize;
  const dropIndex = -1 - label.arity;
  for (let i = dropCount; i; i--)
    commands.push(`data remove storage masm:__internal stack[${dropIndex}]`);
  commands.push(`scoreboard players set #br_depth masm ${toDepth}`);
  return { toDepth, newSize };
}

function srelop(op: string, commands: string[], stackSize: number): number {
  commands.push(
    "execute store result score #b masm run data get storage masm:__internal stack[-1]",
    "data remove storage masm:__internal stack[-1]",
    "execute store result score #a masm run data get storage masm:__internal stack[-1]",
    `execute store success storage masm:__internal stack[-1] int 1 if score #a masm ${op} #b masm`
  );
  return --stackSize;
}

function urelop(op: string, commands: string[], stackSize: number): number {
  commands.push(
    "execute store result score #b masm run data get storage masm:__internal stack[-1]",
    "data remove storage masm:__internal stack[-1]",
    "execute store result score #a masm run data get storage masm:__internal stack[-1]",
    "scoreboard players operation #a masm += 2^31 masm",
    "scoreboard players operation #b masm += 2^31 masm",
    `execute store success storage masm:__internal stack[-1] int 1 if score #a masm ${op} #b masm`
  );
  return --stackSize;
}

function iunop(op: string, commands: string[]): void {
  commands.push(
    "execute store result score #a masm run data get storage masm:__internal stack[-1]",
    `function masm:__internal/${op}`,
    "execute store result storage masm:__internal stack[-1] int 1 run scoreboard players get #b masm"
  );
}

function ibinop(op: string, target: string, commands: string[], stackSize: number): number {
  commands.push(
    "execute store result score #b masm run data get storage masm:__internal stack[-1]",
    "data remove storage masm:__internal stack[-1]",
    "execute store result score #a masm run data get storage masm:__internal stack[-1]",
    `function masm:__internal/${op}`,
    `execute store result storage masm:__internal stack[-1] int 1 run scoreboard players get #${target} masm`
  );
  return --stackSize;
}

function ibinops(op: string, commands: string[], stackSize: number): number {
  commands.push(
    "execute store result score #b masm run data get storage masm:__internal stack[-1]",
    "data remove storage masm:__internal stack[-1]",
    "execute store result score #a masm run data get storage masm:__internal stack[-1]",
    `scoreboard players operation #a masm ${op} #b masm`,
    "execute store result storage masm:__internal stack[-1] int 1 run scoreboard players get #a masm"
  );
  return --stackSize;
}

function addBlock(ctx: Context, commands: string[], instrs: Instr[], depth: number, stackSize: number, resultCount: number, labels: Label[]): number {
  const { namespace } = ctx;
  labels.push({ index: stackSize, arity: resultCount });
  let minDepth = depth;
  block: for (let i = 0, len = instrs.length; i < len; i++) {
    const instr = instrs[i];
    switch (instr.type) {
      case "nop":
        break;
      case "block": {
        const { results } = resolveType(ctx, instr.blockType);
        const [subId, subCommands] = newFunction(ctx);
        const subDepth = addBlock(ctx, subCommands, instr.body, depth + 1, stackSize, results.length, labels);
        if (subDepth < minDepth) minDepth = subDepth;
        const needJump = subDepth <= depth;
        if (needJump) commands.push("scoreboard players set #br_depth masm 2147483647");
        commands.push(`function ${subId}`);
        if (needJump) {
          const [remId, remCommands] = newFunction(ctx);
          commands.push(`execute unless score #br_depth masm matches ..${depth} run function ${remId}`);
          commands = remCommands;
        }
        labels.pop();
        stackSize += results.length;
        break;
      }
      case "loop": {
        const { results } = resolveType(ctx, instr.blockType);
        const [subId, subCommands] = newFunction(ctx);
        const subDepth = addBlock(ctx, subCommands, instr.body, depth + 1, stackSize, results.length, labels);
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
        stackSize += results.length;
        break;
      }
      case "if": {
        stackSize--;
        const { results } = resolveType(ctx, instr.blockType);
        const [subId, subCommands] = newFunction(ctx);
        const subDepth = addBlock(ctx, subCommands, instr.consequent, depth + 1, stackSize, results.length, labels);
        if (subDepth < minDepth) minDepth = subDepth;
        if (instr.alternative.length) {
          const [altId, altCommands] = newFunction(ctx);
          const altDepth = addBlock(ctx, altCommands, instr.alternative, depth + 1, stackSize, results.length, labels);
          if (altDepth < minDepth) minDepth = altDepth;
          const needJump = subDepth <= depth || altDepth <= depth;
          if (needJump) commands.push("scoreboard players set #br_depth masm 2147483647");
          commands.push(
            "data modify storage masm:__internal conditions append from storage masm:__internal stack[-1]",
            "data remove storage masm:__internal stack[-1]",
            "execute store result score #a masm run data get storage masm:__internal conditions[-1]",
            `execute unless score #a masm matches 0 run function ${subId}`,
            "execute store result score #a masm run data get storage masm:__internal conditions[-1]",
            `execute if score #a masm matches 0 run function ${altId}`,
            "data remove storage masm:__internal conditions[-1]"
          );
          if (needJump) {
            const [remId, remCommands] = newFunction(ctx);
            commands.push(`execute unless score #br_depth masm matches ..${depth} run function ${remId}`);
            commands = remCommands;
          }
        } else {
          const needJump = subDepth <= depth;
          if (needJump) commands.push("scoreboard players set #br_depth masm 2147483647");
          commands.push(
            "data modify storage masm:__internal conditions append from storage masm:__internal stack[-1]",
            "data remove storage masm:__internal stack[-1]",
            "execute store result score #a masm run data get storage masm:__internal conditions[-1]",
            `execute unless score #a masm matches 0 run function ${subId}`,
            "data remove storage masm:__internal conditions[-1]"
          );
          if (needJump) {
            const [remId, remCommands] = newFunction(ctx);
            commands.push(`execute unless score #br_depth masm matches ..${depth} run function ${remId}`);
            commands = remCommands;
          }
        }
        stackSize += results.length;
        break;
      }
      case "br": {
        const { toDepth, newSize } = br(instr.label, commands, depth, stackSize, labels);
        if (toDepth < minDepth) minDepth = toDepth;
        stackSize = newSize;
        break block;
      }
      case "br_if": {
        stackSize--;
        const [subId, subCommands] = newFunction(ctx);
        const { toDepth } = br(instr.label, subCommands, depth, stackSize, labels);
        if (toDepth < minDepth) minDepth = toDepth;
        const [remId, remCommands] = newFunction(ctx);
        commands.push(
          "execute store result score #a masm run data get storage masm:__internal stack[-1]",
          "data remove storage masm:__internal stack[-1]",
          `execute unless score #a masm matches 0 run function ${subId}`,
          `execute if score #a masm matches 0 run function ${remId}`
        );
        commands = remCommands;
        break;
      }
      case "br_table": {
        stackSize--;
        commands.push(
          "execute store result score #a masm run data get storage masm:__internal stack[-1]",
          "data remove storage masm:__internal stack[-1]"
        );
        const length = instr.labels.length;
        for (let i = 0; i < length; i++) {
          const [subId, subCommands] = newFunction(ctx);
          const { toDepth } = br(instr.labels[i], subCommands, depth, stackSize, labels);
          if (toDepth < minDepth) minDepth = toDepth;
          commands.push(`execute if score #a masm matches ${i} run function ${subId}`);
        }
        const [subId, subCommands] = newFunction(ctx);
        const { toDepth } = br(instr.default, subCommands, depth, stackSize, labels);
        if (toDepth < minDepth) minDepth = toDepth;
        commands.push(`execute if score #a masm matches ${i}.. run function ${subId}`);
        break block;
      }
      case "return":
        br(depth, commands, depth, stackSize, labels);
        minDepth = 0;
        break block;
      case "call": {
        const { params, results } = ctx.types[ctx.funcs[instr.func].funcType];
        stackSize -= params.length;
        stackSize += results.length;
        commands.push("data modify storage masm:__internal frames append value []");
        for (let i = params.length; i; i--)
          commands.push(`data modify storage masm:__internal frames[-1] append from storage masm:__internal stack[-${i}]`);
        for (let i = params.length; i; i--)
          commands.push("data remove storage masm:__internal stack[-1]");
        commands.push(
          `function ${namespace}:__internal/funcs/${instr.func}`,
          "data remove storage masm:__internal frames[-1]"
        );
        break;
      }
      case "drop":
        stackSize--;
        commands.push("data remove storage masm:__internal stack[-1]");
        break;
      case "select":
        stackSize -= 2;
        commands.push(
          "execute store result score #a masm run data get storage masm:__internal stack[-1]",
          "data remove storage masm:__internal stack[-1]",
          "execute unless score #a masm matches 0 run data remove storage masm:__internal stack[-1]",
          "execute if score #a masm matches 0 run data remove storage masm:__internal stack[-2]"
        );
        break;
      case "local.get":
        stackSize++;
        commands.push(`data modify storage masm:__internal stack append from storage masm:__internal frames[-1][${instr.local}]`);
        break;
      case "local.set":
        stackSize--;
        commands.push(
          `data modify storage masm:__internal frames[-1][${instr.local}] set from storage masm:__internal stack[-1]`,
          "data remove storage masm:__internal stack[-1]"
        );
        break;
      case "local.tee":
        commands.push(`data modify storage masm:__internal frames[-1][${instr.local}] set from storage masm:__internal stack[-1]`);
        break;
      case "global.get":
        stackSize++;
        commands.push(`function ${namespace}:__internal/globals/${instr.global}/get`);
        break;
      case "global.set":
        stackSize--;
        commands.push(`function ${namespace}:__internal/globals/${instr.global}/set`);
        break;
      case "i32.load":
        commands.push(
          "execute store result score #index masm run data get storage masm:__internal stack[-1]",
          `scoreboard players add #index masm ${instr.mem.offset}`,
          `function ${namespace}:__internal/mems/0/get`,
          "scoreboard players operation #b masm = #a masm",
          "scoreboard players operation #b masm %= 2^8 masm",
          "scoreboard players add #index masm 1",
          `function ${namespace}:__internal/mems/0/get`,
          "scoreboard players operation #a masm *= 2^8 masm",
          "scoreboard players operation #b masm += #a masm",
          "scoreboard players add #index masm 1",
          `function ${namespace}:__internal/mems/0/get`,
          "scoreboard players operation #a masm *= 2^16 masm",
          "scoreboard players operation #b masm += #a masm",
          "scoreboard players add #index masm 1",
          `function ${namespace}:__internal/mems/0/get`,
          "scoreboard players operation #a masm *= 2^24 masm",
          "execute store result storage masm:__internal stack[-1] int 1 run scoreboard players operation #b masm += #a masm"
        );
        break;
      case "i32.load8_s":
        commands.push(
          "execute store result score #index masm run data get storage masm:__internal stack[-1]",
          `scoreboard players add #index masm ${instr.mem.offset}`,
          `function ${namespace}:__internal/mems/0/get`,
          "execute store result storage masm:__internal stack[-1] int 1 run scoreboard players get #a masm"
        );
        break;
      case "i32.load8_u":
        commands.push(
          "execute store result score #index masm run data get storage masm:__internal stack[-1]",
          `scoreboard players add #index masm ${instr.mem.offset}`,
          `function ${namespace}:__internal/mems/0/get`,
          "execute store result storage masm:__internal stack[-1] int 1 run scoreboard players operation #a masm %= 2^8 masm"
        );
        break;
      case "i32.load16_s":
        commands.push(
          "execute store result score #index masm run data get storage masm:__internal stack[-1]",
          `scoreboard players add #index masm ${instr.mem.offset}`,
          `function ${namespace}:__internal/mems/0/get`,
          "scoreboard players operation #b masm = #a masm",
          "scoreboard players operation #b masm %= 2^8 masm",
          "scoreboard players add #index masm 1",
          `function ${namespace}:__internal/mems/0/get`,
          "scoreboard players operation #a masm *= 2^8 masm",
          "execute store result storage masm:__internal stack[-1] int 1 run scoreboard players operation #b masm += #a masm"
        );
        break;
      case "i32.load16_u":
        commands.push(
          "execute store result score #index masm run data get storage masm:__internal stack[-1]",
          `scoreboard players add #index masm ${instr.mem.offset}`,
          `function ${namespace}:__internal/mems/0/get`,
          "scoreboard players operation #b masm = #a masm",
          "scoreboard players add #index masm 1",
          `function ${namespace}:__internal/mems/0/get`,
          "scoreboard players operation #a masm *= 2^8 masm",
          "scoreboard players operation #b masm += #a masm",
          "execute store result storage masm:__internal stack[-1] int 1 run scoreboard players operation #b masm %= 2^16 masm"
        );
        break;
      case "i32.store":
        stackSize -= 2;
        commands.push(
          "execute store result score #a masm run data get storage masm:__internal stack[-1]",
          "data remove storage masm:__internal stack[-1]",
          "execute store result score #index masm run data get storage masm:__internal stack[-1]",
          `scoreboard players add #index masm ${instr.mem.offset}`,
          "data remove storage masm:__internal stack[-1]",
          `function ${namespace}:__internal/mems/0/set`,
          "scoreboard players add #index masm 1",
          "scoreboard players operation #a masm /= 2^8 masm",
          `function ${namespace}:__internal/mems/0/set`,
          "scoreboard players add #index masm 1",
          "scoreboard players operation #a masm /= 2^8 masm",
          `function ${namespace}:__internal/mems/0/set`,
          "scoreboard players add #index masm 1",
          "scoreboard players operation #a masm /= 2^8 masm",
          `function ${namespace}:__internal/mems/0/set`
        );
        break;
      case "i32.store8":
        stackSize -= 2;
        commands.push(
          "execute store result score #a masm run data get storage masm:__internal stack[-1]",
          "data remove storage masm:__internal stack[-1]",
          "execute store result score #index masm run data get storage masm:__internal stack[-1]",
          `scoreboard players add #index masm ${instr.mem.offset}`,
          "data remove storage masm:__internal stack[-1]",
          `function ${namespace}:__internal/mems/0/set`
        );
        break;
      case "i32.store16":
        stackSize -= 2;
        commands.push(
          "execute store result score #a masm run data get storage masm:__internal stack[-1]",
          "data remove storage masm:__internal stack[-1]",
          "execute store result score #index masm run data get storage masm:__internal stack[-1]",
          `scoreboard players add #index masm ${instr.mem.offset}`,
          "data remove storage masm:__internal stack[-1]",
          `function ${namespace}:__internal/mems/0/set`,
          "scoreboard players add #index masm 1",
          "scoreboard players operation #a masm /= 2^8 masm",
          `function ${namespace}:__internal/mems/0/set`
        );
        break;
      // See MC-159633
      // case "memory.size":
      //   stackSize++;
      //   commands.push(`function ${namespace}:__internal/mems/0/size`);
      //   break;
      // case "memory.grow":
      //   commands.push(`function ${namespace}:__internal/mems/0/grow`);
      //   break;
      case "i32.const":
        stackSize++;
        commands.push(`data modify storage masm:__internal stack append value ${instr.value}`);
        break;
      case "i32.eqz":
        commands.push(
          "execute store result score #a masm run data get storage masm:__internal stack[-1]",
          "execute store success storage masm:__internal stack[-1] int 1 if score #a masm matches 0"
        );
        break;
      case "i32.eq":
        stackSize = srelop("=", commands, stackSize);
        break;
      case "i32.ne":
        stackSize--;
        commands.push(
          "execute store result score #b masm run data get storage masm:__internal stack[-1]",
          "data remove storage masm:__internal stack[-1]",
          "execute store result score #a masm run data get storage masm:__internal stack[-1]",
          "execute store success storage masm:__internal stack[-1] int 1 unless score #a masm = #b masm"
        );
        break;
      case "i32.lt_s":
        stackSize = srelop("<", commands, stackSize);
        break;
      case "i32.gt_s":
        stackSize = srelop(">", commands, stackSize);
        break;
      case "i32.le_s":
        stackSize = srelop("<=", commands, stackSize);
        break;
      case "i32.ge_s":
        stackSize = srelop(">=", commands, stackSize);
        break;
      case "i32.lt_u":
        stackSize = urelop("<", commands, stackSize);
        break;
      case "i32.gt_u":
        stackSize = urelop(">", commands, stackSize);
        break;
      case "i32.le_u":
        stackSize = urelop("<=", commands, stackSize);
        break;
      case "i32.ge_u":
        stackSize = urelop(">=", commands, stackSize);
        break;
      case "i32.clz":
        iunop("clz", commands);
        break;
      case "i32.ctz":
        iunop("ctz", commands);
        break;
      case "i32.popcnt":
        iunop("popcnt", commands);
        break;
      case "i32.add":
        stackSize = ibinops("+=", commands, stackSize);
        break;
      case "i32.sub":
        stackSize = ibinops("-=", commands, stackSize);
        break;
      case "i32.mul":
        stackSize = ibinops("*=", commands, stackSize);
        break;
      case "i32.div_s":
        stackSize = ibinop("div_s", "c", commands, stackSize);
        break;
      case "i32.div_u":
        stackSize = ibinop("div_u", "c", commands, stackSize);
        break;
      case "i32.rem_s":
        stackSize = ibinop("rem_s", "c", commands, stackSize);
        break;
      case "i32.rem_u":
        stackSize = ibinop("rem_u", "c", commands, stackSize);
        break;
      case "i32.and":
        stackSize = ibinop("and", "c", commands, stackSize);
        break;
      case "i32.or":
        stackSize = ibinop("or", "c", commands, stackSize);
        break;
      case "i32.xor":
        stackSize = ibinop("xor", "c", commands, stackSize);
        break;
      case "i32.shl":
        stackSize = ibinop("shl", "a", commands, stackSize);
        break;
      case "i32.shr_s":
        stackSize = ibinop("shr_s", "a", commands, stackSize);
        break;
      case "i32.shr_u":
        stackSize = ibinop("shr_u", "a", commands, stackSize);
        break;
      case "i32.rotl":
        stackSize = ibinop("rotl", "a", commands, stackSize);
        break;
      case "i32.rotr":
        stackSize = ibinop("rotr", "a", commands, stackSize);
        break;
      default:
        throw new Error(`unsupported instruction '${instr.type}'`);
    }
  }
  labels.pop();
  return minDepth;
}

export function addInstrs(ctx: Context, commands: string[], instrs: Instr[], resultCount: number): void {
  addBlock(ctx, commands, instrs, 0, 0, resultCount, []);
}
