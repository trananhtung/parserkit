import { makeState, ParseError, type Parser } from "./types.js";

export interface RunSuccess<T> {
  ok: true;
  value: T;
}

export interface RunFailure {
  ok: false;
  error: ParseError;
}

export type RunResult<T> = RunSuccess<T> | RunFailure;

/**
 * Run a parser against a string.
 * Returns `{ ok: true, value }` or `{ ok: false, error }`.
 * The parser must consume the entire input (eof is implicit).
 */
export function run<T>(parser: Parser<T>, input: string): RunResult<T> {
  const r = parser(makeState(input));
  if (!r.ok) return { ok: false, error: new ParseError(r.expected, r.index, input) };
  if (r.state.index < input.length) {
    return {
      ok: false,
      error: new ParseError(`end of input`, r.state.index, input),
    };
  }
  return { ok: true, value: r.value };
}

/**
 * Run a parser without requiring full consumption.
 * Returns the parsed value and the remaining input index.
 */
export function runPartial<T>(parser: Parser<T>, input: string): RunResult<T & { _index: number }> {
  const r = parser(makeState(input));
  if (!r.ok) return { ok: false, error: new ParseError(r.expected, r.index, input) };
  return { ok: true, value: { ...(r.value as object), _index: r.state.index } as T & { _index: number } };
}

/**
 * Run a parser; throws `ParseError` on failure.
 */
export function tryRun<T>(parser: Parser<T>, input: string): T {
  const result = run(parser, input);
  if (!result.ok) throw result.error;
  return result.value;
}
