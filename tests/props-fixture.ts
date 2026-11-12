// One authorized-snapshot fixture, shaped as the host builds one at props
// version 2, the leaf the detail display reads a version 5 snapshot onto, so
// every suite pins the same shape and a field the host stopped sending fails in
// one place.
//
// THE ISLAND SHAPE is the one that matters most here: inside a third-party
// application the content still arrives ON THE PROPS — that is the whole point
// of the channel — while every host-authorized address is an island-scoped byte
// address instead of a first-party session one.

import type { ArtifactContentProjection } from "../src/artifact-content-channel";
import type { ArtifactRendererProps } from "../src/renderer-props";

export const REVISION_ID = "rev_1";

/** The island byte address a host builds into a snapshot it hands a display
 * inside a third-party application. Spelled here so the island fixture is
 * recognisably the island one. */
export const ISLAND_BYTE_ADDRESS =
  "/api/lifecycle-views/artifact-bytes?bc=sealed-capability-for-this-gate";

export function textContent(
  text: string,
  overrides: Partial<Extract<ArtifactContentProjection, { kind: "text" }>> = {},
): ArtifactContentProjection {
  const byteLength = Buffer.byteLength(text, "utf8");
  return {
    kind: "text",
    channelVersion: 1,
    representationRevisionId: REVISION_ID,
    text,
    encoding: "utf-8",
    byteLength,
    projectedByteLength: byteLength,
    cap: 256 * 1024,
    truncated: false,
    ...overrides,
  };
}

export function noContent(
  reason: "unsupported-form" | "absent" | "over-cap",
): ArtifactContentProjection {
  return { kind: "none", channelVersion: 1, representationRevisionId: REVISION_ID, reason };
}

/** The first-party snapshot: session addresses, the pinned revision. */
export function props(
  content: ArtifactContentProjection,
  overrides: Partial<ArtifactRendererProps> = {},
): ArtifactRendererProps {
  const base: ArtifactRendererProps = {
    propsApiVersion: 2,
    artifact: {
      id: "art_1",
      title: "Homepage hero",
      objectType: "@cinatra-ai/website-artifacts:page-snapshot",
      mime: "application/json",
      size: 128,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      ownerLevel: "workspace",
      visibility: "organization",
      sourceUrl: null,
    },
    representation: { revisionId: REVISION_ID, mime: "application/json" },
    urls: {
      preview: "/api/artifacts/art_1/versions/rev_1/preview",
      download: "/api/artifacts/art_1/versions/rev_1/content",
    },
    identity: { kind: "extension", extension: "@cinatra-ai/website-artifacts" },
    actions: { download: "/api/artifacts/art_1/versions/rev_1/content", openInSource: null },
    content,
    bytes: {
      road: "session",
      preview: "/api/artifacts/art_1/versions/rev_1/preview",
      download: "/api/artifacts/art_1/versions/rev_1/content",
    },
  };
  return { ...base, ...overrides } as ArtifactRendererProps;
}

/** The SAME snapshot as a host builds it INSIDE A THIRD-PARTY APPLICATION. */
export function islandProps(
  content: ArtifactContentProjection,
  overrides: Partial<ArtifactRendererProps> = {},
): ArtifactRendererProps {
  return props(content, {
    urls: { preview: null, download: null },
    actions: { download: null, openInSource: null },
    bytes: { road: "island", preview: ISLAND_BYTE_ADDRESS, download: ISLAND_BYTE_ADDRESS },
    ...overrides,
  });
}
