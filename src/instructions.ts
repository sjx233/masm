import { Context, Label } from "./context";
import { checkType, Type } from "./type";
import ResourceLocation = require("resource-location");

const relOp = new Map<string, string>([
  ["eq", "="],
  ["lt_s", "<"],
  ["lt_u", "<"],
  ["gt_s", ">"],
  ["gt_u", ">"],
  ["le_s", "<="],
  ["le_u", "<="],
  ["ge_s", ">="],
  ["ge_u", ">="]
]);
const binOp = new Map<string, string>([
  ["add", "+="],
  ["sub", "-="],
  ["mul", "*="]
]);

function newFunction({ namespace, funcPool }: Context): [ResourceLocation, string[]] {
  const index = funcPool.length;
  funcPool.push([]);
  return [new ResourceLocation(namespace, `__internal/func_pool/${index}`), funcPool[index]];
}

function singleType(type: string | null): Type[] {
  return type ? [checkType(type)] : [];
}

function br(index: number, commands: string[], depth: number, stackSize: number, labels: Label[]): {
  toDepth: number;
  newSize: number;
} {
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

function addBlock(ctx: Context, commands: string[], insns: any[], depth: number, stackSize: number, resultCount: number, labels: Label[]): number {
  const { namespace } = ctx;
  labels.push({ index: stackSize, arity: resultCount });
  let minDepth = depth;
  block: for (let i = 0, len = insns.length; i < len; i++) {
    const insn = insns[i];
    switch (insn.id) {
      case "nop":
        break;
      case "block": {
        const results = singleType(insn.result);
        const [subId, subCommands] = newFunction(ctx);
        const subDepth = addBlock(ctx, subCommands, insn.instr, depth + 1, stackSize, results.length, labels);
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
        const results = singleType(insn.result);
        const [subId, subCommands] = newFunction(ctx);
        const subDepth = addBlock(ctx, subCommands, insn.instr, depth + 1, stackSize, results.length, labels);
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
        const results = singleType(insn.result);
        const [subId, subCommands] = newFunction(ctx);
        const subDepth = addBlock(ctx, subCommands, insn.consequent, depth + 1, stackSize, results.length, labels);
        if (subDepth < minDepth) minDepth = subDepth;
        if (insn.alternate?.length) {
          const [altId, altCommands] = newFunction(ctx);
          const altDepth = addBlock(ctx, altCommands, insn.alternate, depth + 1, stackSize, results.length, labels);
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
        const { toDepth, newSize } = br(insn.args[0].value, commands, depth, stackSize, labels);
        if (toDepth < minDepth) minDepth = toDepth;
        stackSize = newSize;
        break block;
      }
      case "br_if": {
        stackSize--;
        const [subId, subCommands] = newFunction(ctx);
        const { toDepth } = br(insn.args[0].value, subCommands, depth, stackSize, labels);
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
      case "br_table":
        stackSize--;
        commands.push(
          "execute store result score #a masm run data get storage masm:__internal stack[-1]",
          "data remove storage masm:__internal stack[-1]"
        );
        for (let i = 0, len = insn.args.length - 1; i <= len; i++) {
          const [subId, subCommands] = newFunction(ctx);
          const { toDepth } = br(insn.args[i].value, subCommands, depth, stackSize, labels);
          if (toDepth < minDepth) minDepth = toDepth;
          commands.push(`execute if score #a masm matches ${i === len ? `${i}..` : i} run function ${subId}`);
        }
        break block;
      case "return":
        br(depth, commands, depth, stackSize, labels);
        minDepth = 0;
        break block;
      case "call": {
        const index = insn.index.value;
        const { params, results } = ctx.funcs[index];
        stackSize -= params.length;
        stackSize += results.length;
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
      case "get_local":
        stackSize++;
        commands.push(`data modify storage masm:__internal stack append from storage masm:__internal frames[-1][${insn.args[0].value}]`);
        break;
      case "set_local":
        stackSize--;
        commands.push(
          `data modify storage masm:__internal frames[-1][${insn.args[0].value}] set from storage masm:__internal stack[-1]`,
          "data remove storage masm:__internal stack[-1]"
        );
        break;
      case "tee_local":
        commands.push(`data modify storage masm:__internal frames[-1][${insn.args[0].value}] set from storage masm:__internal stack[-1]`);
        break;
      case "get_global":
        stackSize++;
        commands.push(`function ${namespace}:__internal/globals/${insn.args[0].value}/get`);
        break;
      case "set_global":
        stackSize--;
        commands.push(`function ${namespace}:__internal/globals/${insn.args[0].value}/set`);
        break;
      case "load":
        checkType(insn.object);
        commands.push(
          "execute store result score #index masm run data get storage masm:__internal stack[-1]",
          `function ${namespace}:__internal/memories/0/get`,
          "scoreboard players operation #b masm = #a masm",
          "scoreboard players operation #b masm %= 2^8 masm",
          "scoreboard players add #index masm 1",
          `function ${namespace}:__internal/memories/0/get`,
          "scoreboard players operation #a masm *= 2^8 masm",
          "scoreboard players operation #b masm += #a masm",
          "scoreboard players add #index masm 1",
          `function ${namespace}:__internal/memories/0/get`,
          "scoreboard players operation #a masm *= 2^16 masm",
          "scoreboard players operation #b masm += #a masm",
          "scoreboard players add #index masm 1",
          `function ${namespace}:__internal/memories/0/get`,
          "scoreboard players operation #a masm *= 2^24 masm",
          "execute store result storage masm:__internal stack[-1] int 1 run scoreboard players operation #b masm += #a masm"
        );
        break;
      case "load8_s":
        checkType(insn.object);
        commands.push(
          "execute store result score #index masm run data get storage masm:__internal stack[-1]",
          `function ${namespace}:__internal/memories/0/get`,
          "execute store result storage masm:__internal stack[-1] int 1 run scoreboard players get #a masm"
        );
        break;
      case "load8_u":
        checkType(insn.object);
        commands.push(
          "execute store result score #index masm run data get storage masm:__internal stack[-1]",
          `function ${namespace}:__internal/memories/0/get`,
          "execute store result storage masm:__internal stack[-1] int 1 run scoreboard players operation #a masm %= 2^8 masm"
        );
        break;
      case "load16_s":
        checkType(insn.object);
        commands.push(
          "execute store result score #index masm run data get storage masm:__internal stack[-1]",
          `function ${namespace}:__internal/memories/0/get`,
          "scoreboard players operation #b masm = #a masm",
          "scoreboard players operation #b masm %= 2^8 masm",
          "scoreboard players add #index masm 1",
          `function ${namespace}:__internal/memories/0/get`,
          "scoreboard players operation #a masm *= 2^8 masm",
          "execute store result storage masm:__internal stack[-1] int 1 run scoreboard players operation #b masm += #a masm"
        );
        break;
      case "load16_u":
        checkType(insn.object);
        commands.push(
          "execute store result score #index masm run data get storage masm:__internal stack[-1]",
          `function ${namespace}:__internal/memories/0/get`,
          "scoreboard players operation #b masm = #a masm",
          "scoreboard players add #index masm 1",
          `function ${namespace}:__internal/memories/0/get`,
          "scoreboard players operation #a masm *= 2^8 masm",
          "scoreboard players operation #b masm += #a masm",
          "execute store result storage masm:__internal stack[-1] int 1 run scoreboard players operation #b masm %= 2^16 masm"
        );
        break;
      case "store":
        checkType(insn.object);
        stackSize -= 2;
        commands.push(
          "execute store result score #a masm run data get storage masm:__internal stack[-1]",
          "data remove storage masm:__internal stack[-1]",
          "execute store result score #index masm run data get storage masm:__internal stack[-1]",
          "data remove storage masm:__internal stack[-1]",
          `function ${namespace}:__internal/memories/0/set`,
          "scoreboard players add #index masm 1",
          "scoreboard players operation #a masm /= 2^8 masm",
          `function ${namespace}:__internal/memories/0/set`,
          "scoreboard players add #index masm 1",
          "scoreboard players operation #a masm /= 2^8 masm",
          `function ${namespace}:__internal/memories/0/set`,
          "scoreboard players add #index masm 1",
          "scoreboard players operation #a masm /= 2^8 masm",
          `function ${namespace}:__internal/memories/0/set`
        );
        break;
      case "store8":
        checkType(insn.object);
        stackSize -= 2;
        commands.push(
          "execute store result score #a masm run data get storage masm:__internal stack[-1]",
          "data remove storage masm:__internal stack[-1]",
          "execute store result score #index masm run data get storage masm:__internal stack[-1]",
          "data remove storage masm:__internal stack[-1]",
          `function ${namespace}:__internal/memories/0/set`
        );
        break;
      case "store16":
        checkType(insn.object);
        stackSize -= 2;
        commands.push(
          "execute store result score #a masm run data get storage masm:__internal stack[-1]",
          "data remove storage masm:__internal stack[-1]",
          "execute store result score #index masm run data get storage masm:__internal stack[-1]",
          "data remove storage masm:__internal stack[-1]",
          `function ${namespace}:__internal/memories/0/set`,
          "scoreboard players add #index masm 1",
          "scoreboard players operation #a masm /= 2^8 masm",
          `function ${namespace}:__internal/memories/0/set`
        );
        break;
      // See MC-159633.
      // case "current_memory":
      //   stackSize++;
      //   commands.push(`function ${namespace}:__internal/memories/0/size`);
      //   break;
      // case "grow_memory":
      //   commands.push(`function ${namespace}:__internal/memories/0/grow`);
      //   break;
      case "const":
        checkType(insn.object);
        stackSize++;
        commands.push(`data modify storage masm:__internal stack append value ${insn.args[0].value}`);
        break;
      case "eqz":
        checkType(insn.object);
        commands.push(
          "execute store result score #a masm run data get storage masm:__internal stack[-1]",
          "execute store success storage masm:__internal stack[-1] int 1 if score #a masm matches 0"
        );
        break;
      case "ne":
        checkType(insn.object);
        stackSize--;
        commands.push(
          "execute store result score #b masm run data get storage masm:__internal stack[-1]",
          "data remove storage masm:__internal stack[-1]",
          "execute store result score #a masm run data get storage masm:__internal stack[-1]",
          "execute store success storage masm:__internal stack[-1] int 1 unless score #a masm = #b masm"
        );
        break;
      case "eq":
      case "lt_s":
      case "gt_s":
      case "le_s":
      case "ge_s": {
        checkType(insn.object);
        const op = relOp.get(insn.id);
        stackSize--;
        commands.push(
          "execute store result score #b masm run data get storage masm:__internal stack[-1]",
          "data remove storage masm:__internal stack[-1]",
          "execute store result score #a masm run data get storage masm:__internal stack[-1]",
          `execute store success storage masm:__internal stack[-1] int 1 if score #a masm ${op} #b masm`
        );
        break;
      }
      case "lt_u":
      case "gt_u":
      case "le_u":
      case "ge_u": {
        checkType(insn.object);
        const op = relOp.get(insn.id);
        stackSize--;
        commands.push(
          "execute store result score #b masm run data get storage masm:__internal stack[-1]",
          "data remove storage masm:__internal stack[-1]",
          "execute store result score #a masm run data get storage masm:__internal stack[-1]",
          "scoreboard players operation #a masm += 2^31 masm",
          "scoreboard players operation #b masm += 2^31 masm",
          `execute store success storage masm:__internal stack[-1] int 1 if score #a masm ${op} #b masm`
        );
        break;
      }
      case "clz":
      case "ctz":
      case "popcnt":
        checkType(insn.object);
        commands.push(
          "execute store result score #a masm run data get storage masm:__internal stack[-1]",
          `function masm:__internal/${insn.id}`,
          "execute store result storage masm:__internal stack[-1] int 1 run scoreboard players get #b masm"
        );
        break;
      case "add":
      case "sub":
      case "mul": {
        checkType(insn.object);
        const op = binOp.get(insn.id);
        stackSize--;
        commands.push(
          "execute store result score #b masm run data get storage masm:__internal stack[-1]",
          "data remove storage masm:__internal stack[-1]",
          "execute store result score #a masm run data get storage masm:__internal stack[-1]",
          `scoreboard players operation #a masm ${op} #b masm`,
          "execute store result storage masm:__internal stack[-1] int 1 run scoreboard players get #a masm"
        );
        break;
      }
      case "div_s":
      case "div_u":
      case "rem_s":
      case "rem_u":
      case "and":
      case "or":
      case "xor":
        checkType(insn.object);
        stackSize--;
        commands.push(
          "execute store result score #b masm run data get storage masm:__internal stack[-1]",
          "data remove storage masm:__internal stack[-1]",
          "execute store result score #a masm run data get storage masm:__internal stack[-1]",
          `function masm:__internal/${insn.id}`,
          "execute store result storage masm:__internal stack[-1] int 1 run scoreboard players get #c masm"
        );
        break;
      case "shl":
      case "shr_s":
      case "shr_u":
      case "rotl":
      case "rotr":
        checkType(insn.object);
        stackSize--;
        commands.push(
          "execute store result score #b masm run data get storage masm:__internal stack[-1]",
          "data remove storage masm:__internal stack[-1]",
          "execute store result score #a masm run data get storage masm:__internal stack[-1]",
          `function masm:__internal/${insn.id}`,
          "execute store result storage masm:__internal stack[-1] int 1 run scoreboard players get #a masm"
        );
        break;
      case "end":
        break;
      case "local":
        for (const type of insn.args) {
          checkType(type.name);
          commands.push("data modify storage masm:__internal frames[-1] append value 0");
        }
        break;
      default:
        throw new Error(`instruction '${insn.id}' is unsupported`);
    }
  }
  labels.pop();
  return minDepth;
}

export function addInsns(ctx: Context, commands: string[], insns: any[], resultCount: number): void {
  addBlock(ctx, commands, insns, 0, 0, resultCount, []);
}
