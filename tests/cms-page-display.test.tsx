// @vitest-environment node
// The CMS page display (cinatra#3092), relocated into the one page renderer
// (cinatra#4366): one view drawn from the content alone — the frame's place
// (the page embedded in its frame, or the gap named there), beneath it only
// the changed excerpts in the page's own formatting, and a link that opens the
// page in the CMS. Every arm runs for both systems the form serves. Which
// address the frame requests is pinned in tests/page-form-rules.test.tsx.

import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { FRAME_WATCHDOG_MS, frameState } from "../src/cms-page-model";
import { contentFloorMessage, resolveArtifactTextView } from "../src/content-view";
import CmsSnapshotDetail from "../src/renderers/detail";
import { PAGE_ADDRESS, PAGE_FORMS, pageProps, withPage } from "./cms-page-fixture";

const GAP = "The page cannot be shown here. The changes are below.";

function all(html: string, pattern: RegExp): string[] {
  return Array.from(html.matchAll(pattern), (match) => match[1]);
}

const escapeHtml = (value: string): string => value.replace(/&/g, "&amp;");

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

for (const fixture of PAGE_FORMS) {
  describe(`the CMS page display — ${fixture.system}`, () => {
    const detail = (document: unknown = fixture.form): string =>
      renderToStaticMarkup(<CmsSnapshotDetail {...pageProps(document)} />);

    it("V1 draws one view: the frame's place, the changes, the link", () => {
      const fetchSpy = vi.fn();
      vi.stubGlobal("fetch", fetchSpy);
      const html = detail();
      expect(fetchSpy).not.toHaveBeenCalled();
      // The frame's place opens the view: the frame, or the gap named there.
      const place = /data-cms-page="page"[^>]*>(<iframe\b|<div role="status")/.exec(html);
      expect(place).not.toBeNull();
      expect(html).toContain(">Changes<");
      expect(html.indexOf(place![0])).toBeLessThan(html.indexOf(">Changes<"));
      const links = all(html, /<a\b([^>]*)>/g);
      expect(links).toHaveLength(1);
      expect(links[0]).toContain(`href="${escapeHtml(fixture.cmsAddress)}"`);
      expect(links[0]).toContain('target="_blank"');
      expect(links[0]).toContain('rel="noopener noreferrer"');
      expect(html).toContain(">Open in the CMS</a>");
      expect(html.indexOf(">Changes<")).toBeLessThan(html.indexOf("Open in the CMS"));
      expect(html).toContain(`data-cms-system="${fixture.system}"`);
      expect(html).toContain('data-cms-page="page"');
      expect(html).toContain('data-revision="rev_1"');
    });

    it("V2 draws a heading as a heading, a paragraph as a paragraph, a list item as a list item", () => {
      const html = detail();
      expect(all(html, /<[a-z]+\b[^>]*role="heading"[^>]*aria-level="(\d)"/g)).toEqual(["1"]);
      expect(html).toMatch(/<p\b[^>]*data-cms-excerpt="paragraph"/);
      expect(html).toMatch(/<ul\b[^>]*>\s*<li\b[^>]*data-cms-excerpt="list-item"/);
      const heading = html.indexOf('role="heading"');
      const paragraph = html.indexOf('data-cms-excerpt="paragraph"');
      const item = html.indexOf('data-cms-excerpt="list-item"');
      expect(heading).toBeLessThan(paragraph);
      expect(paragraph).toBeLessThan(item);
    });

    it("V3 marks what the change removes and adds in place", () => {
      const html = detail();
      expect(all(html, /<del\b[^>]*>([^<]*)<\/del>/g).map((t) => t.trim())).toEqual([
        "Pricing that grows with you",
        "a price held since 2024,",
        "35",
      ]);
      expect(all(html, /<ins\b[^>]*>([^<]*)<\/ins>/g).map((t) => t.trim())).toEqual([
        "Pricing — 2026 plans",
        "one price change,",
        "39",
      ]);
      expect(html).toContain("Three plans, ");
      expect(html).toContain("and the migration note under each.");
    });

    it("V4 draws the elision between excerpts that are not adjacent", () => {
      const html = detail();
      expect(all(html, /<[a-z]+\b[^>]*aria-hidden="true"[^>]*>(…)</g)).toEqual(["…", "…"]);
    });

    it("V5 names the gap in the frame's place where the page has no framable address", () => {
      const html = detail(withPage(fixture, { address: "http://acme.example/pricing" }));
      expect(html).not.toContain("<iframe");
      expect(html).toMatch(new RegExp(`role="status"[^>]*>${GAP}<`));
      expect(html.indexOf(GAP)).toBeLessThan(html.indexOf(">Changes<"));
      expect(all(html, /<del\b[^>]*>([^<]*)<\/del>/g)).toHaveLength(3);
      expect(html).toContain(">Open in the CMS</a>");
    });

    it("V6 names the gap once the watchdog elapses without a load", () => {
      expect(FRAME_WATCHDOG_MS).toBe(10000);
      expect(frameState({ address: PAGE_ADDRESS, loaded: false, elapsedMs: 10000 })).toBe("gap");
      expect(frameState({ address: PAGE_ADDRESS, loaded: false, elapsedMs: 9999 })).toBe("frame");
      expect(frameState({ address: PAGE_ADDRESS, loaded: true, elapsedMs: 10000 })).toBe("frame");
      expect(frameState({ address: null, loaded: false, elapsedMs: 0 })).toBe("gap");
    });

    it("V7 draws no link without a CMS address", () => {
      for (const cmsAddress of [undefined, "javascript:alert(1)", "http://acme.example/node/7/edit"]) {
        const html = detail(withPage(fixture, { cmsAddress }));
        expect(html).not.toContain("<a ");
        expect(html).not.toContain("Open in the CMS");
        expect(html).toContain('data-cms-page="page"');
      }
    });

    it("V8 draws no tab strip, no heading of its own, no button and no Verified", () => {
      const html = detail();
      expect(html).not.toContain('role="tab');
      expect(html).not.toMatch(/<h[1-6]\b/);
      expect(all(html, /role="(heading)"/g)).toHaveLength(1);
      expect(html).not.toContain("<button");
      expect(html).not.toMatch(/verified/i);
      expect(html).not.toMatch(/continued/i);
      expect(html).not.toContain("@cinatra-ai/cms-snapshot-artifact");
    });

    it("V9 draws a named floor for a JSON document that is not the form and for a cut projection", () => {
      const other = detail({ "post.title": "New headline" });
      expect(other).toContain('data-cms-detail-floor="content-not-page"');
      expect(contentFloorMessage("content-not-page")).toBe(
        "This artifact holds a document that is not a CMS page, so this view has nothing to draw.",
      );
      expect(other).toContain(contentFloorMessage("content-not-page"));

      const whole = JSON.stringify(fixture.form);
      const prefix = whole.slice(0, 40);
      const cut = renderToStaticMarkup(
        <CmsSnapshotDetail
          {...pageProps(prefix, {
            truncated: true,
            byteLength: Buffer.byteLength(whole, "utf8"),
            projectedByteLength: Buffer.byteLength(prefix, "utf8"),
          })}
        />,
      );
      expect(cut).toContain('data-cms-detail-floor="content-over-cap"');
      expect(cut).not.toContain("<iframe");

      // A cut document is named as cut even when its prefix is only spacing.
      const blank = renderToStaticMarkup(
        <CmsSnapshotDetail
          {...pageProps(" ", { truncated: true, byteLength: Buffer.byteLength(whole, "utf8"), projectedByteLength: 1 })}
        />,
      );
      expect(blank).toContain('data-cms-detail-floor="content-over-cap"');
    });

    const withExcerpts = (excerpts: unknown[]): Record<string, unknown> => ({ ...fixture.form, excerpts });
    const textOf = (fragment: string): string => fragment.replace(/<[^>]*>/g, "").replace(/&amp;/g, "&");
    const blockText = (html: string, pattern: RegExp): string => {
      const found = html.match(pattern);
      expect(found).not.toBeNull();
      return textOf(found![0]);
    };
    const HEADING = /<div\b[^>]*role="heading"[^>]*>.*?<\/div>/s;
    const PARAGRAPH = /<p\b[^>]*data-cms-excerpt="paragraph"[^>]*>.*?<\/p>/s;
    const LIST_ITEM = /<li\b[^>]*data-cms-excerpt="list-item"[^>]*>.*?<\/li>/s;

    it("V11 draws the list excerpt with its list marker", () => {
      const lists = all(detail(), /<ul\b([^>]*)>/g);
      expect(lists).toHaveLength(1);
      expect(lists[0]).toContain("list-style-type:disc");
    });

    it("V12 separates the struck heading from the added heading by ONE space", () => {
      expect(blockText(detail(), HEADING)).toBe("Pricing that grows with you Pricing — 2026 plans");
    });

    it("V13 separates a struck word from the word added after it by ONE space in a paragraph and in a list item", () => {
      const html = detail(
        withExcerpts([
          { region: "content", position: 0, kind: "paragraph", published: "Order now", proposed: "Order today" },
          { region: "content", position: 1, kind: "list-item", published: "Ships Monday", proposed: "Ships Friday" },
        ]),
      );
      expect(blockText(html, PARAGRAPH)).toBe("Order now today");
      expect(blockText(html, LIST_ITEM)).toBe("Ships Monday Friday");
      expect(all(html, /<del\b[^>]*>([^<]*)<\/del>/g)).toEqual(["now", "Monday"]);
      expect(all(html, /<ins\b[^>]*>([^<]*)<\/ins>/g)).toEqual(["today", "Friday"]);
    });

    it("V14 keeps the spacing of a run that already carries its own space: never two spaces", () => {
      const html = detail();
      expect(blockText(html, PARAGRAPH)).toBe(
        "Three plans, a price held since 2024, one price change, and the migration note under each.",
      );
      expect(blockText(html, LIST_ITEM)).toBe("Team — 35 39 per seat");
      for (const kind of [HEADING, PARAGRAPH, LIST_ITEM]) expect(blockText(html, kind)).not.toMatch(/ {2}/);
    });
  });
}

