// @vitest-environment node
// The rules the page content form is read by, beyond its shape: which address
// the display may put in front of a reader, and which excerpts count as changes
// in page order. The display draws no frame of the page. An address in the
// content is the agent's text and may name any destination, so the one link the
// display draws (Open in the CMS) is drawn only for an https address, read as
// text that starts with https:// so that a browser resolving it against the
// reviewer's page reads the origin the rule read; the page's own address is
// only written on the identity line, under a stricter rule.

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { httpsAddress, parseCmsPage } from "../src/cms-page-model";
import * as pkg from "../src/index";
import { CmsPageView } from "../src/cms-page-view";
import PageDiffDetail from "../src/renderers/detail";
import { PAGE_ADDRESS, PAGE_FORMS, WORDPRESS_FORM, pageProps, withPage } from "./cms-page-fixture";

const text = (value: unknown): string => JSON.stringify(value);

const detail = (document: unknown): string => renderToStaticMarkup(<PageDiffDetail {...pageProps(document)} />);

function parsedAddress(address: string): string | null {
  const parsed = parseCmsPage(text(withPage(WORDPRESS_FORM, { address })));
  expect(parsed.ok, address).toBe(true);
  return parsed.ok ? parsed.page.page.address : "unparsed";
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

describe("the identity-address rule refuses a page address at an IP literal, at localhost or home.arpa or a name under .localhost, .local, .internal or .home.arpa, at a one-label name or a name with an empty label, or at a port other than the default 443", () => {
  it("admits no page address at an IP literal, and the display draws no frame and no address for it", () => {
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
      expect(parsedAddress(address), address).toBeNull();
      expect(pkg.identityAddress(address), address).toBeNull();
      const html = detail(withPage(WORDPRESS_FORM, { address }));
      expect(html, address).toContain('data-cms-page="page"');
      expect(html, address).not.toContain("<iframe");
    }
  });

  it("admits no page address at localhost, home.arpa, a name under .localhost, .local, .internal or .home.arpa, a one-label name, an empty label or a port other than 443", () => {
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
      expect(parsedAddress(address), address).toBeNull();
      expect(pkg.identityAddress(address), address).toBeNull();
    }
  });

  it("still admits a name of two labels or more, on the default port, and exports the rule", () => {
    for (const address of [PAGE_ADDRESS, "https://acme.example:443/pricing", "https://www.acme.example./pricing"]) {
      expect(parsedAddress(address), address).toBe(address);
      expect(pkg.identityAddress(address), address).toBe(address);
    }
  });
});

describe("the display draws no frame of the page, whatever address the form gives for it", () => {
  it("draws no iframe, no source address, no gap box and no page address, at any address, for either system", () => {
    for (const fixture of PAGE_FORMS) {
      for (const address of [
        PAGE_ADDRESS,
        "https://acme.example:443/pricing",
        "https://router.lan/admin?delete=1",
        `https://${LOOPBACK}/`,
        "http://acme.example/pricing",
        "javascript:alert(1)",
        undefined,
      ]) {
        const html = detail(withPage(fixture, { address }));
        expect(html, String(address)).toContain('data-cms-page="page"');
        expect(html, String(address)).not.toContain("<iframe");
        expect(html, String(address)).not.toMatch(/\bsrc=/);
        expect(html, String(address)).not.toContain("data-cms-page-gap");
        expect(html, String(address)).not.toContain("cannot be shown");
        expect(html, String(address)).not.toContain("role=\"status\"");
        expect(html, String(address)).toContain(">Changes<");
        // The page's own address is the identity line's, never this view's.
        if (typeof address === "string") expect(html, address).not.toContain(address);
      }
    }
  });
});

/** https texts without their two slashes. A URL parser without a base reads
 * each on acme.example; a browser resolves each against the page that draws
 * it, on that page's own origin. */
const SLASHLESS_FORMS = ["https:acme.example/pricing", "https:/acme.example/../api/artifacts/1", "https:\\acme.example\\pricing"];

/** https addresses with a space or a tab before them. */
const PREFIXED_FORMS = [` ${PAGE_ADDRESS}`, `\t${PAGE_ADDRESS}`];

/** Addresses of any other scheme, which an agent's content may carry. */
const OTHER_SCHEMES = ["http://acme.example/node/7/edit", "javascript:alert(1)", "data:text/html,<p>x</p>", "//acme.example/node/7/edit", "/node/7/edit", "ftp://acme.example/x"];

describe("a browser resolves an address against the reviewer's page, so only a text that starts with https:// is admitted", () => {
  it("refuses a page address that does not start with https://", () => {
    for (const address of [...SLASHLESS_FORMS, ...PREFIXED_FORMS]) {
      expect(httpsAddress(address), address).toBeNull();
      expect(pkg.identityAddress(address), address).toBeNull();
      expect(parsedAddress(address), address).toBeNull();
    }
    for (const address of SLASHLESS_FORMS) {
      // The premise: without a base the address reads on acme.example, and
      // against the reviewer's page it reads on that page's own origin.
      expect(new URL(address).origin, address).toBe("https://acme.example");
      expect(new URL(address, "https://app.example/review/7").origin, address).toBe("https://app.example");
    }
  });

  it("draws no CMS link for a CMS address that is not an https address, on the page of either system, through the parser and without it", () => {
    for (const fixture of PAGE_FORMS) {
      // The fixture's own CMS address still draws the link.
      expect(detail(fixture.form)).toContain("data-cms-open");
      for (const cmsAddress of [...SLASHLESS_FORMS, ...PREFIXED_FORMS, ...OTHER_SCHEMES, "https://editor@acme.example/x", undefined, 42]) {
        const parsed = parseCmsPage(text(withPage(fixture, { cmsAddress })));
        expect(parsed.ok, String(cmsAddress)).toBe(true);
        expect(parsed.ok ? parsed.page.page.cmsAddress : "unparsed", String(cmsAddress)).toBeNull();
        const html = detail(withPage(fixture, { cmsAddress }));
        expect(html, String(cmsAddress)).toContain('data-cms-page="page"');
        expect(html, String(cmsAddress)).not.toContain("data-cms-open");
        expect(html, String(cmsAddress)).not.toContain("<a ");
        // The page view applies the rule itself, to a page handed without the parser.
        const page = parseCmsPage(text(fixture.form));
        expect(page.ok).toBe(true);
        if (!page.ok) continue;
        const handed = { ...page.page, page: { ...page.page.page, cmsAddress: cmsAddress as string | null } };
        const view = renderToStaticMarkup(<CmsPageView page={handed} revisionId="rev_1" />);
        expect(view, String(cmsAddress)).not.toContain("data-cms-open");
        expect(view, String(cmsAddress)).not.toContain("<a ");
      }
    }
  });

  it("still admits an address whose scheme is written in capitals, and a CMS on a private name", () => {
    for (const cmsAddress of ["HTTPS://acme.example/node/7/edit", "https://cms.corp/node/7/edit", "https://acme.example:8443/wp-admin/"]) {
      const html = detail(withPage(WORDPRESS_FORM, { cmsAddress }));
      expect(html, cmsAddress).toContain(`href="${cmsAddress}"`);
    }
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
