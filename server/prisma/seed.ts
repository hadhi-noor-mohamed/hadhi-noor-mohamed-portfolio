/**
 * Development / first-run seed.
 *
 * Principles:
 *  - Only truthful, resume-supported information is seeded as *published*.
 *  - Anything the owner still has to supply is seeded as a clearly labelled
 *    DRAFT placeholder so it never appears on the public website.
 *  - The seed is idempotent and never deletes existing content, so it is safe
 *    to run against an existing database (`npm run db:seed`).
 *  - No social URLs, repositories, live demos, certificate verification links,
 *    screenshots, testimonials or traffic figures are invented.
 */
import { prisma } from '../src/db.js';
import { ensureBootstrap } from '../src/services/bootstrap.js';

const ABOUT_HTML = `
<p>I'm <strong>Hadhi Noor Mohamed H</strong>, a final-year B.E. Computer Science and Engineering student specializing in Cybersecurity at Dhanalakshmi Srinivasan Engineering College, Perambalur.</p>
<p>I'm interested in software development, cybersecurity, web technologies, and data analytics. I enjoy exploring new technologies, building practical projects, and finding ways to turn ideas into useful digital solutions.</p>
<p>My technical toolkit includes Python, Java, SQL, HTML, CSS, JavaScript, Git, GitHub, VS Code, and Canva. I'm also exploring AI-powered development tools and modern software engineering workflows.</p>
<p>Beyond coding, I've gained experience in content creation, operations coordination, digital marketing, and organizing online training activities.</p>
<p>I'm continuously learning, improving my problem-solving skills, and looking forward to opportunities where I can contribute, collaborate, and grow as a technology professional.</p>
`.trim();

async function seedProfile() {
  const existing = await prisma.profile.findFirst({ orderBy: { createdAt: 'asc' } });
  const data = {
    fullName: 'Hadhi Noor Mohamed H',
    headline: 'Aspiring Software Developer | Cybersecurity Enthusiast | Data Analytics Explorer',
    intro:
      'I enjoy building practical digital solutions, exploring cybersecurity, and learning technologies that turn ideas into useful products.',
    aboutHtml: ABOUT_HTML,
    location: 'Perambalur, Tamil Nadu, India',
    email: 'hadhinoor129@gmail.com',
    phone: '+91 9629523100',
    wordmark: 'Hadhi Noor',
    availabilityLabel: '',
    availabilityEnabled: false,
    seekingEmployment: false,
    openToFreelance: false,
    openToRelocation: false,
    openToInternship: false,
    techBadges: ['Python', 'Java', 'SQL', 'JavaScript', 'Power BI', 'Git', 'GitHub', 'Cybersecurity'],
    seoTitle: 'Hadhi Noor Mohamed H — Software Developer & Cybersecurity Student',
    seoDescription:
      'Final-year B.E. Computer Science (Cybersecurity) student building practical software, exploring security and analysing data with Power BI.',
  };
  if (existing) {
    console.log('  • profile already exists — left untouched (edit it in the dashboard)');
    return;
  }
  await prisma.profile.create({ data });
  console.log('  ✓ profile seeded');
}

async function seedSocialLinks() {
  const count = await prisma.socialLink.count();
  if (count > 0) {
    console.log('  • social links already present — skipped');
    return;
  }
  // Only links that are genuinely known. GitHub / LinkedIn are intentionally
  // left out until the owner supplies the real URLs in the dashboard.
  await prisma.socialLink.createMany({
    data: [
      { label: 'Email', url: 'mailto:hadhinoor129@gmail.com', icon: 'mail', sortOrder: 0, visible: true },
      { label: 'Phone', url: 'tel:+919629523100', icon: 'phone', sortOrder: 1, visible: true },
    ],
  });
  console.log('  ✓ social links seeded (email, phone) — add GitHub/LinkedIn in the dashboard');
}

