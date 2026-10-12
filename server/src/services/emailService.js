import nodemailer from 'nodemailer';
import db from '../db.js';
import { analyzeClientReply, generateAiReply, generateInitialOutreach } from './aiNegotiator.js';
import { findRealEmailForLead } from './leadFinder.js';

let transporter = null;

function getTransporter() {
  const settings = db.getSettings();
  const smtp = settings.smtp || {};

  if (smtp.simulatedMode || !smtp.user || !smtp.pass) {
    return null; // Using simulation mode
  }

  return nodemailer.createTransport({
    host: smtp.host || 'smtp.gmail.com',
    port: Number(smtp.port) || 587,
    secure: !!smtp.secure,
    auth: {
      user: smtp.user,
      pass: smtp.pass
    }
  });
}

/**
 * Escape HTML special characters safely
 */
function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Convert plain-text outreach body into a clean, high-deliverability HTML email with clickable links & executive signature CTA
 */
export function buildHtmlEmail({ body = '', senderName = 'Arbaz Khan', senderTitle = 'AI Engineer & Systems Architect', businessName = 'Arbaz Khan — AI Systems & Engineering', senderEmail = 'arbazkhanofficial@gmail.com', portfolioUrl = 'https://arbazkhaan.vercel.app/', bookingLink = 'https://arbazkhaan.vercel.app/#contact' }) {
  const lines = String(body || '').split('\n');
  const htmlBlocks = [];

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed) {
      htmlBlocks.push('<div style="height: 10px;"></div>');
      continue;
    }

    // Highlight section headers like THE PROBLEM:, THE SOLUTION:, HOW WE HELP & ROI:, THE FIX:
    if (/^(THE PROBLEM|THE SOLUTION|THE FIX|HOW WE HELP.*|KEY BOTTLENECKS.*):$/i.test(trimmed)) {
      htmlBlocks.push(
        `<div style="margin-top:14px;margin-bottom:4px;font-size:11px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:#0284c7;">${escapeHtml(trimmed)}</div>`
      );
      continue;
    }

    // Format numbered/bulleted findings or callouts
    let escaped = escapeHtml(rawLine);
    // Auto-link URLs
    escaped = escaped.replace(
      /(https?:\/\/[^\s<)]+)/gi,
      (url) => `<a href="${url}" target="_blank" style="color:#0284c7;font-weight:600;text-decoration:underline;">${url}</a>`
    );

    if (/^(\d+\.\s*❌|⚠️|💡|🚀|👉|📅|•|-)/.test(trimmed)) {
      htmlBlocks.push(
        `<div style="padding:6px 12px;margin:4px 0;background:#f8fafc;border-left:3px solid #0ea5e9;border-radius:4px;font-size:14px;line-height:1.55;color:#0f172a;">${escaped}</div>`
      );
    } else {
      htmlBlocks.push(
        `<p style="margin:0 0 6px 0;font-size:14.5px;line-height:1.6;color:#1e293b;">${escaped}</p>`
      );
    }
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:20px;background-color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1e293b;">
  <div style="max-width:620px;margin:0 auto;">
    ${htmlBlocks.join('\n')}
    <div style="margin-top:22px;padding-top:16px;border-top:1px solid #e2e8f0;">
      <table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
        <tr>
          <td style="padding-right:12px;">
            <a href="${bookingLink}" target="_blank" style="display:inline-block;padding:10px 18px;background:linear-gradient(135deg,#0284c7,#2563eb);color:#ffffff;font-size:13px;font-weight:700;text-decoration:none;border-radius:8px;">
              📅 Book a 10-Min Walkthrough
            </a>
          </td>
          <td>
            <a href="${portfolioUrl}" target="_blank" style="display:inline-block;padding:10px 16px;background:#f1f5f9;color:#0f172a;font-size:13px;font-weight:600;text-decoration:none;border-radius:8px;border:1px solid #cbd5e1;">
              🌐 View AI Portfolio &amp; Case Studies
            </a>
          </td>
        </tr>
      </table>
      <div style="margin-top:12px;font-size:12px;color:#64748b;">
        <strong style="color:#0f172a;">${escapeHtml(senderName)}</strong> • ${escapeHtml(senderTitle)}<br/>
        <span>${escapeHtml(businessName)}</span> • <a href="mailto:${escapeHtml(senderEmail)}" style="color:#0284c7;text-decoration:none;">${escapeHtml(senderEmail)}</a>
      </div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Send outbound email to a lead with strict validation, multi-recipient CC support, and dual HTML + Plain-Text delivery
 */
