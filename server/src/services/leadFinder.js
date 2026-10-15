import axios from 'axios';
import * as cheerio from 'cheerio';
import { URL } from 'url';
import db from '../db.js';
import { auditWebsite, auditWebsiteFromHtml } from './websiteAuditor.js';
import { getLeadFingerprints } from './leadDeduplicator.js';

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// Email regex pattern
const EMAIL_REGEX = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,10})/gi;

// Phone regex pattern for US & international numbers in text
const PHONE_TEXT_REGEX = /(?:\+?\d{1,3}[\s.-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}/g;

// Junk email & placeholder patterns to strictly reject
// Junk email & placeholder patterns to strictly reject
const JUNK_PATTERNS = [
  'example.com', 'domain.com', 'email.com', 'yourname@', 'sentry.io',
  'wixpress.com', 'wordpress.com', 'cloudflare.com', 'bootstrap.com',
  'github.com', 'schema.org', 'w3.org', 'test@', 'placeholder@',
  'sample@', 'test.com', 'user@', 'admin@domain', 'name@domain',
  'someone@', 'myemail@', 'mail@mail.com', 'noreply@', 'no-reply@',
  'donotreply@', 'mailer-daemon@', 'postmaster@', 'abuse@', 'webmaster@',
  'googlesyndication', 'googletagmanager', 'doubleclick', 'fb.com',
  'facebook.com', 'u003e', '2x.png', '3x.png', '4x.png',
  'support@wix.com', 'support@squarespace.com', 'support@shopify.com',
  'support@wordpress.com', 'careers@', 'jobs@', 'press@', 'media@'
];

// Directory & aggregator domains to exclude from direct business website leads
const EXCLUDED_DOMAINS = [
  'duckduckgo.com', 'google.com', 'bing.com', 'yahoo.com',
  'yelp.com', 'clutch.co', 'tripadvisor.com', 'wikipedia.org',
  'yellowpages.com', 'bbb.org', 'angi.com', 'homeadvisor.com',
  'thumbtack.com', 'healthgrades.com', 'zocdoc.com', 'avvo.com',
  'findlaw.com', 'justia.com', 'expertise.com', 'upcity.com',
  'goodfirms.co', 'glassdoor.com', 'indeed.com', 'mapquest.com',
  'pinterest.com', 'reddit.com', 'quora.com', 'threebestrated.com',
  'birdeye.com', 'nextdoor.com', 'chamberofcommerce.com', 'manta.com',
  'superpages.com', 'dnb.com', 'zoominfo.com', 'foursquare.com',
  'citysearch.com', 'merchantcircle.com', 'local.com', 'ezlocal.com',
  'cylex.us.com', 'trustpilot.com', 'groupon.com', 'waze.com',
  'opentable.com', 'hotfrog.com', 'brownbook.net', 'apple.com',
  'facebook.com', 'instagram.com', 'linkedin.com', 'twitter.com', 'x.com',
  'youtube.com', 'tiktok.com'
];

// Generic non-business or taxonomy terms to reject as company names
const GENERIC_NAME_BLACKLIST = new Set([
  'atm', 'parking', 'bus stop', 'restroom', 'public toilet', 'information', 'bench',
  'post box', 'waste basket', 'fire station', 'police', 'telephone',
  'bicycle parking', 'fuel', 'charging station', 'recycling', 'shelter',
  'dentist', 'dental', 'dental clinic', 'doctor', 'clinic', 'hospital', 'pharmacy',
  'lawyer', 'attorney', 'law firm', 'school', 'kindergarten', 'college', 'university',
  'church', 'place of worship', 'mosque', 'temple', 'synagogue',
  'cemetery', 'park', 'playground', 'pitch', 'swimming pool', 'fountain',
  'supermarket', 'convenience', 'bakery', 'kiosk', 'marketplace',
  'test', 'sample', 'unknown', 'n/a', 'na', 'null', 'undefined', 'anonymous',
  'general business', 'business contact', 'prospective client', 'owner / representative'
]);

/**
 * Validate that a company name is a legitimate distinct business name, not a generic label
 */
export function isValidCompanyName(name) {
  if (!name || typeof name !== 'string') return false;
  const clean = name.trim();
  if (clean.length < 3 || clean.length > 90) return false;
  if (/^https?:\/\//i.test(clean) || /^www\./i.test(clean) || clean.includes('.com') || clean.includes('.org') || clean.includes('.net')) {
    return false;
  }
  const lower = clean.toLowerCase();
  if (GENERIC_NAME_BLACKLIST.has(lower)) return false;
  if (/^[^a-zA-Z]+$/.test(clean)) return false;
  return true;
}

/**
 * Check if a lead has at least one valid, actionable contact method
 */
export function isContactableLead(lead) {
  if (!lead || typeof lead !== 'object') return false;
  const hasEmail = Boolean(cleanEmail(lead.email));
  const hasPhone = Boolean(cleanPhone(lead.phone));
  const hasWebsite = Boolean(lead.website && !EXCLUDED_DOMAINS.some(d => (lead.website || '').toLowerCase().includes(d)));
  const hasSocial = Boolean(
    (lead.socials?.facebook && !lead.socials.facebook.includes('/search/')) ||
    (lead.socials?.instagram && !lead.socials.instagram.includes('/search/')) ||
    (lead.socials?.linkedin && !lead.socials.linkedin.includes('/search/')) ||
    (lead.facebookUrl && !lead.facebookUrl.includes('/search/')) ||
    (lead.instagramUrl && !lead.instagramUrl.includes('/search/')) ||
    (lead.linkedinUrl && !lead.linkedinUrl.includes('/search/'))
  );

  return hasEmail || hasPhone || hasWebsite || hasSocial;
}

/**
 * Decode Cloudflare's data-cfemail hex protection into a real email address
 */
export function decodeCloudflareEmail(encodedHex) {
  try {
    if (!encodedHex || encodedHex.length < 4) return '';
    const r = parseInt(encodedHex.substr(0, 2), 16);
    let email = '';
    for (let n = 2; n < encodedHex.length; n += 2) {
      const charCode = parseInt(encodedHex.substr(n, 2), 16) ^ r;
      email += String.fromCharCode(charCode);
    }
    return email;
  } catch (_) {
    return '';
  }
}

/**
 * Clean & rigorously validate real email addresses
 */
export function cleanEmail(email) {
  if (!email) return null;
  let trimmed = String(email).trim().toLowerCase();

  // Strip URL-encoded prefixes or wrapping characters
  trimmed = trimmed
    .replace(/^%20|^u003e/i, '')
    .replace(/^[<("'{\[\s]+|[>)"'}\],\s;.]+$/g, '');

  // RFC email regex validation
  const validFormat = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,10}$/.test(trimmed);
  if (!validFormat) return null;

  // Reject image or font file extensions
  if (/\.(png|jpg|jpeg|svg|webp|gif|bmp|css|js|woff|woff2|ttf|eot|ico)$/i.test(trimmed)) {
    return null;
  }

  // Reject junk patterns
  for (const junk of JUNK_PATTERNS) {
    if (trimmed.includes(junk)) return null;
  }

  if (trimmed.length < 6 || trimmed.length > 80) return null;
  return trimmed;
}

/**
 * De-obfuscate HTML entities, Cloudflare email protection, and anti-spam tricks
 */
function deobfuscateHtml(html) {
  if (!html) return '';
  let processed = String(html)
    .replace(/&#64;|&#x40;|\s*(\[at\]|\(at\))\s*/gi, '@')
    .replace(/\s*(\[dot\]|\(dot\))\s*/gi, '.');

  processed = processed.replace(/data-cfemail="([0-9a-fA-F]+)"/g, (_, hex) => {
    const decoded = decodeCloudflareEmail(hex);
    return decoded ? `mailto:${decoded} ${decoded}` : '';
  });
  processed = processed.replace(/\/cdn-cgi\/l\/email-protection#([0-9a-fA-F]+)/g, (_, hex) => {
    const decoded = decodeCloudflareEmail(hex);
    return decoded ? `mailto:${decoded}` : '';
  });

  return processed;
}

/**
 * Detect Website CMS / Tech Stack from HTML
 */
function detectTechStack(html = '') {
  const lower = html.toLowerCase();
  const stack = [];
  if (lower.includes('wp-content') || lower.includes('wordpress')) stack.push('WordPress');
  if (lower.includes('cdn.shopify.com') || lower.includes('shopify')) stack.push('Shopify');
  if (lower.includes('wix.com') || lower.includes('wixstatic.com')) stack.push('Wix');
  if (lower.includes('squarespace.com') || lower.includes('sqsp')) stack.push('Squarespace');
  if (lower.includes('webflow.com') || lower.includes('w-nav')) stack.push('Webflow');
  if (lower.includes('hs-scripts.com') || lower.includes('hubspot')) stack.push('HubSpot');
  if (lower.includes('calendly.com')) stack.push('Calendly');
  if (lower.includes('googletagmanager.com') || lower.includes('gtag(')) stack.push('Google Analytics');
  if (lower.includes('fbevents.js') || lower.includes('facebook-jssdk')) stack.push('Meta Pixel');
  return stack.length > 0 ? stack : ['Custom Website'];
}

/**
 * Clean & validate phone numbers
 */
export function cleanPhone(phone) {
  if (!phone) return null;
  const cleanedStr = String(phone).trim();
  const digits = cleanedStr.replace(/\D/g, '');
  if (digits.length < 7 || digits.length > 15) return null;
  if (/^(19|20)\d{2}[-/]\d{2}/.test(cleanedStr)) return null;
  // Reject dummy repeating sequences
  if (/^(0{7,}|1{7,}|2{7,}|3{7,}|4{7,}|5{7,}|9{7,})$/.test(digits)) return null;
  if (digits === '1234567890') return null;
  return cleanedStr;
}

/**
 * Calculate a Lead Quality Score (0-100) based on reachability and verified contact completeness
 */
export function computeLeadQualityScore(lead) {
  let score = 20; // Base score for valid verified business name & location

  // Direct verified email (crucial for outbound campaigns)
  if (lead.email) {
    score += 35;
    if (lead.website) {
      try {
        const domain = new URL(lead.website.startsWith('http') ? lead.website : 'https://' + lead.website).hostname.replace(/^www\./, '').toLowerCase();
        if (lead.email.toLowerCase().endsWith('@' + domain)) {
          score += 10;
        }
      } catch (_) {}
    }
  }

  // Direct phone number
  if (lead.phone) score += 15;

  // Active website
  if (lead.website) score += 10;

  // Real Social Profiles (Facebook, Instagram, LinkedIn)
  if (lead.socials?.facebook || lead.facebookUrl) score += 5;
  if (lead.socials?.instagram || lead.instagramUrl) score += 5;
  if (lead.socials?.linkedin || lead.linkedinUrl) score += 5;

  // Technical Website Audit with diagnosed weak points
  if (lead.websiteAudit) {
    score += 5;
    if (Array.isArray(lead.websiteAudit.weakPoints) && lead.websiteAudit.weakPoints.length > 0) {
      score += 5;
    }
  }

  return Math.min(100, Math.max(15, score));
}

/**
 * Compute comprehensive Lead Health categorization
 */
export function computeLeadHealth(lead) {
  const score = computeLeadQualityScore(lead);
  const hasEmail = Boolean(cleanEmail(lead.email));
  const hasPhone = Boolean(cleanPhone(lead.phone));
  const hasWebsite = Boolean(lead.website && !EXCLUDED_DOMAINS.some(d => (lead.website || '').toLowerCase().includes(d)));
  const hasSocial = Boolean(lead.socials?.facebook || lead.socials?.instagram || lead.socials?.linkedin || lead.facebookUrl || lead.instagramUrl || lead.linkedinUrl);

  let status = 'unhealthy';
  let badgeLabel = 'Incomplete';

  if (score >= 75 && (hasEmail || hasPhone) && hasWebsite) {
    status = 'prime';
    badgeLabel = 'Prime Verified';
  } else if (score >= 50 && (hasEmail || hasPhone || (hasWebsite && hasSocial))) {
    status = 'healthy';
    badgeLabel = 'Healthy & Active';
  } else if (hasEmail || hasPhone || hasWebsite || hasSocial) {
    status = 'contactable';
    badgeLabel = 'Contactable';
  }

  return {
    score,
    status,
    badgeLabel,
    isHealthy: status !== 'unhealthy',
    hasEmail,
    hasPhone,
    hasWebsite,
    hasSocial
  };
}

/**
 * Helper: Run async tasks with bounded concurrency
 */
async function mapWithConcurrency(items, concurrency, iteratorFn) {
  const results = new Array(items.length);
  let currentIndex = 0;

  async function worker() {
    while (currentIndex < items.length) {
      const idx = currentIndex++;
      try {
        results[idx] = await iteratorFn(items[idx], idx);
      } catch (_) {
        results[idx] = items[idx];
      }
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

/**
 * Normalize & validate social profile URLs (Facebook, Instagram, LinkedIn, Twitter/X, YouTube, TikTok, WhatsApp)
 */
function classifyAndAssignSocialLink(href, socials) {
  if (!href || typeof href !== 'string') return;
  const trimmed = href.trim();
  const lower = trimmed.toLowerCase();

  if (
    lower.includes('sharer') ||
    lower.includes('share.php') ||
    lower.includes('intent/tweet') ||
    lower.includes('/dialog/') ||
    lower.includes('/plugins/')
  ) {
    return;
  }

  if ((lower.includes('linkedin.com/company/') || lower.includes('linkedin.com/in/') || lower.includes('linkedin.com/school/')) && !socials.linkedin) {
    socials.linkedin = trimmed.split('?')[0];
  } else if ((lower.includes('facebook.com/') || lower.includes('fb.com/')) && !socials.facebook) {
    const cleanFb = trimmed.split('?')[0];
    if (!/facebook\.com\/?$/i.test(cleanFb) && !cleanFb.includes('/tr?') && !cleanFb.includes('/events/')) {
      socials.facebook = cleanFb;
    }
  } else if (lower.includes('instagram.com/') && !socials.instagram) {
    const cleanIg = trimmed.split('?')[0];
    if (!/instagram\.com\/?$/i.test(cleanIg) && !cleanIg.includes('/p/') && !cleanIg.includes('/reel/')) {
      socials.instagram = cleanIg;
      const handleMatch = cleanIg.match(/instagram\.com\/([a-zA-Z0-9._]+)/i);
      if (handleMatch && handleMatch[1]) {
        socials.instagramHandle = `@${handleMatch[1]}`;
      }
    }
  } else if ((lower.includes('twitter.com/') || lower.includes('x.com/')) && !socials.twitter) {
    socials.twitter = trimmed.split('?')[0];
  } else if (lower.includes('youtube.com/') && !socials.youtube) {
    socials.youtube = trimmed.split('?')[0];
  } else if (lower.includes('tiktok.com/@') && !socials.tiktok) {
    socials.tiktok = trimmed.split('?')[0];
  } else if ((lower.includes('wa.me/') || lower.includes('api.whatsapp.com')) && !socials.whatsapp) {
    socials.whatsapp = trimmed;
  }
}

/**
 * Extract emails, phones, social links (FB, IG, LinkedIn, X, YT, TikTok), and schema data from Cheerio doc
 */
function extractFromCheerio($, rawHtml, result, normalizedUrl, domain) {
  // 1. Extract real mailto: links
  $('a[href^="mailto:"]').each((_, el) => {
    const href = $(el).attr('href') || '';
    const email = href.replace(/^mailto:/i, '').split('?')[0];
    const cleaned = cleanEmail(email);
    if (cleaned) result.emails.add(cleaned);
  });

  // 2. Decode any Cloudflare data-cfemail attributes
  $('[data-cfemail]').each((_, el) => {
    const hex = $(el).attr('data-cfemail');
    const decoded = cleanEmail(decodeCloudflareEmail(hex));
    if (decoded) result.emails.add(decoded);
  });

  // 3. Extract JSON-LD schema metadata (including sameAs social links for FB, IG, LinkedIn!)
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const rawJson = $(el).html() || '';
      const matches = rawJson.match(EMAIL_REGEX) || [];
      for (const match of matches) {
        const cleaned = cleanEmail(match);
        if (cleaned) result.emails.add(cleaned);
      }
      const parsed = JSON.parse(rawJson);
      const items = Array.isArray(parsed) ? parsed : (parsed['@graph'] || [parsed]);
      for (const obj of items) {
        if (!obj || typeof obj !== 'object') continue;
        if (obj.telephone) {
          const p = cleanPhone(obj.telephone);
          if (p) result.phones.add(p);
        }
        if (obj.email) {
          const e = cleanEmail(obj.email);
          if (e) result.emails.add(e);
        }
        if (obj.sameAs) {
          const sameAsList = Array.isArray(obj.sameAs) ? obj.sameAs : [obj.sameAs];
          for (const sUrl of sameAsList) {
            classifyAndAssignSocialLink(sUrl, result.socials);
          }
        }
        if (obj.address && typeof obj.address === 'object' && !result.address) {
          const a = obj.address;
          const parts = [a.streetAddress, a.addressLocality, a.addressRegion, a.postalCode, a.addressCountry].filter(Boolean);
          if (parts.length > 0) result.address = parts.join(', ');
        }
      }
    } catch (_) {}
  });

  // 4. Extract real tel: links
  $('a[href^="tel:"]').each((_, el) => {
    const href = $(el).attr('href') || '';
    const phone = href.replace(/^tel:/i, '').split('?')[0];
    const cleaned = cleanPhone(phone);
    if (cleaned) result.phones.add(cleaned);
  });

  // 5. Extract real text emails & phones from body and meta descriptions
  const metaDesc = $('meta[name="description"]').attr('content') || $('meta[property="og:description"]').attr('content') || '';
  const combinedText = `${metaDesc}\n${$('body').text()}`;

  const emailMatches = combinedText.match(EMAIL_REGEX) || [];
  for (const match of emailMatches) {
    const cleaned = cleanEmail(match);
    if (cleaned) result.emails.add(cleaned);
  }

  const phoneMatches = combinedText.match(PHONE_TEXT_REGEX) || [];
  for (const pm of phoneMatches.slice(0, 10)) {
    const cleaned = cleanPhone(pm);
    if (cleaned) result.phones.add(cleaned);
  }

  // 6. Extract social links and candidate internal contact/about pages
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') || '';
    classifyAndAssignSocialLink(href, result.socials);

    const hrefLower = href.toLowerCase();
    if (
      (hrefLower.includes('contact') ||
        hrefLower.includes('about') ||
        hrefLower.includes('team') ||
        hrefLower.includes('staff') ||
        hrefLower.includes('doctor') ||
        hrefLower.includes('attorney') ||
        hrefLower.includes('location') ||
        hrefLower.includes('office') ||
        hrefLower.includes('connect') ||
        hrefLower.includes('support')) &&
      !hrefLower.startsWith('mailto:') &&
      !hrefLower.startsWith('tel:') &&
      !hrefLower.startsWith('javascript:')
    ) {
      try {
        const resolved = new URL(href, normalizedUrl).href;
        if (resolved.includes(domain) && !result.contactPages.includes(resolved)) {
          result.contactPages.push(resolved);
        }
      } catch (_) {}
    }
  });
}

/**
 * Deep website & social page crawler to extract verified emails, phones, Facebook, Instagram, LinkedIn and metadata
 */
export async function scrapeWebsite(targetUrl, options = {}) {
  const maxSubpages = options.maxSubpages ?? 5;
  const timeoutMs = options.timeoutMs ?? 5000;

  let normalizedUrl = targetUrl;
  if (!/^https?:\/\//i.test(normalizedUrl)) {
    normalizedUrl = 'https://' + normalizedUrl;
  }

  const result = {
    url: normalizedUrl,
    title: '',
    description: '',
    address: '',
    techStack: [],
    emails: new Set(),
    phones: new Set(),
    socials: {
      linkedin: '',
      facebook: '',
      instagram: '',
      instagramHandle: '',
      twitter: '',
      youtube: '',
      tiktok: '',
      whatsapp: ''
    },
    contactPages: [],
    crawledPages: []
  };

  let domain = '';
  try {
    const parsedBase = new URL(normalizedUrl);
    domain = parsedBase.hostname.replace(/^www\./, '');
    classifyAndAssignSocialLink(normalizedUrl, result.socials);
  } catch (_) {
    return result;
  }

  const isSocialDomain = ['facebook.com', 'fb.com', 'instagram.com', 'linkedin.com'].some(d => domain.includes(d));

  let homepageHtml = '';
  let homepageStatus = 200;
  let responseTimeMs = 450;

  try {
    const startTime = Date.now();
    const response = await axios.get(normalizedUrl, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      timeout: timeoutMs,
      maxRedirects: 4
    });
    responseTimeMs = Date.now() - startTime;
    homepageStatus = response.status;
    homepageHtml = typeof response.data === 'string' ? response.data : '';

    result.crawledPages.push(normalizedUrl);
    const rawHtml = deobfuscateHtml(homepageHtml);
    const $ = cheerio.load(rawHtml);

    result.title =
      $('meta[property="og:title"]').attr('content') ||
      $('title').text().trim() ||
      domain;
    result.description =
      $('meta[property="og:description"]').attr('content') ||
      $('meta[name="description"]').attr('content') ||
      '';
    result.techStack = detectTechStack(homepageHtml);

    extractFromCheerio($, rawHtml, result, normalizedUrl, domain);

    // Crawl candidate contact/about/team subpages if it's a standard website
    if (!isSocialDomain && maxSubpages > 0) {
      const subpagesToTry = [
        ...result.contactPages,
        new URL('/contact', normalizedUrl).href,
        new URL('/contact-us', normalizedUrl).href,
        new URL('/about', normalizedUrl).href,
        new URL('/about-us', normalizedUrl).href,
        new URL('/our-team', normalizedUrl).href,
        new URL('/team', normalizedUrl).href
      ];

      const uniqueSubpages = Array.from(new Set(subpagesToTry))
        .filter(u => u !== normalizedUrl)
        .slice(0, maxSubpages);

      for (const subpageUrl of uniqueSubpages) {
        if (options.fastMode && result.emails.size > 0 && result.socials.facebook && result.socials.instagram) break;
        try {
          const subRes = await axios.get(subpageUrl, {
            headers: { 'User-Agent': USER_AGENT },
            timeout: Math.min(timeoutMs, 3200)
          });
          result.crawledPages.push(subpageUrl);
          const subHtml = deobfuscateHtml(subRes.data);
          const sub$ = cheerio.load(subHtml);
          extractFromCheerio(sub$, subHtml, result, normalizedUrl, domain);
        } catch (_) {}
      }
    }
  } catch (_) {}

  // Prioritize emails that match the actual website domain
  const rawEmailList = Array.from(result.emails);
  const domainMatching = (!isSocialDomain && domain)
    ? rawEmailList.filter(e => e.endsWith('@' + domain) || e.endsWith('.' + domain))
    : [];
  const otherEmails = rawEmailList.filter(e => !domainMatching.includes(e));
  const finalEmails = [...domainMatching, ...otherEmails];
  const finalPhones = Array.from(result.phones);

  // Perform weak point audit using already-fetched HTML
  let websiteAudit = null;
  if (options.includeAudit !== false && !isSocialDomain) {
    try {
      if (homepageHtml) {
        websiteAudit = auditWebsiteFromHtml({
          url: normalizedUrl,
          domain,
          html: homepageHtml,
          statusCode: homepageStatus,
          isHttps: normalizedUrl.startsWith('https:'),
          responseTimeMs
        });
      } else if (!options.fastMode) {
        websiteAudit = await auditWebsite(normalizedUrl);
      }
    } catch (_) {}
  }

  return {
    url: normalizedUrl,
    title: result.title,
    description: result.description,
    address: result.address,
    techStack: result.techStack,
    emails: finalEmails,
    primaryEmail: finalEmails[0] || '',
    phones: finalPhones,
    primaryPhone: finalPhones[0] || '',
    socials: result.socials,
    crawledPages: result.crawledPages,
    websiteAudit
  };
}