const CATEGORIES = [
  { name: 'Programming', slug: 'programming', icon: 'code-2', description: 'Languages I write code in.' },
  { name: 'Web Development', slug: 'web-development', icon: 'layout-template', description: 'Building for the browser.' },
  { name: 'Data Analytics', slug: 'data-analytics', icon: 'bar-chart-3', description: 'Turning data into insight.' },
  { name: 'Cybersecurity', slug: 'cybersecurity', icon: 'shield-check', description: 'Security fundamentals and defensive tooling.' },
  { name: 'Developer Tools', slug: 'developer-tools', icon: 'wrench', description: 'Day-to-day tooling and platforms.' },
  { name: 'Design', slug: 'design', icon: 'palette', description: 'Visual and content design.' },
  { name: 'Professional Skills', slug: 'professional-skills', icon: 'users', description: 'Working with people, content and operations.' },
  { name: 'Other Technologies', slug: 'other-technologies', icon: 'sparkles', description: 'Additional tools I am exploring.' },
];

// proficiencyLabel is deliberately honest: no skill claims advanced mastery.
const SKILLS: Array<{ name: string; category: string; icon: string; label: string; featured?: boolean; description?: string }> = [
  { name: 'Python', category: 'programming', icon: 'file-code-2', label: 'Working knowledge', featured: true, description: 'Scripting, automation and desktop applications (Tkinter).' },
  { name: 'Java', category: 'programming', icon: 'coffee', label: 'Coursework level', description: 'Object-oriented programming fundamentals.' },
  { name: 'SQL', category: 'programming', icon: 'database', label: 'Working knowledge', featured: true, description: 'Querying and structuring relational data.' },
  { name: 'HTML', category: 'web-development', icon: 'code-xml', label: 'Working knowledge', description: 'Semantic, accessible page structure.' },
  { name: 'CSS', category: 'web-development', icon: 'brush', label: 'Working knowledge', description: 'Responsive layout and styling.' },
  { name: 'JavaScript', category: 'web-development', icon: 'braces', label: 'Learning', featured: true, description: 'Interactive behaviour on the web.' },
  { name: 'Power BI', category: 'data-analytics', icon: 'bar-chart-3', label: 'Learning', featured: true, description: 'Building reports and dashboards from datasets.' },
  { name: 'Google Sheets', category: 'developer-tools', icon: 'table-2', label: 'Comfortable', description: 'Data organisation, formulas and simple analysis.' },
  { name: 'Google Forms', category: 'developer-tools', icon: 'clipboard-list', label: 'Comfortable', description: 'Collecting and organising responses.' },
  { name: 'Git', category: 'developer-tools', icon: 'git-branch', label: 'Working knowledge', description: 'Version control for personal projects.' },
  { name: 'GitHub', category: 'developer-tools', icon: 'github', label: 'Working knowledge', description: 'Hosting and collaborating on repositories.' },
  { name: 'VS Code', category: 'developer-tools', icon: 'square-terminal', label: 'Comfortable', description: 'Primary editor and debugging environment.' },
  { name: 'OpenCode', category: 'developer-tools', icon: 'terminal', label: 'Exploring', description: 'AI-assisted development workflows.' },
  { name: 'Antigravity', category: 'developer-tools', icon: 'rocket', label: 'Exploring', description: 'Exploring AI-assisted build tooling.' },
  { name: 'Vercel (basic)', category: 'developer-tools', icon: 'triangle', label: 'Basic', description: 'Deploying static and frontend projects.' },
  { name: 'Linux (basic)', category: 'cybersecurity', icon: 'terminal-square', label: 'Basic', description: 'Command line fundamentals.' },
  { name: 'Cybersecurity fundamentals', category: 'cybersecurity', icon: 'shield-check', label: 'Coursework level', featured: true, description: 'Core security concepts, threat awareness and safe practice.' },
  { name: 'Cryptography concepts', category: 'cybersecurity', icon: 'key-round', label: 'Coursework level', description: 'Symmetric and asymmetric encryption basics.' },
  { name: 'Canva', category: 'design', icon: 'palette', label: 'Comfortable', description: 'Designing digital content and training material.' },
  { name: 'Problem solving', category: 'professional-skills', icon: 'puzzle', label: 'Developing', featured: true, description: 'Breaking problems into testable steps.' },
  { name: 'Debugging', category: 'professional-skills', icon: 'bug', label: 'Developing', description: 'Tracing and fixing issues methodically.' },
  { name: 'Content creation', category: 'professional-skills', icon: 'pen-tool', label: 'Comfortable', description: 'Writing and designing content for programmes and social media.' },
  { name: 'SEO fundamentals', category: 'professional-skills', icon: 'search', label: 'Basic', description: 'Search-friendly structure and metadata.' },
  { name: 'Operations coordination', category: 'professional-skills', icon: 'calendar-check', label: 'Working experience', description: 'Coordinating schedules, students and online training delivery.' },
  { name: 'Digital marketing', category: 'professional-skills', icon: 'megaphone', label: 'Basic', description: 'Supporting outreach for training programmes.' },
  { name: 'Social media management', category: 'professional-skills', icon: 'share-2', label: 'Basic', description: 'Scheduling and maintaining content channels.' },
];

