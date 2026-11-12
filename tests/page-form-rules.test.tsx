// @vitest-environment node
// The rules the page content form is read by, beyond its shape: which address
// the page frame may request, and which excerpts count as changes in page
// order. The frame is the one load the page view can cause, at an address the
// agent's content gives, so these rules decide where a reviewer's browser may
// be sent first: the frame-address rule reads the first address as text, a
// text that starts with https:// so that a browser resolving it against the
// reviewer's page reads the origin the rule read, and the frame requests it
// only on the origin of the site the page view is handed, which the detail
// display hands it from no content.

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { framableAddress, parseCmsPage } from "../src/cms-page-model";
import * as pkg from "../src/index";
import { CmsPageView } from "../src/cms-page-view";
import PageDiffDetail from "../src/renderers/detail";
import { PAGE_ADDRESS, PAGE_FORMS, PAGE_TITLE, WORDPRESS_FORM, pageProps, withPage } from "./cms-page-fixture";

const text = (value: unknown): string => JSON.stringify(value);

const detail = (document: unknown): string => renderToStaticMarkup(<PageDiffDetail {...pageProps(document)} />);

function framedAddress(address: string): string | null {
  const parsed = parseCmsPage(text(withPage(WORDPRESS_FORM, { address })));
  expect(parsed.ok, address).toBe(true);
  return parsed.ok ? parsed.page.page.address : "unparsed";
}

/** The page view handed the page at this address, with no parser between, and
 * the site a host binds (any value, as a test hands it). */
function viewed(address: unknown, site: unknown): string {
  const parsed = parseCmsPage(text(WORDPRESS_FORM.form));
  expect(parsed.ok).toBe(true);
  if (!parsed.ok) return "unparsed";
  const page = { ...parsed.page, page: { ...parsed.page.page, address: address as string | null } };
  return renderToStaticMarkup(<CmsPageView page={page} revisionId="rev_1" site={site as string | null} />);
}

/** The origin of an address as a URL parser writes it, or the text itself when
 * no URL parser reads it. */
function originOf(address: string): string {
  try {
    return new URL(address).origin;
  } catch {
    return address;
  }
}

function withExcerpts(excerpts: Array<Record<string, unknown>>): Record<string, unknown> {
  return { ...WORDPRESS_FORM.form, excerpts };
}

/** An IPv4 address in dotted form, built from its parts so no address is spelled in the source. */
const quad = (...parts: number[]): string => parts.join(".");
const LOOPBACK = quad(127, 0, 0, 1);

const paragraph = (region: string, position: number, published: string, proposed: string): Record<string, unknown> => ({
  region,
  position,
  kind: "paragraph",
  published,
  proposed,
});

describe("the frame-address rule refuses a first address at an IP literal, at localhost or home.arpa or a name under .localhost, .local, .internal or .home.arpa, at a one-label name or a name with an empty label, or at a port other than the default 443", () => {
  it("draws the gap, and no frame, for an https address at an IP literal", () => {
    for (const address of [
      `https://${LOOPBACK}/`,
      `https://${quad(10, 0, 0, 1)}/admin?delete=1`,
      `https://${quad(192, 168, 1, 1)}/`,
      `https://${quad(169, 254, 169, 254)}/latest`,
      "https://2130706433/",
      "https://[::1]/",
      `https://[::ffff:${LOOPBACK}]/`,
      "https://[fe80::1]/",
      `https://${quad(127, 1)}/`,
      "https://0x7f.1/",
    ]) {
      expect(framedAddress(address), address).toBeNull();
      const html = detail(withPage(WORDPRESS_FORM, { address }));
      expect(html, address).toContain('data-cms-page="page"');
      expect(html, address).not.toContain("<iframe");
      expect(html, address).toContain("data-cms-page-gap");
      // Refused by the rule itself: a site of the same origin does not admit it.
      const bound = viewed(address, originOf(address));
      expect(bound, address).not.toContain("<iframe");
      expect(bound, address).toContain("data-cms-page-gap");
    }
  });

  it("draws the gap, and no frame, for localhost, home.arpa, a name under .localhost, .local, .internal or .home.arpa, a one-label name, an empty label or a port other than 443", () => {
    for (const address of [
      "https://localhost/",
      "https://LOCALHOST/",
      "https://localhost./",
      "https://admin.localhost/",
      "https://printer.local/",
      "https://db.internal/",
      "https://nas.home.arpa/",
      "https://home.arpa/",
      "https://intranet/",
      "https://a..b.example/",
      "https://acme.example:8443/pricing",
    ]) {
      expect(framedAddress(address), address).toBeNull();
      const html = detail(withPage(WORDPRESS_FORM, { address }));
      expect(html, address).not.toContain("<iframe");
      expect(html, address).toContain("data-cms-page-gap");
      const bound = viewed(address, originOf(address));
      expect(bound, address).not.toContain("<iframe");
      expect(bound, address).toContain("data-cms-page-gap");
    }
  });

  it("applies the same rule to a page handed to the page view without the parser, and exports it from the package", () => {
    const html = viewed(`https://${LOOPBACK}/`, `https://${LOOPBACK}`);
    expect(html).not.toContain("<iframe");
    expect(html).toContain("data-cms-page-gap");
    // The package exports the rule the view applies, beside the framable-address
    // rule of the CMS link, so a consumer of the model can read the frame's rule.
    expect(pkg.frameAddress(`https://${LOOPBACK}/`)).toBeNull();
    expect(pkg.frameAddress(PAGE_ADDRESS)).toBe(PAGE_ADDRESS);
  });

  it("still frames the page at a name of two labels or more, on the default port", () => {
    for (const address of [PAGE_ADDRESS, "https://acme.example:443/pricing", "https://www.acme.example./pricing"]) {
      expect(framedAddress(address), address).toBe(address);
      const html = viewed(address, originOf(address));
      expect(html.match(/<iframe\b/g) ?? [], address).toHaveLength(1);
      expect(html, address).toContain(`src="${address}"`);
      expect(html, address).toContain(`title="${PAGE_TITLE}"`);
    }
  });
});