/**
 * Multi-Engine Web Search helper (combines DuckDuckGo Lite, DuckDuckGo HTML, Bing & Yahoo)
 * Ensures resilient, high-volume results without single-engine rate limits!
 */
async function queryWebSearchEngines(q) {
  const results = [];
  const seenUrls = new Set();

  const pushResult = (href, title, snippet) => {
    if (!href || !href.startsWith('http')) return;
    const cleanHref = href.split('#')[0];
    if (seenUrls.has(cleanHref)) return;
    seenUrls.add(cleanHref);
    results.push({
      href: cleanHref,
      title: (title || '').trim(),
      snippet: deobfuscateHtml(snippet || '').trim()
    });
  };

  // Engine A: Bing Search HTML (Very fast & rich snippets for Facebook, Instagram, LinkedIn & Websites!)
  try {
    const bingUrl = `https://www.bing.com/search?q=${encodeURIComponent(q)}&count=30`;
    const bRes = await axios.get(bingUrl, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept-Language': 'en-US,en;q=0.9'
      },
      timeout: 5500
    });
    const $b = cheerio.load(bRes.data);
    $b('li.b_algo').each((_, el) => {
      const a = $b(el).find('h2 a').first();
      const href = a.attr('href') || '';
      const title = a.text().trim();
      const snippet = $b(el).find('.b_caption p, .b_lineclamp2, .b_lineclamp3').text().trim();
      pushResult(href, title, snippet);
    });
  } catch (_) {}

  // Engine B: Yahoo Search HTML
  if (results.length < 15) {
    try {
      const yahooUrl = `https://search.yahoo.com/search?p=${encodeURIComponent(q)}&n=30`;
      const yRes = await axios.get(yahooUrl, {
        headers: {
          'User-Agent': USER_AGENT,
          'Accept-Language': 'en-US,en;q=0.9'
        },
        timeout: 5500
      });
      const $y = cheerio.load(yRes.data);
      $y('div.algo, div.Sr').each((_, el) => {
        const a = $y(el).find('h3 a, a.ac-algo').first();
        let href = a.attr('href') || '';
        if (href.includes('RU=')) {
          try {
            const match = href.match(/RU=([^/]+)/);
            if (match && match[1]) href = decodeURIComponent(match[1]);
          } catch (_) {}
        }
        const title = a.text().replace(/https?:\/\/[^\s]+/g, '').trim();
        const snippet = $y(el).find('.compText, p').text().trim();
        if (!href.includes('yahoo.com')) {
          pushResult(href, title, snippet);
        }
      });
    } catch (_) {}
  }

  // Engine C: DuckDuckGo Lite
  if (results.length < 15) {
    try {
      const ddgRes = await axios.post(
        'https://lite.duckduckgo.com/lite/',
        `q=${encodeURIComponent(q)}`,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': USER_AGENT
          },
          timeout: 5500
        }
      );
      const $ = cheerio.load(ddgRes.data);
      $('.result-link').each((_, el) => {
        let href = $(el).attr('href') || '';
        const title = $(el).text().trim();
        if (href.includes('uddg=')) {
          try {
            const u = new URL('https://duckduckgo.com' + href);
            href = decodeURIComponent(u.searchParams.get('uddg') || href);
          } catch (_) {}
        }
        const snippet = $(el).closest('tr').next('tr').text() || '';
        pushResult(href, title, snippet);
      });
    } catch (_) {}
  }

  return results;
}

