import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { getDraft } from '../src/lib/article-brief/drafts.ts';
import { buildPublishedArticleHtml } from '../src/lib/article-brief/publish-html.ts';

async function main() {
  const slug = process.argv[2];
  const titleOverride = process.argv[3];
  if (!slug) {
    throw new Error('Usage: npx tsx scripts/republish-article.ts <slug> [title]');
  }
  const draft = await getDraft(slug);
  if (!draft) throw new Error(`Draft not found: ${slug}`);
  const built = buildPublishedArticleHtml(draft.brief, {
    title: titleOverride || draft.title,
    createdAt: draft.createdAt,
    updatedAt: draft.updatedAt,
  });
  await writeFile(path.join(process.cwd(), 'blog', built.filename), built.html, 'utf8');
  console.log('Wrote', built.relativePath);
  console.log('Title:', built.title);
  console.log('Has Tailwind CDN script?', /src=["']https:\/\/cdn\.tailwindcss\.com/.test(built.html));
  console.log('Has published-article.css?', built.html.includes('published-article.css'));
  console.log('Has reading progress?', built.html.includes('data-reading-progress'));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
