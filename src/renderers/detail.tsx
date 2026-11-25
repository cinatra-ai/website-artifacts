// The `detail` slot renderer of the page snapshot: the one page renderer,
// @cinatra-ai/website-artifacts:page-diff, that both the WordPress and the
// Drupal extension draw their pages through.
//
// ONE VIEW: the changes and the link that opens the page in the CMS directly
// under them, drawn by `CmsPageView` from the page content form an agent
// extension files. It draws no frame of the page and no box in its place: the
// host hands a display no origin of the connected site. The root names the renderer that drew it, on the page and on every
// floor alike.
//
// IT DRAWS FROM THE CONTENT CHANNEL AND FROM NOTHING ELSE. The form arrives on
// these props, read from the pinned revision on the server and capped there —
// this display requests neither the form nor any bytes of its own. That is
// what lets a reviewer read the change inside a third-party application, where
// a display reaching for bytes from the browser carries no credential and
// paints an empty plate.
//
// IT CAUSES NO LOAD. Nothing it draws has a subresource address; the only
// address in the markup is the CMS link's href, which the browser opens only
// when the reader follows it, and which is drawn only for an http or https
// address (webAddress of the page model).
//
// THE CONFORMANCE ANCHORS (cinatra#3092, sections XI.8 and XI.7). The root
// names the display: `cms-page-display` for a WordPress page and on every
// floor, `drupal-page-display` for a Drupal page, because the drawing gives the
// one view a name per platform. Once the review is continued (the version 5
// snapshot's `review.reading`), the continued reading's anchor is drawn last
// inside the root, under the view: a paragraph binding the reading in the
// `empty` state, with the decision time's span when the host handed
// `review.decidedAt`. It draws no words, because its sentence is a claim about
// what the site published and the host hands no `review.effect`, and it takes no
// part in the layout: out of the flow with no size, so the root's column counts
// no item and adds no gap for it. Nothing a person can see changes.
//
// NEVER BLANK, NEVER THROWN: content it cannot draw becomes a named floor under
// the artifact's title and its download link.
//
// IT NAMES ITSELF TO THE HOST'S IDENTITY LINE (section XI.7 and XI.8: the
// identity line of every page names the renderer that drew it, and the
// platform it names is the one thing that tells a WordPress page from a Drupal
// page). Two optional named exports carry what only this display knows:
// `rendererName` and `identityFacts(content)`. A host reads them on the server
// from the module it resolved for this slot, so this module is NOT a client
// module: a "use client" module reaches a server as client references, whose
// string is no string and whose function throws when called. It holds no
// state and no handler of its own; the page view keeps its own "use client".

import { type CSSProperties, type ReactNode } from "react";

import { CmsPageView } from "../cms-page-view";
import { byteDownloadHref, contentFloorMessage, resolveArtifactTextView } from "../content-view";
import { PROPS_API_VERSION, type ArtifactRendererProps } from "../renderer-props";
import { PAGE_DIFF_RENDERER, pageIdentityFacts, type PageIdentityFacts } from "../renderer-identity";

/** The renderer this module is, for the host's identity line: "drawn by". */
export const rendererName: string = PAGE_DIFF_RENDERER;

/** The cells of the identity line only this display knows, read from the
 * stored content the host hands it: the platform after the revision, the
 * page's address at the close. Null wherever this display's own read of the
 * content (resolveContentPageView, the projection checks of
 * resolveArtifactTextView) floors it. Pure, never throws, requests nothing. */
export function identityFacts(content: unknown): PageIdentityFacts | null {
  return pageIdentityFacts(content);
}

const DETAIL_PROPS_API_VERSION = 5;

/** The title a floor draws when the artifact has no title it can draw. */
const FALLBACK_TITLE = "CMS page";

const wrapStyle: CSSProperties = { display: "flex", flexDirection: "column", gap: "12px", minWidth: 0 };

const headerStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
  flexWrap: "wrap",
};

