// @vitest-environment node
// THE RESOLVER'S MATRIX — the one decision leaf of the page display.
//
// It is TOTAL, so each branch listed here is named: the content it draws, and
// each separate reason it cannot. The branches this file does not list are not
// claimed. A floor that is reached by no test is a floor a reader could meet
// without anyone having read the sentence it shows them.

import { describe, expect, it } from "vitest";

import { ARTIFACT_CONTENT_CHANNEL_VERSION } from "../src/artifact-content-channel";
import { parseCmsPage } from "../src/cms-page-model";
import {
  byteDownloadHref,
  contentFloorMessage,
  resolveArtifactTextView,
  type ContentFloorReason,
} from "../src/content-view";
import { PROPS_API_VERSION } from "../src/renderer-props";
import { WORDPRESS_FORM } from "./cms-page-fixture";
import { ISLAND_BYTE_ADDRESS, islandProps, noContent, props, REVISION_ID, textContent } from "./props-fixture";

const ALL_REASONS: ContentFloorReason[] = [
  "malformed-props",
  "props-version",
  "channel-version",
  "content-unavailable",
  "content-absent",
  "content-over-cap",
  "content-unsupported-form",
  "content-not-text",
  "content-revision-mismatch",
  "invalid-content-projection",
  "empty-content",
  "content-not-page",
];

/** The page content form, as an agent extension files it. */
const SAMPLE = JSON.stringify(WORDPRESS_FORM.form);
/** A CMS-fields snapshot: JSON, and not the page form. */
const FIELDS = '{"post.title":"New headline","post.content":"The full body copy under review."}';

function parsedSample() {
  const parsed = parseCmsPage(SAMPLE);
  if (!parsed.ok) throw new Error("the fixture is not the page form");
  return parsed.page;
}

describe("the content channel this display reads", () => {
  it("is read at channel version 1", () => {
    expect(ARTIFACT_CONTENT_CHANNEL_VERSION).toBe(1);
  });

  it("is carried on the version 2 snapshot the content leaf reads", () => {
    expect(PROPS_API_VERSION).toBe(2);
  });
});

describe("resolveArtifactTextView — the content it draws", () => {
  it("draws the page form the host projected, from the props and from nowhere else", () => {
    const view = resolveArtifactTextView(props(textContent(SAMPLE)));
    expect(view).toEqual({ kind: "page", page: parsedSample(), revisionId: REVISION_ID });
  });

  it("draws the same page inside a third-party application, where no session address is reachable", () => {
    const view = resolveArtifactTextView(islandProps(textContent(SAMPLE)));
    expect(view).toEqual({ kind: "page", page: parsedSample(), revisionId: REVISION_ID });
  });

  it("reads the representation's type without its parameters or its case", () => {
    const view = resolveArtifactTextView(
      props(textContent(SAMPLE), { representation: { revisionId: REVISION_ID, mime: "Application/JSON; charset=utf-8" } }),
    );
    expect(view.kind).toBe("page");
  });
});