describe("the page frame requests a first address only on the origin of the site the host binds", () => {
  it("draws the gap, and no frame, through the detail display, which no snapshot hands a site, at an address the frame-address rule admits", () => {
    for (const fixture of PAGE_FORMS) {
      for (const address of [
        PAGE_ADDRESS,
        "https://acme.example:443/pricing",
        "https://router.lan/admin?delete=1",
        "https://intranet.corp/",
        `https://${LOOPBACK}.nip.io/`,
      ]) {
        const parsed = parseCmsPage(text(withPage(fixture, { address })));
        expect(parsed.ok && parsed.page.page.address, address).toBe(address);
        const html = detail(withPage(fixture, { address }));
        expect(html, address).toContain('data-cms-page="page"');
        expect(html, address).not.toContain("<iframe");
        expect(html, address).toContain("data-cms-page-gap");
        expect(html, address).not.toMatch(/\bsrc=/);
        expect(html, address).toContain(">Changes<");
      }
    }
  });

  it("frames the address only when the page view is handed a site of the same origin", () => {
    for (const site of ["https://acme.example", "https://acme.example/", "https://acme.example/another/page", "https://ACME.example", "https://acme.example:443"]) {
      const html = viewed(PAGE_ADDRESS, site);
      expect(html.match(/<iframe\b/g) ?? [], site).toHaveLength(1);
      expect(html, site).toContain(`src="${PAGE_ADDRESS}"`);
    }
    for (const site of [
      null,
      undefined,
      "",
      "https://other.example",
      "https://www.acme.example",
      "https://example",
      "https://acme.example.",
      "https://acme.example:8443",
      "http://acme.example",
      "https://editor@acme.example",
      ["https://editor", "secret@acme.example"].join(":"),
      "acme.example",
      "not an address",
      { origin: "https://acme.example" },
      ["https://acme.example"],
      42,
    ]) {
      const html = viewed(PAGE_ADDRESS, site);
      expect(html, String(site)).not.toContain("<iframe");
      expect(html, String(site)).toContain("data-cms-page-gap");
    }
  });

  it("exports the site-bound rule from the package, beside the frame-address rule", () => {
    const bound = (pkg as Record<string, unknown>).boundFrameAddress;
    expect(typeof bound).toBe("function");
    if (typeof bound !== "function") return;
    expect(bound(PAGE_ADDRESS, "https://acme.example")).toBe(PAGE_ADDRESS);
    expect(bound(PAGE_ADDRESS, null)).toBeNull();
    expect(bound(PAGE_ADDRESS, "https://other.example")).toBeNull();
    expect(bound(`https://${LOOPBACK}/`, `https://${LOOPBACK}`)).toBeNull();
    expect(bound(null, "https://acme.example")).toBeNull();
  });
});

/** The reviewer's page that a frame or a link is drawn on, and its origin. */
const REVIEW_PAGE = "https://app.example/review/7";
const REVIEW_ORIGIN = "https://app.example";
const SITE = "https://acme.example";

/** https texts without their two slashes. A URL parser without a base reads
 * each on acme.example; a browser resolves each against the page that draws
 * it, on that page's own origin. */
const SLASHLESS_FORMS = ["https:acme.example/pricing", "https:/acme.example/../api/artifacts/1", "https:\\acme.example\\pricing"];

/** https addresses with a space or a tab before them. */
const PREFIXED_FORMS = [` ${PAGE_ADDRESS}`, `\t${PAGE_ADDRESS}`];

/** The address a browser requests for the frame this markup draws: the frame's
 * src, resolved against the reviewer's page as a browser resolves it. Null
 * when no frame is drawn. */
function requestedBy(html: string): string | null {
  const match = /<iframe\b[^>]*?\ssrc="([^"]*)"/.exec(html);
  if (match === null) return null;
  const src = match[1]
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
  return new URL(src, REVIEW_PAGE).href;
}

