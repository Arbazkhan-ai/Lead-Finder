/**
 * Social Media Direct Message Inbox URL Generator & 1-Click Redirects
 * Redirects directly into recipient inbox (ig.me/m/, m.me/, wa.me, etc.)
 */

export function extractInstagramHandle(lead) {
  let handle = (lead.socials?.instagramHandle || '').replace(/^@/, '').trim();
  if (handle) return handle;

  const url = lead.socials?.instagram || lead.instagramUrl || '';
  if (!url) return '';

  const m = url.match(/instagram\.com\/([a-zA-Z0-9._]+)/i);
  if (m && m[1] && !['p', 'reel', 'stories', 'explore', 'direct'].includes(m[1].toLowerCase())) {
    return m[1];
  }
  return '';
}

export function extractFacebookUsername(lead) {
  const url = lead.socials?.facebook || lead.facebookUrl || '';
  if (!url || url.includes('/search/')) return '';

  const idMatch = url.match(/profile\.php\?id=(\d+)/i);
  if (idMatch && idMatch[1]) return idMatch[1];

  const pageMatch = url.match(/facebook\.com\/(?:pages\/[^/]+\/)?([a-zA-Z0-9._-]+)/i);
  if (pageMatch && pageMatch[1] && !['search', 'share', 'sharer', 'home', 'groups', 'events'].includes(pageMatch[1].toLowerCase())) {
    return pageMatch[1];
  }
  return '';
}

export function extractCleanPhone(lead) {
  const digits = (lead.phone || '').replace(/[^0-9]/g, '');
  if (!digits) return '';
  return digits.length === 10 ? `1${digits}` : digits;
}

export function getDirectInboxUrl(platform, lead = {}) {
  switch (platform) {
    case 'instagram': {
      const handle = extractInstagramHandle(lead);
      if (handle) {
        // ig.me/m/<username> is the official Meta direct deep-link to the user's DM inbox
        return `https://ig.me/m/${handle}`;
      }
      return lead.socials?.instagram || lead.instagramUrl || 'https://www.instagram.com/direct/inbox/';
    }
    case 'facebook': {
      const fbUser = extractFacebookUsername(lead);
      if (fbUser) {
        // m.me/<username> is the official Meta direct deep-link to Facebook Messenger inbox
        return `https://m.me/${fbUser}`;
      }
      return lead.socials?.facebook || lead.facebookUrl || 'https://www.facebook.com/messages/t/';
    }
    case 'whatsapp': {
      const waPhone = extractCleanPhone(lead);
      return waPhone ? `https://wa.me/${waPhone}` : 'https://wa.me/';
    }
    case 'linkedin': {
      const li = lead.socials?.linkedin || lead.linkedinPeopleUrl || lead.linkedinUrl || '';
      if (li.includes('/in/')) {
        return 'https://www.linkedin.com/messaging/thread/new/';
      }
      return 'https://www.linkedin.com/messaging/';
    }
    case 'twitter': {
      return 'https://x.com/messages';
    }
    default:
      return '#';
  }
}

export function getQuickPitch(platform, lead = {}) {
  const company = lead.company || 'your team';
  const category = lead.category || 'business';

  switch (platform) {
    case 'instagram':
      return `Hey! Love what you're doing with ${company}. Quick question—are you answering all inbound booking inquiries manually? We build custom AI intake agents that reply in under 30s and book qualified clients automatically. Open to a quick 2-min walkthrough video?`;
    case 'facebook':
      return `Hi there! I noticed your Facebook page for ${company}. Are you currently managing client inquiries and appointment bookings through Messenger manually? We deploy custom AI agents that reply instantly 24/7 to capture and qualify leads. Would you be open to a 3-minute demo?`;
    case 'whatsapp':
      return `Hi! Came across ${company} and noticed an opportunity to automate your customer intake and appointment scheduling 24/7 so inquiries never drop off. Would you be open to a quick 5-min demo this week?`;
    case 'linkedin':
      return `Hi! Came across your work at ${company}. We build turnkey AI workflows that automate client intake and qualification for ${category} teams. Would love to connect and share a quick architecture breakdown!`;
    default:
      return `Hi, I noticed ${company} and wanted to share how custom AI automation can help capture after-hours client inquiries 24/7. Open to a quick demo?`;
  }
}

export async function openSocialDirectMessage(platform, lead, onToast) {
  const url = getDirectInboxUrl(platform, lead);
  const pitch = getQuickPitch(platform, lead);

  // Auto-copy pitch to clipboard so user can instantly paste into the inbox
  if (navigator?.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(pitch);
    } catch (_) {}
  }

  const platformNames = {
    facebook: 'Facebook Messenger',
    instagram: 'Instagram DM',
    whatsapp: 'WhatsApp',
    linkedin: 'LinkedIn Messaging',
    twitter: 'X / Twitter DM'
  };

  const name = platformNames[platform] || platform;
  if (onToast) {
    onToast(`✓ Outreach pitch copied to clipboard! Opening ${name} inbox...`);
  }

  window.open(url, '_blank', 'noopener,noreferrer');
}
