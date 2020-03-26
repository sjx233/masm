const supportedTypes = ["i32"] as const;
export type Type = typeof supportedTypes extends readonly (infer T)[] ? T : never;

export function checkType(type: string): Type {
  if (!supportedTypes.includes(type as Type)) throw new TypeError(`type '${type}' is unsupported`);
  return type as Type;
}

export function checkSignature(signature: any): { params: Type[]; results: Type[]; } {
  return {
    params: signature.params.map((param: { valtype: string; }) => checkType(param.valtype)),
    results: signature.results.map(checkType)
  };
}
