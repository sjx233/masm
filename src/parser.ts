import autobind from "class-autobind";

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

class Parser {
  private readonly buf: Buffer;
  private offset = 0;

  constructor(buf: ArrayBuffer) {
    this.buf = Buffer.from(buf);
    autobind(this);
  }

  public also<T>(r: T, b: () => void): T {
    b();
    return r;
  }

  public iterate<T>(b: () => T | null): T[] {
    const result: T[] = [];
    for (let i; (i = b()) !== null;)
      result.push(i);
    return result;
  }

  public sized<T>(b: () => T): (size: number) => T {
    return size => {
      const end = this.offset + size;
      const result = b();
      if (this.offset !== end) throw new ParseError(this.offset, "size mismatch");
      return result;
    };
  }

  public vec<T>(b: () => T): T[] {
    return Array.from({ length: this.u32() }, b);
  }

  public bytevec(): Uint8Array {
    const n = this.u32();
    const result = Uint8Array.prototype.slice.call(this.buf, this.offset, this.offset + n);
    this.offset += n;
    return result;
  }

  public byte(): number {
    return this.buf.readUInt8(this.offset++);
  }

  public leb128(size: number): bigint {
    if (size <= 0) throw new ParseError(this.offset, "integer representation too long");
    const n = this.byte();
    return (n & 0x80) === 0
      ? BigInt(n)
      : BigInt(n & 0x7f) + (this.leb128(size - 1) << 7n);
  }

  public u(n: number): bigint {
    const result = this.leb128(Math.ceil(n / 7));
    if (result >= 1n << BigInt(n)) throw new ParseError(this.offset - 1, "integer too large");
    return result;
  }

  public s(n: number): bigint {
    const size = Math.ceil(n / 7);
    const result = BigInt.asIntN(size * 7, this.leb128(size));
    const limit = 1n << BigInt(n - 1);
    if (result >= limit || result < -limit) throw new ParseError(this.offset - 1, "integer too large");
    return result;
  }

  public u32(): number {
    return Number(this.u(32));
  }

  public s7(): number {
    return Number(this.s(7));
  }

  public s32(): number {
    return Number(this.s(32));
  }

  public s33(): number {
    return Number(this.s(33));
  }

  public s64(): bigint {
    return this.s(64);
  }

  public f32(): number {
    const result = this.buf.readFloatLE(this.offset);
    this.offset += 4;
    return result;
  }

  public f64(): number {
    const result = this.buf.readDoubleLE(this.offset);
    this.offset += 8;
    return result;
  }

  public name(): string {
    const n = this.u32();
    const result = this.buf.toString("utf8", this.offset, this.offset + n);
    this.offset += n;
    return result;
  }

  public valtype(): ValType {
    switch (this.s7()) {
      case -1:
        return "i32";
      case -2:
        return "i64";
      case -3:
        return "f32";
      case -4:
        return "f64";
      default:
        throw new ParseError(this.offset - 1, "malformed value type");
    }
  }

  public resulttype(): ResultType {
    return this.vec(this.valtype);
  }

  public functype(): FuncType {
    switch (this.s7()) {
      case -0x20:
        return { params: this.resulttype(), results: this.resulttype() };
      default:
        throw new ParseError(this.offset - 1, "malformed function type");
    }
  }

  public limits(): Limits {
    switch (this.byte()) {
      case 0:
        return { min: this.u32() };
      case 1:
        return { min: this.u32(), max: this.u32() };
      default:
        throw new ParseError(this.offset - 1, "malformed limits");
    }
  }

  public memtype(): MemType {
    return this.limits();
  }

  public tabletype(): TableType {
    return {
      elemType: this.elemtype(),
      limits: this.limits()
    };
  }

  public elemtype(): ElemType {
    switch (this.s7()) {
      case -0x10:
        return "funcref";
      default:
        throw new ParseError(this.offset - 1, "malformed element type");
    }
  }

