"use client";

import { useState } from "react";
import { X, Activity } from "lucide-react";
import type { ScanResult } from "@/lib/api";

export default function DevProofDrawer({ scan }: { scan: ScanResult | null }) {
  const [open, setOpen] = useState(false);
  return <><button type="button" className="proof-chip" onClick={() => setOpen(true)} aria-label="تکنیکی تفصیل دیکھیں"><Activity size={14} /> Proof</button>
    {open && <div className="drawer-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setOpen(false); }}><aside className="proof-drawer" dir="ltr" role="dialog" aria-modal="true" aria-label="Dev Proof"><button className="drawer-close" onClick={() => setOpen(false)} aria-label="Close"><X size={20} /></button><h2>Dev Proof</h2><p>Clinical decisions are deterministic. Vision extracts text only.</p>
      {scan ? <><div className="proof-grid">{(["vision_ms", "resolver_ms", "openfda_ms", "tts_ms", "total_ms"] as const).map(k => <div key={k}><span>{k}</span><strong>{scan.telemetry[k]} ms</strong></div>)}<div><span>Estimated cost</span><strong>PKR {scan.telemetry.estimated_cost_pkr.toFixed(2)} · USD {scan.telemetry.estimated_cost_usd.toFixed(5)}</strong></div></div>
      <h3>Fuzzy scores</h3><pre>{JSON.stringify(scan.medications.map(m => ({ line_id: m.line_id, status: m.status, fuzzy_score: m.fuzzy_score })), null, 2)}</pre>
      <h3>Raw FDA JSON</h3><pre>{JSON.stringify(scan.interactions.map(hit => ({ source: hit.source, raw_fda_json: hit.raw_fda_json, fallback_excerpt: hit.raw_fda_json ? undefined : hit.fda_verbatim_excerpt })), null, 2)}</pre></> : <p>Run a scan to see stage timing and FDA evidence.</p>}
    </aside></div>}
  </>;
}
