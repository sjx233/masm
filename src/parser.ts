export type ValType = "i32" | "i64" | "f32" | "f64";
export type ResultType = ValType[];

export interface FuncType {
  params: ResultType;
  results: ResultType;
}

export interface Limits {
  min: number;
  max?: number;
}

export type MemType = Limits;

export interface TableType {
  limits: Limits;
  elemType: ElemType;
}

export type ElemType = "funcref";

export interface GlobalType {
  mut: Mut;
  valType: ValType;
}

export type Mut = "const" | "var";
export type BlockType = TypeIdx | ValType | null;

export interface MemArg {
  offset: number;
  align: number;
}

export type Instr =
  | { type: "unreachable"; }
  | { type: "nop"; }
  | { type: "block"; blockType: BlockType; body: Expr; }
  | { type: "loop"; blockType: BlockType; body: Expr; }
  | { type: "if"; blockType: BlockType; consequent: Expr; alternative: Expr; }
  | { type: "br"; label: LabelIdx; }
  | { type: "br_if"; label: LabelIdx; }
  | { type: "br_table"; labels: LabelIdx[]; default: LabelIdx; }
  | { type: "return"; }
  | { type: "call"; func: FuncIdx; }
  | { type: "call_indirect"; funcType: TypeIdx; table: TableIdx; }
  | { type: "drop"; }
  | { type: "select"; }
  | { type: "local.get"; local: LocalIdx; }
  | { type: "local.set"; local: LocalIdx; }
  | { type: "local.tee"; local: LocalIdx; }
  | { type: "global.get"; global: GlobalIdx; }
  | { type: "global.set"; global: GlobalIdx; }
  | { type: "i32.load"; mem: MemArg; }
  | { type: "i64.load"; mem: MemArg; }
  | { type: "f32.load"; mem: MemArg; }
  | { type: "f64.load"; mem: MemArg; }
  | { type: "i32.load8_s"; mem: MemArg; }
  | { type: "i32.load8_u"; mem: MemArg; }
  | { type: "i32.load16_s"; mem: MemArg; }
  | { type: "i32.load16_u"; mem: MemArg; }
  | { type: "i64.load8_s"; mem: MemArg; }
  | { type: "i64.load8_u"; mem: MemArg; }
  | { type: "i64.load16_s"; mem: MemArg; }
  | { type: "i64.load16_u"; mem: MemArg; }
  | { type: "i64.load32_s"; mem: MemArg; }
  | { type: "i64.load32_u"; mem: MemArg; }
  | { type: "i32.store"; mem: MemArg; }
  | { type: "i64.store"; mem: MemArg; }
  | { type: "f32.store"; mem: MemArg; }
  | { type: "f64.store"; mem: MemArg; }
  | { type: "i32.store8"; mem: MemArg; }
  | { type: "i32.store16"; mem: MemArg; }
  | { type: "i64.store8"; mem: MemArg; }
  | { type: "i64.store16"; mem: MemArg; }
  | { type: "i64.store32"; mem: MemArg; }
  | { type: "mem.size"; mem: MemIdx; }
  | { type: "mem.grow"; mem: MemIdx; }
  | { type: "i32.const"; value: number; }
  | { type: "i64.const"; value: bigint; }
  | { type: "f32.const"; value: number; }
  | { type: "f64.const"; value: number; }
  | { type: "i32.eqz"; }
  | { type: "i32.eq"; }
  | { type: "i32.ne"; }
  | { type: "i32.lt_s"; }
  | { type: "i32.lt_u"; }
  | { type: "i32.gt_s"; }
  | { type: "i32.gt_u"; }
  | { type: "i32.le_s"; }
  | { type: "i32.le_u"; }
  | { type: "i32.ge_s"; }
  | { type: "i32.ge_u"; }
  | { type: "i64.eqz"; }
  | { type: "i64.eq"; }
  | { type: "i64.ne"; }
  | { type: "i64.lt_s"; }
  | { type: "i64.lt_u"; }
  | { type: "i64.gt_s"; }
  | { type: "i64.gt_u"; }
  | { type: "i64.le_s"; }
  | { type: "i64.le_u"; }
  | { type: "i64.ge_s"; }
  | { type: "i64.ge_u"; }
  | { type: "f32.eq"; }
  | { type: "f32.ne"; }
  | { type: "f32.lt"; }
  | { type: "f32.gt"; }
  | { type: "f32.le"; }
  | { type: "f32.ge"; }
  | { type: "f64.eq"; }
  | { type: "f64.ne"; }
  | { type: "f64.lt"; }
  | { type: "f64.gt"; }
  | { type: "f64.le"; }
  | { type: "f64.ge"; }
  | { type: "i32.clz"; }
  | { type: "i32.ctz"; }
  | { type: "i32.popcnt"; }
  | { type: "i32.add"; }
  | { type: "i32.sub"; }
  | { type: "i32.mul"; }
  | { type: "i32.div_s"; }
  | { type: "i32.div_u"; }
  | { type: "i32.rem_s"; }
  | { type: "i32.rem_u"; }
  | { type: "i32.and"; }
  | { type: "i32.or"; }
  | { type: "i32.xor"; }
  | { type: "i32.shl"; }
  | { type: "i32.shr_s"; }
  | { type: "i32.shr_u"; }
  | { type: "i32.rotl"; }
  | { type: "i32.rotr"; }
  | { type: "i64.clz"; }
  | { type: "i64.ctz"; }
  | { type: "i64.popcnt"; }
  | { type: "i64.add"; }
  | { type: "i64.sub"; }
  | { type: "i64.mul"; }
  | { type: "i64.div_s"; }
  | { type: "i64.div_u"; }
  | { type: "i64.rem_s"; }
  | { type: "i64.rem_u"; }
  | { type: "i64.and"; }
  | { type: "i64.or"; }
  | { type: "i64.xor"; }
  | { type: "i64.shl"; }
  | { type: "i64.shr_s"; }
  | { type: "i64.shr_u"; }
  | { type: "i64.rotl"; }
  | { type: "i64.rotr"; }
  | { type: "f32.abs"; }
  | { type: "f32.neg"; }
  | { type: "f32.ceil"; }
  | { type: "f32.floor"; }
  | { type: "f32.trunc"; }
  | { type: "f32.nearest"; }
  | { type: "f32.sqrt"; }
  | { type: "f32.add"; }
  | { type: "f32.sub"; }
  | { type: "f32.mul"; }
  | { type: "f32.div"; }
  | { type: "f32.min"; }
  | { type: "f32.max"; }
  | { type: "f32.copysign"; }
  | { type: "f64.abs"; }
  | { type: "f64.neg"; }
  | { type: "f64.ceil"; }
  | { type: "f64.floor"; }
  | { type: "f64.trunc"; }
  | { type: "f64.nearest"; }
  | { type: "f64.sqrt"; }
  | { type: "f64.add"; }
  | { type: "f64.sub"; }
  | { type: "f64.mul"; }
  | { type: "f64.div"; }
  | { type: "f64.min"; }
  | { type: "f64.max"; }
  | { type: "f64.copysign"; }
  | { type: "i32.wrap_i64"; }
  | { type: "i32.trunc_f32_s"; }
  | { type: "i32.trunc_f32_u"; }
  | { type: "i32.trunc_f64_s"; }
  | { type: "i32.trunc_f64_u"; }
  | { type: "i64.extend_i32_s"; }
  | { type: "i64.extend_i32_u"; }
  | { type: "i64.trunc_f32_s"; }
  | { type: "i64.trunc_f32_u"; }
  | { type: "i64.trunc_f64_s"; }
  | { type: "i64.trunc_f64_u"; }
  | { type: "f32.convert_i32_s"; }
  | { type: "f32.convert_i32_u"; }
  | { type: "f32.convert_i64_s"; }
  | { type: "f32.convert_i64_u"; }
  | { type: "f32.demote_f64"; }
  | { type: "f64.convert_i32_s"; }
  | { type: "f64.convert_i32_u"; }
  | { type: "f64.convert_i64_s"; }
  | { type: "f64.convert_i64_u"; }
  | { type: "f64.promote_f32"; }
  | { type: "i32.reinterpret_f32"; }
  | { type: "i64.reinterpret_f64"; }
  | { type: "f32.reinterpret_i32"; }
  | { type: "f64.reinterpret_i64"; }
  | { type: "i32.extend8_s"; }
  | { type: "i32.extend16_s"; }
  | { type: "i64.extend8_s"; }
  | { type: "i64.extend16_s"; }
  | { type: "i64.extend32_s"; }
  | { type: "i32.trunc_sat_f32_s"; }
  | { type: "i32.trunc_sat_f32_u"; }
  | { type: "i32.trunc_sat_f64_s"; }
  | { type: "i32.trunc_sat_f64_u"; }
  | { type: "i64.trunc_sat_f32_s"; }
  | { type: "i64.trunc_sat_f32_u"; }
  | { type: "i64.trunc_sat_f64_s"; }
  | { type: "i64.trunc_sat_f64_u"; };