async function seedSkills() {
  const count = await prisma.skill.count();
  if (count > 0) {
    console.log('  • skills already present — skipped');
    return;
  }
  const categoryIds = new Map<string, string>();
  for (const [index, category] of CATEGORIES.entries()) {
    const row = await prisma.skillCategory.upsert({
      where: { slug: category.slug },
      update: {},
      create: { ...category, sortOrder: index },
    });
    categoryIds.set(category.slug, row.id);
  }
  for (const [index, skill] of SKILLS.entries()) {
    const slug = skill.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    await prisma.skill.create({
      data: {
        name: skill.name,
        slug,
        description: skill.description ?? '',
        icon: skill.icon,
        proficiencyLabel: skill.label,
        categoryId: categoryIds.get(skill.category) ?? null,
        featured: Boolean(skill.featured),
        sortOrder: index,
        published: true,
      },
    });
  }
  console.log(`  ✓ ${CATEGORIES.length} skill categories and ${SKILLS.length} skills seeded`);
}

async function seedTimeline() {
  const count = await prisma.timelineEntry.count();
  if (count > 0) {
    console.log('  • timeline already present — skipped');
    return;
  }
  const entries = [
    {
      type: 'EDUCATION' as const,
      organization: 'Dhanalakshmi Srinivasan Engineering College (Autonomous), Perambalur',
      role: 'B.E. Computer Science and Engineering (Cybersecurity)',
      field: 'Computer Science and Engineering',
      specialization: 'Cybersecurity',
      location: 'Perambalur, Tamil Nadu, India',
      endDate: new Date('2027-05-31'),
      grade: 'CGPA 7.6 / 10 (as reported in the supplied resume)',
      description: [
        'Final-year undergraduate programme with a Cybersecurity specialization.',
        'Relevant coursework includes cryptography and network security, programming and data handling.',
      ],
      technologies: ['Python', 'Java', 'SQL', 'Cybersecurity'],
      sortOrder: 0,
    },
    {
      type: 'EDUCATION' as const,
      organization: 'Roever School of Excellence, Perambalur',
      role: 'Higher Secondary Education',
      endDate: new Date('2023-04-30'),
      grade: '85% (as reported in the supplied resume)',
      description: ['Completed higher secondary schooling in Perambalur, Tamil Nadu.'],
      sortOrder: 1,
    },
    {
      type: 'WORK' as const,
      organization: 'HiCore Tech',
      role: 'Operations Coordinator',
      startDate: new Date('2025-05-01'),
      endDate: new Date('2026-05-31'),
      description: [
        'Coordinated online training programs and class schedules.',
        'Designed digital content using Canva.',
        'Handled student communication and organized student data.',
        'Supported basic digital marketing activities.',
      ],
      technologies: ['Canva', 'Google Sheets', 'Operations coordination', 'Digital marketing'],
      sortOrder: 2,
    },
    {
      type: 'TRAINING' as const,
      organization: 'Skill India / NCVET',
      role: 'Application Developer — Web & Mobile',
      startDate: new Date('2024-10-01'),
      endDate: new Date('2025-04-30'),
      hours: '540 hours',
      description: [
        'Completed a 540-hour vocational training programme in application development for web and mobile.',
      ],
      technologies: ['HTML', 'CSS', 'JavaScript'],
      sortOrder: 3,
    },
    {
      type: 'WORKSHOP' as const,
      organization: 'IISc Bangalore — conducted by Ethical Edufabrica',
      role: 'AI/ML Workshop',
      description: ['Attended an artificial intelligence and machine learning workshop.'],
      technologies: ['AI/ML'],
      sortOrder: 4,
    },
    {
      type: 'WORKSHOP' as const,
      organization: 'AI Revolution in Cyber Security Summit',
      role: 'Summit attendee',
      description: ['Attended a summit on the intersection of AI and cybersecurity.'],
      technologies: ['Cybersecurity', 'AI'],
      sortOrder: 5,
    },
    {
      type: 'WORKSHOP' as const,
      organization: 'K.S.R. College of Engineering',
      role: 'National-level workshop — Python for AI & ML',
      description: ['Participated in a national-level workshop on using Python for AI and machine learning.'],
      technologies: ['Python', 'AI/ML'],
      sortOrder: 6,
    },
  ];
  await prisma.timelineEntry.createMany({ data: entries as never });
  console.log(`  ✓ ${entries.length} timeline entries seeded`);
}

