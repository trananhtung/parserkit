import { ok, err, type Parser, type State, type Result } from "./types.js";

// ---- sequence -------------------------------------------------------

type UnwrapParser<T> = T extends Parser<infer U> ? U : never;
type UnwrapParsers<T extends Parser<unknown>[]> = { [K in keyof T]: UnwrapParser<T[K]> };

/** Run all parsers in order; return a tuple of their values. */
export function sequence<T extends Parser<unknown>[]>(...parsers: T): Parser<UnwrapParsers<T>> {
  return (state: State): Result<UnwrapParsers<T>> => {
    const values: unknown[] = [];
    let current = state;
    for (const p of parsers) {
      const r = p(current);
      if (!r.ok) return r as Result<UnwrapParsers<T>>;
      values.push(r.value);
      current = r.state;
    }
    return ok(values as UnwrapParsers<T>, current);
  };
}

// ---- choice ---------------------------------------------------------

/** Try each parser in order; return first success. */
export function choice<T>(...parsers: Parser<T>[]): Parser<T> {
  return (state) => {
    let furthest: Result<T> | null = null;
    for (const p of parsers) {
      const r = p(state);
      if (r.ok) return r;
      if (furthest === null || r.index > furthest.index) furthest = r;
    }
    return furthest ?? err("no alternatives", state.index, state);
  };
}

// ---- many / many1 ---------------------------------------------------

/** Match zero or more times. Never fails. */
export function many<T>(parser: Parser<T>): Parser<T[]> {
  return (state) => {
    const values: T[] = [];
    let current = state;
    for (;;) {
      const r = parser(current);
      if (!r.ok) return ok(values, current);
      if (r.state.index === current.index) {
        // Guard against infinite loop (zero-width match)
        return ok(values, current);
      }
      values.push(r.value);
      current = r.state;
    }
  };
}

/** Match one or more times. */
export function many1<T>(parser: Parser<T>): Parser<T[]> {
  return (state) => {
    const first = parser(state);
    if (!first.ok) return first;
    const values: T[] = [first.value];
    let current = first.state;
    for (;;) {
      const r = parser(current);
      if (!r.ok || r.state.index === current.index) return ok(values, current);
      values.push(r.value);
      current = r.state;
    }
  };
}

// ---- optional -------------------------------------------------------

/** Match zero or one times; returns null on no match. */
export function optional<T>(parser: Parser<T>): Parser<T | null> {
  return (state) => {
    const r = parser(state);
    return r.ok ? r : ok(null, state);
  };
}

// ---- map / mapTo ----------------------------------------------------

/** Transform the value of a successful parse. */
export function map<A, B>(parser: Parser<A>, fn: (a: A) => B): Parser<B> {
  return (state) => {
    const r = parser(state);
    if (!r.ok) return r;
    return ok(fn(r.value), r.state);
  };
}

/** Replace the value of a successful parse with a constant. */
export function mapTo<T>(parser: Parser<unknown>, value: T): Parser<T> {
  return map(parser, () => value);
}

// ---- between --------------------------------------------------------

/** Match left, then parser, then right; return only the parser value. */
export function between<L, T, R>(left: Parser<L>, parser: Parser<T>, right: Parser<R>): Parser<T> {
  return (state) => {
    const l = left(state);
    if (!l.ok) return l as unknown as Result<T>;
    const m = parser(l.state);
    if (!m.ok) return m;
    const r = right(m.state);
    if (!r.ok) return r as unknown as Result<T>;
    return ok(m.value, r.state);
  };
}

// ---- sepBy ----------------------------------------------------------

/** Match parser zero or more times separated by sep. */
export function sepBy<T, S>(parser: Parser<T>, sep: Parser<S>): Parser<T[]> {
  return (state) => {
    const first = parser(state);
    if (!first.ok) return ok([], state);
    const values: T[] = [first.value];
    let current = first.state;
    for (;;) {
      const s = sep(current);
      if (!s.ok) return ok(values, current);
      const v = parser(s.state);
      if (!v.ok) return ok(values, current);
      values.push(v.value);
      current = v.state;
    }
  };
}

/** Match parser one or more times separated by sep. */
export function sepBy1<T, S>(parser: Parser<T>, sep: Parser<S>): Parser<T[]> {
  return (state) => {
    const first = parser(state);
    if (!first.ok) return first;
    const values: T[] = [first.value];
    let current = first.state;
    for (;;) {
      const s = sep(current);
      if (!s.ok) return ok(values, current);
      const v = parser(s.state);
      if (!v.ok) return ok(values, current);
      values.push(v.value);
      current = v.state;
    }
  };
}

// ---- lookahead / not ------------------------------------------------

/** Succeed if parser succeeds, but don't consume input. */
export function lookahead<T>(parser: Parser<T>): Parser<T> {
  return (state) => {
    const r = parser(state);
    if (!r.ok) return r;
    return ok(r.value, state);
  };
}

/** Succeed (returning null) if parser fails; fail if parser succeeds. */
export function not(parser: Parser<unknown>): Parser<null> {
  return (state) => {
    const r = parser(state);
    if (r.ok) return err("not to match", state.index, state);
    return ok(null, state);
  };
}

// ---- label ----------------------------------------------------------

/** Override the error message of a failing parser. */
export function label<T>(parser: Parser<T>, expected: string): Parser<T> {
  return (state) => {
    const r = parser(state);
    if (r.ok) return r;
    return err(expected, r.index, r.state);
  };
}

// ---- chain (flatMap / andThen) --------------------------------------

/** Sequence a parser and then derive the next parser from its result. */
export function chain<A, B>(parser: Parser<A>, fn: (a: A) => Parser<B>): Parser<B> {
  return (state) => {
    const r = parser(state);
    if (!r.ok) return r;
    return fn(r.value)(r.state);
  };
}

// ---- lazy -----------------------------------------------------------

/** Defer parser construction to allow mutually recursive parsers. */
export function lazy<T>(fn: () => Parser<T>): Parser<T> {
  let cached: Parser<T> | null = null;
  return (state) => {
    if (!cached) cached = fn();
    return cached(state);
  };
}

// ---- skip -----------------------------------------------------------

/** Match left then right; return left's value (discard right). */
export function skip<A>(left: Parser<A>, right: Parser<unknown>): Parser<A> {
  return (state) => {
    const l = left(state);
    if (!l.ok) return l;
    const r = right(l.state);
    if (!r.ok) return r as unknown as Result<A>;
    return ok(l.value, r.state);
  };
}

/** Match left then right; return right's value (discard left). */
export function then<B>(left: Parser<unknown>, right: Parser<B>): Parser<B> {
  return (state) => {
    const l = left(state);
    if (!l.ok) return l as unknown as Result<B>;
    return right(l.state);
  };
}

// ---- join -----------------------------------------------------------

/** Join an array-of-strings result into a single string. */
export function join(parser: Parser<string[]>, separator = ""): Parser<string> {
  return map(parser, (arr) => arr.join(separator));
}

// ---- count ----------------------------------------------------------

/** Match parser exactly N times. */
export function count<T>(parser: Parser<T>, n: number): Parser<T[]> {
  return (state) => {
    const values: T[] = [];
    let current = state;
    for (let i = 0; i < n; i++) {
      const r = parser(current);
      if (!r.ok) return r;
      values.push(r.value);
      current = r.state;
    }
    return ok(values, current);
  };
}
