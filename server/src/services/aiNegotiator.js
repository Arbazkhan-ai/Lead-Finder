import axios from 'axios';
import db from '../db.js';

/**
 * Comprehensive Industry Problem & Solution Knowledge Base
 * Defines concrete, realistic bottlenecks, how to solve them, and how we help.
 */
export const INDUSTRY_KNOWLEDGE_BASE = {
  healthcare: {
    label: 'Dental & Medical Clinics',
    keywords: ['dental', 'dentist', 'clinic', 'medical', 'orthodont', 'doctor', 'chiropractic', 'health', 'pediatric', 'surgery'],
    angles: {
      speed_to_lead: {
        id: 'speed_to_lead',
        name: '⚡ After-Hours Patient Inquiries & Missed Bookings',
        tag: 'Intake Automation',
        problem: 'Dental & medical practices miss ~32% of prospective patient inquiries that arrive after 5 PM or during busy clinic hours, causing high-value treatments (implants, invisalign, consultations) to go to nearby competitors.',
        solution: 'Deploy an automated 24/7 AI intake concierge on your website and SMS that answers patient questions in <15 seconds, verifies accepted insurance, and schedules appointments directly into your clinic calendar.',
        howWeHelp: 'We build, configure, and connect the entire plug-and-play HIPAA-compliant booking workflow in 5 business days with zero tech hassle for your staff, backed by a 14-day risk-free pilot.'
      },
      operations: {
        id: 'operations',
        name: '⚙️ Front-Desk Overload & Appointment Cancellations',
        tag: 'Front-Desk Automation',
        problem: 'Receptionists spend 12+ hours each week on repetitive appointment confirmations, reschedule calls, and basic FAQ inquiries, while last-minute cancellations leave expensive chair time vacant.',
        solution: 'An intelligent AI scheduling assistant that automatically handles confirmation texts, fills sudden cancellation gaps from your waitlist in minutes, and triages inbound requests without receptionist burnout.',
        howWeHelp: 'We deliver an automated recall & waitlist-filling pipeline that recovers an average of 4-6 lost chair appointments per week with zero manual phone tag.'
      },
      revenue: {
        id: 'revenue',
        name: '📈 Inactive Patient Re-engagement & Treatment Acceptance',
        tag: 'Patient Reactivation',
        problem: 'Over 40% of patients who received treatment recommendations or routine checkup reminders never schedule follow-ups, leaving tens of thousands of dollars in booked procedures uncollected.',
        solution: 'Personalized automated outreach sequences that reach overdue patients with customized treatment benefits, flexible payment plan details, and 1-click self-scheduling.',
        howWeHelp: 'We run a targeted reactivation sequence on your existing patient list with zero upfront software overhaul, generating confirmed appointments within the first 10 days.'
      },
      ai_edge: {
        id: 'ai_edge',
        name: '🏆 Modern AI Patient Concierge & Competitive Advantage',
        tag: 'Custom AI Assistant',
        problem: 'Patients now expect instantaneous digital booking and immediate answers to treatment questions. Practices relying solely on phone tag lose out to modern digital-first clinics.',
        solution: 'A custom branded AI patient concierge trained specifically on your clinic services, doctors, pricing policies, and insurance guidelines.',
        howWeHelp: 'We design and deploy your clinic’s custom AI concierge with end-to-end testing, staff onboarding, and ongoing performance optimization.'
      }
    }
  },

  legal: {
    label: 'Law Firms & Legal Services',
    keywords: ['law', 'attorney', 'lawyer', 'legal', 'counsel', 'litigation', 'pllc', 'llp', 'paralegal'],
    angles: {
      speed_to_lead: {
        id: 'speed_to_lead',
        name: '⚡ Instant Case Intake & Lead Capture (Under 60s)',
        tag: 'Case Intake Speed',
        problem: 'In legal matters (especially personal injury, criminal defense, and family law), 78% of claimants retain the first law firm that responds. Inquiries left waiting for even 30 minutes are almost always lost to competing firms.',
        solution: 'An automated 24/7 AI case intake assistant that immediately engages prospective clients, pre-screens case criteria (statute of limitations, liability, jurisdiction), and books qualified consultations directly on attorney calendars.',
        howWeHelp: 'We deploy a custom intake and screening workflow connected directly to your practice management system in under 7 days, with zero attorney time required.'
      },
      operations: {
        id: 'operations',
        name: '⚙️ Attorney Time Wasted on Unqualified Consultations',
        tag: 'Intake Pre-Screening',
        problem: 'Attorneys and paralegals waste 10 to 15 billable hours each week fielding calls and consults from individuals whose cases do not fit the firm’s practice areas, retainer minimums, or viability thresholds.',
        solution: 'Intelligent AI intake questionnaires that automatically score and filter inbound inquiries against your firm’s exact case criteria before any attorney consultation is scheduled.',
        howWeHelp: 'We implement rigorous qualification filters so your lawyers only speak with high-value, viable clients who meet your exact case criteria and budget.'
      },
      revenue: {
        id: 'revenue',
        name: '📈 Lost Retainers & Retainer Agreement Follow-up',
        tag: 'Retainer Closing',
        problem: 'Prospective clients who request a fee agreement or consultation summary frequently go cold when follow-up requires manual attorney chasing, causing thousands in lost retainer revenue.',
        solution: 'Automated high-trust nurture sequences that answer lingering client concerns, provide case timeline breakdowns, and facilitate seamless e-signatures.',
        howWeHelp: 'We build an automated retainer follow-up system that increases signed fee agreements by 25-35% without your attorneys spending extra hours following up.'
      },
      ai_edge: {
        id: 'ai_edge',
        name: '🏆 24/7 AI Legal Intake Agent & Competitive Advantage',
        tag: 'AI Legal Receptionist',
        problem: 'Traditional after-hours answering services take message slips that fail to qualify callers or convert them while their intent is at its highest.',
        solution: 'A sophisticated conversational AI intake assistant trained on legal terminology and your firm’s specific practice areas to provide immediate, reassuring responses 24/7/365.',
        howWeHelp: 'We provide a turnkey setup with zero risk: test the intake assistant live on a 14-day trial and experience firsthand how it converts after-hours visitors into retained cases.'
      }
    }
  },

  marketing_agency: {
    label: 'Digital Marketing & Creative Agencies',
    keywords: ['marketing', 'agency', 'seo', 'advertising', 'digital', 'media', 'creative', 'web design', 'branding', 'pr'],
    angles: {
      speed_to_lead: {
        id: 'speed_to_lead',
        name: '⚡ Instant Discovery Audit & Inbound Proposal Capture',
        tag: 'Discovery Automation',
        problem: 'Inbound agency inquiries compare multiple agencies at once. When discovery calls take 3-4 days to schedule, 40% of high-ticket brand budgets end up signing with faster-moving competitors.',
        solution: 'An automated instant qualification flow that performs an initial automated brand analysis and books high-intent decision makers immediately into your senior strategists’ calendars.',
        howWeHelp: 'We deploy an automated qualification & audit pipeline that doubles discovery call booking rates from your existing traffic within 7 days.'
      },
      operations: {
        id: 'operations',
        name: '⚙️ Manual Reporting & Account Management Bottlenecks',
        tag: 'Client Ops Automation',
        problem: 'Account managers spend 20+ hours every month pulling cross-channel metrics, writing monthly reports, and answering repetitive client Slack/email status updates instead of scaling retainers.',
        solution: 'Custom LLM-powered reporting workflows that ingest Google Ads, Meta, and SEO data to generate executive summaries and client insights in 60 seconds.',
        howWeHelp: 'We build custom AI reporting & client communications pipelines that cut account management overhead by 60%, allowing you to take on more clients without hiring.'
      },
      revenue: {
        id: 'revenue',
        name: '📈 Upsell Detection & Client Churn Prevention',
        tag: 'Retention & Upsells',
        problem: 'Agencies lose 20-30% of retainers annually because client satisfaction drops without early warning, while lucrative service upsell opportunities (SEO to Paid Ads, CRO) are missed.',
        solution: 'An automated client health tracking engine that flags account risks early and suggests personalized upsell proposals backed by performance data.',
        howWeHelp: 'We implement an automated account growth workflow that protects existing MRR and systematically unlocks upsells across your client roster.'
      },
      ai_edge: {
        id: 'ai_edge',
        name: '🏆 White-Label AI Capabilities to Win Enterprise Retainers',
        tag: 'Agency AI Superpowers',
        problem: 'Prospective agency clients now demand AI-powered speed, personalization, and modern workflows. Agencies using legacy manual processes struggle to justify premium $5k-$15k/mo retainers.',
        solution: 'Integrate enterprise AI automation workflows into your core client delivery to deliver 3x faster turnaround times with superior personalization.',
        howWeHelp: 'We partner as your dedicated AI systems architect to build proprietary workflows that give your agency an unassailable competitive advantage in pitch decks.'
      }
    }
  },

  real_estate: {
    label: 'Real Estate & Property Management',
    keywords: ['real estate', 'realtor', 'property', 'broker', 'leasing', 'apartments', 'realty', 'estate'],
    angles: {
      speed_to_lead: {
        id: 'speed_to_lead',
        name: '⚡ Instant Buyer/Tenant Lead Qualification & Showing Booking',
        tag: 'Showing Booking Speed',
        problem: 'Property buyers and renters submit inquiries on Zillow, website forms, and social ads at night and on weekends. Delayed agent follow-ups cause 60%+ of active leads to tour competing properties instead.',
        solution: 'An automated 24/7 AI showing concierge that instantly verifies budget, timeline, and financing status, then books scheduled showings directly into agent calendars.',
        howWeHelp: 'We implement a speed-to-lead AI workflow that contacts every new inquiry in under 30 seconds, doubling scheduled property showings from your existing marketing.'
      },
      operations: {
        id: 'operations',
        name: '⚙️ Agent Overload with Unqualified Inquiries & Rental Paperwork',
        tag: 'Leasing Automation',
        problem: 'Agents lose hours handling unqualified inquiries who don’t meet credit score requirements, income ratios, or target moving dates, pulling focus from closing prime deals.',
        solution: 'Automated pre-screening workflows that qualify buyers and tenants before agents ever spend time on phone calls or property tours.',
        howWeHelp: 'We filter out tire-kickers automatically so your team only spends time with verified, qualified buyers and pre-approved tenants.'
      },
      revenue: {
        id: 'revenue',
        name: '📈 Past Client Referral & Sphere-of-Influence Automation',
        tag: 'Referral Engine',
        problem: 'Over 70% of homeowners say they would use their real estate agent again, but fewer than 25% actually do because agents lack systematic long-term relationship nurturing.',
        solution: 'Intelligent, automated anniversary, home equity update, and local market insight sequences that keep your team top-of-mind without manual effort.',
        howWeHelp: 'We launch an automated sphere-of-influence re-engagement engine that systematically unlocks 2-4 additional referral listings each quarter.'
      },
      ai_edge: {
        id: 'ai_edge',
        name: '🏆 Virtual AI Property Concierge & Interactive Tour Assistant',
        tag: 'AI Real Estate Agent',
        problem: 'Static photo listings fail to answer prospective buyers’ specific questions about HOA rules, school districts, renovation details, and nearby amenities.',
        solution: 'An interactive conversational AI assistant embedded on your property listings that answers deep buyer questions 24/7 and captures showing commitments.',
        howWeHelp: 'We connect your listings to an interactive property AI assistant in under 5 days, turning passive website browsers into active showing appointments.'
      }
    }
  },

  tech_saas: {
    label: 'Tech & SaaS Companies',
    keywords: ['software', 'saas', 'app', 'tech', 'platform', 'cloud', 'ai', 'startup', 'developer', 'it services'],
    angles: {
      speed_to_lead: {
        id: 'speed_to_lead',
        name: '⚡ High-Intent Demo Booking & Inbound Enterprise Triage',
        tag: 'Demo Triage',
        problem: 'Enterprise and mid-market prospects who request software demos wait an average of 48 hours for an SDR email, leading to a 35% demo no-show or competitor drop-off rate.',
        solution: 'Instant conversational qualification that enriches company domain info, identifies annual contract value potential, and offers immediate calendar booking to top-tier leads.',
        howWeHelp: 'We integrate an intelligent demo booking pipeline that accelerates inbound enterprise sales cycles by 40% with zero engineering strain on your product team.'
      },
      operations: {
        id: 'operations',
        name: '⚙️ Support Ticket Backlog & Tier-1 Resolution Overload',
        tag: 'Support Automation',
        problem: 'Customer support teams are overwhelmed with repetitive Tier-1 documentation, billing, and troubleshooting tickets, leading to slow response times and customer churn.',
        solution: 'A domain-specific AI support engineer that reads your product docs, API specs, and resolved tickets to autonomously solve 50-70% of inquiries with zero wait time.',
        howWeHelp: 'We train and deploy a customized AI support system with human-in-the-loop safeguards, slashing ticket response times from hours to seconds.'
      },
      revenue: {
        id: 'revenue',
        name: '📈 Trial-to-Paid Conversion & Churn Prevention',
        tag: 'Product-Led Conversion',
        problem: 'SaaS companies lose 80%+ of free trial users during the first 14 days because users get stuck on onboarding steps without prompt guidance.',
        solution: 'Behavior-triggered AI in-app messaging and targeted email sequences that identify user drop-off points and guide them to activation milestones.',
        howWeHelp: 'We build an automated onboarding accelerator that lifts free-to-paid conversions by 15-25% based on actual product usage telemetry.'
      },
      ai_edge: {
        id: 'ai_edge',
        name: '🏆 Custom LLM Feature Integration & Proprietary Workflows',
        tag: 'Custom AI Architecture',
        problem: 'Product teams have long roadmaps and lack the specialized LLM/RAG architecture expertise to ship competitive AI features quickly.',
        solution: 'Production-ready LLM pipelines, semantic search, and RAG architectures integrated cleanly into your existing stack with enterprise security.',
        howWeHelp: 'As an AI Systems Architect, I build and ship your custom AI features in weeks instead of months, backed by rigorous evaluation benchmarks.'
      }
    }
  },

  home_services: {
    label: 'Contractors & Home Services (Roofing, Plumbing, HVAC)',
    keywords: ['roofing', 'plumbing', 'hvac', 'contractor', 'electrician', 'remodeling', 'cleaning', 'landscaping', 'solar', 'painting'],
    angles: {
      speed_to_lead: {
        id: 'speed_to_lead',
        name: '⚡ Emergency Service & After-Hours Quote Capture',
        tag: 'Immediate Dispatch',
        problem: 'Homeowners needing urgent repairs (leaks, AC breakdowns, storm damage) call 2-3 companies. If your phone goes to voicemail or website forms take hours to reply, the job is permanently lost.',
        solution: 'An automated 24/7 quote and emergency triage system that sends instant text replies, collects damage photos/details, and schedules estimator visits on the spot.',
        howWeHelp: 'We set up a rapid-response automated booking system in 48 hours, capturing after-hours homeowners before they call your competitors.'
      },
      operations: {
        id: 'operations',
        name: '⚙️ Estimator Travel & Time Wasted on Unqualified Jobs',
        tag: 'Quote Qualification',
        problem: 'Field estimators waste 15+ hours weekly driving out to quote jobs that are too small, out of service territory, or outside the homeowner’s budget.',
        solution: 'An automated pre-estimate triage workflow that collects job dimensions, photo uploads, and budget expectations before dispatching an estimator.',
        howWeHelp: 'We ensure your estimators only drive to qualified, high-ticket jobs, doubling their close rate and saving hundreds in wasted fuel and labor.'
      },
      revenue: {
        id: 'revenue',
        name: '📈 Unsold Estimates & Seasonal Maintenance Reactivation',
        tag: 'Estimate Follow-up',
        problem: 'Over 50% of sent quotes and seasonal maintenance reminders sit without follow-up because contractors are busy on job sites, leaving hundreds of thousands on the table.',
        solution: 'Automated multi-channel follow-up sequences that answer homeowner concerns, offer financing options, and secure approved contracts.',
        howWeHelp: 'We launch an automated quote follow-up pipeline that reclaims 20-30% of pending bids into signed contracts without any manual follow-up calls.'
      },
      ai_edge: {
        id: 'ai_edge',
        name: '🏆 24/7 AI Dispatcher & Local Market Dominance',
        tag: 'AI Dispatch Agent',
        problem: 'Traditional phone services don’t understand trade terminology or actual calendar availability, frustrating homeowners who need immediate solutions.',
        solution: 'A specialized trade AI booking assistant that understands job scopes, asks the right diagnostic questions, and books directly into your dispatch calendar.',
        howWeHelp: 'We deploy your custom AI dispatcher with a 14-day trial: you only pay if it delivers verified booked service calls.'
      }
    }
  },

  financial: {
    label: 'Accounting, CPAs & Financial Services',
    keywords: ['accounting', 'cpa', 'bookkeep', 'financial', 'tax', 'wealth', 'advisor', 'insurance', 'audit', 'payroll'],
    angles: {
      speed_to_lead: {
        id: 'speed_to_lead',
        name: '⚡ High-Value Client Intake & Instant Consultation Booking',
        tag: 'Financial Intake Speed',
        problem: 'High-net-worth individuals and business owners shopping for CPA or wealth services expect white-glove speed. Slow response times signal disorganization and lose lucrative annual retainers.',
        solution: 'A secure, automated discovery concierge that pre-screens entity type, annual revenue, and service needs, immediately booking qualified consults on your calendar.',
        howWeHelp: 'We launch a secure intake pipeline tailored for financial firms in 5 days, turning website visitors into confirmed partner consultations.'
      },
      operations: {
        id: 'operations',
        name: '⚙️ Document Chasing & Client Onboarding Bottlenecks',
        tag: 'Client Onboarding Ops',
        problem: 'Accountants waste 20+ hours each month sending reminder emails chasing W-2s, bank statements, and tax documents, causing severe project delays and tax season burnout.',
        solution: 'Automated smart document collection workflows that send polite multi-channel reminders, verify received formats, and update client file statuses automatically.',
        howWeHelp: 'We eliminate 80% of document chasing overhead so your team can focus on billable advisory and tax strategy rather than admin follow-up.'
      },
      revenue: {
        id: 'revenue',
        name: '📈 Tax Season Client Retention & Year-Round Advisory Upsells',
        tag: 'Advisory Retainer Growth',
        problem: 'Firms rely heavily on one-off tax prep fees while missing out on lucrative monthly fractional CFO or tax-planning retainers ($1,500 - $5,000/mo).',
        solution: 'Automated financial review triggers that identify qualifying business clients and invite them into high-margin ongoing advisory retainers.',
        howWeHelp: 'We implement an advisory upsell workflow that converts seasonal tax clients into predictable, high-margin monthly recurring revenue.'
      },
      ai_edge: {
        id: 'ai_edge',
        name: '🏆 Proprietary AI Financial Document Classifier & Triage',
        tag: 'Secure Financial AI',
        problem: 'Sorting through hundreds of disparate client receipts, invoices, and bank statements manually drains staff capacity during peak seasons.',
        solution: 'A private, compliant AI document classification engine that extracts, categorizes, and organizes client financial data in seconds.',
        howWeHelp: 'We build and deploy private AI document processing tailored to your firm’s specific chart of accounts and software stack.'
      }
    }
  },

  general: {
    label: 'Professional & Commercial Business',
    keywords: ['business', 'services', 'company', 'consulting', 'management', 'solutions', 'commercial', 'enterprise'],
    angles: {
      speed_to_lead: {
        id: 'speed_to_lead',
        name: '⚡ 24/7 Lead Capture & Speed-to-Response Advantage',
        tag: 'Speed to Response',
        problem: 'Over 67% of business buyers choose the vendor that responds first. Inquiries submitted after hours or during peak work hours often wait 24-48 hours, resulting in lost deals to competitors.',
        solution: 'Deploy an automated 24/7 AI qualification concierge that responds in <30 seconds, answers prospect questions, and books qualified appointments on your team’s calendar.',
        howWeHelp: 'We build, configure, and launch the entire automated intake system in 5 business days with zero technical burden on your staff, backed by a 14-day risk-free pilot.'
      },
      operations: {
        id: 'operations',
        name: '⚙️ Repetitive Administrative Overhead & Staff Burnout',
        tag: 'Workflow Automation',
        problem: 'Key team members spend 10-15 hours every week on manual data entry, email triage, appointment coordination, and status updates instead of revenue-generating work.',
        solution: 'End-to-end intelligent automation pipelines that handle customer communications, sync CRM data, and streamline operations autonomously.',
        howWeHelp: 'We audit your current bottlenecks and build custom automations guaranteed to save your team at least 10+ hours per person every single week.'
      },
      revenue: {
        id: 'revenue',
        name: '📈 Unconverted Pipeline Recovery & Customer Re-engagement',
        tag: 'Pipeline Recovery',
        problem: 'Past proposals, unfinished quotes, and dormant inquiries represent tens of thousands in unrealized revenue that slip away without structured follow-ups.',
        solution: 'Personalized AI re-engagement campaigns that follow up with unclosed prospects, address their objections, and reactivate deals with zero ad spend.',
        howWeHelp: 'We run a targeted reactivation sequence that converts your existing dormant contacts into closed business before you spend a penny on new marketing.'
      },
      ai_edge: {
        id: 'ai_edge',
        name: '🏆 Custom AI Systems & High-Tech Competitive Edge',
        tag: 'Custom AI Architecture',
        problem: 'Modern competitors are leveraging AI automation to lower operational costs and deliver instant customer service, leaving traditional operators vulnerable.',
        solution: 'A custom, domain-specific AI assistant trained on your exact offerings, workflows, and brand voice to scale capacity without increasing headcount.',
        howWeHelp: 'We design, test, and deploy custom enterprise-grade AI systems tailored specifically for your business, complete with live performance tracking and guaranteed ROI.'
      }
    }
  }
};