  public globaltype(): GlobalType {
    const type = this.valtype();
    switch (this.byte()) {
      case 0:
        return { mut: "const", valType: type };
      case 1:
        return { mut: "var", valType: type };
      default:
        throw new ParseError(this.offset - 1, "malformed global type");
    }
  }

  public blocktype(): BlockType {
    const b = this.byte();
    if (b === 0x40) return null;
    const start = --this.offset;
    if ((b & 0xc0) === 0x40) return this.valtype();
    const t = this.s33();
    if (t < 0) throw new ParseError(start, "nonnegative type index expected");
    return t;
  }

  public memarg(): MemArg {
    return { align: this.u32(), offset: this.u32() };
  }

  public instr(): Instr | null {
    const start = this.offset;
    switch (this.byte()) {
      case 0x00:
        return { type: "unreachable" };
      case 0x01:
        return { type: "nop" };
      case 0x02:
        return this.also({ type: "block", blockType: this.blocktype(), body: this.iterate(this.instr) }, this.end);
      case 0x03:
        return this.also({ type: "loop", blockType: this.blocktype(), body: this.iterate(this.instr) }, this.end);
      case 0x04: {
        const blockType = this.blocktype();
        const consequent = this.iterate(this.instr);
        switch (this.byte()) {
          case 0x05:
            return { type: "if", blockType, consequent, alternative: this.iterate(this.instr) };
          case 0x0b:
            return { type: "if", blockType, consequent, alternative: [] };
          default:
            throw new ParseError(this.offset - 1, "else or end opcode expected");
        }
      }
      case 0x0c:
        return { type: "br", label: this.labelidx() };
      case 0x0d:
        return { type: "br_if", label: this.labelidx() };
      case 0x0e:
        return { type: "br_table", labels: this.vec(this.labelidx), default: this.labelidx() };
      case 0x0f:
        return { type: "return" };
      case 0x10:
        return { type: "call", func: this.funcidx() };
      case 0x11:
        return { type: "call_indirect", funcType: this.typeidx(), table: this.tableidx() };
      case 0x1a:
        return { type: "drop" };
      case 0x1b:
        return { type: "select" };
      case 0x20:
        return { type: "local.get", local: this.localidx() };
      case 0x21:
        return { type: "local.set", local: this.localidx() };
      case 0x22:
        return { type: "local.tee", local: this.localidx() };
      case 0x23:
        return { type: "global.get", global: this.globalidx() };
      case 0x24:
        return { type: "global.set", global: this.globalidx() };
      case 0x28:
        return { type: "i32.load", mem: this.memarg() };
      case 0x29:
        return { type: "i64.load", mem: this.memarg() };
      case 0x2a:
        return { type: "f32.load", mem: this.memarg() };
      case 0x2b:
        return { type: "f64.load", mem: this.memarg() };
      case 0x2c:
        return { type: "i32.load8_s", mem: this.memarg() };
      case 0x2d:
        return { type: "i32.load8_u", mem: this.memarg() };
      case 0x2e:
        return { type: "i32.load16_s", mem: this.memarg() };
      case 0x2f:
        return { type: "i32.load16_u", mem: this.memarg() };
      case 0x30:
        return { type: "i64.load8_s", mem: this.memarg() };
      case 0x31:
        return { type: "i64.load8_u", mem: this.memarg() };
      case 0x32:
        return { type: "i64.load16_s", mem: this.memarg() };
      case 0x33:
        return { type: "i64.load16_u", mem: this.memarg() };
      case 0x34:
        return { type: "i64.load32_s", mem: this.memarg() };
      case 0x35:
        return { type: "i64.load32_u", mem: this.memarg() };
      case 0x36:
        return { type: "i32.store", mem: this.memarg() };
      case 0x37:
        return { type: "i64.store", mem: this.memarg() };
      case 0x38:
        return { type: "f32.store", mem: this.memarg() };
      case 0x39:
        return { type: "f64.store", mem: this.memarg() };
      case 0x3a:
        return { type: "i32.store8", mem: this.memarg() };
      case 0x3b:
        return { type: "i32.store16", mem: this.memarg() };
      case 0x3c:
        return { type: "i64.store8", mem: this.memarg() };
      case 0x3d:
        return { type: "i64.store16", mem: this.memarg() };
      case 0x3e:
        return { type: "i64.store32", mem: this.memarg() };
      case 0x3f:
        return { type: "mem.size", mem: this.memidx() };
      case 0x40:
        return { type: "mem.grow", mem: this.memidx() };
      case 0x41:
        return { type: "i32.const", value: this.s32() };
      case 0x42:
        return { type: "i64.const", value: this.s64() };
      case 0x43:
        return { type: "f32.const", value: this.f32() };
      case 0x44:
        return { type: "f64.const", value: this.f64() };
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
        switch (this.u32()) {
          case 0x00:
            return { type: "i32.trunc_sat_f32_s" };
          case 0x01:
            return { type: "i32.trunc_sat_f32_u" };
          case 0x02:
            return { type: "i32.trunc_sat_f64_s" };
          case 0x03:
            return { type: "i32.trunc_sat_f64_u" };
          case 0x04:
            return { type: "i64.trunc_sat_f32_s" };
          case 0x05:
            return { type: "i64.trunc_sat_f32_u" };
          case 0x06:
            return { type: "i64.trunc_sat_f64_s" };
          case 0x07:
            return { type: "i64.trunc_sat_f64_u" };
          default:
            break;
        }
        // fallthrough
      default:
        this.offset = start;
        return null;
    }
  }

