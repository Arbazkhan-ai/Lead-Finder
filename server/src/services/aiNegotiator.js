import axios from 'axios';
import db from '../db.js';

/**
 * Classify client reply intent and sentiment
 */
export function analyzeClientReply(replyText) {
  const lower = (replyText || '').toLowerCase();

  // 1. Ready to Close Signals
  if (
    lower.includes('agreement') ||
    lower.includes('contract') ||
    lower.includes('sign up') ||
    lower.includes('sign the') ||
    lower.includes('paperwork') ||
    lower.includes('invoice') ||
    lower.includes('payment link') ||
    lower.includes('ready to start') ||
    lower.includes('lets start') ||
    lower.includes("let's start") ||
    lower.includes('lets do this') ||
    lower.includes("let's do this") ||
    lower.includes('deal') ||
    lower.includes('sounds like a plan') ||
    lower.includes('ready to move forward') ||
    lower.includes('how do we get started') ||
    lower.includes('link to finalize') ||
    (lower.includes('start') && (lower.includes('monday') || lower.includes('soon') || lower.includes('ready')))
  ) {
    return {
      intent: 'ready_to_close',
      sentiment: 'positive_high',
      suggestedNextStatus: 'closed_won',
      summary: 'Client gave a direct buying signal and wants to close the agreement.'
    };
  }

  // 2. Meeting / Demo Request
  if (
    lower.includes('schedule a call') ||
    lower.includes('hop on a call') ||
    lower.includes('phone call') ||
    lower.includes('zoom') ||
    lower.includes('google meet') ||
    lower.includes('calendly') ||
    lower.includes('available next') ||
    lower.includes('available tomorrow') ||
    lower.includes('what time works') ||
    lower.includes('free this week') ||
    lower.includes('set up a demo') ||
    lower.includes('meet')
  ) {
    return {
      intent: 'meeting_request',
      sentiment: 'positive_interested',
      suggestedNextStatus: 'negotiating',
      summary: 'Client wants to book a discovery call or meeting to finalize details.'
    };
  }

  // 3. Not interested / Unsubscribe
  if (
    lower.includes('unsubscribe') ||
    lower.includes('remove me') ||
    lower.includes('not interested') ||
    lower.includes('stop emailing') ||
    lower.includes('do not contact') ||
    lower.includes('no thanks') ||
    lower.includes('pass on this')
  ) {
    return {
      intent: 'not_interested',
      sentiment: 'negative',
      suggestedNextStatus: 'closed_lost',
      summary: 'Client declined outreach or requested removal.'
    };
  }

  // 4. Budget / Too Expensive
  if (
    lower.includes('budget') ||
    lower.includes('too expensive') ||
    lower.includes('too high') ||
    lower.includes('afford') ||
    lower.includes('cheaper') ||
    lower.includes('discount') ||
    lower.includes('tight right now')
  ) {
    return {
      intent: 'budget_objection',
      sentiment: 'hesitant_negotiating',
      suggestedNextStatus: 'negotiating',
      summary: 'Client has budget constraints. Needs special discount or pilot offer to close.'
    };
  }

  // 5. Pricing inquiry
  if (
    lower.includes('price') ||
    lower.includes('pricing') ||
    lower.includes('cost') ||
    lower.includes('how much') ||
    lower.includes('fee') ||
    lower.includes('rate') ||
    lower.includes('packages')
  ) {
    return {
      intent: 'pricing_inquiry',
      sentiment: 'interested_inquiring',
      suggestedNextStatus: 'negotiating',
      summary: 'Client is asking for pricing details and packaging.'
    };
  }

  // 6. Skeptical / Trust / Proof Objection
  if (
    lower.includes('burned before') ||
    lower.includes('guarantee') ||
    lower.includes('case studies') ||
    lower.includes('references') ||
    lower.includes('proof') ||
    lower.includes('how does it work') ||
    lower.includes('what makes you different') ||
    lower.includes('results')
  ) {
    return {
      intent: 'trust_objection',
      sentiment: 'skeptical_interested',
      suggestedNextStatus: 'negotiating',
      summary: 'Client requires proof of results, case studies, or a risk-free trial.'
    };
  }

  // 7. Bad Timing
  if (
    lower.includes('busy') ||
    lower.includes('next quarter') ||
    lower.includes('next month') ||
    lower.includes('later this year') ||
    lower.includes('bad timing')
  ) {
    return {
      intent: 'timing_objection',
      sentiment: 'neutral_delayed',
      suggestedNextStatus: 'negotiating',
      summary: 'Client expresses bad timing, needs a low-friction immediate step.'
    };
  }

  // Default: General inquiry
  return {
    intent: 'general_inquiry',
    sentiment: 'neutral_interested',
    suggestedNextStatus: 'negotiating',
    summary: 'Client responded with questions or general interest.'
  };
}

