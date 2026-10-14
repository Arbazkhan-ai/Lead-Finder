import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Save all generated Excel files into exports folder (or /tmp/exports on Vercel)
const LOCAL_EXPORTS_DIR = path.join(__dirname, '..', '..', '..', 'exports');
export const EXPORTS_DIR = process.env.VERCEL ? path.join('/tmp', 'exports') : LOCAL_EXPORTS_DIR;

if (!fs.existsSync(EXPORTS_DIR)) {
  fs.mkdirSync(EXPORTS_DIR, { recursive: true });
}

/**
 * Diagnose industry pain point & AI solution for Excel enrichment
 */
function diagnoseLeadProblem(lead) {
  const cat = ((lead.category || '') + ' ' + (lead.company || '')).toLowerCase();
  if (cat.includes('dent') || cat.includes('clinic') || cat.includes('med') || cat.includes('doctor') || cat.includes('health')) {
    return { pain: 'Missing 30%+ after-hours patient inquiries', sol: '24/7 AI Intake & Appointment Concierge' };
  }
  if (cat.includes('law') || cat.includes('attorney') || cat.includes('legal') || cat.includes('counsel')) {
    return { pain: 'Slow case response times & lost retainers', sol: '60s Instant Case Screening & Booking' };
  }
  if (cat.includes('agency') || cat.includes('marketing') || cat.includes('seo') || cat.includes('design') || cat.includes('media')) {
    return { pain: 'Account management overhead & client churn', sol: 'Automated Client Ops, Reporting & Upsells' };
  }
  if (cat.includes('real estate') || cat.includes('realt') || cat.includes('property') || cat.includes('broker')) {
    return { pain: 'Weekend buyer lead dropoff & tour scheduling', sol: '24/7 Showing Concierge & Qualification' };
  }
  if (cat.includes('roof') || cat.includes('plumb') || cat.includes('hvac') || cat.includes('contractor') || cat.includes('electric')) {
    return { pain: 'Unanswered emergency calls & lost job quotes', sol: 'Instant Quote & Dispatch Workflow' };
  }
  if (cat.includes('account') || cat.includes('cpa') || cat.includes('tax') || cat.includes('financ')) {
    return { pain: 'Client document chasing & onboarding lag', sol: 'Automated Discovery & Tax Document Sync' };
  }
  if (cat.includes('tech') || cat.includes('software') || cat.includes('saas') || cat.includes('app')) {
    return { pain: 'Inbound demo dropoff & slow support resolution', sol: 'Automated Enterprise Demo Triage & AI Support' };
  }
  return { pain: 'Delayed responses & unclosed pipeline leads', sol: 'Automated 24/7 AI Lead Capture & Follow-up' };
}

/**
 * Format an array of leads into rich Excel rows (with Website, Facebook, Instagram, LinkedIn columns) and save as an .xlsx file
 */
