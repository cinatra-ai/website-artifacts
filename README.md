# CMS page

The page display for WordPress and Drupal pages in the Cinatra artifact library: the package `@cinatra-ai/website-artifacts`. It declares the page snapshot, the type an agent extension is to file when it proposes a change to a WordPress or a Drupal page, and one renderer, `@cinatra-ai/website-artifacts:page-diff`, that draws it as one view: the page in a frame, or a named gap in its place, beneath it a diff of only the changed excerpts, each in the page's own formatting, and a link that opens the page in the CMS. WordPress and Drupal pages are one drawing, so neither extension needs a page display of its own. No agent extension files this type yet, and the application does not yet draw through this package.

The page snapshot is a JSON document of type `@cinatra-ai/website-artifacts:page-snapshot` that holds `cinatraCmsPage`, `system`, `page` (`title`, `address`, `cmsAddress`), `readAt` and `excerpts` (`region`, `position`, `kind`, `level`, `published`, `proposed`).

Once a release of this package is published, install it from the Cinatra marketplace by searching for "CMS page" and clicking **Add**. No credentials or configuration are required.

## Works with

- Cinatra artifacts — page snapshots, as the WordPress and the Drupal agent extensions are to file them
- The artifact-review surface — where the application binds this pack, a pending page snapshot review target draws here, so the decision binds to the page as it will read

## Capabilities

- See the page live in a frame when the display is handed the page's site, or a named gap in its place. The frame's first request is only an address whose text starts with `https://`, on that site's origin and the default port, and never one at an IP literal, `localhost`, `home.arpa`, a one-label name or a name under `.localhost`, `.local`, `.internal` or `.home.arpa`. The detail display of this version reads no site from the artifact, so it shows the gap. A page that does not load in the frame in time shows the gap too; one that refuses framing or fails may show blank or the browser's error instead, and the site may redirect the frame
- Read only the changed excerpts, with removals and additions marked in place and unchanged runs elided
- Open the page in its CMS from the link under the changes
- Read a named reason, never a blank panel, when the content cannot be drawn
- Find a page snapshot in the Artifacts list by its row icon
