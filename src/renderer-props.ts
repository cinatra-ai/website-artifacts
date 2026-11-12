// The props snapshot a dynamically-loaded artifact renderer receives.
//
// This mirrors the host-supplied, versioned, fully-SERIALIZABLE snapshot a
// renderer is handed. A renderer requests NO host ports: it renders ONLY from
// this authorized snapshot — plain JSON data (row metadata, the resolved
// representation, host-authorized URLs, navigational action hrefs, and the
// content the server already read from the pinned revision). No closures, host
// context, or callable ports cross this boundary.
//
// THE VERSION IS 2 SINCE THE DISPLAY MOVED ONTO THE CONTENT CHANNEL. A v1
// snapshot carries no content field at all, which is why every display that
// declared v1 had to reach for its own bytes from the browser — and why none of
// them drew anything inside a third-party application, where that reach carries
// no credential. The host still BUILDS v1 for a display that declares v1, so the
// move is negotiated per display and is not a flag day. The content leaf of this
// package reads version 2 and floors, named, on anything else; the detail slot
// declares 5, the review snapshot, and projects only these version 2 fields of
// it onto the leaf, so the leaf never reads a field it does not know.
//
// The type is declared locally (not imported) so this extension stays a
// self-contained source mirror with no first-party host dependency: the renderer
// binds structurally to whatever snapshot the host serializes at mount.

import type { ArtifactContentProjection } from "./artifact-content-channel";

// THE CANONICAL PROJECTIONS THE HOST ACTUALLY SENDS, spelled out rather than
// widened to `string`, because a mirror that accepts anything proves nothing:
// the whole reason this file exists is to fail when the host's shape and this
// display's expectation drift apart.
/** The ownership levels an authorized row is projected at. */
export const ARTIFACT_OWNER_LEVELS = ["user", "team", "organization", "workspace"] as const;
/** The visibilities an authorized row is projected at. */
export const ARTIFACT_VISIBILITIES = ["private", "team", "organization", "public"] as const;
/** The effective-identity kinds: a type-driven identity is either an installed
 * extension, or it has no primary one. The retired binding/classic `basis` and
 * the `selectable` activation barrier are gone from the host contract, so they
 * are gone from here — a mirror that still demanded them would refuse every
 * snapshot the host now builds. */
export const EFFECTIVE_IDENTITY_KINDS = ["extension", "no-primary"] as const;

export type ArtifactOwnerLevel = (typeof ARTIFACT_OWNER_LEVELS)[number];
export type ArtifactVisibility = (typeof ARTIFACT_VISIBILITIES)[number];
export type EffectiveIdentityKind = (typeof EFFECTIVE_IDENTITY_KINDS)[number];

/** The host-authorized snapshot handed to a slot renderer. */
export interface ArtifactRendererProps {
  /** The props-contract version this snapshot conforms to. The host refuses to
   * mount a renderer whose expected `propsApiVersion` this does not satisfy. */
  propsApiVersion: number;
  /** Row metadata (a projection of the authorized artifact summary). */
  artifact: {
    id: string;
    title: string | null;
    objectType: string;
    mime: string;
    size: number;
    createdAt: string;
    updatedAt: string;
    ownerLevel: ArtifactOwnerLevel;
    visibility: ArtifactVisibility;
    sourceUrl: string | null;
  };
  /** The resolved representation to serve (null when none is materialized). */
  representation: {
    revisionId: string;
    mime: string;
  } | null;
  /** Host-authorized SESSION URLs, already access-checked before this snapshot
   * is built. They re-authorize against the reading actor's cookie, so they are
   * reachable on a first-party surface and NOT inside a third-party
   * application — see `bytes` below for the address that is. */
  urls: {
    preview: string | null;
    download: string | null;
  };
  /** The resolved effective identity, flattened to plain data. */
  identity: {
    kind: EffectiveIdentityKind;
    extension: string | null;
  };
  /** Sanctioned action handles — SERIALIZABLE navigational hrefs only. */
  actions: {
    download: string | null;
    openInSource: string | null;
  };
  /**
   * THE VERSIONED SERVER CONTENT CHANNEL: the discriminated content projection,
   * read from the PINNED revision on the server and capped there. A display
   * switches on `content.kind` and reaches for nothing; `none` is a first-class
   * answer with a named reason. This is what lets a display draw inside a
   * third-party application at all.
   */
  content: ArtifactContentProjection;
  /**
   * THE BYTE REFERENCE for this pinned revision, from the surface's own road.
   *
   * `road` names which one it is, because the two are not interchangeable: an
   * `island` address is a sealed, short-lived, single-revision capability, and a
   * `session` address is the cookie-gated route. It is an ADDRESS and never a
   * payload.
   *
   * ABSENT AT THE OLDER VERSION, deliberately — a snapshot built at v1 has no
   * such key at all, so this field is read defensively and never assumed.
   */
  bytes?: {
    road: "session" | "island";
    preview: string | null;
    download: string | null;
  };
}

/** The props-contract version the content leaf reads (the detail slot declares
 * 5 and projects these fields of it onto the leaf). */
export const PROPS_API_VERSION = 2;
