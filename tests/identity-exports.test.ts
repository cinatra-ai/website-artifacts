// @vitest-environment node
// THE IDENTITY LINE OF EVERY PAGE NAMES THE RENDERER THAT DREW IT (cinatra#4366,
// specs/app-artifact-review.html section XI.7 and XI.8). The host draws the
// identity line; this module gives it the two facts only the display knows, as
// two optional named exports of the detail module the host already resolves:
//
//   rendererName            the name of the one page renderer
//   identityFacts(content)  the platform the page lives on (after the revision)
//                           and its address (closing the line), read from the
//                           stored content the host hands the display
//
// The drawn line of section XI.8 is the line these exports are built to:
//
//   @cinatra-ai/website-artifacts:page-snapshot · drawn by
//   @cinatra-ai/website-artifacts:page-diff · revision rev_c410… · pinned ·
//   WordPress · Team: Growth · Private · acme.example/pricing

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import * as detail from "../src/renderers/detail";
import { resolveArtifactTextView, resolveContentPageView } from "../src/content-view";
import { PAGE_DIFF_RENDERER } from "../src/renderer-identity";
import { DRUPAL_FORM, WORDPRESS_FORM, withPage } from "./cms-page-fixture";
import { noContent, props, textContent } from "./props-fixture";

const RENDERER = "@cinatra-ai/website-artifacts:page-diff";

type Facts = { revision: string[]; closing: string[] } | null;
const identityFacts = (detail as unknown as { identityFacts?: (content: unknown) => Facts }).identityFacts;
const rendererName = (detail as unknown as { rendererName?: unknown }).rendererName;

function facts(content: unknown): Facts {
  expect(typeof identityFacts).toBe("function");
  return identityFacts!(content);
}

function page(form: unknown) {
  return textContent(JSON.stringify(form));
}

