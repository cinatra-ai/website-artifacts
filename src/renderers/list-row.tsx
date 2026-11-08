// The `listRow` display: the row icon of this package's type in the Artifacts list.
// It draws one icon at 17 pixels inside the application's 34 pixel cell, whose size and
// tint stay the application's. It reads nothing but its props, requests no host port,
// fetches nothing and returns the same icon for every object type it receives.

import { AppWindow } from "lucide-react";

import type { ArtifactRendererProps } from "../renderer-props";

export interface ListRowProps {
  artifact: Pick<ArtifactRendererProps["artifact"], "objectType">;
}

export default function ListRow(_props: ListRowProps) {
  return <AppWindow aria-hidden size={17} strokeWidth={2} data-row-glyph="app-window" />;
}
