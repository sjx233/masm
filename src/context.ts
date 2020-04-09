import { DataPack } from "minecraft-packs";
import { Type } from "./type";
import ResourceLocation = require("resource-location");

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
  id: ResourceLocation;
}

type Func = ModuleFunc | ImportFunc;

interface ModuleMemory {
  type: "module";
  min: number;
  max: number;
}

interface ImportMemory {
  type: "import";
  id: ResourceLocation;
}

type Memory = ModuleMemory | ImportMemory;

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
  id: ResourceLocation;
}

type Global = ModuleGlobal | ImportGlobal;

interface FuncExport {
  name: string;
  value: number;
}

interface MemoryExport {
  name: string;
  value: number;
}

interface GlobalExport {
  name: string;
  value: number;
}

interface DataSegment {
  index: number;
  offset: any;
  init: Int8Array;
}

export interface Context {
  pack: DataPack;
  namespace: string;
  funcs: Func[];
  memories: Memory[];
  globals: Global[];
  funcExports: FuncExport[];
  memoryExports: MemoryExport[];
  globalExports: GlobalExport[];
  dataSegments: DataSegment[];
  start?: number;
  funcPool: string[][];
  initCommands: string[];
}

export interface Block {
  results: Type[];
  insns: any[];
}

export interface Label {
  index: number;
  arity: number;
}