const titleStyle: CSSProperties = {
  fontSize: "14px",
  fontWeight: 600,
  color: "var(--foreground, #111827)",
  margin: 0,
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const linkStyle: CSSProperties = {
  fontSize: "12px",
  color: "var(--primary, #2563eb)",
  textDecoration: "none",
  flex: "none",
};

const noticeStyle: CSSProperties = {
  fontFamily:
    'var(--font-mono, ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace)',
  fontSize: "12px",
  color: "var(--muted-foreground, #6b7280)",
  padding: "8px 0",
};

/** The title a floor draws: the artifact's own title when it is a text with
 * something in it, and the kind label otherwise. A title of any other shape
 * never reaches the markup, so a malformed title cannot throw the floor. */
function floorTitle(props: unknown): string {
  const artifact = props !== null && typeof props === "object" ? (props as { artifact?: unknown }).artifact : undefined;
  const title = artifact !== null && typeof artifact === "object" ? (artifact as { title?: unknown }).title : undefined;
  return typeof title === "string" && title.trim() !== "" ? title : FALLBACK_TITLE;
}

/** The display's conformance anchor names, per platform the form serves. */
const ANCHORS = {
  wordpress: { display: "cms-page-display", reading: "cms-page-continued-reading" },
  drupal: { display: "drupal-page-display", reading: "drupal-page-continued-reading" },
} as const;

/** A canonical ISO instant, the one form the host hands a decision time in. */
function isInstant(value: unknown): value is string {
  return typeof value === "string"
    && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)
    && Number.isFinite(Date.parse(value))
    && new Date(value).toISOString() === value;
}

/** The anchor takes no part in the layout: out of the flow, so the column
 * above (a flex container with a gap) counts no item for it and adds no gap, and
 * with no size, no margin, no padding and no border, so it draws nothing. A
 * `display: contents` box would instead hand its span to that column as an item. */
const anchorStyle: CSSProperties = {
  position: "absolute",
  width: 0,
  height: 0,
  margin: 0,
  padding: 0,
  border: 0,
  overflow: "hidden",
};

/** The continued reading's anchor: present only in a version 5 snapshot whose
 * review reads continued. The review is read loosely: a shape this display does
 * not know is no continued reading. */
function ContinuedReading({ id, review }: { id: string; review: unknown }): ReactNode {
  if (review === null || typeof review !== "object") return null;
  const { reading, decidedAt } = review as { reading?: unknown; decidedAt?: unknown };
  if (reading !== "continued") return null;
  return (
    <p data-conformance-id={id} data-field="reading=review.reading" data-state="empty" style={anchorStyle}>
      {isInstant(decidedAt) ? <span data-field="decision=review.decidedAt" /> : null}
    </p>
  );
}

/**
 * The default-exported detail renderer. The host mounts this in the main realm
 * with the shared React singleton; it owns no React root.
 */
export default function PageDiffDetail(props: ArtifactRendererProps): ReactNode {
  // Detail opts into the review snapshot while its content contract remains
  // the original one. Project only those fields into the strict shared leaf;
  // direct legacy v2 mounts remain compatible.
  const isDetailSnapshot = props !== null && typeof props === "object"
    && !Array.isArray(props) && props.propsApiVersion === DETAIL_PROPS_API_VERSION;
  const contentProps = isDetailSnapshot ? {
    propsApiVersion: PROPS_API_VERSION,
    artifact: props.artifact,
    representation: props.representation,
    urls: props.urls,
    identity: props.identity,
    actions: props.actions,
    content: props.content,
    bytes: props.bytes,
  } : props;
  const view = resolveArtifactTextView(contentProps);
  // The version stamp names the contract the snapshot was read at, 5 or 2; a
  // snapshot of any other version is read at neither and carries no stamp.
  const handedVersion = props !== null && typeof props === "object" ? (props as { propsApiVersion?: unknown }).propsApiVersion : undefined;
  const propsApiVersion = isDetailSnapshot
    ? DETAIL_PROPS_API_VERSION
    : handedVersion === PROPS_API_VERSION
      ? PROPS_API_VERSION
      : undefined;
  if (view.kind === "page") {
    // THE PAGE CONTENT FORM is one view: the changes and the link under them —
    // nothing else around it.
    const anchors = ANCHORS[view.page.system];
    const review = isDetailSnapshot ? (props as { review?: unknown }).review : undefined;
    return (
      <div style={wrapStyle} data-conformance-id={anchors.display} data-cms-artifact-detail data-renderer={PAGE_DIFF_RENDERER} data-props-api-version={propsApiVersion}>
        <CmsPageView page={view.page} revisionId={view.revisionId} />
        <ContinuedReading id={anchors.reading} review={review} />
      </div>
    );
  }
  const title = floorTitle(props);
  const download = byteDownloadHref(props);
  return (
    <div style={wrapStyle} data-conformance-id={ANCHORS.wordpress.display} data-cms-artifact-detail data-renderer={PAGE_DIFF_RENDERER} data-props-api-version={propsApiVersion}>
      <div style={headerStyle}>
        <p style={titleStyle} title={title}>
          {title}
        </p>
        {download ? (
          <a style={linkStyle} href={download} download data-cms-download>
            Download
          </a>
        ) : null}
      </div>
      <div style={noticeStyle} data-cms-detail-floor={view.reason}>
        {contentFloorMessage(view.reason)}
      </div>
    </div>
  );
}