export async function sendEmail({ leadId, subject, body, aiGenerated = false, toEmail = null, ccEmails = [] }) {
  const lead = db.getLeadById(leadId);
  if (!lead) {
    throw new Error(`Lead with ID ${leadId} not found`);
  }

  const settings = db.getSettings();
  const smtp = settings.smtp || {};
  const aiConfig = settings.ai || {};

  // Resolve target email
  const targetEmail = (toEmail || lead.email || '').trim();
  if (!targetEmail) {
    throw new Error(`Recipient email address not found for "${lead.company}". Please enter a valid email or click "Find Real Email".`);
  }

  // Strict email format validation
  const validEmailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,10}$/;
  if (!validEmailRegex.test(targetEmail)) {
    throw new Error(`Invalid email address format: "${targetEmail}". Please verify the address before sending.`);
  }

  // Validate optional CC emails
  const validCcList = Array.isArray(ccEmails)
    ? ccEmails.map(e => String(e || '').trim()).filter(e => e && e !== targetEmail && validEmailRegex.test(e))
    : [];

  // If toEmail was specified and differs from lead's existing email, update lead record
  if (targetEmail !== lead.email) {
    db.updateLead(lead.id, { email: targetEmail });
    lead.email = targetEmail;
  }

  const senderName = smtp.fromName || aiConfig.senderName || 'Arbaz Khan';
  const senderEmail = smtp.fromEmail || smtp.user || 'arbazkhanofficial@gmail.com';
  const fromHeader = `"${senderName}" <${senderEmail}>`;
  const toHeader = validCcList.length > 0 ? `${targetEmail} (CC: ${validCcList.join(', ')})` : targetEmail;

  const htmlBody = buildHtmlEmail({
    body,
    senderName,
    senderTitle: aiConfig.senderTitle || 'AI Engineer & Systems Architect',
    businessName: aiConfig.businessName || 'Arbaz Khan — AI Systems & Engineering',
    senderEmail,
    portfolioUrl: aiConfig.portfolioUrl || 'https://arbazkhaan.vercel.app/',
    bookingLink: aiConfig.bookingLink || 'https://arbazkhaan.vercel.app/#contact'
  });

  let sendStatus = 'sent';

  if (!smtp.simulatedMode && smtp.user && smtp.pass && targetEmail) {
    try {
      const mailClient = getTransporter();
      if (mailClient) {
        await mailClient.sendMail({
          from: fromHeader,
          to: targetEmail,
          cc: validCcList.length > 0 ? validCcList.join(', ') : undefined,
          replyTo: senderEmail,
          // BCC yourself so the email shows directly in your Gmail Inbox as well as Sent Mail
          bcc: senderEmail,
          subject: subject,
          text: body,
          html: htmlBody
        });
      }
    } catch (err) {
      console.error('SMTP send error:', err.message);
      db.logActivity('email_delivery_failed', `Failed to send to ${targetEmail}: ${err.message}`, { leadId: lead.id });
      throw new Error(`Mail Server Error: ${err.message} (Recipient address "${targetEmail}" may not exist or was rejected).`);
    }
  }

  // Store in database with full From: and To: email addresses
  const emailRecord = db.addEmail({
    leadId: lead.id,
    direction: 'outbound',
    from: fromHeader,
    to: toHeader,
    subject: subject,
    body: body,
    status: sendStatus,
    aiGenerated: aiGenerated
  });

  db.logActivity('email_sent', `Sent outreach email to ${lead.company} (To: ${toHeader})`, {
    leadId: lead.id,
    emailId: emailRecord.id
  });

  return emailRecord;
}

/**
 * Receive an incoming reply from a lead (via Webhook, IMAP, or Simulation UI)
 */
