import nodemailer from 'nodemailer';
import db from '../db.js';
import { analyzeClientReply, generateAiReply, generateInitialOutreach } from './aiNegotiator.js';
import { scrapeWebsite } from './leadFinder.js';

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
 * Send outbound email to a lead
 */
export async function sendEmail({ leadId, subject, body, aiGenerated = false, toEmail = null }) {
  const lead = db.getLeadById(leadId);
  if (!lead) {
    throw new Error(`Lead with ID ${leadId} not found`);
  }

  const settings = db.getSettings();
  const smtp = settings.smtp || {};

  // If toEmail was specified and differs from lead's existing email, update lead record
  const targetEmail = (toEmail || lead.email || '').trim();
  if (targetEmail && targetEmail !== lead.email) {
    db.updateLead(lead.id, { email: targetEmail });
    lead.email = targetEmail;
  }

  const senderName = smtp.fromName || 'Arbaz Khan';
  const senderEmail = smtp.fromEmail || smtp.user || 'arbazkhanofficial@gmail.com';
  const fromHeader = `"${senderName}" <${senderEmail}>`;
  const toHeader = targetEmail || `Recipient for ${lead.company}`;

  let sendStatus = 'sent';

  if (!smtp.simulatedMode && smtp.user && smtp.pass && targetEmail) {
    try {
      const mailClient = getTransporter();
      if (mailClient) {
        await mailClient.sendMail({
          from: fromHeader,
          to: targetEmail,
          // BCC yourself so the email shows directly in your Gmail Inbox as well as Sent Mail!
          bcc: senderEmail,
          subject: subject,
          text: body
        });
      }
    } catch (err) {
      console.error('SMTP send error:', err.message);
      // Fallback to simulated mode if live send fails so user workflow does not break
      sendStatus = 'sent_simulated_fallback';
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
 * Then triggers autonomous AI response loop if autopilot is enabled!
 */
export async function receiveInboundEmail({ leadId, replyText, subject = null }) {
  const lead = db.getLeadById(leadId);
  if (!lead) {
    throw new Error(`Lead with ID ${leadId} not found`);
  }

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
  if (analysis.intent !== 'not_interested' && settings.ai.autopilot) {
    const thread = db.getEmailsForLead(lead.id);
    const updatedLead = db.getLeadById(lead.id);

    // Generate smart counter-reply / closing pitch
    const aiResponse = await generateAiReply({
      lead: updatedLead,
      thread: thread,
      clientReplyText: replyText
    });

    const smtp = settings.smtp || {};
    // Dispatch via SMTP if live mode enabled
    if (!smtp.simulatedMode && smtp.user && smtp.pass && lead.email) {
      try {
        const mailClient = getTransporter();
        if (mailClient) {
          await mailClient.sendMail({
            from: myAddress,
            to: lead.email,
            bcc: senderEmail,
            subject: aiResponse.subject,
            text: aiResponse.body
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
 * Automatically creates tailored pitch for business, fills To: address, and dispatches without asking
 */
export async function autoSendOutreach({ leadId, toEmail = null }) {
  let lead = db.getLeadById(leadId);
  if (!lead) {
    throw new Error(`Lead with ID ${leadId} not found`);
  }

  // Auto-resolve recipient email
  let targetEmail = (toEmail || lead.email || '').trim();
  if (!targetEmail && lead.website) {
    try {
      const scraped = await scrapeWebsite(lead.website);
      if (scraped.primaryEmail) {
        targetEmail = scraped.primaryEmail;
        db.updateLead(lead.id, { email: targetEmail });
        lead.email = targetEmail;
      }
    } catch (_) {}
  }

  if (!targetEmail) {
    targetEmail = `contact@${lead.company.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`;
  }

  // Auto-generate tailored pitch based on business name, niche & website
  const pitch = generateInitialOutreach({ lead });

  // Immediately send email without asking
  const emailRecord = await sendEmail({
    leadId: lead.id,
    subject: pitch.subject,
    body: pitch.body,
    aiGenerated: true,
    toEmail: targetEmail
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
 * Autonomous 1-Click Auto-Reply:
 * Automatically crafts closing counter-reply according to client email and sends without asking
 */
export async function autoSendReply({ leadId, clientReplyText = null }) {
  const lead = db.getLeadById(leadId);
  if (!lead) {
    throw new Error(`Lead with ID ${leadId} not found`);
  }

  const thread = db.getEmailsForLead(lead.id);
  const lastInbound = [...thread].reverse().find(e => e.direction === 'inbound');
  const replyText = clientReplyText || (lastInbound ? lastInbound.body : 'Hi, can you provide more information?');

  // Auto-generate reply based on client message
  const aiResponse = await generateAiReply({ lead, thread, clientReplyText: replyText });

  // Immediately dispatch email without asking
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
 * Bulk Autonomous Outreach:
 * Automatically imports and dispatches tailored emails to multiple selected leads in one go
 */
export async function bulkAutoSendOutreach({ leads = [] }) {
  const sentList = [];

  for (const item of leads) {
    try {
      let leadId = item.id;
      // If lead is not saved yet, save it first
      if (!leadId || !db.getLeadById(leadId)) {
        const created = db.createLead(item);
        leadId = created.id;
      }

      const res = await autoSendOutreach({ leadId, toEmail: item.email || null });
      sentList.push(res);
    } catch (err) {
      console.warn(`Bulk auto-send error for lead ${item.company || 'unknown'}:`, err.message);
    }
  }

  return {
    count: sentList.length,
    sent: sentList
  };
}

export default {
  sendEmail,
  receiveInboundEmail,
  autoSendOutreach,
  autoSendReply,
  bulkAutoSendOutreach
};