/**
 * Search the live web for official contact email & social profiles of a company
 */
export async function searchWebForEmail({ company, website }) {
  let domain = '';
  if (website) {
    try {
      domain = new URL(website).hostname.replace(/^www\./, '');
    } catch (_) {}
  }

  const cleanCompany = (company || '')
    .replace(/\s+(PLLC|LLP|LLC|Inc\.?|Corp\.?|Ltd\.?|PC|Group|Law Firm|Dental)\b/gi, '')
    .replace(/[^\w\s]/g, ' ')
    .trim();

  const queries = [];
  if (cleanCompany && domain) {
    queries.push(`"${cleanCompany}" "@${domain}"`);
    queries.push(`"${cleanCompany}" contact email`);
  } else if (cleanCompany) {
    queries.push(`"${cleanCompany}" contact email`);
    queries.push(`site:facebook.com "${cleanCompany}" email OR "@"`);
  } else if (domain) {
    queries.push(`"@${domain}" contact email`);
  }

  for (const q of queries) {
    try {
      const items = await queryWebSearchEngines(q);
      const allText = items.map(i => `${i.title} ${i.snippet}`).join('\n');
      const matches = allText.match(EMAIL_REGEX) || [];

      if (domain) {
        for (const m of matches) {
          const cleaned = cleanEmail(m);
          if (cleaned && (cleaned.endsWith('@' + domain) || cleaned.endsWith('.' + domain))) {
            return { email: cleaned, source: `Live Web Search (@${domain})` };
          }
        }
      }

      for (const m of matches) {
        const cleaned = cleanEmail(m);
        if (cleaned && !cleaned.includes('duckduckgo') && !cleaned.includes('google') && !cleaned.includes('bing') && !cleaned.includes('yahoo')) {
          return { email: cleaned, source: 'Live Web / Social Search' };
        }
      }
    } catch (_) {}
  }

  return { email: '', source: 'Not Found' };
}