export async function receiveInboundEmail({ leadId, replyText, subject = null }) {
  const lead = db.getLeadById(leadId);
  if (!lead) {
    throw new Error(`Lead with ID ${leadId} not found`);
  }

  const settings = db.getSettings();

  // 1. Analyze the client's intent and sentiment
  const analysis = analyzeClientReply(replyText);

  const senderEmail = settings.smtp?.fromEmail || settings.smtp?.user || 'arbazkhanofficial@gmail.com';
  const myAddress = `"${settings.smtp?.fromName || 'Arbaz Khan'}" <${senderEmail}>`;
  const leadAddress = lead.email ? `"${lead.name || lead.company}" <${lead.email}>` : `${lead.company}`;

  // 2. Store incoming reply
  const inboundEmail = db.addEmail({
    leadId: lead.id,
    direction: 'inbound',
    from: leadAddress,
    to: myAddress,
    subject: subject || `Re: Discussion with ${lead.company}`,
    body: replyText,
    status: 'received',
    aiGenerated: false,
    sentiment: analysis.sentiment,
    intent: analysis.intent
  });

  // 3. Update lead status to reflect negotiation stage
  db.updateLead(lead.id, {
    status: analysis.suggestedNextStatus,
    lastReplyAt: new Date().toISOString(),
    notes: `${lead.notes ? lead.notes + '\n' : ''}[${new Date().toLocaleTimeString()}] ${analysis.summary}`
  });

  db.logActivity('reply_received', `Received reply from ${lead.company}: "${replyText.slice(0, 60)}..."`, {
    leadId: lead.id,
    intent: analysis.intent
  });

  let aiFollowupEmail = null;

  // 4. Autonomous AI Closing Loop: If client did not say "not interested", and autopilot is enabled
  if (analysis.intent !== 'not_interested' && settings.ai?.autopilot) {
    const thread = db.getEmailsForLead(lead.id);
    const updatedLead = db.getLeadById(lead.id);

    // Generate smart counter-reply / closing pitch
    const aiResponse = await generateAiReply({
      lead: updatedLead,
      thread: thread,
      clientReplyText: replyText
    });

    const smtp = settings.smtp || {};
    const aiConfig = settings.ai || {};
    // Dispatch via SMTP if live mode enabled
    if (!smtp.simulatedMode && smtp.user && smtp.pass && lead.email) {
      try {
        const mailClient = getTransporter();
        if (mailClient) {
          await mailClient.sendMail({
            from: myAddress,
            to: lead.email,
            replyTo: senderEmail,
            bcc: senderEmail,
            subject: aiResponse.subject,
            text: aiResponse.body,
            html: buildHtmlEmail({
              body: aiResponse.body,
              senderName: smtp.fromName || aiConfig.senderName || 'Arbaz Khan',
              senderTitle: aiConfig.senderTitle || 'AI Engineer & Systems Architect',
              businessName: aiConfig.businessName || 'Arbaz Khan — AI Systems & Engineering',
              senderEmail,
              portfolioUrl: aiConfig.portfolioUrl || 'https://arbazkhaan.vercel.app/',
              bookingLink: aiConfig.bookingLink || 'https://arbazkhaan.vercel.app/#contact'
            })
          });
        }
      } catch (err) {
        console.error('SMTP AI send error:', err.message);
      }
    }

    // Save and send outbound reply
    aiFollowupEmail = db.addEmail({
      leadId: lead.id,
      direction: 'outbound',
      from: myAddress,
      to: leadAddress,
      subject: aiResponse.subject,
      body: aiResponse.body,
      status: 'sent',
      aiGenerated: true
    });

    db.logActivity('ai_negotiator', `AI Auto-Responder countered: ${aiResponse.closingAction} for ${lead.company}`, {
      leadId: lead.id,
      intent: analysis.intent,
      action: aiResponse.closingAction
    });

    // If client was ready to close or meeting booked, mark as Closed Won
    if (analysis.intent === 'ready_to_close') {
      db.updateLead(lead.id, {
        status: 'closed_won'
      });
      db.logActivity('deal_closed', `🎉 DEAL CLOSED! ${lead.company} confirmed agreement ($${lead.dealValue || 1200})`, {
        leadId: lead.id,
        value: lead.dealValue || 1200
      });
    }
  }

  return {
    inboundEmail,
    aiFollowupEmail,
    analysis,
    updatedLead: db.getLeadById(lead.id)
  };
}

/**
 * Autonomous 1-Click Auto-Send:
 * Dispatches only to real, verified emails. Never invents fake domains.
 */
