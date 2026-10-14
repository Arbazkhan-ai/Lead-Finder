import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { getLeadFingerprints, isSameLead, mergeLeadInfo } from './services/leadDeduplicator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOCAL_DATA_DIR = path.join(__dirname, '..', 'data');
const SEED_DB_FILE = path.join(LOCAL_DATA_DIR, 'database.json');
const DATA_DIR = process.env.VERCEL ? path.join('/tmp', 'data') : LOCAL_DATA_DIR;
const DB_FILE = path.join(DATA_DIR, 'database.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// On Vercel, seed DB from repository if /tmp/data/database.json doesn't exist yet
if (process.env.VERCEL && !fs.existsSync(DB_FILE) && fs.existsSync(SEED_DB_FILE)) {
  try {
    fs.copyFileSync(SEED_DB_FILE, DB_FILE);
  } catch (err) {
    console.warn('Could not seed database file to /tmp:', err);
  }
}

const defaultSettings = {
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 587,
    user: process.env.SMTP_USER || 'arbazkhanofficial140@gmail.com',
    pass: process.env.SMTP_PASS || '',
    fromName: process.env.SMTP_FROM_NAME || 'Arbaz Khan',
    fromEmail: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || 'arbazkhanofficial140@gmail.com',
    secure: process.env.SMTP_SECURE === 'true',
    simulatedMode: process.env.SMTP_SIMULATED_MODE !== undefined 
      ? process.env.SMTP_SIMULATED_MODE === 'true' 
      : (process.env.SMTP_PASS ? false : true)
  },
  ai: {
    provider: process.env.AI_PROVIDER || 'built_in', // 'built_in' | 'openai' | 'gemini'
    apiKey: process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY || process.env.AI_API_KEY || '',
    businessName: process.env.BUSINESS_NAME || 'Arbaz Khan — AI Systems & Engineering',
    senderName: process.env.SENDER_NAME || 'Arbaz Khan',
    senderTitle: process.env.SENDER_TITLE || 'AI Engineer & Systems Architect',
    productService: process.env.PRODUCT_SERVICE || 'Custom AI Solutions, LLM/LangChain Pipelines, Computer Vision & Intelligent Web Systems',
    pitchOffer: process.env.PITCH_OFFER || 'I build production-grade AI systems, intelligent automation pipelines, and custom ML solutions that solve high-impact business problems. You can explore my live portfolio and case studies here: https://arbazkhaan.vercel.app/',
    pricingModel: process.env.PRICING_MODEL || 'Project-Based & Retainers: Starting at $1,500. Special Offer: Free AI architectural audit & risk-free proof of concept.',
    bookingLink: process.env.BOOKING_LINK || 'https://arbazkhaan.vercel.app/#contact',
    portfolioUrl: process.env.PORTFOLIO_URL || 'https://arbazkhaan.vercel.app/',
    tone: 'persuasive_professional',
    autopilot: true,
    autoReplyDelaySeconds: 4
  },
  serpApiKey: process.env.SERP_API_KEY || '',
  googlePlacesApiKey: process.env.GOOGLE_PLACES_API_KEY || ''
};

const defaultLeads = [];
const defaultEmails = [];

class Database {
  constructor() {
    this.data = {
      leads: [],
      emails: [],
      settings: defaultSettings,
      activityLogs: [],
      generatedLeadsHistory: []
    };
    this.init();
  }

