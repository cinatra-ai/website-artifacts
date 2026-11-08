// THE DECISION LEAF of the page display: it maps the authorized host snapshot
// to exactly one of two outcomes, and it is the only place in this package that
// reads the content channel.
//
//   `page` — the page content form an agent extension filed as JSON, read whole
//     from the pinned revision.
//   `floor` — a NAMED reason it cannot be drawn. Never blank, never a throw: a
//     display that threw would take the surface around it down with it. A text
//     that is not the page form — another representation, or a JSON document
//     that is not the form — is one of those reasons: this package draws pages
//     and nothing else.
//
// TOTAL: every input returns a view, including an input that is not a snapshot
// at all. Nothing here reaches the network, and nothing downstream of it
// requests the content either — the whole point of the channel is that the
// content is already here. The one load downstream that the page view can
// cause is the page frame, whose first request is the address the form gives
// for the published page, and only on the origin of the site the page view is
// handed (boundFrameAddress of the page model); the detail display hands it
// none, so it causes none.

import {
  ARTIFACT_CONTENT_CHANNEL_VERSION,
  type ArtifactContentProjection,
} from "./artifact-content-channel";
import { parseCmsPage, type CmsPage } from "./cms-page-model";
import { PROPS_API_VERSION, type ArtifactRendererProps } from "./renderer-props";

/** The representation the page content form is filed as. */
const PAGE_FORM_MIME = "application/json";

/** Why this display is drawing a floor instead of the content. */
export type ContentFloorReason =
  | "malformed-props"
  | "props-version"
  | "channel-version"
  | "content-unavailable"
  | "content-absent"
  | "content-over-cap"
  | "content-unsupported-form"
  | "content-not-text"
  | "content-revision-mismatch"
  | "invalid-content-projection"
  | "empty-content"
  | "content-not-page";

/** What this display can be showing. */
export type ArtifactTextView =
  | {
      kind: "page";
      /** The page content form, parsed whole. */
      page: CmsPage;
      /** The revision the channel read the form from. */
      revisionId: string;
    }
  | { kind: "floor"; reason: ContentFloorReason };

/** A display must never throw on a shape it did not expect, so the input is
 * accepted loosely and every surprise lands on the floor. */
export type ArtifactTextViewInput = Partial<ArtifactRendererProps> | null | undefined;

const FLOOR_MESSAGES: Record<ContentFloorReason, string> = {
  "malformed-props": "This CMS snapshot cannot be drawn: the view was opened without anything to show.",
  "props-version":
    "This CMS snapshot cannot be drawn: it was handed a snapshot of a version this display does not read.",
  "channel-version":
    "This CMS snapshot cannot be drawn: its content arrived in a form of the content channel this display does not read.",
  "content-unavailable": "This CMS snapshot cannot be drawn here: this view was not given the content to show.",
  "content-absent": "No content is available to show for the revision being viewed.",
  "content-over-cap": "This CMS snapshot is too large to show here. Download it to read the whole of it.",
  "content-unsupported-form": "This artifact is not text, so this view has nothing to draw.",
  "content-not-text":
    "This artifact holds something other than a text document, so this view has nothing to draw.",
  "content-revision-mismatch":
    "This CMS snapshot cannot be drawn: the content handed to this view was read from a different revision than the one being viewed.",
  "invalid-content-projection": "This CMS snapshot cannot be drawn: the content handed to this view is incomplete.",
  "empty-content": "This CMS snapshot is empty.",
  "content-not-page": "This artifact holds a document that is not a CMS page, so this view has nothing to draw.",
};

/** The sentence a reader sees for a floor on the full view. One per reason. */
export function contentFloorMessage(reason: ContentFloorReason): string {
  return FLOOR_MESSAGES[reason] ?? FLOOR_MESSAGES["malformed-props"];
}

/** The address this display may hand a reader for the bytes themselves.
 *
 * The byte reference the snapshot carries is preferred over the session hrefs:
 * on a cookie surface the two are the same address, and inside a third-party
 * application only the first one is reachable. Absent at an older props version,
 * which is why it is read defensively and never assumed.
 *
 * THE FIRST ADDRESS THE SNAPSHOT CARRIES DECIDES, and it is drawn only when it
 * is an address this display may hand a reader: a text that is a path on the
 * host, or an http(s) address that a URL parser reads. Any other value (an
 * object, a number, a script address, a text with a space in it, an http(s)
 * text with a port out of range or a host the parser refuses) is no address,
 * and the answer is null, so a link is never drawn for it and it never reaches
 * the markup. */
export function byteDownloadHref(props: ArtifactTextViewInput): string | null {
  if (props === null || props === undefined || typeof props !== "object") return null;
  const snapshot = props as Partial<ArtifactRendererProps>;
  const first: unknown = snapshot.bytes?.download ?? snapshot.actions?.download ?? snapshot.urls?.download ?? null;
  return typeof first === "string" && DOWNLOAD_ADDRESS.test(first) && readsAsAddress(first) ? first : null;
}

/** A path on the host (one slash, then no second slash or backslash, which a
 * browser reads as another host) or an http(s) address; no space, no C0
 * control character and no DEL anywhere in it. */
const DOWNLOAD_ADDRESS = /^(?:\/(?![\/\\])[^\x00-\x20\x7f]*|https?:\/\/[^\x00-\x20\x7f]+)$/i;

/** A text DOWNLOAD_ADDRESS admits is an address: a path on the host is, and an
 * http(s) text is when a URL parser reads it as http or https with a host. */