export function generateLeadsExcelFile(leads = [], meta = {}) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const safeQuery = (meta.query || 'leads')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 30);
  const safeLoc = (meta.location || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 20);

  const fileName = `leads_${safeQuery}${safeLoc ? '_' + safeLoc : ''}_${timestamp}.xlsx`;
  const filePath = path.join(EXPORTS_DIR, fileName);

  const rows = leads.map((lead, idx) => {
    const diagnosis = diagnoseLeadProblem(lead);
    const audit = lead.websiteAudit || {};
    const weakPointsList = Array.isArray(audit.weakPoints)
      ? audit.weakPoints.map(w => `${w.title} (${w.severity})`).join(' | ')
      : '';
    const topFlaw = audit.topWeakPoint?.title || (Array.isArray(audit.weakPoints) && audit.weakPoints[0]?.title) || '';
    const allEmails = Array.isArray(lead.allEmails) && lead.allEmails.length > 0
      ? lead.allEmails.join(', ')
      : (lead.email || '');
    const allPhones = Array.isArray(lead.allPhones) && lead.allPhones.length > 0
      ? lead.allPhones.join(', ')
      : (lead.phone || '');

    return {
      'No.': idx + 1,
      'Lead Quality Score': `${lead.qualityScore || 65}/100`,
      'Company Name': lead.company || '',
      'Category / Niche': lead.category || meta.query || '',
      'Decision Maker / Executive': lead.name || 'Owner / Decision Maker',
      'Primary Email': lead.email || '',
      'All Discovered Emails': allEmails,
      'Primary Phone': lead.phone || '',
      'All Discovered Phones': allPhones,
      'Website URL': lead.website || '',
      'Facebook Page URL': lead.socials?.facebook || lead.facebookUrl || '',
      'Instagram Profile URL': lead.socials?.instagram || lead.instagramUrl || '',
      'Instagram Handle': lead.socials?.instagramHandle || '',
      'LinkedIn Company URL': lead.socials?.linkedin || lead.linkedinUrl || '',
      'LinkedIn Decision Maker / Founder URL': lead.linkedinPeopleUrl || '',
      'WhatsApp Link': lead.socials?.whatsapp || '',
      'Twitter / X URL': lead.socials?.twitter || '',
      'YouTube URL': lead.socials?.youtube || '',
      'TikTok URL': lead.socials?.tiktok || '',
      'Tech Stack / CMS': Array.isArray(lead.techStack) ? lead.techStack.join(', ') : '',
      'Address / Location': lead.address || meta.location || '',
      'Google Maps Link': lead.mapsUrl || '',
      'Website Health Score': audit.score !== undefined ? `${audit.score}/100` : 'Not Audited',
      'Website Rating': audit.rating || '',
      'Weak Points Count': Array.isArray(audit.weakPoints) ? audit.weakPoints.length : 0,
      'Top Website Vulnerability': topFlaw,
      'All Detected Website Flaws': weakPointsList,
      'Business Pain Point': diagnosis.pain,
      'Recommended AI Solution': diagnosis.sol,
      'Website Title': lead.websiteTitle || '',
      'Bio / Business Description': lead.notes || lead.description || '',
      'Opening Hours': lead.openingHours || '',
      'Data Source Platform': lead.source || 'Live Scraper',
      'Scraped At': new Date().toISOString()
    };
  });

  const workbook = XLSX.utils.book_new();

  // Sheet 1: Full Scraped Leads Dataset
  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet['!cols'] = [
    { wch: 6 },   // No.
    { wch: 32 },  // Company Name
    { wch: 22 },  // Category
    { wch: 28 },  // Decision Maker
    { wch: 30 },  // Primary Email
    { wch: 40 },  // All Emails
    { wch: 18 },  // Primary Phone
    { wch: 28 },  // All Phones
    { wch: 32 },  // Website URL
    { wch: 42 },  // Facebook Page URL
    { wch: 42 },  // Instagram Profile URL
    { wch: 20 },  // Instagram Handle
    { wch: 42 },  // LinkedIn Company
    { wch: 42 },  // LinkedIn Founder
    { wch: 30 },  // Twitter
    { wch: 30 },  // YouTube
    { wch: 30 },  // TikTok
    { wch: 38 },  // Address
    { wch: 40 },  // Google Maps
    { wch: 18 },  // Website Health Score
    { wch: 16 },  // Website Rating
    { wch: 16 },  // Weak Points Count
    { wch: 32 },  // Top Vulnerability
    { wch: 55 },  // All Flaws
    { wch: 38 },  // Business Pain Point
    { wch: 38 },  // Recommended Solution
    { wch: 34 },  // Website Title
    { wch: 50 },  // Bio / Description
    { wch: 24 },  // Opening Hours
    { wch: 28 },  // Data Source Platform
    { wch: 22 }   // Scraped At
  ];
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Scraped Leads Dataset');

  // Sheet 2: Summary & Platform Breakdown
  const withEmailCount = leads.filter(l => Boolean(l.email)).length;
  const withPhoneCount = leads.filter(l => Boolean(l.phone)).length;
  const withWebsiteCount = leads.filter(l => Boolean(l.website)).length;
  const withFacebookCount = leads.filter(l => Boolean(l.socials?.facebook)).length;
  const withInstagramCount = leads.filter(l => Boolean(l.socials?.instagram)).length;
  const withLinkedinCount = leads.filter(l => Boolean(l.socials?.linkedin || (l.linkedinUrl && !l.linkedinUrl.includes('/search/')))).length;

  const summaryRows = [
    { Metric: 'Search Niche / Query', Value: meta.query || 'Custom Export' },
    { Metric: 'Target Location', Value: meta.location || 'Global / All' },
    { Metric: 'Total Scraped Leads', Value: leads.length },
    { Metric: 'Leads with Verified Email', Value: withEmailCount },
    { Metric: 'Leads with Phone Number', Value: withPhoneCount },
    { Metric: 'Leads with Official Website', Value: withWebsiteCount },
    { Metric: 'Direct Facebook Pages Extracted', Value: withFacebookCount },
    { Metric: 'Direct Instagram Profiles Extracted', Value: withInstagramCount },
    { Metric: 'Direct LinkedIn Profiles Extracted', Value: withLinkedinCount },
    { Metric: 'Generated Timestamp', Value: new Date().toLocaleString() },
    { Metric: 'Saved File Path', Value: filePath }
  ];
  const summarySheet = XLSX.utils.json_to_sheet(summaryRows);
  summarySheet['!cols'] = [{ wch: 34 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Scrape Summary');

  XLSX.writeFile(workbook, filePath);

  return {
    fileName,
    filePath,
    downloadUrl: `/api/leads/exports/${encodeURIComponent(fileName)}`,
    rowCount: leads.length,
    withEmailCount,
    withPhoneCount,
    withWebsiteCount,
    withFacebookCount,
    withInstagramCount,
    withLinkedinCount
  };
}

/**
 * Generate an Excel (.xlsx) workbook for a single deeply-scraped domain or social profile
 */
export function generateSingleWebsiteExcelFile(scrapedData) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  let domain = 'website';
  try {
    domain = new URL(scrapedData.url).hostname.replace(/^www\./, '').replace(/[^a-z0-9.-]/gi, '_');
  } catch (_) {}

  const fileName = `domain_scrape_${domain}_${timestamp}.xlsx`;
  const filePath = path.join(EXPORTS_DIR, fileName);

  const workbook = XLSX.utils.book_new();

  // Sheet 1: Overview & Contacts
  const overviewRows = [
    {
      'Target URL': scrapedData.url || '',
      'Title': scrapedData.title || '',
      'Description / Bio': scrapedData.description || '',
      'Primary Email': scrapedData.primaryEmail || '',
      'All Discovered Emails': (scrapedData.emails || []).join(', '),
      'Email Count': (scrapedData.emails || []).length,
      'Primary Phone': scrapedData.primaryPhone || '',
      'All Discovered Phones': (scrapedData.phones || []).join(', '),
      'Phone Count': (scrapedData.phones || []).length,
      'Address': scrapedData.address || '',
      'Health Score': scrapedData.websiteAudit?.score !== undefined ? `${scrapedData.websiteAudit.score}/100` : '',
      'Health Rating': scrapedData.websiteAudit?.rating || '',
      'Weak Points Found': scrapedData.websiteAudit?.weakPoints?.length || 0,
      'Facebook URL': scrapedData.socials?.facebook || '',
      'Instagram URL': scrapedData.socials?.instagram || '',
      'Instagram Handle': scrapedData.socials?.instagramHandle || '',
      'LinkedIn URL': scrapedData.socials?.linkedin || '',
      'Twitter / X': scrapedData.socials?.twitter || '',
      'YouTube': scrapedData.socials?.youtube || '',
      'TikTok': scrapedData.socials?.tiktok || '',
      'Pages Crawled': (scrapedData.crawledPages || []).length || 1,
      'Scraped At': new Date().toISOString()
    }
  ];
  const overviewSheet = XLSX.utils.json_to_sheet(overviewRows);
  overviewSheet['!cols'] = [
    { wch: 35 }, { wch: 35 }, { wch: 50 }, { wch: 30 }, { wch: 45 },
    { wch: 14 }, { wch: 20 }, { wch: 35 }, { wch: 14 }, { wch: 35 },
    { wch: 15 }, { wch: 18 }, { wch: 18 }, { wch: 38 }, { wch: 38 },
    { wch: 20 }, { wch: 38 }, { wch: 32 }, { wch: 32 }, { wch: 32 },
    { wch: 15 }, { wch: 24 }
  ];
  XLSX.utils.book_append_sheet(workbook, overviewSheet, 'Domain & Social Overview');

  // Sheet 2: All Extracted Contacts (Emails & Phones)
  const maxContacts = Math.max(
    (scrapedData.emails || []).length,
    (scrapedData.phones || []).length,
    (scrapedData.crawledPages || []).length,
    1
  );
  const contactRows = [];
  for (let i = 0; i < maxContacts; i++) {
    contactRows.push({
      'No.': i + 1,
      'Extracted Email': scrapedData.emails?.[i] || '',
      'Extracted Phone': scrapedData.phones?.[i] || '',
      'Crawled Subpage URL': scrapedData.crawledPages?.[i] || ''
    });
  }
  const contactsSheet = XLSX.utils.json_to_sheet(contactRows);
  contactsSheet['!cols'] = [{ wch: 8 }, { wch: 38 }, { wch: 24 }, { wch: 55 }];
  XLSX.utils.book_append_sheet(workbook, contactsSheet, 'Extracted Contacts & Pages');

  // Sheet 3: Website Weak Points & Audit
  const weakPoints = scrapedData.websiteAudit?.weakPoints || [];
  if (weakPoints.length > 0) {
    const wpRows = weakPoints.map((wp, i) => ({
      'No.': i + 1,
      'Vulnerability / Flaw': wp.title || '',
      'Category': wp.category || '',
      'Severity': (wp.severity || '').toUpperCase(),
      'Evidence Found on Site': wp.evidence || '',
      'Business Impact': wp.impact || '',
      'Recommended Fix': wp.solution || ''
    }));
    const wpSheet = XLSX.utils.json_to_sheet(wpRows);
    wpSheet['!cols'] = [
      { wch: 6 }, { wch: 34 }, { wch: 18 }, { wch: 14 }, { wch: 45 }, { wch: 45 }, { wch: 45 }
    ];
    XLSX.utils.book_append_sheet(workbook, wpSheet, 'Website Audit Flaws');
  }

  XLSX.writeFile(workbook, filePath);

  return {
    fileName,
    filePath,
    downloadUrl: `/api/leads/exports/${encodeURIComponent(fileName)}`,
    rowCount: 1,
    emailsCount: (scrapedData.emails || []).length,
    phonesCount: (scrapedData.phones || []).length
  };
}

