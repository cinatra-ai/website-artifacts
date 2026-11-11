// @cinatra-ai/website-artifacts — the page display for WordPress and Drupal
// pages in the Cinatra artifact library.
//
// This is the package's first state: the manifest, its check suite and its
// tests. It declares the one representation the page snapshot is filed as and
// claims no type and ships no renderer yet; the page snapshot type and its one
// renderer, @cinatra-ai/website-artifacts:page-diff, follow in the next change.

/** The representation the page snapshot is filed as: text an agent can author. */
export const PAGE_SNAPSHOT_MIME = "application/json";

/** The typed mirror of the authoritative `cinatra.artifact` descriptor declared
 * in package.json. */
export interface WebsiteArtifactsManifest {
  accepts: { file: { mimeTypes: string[] } };
}

export const websiteArtifactsManifest: WebsiteArtifactsManifest = {
  accepts: { file: { mimeTypes: [PAGE_SNAPSHOT_MIME] } },
};
