import axios from 'axios';
import * as cheerio from 'cheerio';
import { URL } from 'url';
import db from '../db.js';

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// Email regex pattern
const EMAIL_REGEX = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z]{2,6})/gi;

// Junk email patterns
const JUNK_PATTERNS = [
  'example.com', 'domain.com', 'email.com', 'yourname@', 'sentry.io',
  'wixpress.com', 'wordpress.com', 'cloudflare.com', 'bootstrap.com',
  'github.com', 'schema.org', 'w3.org', '.png', '.jpg', '.jpeg', '.svg', '.webp'
];

function cleanEmail(email) {
  if (!email) return null;
  const trimmed = email.trim().toLowerCase();
  for (const junk of JUNK_PATTERNS) {
    if (trimmed.includes(junk)) return null;
  }
  if (trimmed.length < 6 || trimmed.length > 80) return null;
  return trimmed;
}

function cleanPhone(phone) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 7 || digits.length > 15) return null;
  return phone.trim();
}

/**
 * Deep website crawler to extract ONLY REAL verified emails, phones, social links and business metadata
 */
export async function scrapeWebsite(targetUrl) {
  let normalizedUrl = targetUrl;
  if (!/^https?:\/\//i.test(normalizedUrl)) {
    normalizedUrl = 'https://' + normalizedUrl;
  }

  const result = {
    url: normalizedUrl,
    title: '',
    description: '',
    emails: new Set(),
    phones: new Set(),
    socials: {
      linkedin: '',
      twitter: '',
      facebook: '',
      instagram: ''
    },
    contactPages: []
  };

  try {
    const parsedBase = new URL(normalizedUrl);
    const domain = parsedBase.hostname.replace(/^www\./, '');

    // 1. Fetch Homepage
    const response = await axios.get(normalizedUrl, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      timeout: 5000,
      maxRedirects: 5
    });

    const $ = cheerio.load(response.data);

    // Extract Title & Description
    result.title = $('title').text().trim() || $('meta[property="og:title"]').attr('content') || domain;
    result.description = $('meta[name="description"]').attr('content') || $('meta[property="og:description"]').attr('content') || '';

    // Extract real mailto: links
    $('a[href^="mailto:"]').each((_, el) => {
      const href = $(el).attr('href') || '';
      const email = href.replace(/^mailto:/i, '').split('?')[0];
      const cleaned = cleanEmail(email);
      if (cleaned) result.emails.add(cleaned);
    });

    // Extract real tel: links
    $('a[href^="tel:"]').each((_, el) => {
      const href = $(el).attr('href') || '';
      const phone = href.replace(/^tel:/i, '').split('?')[0];
      const cleaned = cleanPhone(phone);
      if (cleaned) result.phones.add(cleaned);
    });

    // Extract real text emails from body
    const bodyText = $('body').text();
    const matches = bodyText.match(EMAIL_REGEX) || [];
    for (const match of matches) {
      const cleaned = cleanEmail(match);
      if (cleaned) result.emails.add(cleaned);
    }

    // Extract social links (especially LinkedIn)
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href') || '';
      if (href.includes('linkedin.com/company') || href.includes('linkedin.com/in')) {
        if (!result.socials.linkedin) result.socials.linkedin = href;
      } else if (href.includes('twitter.com') || href.includes('x.com')) {
        if (!result.socials.twitter) result.socials.twitter = href;
      } else if (href.includes('facebook.com')) {
        if (!result.socials.facebook && !href.includes('sharer')) result.socials.facebook = href;
      } else if (href.includes('instagram.com')) {
        if (!result.socials.instagram) result.socials.instagram = href;
      }

      // Check for contact / about subpage links
      const hrefLower = href.toLowerCase();
      if (
        (hrefLower.includes('contact') || hrefLower.includes('about') || hrefLower.includes('team')) &&
        !hrefLower.startsWith('mailto:') &&
        !hrefLower.startsWith('tel:')
      ) {
        try {
          const resolved = new URL(href, normalizedUrl).href;
          if (resolved.includes(domain) && !result.contactPages.includes(resolved)) {
            result.contactPages.push(resolved);
          }
        } catch (_) {}
      }
    });

    // 2. If no email found on homepage, crawl the contact/about page if found
    if (result.emails.size === 0 && result.contactPages.length > 0) {
      const subpageUrl = result.contactPages[0];
      try {
        const subRes = await axios.get(subpageUrl, {
          headers: { 'User-Agent': USER_AGENT },
          timeout: 4000
        });
        const sub$ = cheerio.load(subRes.data);

        sub$('a[href^="mailto:"]').each((_, el) => {
          const href = sub$(el).attr('href') || '';
          const email = href.replace(/^mailto:/i, '').split('?')[0];
          const cleaned = cleanEmail(email);
          if (cleaned) result.emails.add(cleaned);
        });

        // Also check if subpage has LinkedIn link
        sub$('a[href]').each((_, el) => {
          const href = sub$(el).attr('href') || '';
          if ((href.includes('linkedin.com/company') || href.includes('linkedin.com/in')) && !result.socials.linkedin) {
            result.socials.linkedin = href;
          }
        });

        const subText = sub$('body').text();
        const subMatches = subText.match(EMAIL_REGEX) || [];
        for (const match of subMatches) {
          const cleaned = cleanEmail(match);
          if (cleaned) result.emails.add(cleaned);
        }
      } catch (subErr) {
        // subpage crawl error ignored
      }
    }

  } catch (err) {
    // website crawl warning
  }

  const finalEmails = Array.from(result.emails);

  return {
    url: normalizedUrl,
    title: result.title,
    description: result.description,
    emails: finalEmails,
    primaryEmail: finalEmails[0] || '', // Only real email or empty
    phones: Array.from(result.phones),
    primaryPhone: Array.from(result.phones)[0] || '',
    socials: result.socials
  };
}

