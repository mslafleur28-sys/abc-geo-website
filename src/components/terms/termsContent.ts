export type TermsSection = {
  id: string;
  title: string;
  paragraphs: string[];
  bullets?: string[];
};

export const TERMS_LAST_UPDATED = 'September 7, 2026';
export { TERMS_VERSION } from '@/lib/termsAcceptance';

export const TERMS_SECTIONS: TermsSection[] = [
  {
    id: 'acceptance',
    title: '1. Acceptance of Terms & Eligibility',
    paragraphs: [
      'These Terms of Service (“Terms”) govern your access to and use of abcGEO websites, editorial content, interactive Generative Engine Optimization (GEO) tools, APIs, and related services (collectively, the “Services”). By accessing or using the Services, you agree to these Terms and our Privacy Policy.',
      'You must be at least 18 years old, or the age of majority in your jurisdiction, to use the Services. If you use the Services on behalf of an organization, you represent that you are an authorized representative of that organization and that your acceptance binds the organization.',
    ],
  },
  {
    id: 'accounts',
    title: '2. Account Registration & Security',
    paragraphs: [
      'Some features may require an account or authenticated access (for example, admin or collaboration surfaces). You agree to provide accurate registration information and to keep credentials confidential.',
      'You are responsible for all activity under your account. Notify us promptly at info@abcgeo.dev if you suspect unauthorized access. We may suspend or revoke access where we reasonably believe an account has been compromised or misused.',
    ],
  },
  {
    id: 'intellectual-property',
    title: '3. Intellectual Property Rights',
    paragraphs: [
      'abcGEO and its licensors own all rights, title, and interest in the Services, including the site design, branding, documentation, proprietary GEO formulas and frameworks (including A + B = GEO and INSTASTACK methodologies), algorithms, software, and editorial content—except for content you submit or that we expressly license from others.',
      'These Terms do not transfer ownership of our intellectual property to you. You may not copy, modify, distribute, reverse engineer, or create derivative works from our proprietary materials except as expressly permitted in writing or by features of the Services.',
    ],
  },
  {
    id: 'interactive-tools',
    title: '4. Interactive Tools & Live Utilities',
    paragraphs: [
      'abcGEO offers browser-based GEO diagnostic utilities, schema generators, entity analysis tools, and related live features. These tools are provided to help you evaluate and improve publicly oriented content signals for answer engines and search surfaces.',
      'Tool outputs are informational and diagnostic only. They do not guarantee rankings, citations, AI Overview inclusion, or commercial outcomes. You remain solely responsible for how you apply recommendations, publish markup, or change production sites.',
      'Fair use of interactive tools means submitting reasonable, non-abusive workloads; avoiding automated bulk submission that degrades service quality; and not using tools to harm third parties or violate applicable law.',
    ],
  },
  {
    id: 'url-diagnostics',
    title: '5. Web Scraping & URL Diagnostic Submissions',
    paragraphs: [
      'Certain utilities fetch and parse publicly reachable pages when you submit a URL. By submitting a URL, you represent and warrant that you have explicit rights or authorization to request analysis of that resource (for example, you own the site, manage it, or have permission from the rights holder).',
      'You must not submit URLs that require authentication you do not control, that target private systems, or that are intended to circumvent access controls. We may refuse, rate-limit, or log diagnostic requests to protect the Services and third parties.',
    ],
  },
  {
    id: 'output-ownership',
    title: '6. Output Ownership & IP License',
    paragraphs: [
      'You retain ownership of content you submit to the Services (including prompts, URLs you are authorized to analyze, and materials you paste into tools) and of schema or diagnostic outputs generated from your inputs, to the extent those outputs contain your original content.',
      'You grant abcGEO a limited, worldwide, non-exclusive, royalty-free license to host, process, transmit, and display your submissions solely as needed to operate the requested real-time analysis and deliver results to you. This license does not include a right for abcGEO to use your tool inputs to train foundation models, consistent with our Privacy Policy Zero-Training Guarantee for client tool traffic.',
    ],
  },
  {
    id: 'api-abuse',
    title: '7. API Usage, Rate Limits & Automated Abuse',
    paragraphs: [
      'Where APIs, chat endpoints, or diagnostic backends are exposed, you must use them only as documented and within any published or communicated rate limits. We may throttle, block, or revoke access that threatens availability or integrity of the Services.',
    ],
    bullets: [
      'No malicious automated scraping of abcGEO pages, APIs, or tool endpoints.',
      'No reverse engineering, probing, or exploiting backend AI endpoints beyond intended client usage.',
      'No credential stuffing, denial-of-service patterns, or attempts to bypass authentication or quotas.',
      'No resale or redistribution of API access without a separate written agreement.',
    ],
  },
  {
    id: 'acceptable-use',
    title: '8. Prohibited Conduct & Acceptable Use Policy',
    paragraphs: [
      'You agree not to use the Services for unlawful, harmful, or abusive purposes. Without limitation, you must not:',
    ],
    bullets: [
      'Violate any law, regulation, or third-party right (including privacy, IP, and computer misuse laws).',
      'Upload malware, attempt unauthorized access, or interfere with Service infrastructure.',
      'Harass others, spam, or submit deceptive or fraudulent content.',
      'Misrepresent affiliation with abcGEO or use our marks without permission.',
      'Use GEO tools to analyze or attack systems you are not authorized to assess.',
    ],
  },
  {
    id: 'disclaimer',
    title: '9. Disclaimer of Warranties',
    paragraphs: [
      'THE SERVICES ARE PROVIDED ON AN “AS IS” AND “AS AVAILABLE” BASIS WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, OR STATUTORY, INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT.',
      'We do not warrant that the Services will be uninterrupted, error-free, secure, or that diagnostic outputs will be complete or accurate for every use case. GEO and SEO outcomes depend on many factors outside our control, including third-party answer engines and search platforms.',
    ],
  },
  {
    id: 'liability',
    title: '10. Limitation of Liability',
    paragraphs: [
      'TO THE MAXIMUM EXTENT PERMITTED BY LAW, ABCGEO AND ITS CONTRIBUTORS WILL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, REVENUE, DATA, OR GOODWILL, ARISING FROM YOUR USE OF THE SERVICES.',
      'OUR AGGREGATE LIABILITY FOR CLAIMS RELATING TO THE SERVICES WILL NOT EXCEED THE GREATER OF ONE HUNDRED U.S. DOLLARS (US $100) OR THE AMOUNTS YOU PAID TO ABCGEO FOR THE SERVICES IN THE TWELVE MONTHS BEFORE THE CLAIM. Some jurisdictions do not allow certain limitations; in those cases, our liability is limited to the fullest extent permitted.',
    ],
  },
  {
    id: 'termination',
    title: '11. Termination of Access',
    paragraphs: [
      'You may stop using the Services at any time. We may suspend or terminate access immediately if you breach these Terms, create risk or legal exposure for us or others, or if we discontinue a feature or the Services overall.',
      'Upon termination, your right to use the Services ceases. Provisions that by their nature should survive (including IP ownership, disclaimers, limitations of liability, and governing law) will survive termination.',
    ],
  },
  {
    id: 'governing-law',
    title: '12. Governing Law & Contact',
    paragraphs: [
      'These Terms are governed by the laws of the United States and the State of California, excluding conflict-of-law rules, unless mandatory consumer protections in your jurisdiction require otherwise. Courts located in California will have exclusive jurisdiction over disputes arising from these Terms, subject to applicable law.',
      'We may update these Terms from time to time. The “Last updated” date and terms version identifier will change when we do. Continued use after an update constitutes acceptance of the revised Terms where permitted by law. Material changes to acceptance requirements may require you to re-accept via the form on this page.',
      'Questions about these Terms: info@abcgeo.dev. Privacy questions are covered in our Privacy Policy at /privacy.',
    ],
  },
];
