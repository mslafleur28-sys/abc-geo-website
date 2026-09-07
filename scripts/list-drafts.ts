import { listDrafts } from '../src/lib/article-brief/drafts.ts';

async function main() {
  const items = await listDrafts();
  console.log('Drafts count:', items.length);
  for (const d of items.sort((a, b) => a.slug.localeCompare(b.slug))) {
    console.log(`- ${d.status.padEnd(10)} ${d.slug} — ${d.title.slice(0, 70)}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