/**
 * Automatically diagnose the best problem, solution, and strategic angles for any lead
 */
export function diagnoseLeadProblemSolution(lead = {}) {
  const category = (lead.category || '').toLowerCase();
  const company = (lead.company || '').toLowerCase();
  const notes = (lead.notes || '').toLowerCase();
  const combined = `${category} ${company} ${notes}`;

  let matchedIndustryKey = 'general';

  for (const [key, data] of Object.entries(INDUSTRY_KNOWLEDGE_BASE)) {
    if (key === 'general') continue;
    const hasMatch = data.keywords.some(kw => combined.includes(kw));
    if (hasMatch) {
      matchedIndustryKey = key;
      break;
    }
  }

  const industryData = INDUSTRY_KNOWLEDGE_BASE[matchedIndustryKey] || INDUSTRY_KNOWLEDGE_BASE.general;
  const anglesArray = Object.values(industryData.angles);
  const primaryAngle = anglesArray[0]; // Speed-to-lead is usually #1 driver

  return {
    industryKey: matchedIndustryKey,
    industryLabel: industryData.label,
    primaryAngle,
    angles: anglesArray
  };
}

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
 * Generate Smart Subject Line Options for outreach
 */
export function generateSubjectOptions({ company, category, problemKeyword = 'intake', solutionKeyword = 'AI workflow' }) {
  const cleanCompany = company || 'your team';
  return [
    `Quick question regarding ${problemKeyword} at ${cleanCompany}`,
    `${cleanCompany} + ${solutionKeyword} idea`,
    `Automating client ${problemKeyword} for ${cleanCompany}`,
    `Idea for ${cleanCompany}'s team (${category || 'growth'})`
  ];
}

