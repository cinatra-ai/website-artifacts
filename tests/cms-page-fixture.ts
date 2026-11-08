// The page content form an agent extension files for a change it proposes to
// a page (cinatra#3092), in both systems it serves, carrying the approved
// drawing's three excerpts: a heading, a paragraph and a list item, none of
// them adjacent to the one before.

import type { ArtifactRendererProps } from "../src/renderer-props";
import { props, REVISION_ID, textContent } from "./props-fixture";

export const PAGE_TITLE = "Pricing — 2026 plans";
export const PAGE_ADDRESS = "https://acme.example/pricing";

const EXCERPTS = [
  {
    region: "title",
    position: 0,
    kind: "heading",
    level: 1,
    published: "Pricing that grows with you",
    proposed: "Pricing — 2026 plans",
  },
  {
    region: "content",
    position: 2,
    kind: "paragraph",
    published: "Three plans, a price held since 2024, and the migration note under each.",
    proposed: "Three plans, one price change, and the migration note under each.",
  },
  {
    region: "content",
    position: 5,
    kind: "list-item",
    published: "Team — 35 per seat",
    proposed: "Team — 39 per seat",
  },
];

export interface PageFormFixture {
  system: "wordpress" | "drupal";
  cmsAddress: string;
  form: Record<string, unknown>;
}

function form(system: "wordpress" | "drupal", cmsAddress: string): Record<string, unknown> {
  return {
    cinatraCmsPage: 1,
    system,
    page: { title: PAGE_TITLE, address: PAGE_ADDRESS, cmsAddress },
    readAt: "2026-09-29T10:00:00.000Z",
    excerpts: EXCERPTS.map((excerpt) => ({ ...excerpt })),
  };
}

export const WORDPRESS_FORM: PageFormFixture = {
  system: "wordpress",
  cmsAddress: "https://acme.example/wp-admin/post.php?post=42&action=edit",
  form: form("wordpress", "https://acme.example/wp-admin/post.php?post=42&action=edit"),
};

export const DRUPAL_FORM: PageFormFixture = {
  system: "drupal",
  cmsAddress: "https://acme.example/node/7/edit",
  form: form("drupal", "https://acme.example/node/7/edit"),
};

export const PAGE_FORMS: PageFormFixture[] = [WORDPRESS_FORM, DRUPAL_FORM];

/** A copy of a form with its page fields replaced. */
export function withPage(fixture: PageFormFixture, page: Record<string, unknown>): Record<string, unknown> {
  const base = fixture.form.page as Record<string, unknown>;
  return { ...fixture.form, page: { ...base, ...page } };
}

/** The snapshot a host builds for a page artifact this pack draws: the text
 * class of the content channel, the JSON representation, the pinnable type. */
export function pageProps(
  document: unknown,
  overrides: Partial<Extract<ArtifactRendererProps["content"], { kind: "text" }>> = {},
): ArtifactRendererProps {
  const text = typeof document === "string" ? document : JSON.stringify(document);
  const base = props(textContent(text, overrides));
  return {
    ...base,
    artifact: {
      ...base.artifact,
      title: PAGE_TITLE,
      mime: "application/json",
      objectType: "@cinatra-ai/website-artifacts:page-snapshot",
    },
    representation: { revisionId: REVISION_ID, mime: "application/json" },
  };
}