describe("an address the rules admit is a text that starts with https://, so a browser that resolves it against the reviewer's page requests the origin the rules read", () => {
  it("refuses a first address that does not start with https://, through the rules, the parser and the page view, and binds no site so written", () => {
    for (const address of SLASHLESS_FORMS) {
      // The premise: without a base the address reads on the site, and against
      // the reviewer's page it reads on that page's own origin.
      expect(new URL(address).origin, address).toBe(SITE);
      expect(new URL(address, REVIEW_PAGE).origin, address).toBe(REVIEW_ORIGIN);
    }
    for (const address of [...SLASHLESS_FORMS, ...PREFIXED_FORMS]) {
      expect(framableAddress(address), address).toBeNull();
      expect(pkg.frameAddress(address), address).toBeNull();
      expect(pkg.boundFrameAddress(address, SITE), address).toBeNull();
      expect(framedAddress(address), address).toBeNull();
      const html = viewed(address, SITE);
      expect(html, address).not.toContain("<iframe");
      expect(html, address).toContain("data-cms-page-gap");
      // A site written so binds nothing either.
      expect(pkg.boundFrameAddress(PAGE_ADDRESS, address), address).toBeNull();
      expect(viewed(PAGE_ADDRESS, address), address).not.toContain("<iframe");
    }
  });

  it("frames only an address that a browser, resolving it against the reviewer's page, requests on the origin of the site the page view is handed", () => {
    for (const address of [PAGE_ADDRESS, ...SLASHLESS_FORMS, ...PREFIXED_FORMS]) {
      const requested = requestedBy(viewed(address, SITE));
      if (requested !== null) expect(new URL(requested).origin, address).toBe(SITE);
    }
    // Not vacuous: the page's own address is framed, and requested as written.
    expect(requestedBy(viewed(PAGE_ADDRESS, SITE))).toBe(PAGE_ADDRESS);
  });

  it("draws no CMS link for a CMS address that does not start with https://, on the page of either system", () => {
    for (const fixture of PAGE_FORMS) {
      // The fixture's own CMS address still draws the link.
      expect(detail(fixture.form)).toContain("data-cms-open");
      for (const cmsAddress of [...SLASHLESS_FORMS, ...PREFIXED_FORMS]) {
        const parsed = parseCmsPage(text(withPage(fixture, { cmsAddress })));
        expect(parsed.ok, cmsAddress).toBe(true);
        expect(parsed.ok ? parsed.page.page.cmsAddress : "unparsed", cmsAddress).toBeNull();
        const html = detail(withPage(fixture, { cmsAddress }));
        expect(html, cmsAddress).toContain('data-cms-page="page"');
        expect(html, cmsAddress).not.toContain("data-cms-open");
        // The page view applies the rule itself, to a page handed without the parser.
        const page = parseCmsPage(text(fixture.form));
        expect(page.ok).toBe(true);
        if (!page.ok) continue;
        const handed = { ...page.page, page: { ...page.page.page, cmsAddress } };
        const view = renderToStaticMarkup(<CmsPageView page={handed} revisionId="rev_1" site={null} />);
        expect(view, cmsAddress).not.toContain("data-cms-open");
      }
    }
  });

  it("still frames an address whose scheme is written in capitals, and binds a site written in Unicode to the same name written in punycode", () => {
    const capitals = "HTTPS://acme.example/pricing";
    expect(framedAddress(capitals)).toBe(capitals);
    expect(requestedBy(viewed(capitals, SITE))).toBe(PAGE_ADDRESS);
    const punycode = "https://xn--bcher-kva.example/preise";
    expect(requestedBy(viewed(punycode, "https://bücher.example"))).toBe(punycode);
  });
});

describe("the form carries only changed excerpts, in page order within a region", () => {
  const malformed = { ok: false, reason: "malformed" };

  it("names a form with an excerpt whose two sides hold the same words as malformed", () => {
    for (const [published, proposed] of [
      ["same", "same"],
      ["", ""],
      ["Same words here.", "Same  words\nhere. "],
    ]) {
      const form = withExcerpts([paragraph("content", 2, "Before.", "After."), paragraph("content", 4, published, proposed)]);
      expect(parseCmsPage(text(form)), JSON.stringify([published, proposed])).toEqual(malformed);
      expect(detail(form)).toContain('data-cms-detail-floor="content-not-page"');
    }
  });

  it("names a form whose consecutive excerpts of one region repeat a position or go back as malformed", () => {
    for (const positions of [
      [5, 3],
      [2, 2],
    ]) {
      const form = withExcerpts(positions.map((position, index) => paragraph("content", position, `old ${index}`, `new ${index}`)));
      expect(parseCmsPage(text(form)), JSON.stringify(positions)).toEqual(malformed);
    }
    // An excerpt may follow one of another region at any position: the order of
    // the regions is the agent's, and only consecutive excerpts of one region
    // are checked.
    const regions = withExcerpts([
      paragraph("content", 2, "old a", "new a"),
      paragraph("excerpt", 0, "old b", "new b"),
      paragraph("content", 1, "old c", "new c"),
    ]);
    expect(parseCmsPage(text(regions)).ok).toBe(true);
  });
});