/**
 * List all saved Excel files in the exports directory
 */
export function listExportedExcelFiles() {
  if (!fs.existsSync(EXPORTS_DIR)) return [];
  const files = fs.readdirSync(EXPORTS_DIR)
    .filter(f => f.endsWith('.xlsx'))
    .map(f => {
      const fullPath = path.join(EXPORTS_DIR, f);
      const stat = fs.statSync(fullPath);
      return {
        fileName: f,
        filePath: fullPath,
        downloadUrl: `/api/leads/exports/${encodeURIComponent(f)}`,
        sizeBytes: stat.size,
        createdAt: stat.mtime.toISOString()
      };
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return files;
}

/**
 * Parse a raw row object from any uploaded Excel (.xlsx/.xls) or CSV scraper file into a normalized lead object
 */
function normalizeUploadedRowToLead(row, idx, fileName = 'Uploaded File') {
  if (!row || typeof row !== 'object') return null;

  const entries = Object.entries(row).map(([k, v]) => ({
    rawKey: String(k || '').trim(),
    key: String(k || '').trim().toLowerCase().replace(/[^a-z0-9]/g, ''),
    val: v !== null && v !== undefined ? String(v).trim() : ''
  })).filter(e => e.val !== '');

  if (entries.length === 0) return null;

  const findVal = (candidates) => {
    for (const c of candidates) {
      const cleanC = c.toLowerCase().replace(/[^a-z0-9]/g, '');
      const exact = entries.find(e => e.key === cleanC);
      if (exact && exact.val) return exact.val;
    }
    for (const c of candidates) {
      const cleanC = c.toLowerCase().replace(/[^a-z0-9]/g, '');
      const partial = entries.find(e => e.key.includes(cleanC));
      if (partial && partial.val) return partial.val;
    }
    return '';
  };

  // Extract emails via column lookup + full-row regex scan
  const EMAIL_SCAN_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,10}/g;
  const discoveredEmails = new Set();

  const emailColVal = findVal([
    'Primary Email', 'Extracted Email', 'Email', 'E-mail', 'Email Address',
    'All Discovered Emails', 'Contact Email', 'Business Email', 'Mail', 'Emails'
  ]);
  if (emailColVal) {
    const matches = emailColVal.match(EMAIL_SCAN_REGEX) || [];
    matches.forEach(m => discoveredEmails.add(m.toLowerCase()));
  }

  // Fallback scan across all cells in the row for any email address
  for (const e of entries) {
    const matches = e.val.match(EMAIL_SCAN_REGEX) || [];
    for (const m of matches) {
      const clean = m.toLowerCase();
      if (!clean.endsWith('.png') && !clean.endsWith('.jpg') && !clean.endsWith('.svg') && !clean.includes('sentry.io')) {
        discoveredEmails.add(clean);
      }
    }
  }

  const allEmails = Array.from(discoveredEmails);
  const primaryEmail = allEmails[0] || '';

  // Extract company name
  let company = findVal([
    'Company Name', 'Company', 'Business Name', 'Business', 'Organization',
    'Title', 'Client', 'Brand', 'Store', 'Practice', 'Firm', 'Agency', 'Account'
  ]);

  // Extract person / decision maker name
  let contactName = findVal([
    'Decision Maker / Executive', 'Decision Maker', 'Contact Name', 'Full Name',
    'Owner', 'Executive', 'Founder', 'Person', 'Name', 'First Name'
  ]);

  // If 'Name' was actually the company name and company is empty
  if (!company && contactName) {
    company = contactName;
    contactName = 'Decision Maker';
  }

  // Extract website URL
  let website = findVal([
    'Website URL', 'Target URL', 'Website', 'URL', 'Domain', 'Site', 'Web', 'Homepage', 'Link'
  ]);
  if (website && !website.startsWith('http') && website.includes('.') && !website.includes('@')) {
    website = 'https://' + website;
  }

  // If company is still empty, derive from website or email domain
  if (!company && website) {
    try {
      const host = new URL(website).hostname.replace(/^www\./, '');
      company = host.split('.')[0].replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    } catch (_) {}
  }
  if (!company && primaryEmail) {
    const domainPart = primaryEmail.split('@')[1] || '';
    if (domainPart && !['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com'].includes(domainPart)) {
      company = domainPart.split('.')[0].replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      if (!website) website = `https://${domainPart}`;
    } else {
      company = primaryEmail.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    }
  }

  // Skip summary or completely empty rows
  if (!company && !primaryEmail && !website) return null;
  if (company && ['search niche / query', 'total scraped leads', 'metric'].includes(company.toLowerCase())) {
    return null;
  }

  const phone = findVal([
    'Primary Phone', 'Extracted Phone', 'Phone', 'Phone Number', 'Telephone',
    'Mobile', 'Tel', 'Contact Phone', 'All Discovered Phones', 'Cell'
  ]);

  const category = findVal([
    'Category / Niche', 'Category', 'Niche', 'Industry', 'Sector', 'Type', 'Specialization'
  ]) || 'Uploaded Prospect';

  const address = findVal([
    'Address / Location', 'Address', 'Location', 'City', 'Street', 'State', 'Region'
  ]);

  const facebook = findVal(['Facebook Page URL', 'Facebook URL', 'Facebook', 'FB']);
  const instagram = findVal(['Instagram Profile URL', 'Instagram URL', 'Instagram', 'IG']);
  const linkedin = findVal(['LinkedIn Company URL', 'LinkedIn URL', 'LinkedIn']);
  const whatsapp = findVal(['WhatsApp Link', 'WhatsApp']);

  const painPoint = findVal(['Business Pain Point', 'Top Website Vulnerability', 'Pain Point', 'Problem']);
  const bio = findVal(['Bio / Business Description', 'Description / Bio', 'Description', 'Notes', 'Bio']);

  return {
    name: contactName || 'Owner / Decision Maker',
    company: company || `Prospect #${idx + 1}`,
    category,
    email: primaryEmail,
    allEmails,
    phone: phone ? phone.split(',')[0].trim() : '',
    website: website || '',
    address: address || '',
    socials: {
      facebook: facebook || null,
      instagram: instagram || null,
      linkedin: linkedin || null,
      whatsapp: whatsapp || null
    },
    facebookUrl: facebook || '',
    instagramUrl: instagram || '',
    linkedinUrl: linkedin || '',
    qualityScore: primaryEmail ? 90 : (website ? 70 : 55),
    source: `Uploaded File (${fileName})`,
    notes: [painPoint ? `Pain Point: ${painPoint}` : '', bio].filter(Boolean).join(' | ') || `Imported from ${fileName}`,
    dealValue: 1500
  };
}

/**
 * Parse an uploaded Excel (.xlsx, .xls) or CSV (.csv) buffer or Base64 string into an array of normalized leads
 */
export function parseUploadedLeadsFile(fileDataBase64OrBuffer, fileName = 'uploaded_leads.xlsx') {
  let buffer;
  if (Buffer.isBuffer(fileDataBase64OrBuffer)) {
    buffer = fileDataBase64OrBuffer;
  } else if (typeof fileDataBase64OrBuffer === 'string') {
    const cleanBase64 = fileDataBase64OrBuffer.replace(/^data:.*?;base64,/, '');
    buffer = Buffer.from(cleanBase64, 'base64');
  } else {
    throw new Error('Invalid file payload');
  }

  const workbook = XLSX.read(buffer, { type: 'buffer' });
  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error('The uploaded file contains no readable sheets');
  }

  // Prefer 'Scraped Leads Dataset' or the first non-summary sheet
  const preferredSheetName = workbook.SheetNames.find(
    n => !n.toLowerCase().includes('summary')
  ) || workbook.SheetNames[0];

  const sheet = workbook.Sheets[preferredSheetName];
  const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  const leads = [];
  rawRows.forEach((row, idx) => {
    const normalized = normalizeUploadedRowToLead(row, idx, fileName);
    if (normalized) {
      leads.push(normalized);
    }
  });

  // Also check if this was a single-domain export with 'Extracted Contacts & Pages' sheet
  if (leads.length <= 1 && workbook.Sheets['Extracted Contacts & Pages']) {
    const contactsRows = XLSX.utils.sheet_to_json(workbook.Sheets['Extracted Contacts & Pages'], { defval: '' });
    const extraEmails = contactsRows
      .map(r => String(r['Extracted Email'] || '').trim())
      .filter(Boolean);
    if (leads[0] && extraEmails.length > 0) {
      if (!leads[0].email) leads[0].email = extraEmails[0];
      leads[0].allEmails = Array.from(new Set([...(leads[0].allEmails || []), ...extraEmails]));
    }
  }

  return leads;
}

/**
 * Parse an existing Excel file from the EXPORTS_DIR by fileName
 */
export function parseExcelFileFromVault(fileName) {
  const safeName = path.basename(fileName);
  const fullPath = path.join(EXPORTS_DIR, safeName);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Excel file "${safeName}" not found in exports vault`);
  }
  const buffer = fs.readFileSync(fullPath);
  return parseUploadedLeadsFile(buffer, safeName);
}

export default {
  EXPORTS_DIR,
  generateLeadsExcelFile,
  generateSingleWebsiteExcelFile,
  listExportedExcelFiles,
  parseUploadedLeadsFile,
  parseExcelFileFromVault
};

