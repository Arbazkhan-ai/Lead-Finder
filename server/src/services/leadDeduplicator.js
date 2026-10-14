import { URL } from 'url';

// Domains that do NOT uniquely identify a specific business
const GENERIC_HOSTS = new Set([
  'facebook.com', 'm.facebook.com', 'l.facebook.com',
  'instagram.com', 'linkedin.com', 'twitter.com', 'x.com',
  'youtube.com', 'tiktok.com', 'pinterest.com',
  'google.com', 'maps.google.com', 'goo.gl',
  'yelp.com', 'yellowpages.com', 'tripadvisor.com',
  'wikipedia.org', 'clutch.co', 'bbb.org', 'angi.com',
  'homeadvisor.com', 'thumbtack.com', 'wix.com', 'wordpress.com',
  'squarespace.com', 'weebly.com', 'shopify.com'
]);

/**
 * Extract clean, normalized hostname from any URL or string
 */
export function normalizeDomain(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  let str = rawUrl.trim().toLowerCase();
  if (!str) return '';

  // Strip leading protocols or slashes
  if (!str.startsWith('http://') && !str.startsWith('https://')) {
    str = 'https://' + str;
  }

  try {
    const parsed = new URL(str);
    let hostname = parsed.hostname.replace(/^www\./, '').toLowerCase();
    if (GENERIC_HOSTS.has(hostname)) return '';
    if (hostname.length < 4 || !hostname.includes('.')) return '';
    return hostname;
  } catch (_) {
    // Fallback regex extraction
    const match = str.match(/https?:\/\/(?:www\.)?([a-zA-Z0-9.-]+\.[a-zA-Z]{2,10})/i);
    if (match && match[1]) {
      const h = match[1].toLowerCase();
      if (!GENERIC_HOSTS.has(h)) return h;
    }
    return '';
  }
}

/**
 * Normalize an email address
 */
export function normalizeEmail(email) {
  if (!email || typeof email !== 'string') return '';
  const clean = email.trim().toLowerCase();
  if (clean.length < 5 || !clean.includes('@') || !clean.includes('.')) return '';
  return clean;
}

/**
 * Normalize a phone number to standard digits
 */
export function normalizePhone(phone) {
  if (!phone || typeof phone !== 'string') return '';
  let digits = phone.replace(/\D/g, '');
  // If 11 digits starting with 1 (US country code), remove leading 1
  if (digits.length === 11 && digits.startsWith('1')) {
    digits = digits.slice(1);
  }
  // Must have at least 7 digits (local) or 10 digits (standard)
  return digits.length >= 7 ? digits : '';
}

/**
 * Normalize company name by stripping legal suffixes and punctuation
 */
