import axios from 'axios';
import * as cheerio from 'cheerio';
import { URL } from 'url';

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// Common online booking & scheduling engine signatures
const BOOKING_SIGNATURES = [
  'calendly.com', 'acuityscheduling.com', 'zocdoc.com', 'jane.app',
  'setmore.com', 'appointlet.com', 'squareup.com/appointments',
  'vcita.com', 'simplybook.me', 'timely.com', 'booksy.com',
  'hubspot.com/meetings', 'tidycal.com', 'youcanbook.me', 'schedulista.com',
  'book-online', 'online-booking', 'schedule-appointment', 'book-appointment'
];

// Common live chat & conversational AI widget signatures
const CHAT_SIGNATURES = [
  'intercom.io', 'intercomcdn.com', 'drift.com', 'tidio.co', 'crisp.chat',
  'zendesk.com/embeddable', 'livechatinc.com', 'hs-scripts.com', 'tawk.to',
  'smartsupp.com', 'freshchat.com', 'chaport.com', 'collect.chat', 'voiceflow',
  'botpress', 'chat-widget', 'ai-chat'
];

/**
 * Deep website inspection engine to detect real weak points
 * @param {string} targetUrl - Target website URL
 * @returns {Promise<Object>} Comprehensive audit result
 */
export async function auditWebsite(targetUrl) {
  if (!targetUrl) {
    throw new Error('URL is required to perform website audit');
  }

  let normalizedUrl = targetUrl.trim();
  if (!/^https?:\/\//i.test(normalizedUrl)) {
    normalizedUrl = 'https://' + normalizedUrl;
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(normalizedUrl);
  } catch (err) {
    throw new Error(`Invalid URL format: "${targetUrl}"`);
  }

  const domain = parsedUrl.hostname.replace(/^www\./, '');
  const startTime = Date.now();

  let response;
  let responseTimeMs = 0;
  let isHttps = parsedUrl.protocol === 'https:';

  try {
    response = await axios.get(normalizedUrl, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      timeout: 8000,
      maxRedirects: 5,
      validateStatus: () => true
    });
    responseTimeMs = Date.now() - startTime;
  } catch (netErr) {
    // If https failed, fallback test http if applicable
    if (isHttps) {
      try {
        const httpFallbackUrl = normalizedUrl.replace(/^https:/i, 'http:');
        const fallbackStart = Date.now();
        response = await axios.get(httpFallbackUrl, {
          headers: { 'User-Agent': USER_AGENT },
          timeout: 6000,
          maxRedirects: 5,
          validateStatus: () => true
        });
        responseTimeMs = Date.now() - fallbackStart;
        isHttps = false;
      } catch (_) {
        return generateOfflineAudit(normalizedUrl, domain, netErr.message);
      }
    } else {
      return generateOfflineAudit(normalizedUrl, domain, netErr.message);
    }
  }

  const html = typeof response.data === 'string' ? response.data : '';
  const $ = cheerio.load(html);
  const statusCode = response.status;
  const headers = response.headers || {};

  const weakPoints = [];

  // ==========================================
  // 1. HTTP Status & Connectivity
  // ==========================================
  if (statusCode >= 400) {
    weakPoints.push({
      id: 'http_error_status',
      category: 'technical',
      severity: 'critical',
      title: `Server Returning HTTP ${statusCode} Error`,
      evidence: `Website responded with HTTP status ${statusCode}. Visitors may be seeing an error page.`,
      businessImpact: 'Visitors cannot access your site, resulting in 100% loss of potential leads.',
      pitchHook: `Your website is currently returning an HTTP ${statusCode} error status, blocking prospective clients.`,
      solution: 'Restore DNS, host routing, and server uptime monitoring immediately.',
      roiImpact: 'Prevents total client loss from website downtime.'
    });
  }

  // ==========================================
  // 2. SSL & Security
  // ==========================================
  if (!isHttps || (response.request?.res?.responseUrl && !response.request.res.responseUrl.startsWith('https:'))) {
    weakPoints.push({
      id: 'missing_ssl',
      category: 'security',
      severity: 'critical',
      title: 'Insecure Connection (Missing SSL / HTTPS)',
      evidence: 'Site does not enforce HTTPS. Chrome and Safari flag the site with a visible "Not Secure" warning.',
      businessImpact: 'Up to 85% of visitors immediately leave an insecure site without submitting inquiries.',
      pitchHook: `Browsers currently mark your website as "Not Secure", which causes visitors to hesitate and leave.`,
      solution: 'Install an SSL certificate and configure permanent 301 HTTPS redirection.',
      roiImpact: 'Eliminates visitor security warnings, boosting conversion rates immediately.'
    });
  }

  // ==========================================
  // 3. Performance & Speed
  // ==========================================
  if (responseTimeMs > 2200) {
    weakPoints.push({
      id: 'slow_loading_speed',
      category: 'performance',
      severity: responseTimeMs > 4000 ? 'critical' : 'high',
      title: `Slow Server Response (${(responseTimeMs / 1000).toFixed(1)}s)`,
      evidence: `Initial page response took ${(responseTimeMs / 1000).toFixed(1)}s, well beyond Google's recommended 1.2s threshold.`,
      businessImpact: '53% of mobile visits are abandoned if pages take over 3 seconds to load; Google lowers search rankings.',
      pitchHook: `Your site response time is currently ${(responseTimeMs / 1000).toFixed(1)}s, causing mobile visitors to bounce before viewing your services.`,
      solution: 'Optimize asset delivery, compression, and server response to achieve sub-second load times.',
      roiImpact: 'Cuts mobile bounce rates in half and improves Google PageSpeed scores.'
    });
  }

  // ==========================================
  // 4. Mobile Responsiveness & Viewport
  // ==========================================
  const viewportMeta = $('meta[name="viewport"]').attr('content');
  if (!viewportMeta) {
    weakPoints.push({
      id: 'missing_mobile_viewport',
      category: 'mobile',
      severity: 'critical',
      title: 'Missing Mobile Viewport Tag',
      evidence: 'No <meta name="viewport"> tag detected. Smartphones may display a zoomed-out desktop version requiring pinch-to-zoom.',
      businessImpact: 'Google imposes severe mobile ranking penalties and smartphone users leave instantly.',
      pitchHook: `Your website lacks responsive mobile viewport tags, making navigation difficult on mobile phones.`,
      solution: 'Implement responsive mobile viewport scaling and fluid layouts.',
      roiImpact: 'Captures the 65%+ of local inquiries originating on mobile phones.'
    });
  }

  // ==========================================
  // 5. Inbound Lead Capture & Booking (Highest Value!)
  // ==========================================
  const htmlLower = html.toLowerCase();

  // Check online booking widget
  let hasBookingWidget = false;
  for (const sig of BOOKING_SIGNATURES) {
    if (htmlLower.includes(sig)) {
      hasBookingWidget = true;
      break;
    }
  }

  if (!hasBookingWidget) {
    weakPoints.push({
      id: 'no_online_booking',
      category: 'conversion',
      severity: 'critical',
      title: 'No 24/7 Online Booking or Intake Widget',
      evidence: 'No embedded booking system (Calendly, Acuity, Zocdoc, etc.) found. Prospects arriving after-hours cannot self-schedule.',
      businessImpact: 'Practices lose over 35% of prospective clients who research services in the evening and want instant booking.',
      pitchHook: `Your website doesn't currently allow prospective clients to book an appointment or consultation directly online after-hours.`,
      solution: 'Deploy an automated 24/7 AI scheduling concierge that books qualified appointments directly into your calendar.',
      roiImpact: '+25% to +40% increase in scheduled consultations with zero receptionist phone tag.'
    });
  }

  // Check live chat / AI assistant widget
  let hasChatWidget = false;
  for (const sig of CHAT_SIGNATURES) {
    if (htmlLower.includes(sig)) {
      hasChatWidget = true;
      break;
    }
  }

  if (!hasChatWidget) {
    weakPoints.push({
      id: 'no_ai_chat',
      category: 'conversion',
      severity: 'high',
      title: 'Missing 24/7 AI Chat / Lead Qualifier',
      evidence: 'No interactive chat widget found to engage website visitors, answer treatment/service questions, or collect lead info.',
      businessImpact: 'Unanswered questions cause 60%+ of high-intent website visitors to leave for a competitor who responds faster.',
      pitchHook: `You don't have an interactive chat or AI assistant on your website to answer visitor questions and qualify leads in real time.`,
      solution: 'Integrate a custom-trained AI intake assistant that answers FAQs, pre-qualifies budgets/needs, and captures contact details 24/7.',
      roiImpact: 'Captures and converts up to 3x more website visitors without adding staff.'
    });
  }

  // Check direct click-to-contact links
  const hasTelLink = $('a[href^="tel:"]').length > 0;
  const hasMailtoLink = $('a[href^="mailto:"]').length > 0;

  if (!hasTelLink && !hasMailtoLink) {
    weakPoints.push({
      id: 'no_click_to_contact',
      category: 'conversion',
      severity: 'medium',
      title: 'No 1-Click Click-to-Call or Direct Email',
      evidence: 'No clickable "tel:" or "mailto:" links found. Phone numbers or emails appear only as unlinked text.',
      businessImpact: 'Mobile visitors cannot tap to call immediately, creating unnecessary friction.',
      pitchHook: `Mobile visitors cannot tap to call or email your team directly from your website headers or buttons.`,
      solution: 'Add prominent 1-tap dial buttons and instant messaging shortcuts across all pages.',
      roiImpact: 'Removes call friction, increasing mobile phone inquiries.'
    });
  }

  // Check for clear Call-to-Action (CTA) buttons
  const buttonTexts = $('button, a.btn, a.button, a[class*="btn"], a[class*="cta"], a[class*="button"]')
    .map((_, el) => $(el).text().trim().toLowerCase())
    .get();

  const ctaKeywords = ['book', 'schedule', 'consult', 'appointment', 'contact', 'get quote', 'start', 'call now', 'free estimate'];
  const hasClearCta = buttonTexts.some(txt => ctaKeywords.some(kw => txt.includes(kw)));

  if (!hasClearCta && buttonTexts.length < 2) {
    weakPoints.push({
      id: 'weak_call_to_action',
      category: 'conversion',
      severity: 'medium',
      title: 'Weak or Missing Primary Call-to-Action (CTA)',
      evidence: 'No clear, high-contrast action buttons ("Schedule Consultation", "Get Free Quote") above the fold.',
      businessImpact: 'Visitors browse passively without a clear next step, resulting in low conversion rates.',
      pitchHook: `Your homepage doesn't provide a prominent, friction-free action button guiding visitors to schedule or inquire.`,
      solution: 'Add clear, high-converting CTA buttons and 1-step intake flows across the hero section.',
      roiImpact: 'Boosts website conversion rate by 15-30%.'
    });
  }

  // ==========================================
  // 6. SEO & Search Engine Optimization
  // ==========================================
  const pageTitle = $('title').text().trim();
  const metaDesc = $('meta[name="description"]').attr('content') || $('meta[property="og:description"]').attr('content') || '';
  const h1Count = $('h1').length;

  if (!pageTitle || pageTitle.length < 10) {
    weakPoints.push({
      id: 'missing_seo_title',
      category: 'seo',
      severity: 'high',
      title: 'Missing or Generic SEO Page Title Tag',
      evidence: `Page title is "${pageTitle || 'Empty'}", lacking target service keywords or local business positioning.`,
      businessImpact: 'Severely damages Google search ranking for high-intent local customer searches.',
      pitchHook: `Your website title tag isn't optimized for target client searches in your local market.`,
      solution: 'Optimize page title structure with primary service keywords and geographic targeting.',
      roiImpact: 'Improves Google search visibility and search ranking positions.'
    });
  }

  if (!metaDesc || metaDesc.length < 35) {
    weakPoints.push({
      id: 'missing_meta_description',
      category: 'seo',
      severity: 'high',
      title: 'Missing or Inadequate Meta Description',
      evidence: metaDesc ? `Meta description is too short (${metaDesc.length} chars).` : 'No meta description tag found.',
      businessImpact: 'Google displays random scraped page text in search results instead of an enticing promotional pitch.',
      pitchHook: `Your website is missing an optimized search meta description, lowering click-through rates from Google searches.`,
      solution: 'Write targeted, compelling meta descriptions that drive organic search clicks.',
      roiImpact: '+20-35% higher click-through-rates from existing Google impressions.'
    });
  }

  if (h1Count === 0) {
    weakPoints.push({
      id: 'missing_h1',
      category: 'seo',
      severity: 'medium',
      title: 'Missing Primary H1 Headline',
      evidence: 'No <h1> heading tag found on the homepage.',
      businessImpact: 'Search crawlers struggle to identify the main topic of your business, diluting keyword relevance.',
      pitchHook: `Your homepage is missing a primary H1 headline structure, weakening your organic search relevance.`,
      solution: 'Add semantic H1/H2 header hierarchy emphasizing your core service offerings.',
      roiImpact: 'Enhances search engine crawlability and keyword targeting.'
    });
  }

  // Check Schema.org structured data
  const hasSchema = $('script[type="application/ld+json"]').length > 0 || $('[itemscope]').length > 0;
  if (!hasSchema) {
    weakPoints.push({
      id: 'missing_schema_markup',
      category: 'seo',
      severity: 'medium',
      title: 'Missing Schema.org Structured Data',
      evidence: 'No JSON-LD structured data detected for LocalBusiness, MedicalBusiness, or LegalService.',
      businessImpact: 'Prevents Google from generating rich snippets, review stars, and direct Google Maps cards.',
      pitchHook: `Your site lacks structured schema metadata, meaning Google cannot display rich search cards or service badges.`,
      solution: 'Inject standardized LocalBusiness / Organization Schema.org markup with reviews and operating hours.',
      roiImpact: 'Enables rich Google search cards and improves local map pack visibility.'
    });
  }

  // Check OpenGraph social tags
  const ogTitle = $('meta[property="og:title"]').attr('content');
  const ogImage = $('meta[property="og:image"]').attr('content');
  if (!ogTitle || !ogImage) {
    weakPoints.push({
      id: 'missing_social_opengraph',
      category: 'trust',
      severity: 'low',
      title: 'Missing Social Media Preview Tags (OpenGraph)',
      evidence: 'Missing og:title or og:image tags. Links shared on LinkedIn, Facebook, or messaging apps look plain.',
      businessImpact: 'Reduces referral clicks when clients or partners share your links.',
      pitchHook: `When prospective clients share your website link on social media or messaging apps, no brand preview image displays.`,
      solution: 'Add OpenGraph and Twitter card metadata for professional brand presentation.',
      roiImpact: 'Higher engagement on shared links and referral traffic.'
    });
  }

  // ==========================================
  // 7. Trust & Maintenance (Outdated Copyright)
  // ==========================================
  const currentYear = new Date().getFullYear();
  const copyrightMatches = html.match(/(?:copyright|©|&copy;)\s*(?:20\d\d\s*[-–]\s*)?(20\d\d)/i);
  if (copyrightMatches && copyrightMatches[1]) {
    const foundYear = parseInt(copyrightMatches[1], 10);
    if (foundYear <= currentYear - 2) {
      weakPoints.push({
        id: 'outdated_copyright_year',
        category: 'trust',
        severity: 'medium',
        title: `Outdated Website Copyright (Shows © ${foundYear})`,
        evidence: `Footer displays an outdated copyright year (${foundYear}), signaling the site may not be actively maintained.`,
        businessImpact: 'Prospects may question whether the business is still active and choose a modern competitor.',
        pitchHook: `Your site footer displays an outdated copyright year (${foundYear}), which can make prospective clients wonder if the business is actively taking new inquiries.`,
        solution: 'Modernize site footer, refresh key service content, and implement automated copyright updates.',
        roiImpact: 'Reassures prospective clients that the business is active and responsive.'
      });
    }
  }

  // ==========================================
  // Calculate Audit Health Score (0 - 100)
  // ==========================================
  let score = 100;
  for (const wp of weakPoints) {
    if (wp.severity === 'critical') score -= 22;
    else if (wp.severity === 'high') score -= 14;
    else if (wp.severity === 'medium') score -= 8;
    else score -= 4;
  }
  score = Math.max(18, Math.min(100, score));

  // Sort weak points by severity priority (critical first, then high, medium, low)
  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  weakPoints.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  const topWeakPoint = weakPoints[0] || null;

  // Generate an actionable summary
  let statusSummary = '';
  if (score >= 85) {
    statusSummary = 'Website is generally healthy, with minor conversion & SEO optimization opportunities.';
  } else if (score >= 60) {
    statusSummary = `Identified ${weakPoints.length} key bottlenecks—primarily in ${topWeakPoint?.title || 'lead capture'}—that are causing client leakage.`;
  } else {
    statusSummary = `Critical conversion bottlenecks detected: ${weakPoints.length} issues found affecting after-hours booking, speed, and client trust.`;
  }

  return {
    url: normalizedUrl,
    domain,
    auditedAt: new Date().toISOString(),
    statusCode,
    isHttps,
    responseTimeMs,
    score,
    rating: score >= 80 ? 'Good' : score >= 60 ? 'Needs Improvement' : 'Critical Attention',
    summary: statusSummary,
    topWeakPoint,
    weakPoints,
    metrics: {
      hasBookingWidget,
      hasChatWidget,
      hasTelLink,
      hasMailtoLink,
      hasClearCta,
      responseTimeMs,
      pageTitle: pageTitle || 'Missing',
      metaDescriptionLength: metaDesc.length,
      hasMobileViewport: Boolean(viewportMeta),
      hasSchema
    }
  };
}

