"use client";

// The `detail` slot renderer of the page snapshot: the one page renderer,
// @cinatra-ai/website-artifacts:page-diff, that both the WordPress and the
// Drupal extension draw their pages through.
//
// ONE VIEW: the frame's place, the changes beneath it and the link under
// them, drawn by `CmsPageView` from the page content form an agent extension
// files. The root names the renderer that drew it, on the page and on every
// floor alike.
//
// IT DRAWS FROM THE CONTENT CHANNEL AND FROM NOTHING ELSE. The form arrives on
// these props, read from the pinned revision on the server and capped there —
// this display requests neither the form nor any bytes of its own. That is
// what lets a reviewer read the change inside a third-party application, where
// a display reaching for bytes from the browser carries no credential and
// paints an empty plate.
//
// IT CAUSES NO LOAD. The page view's frame (renderers/page-frame.tsx) requests
// an address only on the origin of the site the view is handed, which is to
// come from a record the host keeps, because the address the form gives is the
// agent's text and may name any destination. This display reads no site from
// the snapshot and hands the page view none (site={null}): the frame's place
// names the gap, and the changes beneath it are drawn as always. Within the
// source of this package nothing hands the page view a site; an application
// can hand one only by mounting the exported CmsPageView itself, and this
// display only in a later version that reads one.
//
// NEVER BLANK, NEVER THROWN: content it cannot draw becomes a named floor under
// the artifact's title and its download link.

import { type CSSProperties, type ReactNode } from "react";

import { CmsPageView } from "../cms-page-view";
import { byteDownloadHref, contentFloorMessage, resolveArtifactTextView } from "../content-view";
import { PROPS_API_VERSION, type ArtifactRendererProps } from "../renderer-props";
import { PAGE_DIFF_RENDERER } from "../renderer-identity";

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
    // THE PAGE CONTENT FORM is one view: the frame's place, the changes beneath
    // it and the link under them — nothing else around it.
    return (
      <div style={wrapStyle} data-cms-artifact-detail data-renderer={PAGE_DIFF_RENDERER} data-props-api-version={propsApiVersion}>
        <CmsPageView page={view.page} revisionId={view.revisionId} site={null} />
      </div>
    );
  }
  const title = floorTitle(props);
  const download = byteDownloadHref(props);
  return (
    <div style={wrapStyle} data-cms-artifact-detail data-renderer={PAGE_DIFF_RENDERER} data-props-api-version={propsApiVersion}>
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
