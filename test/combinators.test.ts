import {
  str, regex, digit, letter, char, spaces, eof,
  sequence, choice, many, many1, optional, map, mapTo,
  between, sepBy, sepBy1, lookahead, not, label, chain,
  lazy, skip, then, join, count, run, tryRun, ParseError
} from "../src/index.js";

describe("sequence", () => {
  it("parses all in order and returns tuple", () => {
    const p = sequence(str("a"), str("b"), str("c"));
    expect(run(p, "abc")).toEqual({ ok: true, value: ["a", "b", "c"] });
  });

  it("fails when any parser fails", () => {
    const p = sequence(str("a"), str("b"));
    expect(run(p, "ax")).toMatchObject({ ok: false });
  });
});

describe("choice", () => {
  it("returns first successful parse", () => {
    const p = choice(str("foo"), str("bar"), str("baz"));
    expect(run(p, "bar")).toEqual({ ok: true, value: "bar" });
  });

  it("fails if all choices fail", () => {
    const p = choice(str("foo"), str("bar"));
    expect(run(p, "qux")).toMatchObject({ ok: false });
  });

  it("prefers earlier choice on tie", () => {
    const p = choice(str("ab"), str("a"));
    expect(run(p, "ab")).toEqual({ ok: true, value: "ab" });
  });
});

describe("many / many1", () => {
  it("many matches zero or more", () => {
    const p = sequence(many(digit), eof);
    expect(run(p, "")).toMatchObject({ ok: true });
    expect(run(sequence(many(digit), eof), "123")).toMatchObject({ ok: true });
  });

  it("many returns matched values", () => {
    const p = many(digit);
    const r = run(sequence(p, eof), "456");
    expect(r).toMatchObject({ ok: true, value: [["4", "5", "6"], null] });
  });

  it("many1 requires at least one", () => {
    expect(run(many1(digit), "")).toMatchObject({ ok: false });
    expect(run(sequence(many1(digit), eof), "7")).toMatchObject({ ok: true });
  });
});

describe("optional", () => {
  it("returns value when parser succeeds", () => {
    expect(run(optional(str("x")), "x")).toEqual({ ok: true, value: "x" });
  });

  it("returns null when parser fails", () => {
    const p = sequence(optional(str("x")), eof);
    expect(run(p, "")).toMatchObject({ ok: true, value: [null, null] });
  });
});

describe("map", () => {
  it("transforms the value", () => {
    const p = map(many1(digit), (ds) => parseInt(ds.join(""), 10));
    expect(run(p, "42")).toEqual({ ok: true, value: 42 });
  });
});

describe("mapTo", () => {
  it("replaces value with constant", () => {
    expect(run(mapTo(str("true"), true), "true")).toEqual({ ok: true, value: true });
  });
});

describe("between", () => {
  it("parses content between delimiters", () => {
    const p = between(char("("), many(letter), char(")"));
    const r = run(p, "(hello)");
    expect(r).toMatchObject({ ok: true, value: ["h","e","l","l","o"] });
  });
});

describe("sepBy / sepBy1", () => {
  const num = map(many1(digit), (ds) => parseInt(ds.join(""), 10));
  const comma = str(",");

  it("sepBy matches zero — returns empty array on empty input", () => {
    const p = sequence(sepBy(num, comma), eof);
    expect(run(p, "")).toMatchObject({ ok: true, value: [[], null] });
  });

  it("sepBy with eof passes on empty", () => {
    const p = sequence(sepBy(num, comma), eof);
    expect(run(p, "")).toMatchObject({ ok: true });
  });

  it("sepBy matches comma-separated numbers", () => {
    const p = sequence(sepBy(num, comma), eof);
    expect(run(p, "1,2,3")).toMatchObject({ ok: true, value: [[1, 2, 3], null] });
  });

  it("sepBy1 requires at least one", () => {
    expect(run(sepBy1(num, comma), "")).toMatchObject({ ok: false });
  });

  it("sepBy1 matches one", () => {
    const p = sequence(sepBy1(num, comma), eof);
    expect(run(p, "42")).toMatchObject({ ok: true, value: [[42], null] });
  });
});