  init() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(raw);
        // Ensure keys exist
        if (!this.data.leads) this.data.leads = defaultLeads;
        if (!this.data.emails) this.data.emails = defaultEmails;
        if (!this.data.settings) {
          this.data.settings = defaultSettings;
        } else {
          if (process.env.SMTP_PASS && !this.data.settings.smtp?.pass) {
            if (!this.data.settings.smtp) this.data.settings.smtp = {};
            this.data.settings.smtp.pass = process.env.SMTP_PASS;
            this.data.settings.smtp.simulatedMode = false;
          }
          if (process.env.SERP_API_KEY && !this.data.settings.serpApiKey) {
            this.data.settings.serpApiKey = process.env.SERP_API_KEY;
          }
          if (process.env.GOOGLE_PLACES_API_KEY && !this.data.settings.googlePlacesApiKey) {
            this.data.settings.googlePlacesApiKey = process.env.GOOGLE_PLACES_API_KEY;
          }
        }
        if (!this.data.activityLogs) this.data.activityLogs = [];
        if (!this.data.generatedLeadsHistory) this.data.generatedLeadsHistory = [];
      } else {
        this.data = {
          leads: defaultLeads,
          emails: defaultEmails,
          settings: defaultSettings,
          activityLogs: [
            { id: uuidv4(), type: 'system', message: 'Platform initialized with demo leads and sample sales threads', timestamp: new Date().toISOString() }
          ],
          generatedLeadsHistory: []
        };
        this.save();
      }

      // Automatically deduplicate existing leads to eliminate past duplicate generations
      this.deduplicateExistingLeads();
    } catch (err) {
      console.error('Error loading database, resetting to default:', err);
      this.data = { leads: defaultLeads, emails: defaultEmails, settings: defaultSettings, activityLogs: [], generatedLeadsHistory: [] };
      this.save();
    }
  }

  save() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving database:', err);
    }
  }

  logActivity(type, message, meta = {}) {
    const log = {
      id: uuidv4(),
      type,
      message,
      meta,
      timestamp: new Date().toISOString()
    };
    this.data.activityLogs.unshift(log);
    if (this.data.activityLogs.length > 200) {
      this.data.activityLogs = this.data.activityLogs.slice(0, 200);
    }
    this.save();
    return log;
  }

  // Leads
  getLeads(filter = {}) {
    let result = [...this.data.leads];
    if (filter.status && filter.status !== 'all') {
      result = result.filter(l => l.status === filter.status);
    }
    if (filter.search) {
      const q = filter.search.toLowerCase();
      result = result.filter(l =>
        (l.name && l.name.toLowerCase().includes(q)) ||
        (l.company && l.company.toLowerCase().includes(q)) ||
        (l.email && l.email.toLowerCase().includes(q)) ||
        (l.website && l.website.toLowerCase().includes(q)) ||
        (l.category && l.category.toLowerCase().includes(q))
      );
    }
    // Sort by updatedAt desc
    return result.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
  }

  getLeadById(id) {
    return this.data.leads.find(l => l.id === id);
  }

  getAllExistingFingerprints() {
    const prints = new Set();
    // From all active pipeline leads
    for (const lead of this.data.leads || []) {
      for (const p of getLeadFingerprints(lead)) {
        prints.add(p);
      }
    }
    // From all previously generated leads history
    for (const item of this.data.generatedLeadsHistory || []) {
      if (Array.isArray(item.fingerprints)) {
        for (const p of item.fingerprints) {
          prints.add(p);
        }
      } else {
        for (const p of getLeadFingerprints(item)) {
          prints.add(p);
        }
      }
    }
    return prints;
  }

  findLeadByFingerprints(leadData) {
    if (!leadData) return null;
    if (leadData.id) {
      const byId = this.data.leads.find(l => l.id === leadData.id);
      if (byId) return byId;
    }
    const targetPrints = getLeadFingerprints(leadData);
    if (targetPrints.size === 0) return null;

    for (const lead of this.data.leads) {
      const existingPrints = getLeadFingerprints(lead);
      for (const p of targetPrints) {
        if (existingPrints.has(p)) return lead;
      }
    }
    return null;
  }

  recordGeneratedLeads(leadsList, meta = {}) {
    if (!Array.isArray(leadsList) || leadsList.length === 0) return 0;
    if (!this.data.generatedLeadsHistory) this.data.generatedLeadsHistory = [];

    const existingPrints = this.getAllExistingFingerprints();
    let recordedCount = 0;

    for (const lead of leadsList) {
      const prints = Array.from(getLeadFingerprints(lead));
      if (prints.length === 0) continue;

      const alreadyHas = prints.some(p => existingPrints.has(p));
      if (!alreadyHas) {
        this.data.generatedLeadsHistory.unshift({
          company: lead.company || '',
          website: lead.website || '',
          email: lead.email || '',
          phone: lead.phone || '',
          address: lead.address || '',
          category: lead.category || '',
          fingerprints: prints,
          generatedAt: new Date().toISOString(),
          query: meta.query || '',
          location: meta.location || ''
        });
        prints.forEach(p => existingPrints.add(p));
        recordedCount++;
      }
    }

    if (this.data.generatedLeadsHistory.length > 10000) {
      this.data.generatedLeadsHistory = this.data.generatedLeadsHistory.slice(0, 10000);
    }

    if (recordedCount > 0) {
      this.save();
    }
    return recordedCount;
  }

  clearGeneratedHistory() {
    const prevCount = this.data.generatedLeadsHistory ? this.data.generatedLeadsHistory.length : 0;
    this.data.generatedLeadsHistory = [];
    this.logActivity('history_cleared', `Cleared lead generation history (${prevCount} records reset)`);
    this.save();
    return true;
  }

  getGeneratedHistoryStats() {
    const totalGenerated = (this.data.generatedLeadsHistory || []).length;
    const pipelineLeads = (this.data.leads || []).length;
    const totalUniqueFingerprints = this.getAllExistingFingerprints().size;
    return {
      totalGeneratedHistory: totalGenerated,
      pipelineLeadsCount: pipelineLeads,
      totalUniqueFingerprints
    };
  }

  deduplicateExistingLeads() {
    if (!Array.isArray(this.data.leads) || this.data.leads.length <= 1) return 0;
    const uniqueLeads = [];
    const seenPrints = new Set();
    let removedCount = 0;

    for (const lead of this.data.leads) {
      const prints = getLeadFingerprints(lead);
      let match = null;

      for (const p of prints) {
        if (seenPrints.has(p)) {
          match = uniqueLeads.find(u => getLeadFingerprints(u).has(p));
          if (match) break;
        }
      }

      if (match) {
        mergeLeadInfo(match, lead);
        if (Array.isArray(this.data.emails)) {
          for (const em of this.data.emails) {
            if (em.leadId === lead.id) {
              em.leadId = match.id;
            }
          }
        }
        removedCount++;
      } else {
        prints.forEach(p => seenPrints.add(p));
        uniqueLeads.push(lead);
      }
    }

    if (removedCount > 0) {
      this.data.leads = uniqueLeads;
      this.save();
    }
    return removedCount;
  }

  createLead(leadData) {
    // Deduplication check: return and merge with existing lead if already present
    const existing = this.findLeadByFingerprints(leadData);
    if (existing) {
      mergeLeadInfo(existing, leadData);
      existing.updatedAt = new Date().toISOString();
      this.save();
      return existing;
    }

    const newLead = {
      id: uuidv4(),
      name: leadData.name || 'Business Owner',
      company: leadData.company || 'Prospective Client',
      email: leadData.email || '',
      phone: leadData.phone || '',
      website: leadData.website || '',
      address: leadData.address || '',
      category: leadData.category || 'General Business',
      source: leadData.source || 'Manual Entry',
      status: leadData.status || 'new',
      tags: leadData.tags || ['Discovered'],
      notes: leadData.notes || '',
      dealValue: leadData.dealValue || 1000,
      websiteAudit: leadData.websiteAudit || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastContactedAt: null,
      lastReplyAt: null
    };
    this.data.leads.unshift(newLead);
    this.recordGeneratedLeads([newLead], { query: 'pipeline_create' });
    this.logActivity('lead_created', `Added new lead: ${newLead.company} (${newLead.email || 'No email'})`, { leadId: newLead.id });
    this.save();
    return newLead;
  }

  bulkAddLeads(leadsList) {
    const added = [];
    const batchPrints = new Set();
    const existingPrints = this.getAllExistingFingerprints();

    for (const item of leadsList) {
      const itemPrints = getLeadFingerprints(item);
      const isDuplicate = Array.from(itemPrints).some(p => existingPrints.has(p) || batchPrints.has(p));

      if (!isDuplicate) {
        const newLead = {
          id: uuidv4(),
          name: item.name || 'Owner / Representative',
          company: item.company || 'Business Contact',
          email: item.email || '',
          phone: item.phone || '',
          website: item.website || '',
          address: item.address || '',
          category: item.category || 'Discovered Lead',
          source: item.source || 'Scraper Search',
          status: 'new',
          tags: item.tags || ['Scraped'],
          notes: item.notes || `Discovered via automated search.`,
          dealValue: item.dealValue || 1200,
          websiteAudit: item.websiteAudit || null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          lastContactedAt: null,
          lastReplyAt: null
        };
        this.data.leads.unshift(newLead);
        added.push(newLead);
        itemPrints.forEach(p => {
          batchPrints.add(p);
          existingPrints.add(p);
        });
      }
    }
    if (added.length > 0) {
      this.recordGeneratedLeads(added, { query: 'bulk_import' });
      this.logActivity('bulk_leads', `Successfully added ${added.length} new prospective leads`);
      this.save();
    }
    return added;
  }

  updateLead(id, updates) {
    const idx = this.data.leads.findIndex(l => l.id === id);
    if (idx === -1) return null;
    this.data.leads[idx] = {
      ...this.data.leads[idx],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this.save();
    return this.data.leads[idx];
  }

  deleteLead(id) {
    const idx = this.data.leads.findIndex(l => l.id === id);
    if (idx === -1) return false;
    const lead = this.data.leads[idx];
    this.data.leads.splice(idx, 1);
    // Also remove associated emails
    this.data.emails = this.data.emails.filter(e => e.leadId !== id);
    this.logActivity('lead_deleted', `Deleted lead ${lead.company}`);
    this.save();
    return true;
  }

  // Emails & Conversation Thread
  getEmailsForLead(leadId) {
    return this.data.emails
      .filter(e => e.leadId === leadId)
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  }

  addEmail(emailData) {
    const email = {
      id: uuidv4(),
      leadId: emailData.leadId,
      direction: emailData.direction, // 'outbound' | 'inbound'
      from: emailData.from || '',
      to: emailData.to || '',
      subject: emailData.subject || 'Follow up',
      body: emailData.body,
      status: emailData.status || 'sent',
      aiGenerated: !!emailData.aiGenerated,
      sentiment: emailData.sentiment || null,
      intent: emailData.intent || null,
      createdAt: new Date().toISOString()
    };
    this.data.emails.push(email);

    // Update lead contact dates
    const lead = this.getLeadById(emailData.leadId);
    if (lead) {
      const updates = { updatedAt: new Date().toISOString() };
      if (email.direction === 'outbound') {
        updates.lastContactedAt = email.createdAt;
        if (lead.status === 'new') {
          updates.status = 'contacted';
        }
      } else if (email.direction === 'inbound') {
        updates.lastReplyAt = email.createdAt;
        if (['new', 'contacted'].includes(lead.status)) {
          updates.status = 'replied';
        }
      }
      this.updateLead(lead.id, updates);
    }

    this.save();
    return email;
  }

  // Settings
  getSettings() {
    return this.data.settings;
  }

  updateSettings(updates) {
    this.data.settings = {
      ...this.data.settings,
      ...updates,
      smtp: { ...this.data.settings.smtp, ...(updates.smtp || {}) },
      ai: { ...this.data.settings.ai, ...(updates.ai || {}) }
    };
    this.logActivity('settings_updated', 'Updated platform configuration and AI settings');
    this.save();
    return this.data.settings;
  }

  // Analytics Stats
  getStats() {
    const totalLeads = this.data.leads.length;
    const contacted = this.data.leads.filter(l => ['contacted', 'replied', 'negotiating', 'closed_won'].includes(l.status)).length;
    const replied = this.data.leads.filter(l => ['replied', 'negotiating', 'closed_won'].includes(l.status)).length;
    const negotiating = this.data.leads.filter(l => l.status === 'negotiating').length;
    const closedWon = this.data.leads.filter(l => l.status === 'closed_won').length;
    const closedLost = this.data.leads.filter(l => l.status === 'closed_lost').length;
    const totalRevenueWon = this.data.leads
      .filter(l => l.status === 'closed_won')
      .reduce((sum, l) => sum + (l.dealValue || 1000), 0);

    const replyRate = contacted > 0 ? Math.round((replied / contacted) * 100) : 0;
    const closeRate = replied > 0 ? Math.round((closedWon / replied) * 100) : 0;

    return {
      totalLeads,
      contacted,
      replied,
      negotiating,
      closedWon,
      closedLost,
      replyRate,
      closeRate,
      totalRevenueWon,
      pipelineBreakdown: {
        new: this.data.leads.filter(l => l.status === 'new').length,
        contacted: this.data.leads.filter(l => l.status === 'contacted').length,
        replied: this.data.leads.filter(l => l.status === 'replied').length,
        negotiating: this.data.leads.filter(l => l.status === 'negotiating').length,
        closed_won: closedWon,
        closed_lost: closedLost
      },
      recentLogs: this.data.activityLogs.slice(0, 15)
    };
  }
}

export const db = new Database();
export default db;
