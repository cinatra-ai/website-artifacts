// @vitest-environment node
// The conformance anchors of the page display (cinatra#3092,
// specs/app-artifact-review.html §XI.8 and §XI.7). The drawing names the
// display of a WordPress page `cms-page-display` and of a Drupal page
// `drupal-page-display`: one renderer, one drawing, and only the platform tells
// them apart. Once the review is continued, the drawing puts the continued
// reading (`cms-page-continued-reading`, `drupal-page-continued-reading`) last
// inside the display, under Open in the CMS: a paragraph binding
// `reading=review.reading` in the `empty` state, with the decision time's span.
//
// NOTHING A PERSON CAN SEE. The display anchor sits on the root that is already
// drawn. The continued reading draws no words (its sentence is a claim about
// what the site published, and the host hands no `review.effect`) and takes no
// part in the layout: the display's root is a flex column with a gap, so the
// anchor is out of the flow with no size, and none of its children is an item of
// that column. The markup tests cannot see layout, so the layout tests below
// assert the structural facts that decide it.

import { isValidElement, type CSSProperties, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import CmsSnapshotDetail from "../src/renderers/detail";
import type { ArtifactRendererProps } from "../src/renderer-props";
import { PAGE_FORMS, pageProps } from "./cms-page-fixture";
import { noContent, props } from "./props-fixture";

const DECIDED_AT = "2026-10-07T09:35:30.000Z";
const PENDING = { reading: "pending", openLive: null } as const;
const CONTINUED = { reading: "continued", openLive: null, decidedAt: DECIDED_AT } as const;
const CONTINUED_WITHOUT_TIME = { reading: "continued", openLive: null } as const;

/** The review snapshot a host hands this display: version 5, with the reading. */
function reviewSnapshot(base: ArtifactRendererProps, review?: unknown): ArtifactRendererProps {
  return { ...base, propsApiVersion: 5, ...(review === undefined ? {} : { review }) } as ArtifactRendererProps;
}

function draw(snapshot: ArtifactRendererProps): string {
  return renderToStaticMarkup(<CmsSnapshotDetail {...snapshot} />);
}

function count(html: string, id: string): number {
  return html.split(`data-conformance-id="${id}"`).length - 1;
}

const IDS = {
  wordpress: { display: "cms-page-display", reading: "cms-page-continued-reading" },
  drupal: { display: "drupal-page-display", reading: "drupal-page-continued-reading" },
} as const;

for (const fixture of PAGE_FORMS) {
  const ids = IDS[fixture.system];
  const other = IDS[fixture.system === "wordpress" ? "drupal" : "wordpress"];

  describe(`the page display's anchors — ${fixture.system}`, () => {
    it.each([
      { name: "while the review is open", review: PENDING },
      { name: "once the review is continued", review: CONTINUED },
      { name: "where no review stands", review: undefined },
    ])(`names the display ${ids.display} on its root, $name`, ({ review }) => {
      const html = draw(reviewSnapshot(pageProps(fixture.form), review));
      expect(count(html, ids.display)).toBe(1);
      expect(count(html, other.display)).toBe(0);
      // The root, the element already drawn: the anchor is on it, nothing wraps it.
      expect(html).toMatch(new RegExp(`^<div [^>]*data-conformance-id="${ids.display}"[^>]*data-cms-artifact-detail`));
    });

    it("names the display on a version 2 snapshot too", () => {
      expect(count(draw(pageProps(fixture.form)), ids.display)).toBe(1);
    });

    it(`draws ${ids.reading} last inside the display once the review is continued, with no words`, () => {
      const html = draw(reviewSnapshot(pageProps(fixture.form), CONTINUED));
      expect(count(html, ids.reading)).toBe(1);
      expect(count(html, other.reading)).toBe(0);
      const reading = new RegExp(
        `<p data-conformance-id="${ids.reading}" data-field="reading=review.reading" data-state="empty" style="position:absolute;width:0;height:0;margin:0;padding:0;border:0;overflow:hidden"><span data-field="decision=review.decidedAt"></span></p></div>$`,
      );
      expect(html).toMatch(reading);
      // Under Open in the CMS, and the view itself is drawn as before.
      expect(html.indexOf("Open in the CMS")).toBeLessThan(html.indexOf(ids.reading));
      expect(html).toContain('data-cms-page="page"');
    });

    it.each([
      { name: "none", review: CONTINUED_WITHOUT_TIME },
      { name: "one that is not an instant", review: { ...CONTINUED, decidedAt: "not a time" } },
    ])("binds no decision time when the host handed $name", ({ review }) => {
      const html = draw(reviewSnapshot(pageProps(fixture.form), review));
      expect(count(html, ids.reading)).toBe(1);
      expect(html).not.toContain("decision=review.decidedAt");
    });

    it.each([
      { name: "while the review is open", review: PENDING },
      { name: "where no review stands", review: undefined },
    ])(`draws no continued reading $name`, ({ review }) => {
      const html = draw(reviewSnapshot(pageProps(fixture.form), review));
      expect(count(html, ids.reading)).toBe(0);
      expect(html).not.toContain("reading=review.reading");
    });

    it("draws no continued reading below the review snapshot's version", () => {
      const html = draw({ ...pageProps(fixture.form), review: CONTINUED } as ArtifactRendererProps);
      expect(count(html, ids.reading)).toBe(0);
    });
  });
}

describe("the page display's anchors on a floor", () => {
  it("names the CMS page display on the floor's root, and draws no continued reading", () => {
    const html = draw(reviewSnapshot(props(noContent("absent")), CONTINUED));
    expect(html).toContain("data-cms-detail-floor");
    expect(count(html, "cms-page-display")).toBe(1);
    expect(html).toMatch(/^<div [^>]*data-conformance-id="cms-page-display"[^>]*data-cms-artifact-detail/);
    expect(count(html, "cms-page-continued-reading")).toBe(0);
    expect(count(html, "drupal-page-continued-reading")).toBe(0);
  });
});

// THE LAYOUT. The display's root is a flex column with a gap. An element in the
// flow among its children is an item of the column and adds a gap; an element
// out of the flow is not an item. jsdom and the server renderer have no layout,
// so the facts that decide it are read from the element tree the renderer
// returns: the root's children, and the style each one carries.

type Element = ReactElement<{ style?: CSSProperties; children?: ReactNode; [key: string]: unknown }>;

/** The element tree one level down: a component element is called, as React
 * would, to the element it returns. */
function expand(node: ReactNode): ReactNode {
  if (isValidElement(node) && typeof node.type === "function") {
    return (node.type as (props: unknown) => ReactNode)(node.props);
  }
  return node;
}

function childrenOf(node: ReactNode): ReactNode[] {
  const children = isValidElement(node) ? (node.props as { children?: ReactNode }).children : undefined;
  return (Array.isArray(children) ? children.flat() : [children]).filter(
    (child) => child !== null && child !== undefined && child !== false,
  );
}

function outOfFlow(style: CSSProperties | undefined): boolean {
  return style?.position === "absolute" || style?.position === "fixed" || style?.display === "none";
}

/** The root's children that are items of its flex column: not out of the flow.
 * A box with `display: contents` has no box, so its children are the items. */
function items(snapshot: ArtifactRendererProps): ReactNode[] {
  const root = CmsSnapshotDetail(snapshot) as Element;
  expect(root.props.style?.display).toBe("flex");
  const itemsOf = (nodes: ReactNode[]): ReactNode[] =>
    nodes.flatMap((node) => {
      const drawn = expand(node);
      // A component that draws nothing (null) is no item either.
      if (drawn === null || drawn === undefined || drawn === false) return [];
      if (!isValidElement(drawn)) return [drawn];
      const style = (drawn as Element).props.style;
      if (outOfFlow(style)) return [];
      return style?.display === "contents" ? itemsOf(childrenOf(drawn)) : [node];
    });
  return itemsOf(childrenOf(root));
}

function anchorOf(snapshot: ArtifactRendererProps): Element {
  const root = CmsSnapshotDetail(snapshot) as Element;
  const found = childrenOf(root).map(expand).filter(
    (drawn) => isValidElement(drawn) && (drawn as Element).props["data-field"] === "reading=review.reading",
  );
  expect(found).toHaveLength(1);
  return found[0] as Element;
}

for (const fixture of PAGE_FORMS) {
  const ids = IDS[fixture.system];

  describe(`the continued reading takes no part in the layout — ${fixture.system}`, () => {
    it("leaves the display's flex column with the same items as while the review is open", () => {
      const open = items(reviewSnapshot(pageProps(fixture.form), PENDING));
      const continued = items(reviewSnapshot(pageProps(fixture.form), CONTINUED));
      expect(open).toHaveLength(1);
      expect(continued.map((item) => (isValidElement(item) ? item.type : item))).toEqual(
        open.map((item) => (isValidElement(item) ? item.type : item)),
      );
    });

    it.each([
      { name: "with the decision time", review: CONTINUED },
      { name: "without a decision time", review: CONTINUED_WITHOUT_TIME },
    ])("is out of the flow, with no size and no children that could be items, $name", ({ review }) => {
      const anchor = anchorOf(reviewSnapshot(pageProps(fixture.form), review));
      const style = anchor.props.style;
      expect(anchor.props["data-conformance-id"]).toBe(ids.reading);
      expect(outOfFlow(style)).toBe(true);
      expect(style).toMatchObject({ position: "absolute", width: 0, height: 0, margin: 0, padding: 0, border: 0, overflow: "hidden" });
      // A block with inline children: it is no flex or grid container, and no
      // child lifts its own display, so none is an item of the column above.
      expect(style?.display).toBeUndefined();
      for (const child of childrenOf(anchor)) {
        expect(isValidElement(child) && typeof child.type === "string").toBe(true);
        expect((child as Element).props.style).toBeUndefined();
        expect(childrenOf(child)).toEqual([]);
      }
    });

    it("changes the markup by that one element and nothing else", () => {
      const open = draw(reviewSnapshot(pageProps(fixture.form), PENDING));
      const continued = draw(reviewSnapshot(pageProps(fixture.form), CONTINUED));
      const anchor =
        `<p data-conformance-id="${ids.reading}" data-field="reading=review.reading" data-state="empty" ` +
        `style="position:absolute;width:0;height:0;margin:0;padding:0;border:0;overflow:hidden">` +
        `<span data-field="decision=review.decidedAt"></span></p>`;
      expect(open.endsWith("</div>")).toBe(true);
      expect(continued).toBe(`${open.slice(0, -"</div>".length)}${anchor}</div>`);
    });
  });
}
