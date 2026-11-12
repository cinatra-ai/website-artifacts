// @vitest-environment node
// THE DETAIL SLOT DRAWS FROM THE CONTENT CHANNEL — on every host.
//
// The projected page form must reach the DRAWN output, on the first-party
// snapshot and on the one a host builds inside a third-party application alike,
// and no request may leave the display while it happens. The one subresource
// the page view can draw is the page's frame, and only on the origin of the
// site the view is handed; this display hands it none, so it draws none.

import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { contentFloorMessage } from "../src/content-view";
import PageDiffDetail from "../src/renderers/detail";
import { PAGE_ADDRESS, WORDPRESS_FORM } from "./cms-page-fixture";
import { islandProps, noContent, props, REVISION_ID, textContent } from "./props-fixture";

// The renderer name as a literal, as tests/renderer-identity.test.tsx holds it, so this file
// also loads over a tree that has no src/renderer-identity.ts (the red run of the test kit).
const RENDERER = "@cinatra-ai/website-artifacts:page-diff";

const FORM = JSON.stringify(WORDPRESS_FORM.form);

const FIELDS = JSON.stringify({
  "post.title": "New headline",
  "post.content": "The full body copy under review.",
  "post.status": "draft",
});

/** Render with every network entry point this environment has replaced by a
 * recorder, so a display that reached for one is caught in the act. */