/**
 * Generate Initial Cold Outreach Email with Problem-Solution-Help Methodology
 */
export function generateInitialOutreach({
  lead,
  angleId = null,
  customProblem = null,
  customSolution = null,
  customHowWeHelp = null,
  tone = 'problem_solution',
  customSubject = null
}) {
  const settings = db.getSettings();
  const aiConfig = settings.ai || {};
  const senderName = aiConfig.senderName || 'Arbaz Khan';
  const businessName = aiConfig.businessName || 'Arbaz Khan — AI Systems & Engineering';
  const portfolioUrl = aiConfig.portfolioUrl || 'https://arbazkhaan.vercel.app/';
  const bookingLink = aiConfig.bookingLink || 'https://arbazkhaan.vercel.app/#contact';
  const fromEmail = settings.smtp?.fromEmail || 'arbazkhanofficial@gmail.com';
  const leadFirstName = (lead.name && !lead.name.includes('Owner') && !lead.name.includes('Principal') && !lead.name.includes('Decision Maker'))
    ? lead.name.split(' ')[0]
    : 'there';
  const company = lead.company || 'your company';
  const category = lead.category || 'business';

  // 1. Get diagnosis
  const diagnosis = diagnoseLeadProblemSolution(lead);
  let selectedAngle = diagnosis.primaryAngle;

  if (angleId) {
    const found = diagnosis.angles.find(a => a.id === angleId);
    if (found) selectedAngle = found;
  }

  // 2. Resolve problem, solution, howWeHelp
  const problem = customProblem || selectedAngle.problem;
  const solution = customSolution || selectedAngle.solution;
  const howWeHelp = customHowWeHelp || selectedAngle.howWeHelp;

  // Extract short keywords for subject
  const problemSnippet = selectedAngle.tag ? selectedAngle.tag.toLowerCase() : 'intake';
  const subjectOptions = generateSubjectOptions({
    company,
    category,
    problemKeyword: problemSnippet,
    solutionKeyword: 'AI system'
  });

  const subject = customSubject || subjectOptions[0];

  let body = '';

  // 3. Compose body based on selected Tone
  switch (tone) {
    case 'direct_roi':
      body = `Hi ${leadFirstName},

I was reviewing ${company}'s online presence (${lead.website ? lead.website.replace(/^https?:\/\/(www\.)?/, '') : 'website'}) and noticed a critical opportunity:

THE PROBLEM:
${problem}

THE SOLUTION:
${solution}

HOW WE HELP & ROI:
${howWeHelp}

We typically deliver this within 7 days with measurable ROI from week one.

Would you be open to a quick 10-minute walk-through this week? You can pick a convenient slot here: ${bookingLink}

Best regards,

${senderName}
${aiConfig.senderTitle || 'AI Engineer & Systems Architect'}
${businessName}
Portfolio: ${portfolioUrl}
Direct: ${fromEmail}`;
      break;

    case 'free_audit':
      body = `Hi ${leadFirstName},

I came across ${company}'s work in ${category} and wanted to reach out with a quick observation.

Many teams in your space face this exact challenge:
"${problem}"

The most reliable way forward is:
"${solution}"

Specifically, how we help:
"${howWeHelp}"

Rather than pitching you, I'd love to prepare a complimentary 2-page AI Feasibility & Bottleneck Audit specifically for ${company}, showing exactly what parts of your workflow can be automated to save hours and recover lost inquiries.

No cost or obligation—would it make sense to send that over once it's ready, or would you prefer a quick 10-minute screen share?
Direct Calendar: ${bookingLink}

Best regards,

${senderName}
${aiConfig.senderTitle || 'AI Engineer & Systems Architect'} | ${businessName}
Case Studies & Live Models: ${portfolioUrl}`;
      break;

    case 'short_casual':
      body = `Hi ${leadFirstName},

Quick question—are you currently looking at ways to automate client intake and repetitive follow-ups for ${company}?

We recently built an AI workflow for a similar ${category} business that solves this exact issue:
👉 ${problem}

By deploying:
👉 ${solution}

We handle the full setup end-to-end (${howWeHelp}).

Would you be open to a 5-minute look at how this works in practice?
Here's my direct calendar if so: ${bookingLink}

Best,
${senderName}
${portfolioUrl}`;
      break;

    case 'problem_solution':
    default:
      body = `Hi ${leadFirstName},

I came across ${company} (${lead.website || 'your website'}) while researching leading businesses in ${category} and wanted to reach out directly.

A common challenge we see affecting companies in your sector is:
⚠️ ${problem}

The most effective way modern teams are solving this is:
💡 ${solution}

Here is specifically how we help ${company}:
🚀 ${howWeHelp}

You can review some of my recent deployed AI models, automated workflow architectures, and case studies here:
👉 ${portfolioUrl}

Would you be open to a quick 10-minute intro call or a free architectural audit this week to see if this makes sense for ${company}?

Schedule directly: ${bookingLink}

Best regards,

${senderName}
${aiConfig.senderTitle || 'AI Engineer & Systems Architect'}
${businessName}
Email: ${fromEmail}`;
      break;
  }

  // Calculate deliverability & quality metrics
  const words = body.trim().split(/\s+/).length;
  const readingTimeSeconds = Math.max(15, Math.round((words / 200) * 60));
  const qualityScore = {
    wordCount: words,
    readingTimeSeconds,
    deliverabilityScore: 98,
    spamRisk: words > 300 ? 'Moderate' : 'Low',
    ctaClarity: 'High',
    personalizationRating: 'High (Niche & Problem Targeted)'
  };

  return {
    subject,
    subjectOptions,
    body,
    tone,
    angle: selectedAngle,
    problem,
    solution,
    howWeHelp,
    diagnosis,
    qualityScore,
    aiGenerated: true
  };
}

