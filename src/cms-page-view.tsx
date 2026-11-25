"use client";

// THE CMS PAGE — ONE VIEW, no tab strip. Drawn from the page content form an
// agent extension files; the view is also handed the revision it stamps:
//
//   'Changes' and a diff of only the changed excerpts, each in the page's own
//     formatting, what the change removes and adds marked in place and the
//     unchanged run between two excerpts left out under an elision;
//   directly under the excerpts, with nothing between, the link that opens the
//     page in the CMS: the reader's only way to the page itself.
//
// The view draws no frame of the page and no box or gap in its place: the host
// hands a display no origin of the connected site, and the excerpts are the part
// that always exists. It draws no heading of its own, no status and no marker:
// the surface around it draws those. The words are plain text; no markup is
// taken from the content.
//
// THE LINK'S ADDRESS comes from the artifact content, which an agent wrote, so
// it is drawn only when httpsAddress admits it: a text that starts with
// `https://`, parses as an https URL and carries no user name or password. Any
// other text (`http:`, `javascript:`, `data:`, a relative path, an https text
// without its two slashes) draws no link.

import { type CSSProperties, type ReactNode } from "react";

import {
  excerptGroups,
  httpsAddress,
  wordDiff,
  type CmsPage,
  type CmsPageExcerpt,
  type CmsPageExcerptEntry,
} from "./cms-page-model";

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

// The design's `.btn.link`: the link colour, underlined. `--info` is the
// design's indigo in the light palette and a lighter blue that reads on the
// dark ground in the dark palette, and the app declares it in the document of
// the artifact page, the review card and the review island alike. (`--primary`
// is near-white in the dark palette; `--indigo-ink` does not move with the
// theme and is too dark on the dark ground.)
const linkStyle: CSSProperties = {
  fontSize: "13px",
  color: "var(--info, #364e81)",
  textDecoration: "underline",
  textUnderlineOffset: "3px",
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

/** The one view: the changed excerpts, the link that opens the page in the CMS
 * directly under them. */
export function CmsPageView({ page, revisionId }: { page: CmsPage; revisionId: string }): ReactNode {
  const cmsAddress = httpsAddress(page.page.cmsAddress);
  return (
    <div style={rootStyle} data-cms-page="page" data-cms-system={page.system} data-revision={revisionId}>
      <p style={labelStyle} data-cms-page-label>
        Changes
      </p>
      <div style={excerptsStyle} data-cms-page-excerpts data-field="excerpts=representation.changed-excerpts">
        <Excerpts entries={excerptGroups(page.excerpts)} />
      </div>
      {cmsAddress !== null ? (
        <a
          style={linkStyle}
          href={cmsAddress}
          target="_blank"
          rel="noopener noreferrer"
          data-cms-open
          data-action="open-in-cms -> cms-opened"
        >
          Open in the CMS
        </a>
      ) : null}
    </div>
  );
}
