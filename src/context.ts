import { DataPack } from "minecraft-packs";
import { Data, Expr, FuncIdx, FuncType, GlobalIdx, GlobalType, LabelIdx, MemIdx, MemType, Start, TypeIdx, ValType } from "./parser";
import ResourceLocation = require("resource-location");

interface ModuleFunc {
  type: "module";
  funcType: TypeIdx;
  locals: ValType[];
  body: Expr;
}

interface ImportFunc {
  type: "import";
  funcType: TypeIdx;
  id: ResourceLocation;
}

type Func = ModuleFunc | ImportFunc;

interface ModuleMem {
  type: "module";
  memType: MemType;
}

interface ImportMem {
  type: "import";
  id: ResourceLocation;
}

type Mem = ModuleMem | ImportMem;

interface ModuleGlobal {
  type: "module";
  globalType: GlobalType;
  init: Expr;
}

interface ImportGlobal {
  type: "import";
  globalType: GlobalType;
  id: ResourceLocation;
}

type Global = ModuleGlobal | ImportGlobal;

export interface FuncExport {
  name: string;
  func: FuncIdx;
}

export interface MemExport {
  name: string;
  mem: MemIdx;
}

export interface GlobalExport {
  name: string;
  global: GlobalIdx;
}

export interface Context {
  pack: DataPack;
  namespace: string;
  types: FuncType[];
  funcs: Func[];
  mems: Mem[];
  globals: Global[];
  funcExports: FuncExport[];
  memExports: MemExport[];
  globalExports: GlobalExport[];
  data: Data[];
  start: Start | null;
  funcPool: string[][];
  initCommands: string[];
}

export interface Label {
  index: LabelIdx;
  arity: number;
}