/**
 * Search leads with LIVE WEB, GOOGLE MAPS & LINKEDIN REACH
 * Queries both live web engines and OpenStreetMap directories to find REAL businesses
 */
export async function searchLeads({ query, location, limit = 15 }) {
  const searchTerm = query.trim();
  const searchLoc = (location || '').trim();
  const combined = searchLoc ? `${searchTerm} ${searchLoc}` : searchTerm;

  const rawLeads = [];
  const seenWebsites = new Set();
  const seenNames = new Set();

  const settings = db.getSettings();
  const serpApiKey = settings.serpApiKey || '';

  // Source 1: SerpAPI (Google Places / Maps) if provided
  if (serpApiKey) {
    try {
      const serpUrl = `https://serpapi.com/search.json?engine=google_maps&q=${encodeURIComponent(combined)}&api_key=${serpApiKey}`;
      const sRes = await axios.get(serpUrl, { timeout: 8000 });
      if (Array.isArray(sRes.data.local_results)) {
        for (const place of sRes.data.local_results) {
          const name = place.title;
          const website = place.website || '';
          const phone = place.phone || '';
          const address = place.address || searchLoc;
          const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name + ' ' + address)}`;
          const linkedinSearchUrl = `https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(name)}`;
          const linkedinPeopleUrl = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(name + ' founder')}`;

          seenNames.add(name.toLowerCase());
          if (website) {
            try {
              seenWebsites.add(new URL(website).hostname.replace(/^www\./, ''));
            } catch (_) {}
          }

          rawLeads.push({
            name: 'Business Owner / Principal',
            company: name,
            category: place.type || searchTerm,
            website: website,
            email: '',
            phone: phone,
            address: address,
            mapsUrl: mapsUrl,
            linkedinUrl: linkedinSearchUrl,
            linkedinPeopleUrl: linkedinPeopleUrl,
            source: 'Google Places / Maps Verified',
            scrapedDetails: false
          });
        }
      }
    } catch (serpErr) {
      console.warn('SerpAPI search error:', serpErr.message);
    }
  }

  // Source 2: Google Places API (Text Search) if provided
  const googlePlacesApiKey = settings.googlePlacesApiKey || '';
  if (googlePlacesApiKey && rawLeads.length < limit) {
    try {
      const gUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(combined)}&key=${googlePlacesApiKey}`;
      const gRes = await axios.get(gUrl, { timeout: 8000 });
      if (Array.isArray(gRes.data.results)) {
        for (const place of gRes.data.results) {
          const name = place.name;
          const address = place.formatted_address || searchLoc;
          const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name + ' ' + address)}`;
          const linkedinSearchUrl = `https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(name)}`;
          const linkedinPeopleUrl = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(name + ' founder')}`;

          let website = '';
          let phone = '';

          // Fetch Place Details for website & phone
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

          rawLeads.push({
            name: 'Business Decision Maker',
            company: name,
            category: (place.types && place.types[0]) ? place.types[0].replace(/_/g, ' ') : searchTerm,
            website: website,
            email: '',
            phone: phone,
            address: address,
            mapsUrl: mapsUrl,
            linkedinUrl: linkedinSearchUrl,
            linkedinPeopleUrl: linkedinPeopleUrl,
            source: 'Google Maps Places API',
            scrapedDetails: false
          });

          if (rawLeads.length >= limit) break;
        }
      }
    } catch (gErr) {
      console.warn('Google Places API error:', gErr.message);
    }
  }

  // Source 2: DuckDuckGo Lite Live Search (Extracts real official business websites without bot blocks)
  try {
    const ddgQuery = `${combined} -clutch -yelp -expertise -tripadvisor -wikipedia`;
    const ddgRes = await axios.post(
      'https://lite.duckduckgo.com/lite/',
      `q=${encodeURIComponent(ddgQuery)}`,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': USER_AGENT
        },
        timeout: 6000
      }
    );

    const $ = cheerio.load(ddgRes.data);
    $('.result-link').each((_, el) => {
      if (rawLeads.length >= limit * 2) return false;
      let href = $(el).attr('href') || '';
      const title = $(el).text().trim();

      if (href.includes('uddg=')) {
        try {
          const u = new URL('https://duckduckgo.com' + href);
          href = decodeURIComponent(u.searchParams.get('uddg') || href);
        } catch (_) {}
      }

      if (
        href.startsWith('http') &&
        !href.includes('duckduckgo.com') &&
        !href.includes('facebook.com') &&
        !href.includes('instagram.com') &&
        !href.includes('twitter.com') &&
        !href.includes('yelp.com') &&
        !href.includes('clutch.co')
      ) {
        try {
          const domain = new URL(href).hostname.replace(/^www\./, '');
          const cleanSite = `https://${domain}`;

          if (!seenWebsites.has(domain)) {
            seenWebsites.add(domain);
            const companyName = title.split(/[-–|:—]/)[0].trim() || domain;

            if (!seenNames.has(companyName.toLowerCase())) {
              seenNames.add(companyName.toLowerCase());

              const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(companyName + ' ' + searchLoc)}`;
              const linkedinSearchUrl = `https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(companyName)}`;
              const linkedinPeopleUrl = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(companyName + ' founder')}`;

              rawLeads.push({
                name: 'Business Decision Maker',
                company: companyName,
                category: searchTerm,
                website: cleanSite,
                email: '',
                phone: '',
                address: searchLoc || 'Location on Website',
                mapsUrl: mapsUrl,
                linkedinUrl: linkedinSearchUrl,
                linkedinPeopleUrl: linkedinPeopleUrl,
                source: 'Live Business Directory',
                scrapedDetails: false
              });
            }
          }
        } catch (_) {}
      }
    });
  } catch (ddgErr) {
    console.warn('Live web search error:', ddgErr.message);
  }

  // Source 3: OpenStreetMap Live Commercial POI Directory
  try {
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(combined)}&format=json&addressdetails=1&extratags=1&limit=${Math.min(limit * 2, 40)}`;
    const osmRes = await axios.get(nominatimUrl, {
      headers: {
        'User-Agent': 'LeadsFinderApp/1.0 (contact@arbazkhaan.vercel.app)'
      },
      timeout: 6000
    });

    if (Array.isArray(osmRes.data)) {
      const skipTypes = ['cemetery', 'peak', 'residential', 'road', 'administrative', 'boundary', 'hamlet', 'village', 'neighbourhood', 'locality', 'house', 'secondary', 'primary', 'tertiary'];

      for (const item of osmRes.data) {
        if (skipTypes.includes(item.type) || skipTypes.includes(item.class)) {
          continue;
        }

        const extra = item.extratags || {};
        const addr = item.address || {};
        const name = (item.name || item.display_name.split(',')[0]).trim();

        if (seenNames.has(name.toLowerCase())) continue;
        seenNames.add(name.toLowerCase());

        let website = extra.website || extra['contact:website'] || extra.url || '';
        let phone = extra.phone || extra['contact:phone'] || '';
        let email = extra.email || extra['contact:email'] || '';

        if (website && !website.startsWith('http')) {
          website = 'https://' + website;
        }

        const addressParts = [
          addr.road,
          addr.city || addr.town || addr.village || searchLoc,
          addr.state,
          addr.country
        ].filter(Boolean);
        const fullAddress = addressParts.join(', ') || item.display_name;

        const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name + ' ' + (addr.city || searchLoc))}`;
        const linkedinSearchUrl = `https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(name)}`;
        const linkedinPeopleUrl = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(name + ' founder')}`;

        rawLeads.push({
          name: 'Owner / Decision Maker',
          company: name,
          category: item.type ? item.type.replace(/_/g, ' ') : searchTerm,
          website: website || '',
          email: email || '',
          phone: phone || '',
          address: fullAddress,
          mapsUrl: mapsUrl,
          linkedinUrl: linkedinSearchUrl,
          linkedinPeopleUrl: linkedinPeopleUrl,
          source: 'Google Maps / Live OSM Registry',
          scrapedDetails: false
        });

        if (rawLeads.length >= limit * 2) break;
      }
    }
  } catch (err) {
    console.warn('Map query error:', err.message);
  }

  // Auto deep-scrape websites for the top leads that have a website (concurrently with short 3s timeout)
  const toProcess = rawLeads.slice(0, limit);

  const crawlPromises = toProcess.map(async (lead) => {
    if (lead.website && !lead.email) {
      try {
        const scraped = await scrapeWebsite(lead.website);
        lead.email = scraped.primaryEmail || lead.email;
        lead.phone = scraped.primaryPhone || lead.phone;
        lead.scrapedDetails = true;
        if (scraped.socials?.linkedin) {
          lead.linkedinUrl = scraped.socials.linkedin; // Exact official company LinkedIn
        }
        if (scraped.description) {
          lead.notes = scraped.description;
        }
      } catch (_) {}
    }
    return lead;
  });

  const resolved = await Promise.all(crawlPromises);
  return resolved;
}

export default {
  scrapeWebsite,
  searchLeads
};