async function seedCertificationsAndAchievements() {
  const certifications = await prisma.certification.count();
  if (certifications === 0) {
    await prisma.certification.createMany({
      data: [
        {
          title: 'Cryptography and Network Security',
          issuer: 'NPTEL',
          description: 'Completed the NPTEL course in cryptography and network security.',
          skillTags: ['Cryptography', 'Network Security'],
          sortOrder: 0,
          visible: true,
        },
        {
          title: 'Artificial Intelligence',
          issuer: 'NoviTech R&D Pvt. Ltd.',
          description: 'Certification in artificial intelligence fundamentals.',
          skillTags: ['AI'],
          sortOrder: 1,
          visible: true,
        },
        {
          title: 'Cyber Security',
          issuer: 'NoviTech R&D Pvt. Ltd.',
          description: 'Certification covering cybersecurity essentials.',
          skillTags: ['Cybersecurity'],
          sortOrder: 2,
          visible: true,
        },
      ],
    });
    console.log('  ✓ 3 certifications seeded');
  } else {
    console.log('  • certifications already present — skipped');
  }

  const achievements = await prisma.achievement.count();
  if (achievements === 0) {
    await prisma.achievement.createMany({
      data: [
        { title: 'First prize — Meme Marketing', description: 'Won first place in a meme marketing competition.', sortOrder: 0 },
        { title: 'Second prize — Coding Marathon', description: 'Placed second in a coding marathon.', sortOrder: 1 },
        { title: 'Overall Championship Trophy', organization: 'K. Ramakrishnan College of Engineering', description: 'Part of the team that won the overall championship trophy.', sortOrder: 2 },
        { title: 'First place — Blind Logo', description: 'Won the Blind Logo design challenge.', sortOrder: 3 },
        { title: 'Third place — Word Building', organization: 'Science Fest, Dhanalakshmi Srinivasan University', description: 'Placed third in the Word Building event at the Science Fest.', sortOrder: 4 },
      ],
    });
    console.log('  ✓ 5 achievements seeded');
  } else {
    console.log('  • achievements already present — skipped');
  }
}

