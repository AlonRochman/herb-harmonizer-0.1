import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronDown, BookOpen, FlaskConical, Brain, Leaf,
  Sparkles, ShieldCheck, Clock, ArrowRight, Search,
  Zap, Heart, Moon, AlertCircle,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface FAQItem {
  q: string;
  a: React.ReactNode;
  tags?: string[];
}

interface FAQSection {
  id: string;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  title: string;
  subtitle: string;
  items: FAQItem[];
}

// ─── Content ──────────────────────────────────────────────────────────────────
const SECTIONS: FAQSection[] = [
  {
    id: "basics",
    icon: Leaf,
    iconColor: "text-emerald-700",
    iconBg: "bg-emerald-50",
    title: "Medical cannabis basics",
    subtitle: "Essential knowledge for new patients",
    items: [
      {
        q: "What is medical cannabis?",
        tags: ["beginner", "overview"],
        a: (
          <div className="space-y-3">
            <p>Medical cannabis refers to the use of the cannabis plant — or its active compounds — to treat symptoms and conditions under medical supervision. Unlike recreational use, medical cannabis is prescribed by a licensed physician and administered at controlled doses.</p>
            <p>The plant contains over 100 active compounds called <strong>cannabinoids</strong>. The two most studied are THC (tetrahydrocannabinol) and CBD (cannabidiol), each with distinct therapeutic properties.</p>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <p className="text-[11px] font-bold uppercase tracking-wide text-amber-700 mb-1">THC</p>
                <p className="text-[12px] text-amber-800">Psychoactive compound. Effective for pain, nausea, and appetite stimulation.</p>
              </div>
              <div className="bg-teal-50 border border-teal-200 rounded-xl p-3">
                <p className="text-[11px] font-bold uppercase tracking-wide text-teal-700 mb-1">CBD</p>
                <p className="text-[12px] text-teal-800">Non-psychoactive. Anti-inflammatory, anxiolytic, and anti-epileptic properties.</p>
              </div>
            </div>
          </div>
        ),
      },
      {
        q: "What conditions can medical cannabis treat?",
        tags: ["conditions", "indications"],
        a: (
          <div className="space-y-3">
            <p>Medical cannabis has shown therapeutic benefit for a range of conditions. Evidence strength varies — some indications have robust clinical data, others are based on observational studies.</p>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {[
                { label: "Chronic Pain",       strength: "Strong",   color: "bg-emerald-100 text-emerald-800 border-emerald-300" },
                { label: "Insomnia",           strength: "Strong",   color: "bg-emerald-100 text-emerald-800 border-emerald-300" },
                { label: "Anxiety",            strength: "Moderate", color: "bg-amber-100 text-amber-800 border-amber-300" },
                { label: "PTSD",               strength: "Moderate", color: "bg-amber-100 text-amber-800 border-amber-300" },
                { label: "Chemo Nausea",       strength: "Strong",   color: "bg-emerald-100 text-emerald-800 border-emerald-300" },
                { label: "Epilepsy",           strength: "Strong",   color: "bg-emerald-100 text-emerald-800 border-emerald-300" },
                { label: "Multiple Sclerosis", strength: "Moderate", color: "bg-amber-100 text-amber-800 border-amber-300" },
                { label: "Fibromyalgia",       strength: "Emerging", color: "bg-slate-100 text-slate-600 border-slate-300" },
              ].map(({ label, strength, color }) => (
                <div key={label} className={`flex items-center justify-between rounded-lg px-3 py-2 border ${color}`}>
                  <span className="text-[12px] font-medium">{label}</span>
                  <span className="text-[10px] font-semibold opacity-70">{strength}</span>
                </div>
              ))}
            </div>
          </div>
        ),
      },
      {
        q: "How do I get a medical cannabis prescription in Israel?",
        tags: ["license", "prescription", "israel"],
        a: (
          <div className="space-y-3">
            <p>In Israel, medical cannabis is regulated by the Ministry of Health. The process involves several steps:</p>
            <ol className="space-y-2">
              {[
                { n: "1", title: "Specialist referral", desc: "Your primary physician refers you to a licensed cannabis specialist." },
                { n: "2", title: "Medical evaluation", desc: "The specialist reviews your condition, medical history, and previous treatments." },
                { n: "3", title: "License application", desc: "If approved, the doctor submits a request to the Ministry of Health on your behalf." },
                { n: "4", title: "License issued", desc: "You receive a personal license specifying the approved category (e.g. T20/C4)." },
                { n: "5", title: "Pharmacy purchase", desc: "Use your license at an authorized pharmacy to purchase the prescribed category." },
              ].map(({ n, title, desc }) => (
                <li key={n} className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">{n}</span>
                  <div>
                    <p className="text-[13px] font-semibold text-slate-800">{title}</p>
                    <p className="text-[12px] text-slate-500">{desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        ),
      },
    ],
  },
  {
    id: "cannabinoids",
    icon: FlaskConical,
    iconColor: "text-purple-700",
    iconBg: "bg-purple-50",
    title: "THC, CBD & cannabinoids",
    subtitle: "Understanding the active compounds",
    items: [
      {
        q: "What is THC and what does it do?",
        tags: ["THC", "cannabinoids"],
        a: (
          <div className="space-y-3">
            <p><strong>Tetrahydrocannabinol (THC)</strong> is the primary psychoactive compound in cannabis. It binds to CB1 receptors in the brain and nervous system, producing the characteristic "high" alongside therapeutic effects.</p>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-wide text-amber-700">Therapeutic uses</p>
              <ul className="space-y-1 text-[12px] text-amber-900">
                {["Pain relief (analgesic)", "Anti-nausea, appetite stimulation", "Muscle relaxation and spasm reduction", "Sleep induction at higher doses", "Mood elevation in low doses"].map(u => (
                  <li key={u} className="flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-amber-500 inline-block shrink-0" />{u}</li>
                ))}
              </ul>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex gap-2">
              <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-[12px] text-red-700">High THC doses may cause anxiety, paranoia, or cognitive impairment. Start low, go slow — especially elderly or first-time patients.</p>
            </div>
          </div>
        ),
      },
      {
        q: "What is CBD and how is it different from THC?",
        tags: ["CBD", "cannabinoids"],
        a: (
          <div className="space-y-3">
            <p><strong>Cannabidiol (CBD)</strong> is non-psychoactive — it does not produce a "high." It works primarily on CB2 receptors and indirectly modulates the endocannabinoid system, offering therapeutic benefit without cognitive impairment.</p>
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-3 py-2 text-slate-500 font-semibold">Property</th>
                    <th className="text-center px-3 py-2 text-amber-700 font-semibold">THC</th>
                    <th className="text-center px-3 py-2 text-teal-700 font-semibold">CBD</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[
                    ["Psychoactive",       "Yes ⚠️",  "No ✓"],
                    ["Anxiety relief",     "Low dose", "Yes ✓"],
                    ["Pain relief",        "Strong",   "Moderate"],
                    ["Anti-epileptic",     "Minimal",  "Strong ✓"],
                    ["Anti-inflammatory",  "Moderate", "Strong ✓"],
                    ["Sleep induction",    "Yes ✓",   "Indirect"],
                  ].map(([prop, thc, cbd]) => (
                    <tr key={prop} className="hover:bg-slate-50/50">
                      <td className="px-3 py-2 text-slate-700 font-medium">{prop}</td>
                      <td className="px-3 py-2 text-center text-amber-700">{thc}</td>
                      <td className="px-3 py-2 text-center text-teal-700">{cbd}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ),
      },
      {
        q: "What are terpenes and why do they matter?",
        tags: ["terpenes", "entourage effect"],
        a: (
          <div className="space-y-3">
            <p>Terpenes are aromatic compounds found in cannabis (and many other plants) that contribute to the plant's scent and flavour. Critically, they also have direct therapeutic effects and work synergistically with cannabinoids — a phenomenon called the <strong>entourage effect</strong>.</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { name: "Myrcene",       icon: Moon,        color: "bg-green-50 border-green-200 text-green-800",  effect: "Sedating, muscle relaxant, earthy" },
                { name: "Linalool",      icon: Heart,       color: "bg-purple-50 border-purple-200 text-purple-800", effect: "Calming, anti-anxiety, floral" },
                { name: "Limonene",      icon: Zap,         color: "bg-yellow-50 border-yellow-200 text-yellow-800", effect: "Uplifting, mood-enhancing, citrus" },
                { name: "Caryophyllene", icon: FlaskConical,color: "bg-orange-50 border-orange-200 text-orange-800", effect: "Anti-inflammatory, spicy" },
                { name: "Pinene",        icon: Brain,       color: "bg-teal-50 border-teal-200 text-teal-800",      effect: "Alertness, memory, pine" },
                { name: "Terpinolene",   icon: Leaf,        color: "bg-blue-50 border-blue-200 text-blue-800",      effect: "Mildly sedating, antioxidant" },
              ].map(({ name, icon: Icon, color, effect }) => (
                <div key={name} className={`border rounded-xl p-2.5 ${color}`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <Icon className="h-3 w-3 shrink-0" />
                    <span className="text-[12px] font-semibold">{name}</span>
                  </div>
                  <p className="text-[11px] opacity-80">{effect}</p>
                </div>
              ))}
            </div>
          </div>
        ),
      },
      {
        q: "What do the T and C numbers on my license mean?",
        tags: ["license", "T22/C4", "categories"],
        a: (
          <div className="space-y-3">
            <p>Israeli medical cannabis licenses use a <strong>T/C category system</strong> defined by the Ministry of Health. The <strong>T</strong> indicates the maximum allowed THC percentage, and the <strong>C</strong> indicates the minimum required CBD percentage.</p>
            <div className="space-y-2">
              {[
                { cat: "T20/C4",   thc: "Up to 20%", cbd: "Min. 4%",  desc: "Balanced — common for pain and insomnia" },
                { cat: "T22/C4",   thc: "Up to 22%", cbd: "Min. 4%",  desc: "Higher THC — for chronic or severe pain" },
                { cat: "T10/C10",  thc: "Up to 10%", cbd: "Min. 10%", desc: "Balanced ratio — anxiety, inflammation" },
                { cat: "T1/CBD",   thc: "Up to 1%",  cbd: "High CBD", desc: "Near-zero THC — epilepsy, children" },
              ].map(({ cat, thc, cbd, desc }) => (
                <div key={cat} className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">
                  <span className="font-mono font-bold text-emerald-700 text-[13px] w-20 shrink-0">{cat}</span>
                  <div className="flex gap-2 text-[11px] shrink-0">
                    <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-medium">{thc}</span>
                    <span className="bg-teal-100 text-teal-800 px-2 py-0.5 rounded-full font-medium">{cbd}</span>
                  </div>
                  <span className="text-[12px] text-slate-500">{desc}</span>
                </div>
              ))}
            </div>
          </div>
        ),
      },
    ],
  },
  {
    id: "algorithm",
    icon: Brain,
    iconColor: "text-blue-700",
    iconBg: "bg-blue-50",
    title: "How the algorithm works",
    subtitle: "Inside the recommendation engine",
    items: [
      {
        q: "How does MediCanna generate recommendations?",
        tags: ["algorithm", "AI", "how it works"],
        a: (
          <div className="space-y-3">
            <p>The MediCanna recommendation engine uses a <strong>rule-based hybrid scoring algorithm</strong>. It does not use black-box machine learning — every decision is explainable and auditable by your physician.</p>
            <div className="space-y-2">
              {[
                {
                  step: "1",
                  title: "Clinical filtering",
                  desc: "Strains that exceed your licensed THC maximum or fall below your minimum CBD are immediately excluded.",
                  color: "bg-red-50 border-red-200",
                  badge: "bg-red-100 text-red-700",
                },
                {
                  step: "2",
                  title: "Condition matching",
                  desc: "Your primary medical condition is matched against each strain's documented medical uses. A direct match scores +50 points.",
                  color: "bg-amber-50 border-amber-200",
                  badge: "bg-amber-100 text-amber-700",
                },
                {
                  step: "3",
                  title: "Category scoring",
                  desc: "Indica strains score higher for pain, insomnia, and PTSD. Sativa for depression and fatigue. Hybrid for anxiety.",
                  color: "bg-purple-50 border-purple-200",
                  badge: "bg-purple-100 text-purple-700",
                },
                {
                  step: "4",
                  title: "Terpene bonuses",
                  desc: "Known terpene-condition relationships (e.g. Linalool for anxiety, Myrcene for sleep) add +15 points per match.",
                  color: "bg-blue-50 border-blue-200",
                  badge: "bg-blue-100 text-blue-700",
                },
                {
                  step: "5",
                  title: "Age adjustments",
                  desc: "For patients over 60, strains with THC > 20% receive a -15 point penalty to prioritise safety.",
                  color: "bg-slate-50 border-slate-200",
                  badge: "bg-slate-100 text-slate-600",
                },
                {
                  step: "6",
                  title: "Top 3 output",
                  desc: "All qualifying strains are ranked by total score. The top 3 are shown with their score and clinical rationale.",
                  color: "bg-emerald-50 border-emerald-200",
                  badge: "bg-emerald-100 text-emerald-700",
                },
              ].map(({ step, title, desc, color, badge }) => (
                <div key={step} className={`flex gap-3 border rounded-xl p-3 ${color}`}>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full h-fit shrink-0 ${badge}`}>
                    Step {step}
                  </span>
                  <div>
                    <p className="text-[13px] font-semibold text-slate-800">{title}</p>
                    <p className="text-[12px] text-slate-600 mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ),
      },
      {
        q: "What is the match percentage score?",
        tags: ["score", "match", "percentage"],
        a: (
          <div className="space-y-3">
            <p>The <strong>match percentage</strong> shown on each recommendation card is a normalised score (capped at 98%) reflecting how well a strain aligns with your specific medical profile.</p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { range: "70–98%", label: "Excellent", color: "bg-emerald-50 border-emerald-300 text-emerald-800", desc: "Strong multi-factor alignment" },
                { range: "40–69%", label: "Good",      color: "bg-amber-50 border-amber-300 text-amber-800",   desc: "Partial match, worth considering" },
                { range: "1–39%",  label: "Weak",      color: "bg-slate-50 border-slate-300 text-slate-600",   desc: "Category/safety match only" },
              ].map(({ range, label, color, desc }) => (
                <div key={label} className={`border rounded-xl p-3 text-center ${color}`}>
                  <p className="text-[15px] font-bold">{range}</p>
                  <p className="text-[11px] font-semibold mt-0.5">{label}</p>
                  <p className="text-[10px] opacity-70 mt-1">{desc}</p>
                </div>
              ))}
            </div>
            <p className="text-[12px] text-slate-500">The score is intentionally capped at 98% to reflect that no algorithm can guarantee a perfect clinical match — your physician's judgment remains essential.</p>
          </div>
        ),
      },
      {
        q: "Does the algorithm learn from my feedback?",
        tags: ["feedback", "learning", "personalisation"],
        a: (
          <div className="space-y-3">
            <p>Yes — partially. The current version uses your submitted feedback (effectiveness scores and side effect reports) to build a longitudinal treatment history. This data is used in future recommendation cycles to:</p>
            <ul className="space-y-2">
              {[
                "Identify patterns between strain profiles and your reported outcomes",
                "Flag strains you've reported poor tolerance or side effects for",
                "Surface strains that worked well for patients with similar profiles",
                "Enable your physician to review efficacy trends over time",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-[13px] text-slate-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 mt-1.5" />
                  {item}
                </li>
              ))}
            </ul>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex gap-2">
              <Sparkles className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
              <p className="text-[12px] text-blue-700">The more feedback you submit, the more personalised future recommendations become. Even a single session report significantly improves the engine's accuracy for your profile.</p>
            </div>
          </div>
        ),
      },
      {
        q: "Is the recommendation a medical prescription?",
        tags: ["disclaimer", "legal", "prescription"],
        a: (
          <div className="space-y-3">
            <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 flex gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-[13px] font-semibold text-amber-800 mb-1">Important disclaimer</p>
                <p className="text-[12px] text-amber-700 leading-relaxed">MediCanna recommendations are <strong>clinical decision support</strong>, not prescriptions. They are intended to assist — not replace — the judgment of a licensed physician.</p>
              </div>
            </div>
            <p>All recommendations must be reviewed and approved by your treating physician before purchase or use. The algorithm cannot account for:</p>
            <ul className="space-y-1 text-[12px] text-slate-600">
              {[
                "Drug-drug interactions with your current medications",
                "Contraindications specific to your full medical history",
                "Individual pharmacokinetic variability",
                "Changes in your condition since your last profile update",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0 mt-1.5" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ),
      },
    ],
  },
  {
    id: "usage",
    icon: Clock,
    iconColor: "text-orange-700",
    iconBg: "bg-orange-50",
    title: "Dosing & safe use",
    subtitle: "Practical guidance for patients",
    items: [
      {
        q: "What are the main consumption methods?",
        tags: ["consumption", "dosing", "methods"],
        a: (
          <div className="space-y-2">
            {[
              { method: "Dried flower (vaporiser)", onset: "5–15 min",  duration: "2–3 hrs",  best: "Fast-acting pain or anxiety relief" },
              { method: "Oil drops (sublingual)",   onset: "15–45 min", duration: "4–6 hrs",  best: "Consistent daily dosing" },
              { method: "Capsules",                 onset: "30–90 min", duration: "6–8 hrs",  best: "Precise, long-lasting effect" },
              { method: "Joints / smoking",         onset: "5–10 min",  duration: "2–3 hrs",  best: "Fast relief, but lung risk" },
              { method: "Topical",                  onset: "30–60 min", duration: "2–4 hrs",  best: "Localised pain, no systemic effect" },
            ].map(({ method, onset, duration, best }) => (
              <div key={method} className="grid grid-cols-4 gap-2 items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">
                <span className="text-[12px] font-semibold text-slate-800 col-span-2">{method}</span>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-slate-400">Onset</span>
                  <span className="text-[11px] font-medium text-slate-700">{onset}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-slate-400">Duration</span>
                  <span className="text-[11px] font-medium text-slate-700">{duration}</span>
                </div>
                <p className="text-[11px] text-slate-500 col-span-4 pt-1 border-t border-slate-100">{best}</p>
              </div>
            ))}
          </div>
        ),
      },
      {
        q: "What is the 'start low, go slow' principle?",
        tags: ["dosing", "beginner", "safety"],
        a: (
          <div className="space-y-3">
            <p><strong>"Start low, go slow"</strong> is the universal clinical guideline for medical cannabis. Individual response to cannabis varies significantly based on genetics, tolerance, body weight, and metabolism.</p>
            <div className="space-y-2">
              {[
                { title: "Start with the lowest effective dose", desc: "Begin at the minimum dose your physician recommends — typically 0.1g dried flower or 2–3 drops of oil." },
                { title: "Wait for full effect",                 desc: "Do not re-dose until the initial dose has fully taken effect. Oil can take up to 90 minutes." },
                { title: "Titrate gradually",                    desc: "Increase by small increments only after 3–5 days at the same dose, if needed." },
                { title: "Keep a usage log",                     desc: "Track dose, method, timing, and effects. Use the Feedback feature to log every session." },
              ].map(({ title, desc }) => (
                <div key={title} className="flex gap-3 items-start">
                  <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[13px] font-semibold text-slate-800">{title}</p>
                    <p className="text-[12px] text-slate-500 mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ),
      },
    ],
  },
];

// ─── Accordion item ───────────────────────────────────────────────────────────
const AccordionItem = ({ item, isOpen, onToggle }: {
  item: FAQItem;
  isOpen: boolean;
  onToggle: () => void;
}) => (
  <div className={`border rounded-xl overflow-hidden transition-all duration-200 ${
    isOpen ? "border-emerald-200 shadow-sm" : "border-slate-200"
  }`}>
    <button
      onClick={onToggle}
      className={`w-full flex items-center justify-between px-4 py-3.5 text-left transition-colors ${
        isOpen ? "bg-emerald-50/60" : "bg-white hover:bg-slate-50"
      }`}
    >
      <span className={`text-[14px] font-semibold pr-4 leading-snug ${
        isOpen ? "text-emerald-800" : "text-slate-800"
      }`}>
        {item.q}
      </span>
      <ChevronDown
        className={`h-4 w-4 shrink-0 transition-transform duration-200 ${
          isOpen ? "rotate-180 text-emerald-600" : "text-slate-400"
        }`}
      />
    </button>

    {/* Animated panel */}
    <div
      className="overflow-hidden transition-all duration-300"
      style={{ maxHeight: isOpen ? "2000px" : "0px" }}
    >
      <div className="px-4 py-4 bg-white border-t border-slate-100 text-[13px] text-slate-600 leading-relaxed">
        {item.a}
        {item.tags && (
          <div className="flex flex-wrap gap-1.5 mt-4 pt-3 border-t border-slate-100">
            {item.tags.map((tag) => (
              <span key={tag} className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  </div>
);

// ─── Main page ────────────────────────────────────────────────────────────────
const InfoCenterPage = () => {
  const navigate = useNavigate();
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const toggle = (key: string) =>
    setOpenItems((prev) => ({ ...prev, [key]: !prev[key] }));

  // Filter by search
  const filteredSections = SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter(
      (item) =>
        !searchQuery ||
        item.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.tags?.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()))
    ),
  })).filter((s) =>
    (!activeSection || s.id === activeSection) && s.items.length > 0
  );

  const totalResults = filteredSections.reduce((n, s) => n + s.items.length, 0);

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-500">

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <div
        className="rounded-2xl p-8 text-white relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #0a2d1e 0%, #0f4d32 60%, #136040 100%)" }}
      >
        {/* Decorative dots */}
        <div className="absolute top-4 right-6 w-32 h-32 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #22c55e, transparent)" }} />

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 mb-4 px-3 py-1 rounded-full bg-white/15 border border-white/10 text-emerald-200 text-[11px] font-semibold uppercase tracking-wide">
            <BookOpen className="h-3.5 w-3.5" />
            Knowledge centre
          </div>
          <h1 className="text-2xl font-bold mb-2 tracking-tight">
            Everything you need to know
          </h1>
          <p className="text-emerald-200/80 text-[14px] mb-6 max-w-lg leading-relaxed">
            Clinical guides on medical cannabis, cannabinoids, terpenes, and how our recommendation algorithm works.
          </p>

          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search guides and FAQs…"
              className="w-full h-11 rounded-xl pl-10 pr-4 text-[13px] bg-white text-slate-800 placeholder-slate-400 outline-none focus:ring-2 focus:ring-emerald-400/60"
            />
          </div>
        </div>
      </div>

      {/* ── SECTION FILTER TABS ───────────────────────────────────────────── */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setActiveSection(null)}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12px] font-semibold border transition-all ${
            !activeSection
              ? "bg-slate-900 text-white border-slate-900"
              : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
          }`}
        >
          All topics
        </button>
        {SECTIONS.map((s) => {
          const Icon = s.icon;
          const isActive = activeSection === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setActiveSection(isActive ? null : s.id)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12px] font-semibold border transition-all ${
                isActive
                  ? `${s.iconBg} ${s.iconColor} border-current`
                  : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
              }`}
            >
              <Icon className={`h-3.5 w-3.5 ${isActive ? s.iconColor : ""}`} />
              {s.title.split(" ")[0]}
            </button>
          );
        })}
      </div>

      {/* Search result count */}
      {searchQuery && (
        <p className="text-[13px] text-slate-500 -mt-4">
          {totalResults === 0
            ? `No results for "${searchQuery}"`
            : `${totalResults} result${totalResults !== 1 ? "s" : ""} for "${searchQuery}"`}
        </p>
      )}

      {/* ── SECTIONS ─────────────────────────────────────────────────────── */}
      {filteredSections.map((section) => {
        const Icon = section.icon;
        return (
          <div key={section.id} className="space-y-3">
            {/* Section header */}
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${section.iconBg}`}>
                <Icon className={`h-5 w-5 ${section.iconColor}`} />
              </div>
              <div>
                <h2 className="text-[16px] font-bold text-slate-900">{section.title}</h2>
                <p className="text-[12px] text-slate-400">{section.subtitle}</p>
              </div>
              <span className="ml-auto text-[11px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                {section.items.length} guides
              </span>
            </div>

            {/* Accordion items */}
            <div className="space-y-2">
              {section.items.map((item, i) => {
                const key = `${section.id}-${i}`;
                return (
                  <AccordionItem
                    key={key}
                    item={item}
                    isOpen={!!openItems[key]}
                    onToggle={() => toggle(key)}
                  />
                );
              })}
            </div>
          </div>
        );
      })}

      {/* ── BOTTOM CTA ───────────────────────────────────────────────────── */}
      {!searchQuery && !activeSection && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-4">
          <div className="flex-1 text-center sm:text-left">
            <p className="text-[15px] font-bold text-emerald-900 mb-1">
              Ready to get your personalised recommendation?
            </p>
            <p className="text-[13px] text-emerald-700">
              Our algorithm matches your medical profile to the most suitable strains.
            </p>
          </div>
          <button
            onClick={() => navigate("/recommendations")}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-[13px] font-semibold transition-colors shrink-0"
          >
            <Sparkles className="h-4 w-4" />
            Get recommendations
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};

export default InfoCenterPage;
