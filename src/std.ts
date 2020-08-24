import { DataPack } from "minecraft-packs";
import * as path from "path";
import { pageSize } from ".";
import { buildTree } from "./util";
import ResourceLocation = require("resource-location");

export async function genStd(): Promise<DataPack> {
  const pack = new DataPack;
  pack.read(path.resolve(__dirname, "../std"));
  pack.functions
    .set(new ResourceLocation("masm", "__internal/mem/get"), [
      `function ${buildTree({
        pack,
        id: new ResourceLocation("masm", "__internal/mem/get"),
        childCount: 16,
        getLeaf(index: number) {
          return `store result score #a masm run data get storage masm:__internal mem.data[${index}]`;
        }
      }, 0, pageSize)}`
    ])
    .set(new ResourceLocation("masm", "__internal/mem/set"), [
      `function ${buildTree({
        pack, id: new ResourceLocation("masm", "__internal/mem/set"),
        childCount: 16,
        getLeaf(index: number) {
          return `store result storage masm:__internal mem.data[${index}] byte 1 run scoreboard players get #a masm`;
        }
      }, 0, pageSize)}`
    ]);
  return pack;
}