async function seedProjects() {
  const count = await prisma.project.count();
  if (count > 0) {
    console.log('  • projects already present — skipped');
    return;
  }

  const cybersecuritySkills = await prisma.skill.findMany({
    where: { slug: { in: ['python', 'cryptography-concepts', 'cybersecurity-fundamentals'] } },
    select: { id: true },
  });

  await prisma.project.create({
    data: {
      title: 'Cyprothon Secure Password Manager',
      slug: 'cyprothon-secure-password-manager',
      shortDescription:
        'A desktop password manager that stores credentials in an encrypted local vault, built with Python, Tkinter and a cryptography library.',
      overview:
        'Cyprothon is a personal desktop application for storing and retrieving credentials. Credentials are encrypted before they are written to disk and unlocked with a master password, with a Tkinter interface for day-to-day use.',
      problemStatement:
        'Reusing the same password across services is a common and risky habit, and many people have no simple offline way to keep unique credentials organised.',
      approach:
        'Design a small, self-contained desktop tool: encrypt the vault with a well-known symmetric cipher from an established Python cryptography library, keep the master password out of the stored file, and provide a straightforward interface for adding, revealing and deleting entries.',
      solution:
        'A Python application that uses AES-based encryption through the cryptography library and a Tkinter GUI for credential storage and retrieval. The vault file is only readable with the correct master password.',
      outcome:
        'A working personal project that demonstrates practical use of symmetric encryption, file handling and desktop UI development. It has not been independently audited or penetration tested.',
      keyFeatures: [
        'Local encrypted credential vault',
        'Master-password unlock',
        'Desktop GUI for adding, viewing and removing credentials',
        'Written in Python with Tkinter and a cryptography library',
      ],
      learnings: [
        'Practical application of AES encryption and key handling',
        'Designing a usable desktop interface with Tkinter',
        'Thinking about threat models even for small personal tools',
      ],
      category: 'Cybersecurity',
      role: 'Developer (personal project)',
      teamInfo: 'Individual project',
      status: 'COMPLETED',
      state: 'PUBLISHED',
      featured: true,
      coverMediaId: null,
      githubUrl: '',
      liveDemoUrl: '',
      sortOrder: 0,
      seoTitle: 'Cyprothon Secure Password Manager — project case study',
      seoDescription:
        'A Python and Tkinter password manager using AES encryption for local, master-password-protected credential storage.',
      skills: { connect: cybersecuritySkills.map((s) => ({ id: s.id })) },
    },
  });

  await prisma.project.create({
    data: {
      title: 'VPR Scanner — Cybersecurity Defense Platform',
      slug: 'vpr-scanner-cybersecurity-defense-platform',
      shortDescription:
        'A pattern-based threat analysis tool for phishing URL detection, risk scoring and ransomware-related file recovery functionality.',
      overview:
        'VPR Scanner is a personal cybersecurity project exploring defensive analysis. It analyses URLs using known suspicious patterns, produces a risk score, and includes functionality aimed at recovering files affected by ransomware-style encryption.',
      problemStatement:
        'Phishing links and ransomware are among the most common practical security threats. Understanding how detection heuristics and recovery tooling behave is a useful way to learn defensive security.',
      approach:
        'Combine simple, explainable pattern matching for URL analysis with a transparent risk score, then explore file-recovery behaviour for ransomware-affected data, packaged in a Python desktop application.',
      solution:
        'A Python and Tkinter application that evaluates URLs against a set of suspicious patterns, reports a risk score, and provides ransomware-related file recovery functionality.',
      outcome:
        'An educational and personal security project. It is a heuristic tool — risk scoring can produce false positives and false negatives — and it has not been independently audited or validated as a production security product.',
      keyFeatures: [
        'Phishing URL detection using pattern analysis',
        'Transparent risk scoring',
        'Ransomware-related file recovery functionality',
        'Desktop interface built with Python and Tkinter',
      ],
      challenges: [
        'Keeping detection heuristics explainable so results can be understood rather than trusted blindly.',
      ],
      learnings: [
        'Threat modelling and defensive tool design',
        'Communicating uncertainty in security tooling honestly',
      ],
      category: 'Cybersecurity',
      role: 'Developer (personal project)',
      teamInfo: 'Individual project',
      status: 'COMPLETED',
      state: 'PUBLISHED',
      featured: true,
      githubUrl: '',
      liveDemoUrl: '',
      sortOrder: 1,
      seoTitle: 'VPR Scanner — cybersecurity defense project',
      seoDescription:
        'A Python-based defensive security project for phishing URL pattern analysis, risk scoring and ransomware-related recovery functionality.',
      skills: { connect: cybersecuritySkills.map((s) => ({ id: s.id })) },
    },
  });

  // Power BI placeholders — draft until the owner supplies real details.
  for (let i = 1; i <= 3; i += 1) {
    await prisma.project.create({
      data: {
        title: `Power BI project ${i} — ADD REAL TITLE`,
        slug: `power-bi-project-${i}-placeholder`,
        shortDescription:
          'PLACEHOLDER — three Power BI projects were completed but their titles, datasets and dashboards have not been supplied yet. Edit this record, then publish it.',
        overview:
          'This is an editable placeholder. Replace the title, description, screenshots and report links with the real details, then switch the status to Published.',
        category: 'Data Analytics',
        status: 'CONCEPT',
        state: 'DRAFT',
        sortOrder: 10 + i,
      },
    });
  }

  await prisma.project.create({
    data: {
      title: 'Edusense AI — Explainable AI-Based Student Performance Prediction and Early Risk Detection System',
      slug: 'edusense-ai-student-performance-risk-detection',
      shortDescription:
        'Concept: an explainable AI system that predicts student performance and flags early academic risk so educators can intervene sooner.',
      overview:
        'A concept under exploration. The idea is to combine performance prediction with explainability so that any flagged risk is accompanied by understandable reasons rather than an opaque score.',
      problemStatement:
        'At-risk students are often identified too late, and black-box predictions are hard for educators to act on.',
      approach:
        'Explore interpretable models and feature attribution so each risk flag is accompanied by the factors that contributed to it.',
      solution: 'Not yet implemented — this is currently a concept being researched and scoped.',
      outcome: 'No implementation exists yet. This record is a draft and is not published.',
      category: 'Data Analytics',
      status: 'CONCEPT',
      state: 'DRAFT',
      sortOrder: 20,
    },
  });

  await prisma.project.create({
    data: {
      title: 'SkillBridge AI — Intelligent Competency and Personalized Learning Platform',
      slug: 'skillbridge-ai-competency-learning-platform',
      shortDescription:
        'Concept: a platform that maps a learner\'s current competencies and recommends a personalised learning path towards a target role.',
      overview:
        'A concept under exploration, combining competency mapping with personalised recommendations.',
      problemStatement:
        'Learners often do not know which specific gaps stand between them and a target role.',
      approach: 'Model competencies and learning resources, then recommend a sequenced path that closes the largest gaps first.',
      solution: 'Not yet implemented — currently a concept being researched and scoped.',
      outcome: 'No implementation exists yet. This record is a draft and is not published.',
      category: 'Software Development',
      status: 'CONCEPT',
      state: 'DRAFT',
      sortOrder: 21,
    },
  });

  console.log('  ✓ projects seeded (2 published from the resume, 5 clearly-labelled drafts)');
}

