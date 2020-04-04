import { DataPack } from "minecraft-packs";
import ResourceLocation = require("resource-location");

export interface TreeOptions {
  pack: DataPack;
  id: ResourceLocation;
  childCount: number;
  getLeaf: (index: number) => string;
}

export function buildTree(options: TreeOptions, index: number, size: number): ResourceLocation {
  const { pack, id: treeId, childCount, getLeaf } = options;
  const id = new ResourceLocation(treeId.namespace, `${treeId.path}/${index}-${index + (size - 1)}`);
  const commands: string[] = [];
  pack.functions.set(id, commands);
  const childSize = Math.ceil(size / childCount);
  const middle = childSize * childCount - size;
  for (let i = 0; i < childCount; i++) {
    const curSize = childSize - Number(i < middle);
    if (curSize > 0) {
      commands.push(`execute if score #index masm matches ${curSize === 1
        ? `${index} ${getLeaf(index)}`
        : `${index}..${index + (curSize - 1)} run function ${buildTree(options, index, curSize)}`}`);
      index += curSize;
    }
  }
  return id;
}

export function fillArray(length: number, element: string): string {
  return ("," + element).repeat(length).substring(1);
}
