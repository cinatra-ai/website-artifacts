// @cinatra-ai/website-artifacts — the page display for WordPress and Drupal
// pages in the Cinatra artifact library.
//
// A page a run proposes to change is one drawing, whichever system holds it.
// This package owns the page snapshot type an agent extension is to file for
// such a change, and the ONE page renderer that draws it,
// @cinatra-ai/website-artifacts:page-diff: the frame's place (the page
// embedded in its frame on the site the page view is handed, else the gap
// named there), a diff of only the changed excerpts beneath it, each in the
// page's own formatting, and a link that opens the page in the CMS. Neither
// the WordPress nor the Drupal extension is to write a page renderer of its
// own.
//
// THE FORM ARRIVES ON THE PROPS, through the versioned server content channel,
// read from the pinned revision on the server and capped there. The display
// requests neither the form nor any bytes of its own, and requests no host port.
// The one load the page view can cause is its page frame, whose first
// request is the address the form gives for the published page, and only when
// the frame-address rule admits it and it is on the origin of the site the
// page view is handed; the detail display reads no site from the snapshot and
// hands the page view none, so it causes no load and the frame's place names
// the gap. Anything the channel cannot supply degrades to a NAMED floor, never
// a blank.

// The slot renderers (default-exported React components the host mounts).
export { default as PageDiffDetail } from "./renderers/detail";
export { default as PageSnapshotListRow } from "./renderers/list-row";

// The one renderer's name, stamped on the root of everything it draws.
export { PAGE_DIFF_RENDERER } from "./renderer-identity";

// The host-supplied props contract the content leaf binds to (v2, no host ports).
export { PROPS_API_VERSION } from "./renderer-props";
export type { ArtifactRendererProps } from "./renderer-props";

// The content channel the display reads, and the total resolver over it.
export { ARTIFACT_CONTENT_CHANNEL_VERSION, ARTIFACT_CONTENT_CLASSES, ARTIFACT_CONTENT_ABSENCES } from "./artifact-content-channel";
export type { ArtifactContentProjection, ArtifactContentClass, ArtifactContentAbsence } from "./artifact-content-channel";
export { resolveArtifactTextView, contentFloorMessage, byteDownloadHref } from "./content-view";
export type { ArtifactTextView, ArtifactTextViewInput, ContentFloorReason } from "./content-view";

// The page content form's one view, and its pure, never-throwing model.
export { CmsPageView } from "./cms-page-view";
export {
  CMS_PAGE_FORM_MARKER,
  CMS_PAGE_FORM_VERSION,
  FRAME_WATCHDOG_MS,
  parseCmsPage,
  framableAddress,
  frameAddress,
  boundFrameAddress,
  frameState,
  wordDiff,
  excerptGroups,
} from "./cms-page-model";
export type {
  CmsPage,
  CmsPageExcerpt,
  CmsPageExcerptKind,
  CmsPageExcerptEntry,
  CmsPageParse,
  CmsPageParseReason,
  CmsPageSystem,
  WordDiffOp,
  WordDiffSegment,
} from "./cms-page-model";

/** The representation the page snapshot is filed as: text an agent can author. */
export const PAGE_SNAPSHOT_MIME = "application/json";

/** The pinnable type an agent extension files the page content form as. */
export const PAGE_SNAPSHOT_OBJECT_TYPE = "@cinatra-ai/website-artifacts:page-snapshot";

/** The typed mirror of the authoritative `cinatra.artifact` descriptor declared
 * in package.json — this pack owns the page snapshot type and ships its detail
 * and its list-row display. */
export interface WebsiteArtifactsManifest {
  accepts: { file: { mimeTypes: string[] } };
  ui: {
    abiVersion: 1;
    sdkAbiRange: string;
    renderers: {
      detail: { entry: string; propsApiVersion: number };
      listRow: { entry: string; propsApiVersion: number };
    };
  };
  objectTypes: Array<{
    type: string;
    claim: "dedicated";
    dispositions: { projection: "artifact-safe"; pinnable: true; snapshotPolicy: "none"; sensitivity: "normal" };
    schema: { type: "object" };
  }>;
}

export const websiteArtifactsManifest: WebsiteArtifactsManifest = {
  accepts: { file: { mimeTypes: [PAGE_SNAPSHOT_MIME] } },
  ui: {
    abiVersion: 1,
    sdkAbiRange: "^2.5.0",
    renderers: {
      detail: { entry: "./src/renderers/detail.tsx", propsApiVersion: 5 },
      listRow: { entry: "./src/renderers/list-row.tsx", propsApiVersion: 1 },
    },
  },
  objectTypes: [
    {
      type: PAGE_SNAPSHOT_OBJECT_TYPE,
      claim: "dedicated",
      dispositions: { projection: "artifact-safe", pinnable: true, snapshotPolicy: "none", sensitivity: "normal" },
      schema: { type: "object" },
    },
  ],
};