/**
 * Generate Next AI Reply in the thread
 */
export async function generateAiReply({ lead, thread, clientReplyText }) {
  const settings = db.getSettings();
  const aiConfig = settings.ai || {};
  const analysis = analyzeClientReply(clientReplyText);

  // If external API configured (OpenAI or Gemini)
  if (aiConfig.apiKey && aiConfig.provider === 'openai') {
    try {
      return await generateOpenAiReply({ lead, thread, clientReplyText, aiConfig, analysis });
    } catch (err) {
      console.warn('OpenAI API call failed, falling back to built-in sales AI:', err.message);
    }
  }

  if (aiConfig.apiKey && aiConfig.provider === 'gemini') {
    try {
      return await generateGeminiReply({ lead, thread, clientReplyText, aiConfig, analysis });
    } catch (err) {
      console.warn('Gemini API call failed, falling back to built-in sales AI:', err.message);
    }
  }

  // Built-in High-Converting Sales Closing Engine
  return generateBuiltInSalesReply({ lead, thread, clientReplyText, aiConfig, analysis });
}

/**
 * Built-in Sales NLP Closer Engine
 */
function generateBuiltInSalesReply({ lead, thread, clientReplyText, aiConfig, analysis }) {
  const senderName = aiConfig.senderName || 'Alex';
  const businessName = aiConfig.businessName || 'GrowthPulse';
  const bookingLink = aiConfig.bookingLink || 'https://calendly.com';
  const leadFirstName = (lead.name || 'there').split(' ')[0];
  const company = lead.company || 'your team';

  let subject = `Re: ${thread.length > 0 ? thread[0].subject.replace(/^Re:\s*/i, '') : `Partnership for ${company}`}`;
  if (!subject.startsWith('Re:')) subject = `Re: ${subject}`;

  let body = '';
  let closingAction = '';

  switch (analysis.intent) {
    case 'ready_to_close':
      body = `Hi ${leadFirstName},

Thrilled to hear that! We're excited to partner with ${company} and start driving results right away.

I've generated our streamlined onboarding agreement & service link here:
👉 ${bookingLink} (or reply with the best billing email address).

Once finalized, we will immediately set up your dedicated portal and have your campaigns live within 48 hours.

Looking forward to an incredible partnership!

Best regards,
${senderName}
${aiConfig.senderTitle || 'Lead Partner'} | ${businessName}`;
      closingAction = 'Deal finalized - Onboarding link provided';
      break;

    case 'meeting_request':
      body = `Hi ${leadFirstName},

I'd be glad to walk you through our exact system and show you live numbers for businesses similar to ${company}.

You can select whatever 15-minute slot works best for your schedule right here:
📅 ${bookingLink}

Alternatively, I am available tomorrow at 2:00 PM or Thursday at 11:00 AM EST if either of those suits you better.

Looking forward to speaking!

Best regards,
${senderName}
${businessName}`;
      closingAction = 'Meeting invite link sent';
      break;

    case 'pricing_inquiry':
      body = `Hi ${leadFirstName},

Great question. We keep our pricing transparent and tied directly to ROI:

Our ${aiConfig.pricingModel || 'standard growth package is $1,200/mo, covering full prospect list building, hyper-personalized outreach, and guaranteed meetings'}.

Because we're currently selecting 2 priority partners in your sector for this month, we can offer an introductory pilot rate of $850 for month 1, backed by a 100% money-back guarantee if we don't deliver verified leads.

Would it make sense to jump on a quick 10-minute call this week to see if we're a good mutual fit? Here's my direct calendar: ${bookingLink}

Best regards,
${senderName}
${businessName}`;
      closingAction = 'Pricing presented with closing discount pilot';
      break;

    case 'budget_objection':
      body = `Hi ${leadFirstName},

I completely understand budget caution—cash flow is paramount.

We never want budget to stand in the way of profitable growth for ${company}. Here is what I can do for you:

We can start with a 14-day performance trial at just 50% of the standard commitment ($490), or structure it purely around results delivered.

If that works for you, let's lock in a quick 10-minute kickoff: ${bookingLink}

Would that make it feasible for ${company} to start this month?

Best regards,
${senderName}
${businessName}`;
      closingAction = 'Overcame budget objection with risk-free 50% pilot';
      break;

    case 'trust_objection':
      body = `Hi ${leadFirstName},

I completely respect your skepticism—there are dozens of agencies sending empty promises that end up burning domain reputations.

Here is why our approach is fundamentally different for ${company}:
1. We don't blast static templates. Every single message is uniquely researched using your prospect's actual tech stack, news, and services.
2. We include a full 100% performance milestone guarantee: if we don't deliver qualified meetings in your target demographic, you don't pay.

Would you be open to seeing a 5-minute live screen share of our verified pipeline results?
Here's my private schedule link: ${bookingLink}

Best regards,
${senderName}
${businessName}`;
      closingAction = 'Overcame skepticism with proof & performance guarantee';
      break;

    case 'timing_objection':
      body = `Hi ${leadFirstName},

Understood! Things get busy quickly.

Rather than taking up your time right now, I can send over a 2-minute Loom breakdown of how we'd set up ${company}'s outbound engine, so you have it on file when you're ready.

If you'd like me to hold a priority spot for next month, you can grab a time anytime here: ${bookingLink}

Have a great week!

Best regards,
${senderName}
${businessName}`;
      closingAction = 'Nurtured timing objection with low-friction asset';
      break;

    case 'not_interested':
      body = `Hi ${leadFirstName},

No problem at all. I appreciate you letting me know and taking the time to reply.

I've made a note in our system so you won't receive further follow-ups. If anything changes down the road for ${company}, our door is always open.

Wishing you and ${company} continued success!

Best regards,
${senderName}
${businessName}`;
      closingAction = 'Polite graceful close';
      break;

    default:
      body = `Hi ${leadFirstName},

Thanks for getting back to me!

Regarding ${company}, our core focus is taking all the guesswork and manual prospecting off your shoulders so you can focus exclusively on speaking with high-intent prospects.

${aiConfig.pitchOffer || 'We handle the list building, verification, copy testing, and inbox management end-to-end.'}

Would you be open to a quick 10-minute check-in this week? Here is my direct booking link: ${bookingLink}

Best regards,
${senderName}
${businessName}`;
      closingAction = 'General objection handled, driven toward calendar booking';
      break;
  }

  return {
    subject,
    body,
    analysis,
    closingAction,
    aiGenerated: true
  };
}

