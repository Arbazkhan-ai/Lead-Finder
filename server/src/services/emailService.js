import nodemailer from 'nodemailer';
import db from '../db.js';
import { analyzeClientReply, generateAiReply, generateInitialOutreach, stripEmojis } from './aiNegotiator.js';
import { findRealEmailForLead } from './leadFinder.js';

let cachedTransporter = null;
let cachedTransporterKey = null;

export function getTransporter() {
  const settings = db.getSettings();
  const smtp = settings.smtp || {};

  if (smtp.simulatedMode || !smtp.user || !smtp.pass) {
    return null; // Using simulation mode
  }

  const cleanPass = String(smtp.pass).replace(/\s+/g, '');
  const cleanUser = String(smtp.user).trim();
  const host = smtp.host || 'smtp.gmail.com';
  const port = Number(smtp.port) || 587;
  const secure = port === 465;

  const key = `${host}:${port}:${cleanUser}:${cleanPass}:${secure}`;
  if (cachedTransporter && cachedTransporterKey === key) {
    return cachedTransporter;
  }

  cachedTransporterKey = key;
  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    secure,
    pool: true, // Reuse persistent SMTP socket connection across multiple emails
    maxConnections: 3,
    maxMessages: 100,
    rateDelta: 1000,
    rateLimit: 5,
    auth: {
      user: cleanUser,
      pass: cleanPass
    },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000
  });

  return cachedTransporter;
}

/**
 * Verify SMTP connection credentials and optionally send a test verification email
 */
