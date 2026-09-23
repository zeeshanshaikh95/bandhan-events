import { useReducedMotion } from "framer-motion";
import { motion } from "framer-motion";
import type { StageConfigurationLike } from "@bandhan/shared";

interface StagePreviewProps {
  /** Partial while the wizard is in progress; complete once all steps are chosen. */
  config: Partial<StageConfigurationLike>;
  className?: string;
}

/* Brand palette — nothing outside the approved identity. */
const FOREST = "#17251D";
const FOREST_MID = "#24362B";
const IVORY = "#F7F3EA";
const CREAM = "#EFE8DA";
const GOLD = "#B08A45";
const CHAMPAGNE = "#D6C19A";
const DASH = "7 6";

/** Soft fade whenever a choice swaps a variant. No motion when reduced. */
function Fade({ reduced, children }: { reduced: boolean; children: React.ReactNode }) {
  if (reduced) return <>{children}</>;
  return (
    <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      {children}
    </motion.g>
  );
}

/* --------------------------------------------------------------------------
 * Backdrop variants (panel: x 170–630, y 75–435)
 * ------------------------------------------------------------------------ */
function Backdrop({ value }: { value?: string }) {
  if (!value) {
    return <rect x={170} y={75} width={460} height={360} fill="none" stroke={FOREST} strokeOpacity={0.25} strokeDasharray={DASH} />;
  }
  if (value === "floral") {
    const dots = [
      [210, 130], [280, 105], [355, 95], [445, 95], [520, 105], [590, 130],
      [240, 210], [330, 185], [470, 185], [560, 210],
      [300, 300], [400, 275], [500, 300],
      [230, 380], [400, 365], [570, 380],
    ];
    return (
      <g>
        <rect x={170} y={75} width={460} height={360} fill={FOREST_MID} />
        <path d="M170 155 Q400 60 630 155" fill="none" stroke={GOLD} strokeWidth={2} strokeOpacity={0.7} />
        {dots.map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r={i % 3 === 0 ? 7 : 5} fill={i % 2 ? CHAMPAGNE : IVORY} fillOpacity={0.85} />
        ))}
      </g>
    );
  }
  if (value === "fabric") {
    return (
      <g>
        <rect x={170} y={75} width={460} height={360} fill={CREAM} />
        {[0, 1, 2, 3].map((i) => (
          <path
            key={i}
            d={`M${170 + i * 115} 75 q57 46 115 0 L${170 + i * 115 + 115} 435 L${170 + i * 115} 435 Z`}
            fill={i % 2 ? IVORY : CHAMPAGNE}
            fillOpacity={i % 2 ? 1 : 0.55}
          />
        ))}
        <path d="M170 75 q115 62 230 0 q115 62 230 0" fill="none" stroke={GOLD} strokeWidth={3} />
      </g>
    );
  }
  if (value === "led") {
    return (
      <g>
        <rect x={170} y={75} width={460} height={360} fill="#1A1C1A" />
        <rect x={195} y={205} width={410} height={7} fill="url(#ledBar)" />
        <rect x={195} y={205} width={410} height={22} fill="url(#ledBar)" opacity={0.25} />
        <rect x={195} y={330} width={410} height={4} fill="url(#ledBar)" opacity={0.7} />
        <rect x={225} y={110} width={350} height={3} fill={CHAMPAGNE} fillOpacity={0.5} />
      </g>
    );
  }
  if (value === "wooden") {
    return (
      <g>
        <rect x={170} y={75} width={460} height={360} fill="#6F5B41" />
        {Array.from({ length: 8 }, (_, i) => (
          <rect key={i} x={174 + i * 57} y={79} width={53} height={352} fill={i % 2 ? "#7C684D" : "#6F5B41"} />
        ))}
        <rect x={170} y={75} width={460} height={16} fill={FOREST_MID} />
        <rect x={170} y={425} width={460} height={10} fill={FOREST_MID} />
      </g>
    );
  }
  /* custom */
  return (
    <g>
      <rect x={170} y={75} width={460} height={360} fill={FOREST_MID} />
      <rect x={215} y={120} width={370} height={270} fill="none" stroke={CHAMPAGNE} strokeWidth={2} strokeDasharray={DASH} />
      <path d="M400 230 l30 30 l-30 30 l-30 -30 Z" fill="none" stroke={GOLD} strokeWidth={2.5} />
    </g>
  );
}

