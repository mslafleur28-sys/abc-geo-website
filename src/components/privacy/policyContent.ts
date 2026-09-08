export type PolicySection = {
  id: string;
  title: string;
  paragraphs: string[];
  bullets?: string[];
};

export const POLICY_LAST_UPDATED = 'September 7, 2026';

export const POLICY_SECTIONS: PolicySection[] = [
  {
    id: 'overview',
    title: '1. Overview & Scope',
    paragraphs: [
      'This Privacy Policy explains how abcGEO (“we,” “us,” or “our”) collects, uses, and protects information when you visit abcgeo.dev, use our Generative Engine Optimization (GEO) tools, read editorial content, or contact us.',
      'It applies to our websites, interactive utilities (including INSTASTACK and related diagnostic tools), embedded chat experiences, and any forms you submit through abcGEO surfaces. By using the site, you agree to the practices described here.',
    ],
  },
  {
    id: 'information-collected',
    title: '2. Information We Collect',
    paragraphs: [
      'We collect information in three broad categories: information you provide, information collected automatically, and information processed when you run interactive GEO utilities.',
    ],
    bullets: [
      'Contact details you submit (name, email, message contents, collaboration requests).',
      'Optional privacy-request emails you enter when managing consent preferences.',
      'Technical data such as browser type, device characteristics, approximate location derived from IP, and pages viewed.',
      'Tool inputs you choose to submit (prompts, URLs, schema snippets, or configuration options) for live analysis.',
      'Preference signals such as cookie consent and policy acknowledgments stored locally on your device.',
    ],
  },
  {
    id: 'how-we-use',
    title: '3. How We Use Information',
    paragraphs: [
      'We use information to operate, improve, and secure abcGEO services—not to sell personal data.',
    ],
    bullets: [
      'Respond to inquiries, editorial pitches, and support requests.',
      'Deliver interactive tool results and diagnose GEO/schema issues you ask us to inspect.',
      'Measure aggregate site performance, reliability, and content usefulness when analytics consent is granted.',
      'Honor data-subject requests (access, deletion, export) under applicable privacy laws.',
      'Enforce acceptable use, prevent abuse, and maintain the integrity of our services.',
    ],
  },
  {
    id: 'cookies',
    title: '4. Cookies & Tracking',
    paragraphs: [
      'We use essential cookies and local storage to remember privacy preferences and keep core site functions working. Analytics and performance cookies (for example, Google Analytics) run only when you opt in via the acknowledgment form or an equivalent consent control.',
      'You can change analytics consent at any time by returning to this page and saving updated preferences. Browser settings may also block or delete cookies; doing so can reset stored preferences.',
    ],
  },
  {
    id: 'data-sharing',
    title: '5. Data Sharing',
    paragraphs: [
      'We do not sell personal information. We share data only with service providers who help us host, deliver, or secure the site (for example, infrastructure, email, or analytics vendors), and only as needed to perform those services under appropriate contractual safeguards.',
      'We may disclose information if required by law, to protect rights and safety, or in connection with a corporate transaction where privacy commitments continue to apply.',
    ],
  },
  {
    id: 'retention-security',
    title: '6. Retention & Security',
    paragraphs: [
      'We retain personal information only as long as needed for the purposes described in this policy, including legal, accounting, or security requirements. Contact-form messages and privacy requests are kept for operational follow-up, then deleted or anonymized when no longer needed.',
      'We apply reasonable administrative, technical, and organizational measures to protect information. No method of transmission or storage is perfectly secure; please avoid submitting highly sensitive credentials or private keys through public tools.',
    ],
  },
  {
    id: 'legal-rights',
    title: '7. Legal Rights (GDPR / CCPA)',
    paragraphs: [
      'Depending on your location, you may have rights to access, correct, delete, export, or restrict processing of personal data; to object to certain processing; and to withdraw consent where processing relies on consent.',
      'California residents may have additional rights under the CCPA/CPRA, including the right to know categories of personal information collected and to request deletion, subject to legal exceptions. We do not sell personal information as defined by CCPA.',
      'To exercise rights, email info@abcgeo.dev with the subject line “Privacy Request,” or use the optional email field in the acknowledgment form below. We may need to verify your identity before fulfilling a request.',
    ],
  },
  {
    id: 'children',
    title: '8. Children’s Privacy',
    paragraphs: [
      'abcGEO is intended for professionals and adults. We do not knowingly collect personal information from children under 16 (or under 13 where that is the applicable threshold). If you believe a child has provided personal information, contact us and we will take appropriate steps to delete it.',
    ],
  },
  {
    id: 'geo-tools',
    title: '9. Interactive GEO Tools & Prompt Submissions',
    paragraphs: [
      'Our interactive GEO utilities may accept live inputs such as prompts, public page URLs, structured-data snippets, or configuration choices. Those inputs are processed in near real time to generate diagnostic output (for example, INSTASTACK checks, citation-readiness guidance, or schema observations).',
      'Prompt and tool submissions are treated as transient operational data used to fulfill your request. Avoid pasting secrets, authentication tokens, private customer records, or non-public personal data into tool fields. If a submission is logged for abuse prevention or reliability, it is retained only as long as needed for that purpose.',
    ],
  },
  {
    id: 'ai-training',
    title: '10. AI Model Training Policy (Zero-Training Guarantee)',
    paragraphs: [
      'Zero-Training Guarantee: Inputs you submit through abcGEO client tools—including prompts, URLs, and diagnostic payloads—are not used to train, fine-tune, or improve foundation models operated by abcGEO.',
      'Where a tool calls a third-party model provider to generate a response, we configure available provider controls to opt out of training on those inputs when such controls exist. Provider terms may still apply to that vendor’s processing; we select providers and settings consistent with this guarantee for client tool traffic.',
    ],
  },
  {
    id: 'url-fetching',
    title: '11. URL Fetching, Web Scraping & Bot Signals',
    paragraphs: [
      'Certain diagnostic utilities fetch publicly reachable HTML, headers, or structured data when you supply a URL. Fetching is performed to inspect on-page GEO signals (title, headings, schema/JSON-LD, canonical tags, and similar public markup)—not to bypass authentication or access private systems.',
      'Bot crawling & machine-readable data: Independently of our tools, AI answer engines and search crawlers may index publicly published pages, including JSON-LD and other machine-readable markup you choose to expose. Publishing structured data on your own site is under your control; abcGEO editorial and tooling educate on those formats but do not grant crawlers special access to private data.',
      'Do not submit URLs that you are not authorized to analyze. Scraped public markup processed for a diagnostic run is used to return results to you and is not retained as a permanent copy of third-party sites beyond operational necessity.',
    ],
  },
  {
    id: 'external-updates-contact',
    title: '12. External Links, Updates & Contact',
    paragraphs: [
      'External links: Our site may link to third-party websites, tools, or documentation. Those destinations have their own privacy practices; we are not responsible for their content or policies.',
      'Updates: We may revise this Privacy Policy to reflect product, legal, or operational changes. The “Last updated” date at the top of this page will change when we do. Continued use after an update constitutes acceptance of the revised policy where permitted by law.',
      'Contact: For privacy questions, data requests, or concerns about this policy, email info@abcgeo.dev or use the contact options on our Contact page. Editorial inquiries may also reach editorial@abcgeo.com.',
    ],
  },
];
