import {
  Pill,
  Volume2,
  Check,
  ScanLine,
  type LucideIcon,
} from "lucide-react";

export function BrandMark({
  size = 24,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M16 3.5L26.5 7.2V16.4C26.5 22.8 21.8 27.1 16 29.2C10.2 27.1 5.5 22.8 5.5 16.4V7.2L16 3.5Z"
        fill="currentColor"
        fillOpacity="0.16"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinejoin="round"
      />
      <path
        d="M10.5 20.5V10.8H14.9C16.9 10.8 18.2 12 18.2 13.7C18.2 15.4 16.9 16.6 14.9 16.6H10.5M13.6 16.6L21.4 24.1M16.5 24.1L21 18.9"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="24.2" cy="8.2" r="1.8" fill="#6EE7B7" />
    </svg>
  );
}

export function IconMedallion({
  icon: Icon,
  tone = "blue",
  size = 20,
}: {
  icon: LucideIcon;
  tone?: "blue" | "green" | "amber" | "red" | "neutral";
  size?: number;
}) {
  return (
    <span className={`icon-medallion tone-${tone}`} aria-hidden="true">
      <Icon size={size} strokeWidth={1.85} />
    </span>
  );
}

export function PrescriptionArt() {
  return (
    <div className="prescription-art" aria-hidden="true">
      <div className="art-orbit orbit-one" />
      <div className="art-orbit orbit-two" />
      <div className="scan-corners">
        <i />
        <i />
        <i />
        <i />
      </div>
      <svg className="prescription-paper" viewBox="0 0 240 280" fill="none">
        <rect
          x="12"
          y="10"
          width="214"
          height="260"
          rx="17"
          fill="currentColor"
        />
        <text
          x="38"
          y="60"
          fill="var(--paper-ink)"
          fontSize="33"
          fontWeight="700"
          fontFamily="serif"
        >
          Rx
        </text>
        <g
          stroke="var(--paper-ink)"
          opacity=".48"
          strokeWidth="3"
          strokeLinecap="round"
        >
          <path d="M38 94 Q48 71 66 94 T94 94 Q105 73 121 90 T177 88" />
          <path d="M38 124 Q48 101 66 124 T94 124 Q105 103 121 120 T184 118" />
          <path d="M38 154 Q48 131 66 154 T94 154 Q105 133 121 150 T177 148" />
          <path d="M38 184 Q48 161 66 184 T94 184 Q105 163 121 180 T184 178" />
          <path d="M38 214 Q48 191 66 214 T94 214 Q105 193 121 210 T177 208" />
        </g>
        <path
          d="M38 244H113"
          stroke="var(--paper-ink)"
          strokeWidth="2"
          opacity=".2"
        />
      </svg>
      <div className="art-scan-line" />
      <div className="art-audio">
        <Volume2 size={24} />
        <span className="mini-wave">
          {[12, 24, 16, 32, 20, 12].map((h, i) => (
            <i key={i} style={{ height: h }} />
          ))}
        </span>
      </div>
      <div className="art-extraction">
        <span className="art-pill">
          <Pill size={17} />
        </span>
        <span>
          <b>Rx</b>
          <i />
          <i />
        </span>
        <Check size={16} />
      </div>
    </div>
  );
}

export function WaveArt({ active = false }: { active?: boolean }) {
  return (
    <div
      className={`wave-art ${active ? "is-playing" : ""}`}
      aria-hidden="true"
    >
      {[
        12, 24, 54, 93, 40, 66, 30, 21, 44, 73, 31, 50, 104, 63, 36, 87, 45, 24,
        37, 60, 22, 12,
      ].map((h, i) => (
        <i key={i} style={{ height: h, animationDelay: `${i * -0.08}s` }} />
      ))}
    </div>
  );
}

export function StripArt() {
  return (
    <svg
      className="strip-art"
      viewBox="0 0 220 150"
      fill="none"
      aria-hidden="true"
    >
      <g transform="rotate(-15 110 75)">
        <rect
          x="22"
          y="24"
          width="176"
          height="102"
          rx="16"
          fill="var(--surface-soft)"
          stroke="var(--accent)"
          strokeWidth="1.5"
        />
        {[0, 1].flatMap((r) =>
          [0, 1, 2, 3].map((c) => (
            <g key={`${r}${c}`}>
              <rect
                x={36 + c * 40}
                y={38 + r * 43}
                width="28"
                height="30"
                rx="14"
                fill="var(--accent)"
                opacity=".85"
              />
              <path
                d={`M${43 + c * 40} ${45 + r * 43}v13`}
                stroke="#ffffff"
                opacity=".7"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </g>
          )),
        )}
      </g>
    </svg>
  );
}

export function FooterEngravingArt() {
  return (
    <svg
      className="footer-engraving"
      viewBox="0 0 1440 190"
      preserveAspectRatio="none"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M0 112 Q180 78 360 104 T720 88 T1080 108 T1440 94 L1440 190 L0 190 Z"
        fill="#F5EFE2"
      />
      <g stroke="#0E3780" strokeLinecap="round">
        <path
          d="M0 112 Q180 78 360 104 T720 88 T1080 108 T1440 94"
          strokeWidth="2"
        />
        <path
          d="M0 124 Q190 96 380 118 T760 104 T1140 122 T1440 108"
          strokeWidth="1.1"
          opacity="0.6"
        />
        <path
          d="M60 142 Q260 128 480 144 T960 132 T1380 142"
          strokeWidth="1"
          opacity="0.45"
        />
        <path
          d="M20 162 Q340 152 680 164 T1360 158"
          strokeWidth="1.2"
          opacity="0.5"
        />
        <path
          d="M110 176 H410 M520 176 H890 M990 176 H1340"
          strokeWidth="1"
          opacity="0.4"
        />
      </g>
      <g stroke="#0E3780" strokeWidth="1.2" strokeLinecap="round" fill="#F5EFE2">
        <path d="M210 103 L210 74 L245 58 L280 74 L280 101" />
        <path d="M238 102 V83 H252 V102" />
        <path d="M245 48 V64 M237 56 H253" strokeWidth="1.6" />
        <path d="M688 122 Q685 95 696 76" fill="none" strokeWidth="1.5" />
        <path d="M689 102 Q673 94 670 84 Q683 88 689 102 Z" />
        <path d="M691 90 Q708 82 712 72 Q698 76 691 90 Z" />
        <path d="M718 98 H756 C754 117 746 126 737 126 C728 126 720 117 718 98 Z" />
        <path d="M742 98 L754 78" strokeWidth="2.4" fill="none" />
        <path d="M716 126 H758" strokeWidth="1.6" fill="none" />
        <path d="M120 148 L114 134 M120 148 L121 132 M120 148 L128 136" fill="none" />
        <path d="M460 154 L455 140 M460 154 L462 138 M460 154 L468 142" fill="none" />
        <path d="M975 148 L969 134 M975 148 L976 131 M975 148 L983 135" fill="none" />
        <path d="M1225 138 L1219 124 M1225 138 L1226 122 M1225 138 L1233 126" fill="none" />
      </g>
    </svg>
  );
}

export function ScanMark() {
  return <ScanLine size={20} aria-hidden="true" />;
}
