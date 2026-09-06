/**
 * Republish all studio drafts whose live HTML still depends on the
 * Tailwind Play CDN (blocked by Consentmanager).
 *
 * Usage: npx tsx scripts/republish-cdn-posts.ts
 */
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { getDraft, listDrafts } from '../src/lib/article-brief/drafts.ts';
import { buildPublishedArticleHtml } from '../src/lib/article-brief/publish-html.ts';
import { readFile } from 'node:fs/promises';

async function usesTailwindCdn(slug: string): Promise<boolean> {
  try {
    const html = await readFile(
      path.join(process.cwd(), 'blog', `${slug}.html`),
      'utf8',
    );
    return /cdn\.tailwindcss\.com/.test(html);
  } catch {
    return true;
  }
}

async function main() {
  const drafts = await listDrafts();
  const targets = [];
  for (const item of drafts) {
    if (await usesTailwindCdn(item.slug)) targets.push(item);
  }

  if (!targets.length) {
    console.log('No CDN-dependent posts found.');
    return;
  }

  for (const item of targets) {
    const draft = await getDraft(item.slug);
    if (!draft) {
      console.log(`${item.slug}: draft missing, skipped`);
      continue;
    }
    const built = buildPublishedArticleHtml(draft.brief, {
      title: draft.title,
      createdAt: draft.createdAt,
      updatedAt: draft.updatedAt,
    });
    await writeFile(path.join(process.cwd(), 'blog', built.filename), built.html, 'utf8');
    const ok =
      built.html.includes('published-article.css') &&
      !/src=["']https:\/\/cdn\.tailwindcss\.com/.test(built.html);
    console.log(
      `${item.slug}: ${ok ? 'ok' : 'WARN'} → ${built.relativePath} (${built.title.slice(0, 50)})`,
    );
  }
  console.log(`\nRepublished ${targets.length} post(s).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