/* --------------------------------------------------------------------------
 * Lighting variants
 * ------------------------------------------------------------------------ */
function Lighting({ value }: { value?: string }) {
  if (!value) return null;
  if (value === "warm") {
    return <ellipse cx={400} cy={150} rx={300} ry={165} fill="url(#warmGlow)" />;
  }
  if (value === "fairy-lights") {
    const xs = [150, 200, 250, 300, 350, 400, 450, 500, 550, 600, 650];
    return (
      <g>
        <path d="M150 70 Q400 140 650 70" fill="none" stroke={CHAMPAGNE} strokeWidth={1.5} />
        {xs.map((x) => {
          const t = 1 - ((x - 400) / 250) ** 2;
          const y = 70 + 35 * t;
          return (
            <g key={x}>
              <circle cx={x} cy={y} r={5.5} fill={CHAMPAGNE} fillOpacity={0.35} />
              <circle cx={x} cy={y} r={2.5} fill="#F3E3B8" />
            </g>
          );
        })}
      </g>
    );
  }
  if (value === "chandeliers") {
    return (
      <g stroke={GOLD} strokeWidth={2} fill="none">
        {[310, 490].map((cx) => (
          <g key={cx}>
            <line x1={cx} y1={20} x2={cx} y2={95} />
            <line x1={cx - 20} y1={100} x2={cx + 20} y2={100} />
            <circle cx={cx} cy={95} r={5} fill={GOLD} />
            <line x1={cx - 16} y1={100} x2={cx - 16} y2={112} />
            <line x1={cx} y1={100} x2={cx} y2={118} />
            <line x1={cx + 16} y1={100} x2={cx + 16} y2={112} />
            <circle cx={cx - 16} cy={116} r={4} fill={CHAMPAGNE} stroke="none" />
            <circle cx={cx} cy={122} r={5} fill={CHAMPAGNE} stroke="none" />
            <circle cx={cx + 16} cy={116} r={4} fill={CHAMPAGNE} stroke="none" />
          </g>
        ))}
      </g>
    );
  }
  if (value === "led") {
    return (
      <g>
        <rect x={170} y={64} width={460} height={7} fill="url(#ledBar)" />
        <rect x={105} y={470} width={590} height={6} fill="url(#ledBar)" opacity={0.85} />
        <rect x={105} y={470} width={590} height={16} fill="url(#ledBar)" opacity={0.2} />
      </g>
    );
  }
  /* spotlights */
  return (
    <g fill={IVORY} fillOpacity={0.14}>
      <polygon points="230,15 258,15 345,435 210,435" />
      <polygon points="542,15 570,15 590,435 455,435" />
      <polygon points="230,15 258,15 345,435 210,435" fill={CHAMPAGNE} fillOpacity={0.1} />
    </g>
  );
}

/* --------------------------------------------------------------------------
 * Stage platform variants (face: x 105–695, top y 435, floor y 478)
 * ------------------------------------------------------------------------ */
