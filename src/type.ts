export function checkType(type: string): void {
  if (!["i32"].includes(type)) throw new Error(`unsupported type '${type}'`);
}