export type Expr = Instr[];

export interface Module {
  types: FuncType[];
  funcs: Func[];
  tables: Table[];
  mems: Mem[];
  globals: Global[];
  elem: Elem[];
  data: Data[];
  start: Start | null;
  imports: Import[];
  exports: Export[];
}

export type TypeIdx = number;
export type FuncIdx = number;
export type TableIdx = number;
export type MemIdx = number;
export type GlobalIdx = number;
export type LocalIdx = number;
export type LabelIdx = number;

export interface Func {
  type: TypeIdx;
  locals: ValType[];
  body: Expr;
}

export interface Table {
  type: TableType;
}

export interface Mem {
  type: MemType;
}

export interface Global {
  type: GlobalType;
  init: Expr;
}

export interface Elem {
  table: TableIdx;
  offset: Expr;
  init: FuncIdx[];
}

export interface Data {
  data: MemIdx;
  offset: Expr;
  init: Uint8Array;
}

export interface Start {
  func: FuncIdx;
}

export interface Export {
  name: string;
  desc: ExportDesc;
}

export type ExportDesc =
  | { type: "func"; func: FuncIdx; }
  | { type: "table"; table: TableIdx; }
  | { type: "mem"; mem: MemIdx; }
  | { type: "global"; global: GlobalIdx; };

