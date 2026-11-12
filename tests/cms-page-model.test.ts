// @vitest-environment node
// The page content form's model (cinatra#3092): what the display reads from
// the content alone, and every named reason it cannot.

import { describe, expect, it } from "vitest";

import { excerptGroups, framableAddress, parseCmsPage, wordDiff } from "../src/cms-page-model";
import { PAGE_ADDRESS, PAGE_TITLE, WORDPRESS_FORM } from "./cms-page-fixture";

const text = (value: unknown): string => JSON.stringify(value);

function withExcerpt(patch: Record<string, unknown>): Record<string, unknown> {
  const excerpts = (WORDPRESS_FORM.form.excerpts as Array<Record<string, unknown>>).map((e) => ({ ...e }));
  excerpts[1] = { ...excerpts[1], ...patch };
  return { ...WORDPRESS_FORM.form, excerpts };
}

describe("the page content form", () => {
  it("M1 parses the page form", () => {
    const parsed = parseCmsPage(text(WORDPRESS_FORM.form));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.page.system).toBe("wordpress");
    expect(parsed.page.page).toEqual({
      title: PAGE_TITLE,
      address: PAGE_ADDRESS,
      cmsAddress: WORDPRESS_FORM.cmsAddress,
    });
    expect(parsed.page.readAt).toBe("2026-09-29T10:00:00.000Z");
    expect(parsed.page.excerpts.map((e) => [e.region, e.position, e.kind])).toEqual([
      ["title", 0, "heading"],
      ["content", 2, "paragraph"],
      ["content", 5, "list-item"],
    ]);
    expect(parsed.page.excerpts[0].level).toBe(1);
  });

  it("M2 names a text that is not JSON", () => {
    expect(parseCmsPage("{not json")).toEqual({ ok: false, reason: "not-json" });
  });

  it("M3 names a JSON document that is not the form", () => {
    expect(parseCmsPage(text({ "post.title": "New headline" }))).toEqual({ ok: false, reason: "not-the-form" });
    expect(parseCmsPage(text([1, 2]))).toEqual({ ok: false, reason: "not-the-form" });
    expect(parseCmsPage("null")).toEqual({ ok: false, reason: "not-the-form" });
  });

  it("M4 names a form of another version", () => {
    expect(parseCmsPage(text({ ...WORDPRESS_FORM.form, cinatraCmsPage: 2 }))).toEqual({
      ok: false,
      reason: "form-version",
    });
  });

  it("M5 names a form with no excerpts", () => {
    expect(parseCmsPage(text({ ...WORDPRESS_FORM.form, excerpts: [] }))).toEqual({ ok: false, reason: "no-excerpts" });
    const { excerpts: _dropped, ...without } = WORDPRESS_FORM.form;
    expect(parseCmsPage(text(without))).toEqual({ ok: false, reason: "no-excerpts" });
  });

  it("M6 names a malformed excerpt", () => {
    const malformed = { ok: false, reason: "malformed" };
    expect(parseCmsPage(text(withExcerpt({ region: "" })))).toEqual(malformed);
    expect(parseCmsPage(text(withExcerpt({ position: -1 })))).toEqual(malformed);
    expect(parseCmsPage(text(withExcerpt({ position: 1.5 })))).toEqual(malformed);
    expect(parseCmsPage(text(withExcerpt({ kind: "table" })))).toEqual(malformed);
    expect(parseCmsPage(text(withExcerpt({ published: 3 })))).toEqual(malformed);
    expect(parseCmsPage(text(withExcerpt({ proposed: null })))).toEqual(malformed);
    expect(parseCmsPage(text(withExcerpt({ kind: "heading", level: 7 })))).toEqual(malformed);
    expect(parseCmsPage(text({ ...WORDPRESS_FORM.form, system: "joomla" }))).toEqual(malformed);
    expect(parseCmsPage(text({ ...WORDPRESS_FORM.form, page: { address: PAGE_ADDRESS } }))).toEqual(malformed);
  });

  it("M7 admits only an https address without credentials", () => {
    expect(framableAddress("http://acme.example/pricing")).toBeNull();
    expect(framableAddress("javascript:alert(1)")).toBeNull();
    expect(framableAddress("/pricing")).toBeNull();
    expect(framableAddress("https://editor@acme.example/pricing")).toBeNull();
    expect(framableAddress(42)).toBeNull();
    expect(framableAddress(PAGE_ADDRESS)).toBe(PAGE_ADDRESS);

    // A form that parses keeps the gap reachable: the address is normalized,
    // never a reason to floor.
    const parsed = parseCmsPage(
      text({ ...WORDPRESS_FORM.form, page: { title: PAGE_TITLE, address: "http://acme.example/pricing" } }),
    );
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.page.page.address).toBeNull();
    expect(parsed.page.page.cmsAddress).toBeNull();
  });

  it("M8 marks removed and added words in place", () => {
    const published = "Three plans, a price held since 2024, and the migration note under each.";
    const proposed = "Three plans, one price change, and the migration note under each.";
    const segments = wordDiff(published, proposed);
    expect(segments.map((s) => ({ op: s.op, text: s.text.trim() }))).toEqual([
      { op: "same", text: "Three plans," },
      { op: "removed", text: "a price held since 2024," },
      { op: "added", text: "one price change," },
      { op: "same", text: "and the migration note under each." },
    ]);
    // The spaces are kept: each side reads back exactly.
    expect(segments.filter((s) => s.op !== "added").map((s) => s.text).join("")).toBe(published);
    expect(segments.filter((s) => s.op !== "removed").map((s) => s.text).join("")).toBe(proposed);

    // Where one text ends on a word the other goes on from, each side keeps
    // its own spacing: the added words never run into the word before them.
    for (const [before, after] of [
      ["Hello", "Hello world"],
      ["Hello world", "Hello"],
      ["world", "Hello world"],
    ]) {
      const pair = wordDiff(before, after);
      expect(pair.filter((s) => s.op !== "added").map((s) => s.text).join("")).toBe(before);
      expect(pair.filter((s) => s.op !== "removed").map((s) => s.text).join("")).toBe(after);
    }

    // An unchanged text is drawn unchanged, however long it is.
    const long = Array.from({ length: 1001 }, () => "word").join(" ");
    expect(wordDiff(long, long)).toEqual([{ op: "same", text: long }]);
    const edited = long.replace(/word$/, "words");
    expect(wordDiff(long, edited).map((s) => [s.op, s.text.trim()])).toEqual([
      ["same", Array.from({ length: 1000 }, () => "word").join(" ")],
      ["removed", "word"],
      ["added", "words"],
    ]);
  });

  it("M9 elides between excerpts that are not adjacent", () => {
    const parsed = parseCmsPage(text(WORDPRESS_FORM.form));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(excerptGroups(parsed.page.excerpts).map((entry) => entry.elidedBefore)).toEqual([false, true, true]);
    const adjacent = parsed.page.excerpts.map((e, i) => ({ ...e, region: "content", position: i }));
    expect(excerptGroups(adjacent).map((entry) => entry.elidedBefore)).toEqual([false, false, false]);
  });
});
