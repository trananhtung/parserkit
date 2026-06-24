import { str, regex, char, anyChar, digit, letter, whitespace, spaces, spaces1, eof, run } from "../src/index.js";

describe("primitives", () => {
  describe("str", () => {
    it("matches exact string", () => {
      expect(run(str("hello"), "hello")).toEqual({ ok: true, value: "hello" });
    });

    it("fails on mismatch", () => {
      const r = run(str("hello"), "world");
      expect(r.ok).toBe(false);
    });

    it("fails on partial match", () => {
      const r = run(str("hello"), "hell");
      expect(r.ok).toBe(false);
    });
  });

  describe("regex", () => {
    it("matches regex at current position", () => {
      expect(run(regex(/\d+/), "123")).toEqual({ ok: true, value: "123" });
    });

    it("fails when no match", () => {
      expect(run(regex(/\d+/), "abc")).toMatchObject({ ok: false });
    });

    it("does not match mid-string without consuming prefix", () => {
      expect(run(regex(/\d+/), "abc123")).toMatchObject({ ok: false });
    });
  });

  describe("char", () => {
    it("matches single char", () => {
      expect(run(char("a"), "a")).toEqual({ ok: true, value: "a" });
    });

    it("fails on mismatch", () => {
      expect(run(char("a"), "b")).toMatchObject({ ok: false });
    });
  });

  describe("anyChar", () => {
    it("matches any char", () => {
      expect(run(anyChar, "x")).toEqual({ ok: true, value: "x" });
    });

    it("fails at eof", () => {
      expect(run(anyChar, "")).toMatchObject({ ok: false });
    });
  });

  describe("digit", () => {
    it("matches digit", () => {
      expect(run(digit, "5")).toEqual({ ok: true, value: "5" });
    });

    it("fails on letter", () => {
      expect(run(digit, "a")).toMatchObject({ ok: false });
    });
  });

  describe("letter", () => {
    it("matches letter", () => {
      expect(run(letter, "Z")).toEqual({ ok: true, value: "Z" });
    });

    it("fails on digit", () => {
      expect(run(letter, "9")).toMatchObject({ ok: false });
    });
  });

  describe("whitespace", () => {
    it("matches space", () => expect(run(whitespace, " ")).toEqual({ ok: true, value: " " }));
    it("matches tab", () => expect(run(whitespace, "\t")).toEqual({ ok: true, value: "\t" }));
    it("fails on letter", () => expect(run(whitespace, "a")).toMatchObject({ ok: false }));
  });

  describe("spaces", () => {
    it("matches zero spaces", () => expect(run(spaces, "")).toEqual({ ok: true, value: "" }));
    it("matches multiple spaces", () => expect(run(spaces, "   ")).toEqual({ ok: true, value: "   " }));
  });

  describe("spaces1", () => {
    it("matches one or more spaces", () => expect(run(spaces1, "  ")).toEqual({ ok: true, value: "  " }));
    it("fails on non-whitespace", () => expect(run(spaces1, "a")).toMatchObject({ ok: false }));
  });

  describe("eof", () => {
    it("succeeds at end of input", () => expect(run(eof, "")).toEqual({ ok: true, value: null }));
    it("fails when input remains", () => expect(run(eof, "x")).toMatchObject({ ok: false }));
  });
});