for (const fixture of PAGE_FORMS) {
  describe(`decision-only detail snapshots — ${fixture.system}`, () => {
    const render = (snapshot: ReturnType<typeof pageProps>): string =>
      renderToStaticMarkup(<CmsSnapshotDetail {...snapshot} />);
    const v5 = (review: unknown = { reading: "continued", openLive: PAGE_ADDRESS, decidedAt: "2026-10-07T09:20:00.000Z" }, document: unknown = fixture.form) => ({
      ...pageProps(document),
      propsApiVersion: 5,
      review,
      edit: { kind: "read-only", channelVersion: 2, reason: "read-only-surface" },
    });
    const normalizeVersion = (html: string): string => html.replace('data-props-api-version="5"', 'data-props-api-version="2"');
    const assertNoPublicationSentence = (html: string): void => {
      expect(html).not.toContain("The change went to the site");
      expect(html).not.toContain("published it at");
      expect(html).not.toContain("cms-page-continued-reading");
      expect(html).not.toContain("09:20");
      expect(html).not.toMatch(/continued|decided on the revision above/i);
    };

    it("admits v5 while retaining the complete legacy view, frozen input and read-only controls", () => {
      const snapshot = v5();
      const before = JSON.stringify(snapshot);
      const fetchSpy = vi.fn();
      vi.stubGlobal("fetch", fetchSpy);
      const html = render(snapshot);
      expect(html).toContain('data-props-api-version="5"');
      expect(html).not.toContain("data-cms-detail-floor");
      expect(normalizeVersion(html)).toBe(render(pageProps(fixture.form)));
      expect(html).toContain('data-cms-page="page"');
      expect(html).toContain("data-cms-page-excerpts");
      expect(all(html, /<del\b[^>]*>([^<]*)<\/del>/g)).toHaveLength(3);
      expect(all(html, /<ins\b[^>]*>([^<]*)<\/ins>/g)).toHaveLength(3);
      expect(all(html, /<a\b([^>]*)>/g)).toHaveLength(1);
      expect(html).toContain(`href="${escapeHtml(fixture.cmsAddress)}"`);
      expect(html).toContain("Open in the CMS");
      expect(html).not.toMatch(/<button|<input|<textarea|contenteditable/i);
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(JSON.stringify(snapshot)).toBe(before);
      assertNoPublicationSentence(html);
    });

    it("never derives a publication sentence from decision-only, malformed or unassigned review facts", () => {
      const reviews: unknown[] = [
        undefined, null, {},
        { reading: "continued", openLive: PAGE_ADDRESS },
        { reading: "continued", openLive: PAGE_ADDRESS, decidedAt: null },
        { reading: "continued", openLive: PAGE_ADDRESS, decidedAt: "not a time" },
        { reading: "pending", openLive: null, decidedAt: "2026-10-07T09:20:00.000Z" },
        { reading: "rejected", decidedAt: "2026-10-07T09:20:00.000Z" },
        { reading: "superseded", decidedAt: "2026-10-07T09:20:00.000Z" },
        { reading: "continued", decidedAt: "2026-10-07T09:20:00.000Z", effect: { recordedAt: "2026-10-08T09:20:00.000Z", record: { published: true, publishedAt: "2026-10-08T09:20:00.000Z" } } },
      ];
      for (const review of reviews) {
        const html = render({ ...v5(), review });
        expect(html).toContain("data-cms-page-excerpts");
        expect(html).toContain("Open in the CMS");
        assertNoPublicationSentence(html);
      }
    });

    it("does not treat authored fields or ordinary timestamps as remote publication facts", () => {
      const authored = { ...fixture.form, publishedAt: "2026-10-08T09:20:00.000Z", publicationStatus: "published", review: { effect: { publishedAt: "2026-10-08T09:20:00.000Z" } }, readAt: "2026-10-06T07:11:00.000Z" };
      const snapshot = v5(undefined, authored);
      snapshot.artifact = { ...snapshot.artifact, createdAt: "2026-10-05T04:02:00.000Z", updatedAt: "2026-10-06T05:03:00.000Z" };
      const html = render(snapshot);
      expect(normalizeVersion(html)).toBe(render(pageProps(fixture.form)));
      assertNoPublicationSentence(html);
      for (const time of [snapshot.artifact.createdAt, snapshot.artifact.updatedAt, authored.readAt]) expect(html).not.toContain(time);
    });

    it("keeps strict content floors when v5 carries cut, mismatched or invalid content", () => {
      const whole = JSON.stringify(fixture.form);
      const cases = [
        { overrides: { truncated: true, text: whole.slice(0, 40), byteLength: Buffer.byteLength(whole), projectedByteLength: 40 }, reason: "content-over-cap" },
        { overrides: { representationRevisionId: "another-revision" }, reason: "content-revision-mismatch" },
        { overrides: { channelVersion: 2 }, reason: "channel-version" },
        { overrides: { cap: 0 }, reason: "invalid-content-projection" },
        { overrides: { projectedByteLength: -1 }, reason: "invalid-content-projection" },
      ];
      for (const { overrides, reason } of cases) {
        const snapshot = v5();
        snapshot.content = { ...snapshot.content, ...overrides } as typeof snapshot.content;
        const html = render(snapshot);
        expect(html).toContain(`data-cms-detail-floor="${reason}"`);
        expect(html).not.toContain("<iframe");
        expect(html).not.toContain("Open in the CMS");
        assertNoPublicationSentence(html);
      }
    });

    it("leaves the shared resolver strictly at v2 and refuses unknown detail versions", () => {
      const legacy = pageProps(fixture.form);
      expect(render(legacy)).toContain('data-props-api-version="2"');
      expect(resolveArtifactTextView(v5())).toEqual({ kind: "floor", reason: "props-version" });
      for (const version of [undefined, 1, 3, 4, 6, 99, "5", Number.NaN]) {
        const snapshot = { ...legacy, propsApiVersion: version } as ReturnType<typeof pageProps>;
        const html = render(snapshot);
        expect(html).toContain('data-cms-detail-floor="props-version"');
        expect(html).not.toContain("<iframe");
        assertNoPublicationSentence(html);
      }
    });
  });
}
