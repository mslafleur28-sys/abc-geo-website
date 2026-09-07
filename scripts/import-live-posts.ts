/**
 * Import live blog/*.html posts into content/published/*.md so they appear
 * in the draft studio for editing.
 *
 * Usage:
 *   npx tsx scripts/import-live-posts.ts
 *   npx tsx scripts/import-live-posts.ts --force
 */
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { getDraft, saveDraft } from '../src/lib/article-brief/drafts.ts';
import {
  importLiveBlogHtml,
  LIVE_BLOG_SKIP_SLUGS,
} from '../src/lib/article-brief/import-live-post.ts';
import { readFile } from 'node:fs/promises';

async function main() {
  const force = process.argv.includes('--force');
  const blogDir = path.join(process.cwd(), 'blog');
  const files = (await readdir(blogDir))
    .filter((f) => f.endsWith('.html'))
    .sort();

  const results: Array<{ slug: string; action: string }> = [];

  for (const file of files) {
    const slug = file.replace(/\.html$/i, '');
    if (LIVE_BLOG_SKIP_SLUGS.has(slug)) {
      results.push({ slug, action: 'skipped (template)' });
      continue;
    }

    const existing = await getDraft(slug);
    // Never clobber hand-authored studio drafts unless --force AND not protected.
    const protectedSlugs = new Set([
      'the-three-hats-of-seo-white-grey-and-black-hats-explained',
      'what-is-generative-engine-optimization',
    ]);
    if (existing && (!force || protectedSlugs.has(slug))) {
      results.push({ slug, action: `kept existing (${existing.relativePath})` });
      continue;
    }

    const html = await readFile(path.join(blogDir, file), 'utf8');
    const imported = importLiveBlogHtml(html, slug);
    const saved = await saveDraft({
      brief: imported.brief,
      status: 'published',
      format: 'markdown',
      title: imported.title,
    });

    results.push({
      slug,
      action: `imported → ${saved.relativePath} (${saved.brief.rawBody.length} chars body)`,
    });
  }

  for (const row of results) {
    console.log(`${row.slug}: ${row.action}`);
  }
  console.log(`\nDone. ${results.length} files processed.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