async function seedContentSamples() {
  const journeyCount = await prisma.journeyEntry.count();
  if (journeyCount === 0) {
    await prisma.journeyEntry.createMany({
      data: [
        {
          title: 'Sample entry — add your first learning update',
          slug: 'sample-entry-add-your-first-learning-update',
          date: new Date(),
          description:
            'TEMPLATE (draft). This entry is a placeholder so you can see the format. Edit or delete it from the dashboard and publish a real update.',
          state: 'DRAFT',
          tags: ['template'],
        },
      ],
    });
    console.log('  ✓ 1 draft learning-journey template seeded');
  }

  const blogCount = await prisma.blogPost.count();
  if (blogCount === 0) {
    await prisma.blogPost.create({
      data: {
        title: 'Sample post — replace me with your first article',
        slug: 'sample-post-replace-me-with-your-first-article',
        excerpt: 'TEMPLATE (draft). This post exists so you can see the editor. Replace it, then publish.',
        contentMd:
          '# Sample post\n\nThis is a **draft** placeholder so you can see how the editor, tags and preview work.\n\n- Write in Markdown\n- Add tags and a category\n- Preview before publishing\n\nDelete this post once you have written a real article.',
        contentHtml:
          '<h1>Sample post</h1>\n<p>This is a <strong>draft</strong> placeholder so you can see how the editor, tags and preview work.</p>\n<ul><li>Write in Markdown</li><li>Add tags and a category</li><li>Preview before publishing</li></ul>\n<p>Delete this post once you have written a real article.</p>',
        category: 'Notes',
        readingMinutes: 1,
        state: 'DRAFT',
        tags: { connect: [{ id: (await prisma.blogTag.upsert({ where: { slug: 'template' }, update: {}, create: { name: 'template', slug: 'template' } })).id }] },
      },
    });
    console.log('  ✓ 1 draft blog template seeded');
  }
}

async function main() {
  console.log('\nSeeding portfolio database…\n');
  const bootstrap = await ensureBootstrap();
  if (bootstrap.created.length) {
    console.log(`  ✓ bootstrap: ${bootstrap.created.join(', ')}`);
  } else {
    console.log('  • bootstrap already complete');
  }
  await seedProfile();
  await seedSocialLinks();
  await seedSkills();
  await seedTimeline();
  await seedCertificationsAndAchievements();
  await seedProjects();
  await seedContentSamples();
  console.log('\nDone. Sign in at /admin/login.\n');
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error('\nSeed failed:', error);
  await prisma.$disconnect().catch(() => undefined);
  process.exit(1);
});