describe("lookahead", () => {
  it("succeeds without consuming", () => {
    const p = sequence(lookahead(digit), digit, eof);
    expect(run(p, "5")).toMatchObject({ ok: true, value: ["5", "5", null] });
  });

  it("fails if lookahead fails", () => {
    expect(run(lookahead(digit), "a")).toMatchObject({ ok: false });
  });
});

describe("not", () => {
  it("succeeds when parser fails", () => {
    const p = sequence(not(digit), letter, eof);
    expect(run(p, "a")).toMatchObject({ ok: true, value: [null, "a", null] });
  });

  it("fails when parser succeeds", () => {
    expect(run(not(digit), "5")).toMatchObject({ ok: false });
  });
});

describe("label", () => {
  it("overrides error expected message", () => {
    const p = label(digit, "a number");
    const r = run(p, "x");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.message).toContain("a number");
  });
});

describe("chain", () => {
  it("sequences based on previous value", () => {
    const p = chain(
      map(many1(digit), (ds) => parseInt(ds.join(""), 10)),
      (n) => mapTo(str("!".repeat(n)), n)
    );
    expect(run(p, "3!!!")).toEqual({ ok: true, value: 3 });
  });
});

describe("lazy", () => {
  it("allows recursive parsers", () => {
    // Nested parentheses: () | (P)
    type Nested = null | Nested;
    const nested: ReturnType<typeof lazy<Nested>> = lazy<Nested>(() =>
      choice(
        map(between(char("("), nested, char(")")), (_) => null as Nested),
        mapTo(sequence(char("("), char(")")), null as Nested),
      )
    );
    expect(run(nested, "()")).toMatchObject({ ok: true });
    expect(run(nested, "(())")).toMatchObject({ ok: true });
  });
});

describe("skip / then", () => {
  it("skip discards right side", () => {
    const p = skip(many1(digit), char(";"));
    expect(run(p, "42;")).toMatchObject({ ok: true, value: ["4","2"] });
  });

  it("then discards left side", () => {
    const p = then(str("key="), many1(letter));
    expect(run(p, "key=abc")).toMatchObject({ ok: true, value: ["a","b","c"] });
  });
});

describe("join", () => {
  it("joins string array result", () => {
    const word = join(many1(letter));
    expect(run(word, "hello")).toEqual({ ok: true, value: "hello" });
  });
});

describe("count", () => {
  it("matches exactly N times", () => {
    expect(run(count(digit, 3), "456")).toMatchObject({ ok: true, value: ["4","5","6"] });
  });

  it("fails if fewer than N", () => {
    expect(run(count(digit, 3), "45")).toMatchObject({ ok: false });
  });
});

describe("tryRun", () => {
  it("returns value on success", () => {
    expect(tryRun(str("ok"), "ok")).toBe("ok");
  });

  it("throws ParseError on failure", () => {
    expect(() => tryRun(str("ok"), "no")).toThrow(ParseError);
  });
});

describe("real-world: JSON number", () => {
  const sign = optional(choice(char("-"), char("+")));
  const digits = join(many1(digit));
  const decimal = optional(join(sequence(char("."), digits)));
  const number = map(
    join(sequence(
      map(sign, (s) => s ?? ""),
      digits,
      map(decimal, (d) => d ?? "")
    )),
    parseFloat
  );

  it("parses integers", () => {
    expect(run(number, "42")).toEqual({ ok: true, value: 42 });
  });

  it("parses decimals", () => {
    expect(run(number, "3.14")).toEqual({ ok: true, value: 3.14 });
  });

  it("parses negative numbers", () => {
    expect(run(number, "-7")).toEqual({ ok: true, value: -7 });
  });
});

describe("real-world: CSV row", () => {
  const field = join(many(regex(/[^,\n]/)));
  const row = sepBy1(field, char(","));

  it("parses a CSV row", () => {
    expect(run(sequence(row, eof), "a,b,c")).toMatchObject({ ok: true, value: [["a", "b", "c"], null] });
  });
});