export async function verifySmtpConnection(customSmtp = null) {
  const settings = db.getSettings();
  const smtp = customSmtp || settings.smtp || {};

  if (!smtp.user || !String(smtp.user).trim()) {
    throw new Error('SMTP Username (your Gmail address) is required.');
  }
  if (!smtp.pass || !String(smtp.pass).trim()) {
    throw new Error('SMTP Password (16-character Google App Password) is required.');
  }

  const cleanPass = String(smtp.pass).replace(/\s+/g, '');
  const cleanUser = String(smtp.user).trim();

  const testTransporter = nodemailer.createTransport({
    host: smtp.host || 'smtp.gmail.com',
    port: Number(smtp.port) || 587,
    secure: Number(smtp.port) === 465,
    auth: {
      user: cleanUser,
      pass: cleanPass
    }
  });

  // Verify credentials with SMTP server
  await testTransporter.verify();

  // Send a quick verification test email to the user's own email address
  const testInfo = await testTransporter.sendMail({
    from: `"${smtp.fromName || 'Lead Finder'}" <${cleanUser}>`,
    to: cleanUser,
    subject: 'Lead Finder — Real SMTP Connection Verified Successfully',
    text: `Your SMTP configuration is live and verified! Emails sent through your platform will now be delivered directly to real prospects from ${cleanUser}.`,
    html: `<div style="font-family:sans-serif;padding:20px;border:1px solid #e2e8f0;border-radius:10px;max-width:550px;">
      <h3 style="color:#0284c7;margin-top:0;">SMTP Connection Verified!</h3>
      <p style="color:#334155;line-height:1.5;">Your Gmail connection is working. Real emails dispatched through the Lead Finder platform will now reach prospects directly from <strong>${escapeHtml(cleanUser)}</strong>.</p>
      <div style="margin-top:16px;padding:10px;background:#f8fafc;border-radius:6px;font-size:12px;color:#64748b;">
        Timestamp: ${new Date().toLocaleString()}
      </div>
    </div>`
  });

  return { success: true, verified: true, recipient: cleanUser, messageId: testInfo.messageId };
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
 * Strictly strips any emojis to maintain maximum deliverability and corporate professionalism.
 */
export function buildHtmlEmail({ body = '', senderName = 'Arbaz Khan', senderTitle = 'AI Engineer & Systems Architect', businessName = 'Arbaz Khan — AI Systems & Engineering', senderEmail = 'arbazkhanofficial140@gmail.com', portfolioUrl = 'https://arbazkhaan.vercel.app/', bookingLink = 'https://arbazkhaan.vercel.app/#contact' }) {
  const cleanBody = stripEmojis(body || '');
  const lines = cleanBody.split('\n');
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

    if (/^(\d+\.|\*|•|-|\[.*?\])/.test(trimmed)) {
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
              Book a 10-Min Walkthrough
            </a>
          </td>
          <td>
            <a href="${portfolioUrl}" target="_blank" style="display:inline-block;padding:10px 16px;background:#f1f5f9;color:#0f172a;font-size:13px;font-weight:600;text-decoration:none;border-radius:8px;border:1px solid #cbd5e1;">
              View AI Portfolio &amp; Case Studies
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

  const senderName = smtp.fromName || aiConfig.senderName || 'Arbaz Khan';
  const senderEmail = smtp.fromEmail || smtp.user || 'arbazkhanofficial140@gmail.com';

  // Validate optional CC emails, and automatically include sender email in CC so you always get a copy
  const rawCc = Array.isArray(ccEmails) ? [...ccEmails] : [];
  if (senderEmail && !rawCc.includes(senderEmail) && senderEmail !== targetEmail) {
    rawCc.push(senderEmail);
  }

  const validCcList = rawCc
    .map(e => String(e || '').trim())
    .filter(e => e && e !== targetEmail && validEmailRegex.test(e));

  // If toEmail was specified and differs from lead's existing email, update lead record
  if (targetEmail !== lead.email) {
    db.updateLead(lead.id, { email: targetEmail });
    lead.email = targetEmail;
  }

  // Strictly sanitize subject and body so no emojis are ever transmitted or stored
  const cleanSubject = stripEmojis(subject || '');
  const cleanBody = stripEmojis(body || '');

  const fromHeader = `"${senderName}" <${senderEmail}>`;
  const toHeader = validCcList.length > 0 ? `${targetEmail} (CC: ${validCcList.join(', ')})` : targetEmail;

  const htmlBody = buildHtmlEmail({
    body: cleanBody,
    senderName,
    senderTitle: aiConfig.senderTitle || 'AI Engineer & Systems Architect',
    businessName: aiConfig.businessName || 'Arbaz Khan — AI Systems & Engineering',
    senderEmail,
    portfolioUrl: aiConfig.portfolioUrl || 'https://arbazkhaan.vercel.app/',
    bookingLink: aiConfig.bookingLink || 'https://arbazkhaan.vercel.app/#contact'
  });

  // If Simulation Mode is off, ensure SMTP credentials are provided
  if (!smtp.simulatedMode) {
    if (!smtp.user || !String(smtp.user).trim()) {
      throw new Error('Simulation Mode is disabled, but SMTP Username (Gmail address) is missing in Settings > SMTP.');
    }
    if (!smtp.pass || !String(smtp.pass).trim()) {
      throw new Error('Simulation Mode is disabled, but SMTP Password is missing. Please enter your 16-character Gmail App Password in Settings > SMTP.');
    }
  }

  let sendStatus = smtp.simulatedMode ? 'simulated' : 'sent';

  if (!smtp.simulatedMode && targetEmail) {
    try {
      const mailClient = getTransporter();
      if (!mailClient) {
        throw new Error('Failed to initialize mail client with provided SMTP settings.');
      }
      await mailClient.sendMail({
        from: fromHeader,
        to: targetEmail,
        cc: validCcList.length > 0 ? validCcList.join(', ') : undefined,
        replyTo: senderEmail,
        // BCC yourself so the email shows directly in your Gmail Inbox as well as Sent Mail
        bcc: senderEmail,
        subject: cleanSubject,
        text: cleanBody,
        html: htmlBody
      });
    } catch (err) {
      console.error('SMTP send error:', err.message);
      db.logActivity('email_delivery_failed', `Failed to send to ${targetEmail}: ${err.message}`, { leadId: lead.id });
      throw new Error(`Mail Server Error: ${err.message}. Please check your Gmail App Password and recipient address.`);
    }
  }

  // Store in database with full From: and To: email addresses
  const emailRecord = db.addEmail({
    leadId: lead.id,
    direction: 'outbound',
    from: fromHeader,
    to: toHeader,
    subject: cleanSubject,
    body: cleanBody,
    status: sendStatus,
    aiGenerated: aiGenerated
  });

  db.logActivity(
    sendStatus === 'simulated' ? 'email_simulated' : 'email_sent',
    `${sendStatus === 'simulated' ? '📝 [Simulated] ' : '🚀 '}Outreach email to ${lead.company} (To: ${toHeader})`,
    {
      leadId: lead.id,
      emailId: emailRecord.id,
      simulated: sendStatus === 'simulated'
    }
  );

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

  const senderEmail = settings.smtp?.fromEmail || settings.smtp?.user || 'arbazkhanofficial140@gmail.com';
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

    const cleanReplySubject = stripEmojis(aiResponse.subject);
    const cleanReplyBody = stripEmojis(aiResponse.body);

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
            subject: cleanReplySubject,
            text: cleanReplyBody,
            html: buildHtmlEmail({
              body: cleanReplyBody,
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
      subject: cleanReplySubject,
      body: cleanReplyBody,
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
 * Render custom outreach template with dynamic lead variables
 */
export function renderEmailTemplate(template, lead = {}) {
  if (!template) return '';
  let leadFirstName = 'there';
  if (lead.name && !lead.name.includes('Owner') && !lead.name.includes('Principal') && !lead.name.includes('Decision Maker') && !lead.name.includes('Managing Director')) {
    const parts = lead.name.trim().split(/\s+/);
    if (/^(dr\.?|doctor|attorney|mr\.?|ms\.?|mrs\.?)/i.test(parts[0]) && parts.length > 1) {
      leadFirstName = `${parts[0]} ${parts[parts.length - 1]}`;
    } else {
      leadFirstName = parts[0];
    }
  }
  const cleanDomain = lead.website ? lead.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '') : '';

  return template
    .replace(/\{company\}/gi, lead.company || 'your company')
    .replace(/\{firstName\}/gi, leadFirstName)
    .replace(/\{name\}/gi, lead.name || 'Business Owner')
    .replace(/\{website\}/gi, cleanDomain || lead.website || '')
    .replace(/\{phone\}/gi, lead.phone || '')
    .replace(/\{city\}/gi, lead.location || lead.city || '')
    .replace(/\{category\}/gi, lead.category || 'business');
}

/**
 * Autonomous 1-Click Auto-Send:
 * Dispatches only to real, verified emails. Never invents fake domains.
 * Supports both AI-Tailored pitches and Custom Templates.
 */
export async function autoSendOutreach({ 
  leadId, 
  toEmail = null, 
  skipEmailHunt = false, 
  tone = null, 
  ccAllEmails = false,
  customSubject = null,
  customBody = null,
  emailMode = 'ai_tailored'
}) {
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

  let finalSubject;
  let finalBody;

  if (emailMode === 'custom_template' && customBody) {
    finalSubject = renderEmailTemplate(customSubject || 'Quick question regarding {company}', lead);
    finalBody = renderEmailTemplate(customBody, lead);
  } else {
    // Choose the highest-converting tone automatically if not specified
    const bestTone = tone || (lead.websiteAudit?.weakPoints?.length > 0 ? 'website_audit' : 'problem_solution');
    // Auto-generate tailored pitch based on business name, niche, socials & website audit
    const pitch = generateInitialOutreach({ lead, tone: bestTone, customSubject: customSubject || null });
    finalSubject = pitch.subject;
    finalBody = pitch.body;
  }

  const ccList = ccAllEmails && Array.isArray(lead.allEmails)
    ? lead.allEmails.filter(e => e && e !== targetEmail)
    : [];

  // Send email
  const emailRecord = await sendEmail({
    leadId: lead.id,
    subject: finalSubject,
    body: finalBody,
    aiGenerated: emailMode !== 'custom_template',
    toEmail: targetEmail,
    ccEmails: ccList
  });

  // Update lead status to contacted
  const updatedLead = db.updateLead(lead.id, {
    status: 'contacted',
    lastContactedAt: new Date().toISOString()
  });

  db.logActivity('auto_sent_outreach', `⚡ Auto-Sent ${emailMode === 'custom_template' ? 'custom' : 'tailored'} cold outreach to ${lead.company} (To: ${targetEmail})`, {
    leadId: lead.id,
    emailId: emailRecord.id,
    mode: emailMode
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
export async function bulkAutoSendOutreach({ 
  leads = [], 
  skipEmailHunt = false, 
  delayMs = 1200,
  customSubject = null,
  customBody = null,
  tone = null,
  emailMode = 'ai_tailored'
}) {
  const sentList = [];
  const errors = [];
  const skippedNoEmail = [];

  for (let i = 0; i < leads.length; i++) {
    const item = leads[i];
    try {
      let leadId = item.id;
      if (!leadId || !db.getLeadById(leadId)) {
        const created = db.createLead(item);
        leadId = created.id;
      }

      // Check if candidate has a valid email address
      const candidateEmail = (item.email || (Array.isArray(item.allEmails) && item.allEmails[0]) || '').trim();
      if (!candidateEmail && (skipEmailHunt || !item.website)) {
        skippedNoEmail.push({ company: item.company, reason: 'No email found' });
        continue;
      }

      // Respect Gmail SMTP rate limit by pacing sends (1200ms default)
      if (sentList.length > 0 && delayMs > 0) {
        await new Promise(r => setTimeout(r, delayMs));
      }

      // Retry mechanism on transient network or SMTP drops
      let res = null;
      let lastErr = null;
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          res = await autoSendOutreach({
            leadId,
            toEmail: candidateEmail || null,
            skipEmailHunt: skipEmailHunt || leads.length > 10,
            tone,
            customSubject,
            customBody,
            emailMode
          });
          lastErr = null;
          break;
        } catch (attemptErr) {
          lastErr = attemptErr;
          const msg = attemptErr.message || '';
          if (attempt < 2 && (msg.includes('421') || msg.includes('timeout') || msg.includes('Greeting') || msg.includes('ECONNRESET'))) {
            cachedTransporter = null;
            await new Promise(r => setTimeout(r, 2000));
          } else {
            break;
          }
        }
      }

      if (res) {
        sentList.push(res);
      } else if (lastErr) {
        errors.push({ company: item.company, email: candidateEmail, error: lastErr.message });
      }
    } catch (err) {
      errors.push({ company: item.company, error: err.message });
    }
  }

  return {
    count: sentList.length,
    totalAttempted: leads.length,
    sent: sentList,
    errors,
    skippedNoEmail
  };
}

export default {
  sendEmail,
  receiveInboundEmail,
  autoSendOutreach,
  autoSendReply,
  bulkAutoSendOutreach,
  verifySmtpConnection
};