  public end(): void {
    if (this.byte() !== 0x0b) throw new ParseError(this.offset - 1, "end opcode expected");
  }

  public expr(): Expr {
    return this.also(this.iterate(this.instr), this.end);
  }

  public typeidx(): TypeIdx {
    return this.u32();
  }

  public funcidx(): FuncIdx {
    return this.u32();
  }

  public tableidx(): TableIdx {
    return this.u32();
  }

  public memidx(): MemIdx {
    return this.u32();
  }

  public globalidx(): GlobalIdx {
    return this.u32();
  }

  public localidx(): LocalIdx {
    return this.u32();
  }

  public labelidx(): LabelIdx {
    return this.u32();
  }

  public section<T>(n: number, b: (size: number) => T): T | null {
    if (this.buf[this.offset] !== n) return null;
    this.offset++;
    return b(this.u32());
  }

  public customsec(): void | null {
    return this.section(0, this.custom);
  }

  public custom(size: number): void {
    const end = this.offset + size;
    this.name();
    if (this.offset > end) throw new ParseError(this.offset, "name of custom section too long");
    this.offset = end;
  }

  public typesec(): FuncType[] {
    return this.section(1, this.sized(() => this.vec(this.functype))) || [];
  }

  public importsec(): Import[] {
    return this.section(2, this.sized(() => this.vec(this.import_))) || [];
  }

  public import_(): Import {
    return {
      module: this.name(),
      name: this.name(),
      desc: this.importdesc()
    };
  }

  public importdesc(): ImportDesc {
    switch (this.byte()) {
      case 0:
        return { type: "func", funcType: this.typeidx() };
      case 1:
        return { type: "table", tableType: this.tabletype() };
      case 2:
        return { type: "mem", memType: this.memtype() };
      case 3:
        return { type: "global", globalType: this.globaltype() };
      default:
        throw new ParseError(this.offset - 1, "malformed import descriptor");
    }
  }

  public funcsec(): TypeIdx[] {
    return this.section(3, this.sized(() => this.vec(this.typeidx))) || [];
  }

  public tablesec(): Table[] {
    return this.section(4, this.sized(() => this.vec(this.table))) || [];
  }

