import { useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check } from "lucide-react";
import {
  STAGE_CATEGORIES,
  STAGE_EXTRA_DECOR_CATEGORY,
  stageChoiceLines,
  type StageConfiguration,
} from "@bandhan/shared";
import Seo from "@/components/Seo";
import PageHero from "@/components/sections/PageHero";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";
import WhatsAppButton from "@/components/ui/WhatsAppButton";
import EnquiryForm from "@/components/sections/EnquiryForm";
import StagePreview from "@/components/stage/StagePreview";
import { cn } from "@/utils/cn";

type SingleKey = "layout" | "backdrop" | "flowers" | "lighting" | "furniture";

interface Choices {
  layout?: string;
  backdrop?: string;
  flowers?: string;
  lighting?: string;
  furniture?: string;
  otherDecor: string[];
  notes: string;
}

const SINGLE_KEYS: SingleKey[] = ["layout", "backdrop", "flowers", "lighting", "furniture"];
const inputClasses =
  "w-full border border-forest/20 bg-transparent px-4 py-3 text-[15px] text-charcoal placeholder:text-charcoal-muted/50 focus:border-forest focus:outline-none";
const labelClasses =
  "block font-sans text-[11px] font-semibold uppercase tracking-widest2 text-charcoal-muted";

/** One numbered choice section — radios keep native keyboard navigation. */
function StepSection({
  step,
  title,
  hint,
  name,
  options,
  value,
  onPick,
}: {
  step: number;
  title: string;
  hint: string;
  name: string;
  options: readonly { value: string; label: string }[];
  value?: string;
  onPick: (value: string) => void;
}) {
  return (
    <fieldset className="border-t border-forest/10 pt-8">
      <legend className="sr-only">{`${step}. ${title}`}</legend>
      <div className="flex items-baseline gap-4">
        <span className="font-serif text-lg italic text-gold-deep/80">{step}.</span>
        <div>
          <h3 className="font-serif text-2xl font-medium text-forest">{title}</h3>
          <p className="mt-1 text-sm text-charcoal-muted">{hint}</p>
        </div>
        {value && (
          <span className="ml-auto inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest2 text-gold-deep">
            <Check className="h-3.5 w-3.5" aria-hidden="true" /> Chosen
          </span>
        )}
      </div>
      <div className="mt-5 flex flex-wrap gap-3" role="presentation">
        {options.map((option) => (
          <label key={option.value} className="cursor-pointer">
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onPick(option.value)}
              className="peer sr-only"
            />
            <span
              className={cn(
                "inline-flex items-center gap-2 border border-forest/20 px-4 py-2.5 text-sm text-charcoal transition-colors",
                "hover:border-forest/50",
                "peer-checked:border-gold peer-checked:bg-gold/10 peer-checked:text-forest peer-checked:font-medium",
                "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-gold"
              )}
            >
              {value === option.value && (
                <Check className="h-3.5 w-3.5 text-gold-deep" aria-hidden="true" />
              )}
              {option.label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/**
 * Build Your Own Stage — six choices, a live SVG preview, then one quotation
 * request. The submitted enquiry carries the structured configuration, so the
 * dashboard shows exactly what the visitor designed; the WhatsApp action
 * sends the same choices as readable text for people who prefer chat.
 */
export default function StageBuilderPage() {
  const crumbs = [
    { name: "Home", path: "/" },
    { name: "Decorators", path: "/decorators" },
    { name: "Build Your Own Stage", path: "/build-your-stage" },
  ];

  const [choices, setChoices] = useState<Choices>({
    otherDecor: [],
    notes: "",
  });
  const [error, setError] = useState<string | null>(null);

  const pick = (key: SingleKey) => (value: string) => {
    setChoices((current) => ({ ...current, [key]: value }));
    setError(null);
  };

  const toggleDecor = (value: string) => {
    setChoices((current) => ({
      ...current,
      otherDecor: current.otherDecor.includes(value)
        ? current.otherDecor.filter((item) => item !== value)
        : [...current.otherDecor, value],
    }));
    setError(null);
  };

  const isComplete =
    SINGLE_KEYS.every((key) => Boolean(choices[key])) && choices.otherDecor.length > 0;

  const config: StageConfiguration | undefined = useMemo(() => {
    if (!isComplete) return undefined;
    return {
      layout: choices.layout!,
      backdrop: choices.backdrop!,
      flowers: choices.flowers!,
      lighting: choices.lighting!,
      furniture: choices.furniture!,
      otherDecor: choices.otherDecor,
      notes: choices.notes.trim() || undefined,
    } as StageConfiguration;
  }, [isComplete, choices]);

  const summaryLines = useMemo(() => {
    if (!config) return [];
    return stageChoiceLines(config);
  }, [config]);

  const whatsappText = useMemo(() => {
    if (!config) return "";
    const lines = summaryLines.map((line) => `${line.label}: ${line.value}`);
    return [
      "Hi Bandhan Events, I would like a quotation for my stage.",
      "",
      "Stage configuration:",
      ...lines.map((line) => `- ${line}`),
    ].join("\n");
  }, [config, summaryLines]);

  const goToQuotation = (event: FormEvent) => {
    event.preventDefault();
    if (!isComplete) {
      const missing = [
        ...STAGE_CATEGORIES.filter((category) => !choices[category.key]).map(
          (category) => category.label
        ),
        choices.otherDecor.length === 0 ? STAGE_EXTRA_DECOR_CATEGORY.label : null,
      ].filter(Boolean);
      setError(`Choose ${missing!.join(", ")} to continue.`);
      document.getElementById(`step-${missing![0]}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setError(null);
    document.getElementById("quotation")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <>
      <Seo route="/build-your-stage" breadcrumbs={crumbs} />

      <PageHero
        eyebrow="Interactive"
        title="Build Your Own Stage"
        lede="Choose the layout, backdrop, flowers, lighting, seating and décor — watch the stage come together as you pick, then request a quotation with your configuration attached."
        breadcrumbs={crumbs}
      />

      <section aria-label="Stage builder" className="container-site py-16 sm:py-20">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-14">
          {/* Steps */}
          <div className="lg:col-span-7">
            <SectionHeading
              eyebrow="How It Works"
              title="Six Choices, One Stage"
              lede="There are no wrong answers — pick what speaks to you and we will shape it around your venue and date."
            />
            <div className="mt-12 space-y-10">
              {STAGE_CATEGORIES.map((category) => (
                <div key={category.key} id={`step-${category.label}`}>
                  <StepSection
                    step={category.step}
                    title={category.label}
                    hint={category.hint}
                    name={category.key}
                    options={category.options}
                    value={choices[category.key]}
                    onPick={pick(category.key)}
                  />
                </div>
              ))}

              {/* Step 6 — multi-select */}
              <div id={`step-${STAGE_EXTRA_DECOR_CATEGORY.label}`}>
                <fieldset className="border-t border-forest/10 pt-8">
                  <legend className="sr-only">6. {STAGE_EXTRA_DECOR_CATEGORY.label}</legend>
                  <div className="flex items-baseline gap-4">
                    <span className="font-serif text-lg italic text-gold-deep/80">6.</span>
                    <div>
                      <h3 className="font-serif text-2xl font-medium text-forest">
                        {STAGE_EXTRA_DECOR_CATEGORY.label}
                      </h3>
                      <p className="mt-1 text-sm text-charcoal-muted">
                        {STAGE_EXTRA_DECOR_CATEGORY.hint}
                      </p>
                    </div>
                    {choices.otherDecor.length > 0 && (
                      <span className="ml-auto inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest2 text-gold-deep">
                        <Check className="h-3.5 w-3.5" aria-hidden="true" />{" "}
                        {choices.otherDecor.length} chosen
                      </span>
                    )}
                  </div>
                  <div className="mt-5 flex flex-wrap gap-3">
                    {STAGE_EXTRA_DECOR_CATEGORY.options.map((option) => {
                      const active = choices.otherDecor.includes(option.value);
                      return (
                        <label key={option.value} className="cursor-pointer">
                          <input
                            type="checkbox"
                            name="otherDecor"
                            value={option.value}
                            checked={active}
                            onChange={() => toggleDecor(option.value)}
                            className="peer sr-only"
                          />
                          <span
                            className={cn(
                              "inline-flex items-center gap-2 border border-forest/20 px-4 py-2.5 text-sm text-charcoal transition-colors",
                              "hover:border-forest/50",
                              "peer-checked:border-gold peer-checked:bg-gold/10 peer-checked:text-forest peer-checked:font-medium",
                              "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-gold"
                            )}
                          >
                            {active && (
                              <Check className="h-3.5 w-3.5 text-gold-deep" aria-hidden="true" />
                            )}
                            {option.label}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              </div>

              {/* Free-text notes */}
              <div className="border-t border-forest/10 pt-8">
                <label htmlFor="stage-notes" className={labelClasses}>
                  Anything else? (optional)
                </label>
                <textarea
                  id="stage-notes"
                  rows={3}
                  maxLength={500}
                  value={choices.notes}
                  onChange={(event) => setChoices((c) => ({ ...c, notes: event.target.value }))}
                  className={cn(inputClasses, "mt-2 resize-y")}
                  placeholder="Colours you love, a reference you have saved, dimensions you already know…"
                />
              </div>
            </div>
          </div>

          {/* Live preview + quotation actions */}
          <aside className="lg:col-span-5" aria-label="Live preview">
            <div className="lg:sticky lg:top-24">
              <div className="surface-card p-5 sm:p-6">
                <p className="eyebrow">Live Preview</p>
                <StagePreview config={choices} className="mt-4" />
              </div>

              <div className="surface-card mt-6 p-5 sm:p-6">
                <p className={labelClasses}>Your configuration</p>
                {summaryLines.length > 0 ? (
                  <dl className="mt-3 space-y-2">
                    {summaryLines.map((line) => (
                      <div key={line.label} className="flex gap-3 text-sm">
                        <dt className="w-24 shrink-0 text-charcoal-muted">{line.label}</dt>
                        <dd className="font-medium text-forest">{line.value}</dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <p className="mt-3 text-sm leading-relaxed text-charcoal-muted">
                    Make your choices on the left — the preview and this summary update as you go.
                  </p>
                )}

                <p className="mt-4 text-xs text-charcoal-muted/80">
                  {isComplete
                    ? "All six steps chosen — ready for your quotation."
                    : `Steps remaining: ${
                        [
                          ...STAGE_CATEGORIES.filter((c) => !choices[c.key]).map((c) => c.label),
                          choices.otherDecor.length === 0 ? STAGE_EXTRA_DECOR_CATEGORY.label : null,
                        ].join(", ") || "—"
                      }`}
                </p>

                {error && (
                  <p role="alert" className="mt-4 border border-red-900/20 bg-red-50/60 px-4 py-3 text-sm text-red-900">
                    {error}
                  </p>
                )}

                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <button type="button" onClick={goToQuotation} className="btn btn-solid flex-1">
                    Get Quotation
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                  <WhatsAppButton
                    message={isComplete ? whatsappText : undefined}
                    label="Send on WhatsApp"
                    variant="outline"
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>

      {/* Quotation form — the configuration rides along with the enquiry */}
      <section id="quotation" className="bg-ivory-soft bg-grain" aria-label="Request a quotation">
        <div className="container-site grid gap-10 py-16 sm:py-20 lg:grid-cols-12 lg:gap-14">
          <div className="lg:col-span-5">
            <SectionHeading
              eyebrow="Get Quotation"
              title="Take This Stage to Our Decorators"
              lede="Send your configuration straight to our team — it arrives attached to your enquiry, so the conversation starts from your design, not from scratch."
            />
            {!isComplete && (
              <p className="mt-6 border border-gold/40 bg-gold/5 px-4 py-3 text-sm text-charcoal">
                Tip: finish all six steps above first — your configuration is attached to this form
                automatically once every choice is made.
              </p>
            )}
            <ul className="mt-6 space-y-2.5">
              {[
                "Your exact choices are stored with the enquiry",
                "No obligation — we respond with ideas and pricing",
                "Prefer chat? Use the WhatsApp button above with the same configuration",
              ].map((point) => (
                <li key={point} className="flex items-start gap-3 text-sm text-charcoal-muted">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-gold-deep" aria-hidden="true" />
                  {point}
                </li>
              ))}
            </ul>
            <Reveal delay={0.1} className="mt-8">
              <Link to="/decorators" className="btn btn-outline">
                Explore Decorators
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </Reveal>
          </div>

          <div className="lg:col-span-7">
            <EnquiryForm stageConfiguration={config} defaultService="decorator" />
          </div>
        </div>
      </section>
    </>
  );
}