/**
 * Complete Real Email Finder combining deep website crawler + live web & social search
 */
export async function findRealEmailForLead({ company, website }) {
  if (website) {
    try {
      const scraped = await scrapeWebsite(website, { maxSubpages: 5 });
      if (scraped.primaryEmail) {
        return {
          email: scraped.primaryEmail,
          source: 'Direct Website Scrape',
          scrapedDetails: scraped
        };
      }
    } catch (_) {}
  }

  if (company || website) {
    const webResult = await searchWebForEmail({ company, website });
    if (webResult.email) {
      return {
        email: webResult.email,
        source: webResult.source
      };
    }
  }

  return {
    email: '',
    source: 'No verified email found'
  };
}

/**
 * Generate expanded search terms / synonyms for a niche
 */
function buildNicheQueryExpansion(searchTerm) {
  const lower = searchTerm.toLowerCase();
  const terms = new Set([searchTerm]);

  if (lower.includes('dent')) {
    ['Dentist', 'Dental Clinic', 'Dental Care', 'Family Dental', 'Cosmetic Dentistry', 'Orthodontist', 'Oral Surgery', 'Pediatric Dentist', 'Dental Group'].forEach(t => terms.add(t));
  } else if (lower.includes('law') || lower.includes('attorney') || lower.includes('legal')) {
    ['Law Firm', 'Attorney', 'Lawyer', 'Legal Services', 'Personal Injury Attorney', 'Family Law', 'Law Office', 'Criminal Defense', 'Estate Attorney'].forEach(t => terms.add(t));
  } else if (lower.includes('med') || lower.includes('clinic') || lower.includes('doctor') || lower.includes('health')) {
    ['Medical Clinic', 'Medical Center', 'Health Clinic', 'Family Medicine', 'Urgent Care', 'Doctor Office', 'Healthcare', 'Chiropractor', 'Physical Therapy'].forEach(t => terms.add(t));
  } else if (lower.includes('market') || lower.includes('agency') || lower.includes('seo') || lower.includes('advertis')) {
    ['Digital Marketing Agency', 'Marketing Agency', 'SEO Agency', 'Advertising Agency', 'Web Design Agency', 'Social Media Agency', 'PR Agency', 'Branding Agency'].forEach(t => terms.add(t));
  } else if (lower.includes('software') || lower.includes('tech') || lower.includes('saas') || lower.includes('it')) {
    ['Software Company', 'IT Services', 'Tech Company', 'Web Development Company', 'Managed IT', 'Cloud Consulting', 'App Development', 'Cybersecurity'].forEach(t => terms.add(t));
  } else if (lower.includes('real estate') || lower.includes('realt') || lower.includes('property')) {
    ['Real Estate Agency', 'Realtor', 'Property Management', 'Real Estate Broker', 'Commercial Real Estate', 'Real Estate Group', 'Home Builder'].forEach(t => terms.add(t));
  } else if (lower.includes('restaur') || lower.includes('cafe') || lower.includes('food')) {
    ['Restaurant', 'Cafe', 'Bistro', 'Steakhouse', 'Pizzeria', 'Bakery', 'Catering', 'Coffee Shop'].forEach(t => terms.add(t));
  } else if (lower.includes('plumb') || lower.includes('hvac') || lower.includes('roof') || lower.includes('contract')) {
    ['Plumbing', 'HVAC', 'Roofing Contractor', 'General Contractor', 'Electrician', 'Home Remodeling', 'Landscaping'].forEach(t => terms.add(t));
  } else {
    terms.add(`${searchTerm} company`);
    terms.add(`${searchTerm} services`);
    terms.add(`${searchTerm} office`);
    terms.add(`${searchTerm} group`);
    terms.add(`${searchTerm} agency`);
    terms.add(`${searchTerm} center`);
    terms.add(`${searchTerm} specialists`);
  }

  return Array.from(terms);
}

/**
 * Build FAST indexed Overpass QL tag filters for OpenStreetMap
 */
