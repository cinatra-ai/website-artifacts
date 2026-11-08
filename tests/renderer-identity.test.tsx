// @vitest-environment node
// ONE PAGE RENDERER (cinatra#4366, specs/app-artifact-review.html §XI.7 and
// §XI.8): the WordPress page and the Drupal node a pointer names are one
// drawing, and everything this renderer draws names it on its root — the page
// of either system, a decision-only review snapshot and every floor alike.

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import PageDiffDetail from "../src/renderers/detail";
import { PAGE_FORMS, pageProps } from "./cms-page-fixture";
import { noContent, props } from "./props-fixture";

const RENDERER = "@cinatra-ai/website-artifacts:page-diff";

function renderers(html: string): string[] {
  return Array.from(html.matchAll(/\bdata-renderer="([^"]*)"/g), (match) => match[1]);
}

function rootRenderer(html: string): string | null {
  const root = /^<div\b([^>]*)>/.exec(html);
  if (root === null) return null;
  return /\bdata-renderer="([^"]*)"/.exec(root[1])?.[1] ?? null;
}

describe("the one page renderer names itself on the root of what it draws", () => {
  for (const fixture of PAGE_FORMS) {
    it(`on the ${fixture.system} page`, () => {
      const html = renderToStaticMarkup(<PageDiffDetail {...pageProps(fixture.form)} />);
      expect(html).toContain('data-cms-page="page"');
      expect(rootRenderer(html)).toBe(RENDERER);
      expect(renderers(html)).toEqual([RENDERER]);
    });

    it(`on the ${fixture.system} page handed as a decision-only review snapshot`, () => {
      const snapshot = {
        ...pageProps(fixture.form),
        propsApiVersion: 5,
        review: { reading: "pending" },
        edit: { kind: "read-only", channelVersion: 2, reason: "read-only-surface" },
      };
      const html = renderToStaticMarkup(<PageDiffDetail {...snapshot} />);
      expect(html).toContain('data-cms-page="page"');
      expect(rootRenderer(html)).toBe(RENDERER);
    });
  }

  it("draws the WordPress page and the Drupal page as one drawing, apart from the system and the CMS link", () => {
    const [wordpress, drupal] = PAGE_FORMS.map((fixture) =>
      renderToStaticMarkup(<PageDiffDetail {...pageProps(fixture.form)} />)
        .replace(`data-cms-system="${fixture.system}"`, 'data-cms-system="*"')
        .replace(fixture.cmsAddress.replace(/&/g, "&amp;"), "*"),
    );
    expect(wordpress).toBe(drupal);
  });

  it("on every floor", () => {
    const floors = [
      renderToStaticMarkup(<PageDiffDetail {...props(noContent("absent"))} />),
      renderToStaticMarkup(<PageDiffDetail {...pageProps({ "post.title": "New headline" })} />),
      renderToStaticMarkup(<PageDiffDetail {...({ propsApiVersion: 2 } as never)} />),
      renderToStaticMarkup(<PageDiffDetail {...({ ...pageProps(PAGE_FORMS[0].form), propsApiVersion: 9 } as never)} />),
    ];
    for (const html of floors) {
      expect(html).toContain("data-cms-detail-floor");
      expect(rootRenderer(html)).toBe(RENDERER);
      expect(renderers(html)).toEqual([RENDERER]);
    }
  });
});
