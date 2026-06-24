/** Immutable parser state — the cursor into the input string. */
export interface State {
  readonly input: string;
  readonly index: number;
}

/** Successful parse result. */
export interface Ok<T> {
  readonly ok: true;
  readonly value: T;
  readonly state: State;
}

/** Failed parse result. */
export interface Err {
  readonly ok: false;
  readonly expected: string;
  readonly index: number;
  readonly state: State;
}

export type Result<T> = Ok<T> | Err;

/** A parser is a function from State to Result. */
export type Parser<T> = (state: State) => Result<T>;

export function ok<T>(value: T, state: State): Ok<T> {
  return { ok: true, value, state };
}

export function err(expected: string, index: number, state: State): Err {
  return { ok: false, expected, index, state };
}

export function makeState(input: string, index = 0): State {
  return { input, index };
}

/** Detailed error with position info. */
export class ParseError extends Error {
  constructor(
    public readonly expected: string,
    public readonly index: number,
    public readonly input: string,
  ) {
    const col = index + 1;
    const excerpt = input.slice(Math.max(0, index - 10), index + 20);
    super(`Parse error at index ${index} (col ${col}): expected ${expected}\n  ...${excerpt}...`);
    this.name = "ParseError";
  }
}
