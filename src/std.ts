import { DataPack, Pack } from "minecraft-packs";
import * as path from "path";
import { pageSize } from ".";
import { buildTree } from "./util";
import ResourceLocation = require("resource-location");

export async function genStd(): Promise<DataPack> {
  const pack = await Pack.read(path.resolve(__dirname, "../std"), "data") as DataPack;
  pack.functions
    .set(new ResourceLocation("masm", "__internal/memory/get"), [
      `function ${buildTree({
        pack,
        id: new ResourceLocation("masm", "__internal/memory/get"),
        childCount: 16,
        getLeaf(index: number) {
          return `store result score #a masm run data get storage masm:__internal memory.data[${index}]`;
        }
      }, 0, pageSize)}`
    ])
    .set(new ResourceLocation("masm", "__internal/memory/set"), [
      `function ${buildTree({
        pack, id: new ResourceLocation("masm", "__internal/memory/set"),
        childCount: 16,
        getLeaf(index: number) {
          return `store result storage masm:__internal memory.data[${index}] byte 1 run scoreboard players get #a masm`;
        }
      }, 0, pageSize)}`
    ]);
  return pack;
}