function buildOverpassFilters(searchTerm) {
  const lower = searchTerm.toLowerCase();
  if (lower.includes('dent')) {
    return ['["amenity"="dentist"]', '["healthcare"="dentist"]', '["healthcare"="orthodontics"]'];
  }
  if (lower.includes('law') || lower.includes('attorney') || lower.includes('legal')) {
    return ['["office"="lawyer"]', '["office"="notary"]', '["office"="legal"]'];
  }
  if (lower.includes('med') || lower.includes('clinic') || lower.includes('doctor') || lower.includes('health')) {
    return [
      '["amenity"="clinic"]',
      '["amenity"="doctors"]',
      '["healthcare"="clinic"]',
      '["healthcare"="doctor"]',
      '["healthcare"="centre"]',
      '["healthcare"="physiotherapist"]'
    ];
  }
  if (lower.includes('market') || lower.includes('agency') || lower.includes('advertis') || lower.includes('design')) {
    return ['["office"="advertising_agency"]', '["office"="consulting"]', '["office"="graphic_design"]', '["office"="company"]'];
  }
  if (lower.includes('software') || lower.includes('tech') || lower.includes('it')) {
    return ['["office"="it"]', '["office"="software"]', '["office"="telecommunication"]', '["office"="research"]', '["office"="company"]'];
  }
  if (lower.includes('real estate') || lower.includes('realt') || lower.includes('property')) {
    return ['["office"="estate_agent"]', '["office"="property_management"]', '["office"="architect"]'];
  }
  if (lower.includes('account') || lower.includes('tax') || lower.includes('cpa') || lower.includes('financ')) {
    return ['["office"="accountant"]', '["office"="tax_advisor"]', '["office"="financial"]', '["office"="financial_advisor"]', '["office"="insurance"]'];
  }
  if (lower.includes('restaur') || lower.includes('food') || lower.includes('cafe')) {
    return ['["amenity"="restaurant"]', '["amenity"="cafe"]', '["amenity"="fast_food"]'];
  }
  if (lower.includes('plumb') || lower.includes('hvac') || lower.includes('roof') || lower.includes('contract') || lower.includes('electric')) {
    return ['["craft"="plumber"]', '["craft"="hvac"]', '["craft"="roofer"]', '["craft"="electrician"]', '["craft"="builder"]', '["office"="construction_company"]'];
  }
  return ['["office"="company"]', '["office"="consulting"]', '["amenity"="clinic"]', '["office"="lawyer"]'];
}

/**
 * Dedicated Social Media Scraper for FACEBOOK, INSTAGRAM, and LINKEDIN
 * Uses Multi-Engine Search (Bing + Yahoo + DuckDuckGo) to extract real profiles, handles, founders, emails & phones!
 */
export async function scrapeSocialPlatformLeads({ query, location, platforms = ['facebook', 'instagram', 'linkedin'] }) {
  const searchTerm = query.trim();
  const searchLoc = (location || '').trim();
  const socialLeads = [];

  const socialQueries = [];

  if (platforms.includes('facebook')) {
    socialQueries.push(
      { platform: 'Facebook', q: `site:facebook.com "${searchTerm}" "${searchLoc}"` },
      { platform: 'Facebook', q: `site:facebook.com "${searchTerm}" "${searchLoc}" email OR call OR "@"` }
    );
  }

  if (platforms.includes('instagram')) {
    socialQueries.push(
      { platform: 'Instagram', q: `site:instagram.com "${searchTerm}" "${searchLoc}"` },
      { platform: 'Instagram', q: `site:instagram.com "${searchTerm}" "${searchLoc}" contact OR book OR email` }
    );
  }

  if (platforms.includes('linkedin')) {
    socialQueries.push(
      { platform: 'LinkedIn', q: `site:linkedin.com/company "${searchTerm}" "${searchLoc}"` },
      { platform: 'LinkedIn', q: `site:linkedin.com/in "${searchTerm}" "${searchLoc}" Founder OR Owner OR CEO OR Partner` }
    );
  }

  await mapWithConcurrency(socialQueries, 3, async ({ platform, q }) => {
    const items = await queryWebSearchEngines(q);
    for (const { href, title, snippet } of items) {
      const lowerHref = href.toLowerCase();
      const snippetEmails = (snippet.match(EMAIL_REGEX) || []).map(cleanEmail).filter(Boolean);
      const snippetPhones = (snippet.match(PHONE_TEXT_REGEX) || []).map(cleanPhone).filter(Boolean);

      let extractedWebsite = '';
      const urlMatch = snippet.match(/https?:\/\/([a-zA-Z0-9.-]+\.[a-zA-Z]{2,10})/i);
      if (urlMatch && !['facebook.com', 'instagram.com', 'linkedin.com', 'bing.com', 'yahoo.com'].some(s => urlMatch[0].toLowerCase().includes(s))) {
        extractedWebsite = urlMatch[0];
      }

      if (platform === 'Facebook' && (lowerHref.includes('facebook.com/') || lowerHref.includes('fb.com/'))) {
        if (lowerHref.includes('/posts/') || lowerHref.includes('/photos/') || lowerHref.includes('/videos/') || lowerHref.includes('/groups/') || lowerHref.includes('/events/')) continue;
        const cleanTitle = title
          .replace(/\s*[-|•]\s*Facebook.*$/i, '')
          .replace(/\s*\|\s*Facebook.*$/i, '')
          .replace(/Facebook$/i, '')
          .replace(/\s*-\s*Home$/i, '')
          .trim();
        if (!cleanTitle || cleanTitle.length < 2) continue;

        socialLeads.push({
          name: 'Facebook Page Owner / Admin',
          company: cleanTitle,
          category: searchTerm,
          website: extractedWebsite,
          email: snippetEmails[0] || '',
          allEmails: snippetEmails,
          phone: snippetPhones[0] || '',
          allPhones: snippetPhones,
          address: searchLoc || 'Facebook Business Page',
          socials: {
            facebook: href.split('?')[0]
          },
          notes: snippet.slice(0, 260),
          source: 'Facebook Business Scraper'
        });
      } else if (platform === 'Instagram' && lowerHref.includes('instagram.com/')) {
        if (lowerHref.includes('/p/') || lowerHref.includes('/reel/') || lowerHref.includes('/tv/') || lowerHref.includes('/explore/')) continue;
        const handleMatch = href.match(/instagram\.com\/([a-zA-Z0-9._]+)/i);
        const handle = handleMatch && handleMatch[1] ? `@${handleMatch[1]}` : '';
        const cleanTitle = title
          .replace(/\s*\(@[^)]+\).*$/i, '')
          .replace(/\s*•\s*Instagram photos and videos.*$/i, '')
          .replace(/\s*[-|]\s*Instagram.*$/i, '')
          .trim() || handle;
        if (!cleanTitle || cleanTitle.length < 2) continue;

        socialLeads.push({
          name: handle ? `Instagram Owner (${handle})` : 'Instagram Business Owner',
          company: cleanTitle,
          category: searchTerm,
          website: extractedWebsite,
          email: snippetEmails[0] || '',
          allEmails: snippetEmails,
          phone: snippetPhones[0] || '',
          allPhones: snippetPhones,
          address: searchLoc || 'Instagram Business Bio',
          socials: {
            instagram: href.split('?')[0],
            instagramHandle: handle
          },
          notes: snippet.slice(0, 260),
          source: 'Instagram Bio Scraper'
        });
      } else if (platform === 'LinkedIn' && lowerHref.includes('linkedin.com/')) {
        const cleanTitle = title
          .replace(/\s*[-|]\s*LinkedIn.*$/i, '')
          .trim();
        if (!cleanTitle || cleanTitle.length < 2) continue;

        if (lowerHref.includes('linkedin.com/in/')) {
          const parts = cleanTitle.split(/\s*[-–|]\s*/);
          const personName = parts[0]?.trim() || 'Founder / Executive';
          const roleOrCompany = parts.slice(1).join(' - ').trim();
          const companyName = parts[parts.length - 1]?.trim() || cleanTitle;

          socialLeads.push({
            name: `${personName}${parts[1] ? ' (' + parts[1] + ')' : ''}`,
            company: companyName.length > 2 ? companyName : `${personName} (${searchTerm})`,
            category: searchTerm,
            website: extractedWebsite,
            email: snippetEmails[0] || '',
            allEmails: snippetEmails,
            phone: snippetPhones[0] || '',
            allPhones: snippetPhones,
            address: searchLoc || 'LinkedIn Verified Profile',
            linkedinUrl: `https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(companyName)}`,
            linkedinPeopleUrl: href.split('?')[0],
            socials: {
              linkedin: href.split('?')[0]
            },
            notes: roleOrCompany ? `${roleOrCompany} — ${snippet.slice(0, 200)}` : snippet.slice(0, 240),
            source: 'LinkedIn Executive Scraper'
          });
        } else if (lowerHref.includes('linkedin.com/company/')) {
          socialLeads.push({
            name: 'Company Managing Partner / CEO',
            company: cleanTitle,
            category: searchTerm,
            website: extractedWebsite,
            email: snippetEmails[0] || '',
            allEmails: snippetEmails,
            phone: snippetPhones[0] || '',
            allPhones: snippetPhones,
            address: searchLoc || 'LinkedIn Company Profile',
            linkedinUrl: href.split('?')[0],
            socials: {
              linkedin: href.split('?')[0]
            },
            notes: snippet.slice(0, 260),
            source: 'LinkedIn Company Scraper'
          });
        }
      }
    }
  });

  return socialLeads;
}

