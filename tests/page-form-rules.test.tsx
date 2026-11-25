// @vitest-environment node
// The rules the page content form is read by, beyond its shape: which address
// the display may put in front of a reader, and which excerpts count as changes
// in page order. The display draws no frame of the page. An address in the
// content is the agent's text and may name any destination, so the one link the
// display draws (Open in the CMS) is drawn only for an http or https address,
// read as text that starts with http:// or https:// so that a browser resolving
// it against the reviewer's page reads the origin the rule read; the page's own
// address is only written on the identity line, under a stricter rule.

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { parseCmsPage, webAddress } from "../src/cms-page-model";
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

describe("the identity-address rule refuses a page address at an IP literal, at localhost or home.arpa or a name under .localhost, .local, .internal or .home.arpa, at a one-label name or a name with an empty label, or at a port other than the scheme's default (443 for https, 80 for http)", () => {
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
const OTHER_SCHEMES = [
  "javascript:alert(1)",
  "data:text/html,<p>x</p>",
  "file:///etc/passwd",
  "blob:https://acme.example/0f1e",
  "vbscript:msgbox(1)",
  "//acme.example/node/7/edit",
  "/node/7/edit",
  "ftp://acme.example/x",
];

/** Credentials in the address, assembled at run time so no such literal is in the source. */
const withUserinfo = (scheme: string, userinfo: string): string => `${scheme}://${userinfo}@acme.example/node/7/edit`;
const CREDENTIAL_FORMS = [withUserinfo("https", "editor"), withUserinfo("http", "editor"), withUserinfo("http", ["editor", "x"].join(":"))];

/** Addresses that do not parse as an absolute URL, or hold a control, whitespace or backslash character a browser reads differently from a parser. */
const UNPARSEABLE_FORMS = ["http://", "https://", "http://[::1/", "https://exa^mple.com/", "http://acme.example:99999/", "not an address", ""];
const CONTROL_FORMS = [
  "http://acme.example/a\u0000b",
  "https://acme.example/a\tb",
  "http://acme.example/a\nb",
  "https://acme.example/a\rb",
  "http://acme.example/a b",
  "https://acme.example/a\u007fb",
  "http://acme.example\\node\\7",
  "https://acme.example\\node\\7",
  "http://acme.example/node/\\..\\x",
  "https://acme.example/x\u0085y",
];

describe("a browser resolves an address against the reviewer's page, so only a text that starts with http:// or https:// is admitted", () => {
  it("refuses a page address that does not start with http:// or https://", () => {
    for (const address of [...SLASHLESS_FORMS, ...PREFIXED_FORMS, "http:acme.example/pricing", "http:\\acme.example\\pricing"]) {
      expect(webAddress(address), address).toBeNull();
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

  it("draws no CMS link and no address for an address that is not an http or https address, on the page of either system, through the parser and without it", () => {
    for (const fixture of PAGE_FORMS) {
      // The fixture's own CMS address still draws the link.
      expect(detail(fixture.form)).toContain("data-cms-open");
      for (const cmsAddress of [
        ...SLASHLESS_FORMS,
        ...PREFIXED_FORMS,
        ...OTHER_SCHEMES,
        ...CREDENTIAL_FORMS,
        ...UNPARSEABLE_FORMS,
        ...CONTROL_FORMS,
        undefined,
        42,
      ]) {
        const parsed = parseCmsPage(text(withPage(fixture, { cmsAddress })));
        expect(parsed.ok, String(cmsAddress)).toBe(true);
        expect(parsed.ok ? parsed.page.page.cmsAddress : "unparsed", String(cmsAddress)).toBeNull();
        if (typeof cmsAddress === "string") expect(parsedAddress(cmsAddress), cmsAddress).toBeNull();
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

  it("admits a CMS on a plain http address, on the page of either system, with the link's attributes unchanged", () => {
    for (const fixture of PAGE_FORMS) {
      for (const cmsAddress of ["http://acme.example/node/7/edit", "HTTP://acme.example/node/7/edit", "http://cms.corp:8080/wp-admin/", "http://10.0.0.5/wp-admin/"]) {
        expect(webAddress(cmsAddress), cmsAddress).toBe(cmsAddress);
        const html = detail(withPage(fixture, { cmsAddress }));
        expect(html, cmsAddress).toContain(`href="${cmsAddress}"`);
        expect(html, cmsAddress).toContain('target="_blank" rel="noopener noreferrer"');
        expect(html, cmsAddress).toContain('data-action="open-in-cms -&gt; cms-opened"');
        expect(html, cmsAddress).toContain(">Open in the CMS</a>");
      }
    }
  });

  it("admits the page's own address on a plain http site on the same terms as https, the identity rule's other refusals unchanged", () => {
    for (const address of ["http://acme.example/pricing", "http://acme.example:80/pricing", "http://www.acme.example./pricing"]) {
      expect(parsedAddress(address), address).toBe(address);
      expect(pkg.identityAddress(address), address).toBe(address);
    }
    for (const address of ["http://acme.example:8080/pricing", "http://acme.example:443/pricing", "http://localhost/", `http://${LOOPBACK}/`, "http://[::1]/", "http://intranet/", ...CONTROL_FORMS, ...CREDENTIAL_FORMS]) {
      expect(parsedAddress(address), address).toBeNull();
      expect(pkg.identityAddress(address), address).toBeNull();
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