describe("resolveArtifactTextView — it draws pages and nothing else", () => {
  function reasonFor(input: unknown): ContentFloorReason | null {
    const view = resolveArtifactTextView(input as never);
    return view.kind === "floor" ? view.reason : null;
  }

  it("floors, named, on a CMS-fields snapshot instead of drawing it as text", () => {
    const fields = props(textContent(FIELDS), {
      representation: { revisionId: REVISION_ID, mime: "application/vnd.cinatra.cms-fields+json" },
    });
    expect(reasonFor(fields)).toBe("content-not-page");
  });

  it("floors, named, on a text filed in any representation other than JSON, even when it holds the form", () => {
    for (const mime of ["text/plain", "text/markdown", "application/vnd.cinatra.cms-fields+json", "application/jsonl"]) {
      expect(reasonFor(props(textContent(SAMPLE), { representation: { revisionId: REVISION_ID, mime } })), mime).toBe(
        "content-not-page",
      );
    }
  });

  it("floors, named, on a cut text of another representation, as not a page rather than as too large", () => {
    const cut = props(textContent(FIELDS, { truncated: true, byteLength: 900_000, projectedByteLength: 262_144 }), {
      representation: { revisionId: REVISION_ID, mime: "text/plain" },
    });
    expect(reasonFor(cut)).toBe("content-not-page");
  });

  it("floors, named, on a JSON document that is not the form", () => {
    expect(reasonFor(props(textContent(FIELDS)))).toBe("content-not-page");
  });

  it("floors, named, on a cut form, which is no form at all", () => {
    expect(
      reasonFor(props(textContent(SAMPLE.slice(0, 40), { truncated: true, byteLength: 900_000, projectedByteLength: 40 }))),
    ).toBe("content-over-cap");
  });

  it("never returns a text view", () => {
    const fieldsMime = { revisionId: REVISION_ID, mime: "application/vnd.cinatra.cms-fields+json" };
    const plainMime = { revisionId: REVISION_ID, mime: "text/plain" };
    for (const input of [
      props(textContent(SAMPLE)),
      props(textContent(FIELDS)),
      props(textContent("plain words")),
      props(textContent(FIELDS), { representation: fieldsMime }),
      props(textContent("plain words"), { representation: plainMime }),
    ]) {
      expect(resolveArtifactTextView(input).kind).not.toBe("text");
    }
  });
});

describe("resolveArtifactTextView — the named floors, never a blank", () => {
  function reasonFor(input: unknown): ContentFloorReason | null {
    const view = resolveArtifactTextView(input as never);
    return view.kind === "floor" ? view.reason : null;
  }

  it("floors when the host builds an OLDER props version, which carries no content field", () => {
    expect(reasonFor({ ...props(textContent(SAMPLE)), propsApiVersion: 1 })).toBe("props-version");
  });

  it("floors when the snapshot does not say which version it was built at", () => {
    const { propsApiVersion: _dropped, ...rest } = props(textContent(SAMPLE));
    expect(reasonFor(rest)).toBe("props-version");
  });

  it("floors when the surface handed the display NO projection at all", () => {
    const { content: _dropped, ...rest } = props(textContent(SAMPLE));
    expect(reasonFor(rest)).toBe("content-unavailable");
  });

  it("holds an unwired surface APART from an artifact that stores nothing", () => {
    const { content: _dropped, ...rest } = props(textContent(SAMPLE));
    expect(reasonFor(rest)).not.toBe(reasonFor(props(noContent("absent"))));
  });

  it("floors on a projection built at a channel version it does not read", () => {
    expect(reasonFor(props(textContent(SAMPLE, { channelVersion: 2 })))).toBe("channel-version");
  });

  it("names each absence the channel reports", () => {
    expect(reasonFor(props(noContent("absent")))).toBe("content-absent");
    expect(reasonFor(props(noContent("over-cap")))).toBe("content-over-cap");
    expect(reasonFor(props(noContent("unsupported-form")))).toBe("content-unsupported-form");
  });

  it("floors on an absence spelled in a way this channel version does not define", () => {
    expect(reasonFor(props({ ...noContent("absent"), reason: "vanished" } as never))).toBe(
      "invalid-content-projection",
    );
  });

  it("floors on every projection class that is not text", () => {
    const shared = { channelVersion: 1, representationRevisionId: REVISION_ID, byteLength: 4, projectedByteLength: 4, cap: 4096 };
    expect(reasonFor(props({ kind: "configuration", configuration: {}, digest: "d", ...shared } as never))).toBe("content-not-text");
    expect(reasonFor(props({ kind: "page", pageVersion: 1, page: {}, ...shared } as never))).toBe("content-not-text");
    expect(
      reasonFor(props({ kind: "object", source: "snapshot", objectType: "t", data: {}, digest: "d", ...shared } as never)),
    ).toBe("content-not-text");
  });

  it("floors on a projection of a kind this display does not know at all", () => {
    expect(reasonFor(props({ kind: "hologram", channelVersion: 1 } as never))).toBe("invalid-content-projection");
  });

  it("floors on a text projection that is missing a field it must believe", () => {
    const { encoding: _dropped, ...incomplete } = textContent(SAMPLE) as Record<string, unknown>;
    expect(reasonFor(props(incomplete as never))).toBe("invalid-content-projection");
  });

  it("refuses to label one revision's content with another revision's name", () => {
    expect(reasonFor(props(textContent(SAMPLE, { representationRevisionId: "rev_other" })))).toBe(
      "content-revision-mismatch",
    );
  });

  it("floors when the snapshot has no materialized representation to agree with", () => {
    expect(reasonFor(props(textContent(SAMPLE), { representation: null }))).toBe("content-revision-mismatch");
  });

  it("floors, rather than drawing an empty panel, on an empty projection", () => {
    expect(reasonFor(props(textContent("   \n  ")))).toBe("empty-content");
  });

  it("is TOTAL: it returns a view for an input that is not a snapshot at all", () => {
    expect(reasonFor(null)).toBe("malformed-props");
    expect(reasonFor(undefined)).toBe("malformed-props");
    expect(reasonFor([])).toBe("malformed-props");
    expect(reasonFor("a string")).toBe("malformed-props");
    expect(reasonFor(7)).toBe("malformed-props");
  });

  it("never throws on any of them", () => {
    for (const input of [null, undefined, [], "x", 7, {}, { propsApiVersion: 2 }]) {
      expect(() => resolveArtifactTextView(input as never)).not.toThrow();
    }
  });
});