/**
 * Search leads with LARGE DATASET EXTRACTION across Websites, Facebook, Instagram, LinkedIn & Directories
 */
export async function searchLeads({
  query,
  location,
  limit = 100,
  platforms = ['websites', 'facebook', 'instagram', 'linkedin'],
  excludeExisting = true,
  searchMode = 'auto'
}) {
  const targetLimit = Math.min(Math.max(Number(limit) || 100, 10), 500);
  const searchTerm = query.trim();
  const searchLoc = (location || '').trim();
  const combined = searchLoc ? `${searchTerm} ${searchLoc}` : searchTerm;
  const activePlatforms = Array.isArray(platforms) && platforms.length > 0
    ? platforms.map(p => p.toLowerCase())
    : ['websites', 'facebook', 'instagram', 'linkedin'];

  const includeWebsites = activePlatforms.includes('websites');
  const includeFacebook = activePlatforms.includes('facebook');
  const includeInstagram = activePlatforms.includes('instagram');
  const includeLinkedin = activePlatforms.includes('linkedin');

  const settings = db.getSettings();
  const serpApiKey = settings.serpApiKey || '';
  const googlePlacesApiKey = settings.googlePlacesApiKey || '';
  const hasApiKey = Boolean(serpApiKey || googlePlacesApiKey);

  // Determine effective search mode: 'api' | 'scraper' | 'hybrid'
  const effectiveMode = searchMode === 'api'
    ? 'api'
    : searchMode === 'scraper'
    ? 'scraper'
    : searchMode === 'hybrid'
    ? 'hybrid'
    : (hasApiKey ? 'api' : 'scraper');

  const isApiOnly = effectiveMode === 'api';
  const allowApi = (effectiveMode === 'api' || effectiveMode === 'hybrid') && hasApiKey;
  const allowScraper = effectiveMode === 'scraper' || effectiveMode === 'hybrid' || (!hasApiKey && effectiveMode === 'api');

  // Load all known fingerprints from active pipeline leads AND previously generated search history
  const existingFingerprints = excludeExisting ? db.getAllExistingFingerprints() : new Set();
  let skippedDuplicatesCount = 0;

  const rawLeads = [];
  const seenFingerprints = new Set();
  const seenNames = new Set();

  const addUniqueLead = (leadObj) => {
    const cleanName = (leadObj.company || '').trim();
    if (!isValidCompanyName(cleanName)) return false;

    // Reject dead leads with zero contact channels
    if (!isContactableLead(leadObj)) return false;

    let domain = '';
    if (leadObj.website) {
      try {
        domain = new URL(leadObj.website).hostname.replace(/^www\./, '').toLowerCase();
      } catch (_) {}
    }

    if (domain && EXCLUDED_DOMAINS.some(d => domain === d || domain.endsWith('.' + d))) {
      return false;
    }

    const leadPrints = getLeadFingerprints(leadObj);

    // 1. Strict Exclusion of Previously Generated / Existing Leads
    if (excludeExisting && existingFingerprints.size > 0 && leadPrints.size > 0) {
      const isAlreadyGenerated = Array.from(leadPrints).some(p => existingFingerprints.has(p));
      if (isAlreadyGenerated) {
        skippedDuplicatesCount++;
        return false;
      }
    }

    // 2. Intra-Search Deduplication & Data Merging
    if (leadPrints.size > 0) {
      const isSeenInRun = Array.from(leadPrints).some(p => seenFingerprints.has(p));
      if (isSeenInRun) {
        const existing = rawLeads.find(l => {
          const ep = getLeadFingerprints(l);
          return Array.from(leadPrints).some(p => ep.has(p));
        });
        if (existing) {
          if (!existing.email && leadObj.email) existing.email = leadObj.email;
          if (!existing.phone && leadObj.phone) existing.phone = leadObj.phone;
          if (!existing.website && leadObj.website) existing.website = leadObj.website;
          if (leadObj.socials) {
            existing.socials = {
              ...existing.socials,
              ...Object.fromEntries(Object.entries(leadObj.socials).filter(([_, v]) => Boolean(v)))
            };
          }
        }
        return false;
      }
      leadPrints.forEach(p => seenFingerprints.add(p));
    } else {
      const nameKey = cleanName.toLowerCase();
      if (seenNames.has(nameKey)) return false;
      seenNames.add(nameKey);
    }

    const fbUrl = leadObj.socials?.facebook || `https://www.facebook.com/search/pages/?q=${encodeURIComponent(cleanName + ' ' + searchLoc)}`;
    const igUrl = leadObj.socials?.instagram || `https://www.instagram.com/explore/search/keyword/?q=${encodeURIComponent(cleanName)}`;
    const liCompanyUrl = leadObj.socials?.linkedin || leadObj.linkedinUrl || `https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(cleanName)}`;
    const liPeopleUrl = leadObj.linkedinPeopleUrl || `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(cleanName + ' founder')}`;

    rawLeads.push({
      name: leadObj.name || 'Owner / Decision Maker',
      company: cleanName,
      category: leadObj.category || searchTerm,
      website: leadObj.website || '',
      email: leadObj.email || '',
      allEmails: leadObj.allEmails || (leadObj.email ? [leadObj.email] : []),
      phone: leadObj.phone || '',
      allPhones: leadObj.allPhones || (leadObj.phone ? [leadObj.phone] : []),
      address: leadObj.address || searchLoc || 'Location on Website',
      openingHours: leadObj.openingHours || '',
      techStack: leadObj.techStack || [],
      mapsUrl: leadObj.mapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cleanName + ' ' + searchLoc)}`,
      linkedinUrl: liCompanyUrl,
      linkedinPeopleUrl: liPeopleUrl,
      facebookUrl: fbUrl,
      instagramUrl: igUrl,
      socials: {
        facebook: leadObj.socials?.facebook || '',
        instagram: leadObj.socials?.instagram || '',
        instagramHandle: leadObj.socials?.instagramHandle || '',
        linkedin: leadObj.socials?.linkedin || '',
        twitter: leadObj.socials?.twitter || '',
        youtube: leadObj.socials?.youtube || '',
        tiktok: leadObj.socials?.tiktok || '',
        whatsapp: leadObj.socials?.whatsapp || ''
      },
      notes: leadObj.notes || '',
      source: leadObj.source || 'Live Business Directory',
      scrapedDetails: false,
      qualityScore: 0
    });
    return true;
  };

  // =========================================================================
  // SOURCE 1: Dedicated Facebook, Instagram & LinkedIn Social Scrapers (Non-API mode or explicitly selected)
  // =========================================================================
  const requestedSocialPlatforms = [
    includeFacebook ? 'facebook' : null,
    includeInstagram ? 'instagram' : null,
    includeLinkedin ? 'linkedin' : null
  ].filter(Boolean);

  if (requestedSocialPlatforms.length > 0 && !isApiOnly) {
    try {
      const socialLeads = await scrapeSocialPlatformLeads({
        query: searchTerm,
        location: searchLoc,
        platforms: requestedSocialPlatforms
      });
      for (const sLead of socialLeads) {
        addUniqueLead(sLead);
      }
    } catch (socErr) {
      console.warn('Social scraper warning:', socErr.message);
    }
  }

  // =========================================================================
  // SOURCE 2: SerpAPI (Google Maps Multi-Page Search) if provided
  // =========================================================================
  if (includeWebsites && serpApiKey && allowApi) {
    const pagesToFetch = Math.min(Math.ceil(targetLimit / 20), isApiOnly ? 15 : 6);
    for (let page = 0; page < pagesToFetch; page++) {
      if (rawLeads.length >= targetLimit) break;
      try {
        const startOffset = page * 20;
        const serpUrl = `https://serpapi.com/search.json?engine=google_maps&q=${encodeURIComponent(combined)}&start=${startOffset}&api_key=${serpApiKey}`;
        const sRes = await axios.get(serpUrl, { timeout: 8000 });
        if (!Array.isArray(sRes.data.local_results) || sRes.data.local_results.length === 0) break;

        for (const place of sRes.data.local_results) {
          addUniqueLead({
            name: 'Business Owner / Principal',
            company: place.title,
            category: place.type || searchTerm,
            website: place.website || '',
            phone: place.phone || '',
            address: place.address || searchLoc,
            source: 'Google Places / Maps Verified'
          });
        }
      } catch (serpErr) {
        console.warn('SerpAPI search error:', serpErr.message);
        break;
      }
    }
  }

  // =========================================================================
  // SOURCE 3: Google Places API (Text Search) if provided
  // =========================================================================
  if (includeWebsites && googlePlacesApiKey && allowApi && rawLeads.length < targetLimit) {
    try {
      let pageToken = '';
      for (let p = 0; p < (isApiOnly ? 4 : 2); p++) {
        if (rawLeads.length >= targetLimit) break;
        const gUrl = pageToken
          ? `https://maps.googleapis.com/maps/api/place/textsearch/json?pagetoken=${pageToken}&key=${googlePlacesApiKey}`
          : `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(combined)}&key=${googlePlacesApiKey}`;
        const gRes = await axios.get(gUrl, { timeout: 8000 });
        if (Array.isArray(gRes.data.results)) {
          for (const place of gRes.data.results) {
            let website = '';
            let phone = '';
            if (place.place_id) {
              try {
                const dUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=website,formatted_phone_number&key=${googlePlacesApiKey}`;
                const dRes = await axios.get(dUrl, { timeout: 4000 });
                if (dRes.data.result) {
                  website = dRes.data.result.website || '';
                  phone = dRes.data.result.formatted_phone_number || '';
                }
              } catch (_) {}
            }
            addUniqueLead({
              name: 'Business Decision Maker',
              company: place.name,
              category: (place.types && place.types[0]) ? place.types[0].replace(/_/g, ' ') : searchTerm,
              website,
              phone,
              address: place.formatted_address || searchLoc,
              source: 'Google Maps Places API'
            });
            if (rawLeads.length >= targetLimit) break;
          }
        }
        pageToken = gRes.data.next_page_token;
        if (!pageToken) break;
        await new Promise(r => setTimeout(r, 2000));
      }
    } catch (gErr) {
      console.warn('Google Places API error:', gErr.message);
    }
  }

  // =========================================================================
  // SOURCE 4: OpenStreetMap Overpass API (Multi-Mirror Failover) - Scraper mode only
  // =========================================================================
  if (allowScraper && includeWebsites && rawLeads.length < targetLimit && searchLoc) {
    try {
      const geoUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchLoc)}&format=json&limit=1`;
      const geoRes = await axios.get(geoUrl, {
        headers: { 'User-Agent': 'LeadsFinderApp/2.0 (contact@arbazkhaan.vercel.app)' },
        timeout: 5000
      });

      if (Array.isArray(geoRes.data) && geoRes.data[0]?.boundingbox) {
        let [south, north, west, east] = geoRes.data[0].boundingbox.map(Number);
        if (Math.abs(north - south) < 0.25) {
          south -= 0.15;
          north += 0.15;
        }
        if (Math.abs(east - west) < 0.25) {
          west -= 0.15;
          east += 0.15;
        }
        const bbox = `${south},${west},${north},${east}`;
        const filters = buildOverpassFilters(searchTerm);
        const maxOverpass = Math.min(Math.max(targetLimit * 4, 400), 1200);

        const unionParts = filters
          .map(f => `node${f}(${bbox});way${f}(${bbox});`)
          .join('\n');

        const overpassQuery = `[out:json][timeout:12];(\n${unionParts}\n);out center ${maxOverpass};`;
        const overpassMirrors = [
          'https://overpass.kumi.systems/api/interpreter',
          'https://lz4.overpass-api.de/api/interpreter',
          'https://overpass-api.de/api/interpreter'
        ];
        let overpassRes = null;
        for (const mirrorUrl of overpassMirrors) {
          try {
            overpassRes = await axios.post(
              mirrorUrl,
              `data=${encodeURIComponent(overpassQuery)}`,
              {
                headers: {
                  'Content-Type': 'application/x-www-form-urlencoded',
                  'User-Agent': 'LeadsFinderApp/2.0'
                },
                timeout: 12000
              }
            );
            if (Array.isArray(overpassRes.data?.elements)) break;
          } catch (_) {}
        }

        if (Array.isArray(overpassRes?.data?.elements)) {
          const sortedElements = [...overpassRes.data.elements].sort((a, b) => {
            const aScore = (a.tags?.website || a.tags?.['contact:website'] ? 2 : 0) + (a.tags?.phone || a.tags?.['contact:phone'] ? 1 : 0);
            const bScore = (b.tags?.website || b.tags?.['contact:website'] ? 2 : 0) + (b.tags?.phone || b.tags?.['contact:phone'] ? 1 : 0);
            return bScore - aScore;
          });

          for (const el of sortedElements) {
            if (rawLeads.length >= targetLimit * 2) break;
            const tags = el.tags || {};
            const name = tags.name || tags['brand'] || tags['operator'];
            if (!name) continue;

            let website = tags.website || tags['contact:website'] || tags.url || '';
            if (website && !website.startsWith('http')) {
              website = 'https://' + website;
            }
            const phone = cleanPhone(tags.phone || tags['contact:phone'] || tags['phone:mobile'] || '') || '';
            const email = cleanEmail(tags.email || tags['contact:email'] || '') || '';

            const addrParts = [
              tags['addr:housenumber'] ? `${tags['addr:housenumber']} ${tags['addr:street'] || ''}`.trim() : tags['addr:street'],
              tags['addr:city'] || searchLoc,
              tags['addr:state'],
              tags['addr:postcode']
            ].filter(Boolean);

            addUniqueLead({
              name: tags.operator || 'Owner / Decision Maker',
              company: name,
              category: (tags.amenity || tags.office || tags.healthcare || tags.shop || searchTerm).replace(/_/g, ' '),
              website,
              email,
              phone,
              address: addrParts.join(', ') || searchLoc,
              openingHours: tags.opening_hours || '',
              socials: {
                facebook: tags['contact:facebook'] || tags.facebook || '',
                instagram: tags['contact:instagram'] || tags.instagram || '',
                linkedin: tags['contact:linkedin'] || tags.linkedin || ''
              },
              source: 'OpenStreetMap Overpass Directory'
            });
          }
        }
      }
    } catch (ovErr) {
      console.warn('Overpass API query note:', ovErr.message);
    }
  }

  // =========================================================================
  // SOURCE 5: Multi-Page YellowPages Live Business Directory Scraper - Scraper mode only
  // =========================================================================
  if (allowScraper && includeWebsites && rawLeads.length < targetLimit && searchLoc) {
    const ypPages = [1, 2, 3, 4, 5, 6, 7, 8];
    await mapWithConcurrency(ypPages, 2, async (page) => {
      if (rawLeads.length >= targetLimit * 2) return;
      try {
        const ypUrl = `https://www.yellowpages.com/search?search_terms=${encodeURIComponent(searchTerm)}&geo_location_terms=${encodeURIComponent(searchLoc)}&page=${page}`;
        const ypRes = await axios.get(ypUrl, {
          headers: {
            'User-Agent': USER_AGENT,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9'
          },
          timeout: 6000
        });
        const $ = cheerio.load(ypRes.data);
        $('.result, .v-card').each((_, card) => {
          const name = $(card).find('.business-name span, a.business-name').first().text().trim();
          if (!name) return;
          const phone = cleanPhone($(card).find('.phones.phone.primary, .phone').first().text().trim()) || '';
          const street = $(card).find('.street-address').first().text().trim();
          const locality = $(card).find('.locality').first().text().trim();
          const address = [street, locality].filter(Boolean).join(', ') || searchLoc;
          let website = $(card).find('a.track-visit-website').attr('href') || '';
          if (website && !website.startsWith('http')) website = '';
          const cat = $(card).find('.categories a').first().text().trim() || searchTerm;

          addUniqueLead({
            name: 'Owner / Decision Maker',
            company: name,
            category: cat,
            website,
            phone,
            address,
            source: 'YellowPages Business Directory'
          });
        });
      } catch (_) {}
    });
  }

  // =========================================================================
  // SOURCE 6: Multi-Query OpenStreetMap Nominatim Expansion - Scraper mode only
  // =========================================================================
  if (allowScraper && includeWebsites && rawLeads.length < targetLimit) {
    const expandedTerms = buildNicheQueryExpansion(searchTerm).slice(0, 6);
    const skipTypes = [
      'cemetery', 'peak', 'residential', 'road', 'administrative', 'boundary',
      'hamlet', 'village', 'neighbourhood', 'locality', 'house', 'secondary',
      'primary', 'tertiary', 'bus_stop', 'parking', 'river', 'stream'
    ];

    await mapWithConcurrency(expandedTerms, 2, async (termVariation) => {
      if (rawLeads.length >= targetLimit * 1.3) return;
      try {
        const qStr = searchLoc ? `${termVariation} ${searchLoc}` : termVariation;
        const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(qStr)}&format=json&addressdetails=1&extratags=1&limit=40`;
        const osmRes = await axios.get(nominatimUrl, {
          headers: { 'User-Agent': 'LeadsFinderApp/2.0 (contact@arbazkhaan.vercel.app)' },
          timeout: 5500
        });

        if (Array.isArray(osmRes.data)) {
          for (const item of osmRes.data) {
            if (skipTypes.includes(item.type) || skipTypes.includes(item.class)) continue;

            const extra = item.extratags || {};
            const addr = item.address || {};
            const name = (item.name || item.display_name.split(',')[0]).trim();

            let website = extra.website || extra['contact:website'] || extra.url || '';
            if (website && !website.startsWith('http')) {
              website = 'https://' + website;
            }
            const phone = cleanPhone(extra.phone || extra['contact:phone'] || '') || '';
            const email = cleanEmail(extra.email || extra['contact:email'] || '') || '';

            const addressParts = [
              addr.road,
              addr.city || addr.town || addr.village || searchLoc,
              addr.state,
              addr.country
            ].filter(Boolean);

            addUniqueLead({
              name: 'Owner / Decision Maker',
              company: name,
              category: item.type ? item.type.replace(/_/g, ' ') : searchTerm,
              website,
              email,
              phone,
              address: addressParts.join(', ') || item.display_name,
              openingHours: extra.opening_hours || '',
              socials: {
                facebook: extra['contact:facebook'] || extra.facebook || '',
                instagram: extra['contact:instagram'] || extra.instagram || '',
                linkedin: extra['contact:linkedin'] || extra.linkedin || ''
              },
              source: 'Live OSM Commercial Registry'
            });
          }
        }
      } catch (_) {}
    });
  }

  // =========================================================================
  // SOURCE 7: Multi-Engine Live Web Search (Bing + Yahoo + DuckDuckGo) - Scraper mode only
  // =========================================================================
  if (allowScraper && includeWebsites && rawLeads.length < targetLimit * 1.2) {
    const expandedTerms = buildNicheQueryExpansion(searchTerm).slice(0, 5);
    const webQueries = [
      `${combined} -clutch -yelp -expertise -tripadvisor -wikipedia`,
      `"${searchTerm}" "${searchLoc}" contact email OR phone -yelp -yellowpages`,
      `best ${searchTerm} in ${searchLoc} official website -yelp -clutch`,
      ...expandedTerms.map(t => `${t} ${searchLoc} -yelp -clutch -yellowpages -bbb`)
    ];
    const uniqueWebQueries = Array.from(new Set(webQueries)).slice(0, 7);

    await mapWithConcurrency(uniqueWebQueries, 3, async (webQ) => {
      if (rawLeads.length >= targetLimit * 1.4) return;
      const items = await queryWebSearchEngines(webQ);
      for (const { href, title, snippet } of items) {
        if (rawLeads.length >= targetLimit * 1.5) break;
        try {
          const domain = new URL(href).hostname.replace(/^www\./, '');
          const cleanSite = `https://${domain}`;
          const companyName = title.split(/[-–|:—•]/)[0].trim() || domain;

          const snippetEmails = (snippet.match(EMAIL_REGEX) || []).map(cleanEmail).filter(Boolean);
          const snippetPhones = (snippet.match(PHONE_TEXT_REGEX) || []).map(cleanPhone).filter(Boolean);

          addUniqueLead({
            name: 'Business Decision Maker',
            company: companyName,
            category: searchTerm,
            website: cleanSite,
            email: snippetEmails[0] || '',
            allEmails: snippetEmails,
            phone: snippetPhones[0] || '',
            allPhones: snippetPhones,
            address: searchLoc || 'Location on Website',
            notes: snippet.slice(0, 220),
            source: 'Live Website Search'
          });
        } catch (_) {}
      }
    });
  }

  // =========================================================================
  // STEP 8: High-Speed Concurrent Deep Website & Social Crawl
  // =========================================================================
  // Prioritize raw leads that already have websites, phones, or socials
  rawLeads.sort((a, b) => {
    const aVal = (a.website ? 4 : 0) + (a.email ? 3 : 0) + (a.phone ? 2 : 0) + (a.socials?.facebook || a.socials?.instagram ? 1 : 0);
    const bVal = (b.website ? 4 : 0) + (b.email ? 3 : 0) + (b.phone ? 2 : 0) + (b.socials?.facebook || b.socials?.instagram ? 1 : 0);
    return bVal - aVal;
  });

  const toProcess = rawLeads.slice(0, Math.min(rawLeads.length, Math.round(targetLimit * 1.6)));

  const enrichedLeads = await mapWithConcurrency(toProcess, 20, async (lead) => {
    const targetUrlToCrawl = lead.website || lead.socials?.facebook || lead.socials?.instagram || lead.socials?.linkedin;
    if (targetUrlToCrawl) {
      try {
        const scraped = await scrapeWebsite(targetUrlToCrawl, {
          maxSubpages: isApiOnly ? 1 : (lead.website ? 2 : 0),
          timeoutMs: isApiOnly ? 3000 : 4000,
          fastMode: isApiOnly,
          includeAudit: isApiOnly ? false : Boolean(lead.website)
        });
        if (scraped.primaryEmail && !lead.email) {
          lead.email = scraped.primaryEmail;
        }
        if (Array.isArray(scraped.emails) && scraped.emails.length > 0) {
          lead.allEmails = Array.from(new Set([...(lead.allEmails || []), ...scraped.emails]));
        }
        if (scraped.primaryPhone && !lead.phone) {
          lead.phone = scraped.primaryPhone;
        }
        if (Array.isArray(scraped.phones) && scraped.phones.length > 0) {
          lead.allPhones = Array.from(new Set([...(lead.allPhones || []), ...scraped.phones]));
        }
        if (scraped.address && (!lead.address || lead.address === 'Location on Website' || lead.address === searchLoc)) {
          lead.address = scraped.address;
        }
        if (scraped.title && lead.website) {
          lead.websiteTitle = scraped.title;
        }
        if (scraped.techStack?.length > 0) {
          lead.techStack = scraped.techStack;
        }
        lead.scrapedDetails = true;
        if (scraped.socials) {
          lead.socials = {
            ...lead.socials,
            ...Object.fromEntries(Object.entries(scraped.socials).filter(([_, v]) => Boolean(v)))
          };
          if (lead.socials.linkedin) {
            lead.linkedinUrl = lead.socials.linkedin;
          }
          if (lead.socials.facebook) {
            lead.facebookUrl = lead.socials.facebook;
          }
          if (lead.socials.instagram) {
            lead.instagramUrl = lead.socials.instagram;
          }
        }
        if (scraped.description && !lead.notes) {
          lead.notes = scraped.description;
        }
        if (scraped.websiteAudit) {
          lead.websiteAudit = scraped.websiteAudit;
        }
      } catch (_) {}
    }

    // Live Web Email Discovery fallback if website exists but email wasn't on front page
    if (!lead.email && lead.website) {
      try {
        const discovered = await searchWebForEmail({ company: lead.company, website: lead.website });
        if (discovered?.email) {
          lead.email = discovered.email;
          lead.allEmails = Array.from(new Set([discovered.email, ...(lead.allEmails || [])]));
        }
      } catch (_) {}
    }

    const health = computeLeadHealth(lead);
    lead.qualityScore = health.score;
    lead.healthStatus = health.status;
    lead.healthBadge = health.badgeLabel;
    lead.isHealthy = health.isHealthy;
    return lead;
  });

  // Filter for genuine, healthy, contactable leads
  const healthyOnly = enrichedLeads.filter(l => l.isHealthy);
  const candidatePool = healthyOnly.length >= Math.min(targetLimit, 10) ? healthyOnly : enrichedLeads;

  // Sort leads so highest quality, healthiest leads appear first!
  candidatePool.sort((a, b) => (b.qualityScore || 0) - (a.qualityScore || 0));

  const resultLeads = candidatePool.slice(0, targetLimit);
  resultLeads.skippedCount = skippedDuplicatesCount;

  return resultLeads;
}

export { auditWebsite };

export default {
  cleanEmail,
  cleanPhone,
  decodeCloudflareEmail,
  computeLeadQualityScore,
  computeLeadHealth,
  isValidCompanyName,
  isContactableLead,
  scrapeWebsite,
  searchWebForEmail,
  findRealEmailForLead,
  scrapeSocialPlatformLeads,
  searchLeads,
  auditWebsite
};