/**
 * Fallback audit generator when domain is completely offline or DNS fails
 */
function generateOfflineAudit(url, domain, errorMessage) {
  const weakPoint = {
    id: 'site_offline_unreachable',
    category: 'technical',
    severity: 'critical',
    title: 'Website Unreachable / Connection Failed',
    evidence: `Connection attempt failed: ${errorMessage}. Visitors cannot load the site.`,
    businessImpact: 'Completely eliminates all web traffic, inquiries, and customer trust.',
    pitchHook: `I attempted to visit ${domain} and noticed the site is currently inaccessible or experiencing DNS errors.`,
    solution: 'Restore DNS records, server hosting, and configure high-availability uptime monitoring.',
    roiImpact: 'Reclaims lost visitors and prevents total loss of digital sales leads.'
  };

  return {
    url,
    domain,
    auditedAt: new Date().toISOString(),
    statusCode: 0,
    isHttps: false,
    responseTimeMs: 0,
    score: 20,
    rating: 'Critical Attention',
    summary: `Website is currently unreachable (${errorMessage}). Immediate restoration needed.`,
    topWeakPoint: weakPoint,
    weakPoints: [weakPoint],
    metrics: {
      hasBookingWidget: false,
      hasChatWidget: false,
      hasTelLink: false,
      hasMailtoLink: false,
      hasClearCta: false,
      responseTimeMs: 0,
      pageTitle: 'Unreachable',
      metaDescriptionLength: 0,
      hasMobileViewport: false,
      hasSchema: false
    }
  };
}

export default {
  auditWebsite
};