describe("the detail module names the renderer it is", () => {
  it("exports rendererName as the one page renderer's name", () => {
    expect(rendererName).toBe(RENDERER);
    expect(rendererName).toBe(PAGE_DIFF_RENDERER);
  });

  // A HOST READS THESE EXPORTS ON THE SERVER, from the module it resolves for
  // the detail slot. A module marked "use client" is handed to a server as
  // client references: its string reads as a reference and its function throws
  // when called. So the detail module carries no such directive; the page view
  // it draws keeps its own.
  it("is not a client module, so a server can read its named exports", () => {
    const source = readFileSync(fileURLToPath(new URL("../src/renderers/detail.tsx", import.meta.url)), "utf8");
    expect(source).not.toMatch(/^\s*["']use client["']/m);
  });
});

describe("identityFacts names the platform and the address of the page it draws", () => {
  it("names WordPress after the revision and the page address at the close", () => {
    expect(facts(page(WORDPRESS_FORM.form))).toEqual({ revision: ["WordPress"], closing: ["acme.example/pricing"] });
  });

  it("names Drupal for the Drupal page, which is the same drawing", () => {
    expect(facts(page(DRUPAL_FORM.form))).toEqual({ revision: ["Drupal"], closing: ["acme.example/pricing"] });
  });

  it("composes, with the host's own cells, the drawn line of section XI.8", () => {
    const found = facts(page(WORDPRESS_FORM.form))!;
    const line = [
      "@cinatra-ai/website-artifacts:page-snapshot",
      `drawn by ${String(rendererName)}`,
      "revision rev_c410…",
      "pinned",
      ...found.revision,
      "Team: Growth",
      "Private",
      ...found.closing,
    ].join(" · ");
    expect(line).toBe(
      "@cinatra-ai/website-artifacts:page-snapshot · drawn by @cinatra-ai/website-artifacts:page-diff · " +
        "revision rev_c410… · pinned · WordPress · Team: Growth · Private · acme.example/pricing",
    );
  });

  it("draws the address as a host and a path: no scheme, no query, no fragment, no lone slash", () => {
    expect(facts(page(withPage(WORDPRESS_FORM, { address: "https://acme.example/" })))?.closing).toEqual(["acme.example"]);
    expect(facts(page(withPage(WORDPRESS_FORM, { address: "https://acme.example" })))?.closing).toEqual(["acme.example"]);
    expect(
      facts(page(withPage(WORDPRESS_FORM, { address: "https://www.acme.example/pricing/plans?preview=1&token=x#team" })))?.closing,
    ).toEqual(["www.acme.example/pricing/plans"]);
  });

  it("closes the line with no address where the form gives none the page model admits", () => {
    for (const address of [
      null,
      "http://acme.example/pricing",
      "https://[2001:db8::1]/pricing",
      "https://localhost/x",
      "https://user@acme.example/pricing",
      "https://acme.example:8443/pricing",
      "not an address",
      42,
    ]) {
      expect(facts(page(withPage(DRUPAL_FORM, { address }))), String(address)).toEqual({ revision: ["Drupal"], closing: [] });
    }
  });

  it("gives no facts for content it does not draw as a page", () => {
    const wordpress = JSON.stringify(WORDPRESS_FORM.form);
    for (const content of [
      noContent("absent"),
      noContent("over-cap"),
      noContent("unsupported-form"),
      textContent(wordpress, { truncated: true, projectedByteLength: 10 }),
      textContent(wordpress, { channelVersion: 2 as never }),
      textContent(wordpress, { encoding: "latin1" as never }),
      { ...textContent(wordpress), kind: "object" },
      textContent("{}"),
      textContent("not json"),
      textContent(JSON.stringify({ ...WORDPRESS_FORM.form, system: "joomla" })),
      textContent(JSON.stringify({ ...WORDPRESS_FORM.form, excerpts: [] })),
    ]) {
      expect(facts(content), JSON.stringify(content).slice(0, 80)).toBeNull();
    }
  });

  // THE SAME VERDICT AS THE DISPLAY: a projection the display floors as
  // incomplete (its figures missing or disagreeing, no revision, no text) gets
  // no facts, even when its text is a whole page form. An identity line must
  // never name a platform for a page the display itself refuses to draw.
  const WHOLE = JSON.stringify(WORDPRESS_FORM.form);
  const BYTES = Buffer.byteLength(WHOLE, "utf8");
  function without(key: string): unknown {
    const content = { ...textContent(WHOLE) } as Record<string, unknown>;
    delete content[key];
    return content;
  }
  const FLOORED_BY_THE_DISPLAY: Array<[string, unknown]> = [
    ["no revision", without("representationRevisionId")],
    ["an empty revision", textContent(WHOLE, { representationRevisionId: "" })],
    ["no byte length", without("byteLength")],
    ["no projected byte length", without("projectedByteLength")],
    ["no cap", without("cap")],
    ["no truncated flag", without("truncated")],
    ["no byte metadata at all", (() => {
      const content = without("byteLength") as Record<string, unknown>;
      delete content.projectedByteLength;
      delete content.cap;
      return content;
    })()],
    ["a byte length that is NaN", textContent(WHOLE, { byteLength: Number.NaN })],
    ["a fractional byte length", textContent(WHOLE, { byteLength: BYTES + 0.5, projectedByteLength: BYTES + 0.5 })],
    ["a cap of zero", textContent(WHOLE, { cap: 0 })],
    ["a projection larger than the whole", textContent(WHOLE, { projectedByteLength: BYTES + 1 })],
    ["a projection larger than the cap", textContent(WHOLE, { cap: BYTES - 1 })],
    ["not truncated, yet fewer bytes carried", textContent(WHOLE, { byteLength: BYTES + 10 })],
    ["a text that is not a string", { ...textContent(WHOLE), text: 42 }],
    ["no encoding", without("encoding")],
    ["a blank text", textContent("   ")],
  ];

  it("gives no facts for a projection the display floors as incomplete", () => {
    for (const [name, content] of FLOORED_BY_THE_DISPLAY) {
      expect(resolveArtifactTextView(props(content as never)).kind, name).toBe("floor");
      expect(facts(content), name).toBeNull();
    }
  });

  it("gives facts exactly where the display draws the content as a page", () => {
    const corpus: Array<[string, unknown]> = [
      ["the WordPress page", page(WORDPRESS_FORM.form)],
      ["the Drupal page", page(DRUPAL_FORM.form)],
      ["the WordPress page, address dropped", page(withPage(WORDPRESS_FORM, { address: null }))],
      ["absent", noContent("absent")],
      ["over cap", noContent("over-cap")],
      ["truncated", textContent(WHOLE, { truncated: true, projectedByteLength: 10 })],
      ["another channel version", textContent(WHOLE, { channelVersion: 2 as never })],
      ["not a page form", textContent("{}")],
      ...FLOORED_BY_THE_DISPLAY,
    ];
    for (const [name, content] of corpus) {
      const drawn = resolveArtifactTextView(props(content as never)).kind === "page";
      expect(resolveContentPageView(content).kind === "page", name).toBe(drawn);
      expect(facts(content) !== null, name).toBe(drawn);
    }
  });

  // A READ THAT THROWS IS STILL AN ANSWER: each hostile content below is a
  // whole page projection up to the one field whose getter throws, so the
  // display's own read REACHES that getter and throws (shown first), and
  // identityFacts answers null rather than throw.
  it("answers null, never a throw, where the display's own read throws", () => {
    for (const field of ["kind", "text", "representationRevisionId", "byteLength", "truncated"]) {
      let reached = 0;
      const hostile = { ...textContent(WHOLE) } as Record<string, unknown>;
      Object.defineProperty(hostile, field, {
        enumerable: true,
        get(): never {
          reached += 1;
          throw new Error("a getter that throws");
        },
      });
      expect(() => resolveContentPageView(hostile), field).toThrow("a getter that throws");
      expect(reached, field).toBe(1);
      expect(() => facts(hostile), field).not.toThrow();
      expect(reached, field).toBe(2);
      expect(facts(hostile), field).toBeNull();
    }
  });

  it("answers null for anything that is not a projection at all", () => {
    for (const content of [undefined, null, 0, "text", [], {}, () => "x"]) {
      expect(() => facts(content)).not.toThrow();
      expect(facts(content)).toBeNull();
    }
  });
});