function drawWatched(node: Parameters<typeof renderToStaticMarkup>[0]): {
  html: string;
  calls: number;
} {
  const fetchSpy = vi.fn();
  const xhrSpy = vi.fn();
  vi.stubGlobal("fetch", fetchSpy);
  vi.stubGlobal(
    "XMLHttpRequest",
    class {
      constructor() {
        xhrSpy();
      }
    },
  );
  const html = renderToStaticMarkup(node);
  return { html, calls: fetchSpy.mock.calls.length + xhrSpy.mock.calls.length };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("the detail slot draws the projected page form", () => {
  it("puts the host-projected page in the drawn output and makes no fetch or XMLHttpRequest call", () => {
    const { html, calls } = drawWatched(<PageDiffDetail {...props(textContent(FORM))} />);
    expect(calls).toBe(0);
    expect(html).toContain('data-cms-page="page"');
    expect(html).toContain("Pricing — 2026 plans");
    expect(html).toContain("data-cms-page-excerpts");
    expect(html).not.toContain("aria-busy");
  });

  it("draws the same page inside a third-party application, where a session address is unreachable", () => {
    const { html, calls } = drawWatched(<PageDiffDetail {...islandProps(textContent(FORM))} />);
    expect(calls).toBe(0);
    expect(html).toContain('data-cms-page="page"');
    expect(html).toContain(`data-revision="${REVISION_ID}"`);
  });

  it("stamps version 2 on a version 2 snapshot, so a surface can read which contract it got", () => {
    const html = renderToStaticMarkup(<PageDiffDetail {...props(textContent(FORM))} />);
    expect(html).toContain('data-props-api-version="2"');
  });

  it("stamps no props version on a snapshot of a version it does not read", () => {
    for (const propsApiVersion of [1, 3, 9, undefined, "2"]) {
      const html = renderToStaticMarkup(
        <PageDiffDetail {...({ ...props(textContent(FORM)), propsApiVersion } as never)} />,
      );
      expect(html, String(propsApiVersion)).toContain('data-cms-detail-floor="props-version"');
      expect(html, String(propsApiVersion)).toContain(`data-renderer="${RENDERER}"`);
      expect(html, String(propsApiVersion)).not.toContain("data-props-api-version");
    }
  });

  it("draws no subresource element: no snapshot hands the display a site, so the frame's place names the gap", () => {
    const { html } = drawWatched(<PageDiffDetail {...props(textContent(FORM))} />);
    expect(html).toContain('data-cms-page="page"');
    expect(html.match(/<iframe\b/g) ?? []).toHaveLength(0);
    expect(html.match(/\bsrc="([^"]*)"/g) ?? []).toEqual([]);
    expect(html).not.toContain(PAGE_ADDRESS);
    expect(html).toContain("data-cms-page-gap");
    expect(html).not.toContain("<img");
  });
});

describe("the detail slot draws no field list", () => {
  it("floors, named, on a CMS-fields snapshot, and draws none of its fields", () => {
    const fields = props(textContent(FIELDS), {
      representation: { revisionId: REVISION_ID, mime: "application/vnd.cinatra.cms-fields+json" },
    });
    const html = renderToStaticMarkup(<PageDiffDetail {...fields} />);
    expect(html).toContain('data-cms-detail-floor="content-not-page"');
    expect(html).toContain(contentFloorMessage("content-not-page"));
    expect(html).not.toContain("New headline");
    expect(html).not.toContain("data-cms-field");
    expect(html).not.toContain("data-cms-scope");
    expect(html).not.toContain("<iframe");
  });

  it("floors, named, on a JSON document that is not the form, and draws none of it", () => {
    const html = renderToStaticMarkup(<PageDiffDetail {...props(textContent(FIELDS))} />);
    expect(html).toContain('data-cms-detail-floor="content-not-page"');
    expect(html).not.toContain("New headline");
  });
});

describe("the detail slot floors, named and never blank", () => {
  it("floors with the named reason when the host builds an older props version", () => {
    const html = renderToStaticMarkup(
      <PageDiffDetail {...({ ...props(textContent(FORM)), propsApiVersion: 1 } as never)} />,
    );
    expect(html).toContain('data-cms-detail-floor="props-version"');
    expect(html).toContain(contentFloorMessage("props-version"));
    expect(html.replace(/<[^>]*>/g, "").trim().length).toBeGreaterThan(0);
  });

  it("floors with the named reason when the surface handed it no projection", () => {
    const { content: _dropped, ...rest } = props(textContent(FORM));
    const html = renderToStaticMarkup(<PageDiffDetail {...(rest as never)} />);
    expect(html).toContain('data-cms-detail-floor="content-unavailable"');
  });

  it("floors with the channel's own named absence", () => {
    const html = renderToStaticMarkup(<PageDiffDetail {...props(noContent("over-cap"))} />);
    expect(html).toContain('data-cms-detail-floor="content-over-cap"');
    expect(html).toContain(contentFloorMessage("content-over-cap"));
  });

  it("offers the byte reference as the download address on a floor, which is the one an island reader can use", () => {
    const html = renderToStaticMarkup(<PageDiffDetail {...islandProps(noContent("over-cap"))} />);
    expect(html).toContain("/api/lifecycle-views/artifact-bytes");
    expect(html).toContain("data-cms-download");
  });

  it("draws the artifact's own title on a floor, and the kind label when it has none", () => {
    const titled = renderToStaticMarkup(<PageDiffDetail {...props(noContent("absent"))} />);
    expect(titled).toContain(">Homepage hero</p>");
    const bare = renderToStaticMarkup(<PageDiffDetail {...({ propsApiVersion: 2 } as never)} />);
    expect(bare).toContain(">CMS page</p>");
  });

  it("draws the kind label on a floor whose title is not a text, and never throws on it", () => {
    for (const title of [{}, [], 42, true, "", "   "]) {
      for (const propsApiVersion of [2, 5]) {
        const input = { propsApiVersion, artifact: { title } } as never;
        let html = "";
        expect(() => {
          html = renderToStaticMarkup(<PageDiffDetail {...input} />);
        }).not.toThrow();
        expect(html).toContain(">CMS page</p>");
        expect(html).toContain('data-cms-detail-floor="content-unavailable"');
        expect(html).toContain(`data-renderer="${RENDERER}"`);
        expect(html).toContain(`data-props-api-version="${propsApiVersion}"`);
      }
    }
  });

  it("draws no download link, and never throws, on a floor whose download address is not a text or not an address", () => {
    const addresses = [{ toString: null, valueOf: null }, {}, [], 42, true, "javascript:alert(1)", "//other.example/x", ""];
    for (const download of addresses) {
      for (const propsApiVersion of [2, 5]) {
        for (const carried of [{ actions: { download } }, { bytes: { road: "session", preview: null, download } }, { urls: { preview: null, download } }]) {
          const input = { propsApiVersion, ...carried } as never;
          let html = "";
          expect(() => {
            html = renderToStaticMarkup(<PageDiffDetail {...input} />);
          }, JSON.stringify(carried)).not.toThrow();
          expect(html).toContain('data-cms-detail-floor="content-unavailable"');
          expect(html).toContain(`data-renderer="${RENDERER}"`);
          expect(html).toContain(`data-props-api-version="${propsApiVersion}"`);
          expect(html).not.toContain("data-cms-download");
          expect(html).not.toContain("href=");
        }
      }
    }
  });

  it("draws no download link on a floor whose http(s) download address a URL parser cannot read", () => {
    for (const download of ["https://example.com:99999/", "https://[::1/"]) {
      for (const propsApiVersion of [2, 5]) {
        const html = renderToStaticMarkup(<PageDiffDetail {...({ propsApiVersion, actions: { download } } as never)} />);
        expect(html, download).toContain('data-cms-detail-floor="content-unavailable"');
        expect(html, download).not.toContain("data-cms-download");
        expect(html, download).not.toContain("href=");
      }
    }
  });

  it("draws the download link for a path or an http(s) address the host gives, on a floor of either props version", () => {
    for (const address of ["/api/lifecycle-views/artifact-bytes?bc=sealed", "https://files.example.com/a"]) {
      for (const propsApiVersion of [2, 5]) {
        const html = renderToStaticMarkup(<PageDiffDetail {...({ propsApiVersion, actions: { download: address } } as never)} />);
        expect(html).toContain("data-cms-download");
        expect(html).toContain(`href="${address}"`);
      }
    }
  });

  it("draws no download link on a floor when the host gives no byte address", () => {
    const html = renderToStaticMarkup(
      <PageDiffDetail
        {...props(noContent("absent"), {
          urls: { preview: null, download: null },
          actions: { download: null, openInSource: null },
          bytes: { road: "session", preview: null, download: null },
        } as never)}
      />,
    );
    expect(html).toContain('data-cms-detail-floor="content-absent"');
    expect(html).not.toContain("data-cms-download");
    expect(html).not.toContain("href=");
  });

  it("still draws its header, and never throws, on a snapshot that is barely one", () => {
    const html = renderToStaticMarkup(<PageDiffDetail {...({ propsApiVersion: 2 } as never)} />);
    expect(html).toContain("data-cms-artifact-detail");
    expect(html).toContain('data-cms-detail-floor="content-unavailable"');
  });
});
