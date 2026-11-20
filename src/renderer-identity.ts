// The name of the one page renderer this package ships. The WordPress page and
// the Drupal node a pointer names are one drawing, and the root of everything
// this renderer draws carries this name, so a surface can read which renderer
// drew a page.
//
// THE IDENTITY LINE OF EVERY PAGE NAMES THE RENDERER THAT DREW IT, and only
// that line tells a WordPress page from a Drupal page: the platform it names
// (specs/app-artifact-review.html section XI.7 and XI.8). The host draws that
// line; the facts only this display knows are given to it here, read from the
// stored content the host already hands the display, BY THE DISPLAY'S OWN READ
// of that content (resolveContentPageView, the projection checks
// resolveArtifactTextView runs): facts exactly where that read draws a page,
// null wherever it floors. Pure and total: nothing here reaches anything, and
// every input returns facts or null.

import { type CmsPageSystem } from "./cms-page-model";
import { resolveContentPageView } from "./content-view";

/** The one page renderer's name, stamped on the root of everything it draws. */
export const PAGE_DIFF_RENDERER = "@cinatra-ai/website-artifacts:page-diff";

/** The cells of a page's identity line that only this display knows. */
export interface PageIdentityFacts {
  /** Drawn right after the revision: the platform the page lives on. */
  revision: string[];
  /** Drawn at the close of the line, after the owner and the visibility: the
   * page's address. Empty where the form gives no address the page model
   * admits. */
  closing: string[];
}

const PLATFORM_NAMES: Record<CmsPageSystem, string> = { wordpress: "WordPress", drupal: "Drupal" };

/** The address as the drawn line writes it: the host and the path, with no
 * scheme, no query and no fragment (`acme.example/pricing`). A root path adds
 * nothing (`acme.example`). The address is one the page model has already
 * admitted, or null. */
function addressCell(address: string | null): string | null {
  if (address === null) return null;
  const url = new URL(address);
  const path = url.pathname === "/" ? "" : url.pathname;
  return `${url.hostname}${path}`;
}

/**
 * The facts of the page the content holds, or null wherever this display's
 * own read of the content (resolveContentPageView) does not draw a page: the
 * same verdict, by the same code, for the same content. Never throws: a
 * content whose read throws answers null.
 */
export function pageIdentityFacts(content: unknown): PageIdentityFacts | null {
  try {
    const view = resolveContentPageView(content);
    if (view.kind !== "page") return null;
    const address = addressCell(view.page.page.address);
    return {
      revision: [PLATFORM_NAMES[view.page.system]],
      closing: address === null ? [] : [address],
    };
  } catch {
    return null;
  }
}
