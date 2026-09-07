import { access, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { getDraft, updateDraftStatus } from './drafts';
import {
  buildBlogIndexCard,
  buildPublishedArticleHtml,
} from './publish-html';
import { validateBrief } from './schema';

export interface PublishToBlogResult {
  blogPath: string;
  canonical: string;
  title: string;
  updated: {
    blogIndex: boolean;
    sitemap: boolean;
    llms: boolean;
  };
  draftPath: string;
}

async function upsertBlogIndexCard(input: {
  title: string;
  slug: string;
  description: string;
}): Promise<boolean> {
  const blogIndexPath = path.join(process.cwd(), 'blog.html');
  let html = await readFile(blogIndexPath, 'utf8');
  const href = `blog/${input.slug}.html`;

  if (html.includes(`href="${href}"`)) {
    return false;
  }

  const card = buildBlogIndexCard(input);
  const marker = '<div class="post-grid">';
  if (!html.includes(marker)) {
    throw new Error('Could not find post-grid in blog.html');
  }
  html = html.replace(marker, `${marker}\n${card}`);
  await writeFile(blogIndexPath, html, 'utf8');
  return true;
}

async function upsertSitemap(canonical: string, lastmod: string): Promise<boolean> {
  const sitemapPath = path.join(process.cwd(), 'sitemap.xml');
  let xml = await readFile(sitemapPath, 'utf8');
  if (xml.includes(`<loc>${canonical}</loc>`)) {
    return false;
  }
  const entry = `  <url>
    <loc>${canonical}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
`;
  if (!xml.includes('</urlset>')) {
    throw new Error('Could not find </urlset> in sitemap.xml');
  }
  xml = xml.replace('</urlset>', `${entry}</urlset>`);
  await writeFile(sitemapPath, xml, 'utf8');
  return true;
}

async function upsertLlmsTxt(input: {
  title: string;
  canonical: string;
  description: string;
}): Promise<boolean> {
  const llmsPath = path.join(process.cwd(), 'llms.txt');
  let text = await readFile(llmsPath, 'utf8');
  if (text.includes(input.canonical)) {
    return false;
  }

  const line = `- [${input.title}](${input.canonical}): ${input.description.slice(0, 120)}`;
  const section = '## Key editorial\n';
  if (text.includes(section)) {
    text = text.replace(section, `${section}${line}\n`);
  } else {
    text = `${text.trimEnd()}\n\n## Key editorial\n${line}\n`;
  }
  await writeFile(llmsPath, text, 'utf8');
  return true;
}

/** Generate blog HTML from a draft and wire index/sitemap/llms. */
export async function publishDraftToBlog(
  slug: string,
): Promise<PublishToBlogResult> {
  const draft = await getDraft(slug);
  if (!draft) {
    throw new Error('Draft not found.');
  }

  const validation = validateBrief(draft.brief);
  if (!validation.ok) {
    throw new Error(
      `Draft is incomplete: ${Object.values(validation.errors).join(' ')}`,
    );
  }

  const built = buildPublishedArticleHtml(draft.brief, {
    title: draft.title,
    createdAt: draft.createdAt,
    updatedAt: new Date().toISOString(),
  });

  const blogAbs = path.join(process.cwd(), 'blog', built.filename);
  await writeFile(blogAbs, built.html, 'utf8');

  const lastmod = new Date().toISOString().slice(0, 10);
  const updated = {
    blogIndex: await upsertBlogIndexCard({
      title: built.title,
      slug: draft.brief.slug,
      description: built.description,
    }),
    sitemap: await upsertSitemap(built.canonical, lastmod),
    llms: await upsertLlmsTxt({
      title: built.title,
      canonical: built.canonical,
      description: built.description,
    }),
  };

  const publishedDraft = await updateDraftStatus(draft.brief.slug, 'published');

  // Confirm file exists
  await access(blogAbs);

  return {
    blogPath: built.relativePath,
    canonical: built.canonical,
    title: built.title,
    updated,
    draftPath: publishedDraft.relativePath,
  };
}