describe("the floor sentences", () => {
  it("gives every reason its own non-empty full sentence", () => {
    const messages = ALL_REASONS.map(contentFloorMessage);
    expect(messages.every((m) => m.trim().length > 0)).toBe(true);
    expect(new Set(messages).size).toBe(ALL_REASONS.length);
  });

});

describe("byteDownloadHref — the address a reader may be handed", () => {
  it("prefers the snapshot's byte reference over the session address", () => {
    const snapshot = props(textContent(SAMPLE), {
      bytes: { road: "island", preview: ISLAND_BYTE_ADDRESS, download: ISLAND_BYTE_ADDRESS },
    });
    expect(byteDownloadHref(snapshot)).toBe(ISLAND_BYTE_ADDRESS);
  });

  it("is the island address inside a third-party application, where the session address is gone", () => {
    expect(byteDownloadHref(islandProps(textContent(SAMPLE)))).toBe(ISLAND_BYTE_ADDRESS);
  });

  it("falls back to the session action when an older snapshot carries no byte reference", () => {
    const { bytes: _dropped, ...rest } = props(textContent(SAMPLE));
    expect(byteDownloadHref(rest as never)).toBe("/api/artifacts/art_1/versions/rev_1/content");
  });

  it("is null, never undefined-shaped, when there is no address at all", () => {
    expect(byteDownloadHref(null)).toBeNull();
    expect(
      byteDownloadHref(props(textContent(SAMPLE), { bytes: undefined, actions: { download: null, openInSource: null }, urls: { preview: null, download: null } })),
    ).toBeNull();
  });

  it("keeps a path on the host and an http(s) address, as the host gives them", () => {
    for (const address of [
      "/api/artifacts/art_1/versions/rev_1/content",
      "/",
      "https://files.example.com/a/b?c=1",
      "HTTP://files.example.com/a",
    ]) {
      expect(byteDownloadHref(props(textContent(SAMPLE), { bytes: { road: "session", preview: null, download: address } })), address).toBe(address);
    }
  });

  it("is null for an address that is not a text, wherever the snapshot carries it", () => {
    const hostile = [{ toString: null, valueOf: null }, {}, [], ["/a"], 42, true, { href: "/a" }];
    for (const download of hostile) {
      const where = [
        { bytes: { road: "session", preview: null, download } },
        { bytes: undefined, actions: { download, openInSource: null } },
        { bytes: undefined, actions: { download: null, openInSource: null }, urls: { preview: null, download } },
      ];
      for (const overrides of where) {
        expect(byteDownloadHref(props(textContent(SAMPLE), overrides as never)), JSON.stringify(overrides)).toBeNull();
      }
    }
  });

  it("is null for a text that is not a path on the host or an http(s) address", () => {
    for (const address of [
      "javascript:alert(1)",
      "JavaScript:alert(1)",
      "data:text/html,x",
      "vbscript:x",
      "//other.example/x",
      "/\\other.example/x",
      "relative/path",
      "https://",
      "/with space",
      "/with\ttab",
      "",
      "   ",
    ]) {
      expect(byteDownloadHref(props(textContent(SAMPLE), { bytes: { road: "session", preview: null, download: address } })), address).toBeNull();
    }
  });

  it("is null for an http(s) address a URL parser cannot read", () => {
    for (const address of [
      "https://example.com:99999/",
      "https://[::1/",
      "http://exa%zzmple.com/",
      "https://exa^mple.com/",
    ]) {
      expect(byteDownloadHref(props(textContent(SAMPLE), { bytes: { road: "session", preview: null, download: address } })), address).toBeNull();
    }
  });

  it("lets the first address the snapshot carries decide, and does not fall back from a bad one", () => {
    const snapshot = props(textContent(SAMPLE), {
      bytes: { road: "session", preview: null, download: "javascript:alert(1)" },
    });
    expect(byteDownloadHref(snapshot)).toBeNull();
  });
});

