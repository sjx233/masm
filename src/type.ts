export type Type = "i32";

export function checkType(type: string): Type {
  if (["i32", "s32", "u32"].includes(type)) return "i32";
  throw new TypeError(`type '${type}' is unsupported`);
}

export function checkSignature(signature: any): { params: Type[]; results: Type[]; } {
  return {
    params: signature.params.map((param: { valtype: string; }) => checkType(param.valtype)),
    results: signature.results.map(checkType)
  };
}