function Platform({ value }: { value?: string }) {
  if (!value) {
    return <rect x={105} y={435} width={590} height={43} fill="none" stroke={FOREST} strokeOpacity={0.3} strokeDasharray={DASH} />;
  }
  if (value === "traditional") {
    return (
      <g>
        <rect x={105} y={435} width={590} height={23} fill={FOREST} />
        <rect x={85} y={458} width={630} height={20} fill={FOREST_MID} />
        <line x1={85} y1={458} x2={715} y2={458} stroke={GOLD} strokeWidth={2} />
        <line x1={105} y1={441} x2={695} y2={441} stroke={CHAMPAGNE} strokeWidth={1} strokeOpacity={0.6} />
      </g>
    );
  }
  if (value === "royal") {
    return (
      <g>
        <rect x={105} y={435} width={590} height={43} fill={FOREST} />
        <line x1={105} y1={442} x2={695} y2={442} stroke={GOLD} strokeWidth={2} />
        <line x1={105} y1={448} x2={695} y2={448} stroke={GOLD} strokeWidth={1} strokeOpacity={0.6} />
        <line x1={105} y1={472} x2={695} y2={472} stroke={GOLD} strokeWidth={2} />
        <path d="M400 450 l14 14 l-14 14 l-14 -14 Z" fill={GOLD} />
      </g>
    );
  }
  if (value === "floral") {
    return (
      <g>
        <rect x={105} y={435} width={590} height={43} fill={FOREST} />
        <line x1={105} y1={441} x2={695} y2={441} stroke={CHAMPAGNE} strokeWidth={1} strokeOpacity={0.6} />
        {Array.from({ length: 15 }, (_, i) => (
          <circle key={i} cx={125 + i * 41} cy={478} r={14} fill={i % 2 ? CHAMPAGNE : IVORY} fillOpacity={0.9} />
        ))}
      </g>
    );
  }
  if (value === "modern") {
    return (
      <g>
        <rect x={105} y={435} width={590} height={26} fill={FOREST_MID} />
        <rect x={115} y={455} width={570} height={4} fill={CHAMPAGNE} fillOpacity={0.8} />
        <rect x={300} y={461} width={200} height={17} fill={FOREST} />
      </g>
    );
  }
  /* custom */
  return (
    <g>
      <rect x={105} y={435} width={590} height={43} fill={FOREST_MID} />
      <rect x={117} y={443} width={566} height={27} fill="none" stroke={CHAMPAGNE} strokeWidth={2} strokeDasharray={DASH} />
    </g>
  );
}

/* --------------------------------------------------------------------------
 * Furniture silhouettes (baseline y 435)
 * ------------------------------------------------------------------------ */
function Furniture({ value }: { value?: string }) {
  if (!value) {
    return <rect x={335} y={375} width={130} height={60} rx={6} fill="none" stroke={FOREST} strokeOpacity={0.3} strokeDasharray={DASH} />;
  }
  if (value === "sofa") {
    return (
      <g fill={FOREST_MID} stroke={GOLD} strokeWidth={1.5}>
        <rect x={330} y={372} width={140} height={40} rx={8} />
        <rect x={322} y={398} width={22} height={37} rx={6} />
        <rect x={456} y={398} width={22} height={37} rx={6} />
        <rect x={340} y={404} width={120} height={31} rx={6} fill={FOREST} />
      </g>
    );
  }
  if (value === "chairs") {
    return (
      <g fill={FOREST_MID} stroke={GOLD} strokeWidth={1.5}>
        {[338, 432].map((x) => (
          <g key={x}>
            <rect x={x} y={378} width={54} height={34} rx={5} />
            <rect x={x + 3} y={406} width={48} height={12} rx={4} fill={FOREST} />
            <line x1={x + 8} y1={418} x2={x + 8} y2={435} />
            <line x1={x + 46} y1={418} x2={x + 46} y2={435} />
          </g>
        ))}
      </g>
    );
  }
  if (value === "couple-seating") {
    return (
      <g>
        {[348, 416].map((x) => (
          <g key={x} fill={FOREST_MID} stroke={GOLD} strokeWidth={1.5}>
            <rect x={x} y={356} width={54} height={56} rx={7} />
            <rect x={x + 4} y={404} width={46} height={14} rx={4} fill={FOREST} />
            <line x1={x + 10} y1={418} x2={x + 10} y2={435} />
            <line x1={x + 44} y1={418} x2={x + 44} y2={435} />
          </g>
        ))}
        <rect x={402} y={412} width={16} height={4} fill={GOLD} />
      </g>
    );
  }
  /* custom */
  return <rect x={335} y={375} width={130} height={60} rx={6} fill="none" stroke={CHAMPAGNE} strokeWidth={2} strokeDasharray={DASH} />;
}

