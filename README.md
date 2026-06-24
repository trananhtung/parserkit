# parserkit

[![npm](https://img.shields.io/npm/v/parserkit)](https://www.npmjs.com/package/parserkit)
[![CI](https://github.com/trananhtung/parserkit/actions/workflows/ci.yml/badge.svg)](https://github.com/trananhtung/parserkit/actions)
[![license](https://img.shields.io/npm/l/parserkit)](LICENSE)

TypeScript-first parser combinators. Build grammars from small reusable pieces.  
Zero dependencies. Full type inference. ESM + CJS.

```bash
npm install parserkit
```

## Why?

`arcsecond` — the most popular TypeScript parser combinator library — has been abandoned since September 2022 (25+ open issues, no releases in 3.5 years). `parserkit` is a maintained, TypeScript-native successor with the same zero-dependency philosophy.

## Quick start

```ts
import { str, regex, many1, digit, map, sequence, join, run, tryRun } from "parserkit";

// Parse a positive integer
const integer = map(join(many1(digit)), Number);
run(integer, "42");     // { ok: true, value: 42 }
tryRun(integer, "abc"); // throws ParseError: expected digit at index 0
```

## Core API

### Primitives

```ts
str("hello")     // matches exact string "hello"
char("a")        // matches single char 'a'
regex(/\d+/)     // matches regex at current position (no 'g' flag)
anyChar          // matches any single character
digit            // [0-9]
letter           // [a-zA-Z]
whitespace       // [ \t\n\r]
spaces           // zero or more whitespace (never fails)
spaces1          // one or more whitespace
eof              // succeeds only at end of input
```

### Combinators

```ts
sequence(p1, p2, p3)       // run all in order → [v1, v2, v3]
choice(p1, p2, p3)         // first success wins
many(p)                    // 0 or more → T[]
many1(p)                   // 1 or more → T[]
optional(p)                // 0 or 1 → T | null
between(open, p, close)    // parses open, p, close → p's value
sepBy(p, sep)              // 0+ items separated by sep → T[]
sepBy1(p, sep)             // 1+ items separated by sep → T[]
count(p, n)                // exactly n repetitions → T[]
lookahead(p)               // succeeds without consuming input
not(p)                     // succeeds when p fails, consumes nothing
skip(p1, p2)               // run both, return p1's value
then(p1, p2)               // run both, return p2's value
```

### Transformers

```ts
map(p, fn)        // transform value: Parser<A> → Parser<B>
mapTo(p, value)   // replace value with constant
join(p, sep?)     // Parser<string[]> → Parser<string>
label(p, name)    // override error message
chain(p, fn)      // sequence based on previous value (flatMap)
lazy(() => p)     // defer construction for recursive grammars
```

### Running parsers

```ts
run(parser, input)    // { ok: true, value } | { ok: false, error: ParseError }
tryRun(parser, input) // T — throws ParseError on failure
```

## Examples

### CSV row

```ts
import { regex, char, sepBy1, sequence, eof, join, many, run } from "parserkit";

const field = join(many(regex(/[^,\n]/)));
const row = sepBy1(field, char(","));

run(sequence(row, eof), "Alice,30,Engineer");
// { ok: true, value: [["Alice", "30", "Engineer"], null] }
```

### JSON number

```ts
import { digit, char, many1, optional, choice, map, join, sequence, run } from "parserkit";

const sign = optional(choice(char("-"), char("+")));
const digits = join(many1(digit));
const decimal = optional(join(sequence(char("."), digits)));
const number = map(
  join(sequence(
    map(sign, s => s ?? ""),
    digits,
    map(decimal, d => d ?? "")
  )),
  parseFloat
);

run(number, "-3.14"); // { ok: true, value: -3.14 }
```

### Recursive grammar (nested parens)

```ts
import { lazy, choice, between, char, mapTo, sequence, run } from "parserkit";

type Tree = null;
const nested: ReturnType<typeof lazy<Tree>> = lazy<Tree>(() =>
  choice(
    between(char("("), nested, char(")")),
    mapTo(sequence(char("("), char(")")), null)
  )
);

run(nested, "(())"); // { ok: true, value: null }
```

### Key–value pairs

```ts
import { join, many1, letter, char, then, skip, sepBy, spaces, sequence, eof, run } from "parserkit";

const key = join(many1(letter));
const value = join(many1(letter));
const pair = sequence(skip(key, char("=")), value);
const pairs = sepBy(pair, sequence(char(","), spaces));

run(sequence(pairs, eof), "a=1, b=2, c=3");
// { ok: true, value: [[["1"], ["2"], ["3"]], null] }
```

## Error messages

`ParseError` includes position info:

```
ParseError: Parse error at index 3 (col 4): expected digit
  ...abc...
```

## License

MIT
