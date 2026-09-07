import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const targetDomain = process.env.GENERATOMETRICS_TARGET_DOMAIN ?? 'abcgeo.dev';
  const now = new Date();

  await prisma.citation.deleteMany();
  await prisma.ga4Conversion.deleteMany();

  await prisma.citation.createMany({
    data: [
      {
        keyword: 'A + B = GEO framework',
        engine: 'Perplexity',
        citedUrl: `https://${targetDomain}/blog/the-a-plus-b-geo-framework.html`,
        status: 'active',
        discoveryDate: now,
      },
      {
        keyword: 'answer-first content AI Overviews',
        engine: 'Perplexity',
        citedUrl: `https://${targetDomain}/blog/answer-first-content-for-ai-overviews.html`,
        status: 'active',
        discoveryDate: now,
      },
      {
        keyword: 'GEO framework overview',
        engine: 'Perplexity',
        citedUrl: `https://${targetDomain}/framework.html`,
        status: 'active',
        discoveryDate: now,
      },
      {
        keyword: 'Citationscape GEO tool',
        engine: 'ChatGPT',
        citedUrl: `https://${targetDomain}/tools/citationscape.html`,
        status: 'active',
        discoveryDate: now,
      },
    ],
  });

  await prisma.ga4Conversion.createMany({
    data: [
      {
        timestamp: now,
        engine: 'perplexity',
        landingPage: '/blog/the-a-plus-b-geo-framework.html',
        sessions: 42,
        conversions: 3,
        revenue: 1240.5,
      },
      {
        timestamp: now,
        engine: 'chatgpt',
        landingPage: '/blog/answer-first-content-for-ai-overviews.html',
        sessions: 18,
        conversions: 1,
        revenue: 320,
      },
      {
        timestamp: now,
        engine: 'google-ai-overview',
        landingPage: '/tools/citationscape.html',
        sessions: 9,
        conversions: 0,
        revenue: 0,
      },
      {
        timestamp: now,
        engine: 'perplexity',
        landingPage: '/framework.html',
        sessions: 0,
        conversions: 0,
        revenue: 0,
      },
    ],
  });

  console.log('Generatometrics seed complete.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
