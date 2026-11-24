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
// ATTRIBUTES ONLY. The anchors change nothing a person can see: the display
// anchor sits on the root that is already drawn, and the continued reading
// draws no words (its sentence is a claim about what the site published, and
// the host hands no `review.effect`) and has no box of its own.

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
        `<p data-conformance-id="${ids.reading}" data-field="reading=review.reading" data-state="empty" style="display:contents"><span data-field="decision=review.decidedAt"></span></p></div>$`,
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