export function normalizeCompanyName(company) {
  if (!company || typeof company !== 'string') return '';
  return company
    .toLowerCase()
    .replace(/\b(inc|incorporated|llc|l\.l\.c\.|ltd|limited|corp|corporation|co|company|group|holdings|enterprises|pllc|pa|pc)\b/gi, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

/**
 * Extract social media slug / handle from social links
 */
export function extractSocialSlug(url, platform) {
  if (!url || typeof url !== 'string') return '';
  const clean = url.trim().toLowerCase();
  if (clean.includes('/search/') || clean.includes('/explore/') || clean.includes('keywords=')) return '';

  try {
    const parsed = new URL(clean.startsWith('http') ? clean : `https://${clean}`);
    const pathname = parsed.pathname.replace(/\/$/, '');
    const parts = pathname.split('/').filter(Boolean);
    if (parts.length > 0) {
      const slug = parts[parts.length - 1];
      if (slug.length >= 3 && !['pages', 'company', 'in', 'p', 'explore'].includes(slug)) {
        return slug;
      }
    }
  } catch (_) {}
  return '';
}

/**
 * Generate a Set of unique fingerprints for a lead
 */
export function getLeadFingerprints(lead) {
  const fingerprints = new Set();
  if (!lead || typeof lead !== 'object') return fingerprints;

  // 1. Domain Fingerprint
  const domain = normalizeDomain(lead.website);
  if (domain) {
    fingerprints.add(`dom:${domain}`);
  }

  // 2. Email Fingerprints (primary + allEmails)
  const emails = [lead.email, ...(Array.isArray(lead.allEmails) ? lead.allEmails : [])];
  for (const rawEm of emails) {
    const cleanEm = normalizeEmail(rawEm);
    if (cleanEm) {
      fingerprints.add(`em:${cleanEm}`);
    }
  }

  // 3. Phone Fingerprints (primary + allPhones)
  const phones = [lead.phone, ...(Array.isArray(lead.allPhones) ? lead.allPhones : [])];
  const normalizedPhones = [];
  for (const rawPh of phones) {
    const cleanPh = normalizePhone(rawPh);
    if (cleanPh) {
      normalizedPhones.push(cleanPh);
      if (cleanPh.length >= 10) {
        fingerprints.add(`ph:${cleanPh}`);
      }
    }
  }

  // 4. Company Name Fingerprints
  const normComp = normalizeCompanyName(lead.company);
  if (normComp && normComp.length >= 3) {
    // Company + Phone (Strongest composite identifier)
    for (const ph of normalizedPhones) {
      fingerprints.add(`comp_ph:${normComp}_${ph}`);
    }

    // Company + Location / Address
    const rawLoc = lead.address || lead.location || '';
    if (rawLoc) {
      const normLoc = String(rawLoc).toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 16);
      if (normLoc.length >= 3) {
        fingerprints.add(`comp_loc:${normComp}_${normLoc}`);
      }
    }

    // Company name standalone if distinctive (>= 7 chars)
    if (normComp.length >= 7) {
      fingerprints.add(`comp:${normComp}`);
    }
  }

  // 5. Social URLs Fingerprints
  const fb = lead.socials?.facebook || lead.facebookUrl;
  const fbSlug = extractSocialSlug(fb, 'facebook');
  if (fbSlug) fingerprints.add(`soc_fb:${fbSlug}`);

  const ig = lead.socials?.instagram || lead.instagramUrl || lead.socials?.instagramHandle;
  const igSlug = extractSocialSlug(ig, 'instagram') || (typeof ig === 'string' && ig.startsWith('@') ? ig.slice(1).toLowerCase() : '');
  if (igSlug) fingerprints.add(`soc_ig:${igSlug}`);

  const li = lead.socials?.linkedin || lead.linkedinUrl;
  const liSlug = extractSocialSlug(li, 'linkedin');
  if (liSlug) fingerprints.add(`soc_li:${liSlug}`);

  return fingerprints;
}

/**
 * Check if two leads are the exact same business
 */
export function isSameLead(leadA, leadB) {
  if (!leadA || !leadB) return false;
  if (leadA.id && leadB.id && leadA.id === leadB.id) return true;

  const printsA = getLeadFingerprints(leadA);
  const printsB = getLeadFingerprints(leadB);

  for (const pa of printsA) {
    if (printsB.has(pa)) return true;
  }
  return false;
}

/**
 * Merge newly scraped / incoming info into primary lead without losing existing verified data
 */
export function mergeLeadInfo(primary, incoming) {
  if (!primary || !incoming) return primary;

  if (!primary.email && incoming.email) primary.email = incoming.email;
  if (!primary.phone && incoming.phone) primary.phone = incoming.phone;
  if (!primary.website && incoming.website) primary.website = incoming.website;
  if ((!primary.address || primary.address === 'Location on Website') && incoming.address) {
    primary.address = incoming.address;
  }
  if (!primary.notes && incoming.notes) primary.notes = incoming.notes;
  if (!primary.websiteAudit && incoming.websiteAudit) primary.websiteAudit = incoming.websiteAudit;

  // Merge emails array
  const allEm = new Set([...(primary.allEmails || []), ...(incoming.allEmails || [])]);
  if (incoming.email) allEm.add(incoming.email);
  if (primary.email) allEm.add(primary.email);
  primary.allEmails = Array.from(allEm).filter(Boolean);

  // Merge phones array
  const allPh = new Set([...(primary.allPhones || []), ...(incoming.allPhones || [])]);
  if (incoming.phone) allPh.add(incoming.phone);
  if (primary.phone) allPh.add(primary.phone);
  primary.allPhones = Array.from(allPh).filter(Boolean);

  // Merge socials
  if (incoming.socials) {
    primary.socials = {
      ...(primary.socials || {}),
      ...Object.fromEntries(Object.entries(incoming.socials).filter(([_, v]) => Boolean(v)))
    };
  }

  return primary;
}

export default {
  normalizeDomain,
  normalizeEmail,
  normalizePhone,
  normalizeCompanyName,
  extractSocialSlug,
  getLeadFingerprints,
  isSameLead,
  mergeLeadInfo
};
