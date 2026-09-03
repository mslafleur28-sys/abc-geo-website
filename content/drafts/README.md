# Article briefs (frontmatter markdown or JSON)

Drafts saved from `/admin/articles` land here as `{slug}.md` (or `.json`).

Manage them at `/admin/drafts`:

- Open a draft to edit fields and regenerate the Cursor Agent prompt
- Mark **Ready for Agent** when the brief is complete
- Mark **Published** to move the file to `content/published/`

## Version backups

Every successful save also writes a snapshot to:

`content/.versions/{slug}/{timestamp}.md`

- The file in this folder (`{slug}.md`) is always the **current** draft.
- Snapshots older than **7 days** are deleted automatically on the next save
  for that article (so backups don’t pile up forever).
- Version folders are local-only (gitignored) and never appear in the drafts list.

To restore an older version, copy a snapshot from `.versions/{slug}/` over the
current `{slug}.md` (or ask an agent to do it).

Cursor Agents use these files (or the copied Agent prompt) to produce the
published static HTML under `blog/{slug}.html`.
