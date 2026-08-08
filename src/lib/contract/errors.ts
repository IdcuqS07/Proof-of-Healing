export class ContractAssertionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ContractAssertionError";
  }
}

export function assert(condition: boolean, message: string): void {
  if (!condition) throw new ContractAssertionError(message);
}
