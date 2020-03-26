import { Context } from "./context";
import { checkType } from "./type";
import ResourceLocation = require("resource-location");

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

function newFunction({ namespace, funcPool }: Context): [ResourceLocation, string[]] {
  const index = funcPool.length;
  funcPool.push([]);
  return [new ResourceLocation(namespace, `__internal/func_pool/${index}`), funcPool[index]];
}

export function addInstructions(ctx: Context, insns: any[], commands: string[], depth: number): number {
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
        commands.push(`function ${namespace}:__internal/globals/${insn.args[0].value}/get`);
        break;
      case "set_global":
        commands.push(`function ${namespace}:__internal/globals/${insn.args[0].value}/set`);
        break;
      case "current_memory":
        commands.push(`function ${namespace}:__internal/memories/0/size`);
        break;
      case "grow_memory":
        commands.push(`function ${namespace}:__internal/memories/0/grow`);
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
