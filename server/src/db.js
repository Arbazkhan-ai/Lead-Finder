import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const defaultSettings = {
  smtp: {
    host: 'smtp.gmail.com',
    port: 587,
    user: 'arbazkhanofficial@gmail.com',
    pass: '',
    fromName: 'Arbaz Khan',
    fromEmail: 'arbazkhanofficial@gmail.com',
    secure: false,
    simulatedMode: true // When true, emails are logged & simulated without requiring real SMTP credentials
  },
  ai: {
    provider: 'built_in', // 'built_in' | 'openai' | 'gemini'
    apiKey: '',
    businessName: 'Arbaz Khan — AI Systems & Engineering',
    senderName: 'Arbaz Khan',
    senderTitle: 'AI Engineer & Systems Architect',
    productService: 'Custom AI Solutions, LLM/LangChain Pipelines, Computer Vision & Intelligent Web Systems',
    pitchOffer: 'I build production-grade AI systems, intelligent automation pipelines, and custom ML solutions that solve high-impact business problems. You can explore my live portfolio and case studies here: https://arbazkhaan.vercel.app/',
    pricingModel: 'Project-Based & Retainers: Starting at $1,500. Special Offer: Free AI architectural audit & risk-free proof of concept.',
    bookingLink: 'https://arbazkhaan.vercel.app/#contact',
    portfolioUrl: 'https://arbazkhaan.vercel.app/',
    tone: 'persuasive_professional',
    autopilot: true,
    autoReplyDelaySeconds: 4
  },
  serpApiKey: '',
  googlePlacesApiKey: ''
};

const defaultLeads = [];
const defaultEmails = [];

class Database {
  constructor() {
    this.data = {
      leads: [],
      emails: [],
      settings: defaultSettings,
      activityLogs: []
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
        if (!this.data.settings) this.data.settings = defaultSettings;
        if (!this.data.activityLogs) this.data.activityLogs = [];
      } else {
        this.data = {
          leads: defaultLeads,
          emails: defaultEmails,
          settings: defaultSettings,
          activityLogs: [
            { id: uuidv4(), type: 'system', message: 'Platform initialized with demo leads and sample sales threads', timestamp: new Date().toISOString() }
          ]
        };
        this.save();
      }
    } catch (err) {
      console.error('Error loading database, resetting to default:', err);
      this.data = { leads: defaultLeads, emails: defaultEmails, settings: defaultSettings, activityLogs: [] };
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

  createLead(leadData) {
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
    this.logActivity('lead_created', `Added new lead: ${newLead.company} (${newLead.email || 'No email'})`, { leadId: newLead.id });
    this.save();
    return newLead;
  }

  bulkAddLeads(leadsList) {
    const added = [];
    for (const item of leadsList) {
      // Avoid duplicate by website or email if exists
      const existing = this.data.leads.find(l => 
        (item.email && l.email && l.email.toLowerCase() === item.email.toLowerCase()) ||
        (item.website && l.website && l.website.replace(/\/$/, '') === item.website.replace(/\/$/, ''))
      );
      if (!existing) {
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
      }
    }
    if (added.length > 0) {
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
