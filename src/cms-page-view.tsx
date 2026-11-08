"use client";

// THE CMS PAGE — ONE VIEW, no tab strip. Drawn from the page content form an
// agent extension files; the view is also handed the revision it stamps and
// the site its frame is bound to:
//
//   the page itself, embedded in its frame at the address the form gives, only
//     when the frame-address rule admits it and it is on the origin of the
//     site the view is handed (boundFrameAddress); with no such site, or any
//     other address, the gap named in its place;
//   beneath it 'Changes' and a diff of only the changed excerpts, each in the
//     page's own formatting, what the change removes and adds marked in place
//     and the unchanged run between two excerpts left out under an elision;
//   under the excerpts, the link that opens the page in the CMS.
//
// The view draws no heading of its own, no status and no marker: the surface
// around it draws those. The words are plain text; no markup is taken from the
// content.

import { type CSSProperties, type ReactNode } from "react";

import {
  boundFrameAddress,
  excerptGroups,
  framableAddress,
  wordDiff,
  type CmsPage,
  type CmsPageExcerpt,
  type CmsPageExcerptEntry,
} from "./cms-page-model";
import { PageFrame } from "./renderers/page-frame";

const rootStyle: CSSProperties = { display: "flex", flexDirection: "column", gap: "12px", minWidth: 0 };

const labelStyle: CSSProperties = {
  fontSize: "11px",
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  color: "var(--muted-foreground, #6b7280)",
  margin: 0,
};

const excerptsStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  minWidth: 0,
  color: "var(--foreground, #111827)",
  wordBreak: "break-word",
};

const headingStyles: Record<number, CSSProperties> = {
  1: { fontSize: "22px", fontWeight: 700, lineHeight: 1.25 },
  2: { fontSize: "19px", fontWeight: 700, lineHeight: 1.3 },
  3: { fontSize: "17px", fontWeight: 600, lineHeight: 1.35 },
  4: { fontSize: "15px", fontWeight: 600, lineHeight: 1.4 },
  5: { fontSize: "14px", fontWeight: 600, lineHeight: 1.4 },
  6: { fontSize: "13px", fontWeight: 600, lineHeight: 1.4 },
};

const paragraphStyle: CSSProperties = { fontSize: "14px", lineHeight: 1.55, margin: 0 };

const listStyle: CSSProperties = { fontSize: "14px", lineHeight: 1.55, margin: 0, paddingLeft: "20px", listStyleType: "disc" };

const elisionStyle: CSSProperties = { color: "var(--muted-foreground, #6b7280)", fontSize: "14px" };

const delStyle: CSSProperties = {
  background: "var(--diff-removed, rgba(220, 38, 38, 0.14))",
  color: "inherit",
  textDecorationColor: "var(--destructive, #dc2626)",
};

const insStyle: CSSProperties = {
  background: "var(--diff-added, rgba(22, 163, 74, 0.16))",
  color: "inherit",
  textDecoration: "none",
};

const linkStyle: CSSProperties = {
  fontSize: "13px",
  color: "var(--primary, #2563eb)",
  textDecoration: "none",
  alignSelf: "flex-start",
};

/** The block's words with what the change removes and adds marked in place. */
function DiffWords({ excerpt }: { excerpt: CmsPageExcerpt }): ReactNode {
  const segments = wordDiff(excerpt.published, excerpt.proposed);
  return segments.map((segment, index) => {
    if (segment.op === "same") return <span key={index}>{segment.text}</span>;
    const core = segment.text.trimEnd();
    const trailing = segment.text.slice(core.length);
    if (core.length === 0) return <span key={index}>{segment.text}</span>;
    const previous = segments[index - 1];
    const separate = segment.op === "added" && previous?.op === "removed" && previous.text.trimEnd() === previous.text;
    const mark = segment.op === "removed" ? <del style={delStyle}>{core}</del> : <ins style={insStyle}>{core}</ins>;
    return (
      <span key={index}>
        {separate ? " " : null}
        {mark}
        {trailing}
      </span>
    );
  });
}

function Elision(): ReactNode {
  return (
    <div aria-hidden="true" style={elisionStyle} data-cms-elision>
      …
    </div>
  );
}

function Block({ excerpt }: { excerpt: CmsPageExcerpt }): ReactNode {
  if (excerpt.kind === "heading") {
    const level = excerpt.level ?? 2;
    return (
      <div role="heading" aria-level={level} style={headingStyles[level]} data-cms-excerpt="heading">
        <DiffWords excerpt={excerpt} />
      </div>
    );
  }
  return (
    <p style={paragraphStyle} data-cms-excerpt="paragraph">
      <DiffWords excerpt={excerpt} />
    </p>
  );
}

/** Consecutive list items share one list; an elision starts a new one. */
function Excerpts({ entries }: { entries: CmsPageExcerptEntry[] }): ReactNode {
  const out: ReactNode[] = [];
  let index = 0;
  while (index < entries.length) {
    const entry = entries[index];
    if (entry.elidedBefore) out.push(<Elision key={`elision-${index}`} />);
    if (entry.excerpt.kind === "list-item") {
      const items: CmsPageExcerpt[] = [entry.excerpt];
      let next = index + 1;
      while (next < entries.length && entries[next].excerpt.kind === "list-item" && !entries[next].elidedBefore) {
        items.push(entries[next].excerpt);
        next++;
      }
      out.push(
        <ul key={`list-${index}`} style={listStyle}>
          {items.map((item, offset) => (
            <li key={offset} data-cms-excerpt="list-item">
              <DiffWords excerpt={item} />
            </li>
          ))}
        </ul>,
      );
      index = next;
      continue;
    }
    out.push(<Block key={`block-${index}`} excerpt={entry.excerpt} />);
    index++;
  }
  return <>{out}</>;
}

/** The one view: the frame's place, the changed excerpts beneath it, the link
 * under them. `site` is to be the site's own address, from a record the host
 * keeps and never from the content: null when there is none, and then the
 * frame requests nothing. */
export function CmsPageView({ page, revisionId, site }: { page: CmsPage; revisionId: string; site: string | null }): ReactNode {
  const cmsAddress = framableAddress(page.page.cmsAddress);
  return (
    <div style={rootStyle} data-cms-page="page" data-cms-system={page.system} data-revision={revisionId}>
      <PageFrame address={boundFrameAddress(page.page.address, site)} title={page.page.title} />
      <p style={labelStyle} data-cms-page-label>
        Changes
      </p>
      <div style={excerptsStyle} data-cms-page-excerpts>
        <Excerpts entries={excerptGroups(page.excerpts)} />
      </div>
      {cmsAddress !== null ? (
        <a style={linkStyle} href={cmsAddress} target="_blank" rel="noopener noreferrer" data-cms-open>
          Open in the CMS
        </a>
      ) : null}
    </div>
  );
}