/**
 * Generate Initial Cold Outreach Email for a new lead
 */
export function generateInitialOutreach({ lead }) {
  const settings = db.getSettings();
  const aiConfig = settings.ai || {};
  const senderName = aiConfig.senderName || 'Arbaz Khan';
  const businessName = aiConfig.businessName || 'Arbaz Khan — AI Systems & Engineering';
  const portfolioUrl = aiConfig.portfolioUrl || 'https://arbazkhaan.vercel.app/';
  const bookingLink = aiConfig.bookingLink || 'https://arbazkhaan.vercel.app/#contact';
  const leadFirstName = (lead.name || 'there').split(' ')[0];
  const company = lead.company || 'your team';
  const niche = lead.category || 'business';

  const subject = `AI engineering & intelligent systems for ${company}`;

  const body = `Hi ${leadFirstName},

I came across ${company}'s work in ${niche} (${lead.website || 'your website'}) and wanted to reach out directly.

I'm ${senderName}, an AI Engineer & Systems Architect. I build custom AI systems, intelligent automation pipelines, and LLM-powered workflows that help companies automate complex operations and scale without increasing headcount.

You can review some of my recent deployed models, architecture case studies, and live projects on my portfolio here:
👉 ${portfolioUrl}

I'd love to explore how custom AI solutions could drive tangible efficiency or new product capabilities for ${company}.

Would you be open to a quick 10-minute intro call or a free architectural feasibility audit this week?
Direct Contact / Schedule: ${bookingLink}

Best regards,

${senderName}
${aiConfig.senderTitle || 'AI Engineer & Systems Architect'}
${businessName}
Portfolio: ${portfolioUrl}
Email: ${settings.smtp?.fromEmail || 'arbazkhanofficial@gmail.com'}`;

  return {
    subject,
    body,
    aiGenerated: true
  };
}

export default {
  analyzeClientReply,
  generateAiReply,
  generateInitialOutreach
};