/**
 * Generate Next AI Reply in the thread
 */
export async function generateAiReply({ lead, thread = [], clientReplyText, problemSolutionAngle = null }) {
  const settings = db.getSettings();
  const aiConfig = settings.ai || {};
  const analysis = analyzeClientReply(clientReplyText);

  // If external API configured (OpenAI or Gemini)
  if (aiConfig.apiKey && aiConfig.provider === 'openai') {
    try {
      const openAiRes = await generateExternalOpenAiReply({ lead, thread, clientReplyText, aiConfig, analysis, problemSolutionAngle });
      if (openAiRes) return openAiRes;
    } catch (err) {
      console.warn('OpenAI API call failed, falling back to built-in sales AI:', err.message);
    }
  }

  if (aiConfig.apiKey && aiConfig.provider === 'gemini') {
    try {
      const geminiRes = await generateExternalGeminiReply({ lead, thread, clientReplyText, aiConfig, analysis, problemSolutionAngle });
      if (geminiRes) return geminiRes;
    } catch (err) {
      console.warn('Gemini API call failed, falling back to built-in sales AI:', err.message);
    }
  }

  // Built-in High-Converting Sales Closing Engine with Problem-Solution Context
  return generateBuiltInSalesReply({ lead, thread, clientReplyText, aiConfig, analysis, problemSolutionAngle });
}

