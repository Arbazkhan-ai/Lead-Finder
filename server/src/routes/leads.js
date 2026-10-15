import express from 'express';
import path from 'path';
import fs from 'fs';
import db from '../db.js';
import { searchLeads, scrapeWebsite, findRealEmailForLead, auditWebsite } from '../services/leadFinder.js';
import { isSameLead } from '../services/leadDeduplicator.js';
import {
  EXPORTS_DIR,
  generateLeadsExcelFile,
  generateSingleWebsiteExcelFile,
  listExportedExcelFiles,
  parseUploadedLeadsFile,
  parseExcelFileFromVault
} from '../services/excelExporter.js';
import { bulkAutoSendOutreach, sendEmail } from '../services/emailService.js';

const router = express.Router();

// GET /api/leads - List all leads with optional filter & search
router.get('/', (req, res) => {
  try {
    const { status, search } = req.query;
    const leads = db.getLeads({ status, search });
    res.json({ success: true, leads });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/leads/exports - List all generated Excel (.xlsx) files
router.get('/exports', (req, res) => {
  try {
    const files = listExportedExcelFiles();
    res.json({ success: true, exportsDir: EXPORTS_DIR, files });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/leads/exports/:fileName - Download a generated Excel (.xlsx) file
router.get('/exports/:fileName', (req, res) => {
  try {
    const safeName = path.basename(req.params.fileName);
    const fullPath = path.join(EXPORTS_DIR, safeName);
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ success: false, error: 'Excel file not found' });
    }
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);
    return res.sendFile(fullPath);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/leads/export-excel - Generate an Excel (.xlsx) file from provided leads or pipeline DB
router.post('/export-excel', (req, res) => {
  try {
    const { leads, query = 'pipeline_export', location = '' } = req.body || {};
    const targetLeads = Array.isArray(leads) && leads.length > 0 ? leads : db.getLeads({});
    if (!targetLeads || targetLeads.length === 0) {
      return res.status(400).json({ success: false, error: 'No leads available to export to Excel' });
    }
    const excelFile = generateLeadsExcelFile(targetLeads, { query, location });
    db.logActivity('excel_exported', `Exported ${targetLeads.length} leads to Excel: ${excelFile.fileName}`, {
      fileName: excelFile.fileName,
      filePath: excelFile.filePath,
      count: targetLeads.length
    });
    res.json({ success: true, excelFile });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/leads/:id - Single lead with full email thread
router.get('/:id', (req, res) => {
  try {
    const lead = db.getLeadById(req.params.id);
    if (!lead) {
      return res.status(404).json({ success: false, error: 'Lead not found' });
    }
    const thread = db.getEmailsForLead(lead.id);
    res.json({ success: true, lead, thread });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/leads - Add lead manually
router.post('/', (req, res) => {
  try {
    const newLead = db.createLead(req.body);
    res.json({ success: true, lead: newLead });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/leads/:id - Update lead details / status
router.put('/:id', (req, res) => {
  try {
    const updated = db.updateLead(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Lead not found' });
    }
    res.json({ success: true, lead: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/leads/:id - Delete lead
router.delete('/:id', (req, res) => {
  try {
    const success = db.deleteLead(req.params.id);
    res.json({ success });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/leads/history/stats - Stats on recorded generated leads and unique fingerprints
router.get('/history/stats', (req, res) => {
  try {
    const stats = db.getGeneratedHistoryStats();
    res.json({ success: true, stats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/leads/history/clear - Reset lead generation history so leads can be re-searched if needed
router.post('/history/clear', (req, res) => {
  try {
    const success = db.clearGeneratedHistory();
    res.json({ success });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/leads/deduplicate - Run full pipeline lead deduplication
router.post('/deduplicate', (req, res) => {
  try {
    const removedCount = db.deduplicateExistingLeads();
    res.json({ success: true, removedCount, remainingLeadsCount: db.getLeads().length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/leads/search - Search prospective businesses by keyword & location (Large dataset + Socials + auto Excel export)
router.post('/search', async (req, res) => {
  try {
    const {
      query,
      location,
      limit = 100,
      platforms = ['websites', 'facebook', 'instagram', 'linkedin'],
      excludeExisting = true,
      searchMode = 'auto'
    } = req.body;

    if (!query) {
      return res.status(400).json({ success: false, error: 'Query is required (e.g. "Dentists", "Marketing Agency")' });
    }

    const results = await searchLeads({
      query,
      location,
      limit,
      platforms,
      excludeExisting: Boolean(excludeExisting),
      searchMode
    });

    const skippedCount = results.skippedCount || 0;

    // Record freshly generated leads into persistent history so next time they are NOT generated again!
    if (results.length > 0) {
      db.recordGeneratedLeads(results, { query, location });
    }

    // Automatically generate Excel (.xlsx) file whenever data is scraped
    let excelFile = null;
    if (results.length > 0) {
      try {
        excelFile = generateLeadsExcelFile(results, { query, location });
        db.logActivity(
          'leads_scraped_excel',
          `Scraped ${results.length} new leads for "${query}" in "${location || 'All'}" (${skippedCount} duplicates filtered) & created Excel file: ${excelFile.fileName}`,
          {
            count: results.length,
            skippedCount,
            fileName: excelFile.fileName,
            filePath: excelFile.filePath
          }
        );
      } catch (excelErr) {
        console.warn('Excel generation warning:', excelErr.message);
      }
    }

    res.json({
      success: true,
      count: results.length,
      skippedCount,
      leads: results,
      excelFile
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/leads/scrape-domain - Deep scrape a single website URL + auto Excel export
router.post('/scrape-domain', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ success: false, error: 'URL is required' });
    }
    const scraped = await scrapeWebsite(url, { maxSubpages: 6 });

    let excelFile = null;
    try {
      excelFile = generateSingleWebsiteExcelFile(scraped);
      db.logActivity(
        'domain_scraped_excel',
        `Deep scraped ${scraped.url} & saved Excel report: ${excelFile.fileName}`,
        {
          url: scraped.url,
          fileName: excelFile.fileName,
          filePath: excelFile.filePath
        }
      );
    } catch (excelErr) {
      console.warn('Single domain Excel warning:', excelErr.message);
    }

    res.json({ success: true, data: scraped, excelFile });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/leads/audit-website - Run technical & conversion weak points audit on any URL
router.post('/audit-website', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ success: false, error: 'URL is required' });
    }
    const audit = await auditWebsite(url);
    res.json({ success: true, audit });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/leads/:id/audit-website - Run website audit for a specific lead and save results
router.post('/:id/audit-website', async (req, res) => {
  try {
    const lead = db.getLeadById(req.params.id);
    if (!lead) {
      return res.status(404).json({ success: false, error: 'Lead not found' });
    }

    const websiteUrl = lead.website || req.body.url;
    if (!websiteUrl) {
      return res.status(400).json({ success: false, error: `No website URL recorded for ${lead.company}` });
    }

    const audit = await auditWebsite(websiteUrl);
    const updatedLead = db.updateLead(lead.id, {
      websiteAudit: audit,
      website: lead.website || audit.url
    });

    db.logActivity('website_audited', `Audited website for ${lead.company} (Health Score: ${audit.score}/100, ${audit.weakPoints.length} weak points identified)`, {
      leadId: lead.id,
      score: audit.score,
      weakPointsCount: audit.weakPoints.length
    });

    res.json({ success: true, lead: updatedLead, audit });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/leads/find-email - Live hunter to discover real verified email for a lead
router.post('/find-email', async (req, res) => {
  try {
    const { leadId, company, website } = req.body;
    let targetCompany = company;
    let targetWebsite = website;

    let lead = null;
    if (leadId) {
      lead = db.getLeadById(leadId);
      if (lead) {
        targetCompany = targetCompany || lead.company;
        targetWebsite = targetWebsite || lead.website;
      }
    }

    const result = await findRealEmailForLead({ company: targetCompany, website: targetWebsite });

    if (result.email && leadId && lead) {
      db.updateLead(leadId, { email: result.email });
      db.logActivity('email_discovered', `Discovered real email for ${lead.company}: ${result.email} (${result.source})`, { leadId });
    }

    res.json({
      success: true,
      email: result.email,
      source: result.source,
      found: Boolean(result.email)
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/leads/bulk-add - Save selected search results into the leads pipeline
router.post('/bulk-add', (req, res) => {
  try {
    const { leads } = req.body;
    if (!Array.isArray(leads) || leads.length === 0) {
      return res.status(400).json({ success: false, error: 'Array of leads is required' });
    }
    const added = db.bulkAddLeads(leads);
    res.json({ success: true, count: added.length, leads: added });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Helper to process parsed leads from an uploaded file or vault file:
 * optionally enriches missing emails, saves to pipeline, and optionally dispatches emails
 */
async function processUploadedLeadsList(parsedLeads, options = {}) {
  const {
    fileName = 'uploaded_leads.xlsx',
    importToPipeline = true,
    enrichMissingEmails = false,
    autoSendAll = false,
    customSubject = '',
    customBody = ''
  } = options;

  // 1. Optional live email hunting for rows missing an email (capped at 15 concurrent/sequential to stay fast)
  if (enrichMissingEmails) {
    const missingRows = parsedLeads.filter(l => !l.email && (l.website || l.company)).slice(0, 15);
    await Promise.allSettled(
      missingRows.map(async (lead) => {
        try {
          const found = await findRealEmailForLead({ company: lead.company, website: lead.website });
          if (found?.email) {
            lead.email = found.email;
            lead.allEmails = Array.from(new Set([found.email, ...(lead.allEmails || [])]));
            lead.qualityScore = Math.max(lead.qualityScore || 70, 90);
          }
        } catch (_) {}
      })
    );
  }

  // 2. Save to pipeline DB so leads have persistent IDs for emailing & AI Closer Hub
  let savedLeads = parsedLeads;
  if (importToPipeline || autoSendAll) {
    const newlyAdded = db.bulkAddLeads(parsedLeads);
    // Match existing + newly added leads from DB so every uploaded row has an ID
    const allDbLeads = db.getLeads({});
    savedLeads = parsedLeads.map(p => {
      const match = newlyAdded.find(n => isSameLead(n, p)) || allDbLeads.find(d => isSameLead(d, p));
      if (match) {
        // Ensure email is updated if the uploaded file had an email and the existing DB lead didn't
        if (p.email && !match.email) {
          return db.updateLead(match.id, { email: p.email }) || { ...match, email: p.email };
        }
        return { ...p, ...match, email: p.email || match.email };
      }
      const created = db.createLead(p);
      return { ...p, ...created };
    });
  }

  db.logActivity(
    'scraper_file_uploaded',
    `Uploaded scraper file "${fileName}" with ${savedLeads.length} leads (${savedLeads.filter(l => l.email).length} with verified emails)`,
    { fileName, count: savedLeads.length }
  );

  // 3. Optional immediate email dispatch to all uploaded leads
  let autoSendReport = null;
  if (autoSendAll) {
    const useCustomTemplate = Boolean(customSubject.trim() && customBody.trim());
    if (useCustomTemplate) {
      const sentList = [];
      const errors = [];
      for (const lead of savedLeads) {
        try {
          let targetEmail = lead.email;
          if (!targetEmail && (lead.website || lead.company)) {
            const found = await findRealEmailForLead({ company: lead.company, website: lead.website });
            if (found?.email) {
              targetEmail = found.email;
              db.updateLead(lead.id, { email: targetEmail });
              lead.email = targetEmail;
            }
          }
          if (!targetEmail) {
            errors.push({ company: lead.company, error: 'No email found for this lead' });
            continue;
          }

          const firstName = (lead.name && !lead.name.toLowerCase().includes('owner') && !lead.name.toLowerCase().includes('decision'))
            ? lead.name.split(' ')[0]
            : 'there';

          const replaceTags = (str) =>
            str
              .replace(/\{company\}/gi, lead.company || 'your team')
              .replace(/\{firstName\}/gi, firstName)
              .replace(/\{name\}/gi, lead.name || 'there')
              .replace(/\{website\}/gi, lead.website || 'your website')
              .replace(/\{category\}/gi, lead.category || 'your industry');

          const finalSubject = replaceTags(customSubject);
          const finalBody = replaceTags(customBody);

          const emailRec = await sendEmail({
            leadId: lead.id,
            subject: finalSubject,
            body: finalBody,
            aiGenerated: false,
            toEmail: targetEmail
          });
          db.updateLead(lead.id, { status: 'contacted', lastContactedAt: new Date().toISOString() });
          lead.status = 'contacted';
          sentList.push({ email: emailRec, lead });
        } catch (err) {
          errors.push({ company: lead.company, error: err.message });
        }
      }
      autoSendReport = {
        count: sentList.length,
        sent: sentList,
        errors
      };
    } else {
      autoSendReport = await bulkAutoSendOutreach({ leads: savedLeads });
    }
  }

  return {
    fileName,
    totalParsed: savedLeads.length,
    withEmailCount: savedLeads.filter(l => Boolean(l.email)).length,
    leads: savedLeads,
    autoSendReport
  };
}

// POST /api/leads/upload-file - Manually upload a scraped Excel (.xlsx/.xls) or CSV (.csv) file to import & email leads
router.post('/upload-file', async (req, res) => {
  try {
    const {
      fileName = 'uploaded_leads.xlsx',
      fileDataBase64,
      importToPipeline = true,
      enrichMissingEmails = false,
      autoSendAll = false,
      customSubject = '',
      customBody = ''
    } = req.body || {};

    if (!fileDataBase64) {
      return res.status(400).json({ success: false, error: 'Please select an Excel (.xlsx/.xls) or CSV (.csv) file to upload' });
    }

    const parsedLeads = parseUploadedLeadsFile(fileDataBase64, fileName);
    if (!parsedLeads || parsedLeads.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid lead rows found in the uploaded file. Ensure it has columns like Company Name, Email, or Website.'
      });
    }

    const result = await processUploadedLeadsList(parsedLeads, {
      fileName,
      importToPipeline,
      enrichMissingEmails,
      autoSendAll,
      customSubject,
      customBody
    });

    res.json({
      success: true,
      ...result
    });
  } catch (err) {
    console.error('Upload scraper file error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/leads/load-export - Load a saved Excel file from the Vault to import & email leads
router.post('/load-export', async (req, res) => {
  try {
    const {
      fileName,
      importToPipeline = true,
      enrichMissingEmails = false,
      autoSendAll = false,
      customSubject = '',
      customBody = ''
    } = req.body || {};

    if (!fileName) {
      return res.status(400).json({ success: false, error: 'fileName is required' });
    }

    const parsedLeads = parseExcelFileFromVault(fileName);
    if (!parsedLeads || parsedLeads.length === 0) {
      return res.status(400).json({ success: false, error: 'No leads found in that Excel file' });
    }

    const result = await processUploadedLeadsList(parsedLeads, {
      fileName,
      importToPipeline,
      enrichMissingEmails,
      autoSendAll,
      customSubject,
      customBody
    });

    res.json({
      success: true,
      ...result
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;

