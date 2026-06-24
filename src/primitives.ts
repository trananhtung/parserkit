import { ok, err, type Parser } from "./types.js";

/** Matches an exact string literal. */
export function str(s: string): Parser<string> {
  return (state) => {
    if (state.input.startsWith(s, state.index)) {
      return ok(s, { ...state, index: state.index + s.length });
    }
    return err(`"${s}"`, state.index, state);
  };
}

/**
 * Matches a regex pattern anchored at the current position.
 * The regex must NOT use the `g` flag. The `y` (sticky) flag is added automatically.
 */
export function regex(pattern: RegExp): Parser<string> {
  const flags = pattern.flags.replace(/[gy]/g, "");
  const sticky = new RegExp(pattern.source, flags + "y");
  return (state) => {
    sticky.lastIndex = state.index;
    const m = sticky.exec(state.input);
    if (m) return ok(m[0], { ...state, index: state.index + m[0].length });
    return err(`/${pattern.source}/`, state.index, state);
  };
}

/** Matches any single character. */
export const anyChar: Parser<string> = (state) => {
  if (state.index < state.input.length) {
    return ok(state.input[state.index], { ...state, index: state.index + 1 });
  }
  return err("any character", state.index, state);
};

/** Matches a single specific character. */
export function char(c: string): Parser<string> {
  return (state) => {
    if (state.input[state.index] === c) {
      return ok(c, { ...state, index: state.index + 1 });
    }
    return err(`'${c}'`, state.index, state);
  };
}

/** Matches a single digit [0-9]. */
export const digit: Parser<string> = (state) => {
  const ch = state.input[state.index];
  if (ch !== undefined && ch >= "0" && ch <= "9") {
    return ok(ch, { ...state, index: state.index + 1 });
  }
  return err("digit", state.index, state);
};

/** Matches a single ASCII letter [a-zA-Z]. */
export const letter: Parser<string> = (state) => {
  const ch = state.input[state.index];
  if (ch !== undefined && /[a-zA-Z]/.test(ch)) {
    return ok(ch, { ...state, index: state.index + 1 });
  }
  return err("letter", state.index, state);
};

/** Matches a single whitespace character [ \t\n\r]. */
export const whitespace: Parser<string> = (state) => {
  const ch = state.input[state.index];
  if (ch !== undefined && (ch === " " || ch === "\t" || ch === "\n" || ch === "\r")) {
    return ok(ch, { ...state, index: state.index + 1 });
  }
  return err("whitespace", state.index, state);
};

/** Matches zero or more whitespace characters (never fails). */
export const spaces: Parser<string> = (state) => {
  let i = state.index;
  while (i < state.input.length && /\s/.test(state.input[i])) i++;
  return ok(state.input.slice(state.index, i), { ...state, index: i });
};

/** Matches one or more whitespace characters. */
export const spaces1: Parser<string> = (state) => {
  const ch = state.input[state.index];
  if (ch === undefined || !/\s/.test(ch)) return err("whitespace", state.index, state);
  let i = state.index + 1;
  while (i < state.input.length && /\s/.test(state.input[i])) i++;
  return ok(state.input.slice(state.index, i), { ...state, index: i });
};

/** Succeeds (with null) only at end of input. */
export const eof: Parser<null> = (state) => {
  if (state.index >= state.input.length) return ok(null, state);
  return err("end of input", state.index, state);
};