  public table(): Table {
    return { type: this.tabletype() };
  }

  public memsec(): Mem[] {
    return this.section(5, this.sized(() => this.vec(this.mem))) || [];
  }

  public mem(): Mem {
    return { type: this.memtype() };
  }

  public globalsec(): Global[] {
    return this.section(6, this.sized(() => this.vec(this.global))) || [];
  }

  public global(): Global {
    return { type: this.globaltype(), init: this.expr() };
  }

  public exportsec(): Export[] {
    return this.section(7, this.sized(() => this.vec(this.export_))) || [];
  }

  public export_(): Export {
    return {
      name: this.name(),
      desc: this.exportdesc()
    };
  }

  public exportdesc(): ExportDesc {
    switch (this.byte()) {
      case 0:
        return { type: "func", func: this.funcidx() };
      case 1:
        return { type: "table", table: this.tableidx() };
      case 2:
        return { type: "mem", mem: this.memidx() };
      case 3:
        return { type: "global", global: this.globalidx() };
      default:
        throw new ParseError(this.offset - 1, "malformed export descriptor");
    }
  }

  public startsec(): Start | null {
    return this.section(8, this.sized(this.start));
  }

  public start(): Start {
    return { func: this.funcidx() };
  }

  public elemsec(): Elem[] {
    return this.section(9, this.sized(() => this.vec(this.elem))) || [];
  }

  public elem(): Elem {
    return {
      table: this.tableidx(),
      offset: this.expr(),
      init: this.vec(this.funcidx)
    };
  }

  public codesec(): { locals: ValType[]; body: Expr; }[] {
    return this.section(10, this.sized(() => this.vec(this.code))) || [];
  }

  public code(): { locals: ValType[]; body: Expr; } {
    return this.sized(this.func)(this.u32());
  }

  public func(): { locals: ValType[]; body: Expr; } {
    return { locals: this.vec(this.locals).flat(), body: this.expr() };
  }

  public locals(): ValType[] {
    const n = this.u32();
    const t = this.valtype();
    return new Array<ValType>(n).fill(t);
  }

  public datasec(): Data[] {
    return this.section(11, this.sized(() => this.vec(this.data))) || [];
  }

  public data(): Data {
    return {
      data: this.memidx(),
      offset: this.expr(),
      init: this.bytevec()
    };
  }

  public magic(): void {
    if (this.buf.readUInt32BE(this.offset) !== 0x61736d) throw new ParseError(this.offset, "malformed magic header");
    this.offset += 4;
  }

  public version(): void {
    if (this.buf.readUInt32LE(this.offset) !== 1) throw new ParseError(this.offset, `unsupported version ${this.buf.readUInt32LE(this.offset)}`);
    this.offset += 4;
  }

  public module(): Module {
    this.magic();
    this.version();
    this.iterate(this.customsec);
    const functype = this.typesec();
    this.iterate(this.customsec);
    const import_ = this.importsec();
    this.iterate(this.customsec);
    const typeidx = this.funcsec();
    this.iterate(this.customsec);
    const table = this.tablesec();
    this.iterate(this.customsec);
    const mem = this.memsec();
    this.iterate(this.customsec);
    const global = this.globalsec();
    this.iterate(this.customsec);
    const export_ = this.exportsec();
    this.iterate(this.customsec);
    const start = this.startsec();
    this.iterate(this.customsec);
    const elem = this.elemsec();
    this.iterate(this.customsec);
    const code = this.codesec();
    this.iterate(this.customsec);
    const data = this.datasec();
    this.iterate(this.customsec);
    if (this.offset !== this.buf.length) throw new ParseError(this.offset, "junk after last section");
    if (typeidx.length !== code.length) throw new ParseError(this.offset, "function and code sections have inconsistent lengths");
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
}

export function parse(wasm: ArrayBuffer): Module {
  return new Parser(wasm).module();
}
