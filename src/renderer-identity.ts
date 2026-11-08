// The name of the one page renderer this package ships. The WordPress page and
// the Drupal node a pointer names are one drawing, and the root of everything
// this renderer draws carries this name, so a surface can read which renderer
// drew a page.

/** The one page renderer's name, stamped on the root of everything it draws. */
export const PAGE_DIFF_RENDERER = "@cinatra-ai/website-artifacts:page-diff";
