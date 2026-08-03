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

// Sections used to carry an iconColor/iconBg pair each (emerald, violet, blue,
// orange). Four hues for four chapters of a reference document encoded nothing,
// and this page is where a reader learns that resin means THC and clinic means
// CBD — spending colour on chapter headings here would teach the opposite.
interface FAQSection {
  id: string;
  icon: React.ElementType;
  title: string;
  subtitle: string;
  items: FAQItem[];
}

// ─── Shared answer-body styling ───────────────────────────────────────────────
const H = ({ children }: { children: React.ReactNode }) => (
  <p className="font-data text-[10px] uppercase tracking-[0.14em] text-ink/45">{children}</p>
);

// The evidence ladder from the recommendations page: grade is carried by ink
// weight, not by a traffic-light palette.
const GRADE_WEIGHT: Record<string, string> = {
  Strong:   "text-ink font-semibold",
  Moderate: "text-ink/70 font-medium",
  Emerging: "text-ink/45",
};

// ─── Content ──────────────────────────────────────────────────────────────────
const SECTIONS: FAQSection[] = [
  {
    id: "basics",
    icon: Leaf,
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
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="border border-rule border-l-2 border-l-resin p-3">
                <p className="mb-1 font-data text-[10px] uppercase tracking-[0.12em] text-resin">THC</p>
                <p className="text-[12px] text-ink/70">Psychoactive compound. Effective for pain, nausea, and appetite stimulation.</p>
              </div>
              <div className="border border-rule border-l-2 border-l-clinic p-3">
                <p className="mb-1 font-data text-[10px] uppercase tracking-[0.12em] text-clinic">CBD</p>
                <p className="text-[12px] text-ink/70">Non-psychoactive. Anti-inflammatory, anxiolytic, and anti-epileptic properties.</p>
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
            <div className="mt-2 divide-y divide-rule border border-rule">
              {[
                { label: "Chronic Pain",       strength: "Strong"   },
                { label: "Insomnia",           strength: "Strong"   },
                { label: "Anxiety",            strength: "Moderate" },
                { label: "PTSD",               strength: "Moderate" },
                { label: "Chemo Nausea",       strength: "Strong"   },
                { label: "Epilepsy",           strength: "Strong"   },
                { label: "Multiple Sclerosis", strength: "Moderate" },
                { label: "Fibromyalgia",       strength: "Emerging" },
              ].map(({ label, strength }) => (
                <div key={label} className="flex items-center justify-between px-3 py-2">
                  <span className="text-[12px] text-ink/75">{label}</span>
                  <span className={`font-data text-[10px] uppercase tracking-[0.1em] ${GRADE_WEIGHT[strength]}`}>
                    {strength}
                  </span>
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
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center bg-ink font-data text-[10px] font-semibold text-paper">{n}</span>
                  <div>
                    <p className="text-[13px] font-semibold text-ink">{title}</p>
                    <p className="text-[12px] text-ink/50">{desc}</p>
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
    title: "THC, CBD & cannabinoids",
    subtitle: "Understanding the active compounds",
    items: [
      {
        q: "What is THC and what does it do?",
        tags: ["THC", "cannabinoids"],
        a: (
          <div className="space-y-3">
            <p><strong>Tetrahydrocannabinol (THC)</strong> is the primary psychoactive compound in cannabis. It binds to CB1 receptors in the brain and nervous system, producing the characteristic "high" alongside therapeutic effects.</p>
            <div className="space-y-2 border border-rule border-l-2 border-l-resin p-4">
              <p className="font-data text-[10px] uppercase tracking-[0.12em] text-resin">Therapeutic uses</p>
              <ul className="space-y-1 text-[12px] text-ink/70">
                {["Pain relief (analgesic)", "Anti-nausea, appetite stimulation", "Muscle relaxation and spasm reduction", "Sleep induction at higher doses", "Mood elevation in low doses"].map(u => (
                  <li key={u} className="flex items-center gap-2"><span className="inline-block h-1 w-1 shrink-0 bg-resin" />{u}</li>
                ))}
              </ul>
            </div>
            <div className="flex gap-2 border border-flag/40 border-l-2 border-l-flag bg-flag/5 p-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-flag" />
              <p className="text-[12px] text-flag">High THC doses may cause anxiety, paranoia, or cognitive impairment. Start low, go slow — especially elderly or first-time patients.</p>
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
            <div className="overflow-hidden border border-rule">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-rule bg-paper">
                    <th className="px-3 py-2 text-left font-data text-[10px] uppercase tracking-[0.1em] text-ink/45">Property</th>
                    <th className="px-3 py-2 text-center font-data text-[10px] uppercase tracking-[0.1em] text-resin">THC</th>
                    <th className="px-3 py-2 text-center font-data text-[10px] uppercase tracking-[0.1em] text-clinic">CBD</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rule">
                  {[
                    ["Psychoactive",       "Yes",      "No"],
                    ["Anxiety relief",     "Low dose", "Yes"],
                    ["Pain relief",        "Strong",   "Moderate"],
                    ["Anti-epileptic",     "Minimal",  "Strong"],
                    ["Anti-inflammatory",  "Moderate", "Strong"],
                    ["Sleep induction",    "Yes",      "Indirect"],
                  ].map(([prop, thc, cbd]) => (
                    <tr key={prop}>
                      <td className="px-3 py-2 font-medium text-ink/75">{prop}</td>
                      <td className="px-3 py-2 text-center font-data text-resin">{thc}</td>
                      <td className="px-3 py-2 text-center font-data text-clinic">{cbd}</td>
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
                { name: "Myrcene",       icon: Moon,         effect: "Sedating, muscle relaxant, earthy" },
                { name: "Linalool",      icon: Heart,        effect: "Calming, anti-anxiety, floral" },
                { name: "Limonene",      icon: Zap,          effect: "Uplifting, mood-enhancing, citrus" },
                { name: "Caryophyllene", icon: FlaskConical, effect: "Anti-inflammatory, spicy" },
                { name: "Pinene",        icon: Brain,        effect: "Alertness, memory, pine" },
                { name: "Terpinolene",   icon: Leaf,         effect: "Mildly sedating, antioxidant" },
              ].map(({ name, icon: Icon, effect }) => (
                <div key={name} className="border border-rule p-2.5">
                  <div className="mb-1 flex items-center gap-1.5">
                    <Icon className="h-3 w-3 shrink-0 text-ink/40" />
                    <span className="text-[12px] font-semibold text-ink">{name}</span>
                  </div>
                  <p className="text-[11px] text-ink/55">{effect}</p>
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
            <div className="divide-y divide-rule border border-rule">
              {[
                { cat: "T20/C4",   thc: "≤ 20%", cbd: "≥ 4%",   desc: "Balanced — common for pain and insomnia" },
                { cat: "T22/C4",   thc: "≤ 22%", cbd: "≥ 4%",   desc: "Higher THC — for chronic or severe pain" },
                { cat: "T10/C10",  thc: "≤ 10%", cbd: "≥ 10%",  desc: "Balanced ratio — anxiety, inflammation" },
                { cat: "T1/CBD",   thc: "≤ 1%",  cbd: "High",   desc: "Near-zero THC — epilepsy, children" },
              ].map(({ cat, thc, cbd, desc }) => (
                <div key={cat} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2.5">
                  <span className="w-20 shrink-0 font-data text-[13px] font-semibold text-ink">{cat}</span>
                  <span className="shrink-0 font-data text-[11px] text-resin">THC {thc}</span>
                  <span className="shrink-0 font-data text-[11px] text-clinic">CBD {cbd}</span>
                  <span className="text-[12px] text-ink/50">{desc}</span>
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
    title: "How the algorithm works",
    subtitle: "Inside the recommendation engine",
    items: [
      {
        q: "How does MediCanna generate recommendations?",
        tags: ["algorithm", "rule sum", "how it works"],
        a: (
          <div className="space-y-3">
            <p>The MediCanna recommendation engine uses a <strong>rule-based scoring algorithm</strong>. It does not use black-box machine learning — every decision is explainable and auditable by your physician.</p>
            <p className="text-[12px] text-ink/50">The point values below are the ones in <span className="font-data">src/lib/recommendationEngine.ts</span>. If the engine changes, this list is wrong until it is updated with it.</p>
            <div className="divide-y divide-rule border border-rule">
              {[
                {
                  step: "1",
                  title: "Clinical filtering",
                  desc: "Strains that exceed your licensed THC maximum or fall below your minimum CBD are excluded before scoring. If nothing passes, the page says so rather than widening the pool.",
                },
                {
                  step: "2",
                  title: "Evidence-rated condition matching",
                  desc: "Your condition is matched against the strain_conditions table, which grades each indication: strong evidence adds 60 points, moderate 40, anecdotal 20. A strain with no table entry falls back to its listed medical uses for 40.",
                },
                {
                  step: "3",
                  title: "Category scoring",
                  desc: "Indica adds 18 for pain, insomnia and PTSD; sativa 18 for low mood and fatigue; hybrid 14 for anxiety.",
                },
                {
                  step: "4",
                  title: "Terpene bonuses",
                  desc: "Known terpene-condition pairs (Linalool for anxiety, Myrcene for pain) add 12 points each. A CBD-dominant profile adds 10.",
                },
                {
                  step: "5",
                  title: "Safety and licence adjustments",
                  desc: "Over 60 with THC above 20% takes a 15-point penalty. Sitting inside your licensed THC ceiling adds 5, and meeting your CBD floor adds another 5.",
                },
                {
                  step: "6",
                  title: "Feedback history",
                  desc: "Your own past effectiveness scores adjust the total, weighted by how many sessions you have logged. A side-effect rate above half subtracts 10.",
                },
                {
                  step: "7",
                  title: "Top 3 output",
                  desc: "Qualifying strains are ranked by total rule sum and the top 3 are shown with their rationale, then written to your record as pending a doctor's review.",
                },
              ].map(({ step, title, desc }) => (
                <div key={step} className="flex gap-3 p-3">
                  <span className="h-fit shrink-0 border border-ink/25 px-2 py-0.5 font-data text-[10px] uppercase tracking-[0.1em] text-ink">
                    {step}
                  </span>
                  <div>
                    <p className="text-[13px] font-semibold text-ink">{title}</p>
                    <p className="mt-0.5 text-[12px] text-ink/60">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ),
      },
      {
        q: "What is the rule sum on each recommendation?",
        tags: ["score", "rule sum", "match"],
        a: (
          <div className="space-y-3">
            <p>Each recommendation carries a <strong>rule sum</strong>: the total of the points listed above, clamped to a 0–98 range. It is a ranking device, and nothing more.</p>
            <div className="flex gap-2 border border-rule bg-paper p-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-ink/40" />
              <p className="text-[12px] leading-relaxed text-ink/70">
                It is deliberately <strong>not</strong> shown as a percentage or a match score. A sum of
                rule weights is not a probability that a strain will work for you, and presenting it
                as "84% match" would imply a confidence the engine cannot support. An earlier version
                of this app did exactly that; the percentage ring was removed for this reason.
              </p>
            </div>
            <p>The number is useful for comparing the three strains <em>to each other</em> for your profile. It cannot tell you how well any of them will work — that is what your physician's review and your own logged feedback are for.</p>
          </div>
        ),
      },
      {
        q: "Does the algorithm learn from my feedback?",
        tags: ["feedback", "learning", "personalisation"],
        a: (
          <div className="space-y-3">
            <p>Yes — partially. Your submitted feedback (effectiveness scores and side-effect reports) builds a longitudinal treatment history that feeds directly into step 6 of the scoring above. It is used to:</p>
            <ul className="space-y-2">
              {[
                "Raise strains you have personally rated well, weighted by how many sessions you have logged",
                "Penalise strains for which you reported side effects in more than half your sessions",
                "Let your physician review efficacy trends over time",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-[13px] text-ink/75">
                  <span className="mt-1.5 h-1 w-1 shrink-0 bg-ink/40" />
                  {item}
                </li>
              ))}
            </ul>
            <div className="flex gap-2 border border-rule bg-paper p-3">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-ink/40" />
              <p className="text-[12px] text-ink/70">Feedback weight rises with the number of logged sessions and is capped at five. Below that, your history nudges the ranking rather than driving it.</p>
            </div>
          </div>
        ),
      },
      {
        q: "Is the recommendation a medical prescription?",
        tags: ["disclaimer", "legal", "prescription"],
        a: (
          <div className="space-y-3">
            <div className="flex gap-3 border border-flag/40 border-l-2 border-l-flag bg-flag/5 p-4">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-flag" />
              <div>
                <p className="mb-1 font-data text-[10px] uppercase tracking-[0.12em] text-flag">Important disclaimer</p>
                <p className="text-[12px] leading-relaxed text-flag">MediCanna recommendations are <strong>clinical decision support</strong>, not prescriptions. They are intended to assist — not replace — the judgment of a licensed physician.</p>
              </div>
            </div>
            <p>All recommendations must be reviewed and approved by your treating physician before purchase or use. The algorithm cannot account for:</p>
            <ul className="space-y-1 text-[12px] text-ink/60">
              {[
                "Drug-drug interactions with your current medications",
                "Contraindications specific to your full medical history",
                "Individual pharmacokinetic variability",
                "Changes in your condition since your last profile update",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1 w-1 shrink-0 bg-ink/30" />
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
    title: "Dosing & safe use",
    subtitle: "Practical guidance for patients",
    items: [
      {
        q: "What are the main consumption methods?",
        tags: ["consumption", "dosing", "methods"],
        a: (
          <div className="divide-y divide-rule border border-rule">
            {[
              { method: "Dried flower (vaporiser)", onset: "5–15 min",  duration: "2–3 hrs",  best: "Fast-acting pain or anxiety relief" },
              { method: "Oil drops (sublingual)",   onset: "15–45 min", duration: "4–6 hrs",  best: "Consistent daily dosing" },
              { method: "Capsules",                 onset: "30–90 min", duration: "6–8 hrs",  best: "Precise, long-lasting effect" },
              { method: "Joints / smoking",         onset: "5–10 min",  duration: "2–3 hrs",  best: "Fast relief, but lung risk" },
              { method: "Topical",                  onset: "30–60 min", duration: "2–4 hrs",  best: "Localised pain, no systemic effect" },
            ].map(({ method, onset, duration, best }) => (
              <div key={method} className="px-3 py-2.5">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <span className="text-[12px] font-semibold text-ink">{method}</span>
                  <span className="font-data text-[11px] text-ink/60">
                    <span className="text-ink/35">onset</span> {onset}
                    <span className="ml-3 text-ink/35">duration</span> {duration}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-ink/50">{best}</p>
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
                <div key={title} className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-ink/40" />
                  <div>
                    <p className="text-[13px] font-semibold text-ink">{title}</p>
                    <p className="mt-0.5 text-[12px] text-ink/50">{desc}</p>
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
  <div className={`border transition-colors ${isOpen ? "border-ink/30" : "border-rule"}`}>
    <button
      onClick={onToggle}
      aria-expanded={isOpen}
      className={`flex w-full items-center justify-between px-4 py-3 text-left transition-colors ${
        isOpen ? "bg-paper" : "bg-white hover:bg-paper"
      }`}
    >
      <span className={`pr-4 text-[14px] font-semibold leading-snug ${isOpen ? "text-ink" : "text-ink/80"}`}>
        {item.q}
      </span>
      <ChevronDown
        className={`h-4 w-4 shrink-0 transition-transform duration-200 ${
          isOpen ? "rotate-180 text-ink" : "text-ink/35"
        }`}
      />
    </button>

    {/* Animated panel */}
    <div
      className="overflow-hidden transition-all duration-300"
      style={{ maxHeight: isOpen ? "2000px" : "0px" }}
    >
      <div className="border-t border-rule bg-white px-4 py-4 text-[13px] leading-relaxed text-ink/65">
        {item.a}
        {item.tags && (
          <div className="mt-4 flex flex-wrap gap-1.5 border-t border-rule pt-3">
            {item.tags.map((tag) => (
              <span key={tag} className="border border-rule px-2 py-0.5 font-data text-[10px] text-ink/40">
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
    <div className="mx-auto max-w-3xl py-2 animate-in fade-in duration-500">

      {/* ── MASTHEAD ─────────────────────────────────────────────────────── */}
      <header className="mb-6 border-b-2 border-ink pb-5">
        <p className="font-data text-[10px] uppercase tracking-[0.2em] text-ink/45">
          Knowledge centre
        </p>
        <h1 className="mt-2 flex items-center gap-2 font-display text-[26px] font-semibold leading-tight tracking-tight text-ink">
          <BookOpen className="h-5 w-5 shrink-0 text-ink/40" />
          Reference
        </h1>
        <p className="mt-1 max-w-lg text-[13px] leading-relaxed text-ink/50">
          Clinical guides on medical cannabis, cannabinoids, terpenes, and how the recommendation engine works.
        </p>

        <div className="relative mt-3 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink/35" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search guides and FAQs"
            placeholder="Search guides and FAQs…"
            className="h-9 w-full border border-rule bg-white pl-9 pr-3 text-[13px] text-ink outline-none placeholder:text-ink/25 focus:border-ink/40 focus:ring-1 focus:ring-ink/20"
          />
        </div>
      </header>

      <div className="space-y-6">

      {/* ── SECTION FILTER TABS ───────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => setActiveSection(null)}
          className={`inline-flex items-center gap-1.5 border px-3 py-1.5 font-data text-[10px] uppercase tracking-[0.1em] transition-colors ${
            !activeSection
              ? "border-ink bg-ink text-paper"
              : "border-rule bg-white text-ink/55 hover:border-ink/35 hover:text-ink"
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
              className={`inline-flex items-center gap-1.5 border px-3 py-1.5 font-data text-[10px] uppercase tracking-[0.1em] transition-colors ${
                isActive
                  ? "border-ink bg-ink text-paper"
                  : "border-rule bg-white text-ink/55 hover:border-ink/35 hover:text-ink"
              }`}
            >
              <Icon className="h-3 w-3" />
              {s.title.split(" ")[0]}
            </button>
          );
        })}
      </div>

      {/* Search result count */}
      {searchQuery && (
        <p className="font-data text-[10px] uppercase tracking-[0.12em] text-ink/45">
          {totalResults === 0
            ? `No results for "${searchQuery}"`
            : `${totalResults} result${totalResults !== 1 ? "s" : ""} for "${searchQuery}"`}
        </p>
      )}

      {/* ── SECTIONS ─────────────────────────────────────────────────────── */}
      {filteredSections.map((section) => {
        const Icon = section.icon;
        return (
          <div key={section.id} className="space-y-2">
            {/* Section header */}
            <div className="flex items-center gap-2.5 border-b border-rule pb-2">
              <Icon className="h-4 w-4 shrink-0 text-ink/40" />
              <div>
                <h2 className="font-display text-[15px] font-semibold text-ink">{section.title}</h2>
                <p className="text-[12px] text-ink/45">{section.subtitle}</p>
              </div>
              <span className="ml-auto font-data text-[10px] uppercase tracking-[0.1em] text-ink/35">
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
        <div className="flex flex-col items-center gap-4 border border-rule bg-white p-5 sm:flex-row">
          <div className="flex-1 text-center sm:text-left">
            <p className="font-display text-[14px] font-semibold text-ink">
              Ready for your personalised recommendation?
            </p>
            <p className="mt-0.5 text-[12px] text-ink/50">
              The engine matches your medical profile against the formulary, then a clinician reviews the result.
            </p>
          </div>
          <button
            onClick={() => navigate("/recommendations")}
            className="inline-flex h-10 shrink-0 items-center gap-2 bg-ink px-5 font-data text-[10px] uppercase tracking-[0.12em] text-paper transition-colors hover:bg-ink/85"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Get recommendations
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      )}
      </div>
    </div>
  );
};

export default InfoCenterPage;