function readsAsAddress(text: string): boolean {
  if (text.startsWith("/")) return true;
  try {
    const url = new URL(text);
    return (url.protocol === "http:" || url.protocol === "https:") && url.hostname !== "";
  } catch {
    return false;
  }
}

/** A byte count the projection may carry: a whole, finite, non-negative
 * number. `NaN`, an infinity and a fraction are all rejected here, so a
 * projection that carries one floors as incomplete. */
function isByteCount(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isPageFormMime(mime: unknown): boolean {
  return typeof mime === "string" && mime.split(";")[0].trim().toLowerCase() === PAGE_FORM_MIME;
}

function floor(reason: ContentFloorReason): ArtifactTextView {
  return { kind: "floor", reason };
}

/** Resolve what to draw. Total: it returns a view for every input. */
export function resolveArtifactTextView(props: ArtifactTextViewInput): ArtifactTextView {
  if (props === null || props === undefined || typeof props !== "object" || Array.isArray(props)) {
    return floor("malformed-props");
  }

  const snapshot = props as Partial<ArtifactRendererProps>;

  // STRICT, in both directions: a snapshot that does not SAY which version it
  // was built at is as unreadable as one built at another version. The host
  // resolves the display, reads the version it declares, and builds the
  // snapshot at that version — so a snapshot without that stamp, or at an older
  // one that has no content field to read, is not one this display agreed to.
  if (snapshot.propsApiVersion !== PROPS_API_VERSION) {
    return floor("props-version");
  }

  const content = snapshot.content as ArtifactContentProjection | undefined;
  if (content === null || content === undefined || typeof content !== "object") {
    // The snapshot carried no projection at all — a surface that does not hand
    // its displays content. Held APART from a projection that says, itself,
    // that there is nothing stored: this display must never report an unwired
    // surface as an artifact with nothing in it.
    return floor("content-unavailable");
  }

  // The channel's OWN version is checked before anything on the projection is
  // read, `none` included: a projection built at another channel version may
  // spell its own absence differently, and reading it at this shape would be a
  // guess.
  if (content.channelVersion !== ARTIFACT_CONTENT_CHANNEL_VERSION) {
    return floor("channel-version");
  }

  const projection = content as { [key: string]: unknown };
  const kind = projection.kind;

  if (kind === "none") {
    const reason = projection.reason;
    if (reason === "over-cap") return floor("content-over-cap");
    if (reason === "unsupported-form") return floor("content-unsupported-form");
    if (reason === "absent") return floor("content-absent");
    return floor("invalid-content-projection");
  }

  if (kind === "configuration" || kind === "page" || kind === "object") {
    return floor("content-not-text");
  }

  if (kind !== "text") {
    return floor("invalid-content-projection");
  }

  const text = projection.text;
  const contentRevisionId = projection.representationRevisionId;
  const byteLength = projection.byteLength;
  const projectedByteLength = projection.projectedByteLength;
  const truncated = projection.truncated;
  const cap = projection.cap;
  if (
    typeof text !== "string" ||
    typeof contentRevisionId !== "string" ||
    contentRevisionId.length === 0 ||
    typeof truncated !== "boolean" ||
    projection.encoding !== "utf-8"
  ) {
    return floor("invalid-content-projection");
  }

  // THE FIGURES ARE CHECKED AGAINST EACH OTHER. They decide whether the form
  // arrived whole, so a projection whose figures cannot all be true together —
  // `NaN`, a negative prefix, or a prefix larger than the whole or the cap — is
  // floored, named, rather than drawn as if it were whole. The text is not
  // measured against them: figures that agree with each other are taken as the
  // host gives them.
  if (
    !isByteCount(byteLength) ||
    !isByteCount(projectedByteLength) ||
    !isByteCount(cap) ||
    cap === 0 ||
    projectedByteLength > byteLength ||
    projectedByteLength > cap
  ) {
    return floor("invalid-content-projection");
  }

  // TRUNCATION AND THE NUMBERS AGREE, or neither is believed: `truncated` says
  // the text is a PREFIX of a larger content, which is true exactly when fewer
  // bytes are carried than the revision holds. The two disagreeing means one of
  // them is wrong and this display cannot tell which.
  if (truncated !== projectedByteLength < byteLength) {
    return floor("invalid-content-projection");
  }

  // THE PINNED REVISION AND THE DRAWN REVISION ARE THE SAME ONE, or nothing is
  // drawn. The surface says which revision it is showing; the channel says
  // which revision it read the content from. If those disagree — or if the
  // artifact has no materialized representation at all while the projection
  // claims one — this display would be labelling one revision's content with
  // another's, and that is worse than drawing nothing.
  const representation = snapshot.representation as { revisionId?: unknown; mime?: unknown } | null | undefined;
  if (
    representation === null ||
    representation === undefined ||
    typeof representation !== "object" ||
    representation.revisionId !== contentRevisionId
  ) {
    return floor("content-revision-mismatch");
  }

  // ONLY THE PAGE CONTENT FORM is drawn here. A text filed in another
  // representation is not the form, whatever it holds.
  if (!isPageFormMime(representation.mime)) return floor("content-not-page");

  // The form is read only whole: a cut JSON document is no form at all,
  // whatever its prefix holds, and a JSON document that is not the form is
  // named as such.
  if (truncated) return floor("content-over-cap");

  if (text.trim().length === 0) {
    return floor("empty-content");
  }

  const parsed = parseCmsPage(text);
  if (!parsed.ok) return floor("content-not-page");
  return { kind: "page", page: parsed.page, revisionId: contentRevisionId };
}