export async function autoSendOutreach({ leadId, toEmail = null, skipEmailHunt = false, tone = null, ccAllEmails = false }) {
  let lead = db.getLeadById(leadId);
  if (!lead) {
    throw new Error(`Lead with ID ${leadId} not found`);
  }

  // Auto-resolve recipient email
  let targetEmail = (toEmail || lead.email || (Array.isArray(lead.allEmails) && lead.allEmails[0]) || '').trim();
  if (!targetEmail && !skipEmailHunt && (lead.website || lead.company)) {
    try {
      const found = await findRealEmailForLead({ company: lead.company, website: lead.website });
      if (found.email) {
        targetEmail = found.email;
        db.updateLead(lead.id, { email: targetEmail });
        lead.email = targetEmail;
      }
    } catch (_) {}
  }

  // NEVER invent fake emails
  if (!targetEmail) {
    throw new Error(`No verified email found for "${lead.company}". Please enter their email or click "Find Real Email" to discover one.`);
  }

  // Choose the highest-converting tone automatically if not specified
  const bestTone = tone || (lead.websiteAudit?.weakPoints?.length > 0 ? 'website_audit' : 'problem_solution');

  // Auto-generate tailored pitch based on business name, niche, socials & website audit
  const pitch = generateInitialOutreach({ lead, tone: bestTone });

  const ccList = ccAllEmails && Array.isArray(lead.allEmails)
    ? lead.allEmails.filter(e => e && e !== targetEmail)
    : [];

  // Send email
  const emailRecord = await sendEmail({
    leadId: lead.id,
    subject: pitch.subject,
    body: pitch.body,
    aiGenerated: true,
    toEmail: targetEmail,
    ccEmails: ccList
  });

  // Update lead status to contacted
  const updatedLead = db.updateLead(lead.id, {
    status: 'contacted',
    lastContactedAt: new Date().toISOString()
  });

  db.logActivity('auto_sent_outreach', `⚡ Auto-Sent cold outreach to ${lead.company} (To: ${targetEmail})`, {
    leadId: lead.id,
    emailId: emailRecord.id
  });

  return {
    email: emailRecord,
    lead: updatedLead
  };
}

/**
 * Autonomous 1-Click Auto-Reply
 */
export async function autoSendReply({ leadId, clientReplyText = null }) {
  const lead = db.getLeadById(leadId);
  if (!lead) {
    throw new Error(`Lead with ID ${leadId} not found`);
  }

  if (!lead.email) {
    throw new Error(`No verified email address for "${lead.company}". Please add an email address.`);
  }

  const thread = db.getEmailsForLead(lead.id);
  const lastInbound = [...thread].reverse().find(e => e.direction === 'inbound');
  const replyText = clientReplyText || (lastInbound ? lastInbound.body : 'Hi, can you provide more information?');

  // Auto-generate reply based on client message
  const aiResponse = await generateAiReply({ lead, thread, clientReplyText: replyText });

  // Dispatch email
  const emailRecord = await sendEmail({
    leadId: lead.id,
    subject: aiResponse.subject,
    body: aiResponse.body,
    aiGenerated: true,
    toEmail: lead.email
  });

  const analysis = analyzeClientReply(replyText);
  const updatedLead = db.updateLead(lead.id, {
    status: analysis.intent === 'ready_to_close' ? 'closed_won' : 'negotiating'
  });

  db.logActivity('auto_sent_reply', `⚡ Auto-Sent counter reply to ${lead.company}`, {
    leadId: lead.id,
    emailId: emailRecord.id
  });

  return {
    email: emailRecord,
    lead: updatedLead
  };
}

/**
 * Bulk Autonomous Outreach
 */
export async function bulkAutoSendOutreach({ leads = [], skipEmailHunt = false }) {
  const sentList = [];
  const errors = [];

  for (const item of leads) {
    try {
      let leadId = item.id;
      if (!leadId || !db.getLeadById(leadId)) {
        const created = db.createLead(item);
        leadId = created.id;
      }

      const res = await autoSendOutreach({
        leadId,
        toEmail: item.email || null,
        skipEmailHunt: skipEmailHunt || leads.length > 10
      });
      sentList.push(res);
    } catch (err) {
      errors.push({ company: item.company, error: err.message });
    }
  }

  return {
    count: sentList.length,
    sent: sentList,
    errors
  };
}

export default {
  sendEmail,
  receiveInboundEmail,
  autoSendOutreach,
  autoSendReply,
  bulkAutoSendOutreach
};
