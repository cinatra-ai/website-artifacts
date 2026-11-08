"use client";

// THE ONE FRAME the page display can draw: the published page itself, embedded
// live at the width the surface gives it. It loads the address it is handed,
// which the page view admits by the model's site-bound rule (boundFrameAddress:
// an address the frame-address rule admits, on the origin of the site the view
// is handed; the frame-address rule admits a text that starts with https:// and
// names a host of two labels or more on the default port 443, never an IP
// literal, `home.arpa`, `localhost` or a name under `.localhost`, `.local`,
// `.internal` or `.home.arpa`, a one-label name or a name with an empty label,
// one trailing dot aside), and nothing of this package's own content. The rule
// reads that first address only: the browser may follow a redirect the site
// answers with, inside the sandbox. It is sandboxed with no permission at all,
// sends no referrer, and loads lazily.
//
// A site that does not answer is a condition of the embed, never a reading of
// its own: with no address the page view admits, or once the watchdog elapses
// without a load, the frame's own place names the gap, and the changes beneath
// it are drawn as always.
//
// WHAT THE WATCHDOG CANNOT TELL APART: a load is the only signal this frame
// reads from the page, and the watchdog starts when the frame mounts. So a
// frame the browser defers (it is lazy, and may sit off screen or in a hidden
// tab) fires no load, and after the watchdog its place names the gap although
// the page was never requested. And a browser can fire a load for a page that
// paints nothing here — a page that draws only with scripts, which the sandbox
// does not run, a site that refuses to be framed, or an address that does not
// answer, for which the browser draws its own error page. Such a page keeps its
// frame, drawn without the page (blank, or with the browser's own refusal or
// error), and the gap is not named in its place. A browser that fires no load
// for such a page reaches the gap instead.

import { type CSSProperties, type ReactNode, useEffect, useState } from "react";

import { FRAME_WATCHDOG_MS, frameState } from "../cms-page-model";

export const PAGE_GAP_MESSAGE = "The page cannot be shown here. The changes are below.";

const frameStyle: CSSProperties = {
  display: "block",
  width: "100%",
  height: "480px",
  border: "1px solid var(--border, #e5e7eb)",
  borderRadius: "6px",
  background: "var(--background, #ffffff)",
};

const gapStyle: CSSProperties = {
  fontSize: "13px",
  color: "var(--muted-foreground, #6b7280)",
  padding: "16px 12px",
  border: "1px dashed var(--border, #e5e7eb)",
  borderRadius: "6px",
};

export function PageFrame({ address, title }: { address: string | null; title: string }): ReactNode {
  const [loaded, setLoaded] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    setLoaded(false);
    setElapsedMs(0);
    if (address === null) return undefined;
    const timer = setTimeout(() => setElapsedMs(FRAME_WATCHDOG_MS), FRAME_WATCHDOG_MS);
    return () => clearTimeout(timer);
  }, [address]);

  const markLoaded = (): void => setLoaded(true);

  if (address === null || frameState({ address, loaded, elapsedMs }) === "gap") {
    return (
      <div role="status" style={gapStyle} data-cms-page-gap>
        {PAGE_GAP_MESSAGE}
      </div>
    );
  }

  return (
    <iframe src={address} title={title} sandbox="" referrerPolicy="no-referrer" loading="lazy" style={frameStyle} onLoad={markLoaded} data-cms-page-frame />
  );
}
