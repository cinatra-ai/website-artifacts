// @vitest-environment node
// THE DISPLAY REACHES THE NETWORK BY NO ROAD BUT ITS ONE PAGE FRAME.
//
// The content channel exists because a display that reaches for its own bytes
// from the browser paints nothing inside a third-party application: the address
// is there, but the credential that would authorize it is not. Moving the
// content onto the props is only half of that; the other half is that no road
// back to the network, other than the one page frame below, survives in the
// shipped source.
//
// SO THIS SCANS THE SHIPPED SOURCE ITSELF rather than one render. A spy over one
// mounted component proves nothing about the branch that was not taken, and a
// subresource address on an element — a frame, a picture, a stylesheet — is a
// load the browser performs without any call this package makes. Both die here.
//
// WHAT THIS SCAN IS, HONESTLY. It is a mechanical guard over the source this
// package publishes, not a proof of absence: a determined author can always
// reach a global through a computed name this cannot see. It is sized for the
// failure it exists to catch — a road added back by ordinary means, by someone
// who did not know it had been removed on purpose — and the suite below asserts
// the guard is LIVE, by proving every pattern fires on a probe rather than
// trusting an empty offender list to mean anything.
//
// COMMENTS ARE REMOVED AS SPANS, not as whole lines: prose ABOUT the rule must
// never read as the rule being broken, and code that happens to share a line
// with a comment must never be dropped out of the scan along with it.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const SRC = fileURLToPath(new URL("../src", import.meta.url));

/** Every extension this package could publish executable source under — not
 * only the two it happens to author today, so a road added in a compiled or
 * plain-JavaScript file is scanned rather than skipped. */
const SOURCE_FILE = /\.(?:[cm]?tsx?|[cm]?jsx?)$/;

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...sourceFiles(full));
      continue;
    }
    if (SOURCE_FILE.test(entry)) out.push(full);
  }
  return out.sort();
}

export function codeOnly(text: string): string {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .split("\n")
    .filter((line) => !line.trim().startsWith("//"))
    .join("\n");
}

const FORBIDDEN: Array<{ what: string; pattern: RegExp; probe: string }> = [
  { what: "a content request", pattern: /\bfetch\s*\(/, probe: "await fetch(url);" },
  { what: "an XHR", pattern: /XMLHttpRequest/, probe: "const x = new XMLHttpRequest();" },
  { what: "a server-sent-event stream", pattern: /EventSource/, probe: "new EventSource(url);" },
  { what: "a socket", pattern: /WebSocket/, probe: "new WebSocket(url);" },
  {
    what: "a beacon or a worker transport",
    pattern: /sendBeacon|navigator\s*\.\s*serviceWorker/,
    probe: "navigator.sendBeacon(url);",
  },
  { what: "a subframe", pattern: /<\s*iframe/i, probe: "return <iframe src={href} />;" },
  {
    what: "a picture subresource",
    pattern: /<\s*img\b|new\s+Image\s*\(|\bsrc[Ss]et\b/,
    probe: "return <img src={href} />;",
  },
  {
    what: "a media or document subresource",
    pattern: /<\s*(?:video|audio|source|track|embed|object|link)\b/i,
    probe: "return <video src={href} />;",
  },
  {
    what: "a preloaded subresource",
    pattern: /\brel\s*=\s*["'](?:preload|prefetch|stylesheet|dns-prefetch|preconnect)/i,
    probe: 'const a = \'rel="preload"\';',
  },
  {
    what: "a remote address in a stylesheet",
    pattern: /url\s*\(\s*["']?(?:https?:|\/\/)/i,
    probe: 'const css = "background: url(https://example.test/a.png)";',
  },
  {
    what: "an element built at runtime",
    pattern: /document\s*\.\s*createElement(?:NS)?\b/,
    probe: 'document.createElement("i" + "frame");',
  },
  {
    what: "a global reached by a computed name",
    pattern: /(?:globalThis|window|self)\s*\[/,
    probe: 'const request = globalThis["fetch"];',
  },
  { what: "a remote module load", pattern: /import\s*\(\s*[`'"]https?:/i, probe: 'await import("https://x.test/m.js");' },
];

describe("the guard itself is live", () => {
  // A SCAN THAT CANNOT FAIL PROVES NOTHING. An empty offender list means the
  // road is absent only if the pattern would have found the road had it been
  // there, so every pattern is fired at a probe that is exactly the road it
  // names. A pattern rewritten into something that matches nothing fails HERE,
  // rather than passing silently over a display that reaches the network.
  for (const { what, pattern, probe } of FORBIDDEN) {
    it(`catches ${what}`, () => {
      expect(pattern.test(codeOnly(probe)), probe).toBe(true);
    });
  }

  it("does not read prose about a road as the road", () => {
    const prose = [
      "// this display used to fetch(url) and must not again",
      "/** a <img> or an <iframe> is a load the browser performs. */",
    ].join("\n");
    for (const { pattern } of FORBIDDEN) expect(pattern.test(codeOnly(prose))).toBe(false);
  });

  it("does not lose code that shares its line with a comment", () => {
    // The whole-line filter this replaced dropped the line below entirely, so a
    // road behind a comment on the same line would have scanned clean.
    expect(/\bfetch\s*\(/.test(codeOnly("/* rationale */ fetch(url);"))).toBe(true);
  });
});

/** The one subframe the approved drawing asks for: the page embedded in its
 * frame (cinatra#3092). It is admitted in exactly this one file and for the
 * subframe pattern alone; every other file and every other pattern is scanned
 * as before. The frame's first request is only the address the page form
 * gives for the published page, once the page view admits it by the model's
 * site-bound rule (the frame-address rule, on the origin of the site the view
 * is handed), never this package's bytes, and the arm below pins how it is
 * drawn. */
const PAGE_FRAME = "renderers/page-frame.tsx";
const ADMITTED: Record<string, string[]> = { "a subframe": [PAGE_FRAME] };

describe("the shipped source holds no road to the network but its one page frame", () => {
  const files = sourceFiles(SRC);

  it("ships at least one source file to scan", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  for (const { what, pattern } of FORBIDDEN) {
    const admitted = ADMITTED[what] ?? [];
    const except = admitted.length > 0 ? ` but ${admitted.join(" and ")}` : "";
    it(`contains ${what} nowhere in src/${except}`, () => {
      const offenders = files
        .filter((file) => pattern.test(codeOnly(readFileSync(file, "utf8"))))
        .map((file) => file.slice(SRC.length + 1))
        .filter((file) => !admitted.includes(file));
      expect(offenders).toEqual([]);
    });
  }

  it("draws its one frame only at the address the page view hands it, sandboxed", () => {
    const code = codeOnly(readFileSync(join(SRC, PAGE_FRAME), "utf8"));
    const frames = code.match(/<\s*iframe\b[^>]*>/gi) ?? [];
    expect(frames).toHaveLength(1);
    const frame = frames[0];
    expect(frame).toMatch(/\bsrc=\{address\}/);
    expect(frame).toMatch(/\bsandbox=""/);
    expect(frame).toMatch(/\breferrerPolicy="no-referrer"/);
    expect(frame).toMatch(/\bloading="lazy"/);
    // The address is the component's own prop, handed in already admitted by
    // the page view through the model's site-bound rule; the frame reads
    // nothing else.
    expect(code).toMatch(/export\s+function\s+\w+\s*\(\s*\{[^}]*\baddress\b[^}]*\}/);
  });
});
