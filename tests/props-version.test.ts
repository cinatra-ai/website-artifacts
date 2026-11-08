// @vitest-environment node
// Each slot declares the version it reads; the authoritative manifest and its
// typed mirror must agree. The shared content leaf remains at v2; detail
// explicitly admits the compatible v5 content projection, and listRow reads its
// own version 1.
//
// WHY IT MATTERS MORE THAN IT LOOKS. The host resolves a display, reads the
// version it declares, and builds the snapshot AT THAT VERSION. A manifest that
// declares one version while the display checks another does not fail loudly —
// it floors every reader, on every surface, with a snapshot the host built
// exactly as asked.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { ARTIFACT_CONTENT_CHANNEL_VERSION } from "../src/artifact-content-channel";
import { websiteArtifactsManifest } from "../src/index";
import { PROPS_API_VERSION } from "../src/renderer-props";

const pkg = JSON.parse(
  readFileSync(fileURLToPath(new URL("../package.json", import.meta.url)), "utf8"),
) as {
  cinatra: {
    artifact: {
      ui: { renderers: Record<string, { entry: string; propsApiVersion: number }> };
    };
  };
};

describe("the props version this display is built against", () => {
  it("is 2 — the version whose snapshot carries the content channel", () => {
    expect(PROPS_API_VERSION).toBe(2);
  });

  it("declares v5 for detail and listRow at its own version, and no other slot", () => {
    const renderers = pkg.cinatra.artifact.ui.renderers;
    expect(Object.keys(renderers).sort()).toEqual(["detail", "listRow"]);
    expect(renderers.detail.propsApiVersion).toBe(5);
    expect(renderers.listRow.propsApiVersion).toBe(1);
  });

  it("is declared by the exported typed manifest, in lock-step with package.json", () => {
    expect(websiteArtifactsManifest.ui.renderers.detail.propsApiVersion).toBe(5);
    expect(websiteArtifactsManifest.ui.renderers.listRow.propsApiVersion).toBe(1);
    expect(websiteArtifactsManifest.ui.renderers).toEqual(pkg.cinatra.artifact.ui.renderers);
  });
});

describe("the content-channel version this display reads a projection at", () => {
  it("is 1 — a projection built at any other version is refused, not guessed at", () => {
    expect(ARTIFACT_CONTENT_CHANNEL_VERSION).toBe(1);
  });

  it("is a SEPARATE number from the props version, and must stay separately readable", () => {
    expect(ARTIFACT_CONTENT_CHANNEL_VERSION).not.toBe(PROPS_API_VERSION);
  });
});

import {
  ARTIFACT_OWNER_LEVELS,
  ARTIFACT_VISIBILITIES,
  EFFECTIVE_IDENTITY_KINDS,
} from "../src/renderer-props";

describe("the props mirror names the shapes the host actually sends", () => {
  // A MIRROR THAT ACCEPTS ANYTHING PROVES NOTHING. This display binds
  // structurally to the host's snapshot, so the enumerations are the whole
  // value of mirroring the contract at all: widened to `string`, the mirror
  // would have gone on typechecking against a host that had already changed
  // underneath it. These are the host's own projections, pinned as values so
  // the drift is a failing test rather than a display that renders nothing.
  it("projects ownership and visibility at the host's levels", () => {
    expect([...ARTIFACT_OWNER_LEVELS]).toEqual(["user", "team", "organization", "workspace"]);
    expect([...ARTIFACT_VISIBILITIES]).toEqual(["private", "team", "organization", "public"]);
  });

  it("knows both effective identities, the one without a primary extension included", () => {
    // The retired binding/classic `basis` and the `selectable` activation
    // barrier are gone from the host contract. A mirror that still required
    // them would refuse every snapshot the host now builds, so their absence
    // here is the fix, not an omission.
    expect([...EFFECTIVE_IDENTITY_KINDS]).toEqual(["extension", "no-primary"]);
  });
});