/* --------------------------------------------------------------------------
 * Flowers — swag garland (Q: 200,110 → 600,110, sag to y 160)
 * ------------------------------------------------------------------------ */
function Flowers({ value, layout }: { value?: string; layout?: string }) {
  if (!value) {
    return <path d="M200 110 Q400 210 600 110" fill="none" stroke={FOREST} strokeOpacity={0.2} strokeWidth={2} strokeDasharray={DASH} />;
  }
  const palette =
    value === "roses"
      ? ["#C98F8F", IVORY, "#C98F8F"]
      : value === "marigold"
        ? ["#E19738", "#EFB462", "#E19738"]
        : value === "mixed"
          ? ["#C98F8F", "#E19738", IVORY, CHAMPAGNE]
          : [GOLD, CHAMPAGNE, IVORY, GOLD];
  const xs = [200, 258, 313, 361, 400, 439, 487, 542, 600];
  return (
    <g>
      <path d="M200 110 Q400 210 600 110" fill="none" stroke={FOREST_MID} strokeWidth={2} />
      {xs.map((x, i) => {
        const y = 160 - 0.00125 * (400 - x) ** 2;
        return <circle key={x} cx={x} cy={y} r={value === "premium" ? 13 : 11} fill={palette[i % palette.length]} stroke={value === "premium" ? GOLD : "none"} strokeWidth={1.5} />;
      })}
      <circle cx={400} cy={176} r={14} fill={palette[0]} stroke={value === "premium" ? GOLD : "none"} strokeWidth={1.5} />
      {/* posies on the stage corners */}
      <circle cx={140} cy={428} r={10} fill={palette[1]} />
      <circle cx={158} cy={431} r={8} fill={palette[2]} />
      <circle cx={660} cy={428} r={10} fill={palette[1]} />
      <circle cx={642} cy={431} r={8} fill={palette[2]} />
      {layout === "floral" && (
        <g>
          <circle cx={300} cy={435} r={9} fill={palette[0]} />
          <circle cx={500} cy={435} r={9} fill={palette[2]} />
        </g>
      )}
    </g>
  );
}

/* --------------------------------------------------------------------------
 * Other décor — pillars flank the stage; arch, board and props sit in front
 * ------------------------------------------------------------------------ */
function ExtraDecor({ items }: { items: string[] }) {
  const has = (key: string) => items.includes(key);
  return (
    <g>
      {has("pillars") &&
        [45, 715].map((x) => (
          <g key={x}>
            <rect x={x} y={150} width={40} height={316} fill={CREAM} stroke={FOREST} strokeOpacity={0.35} strokeWidth={1.5} />
            <rect x={x - 7} y={150} width={54} height={14} fill={GOLD} />
            <rect x={x - 7} y={458} width={54} height={16} fill={FOREST} />
            <line x1={x + 13} y1={170} x2={x + 13} y2={452} stroke={FOREST} strokeOpacity={0.2} />
            <line x1={x + 27} y1={170} x2={x + 27} y2={452} stroke={FOREST} strokeOpacity={0.2} />
          </g>
        ))}
      {has("entrance") && (
        <g>
          <path d="M55 560 L55 520 Q102 484 150 520 L150 560 Z" fill={CREAM} stroke={FOREST} strokeWidth={3} />
          <path d="M70 560 L70 526 Q102 500 135 526 L135 560 Z" fill={FOREST_MID} stroke="none" />
          <circle cx={102} cy={497} r={6} fill={GOLD} />
        </g>
      )}
      {has("welcome-board") && (
        <g>
          <rect x={668} y={497} width={96} height={52} rx={4} fill={IVORY} stroke={GOLD} strokeWidth={2.5} />
          <line x1={682} y1={513} x2={750} y2={513} stroke={FOREST} strokeOpacity={0.55} strokeWidth={2.5} />
          <line x1={690} y1={527} x2={742} y2={527} stroke={FOREST} strokeOpacity={0.35} strokeWidth={2} />
          <line x1={684} y1={549} x2={674} y2={560} stroke={FOREST} strokeWidth={3} />
          <line x1={748} y1={549} x2={758} y2={560} stroke={FOREST} strokeWidth={3} />
        </g>
      )}
      {has("props") && (
        <g>
          <rect x={205} y={532} width={44} height={28} rx={3} fill={FOREST_MID} stroke={GOLD} strokeWidth={1.5} />
          <line x1={227} y1={532} x2={227} y2={560} stroke={GOLD} strokeWidth={1.5} />
          <rect x={262} y={524} width={22} height={36} rx={4} fill={CREAM} stroke={FOREST} strokeWidth={2} />
          <path d="M266 524 q7 -12 14 0" fill="none" stroke={FOREST} strokeWidth={2} />
          <circle cx={273} cy={542} r={4} fill={GOLD} />
        </g>
      )}
      {has("custom") && (
        <rect x={370} y={524} width={62} height={36} rx={5} fill="none" stroke={CHAMPAGNE} strokeWidth={2} strokeDasharray={DASH} />
      )}
    </g>
  );
}