describe("the projection's arithmetic is checked before the text is read", () => {
  // A PROJECTION WHOSE NUMBERS CANNOT ALL BE TRUE TOGETHER IS NOT DRAWN: the
  // resolver checks the figures it was handed against each other and floors,
  // named, before it parses the text. It does not measure the text against
  // them: figures that agree with each other are taken as the host gives them.
  const impossible: Array<[string, Partial<Parameters<typeof textContent>[1]>]> = [
    ["a negative prefix", { truncated: true, byteLength: 1, projectedByteLength: -1 }],
    ["a prefix that is not a number at all", { projectedByteLength: Number.NaN, byteLength: Number.NaN }],
    ["an infinite whole", { truncated: true, byteLength: Number.POSITIVE_INFINITY }],
    ["a fractional byte count", { truncated: true, byteLength: 10.5, projectedByteLength: 4 }],
    ["a prefix larger than the whole", { truncated: true, byteLength: 4, projectedByteLength: 9 }],
    ["a prefix larger than the cap it was built under", { truncated: true, byteLength: 99, projectedByteLength: 40, cap: 8 }],
    ["a missing cap", { cap: undefined as unknown as number }],
    ["a cap of nothing", { cap: 0 }],
    ["a truncation the numbers deny", { truncated: true, byteLength: 4, projectedByteLength: 4 }],
    ["a whole the truncation flag denies", { truncated: false, byteLength: 900, projectedByteLength: 4 }],
  ];

  for (const [what, overrides] of impossible) {
    it(`floors, named, on ${what}`, () => {
      const view = resolveArtifactTextView(props(textContent("some drawn text", overrides)));
      expect(view.kind).toBe("floor");
      if (view.kind !== "floor") return;
      expect(view.reason).toBe("invalid-content-projection");
      expect(contentFloorMessage(view.reason).trim().length).toBeGreaterThan(0);
    });
  }

  it("still draws a form whose numbers are all consistent, and names a consistent cut as too large", () => {
    const whole = resolveArtifactTextView(props(textContent(SAMPLE)));
    expect(whole.kind).toBe("page");

    const prefix = resolveArtifactTextView(props(textContent(SAMPLE, { truncated: true, byteLength: 1_000_000 })));
    expect(prefix).toEqual({ kind: "floor", reason: "content-over-cap" });
  });
});