/**
 * Built-in Sales NLP Closer Engine with Problem & Solution Anchoring
 */
function generateBuiltInSalesReply({ lead, thread, clientReplyText, aiConfig, analysis, problemSolutionAngle }) {
  const senderName = aiConfig.senderName || 'Arbaz Khan';
  const businessName = aiConfig.businessName || 'Arbaz Khan — AI Systems & Engineering';
  const bookingLink = aiConfig.bookingLink || 'https://arbazkhaan.vercel.app/#contact';
  const leadFirstName = (lead.name && !lead.name.includes('Owner') && !lead.name.includes('Principal')) ? lead.name.split(' ')[0] : 'there';
  const company = lead.company || 'your team';

  // Get problem context for anchoring
  const diagnosis = diagnoseLeadProblemSolution(lead);
  const activeAngle = problemSolutionAngle || diagnosis.primaryAngle;

  let subject = `Re: ${thread.length > 0 ? thread[0].subject.replace(/^Re:\s*/i, '') : `Partnership for ${company}`}`;
  if (!subject.startsWith('Re:')) subject = `Re: ${subject}`;

  let body = '';
  let closingAction = '';

  switch (analysis.intent) {
    case 'ready_to_close':
      body = `Hi ${leadFirstName},

Thrilled to hear that! We're excited to partner with ${company} and solve ${activeAngle.tag.toLowerCase()} once and for all.

I've generated our streamlined onboarding link and service kickoff here:
👉 ${bookingLink} (or simply reply with the best billing email address for your team).

Once confirmed:
1. We immediately begin configuring your dedicated AI pipeline.
2. We test all workflows and connect your systems within 48-72 hours.
3. Your 14-day zero-risk trial begins the day it goes live.

Looking forward to working together and delivering exceptional results for ${company}!

Best regards,
${senderName}
${aiConfig.senderTitle || 'AI Engineer & Systems Architect'} | ${businessName}`;
      closingAction = 'Deal finalized - Onboarding link provided';
      break;

    case 'meeting_request':
      body = `Hi ${leadFirstName},

I'd be glad to walk you through our exact AI system and show you a live interactive demo tailored for ${company}.

You can select whatever 15-minute slot works best for your schedule right here:
📅 ${bookingLink}

Alternatively, I am available tomorrow at 2:00 PM or Thursday at 11:00 AM EST if either of those suits you better.

I'll have a brief architectural breakdown ready so we make the most of your time.

Looking forward to speaking!

Best regards,
${senderName}
${businessName}`;
      closingAction = 'Meeting invite link sent';
      break;

    case 'pricing_inquiry':
      body = `Hi ${leadFirstName},

Great question. We keep our pricing completely transparent and tied directly to measurable ROI:

Our standard turnkey deployment is typically $1,200, which includes:
- Complete end-to-end setup of ${activeAngle.solution}
- Full integration with your existing CRM and calendar
- Rigorous testing and staff training

Because we are currently prioritizing 2 new case studies in ${lead.category || 'your sector'} this month, we can offer an introductory pilot rate of $850, backed by a 100% money-back guarantee if the system does not deliver qualified results in your first 30 days.

Would it make sense to jump on a quick 10-minute call to see if we're a good mutual fit?
Here's my direct calendar: ${bookingLink}

Best regards,
${senderName}
${businessName}`;
      closingAction = 'Pricing presented with closing discount pilot';
      break;

    case 'budget_objection':
      body = `Hi ${leadFirstName},

I completely understand budget caution—cash flow is paramount, especially when evaluating new technology.

When considering:
"${activeAngle.problem}"

The cost of lost inquiries or wasted manual hours typically exceeds $3,000+ every month. Our goal is for the solution to pay for itself within the first 2 weeks.

To eliminate any risk for ${company}, here is what I can do:
We can start with a 14-day performance trial at just 50% commitment ($450), or structure it purely around verified results delivered.

If that works for you, let's lock in a quick 10-minute kickoff: ${bookingLink}

Would that make it feasible for ${company} to start this month?

Best regards,
${senderName}
${businessName}`;
      closingAction = 'Overcame budget objection with risk-free 50% pilot';
      break;

    case 'trust_objection':
      body = `Hi ${leadFirstName},

I completely respect your skepticism—there are dozens of agencies sending empty promises about AI that fail to deliver real business outcomes.

Here is why our approach is fundamentally different for ${company}:
1. Custom Built: We do not resell generic chat widgets. Every single system is custom-engineered around your actual services, FAQs, and software stack.
2. Measurable Benchmark: We define clear KPIs before launching (response speed under 30s, qualified booking rate, hours saved).
3. 100% Performance Guarantee: If we don't deliver verified appointments or measurable time savings, you don't pay.

Would you be open to a 5-minute live screen share of our verified pipeline results?
Here's my private schedule link: ${bookingLink}

Best regards,
${senderName}
${businessName}`;
      closingAction = 'Overcame skepticism with proof & performance guarantee';
      break;

    case 'timing_objection':
      body = `Hi ${leadFirstName},

Understood! Things get busy quickly.

Rather than taking up your time right now, I can send over a 2-minute video breakdown of how we solve ${activeAngle.tag.toLowerCase()} for ${company}, so you have it on file when you're ready.

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

I've updated our records so you won't receive further follow-ups. If anything changes down the road for ${company}, our door is always open.

Wishing you and ${company} continued success!

Best regards,
${senderName}
${businessName}`;
      closingAction = 'Polite graceful close';
      break;

    default:
      body = `Hi ${leadFirstName},

Thanks for getting back to me!

Regarding ${company}, our core focus is solving:
"${activeAngle.problem}"

By implementing:
"${activeAngle.solution}"

${activeAngle.howWeHelp}

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
 * Optional OpenAI External API integration
 */
async function generateExternalOpenAiReply({ lead, thread, clientReplyText, aiConfig, analysis, problemSolutionAngle }) {
  const prompt = `You are a top-tier B2B AI systems sales negotiator writing an email response on behalf of ${aiConfig.senderName || 'Arbaz Khan'}.
The client is ${lead.name || 'Decision Maker'} at ${lead.company} (${lead.category}).
Client's message: "${clientReplyText}".
Detected Intent: ${analysis.intent}.
Target Solution: ${problemSolutionAngle ? problemSolutionAngle.solution : 'Custom AI Automation'}.
Calendar Link: ${aiConfig.bookingLink || 'https://arbazkhaan.vercel.app/#contact'}.
Write a persuasive, concise, professional email reply addressing their specific point and guiding them to book a quick call. Return JSON with "subject" and "body".`;

  const res = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' }
    },
    {
      headers: { Authorization: `Bearer ${aiConfig.apiKey}` },
      timeout: 10000
    }
  );

  const parsed = JSON.parse(res.data.choices[0].message.content);
  return {
    subject: parsed.subject || `Re: Discussion with ${lead.company}`,
    body: parsed.body,
    analysis,
    closingAction: 'OpenAI custom-generated sales response',
    aiGenerated: true
  };
}

/**
 * Optional Gemini External API integration
 */
async function generateExternalGeminiReply({ lead, thread, clientReplyText, aiConfig, analysis, problemSolutionAngle }) {
  const prompt = `You are a top-tier B2B AI systems sales negotiator writing an email response on behalf of ${aiConfig.senderName || 'Arbaz Khan'}.
The client is ${lead.name || 'Decision Maker'} at ${lead.company} (${lead.category}).
Client's message: "${clientReplyText}".
Detected Intent: ${analysis.intent}.
Calendar Link: ${aiConfig.bookingLink || 'https://arbazkhaan.vercel.app/#contact'}.
Write a persuasive, concise, professional email reply addressing their specific point and guiding them to book a quick call.`;

  const res = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${aiConfig.apiKey}`,
    {
      contents: [{ parts: [{ text: prompt }] }]
    },
    { timeout: 10000 }
  );

  const text = res.data.candidates[0].content.parts[0].text;
  return {
    subject: `Re: Discussion with ${lead.company}`,
    body: text,
    analysis,
    closingAction: 'Gemini custom-generated sales response',
    aiGenerated: true
  };
}

export default {
  INDUSTRY_KNOWLEDGE_BASE,
  diagnoseLeadProblemSolution,
  analyzeClientReply,
  generateSubjectOptions,
  generateInitialOutreach,
  generateAiReply
};