/**
 * Live stage preview. Pure SVG in the brand palette — no photos, no stock
 * imagery — so it renders instantly and stays honest about being indicative:
 * the caption says the final design is drawn by the decorators.
 */
export default function StagePreview({ config, className }: StagePreviewProps) {
  const reduced = useReducedMotion() ?? false;

  const describe = () => {
    const parts: string[] = [];
    if (config.layout) parts.push(`layout: ${config.layout}`);
    if (config.backdrop) parts.push(`backdrop: ${config.backdrop}`);
    if (config.flowers) parts.push(`flowers: ${config.flowers}`);
    if (config.lighting) parts.push(`lighting: ${config.lighting}`);
    if (config.furniture) parts.push(`furniture: ${config.furniture}`);
    if (config.otherDecor?.length) parts.push(`décor: ${config.otherDecor.join(", ")}`);
    return parts.length
      ? `Stage preview — ${parts.join("; ")}`
      : "Stage preview — no choices made yet";
  };

  return (
    <div className={className}>
      <svg
        viewBox="0 0 800 560"
        role="img"
        aria-label={describe()}
        className="block h-auto w-full"
        style={{ background: IVORY }}
      >
        <defs>
          <radialGradient id="warmGlow" cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor={CHAMPAGNE} stopOpacity={0.55} />
            <stop offset="60%" stopColor={CHAMPAGNE} stopOpacity={0.16} />
            <stop offset="100%" stopColor={CHAMPAGNE} stopOpacity={0} />
          </radialGradient>
          <linearGradient id="ledBar" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={GOLD} />
            <stop offset="50%" stopColor="#F3E3B8" />
            <stop offset="100%" stopColor={GOLD} />
          </linearGradient>
        </defs>

        {/* Room */}
        <rect x={0} y={0} width={800} height={560} fill={IVORY} />
        <rect x={0} y={478} width={800} height={82} fill={CREAM} />
        <line x1={0} y1={478} x2={800} y2={478} stroke={FOREST} strokeOpacity={0.25} strokeWidth={1.5} />

        <Fade reduced={reduced}>
          <Backdrop value={config.backdrop} />
        </Fade>
        <Fade reduced={reduced}>
          <Lighting value={config.lighting} />
        </Fade>

        {/* Stage, flowers and furniture */}
        <Fade reduced={reduced}>
          <Platform value={config.layout} />
        </Fade>
        <Fade reduced={reduced}>
          <Furniture value={config.furniture} />
        </Fade>
        <Fade reduced={reduced}>
          <Flowers value={config.flowers} layout={config.layout} />
        </Fade>

        <Fade reduced={reduced}>
          <ExtraDecor items={config.otherDecor ?? []} />
        </Fade>

        {/* Grounding shadow line under the platform edge */}
        <line x1={85} y1={478} x2={715} y2={478} stroke={FOREST} strokeOpacity={0.35} strokeWidth={2} />
      </svg>
      <p className="mt-3 text-center text-[11px] leading-relaxed text-charcoal-muted/80">
        Indicative preview — our decorators finalise the design with you before the event.
      </p>
    </div>
  );
}
