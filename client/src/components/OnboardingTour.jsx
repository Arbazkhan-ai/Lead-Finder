import React, { useState } from 'react';
import { 
  Sparkles, 
  Bot, 
  Mail, 
  Search, 
  Layers, 
  Send, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  ShieldCheck, 
  MapPin, 
  Sliders, 
  X, 
  Compass, 
  Zap, 
  EyeOff
} from 'lucide-react';

export default function OnboardingTour({ isOpen, onClose, onOpenSettings, onNavigateTab }) {
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const steps = [
    {
      title: "Welcome to LeadsFlow AI Platform",
      subtitle: "Autonomous Lead Generation, AI Website Audits & 1-Click Outreach",
      icon: Sparkles,
      iconBg: "bg-blue-600 text-white",
      content: (
        <div className="space-y-4">
          <p className="text-sm text-slate-600 leading-relaxed">
            Welcome! This platform is an autonomous sales engine designed to discover high-value business leads, diagnose their website conversion bottlenecks, and close client retainers on autopilot.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 space-y-1.5">
              <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                1
              </div>
              <h5 className="font-bold text-xs text-slate-900">Multi-Scraper</h5>
              <p className="text-[11px] text-slate-600">Scrapes verified businesses, phones, emails, and social profiles worldwide.</p>
            </div>
            <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-200 space-y-1.5">
              <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                2
              </div>
              <h5 className="font-bold text-xs text-slate-900">AI Website Audit</h5>
              <p className="text-[11px] text-slate-600">Diagnoses broken mobile UI, missing booking systems, and revenue leaks.</p>
            </div>
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 space-y-1.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                3
              </div>
              <h5 className="font-bold text-xs text-slate-900">1-Click Deal Closer</h5>
              <p className="text-[11px] text-slate-600">Dispatches executive HTML pitches & counters client objections autonomously.</p>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center space-x-2">
            <EyeOff className="w-4 h-4 text-slate-500 shrink-0" />
            <span><strong>Private Session:</strong> Your setup, credentials, and leads are saved securely to your browser storage and will never be shared with other visitors.</span>
          </div>
        </div>
      )
    },
    {
      title: "Step 1: Your Business Profile & Pitch Offer",
      subtitle: "Tailor the AI closer to pitch your exact agency or service",
      icon: Bot,
      iconBg: "bg-indigo-600 text-white",
      content: (
        <div className="space-y-4">
          <p className="text-sm text-slate-600 leading-relaxed">
            The AI closer generates tailored pitches quoting your business name, portfolio case studies, and scheduling link.
          </p>
          <div className="space-y-2.5 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
            <div className="flex items-start space-x-2.5">
              <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 font-bold text-[10px]">✓</div>
              <div>
                <strong className="text-slate-800">Sender Name &amp; Title:</strong>
                <p className="text-slate-500 text-[11px]">e.g. "Sarah Jenkins — Lead AI Solutions Architect"</p>
              </div>
            </div>
            <div className="flex items-start space-x-2.5">
              <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 font-bold text-[10px]">✓</div>
              <div>
                <strong className="text-slate-800">Your Core Pitch Offer &amp; Pricing:</strong>
                <p className="text-slate-500 text-[11px]">Define your pricing model (e.g. $1,500/mo retainer) and free proof-of-concept audit.</p>
              </div>
            </div>
            <div className="flex items-start space-x-2.5">
              <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 font-bold text-[10px]">✓</div>
              <div>
                <strong className="text-slate-800">Calendar Booking Link:</strong>
                <p className="text-slate-500 text-[11px]">Your Calendly or contact URL embedded in every executive signature button.</p>
              </div>
            </div>
          </div>
          <p className="text-xs text-slate-500">
            You can customize these anytime via the <strong>Platform Configuration (⚙️)</strong> modal in the top right.
          </p>
        </div>
      )
    },
    {
      title: "Step 2: Email Sending & Simulation Mode",
      subtitle: "Practice safely in simulation mode, or connect your Gmail for real outreach",
      icon: Mail,
      iconBg: "bg-amber-600 text-white",
      content: (
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
            <div className="flex items-center space-x-2 text-amber-900 font-bold text-xs">
              <ShieldCheck className="w-4 h-4 text-amber-600" />
              <span>Safe Testing &amp; Simulation Mode (Active by Default)</span>
            </div>
            <p className="text-xs text-amber-800 leading-relaxed">
              When simulation mode is active, you can test generating pitches, auto-replies, and deal closing without sending real emails to client inboxes. All emails are previewed and logged in your dashboard.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2">
            <div className="flex items-center space-x-2 text-emerald-900 font-bold text-xs">
              <Zap className="w-4 h-4 text-emerald-600" />
              <span>Ready for Real Outreach? Connect Your Gmail (30 seconds)</span>
            </div>
            <ol className="list-decimal list-inside space-y-1 text-emerald-800 text-xs">
              <li>Open <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" className="underline font-bold text-emerald-900">Google App Passwords</a> (requires 2-Step Verification on Google).</li>
              <li>Create app password name: <code className="bg-white/80 px-1 py-0.5 rounded text-[11px]">Lead Finder</code>.</li>
              <li>Paste the 16-character code into <strong>Settings &rarr; SMTP Password</strong>.</li>
              <li>Click <strong>Send Test Email</strong> to verify, and you're live!</li>
            </ol>
          </div>
        </div>
      )
    },
    {
      title: "Step 3: Multi-Scraper & Lead Discovery",
      subtitle: "Discover businesses via Google Maps, OpenStreetMap, or Scraper Upload",
      icon: Search,
      iconBg: "bg-purple-600 text-white",
      content: (
        <div className="space-y-4">
          <p className="text-sm text-slate-600 leading-relaxed">
            There are 3 flexible ways to find prospects inside the <strong>Multi-Scraper</strong> tab:
          </p>
          <div className="space-y-2.5">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-start space-x-3">
              <MapPin className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-800">1. Instant OpenStreetMap Search (Free / No Key Required):</strong>
                <p className="text-slate-500 text-[11px]">Search any niche in any city (e.g. "Dental clinics in Austin, TX" or "Law firms in Miami").</p>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-start space-x-3">
              <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-800">2. Google Places &amp; SerpAPI Integration:</strong>
                <p className="text-slate-500 text-[11px]">Add your personal SerpAPI or Google Places key in Settings &rarr; Google Maps for live Google ranking data.</p>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-start space-x-3">
              <Layers className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-800">3. Upload Existing Scraper / CSV / Excel:</strong>
                <p className="text-slate-500 text-[11px]">Drop any spreadsheet with companies, websites, or emails to audit and reach out in bulk.</p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "You're All Set to Start Closing Deals!",
      subtitle: "Explore the demo pipeline or find your first 20 clients today",
      icon: CheckCircle2,
      iconBg: "bg-emerald-600 text-white",
      content: (
        <div className="space-y-4">
          <p className="text-sm text-slate-600 leading-relaxed">
            Your platform is ready. You can explore the demo pipeline to see how AI conversations and deal negotiations work, or start discovering your own client leads right now.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                if (onNavigateTab) onNavigateTab('finder');
              }}
              className="p-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs text-left shadow-sm transition-all space-y-1 group"
            >
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-sm">Launch Multi-Scraper &rarr;</span>
                <Search className="w-4 h-4 group-hover:scale-110 transition-transform" />
              </div>
              <p className="text-blue-100 text-[11px] font-normal">Search your city for local business leads with verified websites and emails.</p>
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                if (onOpenSettings) onOpenSettings('ai');
              }}
              className="p-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs text-left shadow-sm transition-all space-y-1 group"
            >
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-sm">Configure My Offer ⚙️</span>
                <Sliders className="w-4 h-4 group-hover:scale-110 transition-transform" />
              </div>
              <p className="text-slate-300 text-[11px] font-normal">Customize your business name, email address, pricing, and booking link.</p>
            </button>
          </div>
        </div>
      )
    }
  ];

  const current = steps[currentStep];
  const StepIcon = current.icon;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-2xl ${current.iconBg} flex items-center justify-center shadow-md`}>
              <StepIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">
                Step {currentStep + 1} of {steps.length}
              </div>
              <h3 className="font-extrabold text-slate-900 text-base">
                {current.title}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            title="Skip tour"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <div className="text-xs font-semibold text-slate-400 mb-2">
            {current.subtitle}
          </div>
          {current.content}
        </div>

        {/* Footer Navigation */}
        <div className="p-4 px-6 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center space-x-1.5">
            {steps.map((_, idx) => (
              <span
                key={idx}
                className={`h-2 rounded-full transition-all duration-300 ${
                  idx === currentStep ? 'w-6 bg-blue-600' : 'w-2 bg-slate-300'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center space-x-2">
            {currentStep > 0 && (
              <button
                type="button"
                onClick={handleBack}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 transition-colors flex items-center space-x-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleNext}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold shadow-sm transition-all flex items-center space-x-1.5"
            >
              <span>{currentStep === steps.length - 1 ? 'Get Started' : 'Next Step'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