export interface Import {
  module: string;
  name: string;
  desc: ImportDesc;
}

export type ImportDesc =
  | { type: "func"; funcType: TypeIdx; }
  | { type: "table"; tableType: TableType; }
  | { type: "mem"; memType: MemType; }
  | { type: "global"; globalType: GlobalType; };

export class ParseError extends SyntaxError {
  public constructor(public readonly offset: number, ...params: ConstructorParameters<typeof SyntaxError>) {
    super(...params);
    if (Error.captureStackTrace) Error.captureStackTrace(this, ParseError);
  }
}

ParseError.prototype.name = ParseError.name;

export function parse(wasm: ArrayBuffer): Module {
  const buf = Buffer.from(wasm);
  let offset = 0;

  function also<T>(r: T, b: () => void): T {
    b();
    return r;
  }

  function iterate<T>(b: () => T | null): T[] {
    const result: T[] = [];
    for (let i; (i = b()) !== null;)
      result.push(i);
    return result;
  }

  function sized<T>(b: () => T): (size: number) => T {
    return size => {
      const end = offset + size;
      const result = b();
      if (offset !== end) throw new ParseError(offset, "size mismatch");
      return result;
    };
  }

  function vec<T>(b: () => T): T[] {
    return Array.from({ length: u32() }, b);
  }

  function bytevec(): Uint8Array {
    const n = u32();
    const result = Uint8Array.prototype.slice.call(buf, offset, offset + n);
    offset += n;
    return result;
  }

  function byte(): number {
    return buf.readUInt8(offset++);
  }

  function leb128(size: number): bigint {
    if (size <= 0) throw new ParseError(offset, "integer representation too long");
    const n = byte();
    return (n & 0x80) === 0
      ? BigInt(n)
      : BigInt(n & 0x7f) + (leb128(size - 1) << 7n);
  }

  function uN(n: number): bigint {
    const result = leb128(Math.ceil(n / 7));
    if (result >= 1n << BigInt(n)) throw new ParseError(offset - 1, "integer too large");
    return result;
  }

  function sN(n: number): bigint {
    const size = Math.ceil(n / 7);
    const result = BigInt.asIntN(size * 7, leb128(size));
    const limit = 1n << BigInt(n - 1);
    if (result >= limit || result < -limit) throw new ParseError(offset - 1, "integer too large");
    return result;
  }

  function u32(): number {
    return Number(uN(32));
  }

  function s7(): number {
    return Number(sN(7));
  }

  function s32(): number {
    return Number(sN(32));
  }

  function s33(): number {
    return Number(sN(33));
  }

  function s64(): bigint {
    return sN(64);
  }

  function f32(): number {
    const result = buf.readFloatLE(offset);
    offset += 4;
    return result;
  }

  function f64(): number {
    const result = buf.readDoubleLE(offset);
    offset += 8;
    return result;
  }

  function name(): string {
    const n = u32();
    const result = buf.toString("utf8", offset, offset + n);
    offset += n;
    return result;
  }

  function valtype(): ValType {
    switch (s7()) {
      case -1:
        return "i32";
      case -2:
        return "i64";
      case -3:
        return "f32";
      case -4:
        return "f64";
      default:
        throw new ParseError(offset - 1, "malformed value type");
    }
  }

  function resulttype(): ResultType {
    return vec(valtype);
  }

  function functype(): FuncType {
    switch (s7()) {
      case -0x20:
        return { params: resulttype(), results: resulttype() };
      default:
        throw new ParseError(offset - 1, "malformed function type");
    }
  }

  function limits(): Limits {
    switch (byte()) {
      case 0:
        return { min: u32() };
      case 1:
        return { min: u32(), max: u32() };
      default:
        throw new ParseError(offset - 1, "malformed limits");
    }
  }

  function memtype(): MemType {
    return limits();
  }

  function tabletype(): TableType {
    return {
      elemType: elemtype(),
      limits: limits()
    };
  }

  function elemtype(): ElemType {
    switch (s7()) {
      case -0x10:
        return "funcref";
      default:
        throw new ParseError(offset - 1, "malformed element type");
    }
  }

  function globaltype(): GlobalType {
    const type = valtype();
    switch (byte()) {
      case 0:
        return { mut: "const", valType: type };
      case 1:
        return { mut: "var", valType: type };
      default:
        throw new ParseError(offset - 1, "malformed global type");
    }
  }

  function blocktype(): BlockType {
    const b = byte();
    if (b === 0x40) return null;
    const start = --offset;
    if ((b & 0xc0) === 0x40) return valtype();
    const t = s33();
    if (t < 0) throw new ParseError(start, "nonnegative type index expected");
    return t;
  }

  function memarg(): MemArg {
    return { align: u32(), offset: u32() };
  }

  function instr(): Instr | null {
    switch (buf[offset++]) {
      case 0x00:
        return { type: "unreachable" };
      case 0x01:
        return { type: "nop" };
      case 0x02:
        return also({ type: "block", blockType: blocktype(), body: iterate(instr) }, end);
      case 0x03:
        return also({ type: "loop", blockType: blocktype(), body: iterate(instr) }, end);
      case 0x04: {
        const blockType = blocktype();
        const consequent = iterate(instr);
        switch (byte()) {
          case 0x05:
            return { type: "if", blockType, consequent, alternative: iterate(instr) };
          case 0x0b:
            return { type: "if", blockType, consequent, alternative: [] };
          default:
            throw new ParseError(offset - 1, "else or end opcode expected");
        }
      }
      case 0x0c:
        return { type: "br", label: labelidx() };
      case 0x0d:
        return { type: "br_if", label: labelidx() };
      case 0x0e:
        return { type: "br_table", labels: vec(labelidx), default: labelidx() };
      case 0x0f:
        return { type: "return" };
      case 0x10:
        return { type: "call", func: funcidx() };
      case 0x11:
        return { type: "call_indirect", funcType: typeidx(), table: tableidx() };
      case 0x1a:
        return { type: "drop" };
      case 0x1b:
        return { type: "select" };
      case 0x20:
        return { type: "local.get", local: localidx() };
      case 0x21:
        return { type: "local.set", local: localidx() };
      case 0x22:
        return { type: "local.tee", local: localidx() };
      case 0x23:
        return { type: "global.get", global: globalidx() };
      case 0x24:
        return { type: "global.set", global: globalidx() };
      case 0x28:
        return { type: "i32.load", mem: memarg() };
      case 0x29:
        return { type: "i64.load", mem: memarg() };
      case 0x2a:
        return { type: "f32.load", mem: memarg() };
      case 0x2b:
        return { type: "f64.load", mem: memarg() };
      case 0x2c:
        return { type: "i32.load8_s", mem: memarg() };
      case 0x2d:
        return { type: "i32.load8_u", mem: memarg() };
      case 0x2e:
        return { type: "i32.load16_s", mem: memarg() };
      case 0x2f:
        return { type: "i32.load16_u", mem: memarg() };
      case 0x30:
        return { type: "i64.load8_s", mem: memarg() };
      case 0x31:
        return { type: "i64.load8_u", mem: memarg() };
      case 0x32:
        return { type: "i64.load16_s", mem: memarg() };
      case 0x33:
        return { type: "i64.load16_u", mem: memarg() };
      case 0x34:
        return { type: "i64.load32_s", mem: memarg() };
      case 0x35:
        return { type: "i64.load32_u", mem: memarg() };
      case 0x36:
        return { type: "i32.store", mem: memarg() };
      case 0x37:
        return { type: "i64.store", mem: memarg() };
      case 0x38:
        return { type: "f32.store", mem: memarg() };
      case 0x39:
        return { type: "f64.store", mem: memarg() };
      case 0x3a:
        return { type: "i32.store8", mem: memarg() };
      case 0x3b:
        return { type: "i32.store16", mem: memarg() };
      case 0x3c:
        return { type: "i64.store8", mem: memarg() };
      case 0x3d:
        return { type: "i64.store16", mem: memarg() };
      case 0x3e:
        return { type: "i64.store32", mem: memarg() };
      case 0x3f:
        return { type: "mem.size", mem: memidx() };
      case 0x40:
        return { type: "mem.grow", mem: memidx() };
      case 0x41:
        return { type: "i32.const", value: s32() };
      case 0x42:
        return { type: "i64.const", value: s64() };
      case 0x43:
        return { type: "f32.const", value: f32() };
      case 0x44:
        return { type: "f64.const", value: f64() };
      case 0x45:
        return { type: "i32.eqz" };
      case 0x46:
        return { type: "i32.eq" };
      case 0x47:
        return { type: "i32.ne" };
      case 0x48:
        return { type: "i32.lt_s" };
      case 0x49:
        return { type: "i32.lt_u" };
      case 0x4a:
        return { type: "i32.gt_s" };
      case 0x4b:
        return { type: "i32.gt_u" };
      case 0x4c:
        return { type: "i32.le_s" };
      case 0x4d:
        return { type: "i32.le_u" };
      case 0x4e:
        return { type: "i32.ge_s" };
      case 0x4f:
        return { type: "i32.ge_u" };
      case 0x50:
        return { type: "i64.eqz" };
      case 0x51:
        return { type: "i64.eq" };
      case 0x52:
        return { type: "i64.ne" };
      case 0x53:
        return { type: "i64.lt_s" };
      case 0x54:
        return { type: "i64.lt_u" };
      case 0x55:
        return { type: "i64.gt_s" };
      case 0x56:
        return { type: "i64.gt_u" };
      case 0x57:
        return { type: "i64.le_s" };
      case 0x58:
        return { type: "i64.le_u" };
      case 0x59:
        return { type: "i64.ge_s" };
      case 0x5a:
        return { type: "i64.ge_u" };
      case 0x5b:
        return { type: "f32.eq" };
      case 0x5c:
        return { type: "f32.ne" };
      case 0x5d:
        return { type: "f32.lt" };
      case 0x5e:
        return { type: "f32.gt" };
      case 0x5f:
        return { type: "f32.le" };
      case 0x60:
        return { type: "f32.ge" };
      case 0x61:
        return { type: "f64.eq" };
      case 0x62:
        return { type: "f64.ne" };
      case 0x63:
        return { type: "f64.lt" };
      case 0x64:
        return { type: "f64.gt" };
      case 0x65:
        return { type: "f64.le" };
      case 0x66:
        return { type: "f64.ge" };
      case 0x67:
        return { type: "i32.clz" };
      case 0x68:
        return { type: "i32.ctz" };
      case 0x69:
        return { type: "i32.popcnt" };
      case 0x6a:
        return { type: "i32.add" };
      case 0x6b:
        return { type: "i32.sub" };
      case 0x6c:
        return { type: "i32.mul" };
      case 0x6d:
        return { type: "i32.div_s" };
      case 0x6e:
        return { type: "i32.div_u" };
      case 0x6f:
        return { type: "i32.rem_s" };
      case 0x70:
        return { type: "i32.rem_u" };
      case 0x71:
        return { type: "i32.and" };
      case 0x72:
        return { type: "i32.or" };
      case 0x73:
        return { type: "i32.xor" };
      case 0x74:
        return { type: "i32.shl" };
      case 0x75:
        return { type: "i32.shr_s" };
      case 0x76:
        return { type: "i32.shr_u" };
      case 0x77:
        return { type: "i32.rotl" };
      case 0x78:
        return { type: "i32.rotr" };
      case 0x79:
        return { type: "i64.clz" };
      case 0x7a:
        return { type: "i64.ctz" };
      case 0x7b:
        return { type: "i64.popcnt" };
      case 0x7c:
        return { type: "i64.add" };
      case 0x7d:
        return { type: "i64.sub" };
      case 0x7e:
        return { type: "i64.mul" };
      case 0x7f:
        return { type: "i64.div_s" };
      case 0x80:
        return { type: "i64.div_u" };
      case 0x81:
        return { type: "i64.rem_s" };
      case 0x82:
        return { type: "i64.rem_u" };
      case 0x83:
        return { type: "i64.and" };
      case 0x84:
        return { type: "i64.or" };
      case 0x85:
        return { type: "i64.xor" };
      case 0x86:
        return { type: "i64.shl" };
      case 0x87:
        return { type: "i64.shr_s" };
      case 0x88:
        return { type: "i64.shr_u" };
      case 0x89:
        return { type: "i64.rotl" };
      case 0x8a:
        return { type: "i64.rotr" };
      case 0x8b:
        return { type: "f32.abs" };
      case 0x8c:
        return { type: "f32.neg" };
      case 0x8d:
        return { type: "f32.ceil" };
      case 0x8e:
        return { type: "f32.floor" };
      case 0x8f:
        return { type: "f32.trunc" };
      case 0x90:
        return { type: "f32.nearest" };
      case 0x91:
        return { type: "f32.sqrt" };
      case 0x92:
        return { type: "f32.add" };
      case 0x93:
        return { type: "f32.sub" };
      case 0x94:
        return { type: "f32.mul" };
      case 0x95:
        return { type: "f32.div" };
      case 0x96:
        return { type: "f32.min" };
      case 0x97:
        return { type: "f32.max" };
      case 0x98:
        return { type: "f32.copysign" };
      case 0x99:
        return { type: "f64.abs" };
      case 0x9a:
        return { type: "f64.neg" };
      case 0x9b:
        return { type: "f64.ceil" };
      case 0x9c:
        return { type: "f64.floor" };
      case 0x9d:
        return { type: "f64.trunc" };
      case 0x9e:
        return { type: "f64.nearest" };
      case 0x9f:
        return { type: "f64.sqrt" };
      case 0xa0:
        return { type: "f64.add" };
      case 0xa1:
        return { type: "f64.sub" };
      case 0xa2:
        return { type: "f64.mul" };
      case 0xa3:
        return { type: "f64.div" };
      case 0xa4:
        return { type: "f64.min" };
      case 0xa5:
        return { type: "f64.max" };
      case 0xa6:
        return { type: "f64.copysign" };
      case 0xa7:
        return { type: "i32.wrap_i64" };
      case 0xa8:
        return { type: "i32.trunc_f32_s" };
      case 0xa9:
        return { type: "i32.trunc_f32_u" };
      case 0xaa:
        return { type: "i32.trunc_f64_s" };
      case 0xab:
        return { type: "i32.trunc_f64_u" };
      case 0xac:
        return { type: "i64.extend_i32_s" };
      case 0xad:
        return { type: "i64.extend_i32_u" };
      case 0xae:
        return { type: "i64.trunc_f32_s" };
      case 0xaf:
        return { type: "i64.trunc_f32_u" };
      case 0xb0:
        return { type: "i64.trunc_f64_s" };
      case 0xb1:
        return { type: "i64.trunc_f64_u" };
      case 0xb2:
        return { type: "f32.convert_i32_s" };
      case 0xb3:
        return { type: "f32.convert_i32_u" };
      case 0xb4:
        return { type: "f32.convert_i64_s" };
      case 0xb5:
        return { type: "f32.convert_i64_u" };
      case 0xb6:
        return { type: "f32.demote_f64" };
      case 0xb7:
        return { type: "f64.convert_i32_s" };
      case 0xb8:
        return { type: "f64.convert_i32_u" };
      case 0xb9:
        return { type: "f64.convert_i64_s" };
      case 0xba:
        return { type: "f64.convert_i64_u" };
      case 0xbb:
        return { type: "f64.promote_f32" };
      case 0xbc:
        return { type: "i32.reinterpret_f32" };
      case 0xbd:
        return { type: "i64.reinterpret_f64" };
      case 0xbe:
        return { type: "f32.reinterpret_i32" };
      case 0xbf:
        return { type: "f64.reinterpret_i64" };
      case 0xc0:
        return { type: "i32.extend8_s" };
      case 0xc1:
        return { type: "i32.extend16_s" };
      case 0xc2:
        return { type: "i64.extend8_s" };
      case 0xc3:
        return { type: "i64.extend16_s" };
      case 0xc4:
        return { type: "i64.extend32_s" };
      case 0xfc:
        switch (buf[offset++]) {
          case 0x00:
            return { type: "i32.trunc_sat_f32_s" };
          case 0x01:
            return { type: "i32.trunc_sat_f32_s" };
          case 0x02:
            return { type: "i32.trunc_sat_f32_s" };
          case 0x03:
            return { type: "i32.trunc_sat_f32_s" };
          case 0x04:
            return { type: "i32.trunc_sat_f32_s" };
          case 0x05:
            return { type: "i32.trunc_sat_f32_s" };
          case 0x06:
            return { type: "i32.trunc_sat_f32_s" };
          case 0x07:
            return { type: "i32.trunc_sat_f32_s" };
          default:
            offset--;
            break;
        }
        // fallthrough
      default:
        offset--;
        return null;
    }
  }

  function end(): void {
    if (byte() !== 0x0b) throw new ParseError(offset - 1, "end opcode expected");
  }

  function expr(): Expr {
    return also(iterate(instr), end);
  }

  function typeidx(): TypeIdx {
    return u32();
  }

  function funcidx(): FuncIdx {
    return u32();
  }

  function tableidx(): TableIdx {
    return u32();
  }

  function memidx(): MemIdx {
    return u32();
  }

  function globalidx(): GlobalIdx {
    return u32();
  }

  function localidx(): LocalIdx {
    return u32();
  }

  function labelidx(): LabelIdx {
    return u32();
  }

  function section<T>(n: number, b: (size: number) => T): T | null {
    if (buf[offset] !== n) return null;
    offset++;
    return b(u32());
  }

  function customsec(): void | null {
    return section(0, custom);
  }

  function custom(size: number): void {
    const end = offset + size;
    name();
    if (offset > end) throw new ParseError(offset, "name of custom section too long");
    offset = end;
  }

  function typesec(): FuncType[] {
    return section(1, sized(() => vec(functype))) || [];
  }

  function importsec(): Import[] {
    return section(2, sized(() => vec(import_))) || [];
  }

  function import_(): Import {
    return {
      module: name(),
      name: name(),
      desc: importdesc()
    };
  }

  function importdesc(): ImportDesc {
    switch (byte()) {
      case 0:
        return { type: "func", funcType: typeidx() };
      case 1:
        return { type: "table", tableType: tabletype() };
      case 2:
        return { type: "mem", memType: memtype() };
      case 3:
        return { type: "global", globalType: globaltype() };
      default:
        throw new ParseError(offset - 1, "malformed import descriptor");
    }
  }

  function funcsec(): TypeIdx[] {
    return section(3, sized(() => vec(typeidx))) || [];
  }

  function tablesec(): Table[] {
    return section(4, sized(() => vec(table))) || [];
  }

  function table(): Table {
    return { type: tabletype() };
  }

  function memsec(): Mem[] {
    return section(5, sized(() => vec(mem))) || [];
  }

  function mem(): Mem {
    return { type: memtype() };
  }

  function globalsec(): Global[] {
    return section(6, sized(() => vec(global))) || [];
  }

  function global(): Global {
    return { type: globaltype(), init: expr() };
  }

  function exportsec(): Export[] {
    return section(7, sized(() => vec(export_))) || [];
  }

  function export_(): Export {
    return {
      name: name(),
      desc: exportdesc()
    };
  }

  function exportdesc(): ExportDesc {
    switch (byte()) {
      case 0:
        return { type: "func", func: funcidx() };
      case 1:
        return { type: "table", table: tableidx() };
      case 2:
        return { type: "mem", mem: memidx() };
      case 3:
        return { type: "global", global: globalidx() };
      default:
        throw new ParseError(offset - 1, "malformed export descriptor");
    }
  }

  function startsec(): Start | null {
    return section(8, sized(start));
  }

  function start(): Start {
    return { func: funcidx() };
  }

  function elemsec(): Elem[] {
    return section(9, sized(() => vec(elem))) || [];
  }

  function elem(): Elem {
    return {
      table: tableidx(),
      offset: expr(),
      init: vec(funcidx)
    };
  }

  function codesec(): { locals: ValType[]; body: Expr; }[] {
    return section(10, sized(() => vec(code))) || [];
  }

  function code(): { locals: ValType[]; body: Expr; } {
    return sized(func)(u32());
  }

  function func(): { locals: ValType[]; body: Expr; } {
    return { locals: vec(locals).flat(), body: expr() };
  }

  function locals(): ValType[] {
    const n = u32();
    const t = valtype();
    return Array.from({ length: n }, () => t);
  }

  function datasec(): Data[] {
    return section(11, sized(() => vec(data))) || [];
  }

  function data(): Data {
    return {
      data: memidx(),
      offset: expr(),
      init: bytevec()
    };
  }

  function magic(): void {
    if (buf.readUInt32BE(offset) !== 0x61736d) throw new ParseError(offset, "malformed magic header");
    offset += 4;
  }

  function version(): void {
    if (buf.readUInt32LE(offset) !== 1) throw new ParseError(offset, `unsupported version ${buf.readUInt32LE(offset)}`);
    offset += 4;
  }

  function module(): Module {
    magic();
    version();
    iterate(customsec);
    const functype = typesec();
    iterate(customsec);
    const import_ = importsec();
    iterate(customsec);
    const typeidx = funcsec();
    iterate(customsec);
    const table = tablesec();
    iterate(customsec);
    const mem = memsec();
    iterate(customsec);
    const global = globalsec();
    iterate(customsec);
    const export_ = exportsec();
    iterate(customsec);
    const start = startsec();
    iterate(customsec);
    const elem = elemsec();
    iterate(customsec);
    const code = codesec();
    iterate(customsec);
    const data = datasec();
    iterate(customsec);
    if (offset !== buf.length) throw new ParseError(offset, "junk after last section");
    if (typeidx.length !== code.length) throw new ParseError(offset, "function and code sections have inconsistent lengths");
    return {
      types: functype,
      funcs: code.map(({ locals, body }, i) => ({ type: typeidx[i], locals, body })),
      tables: table,
      mems: mem,
      globals: global,
      elem,
      data,
      start,
      imports: import_,
      exports: export_
    };
  }

  return module();
}
