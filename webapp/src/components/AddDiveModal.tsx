"use client";

import { useState } from "react";
import { doc, setDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface Props {
  userId: string;
  onClose: () => void;
  onSaved: () => void;
}

interface LogForm {
  id: string;
  date: string;
  type: string;
  partner: string;
}

interface DiveForm {
  number: string;
  initialPressure: string;
  endingPressure: string;
  workingPressure: string;
  gas: string;
  nitrox: string;
  tankVolume: string;
  tcs1: string;
  tcs2: string;
  weather: string;
  waving: string;
  current: string;
  visibility: string;
  waterTemp: string;
  ballast: string;
  suitThickness: string;
  startTime: string;
  endTime: string;
}

const DIVE_TYPES = ["Recreational", "Technical", "Night", "Deep", "Cave", "Wreck", "Training", "Course", "Other"];
const WEATHER_OPTIONS = ["Sunny", "Partly Cloudy", "Cloudy", "Rainy", "Stormy", "Foggy"];
const WAVING_OPTIONS = ["Calm", "Light", "Moderate", "Heavy"];
const CURRENT_OPTIONS = ["None", "Light", "Moderate", "Strong"];

function emptyDive(): DiveForm {
  return {
    number: "", initialPressure: "", endingPressure: "", workingPressure: "",
    gas: "Air", nitrox: "", tankVolume: "", tcs1: "", tcs2: "",
    weather: "", waving: "", current: "", visibility: "", waterTemp: "",
    ballast: "", suitThickness: "", startTime: "", endTime: "",
  };
}

function toNum(s: string): number | undefined {
  const n = parseFloat(s);
  return isNaN(n) ? undefined : n;
}

function toTimestamp(dateStr: string, timeStr: string): Timestamp | null {
  if (!dateStr) return null;
  const dt = new Date(`${dateStr}T${timeStr || "00:00"}:00`);
  return isNaN(dt.getTime()) ? null : Timestamp.fromDate(dt);
}

function Field({
  label, type = "text", value, onChange, placeholder,
}: {
  label: string; type?: string; value: string;
  onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        step={type === "number" ? "any" : undefined}
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none"
      />
    </div>
  );
}

function SelectField({
  label, value, options, onChange,
}: {
  label: string; value: string; options: string[]; onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none bg-white"
      >
        <option value="">Select…</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">{children}</p>;
}

export default function AddDiveModal({ userId, onClose, onSaved }: Props) {
  const [log, setLog] = useState<LogForm>({ id: "", date: "", type: "", partner: "" });
  const [dives, setDives] = useState<DiveForm[]>([emptyDive()]);
  const [activeTab, setActiveTab] = useState(0);
  const [saving, setSaving] = useState(false);

  function updateLog<K extends keyof LogForm>(key: K, value: string) {
    setLog((prev) => ({ ...prev, [key]: value }));
  }

  function updateDive<K extends keyof DiveForm>(idx: number, key: K, value: string) {
    setDives((prev) => prev.map((d, i) => (i === idx ? { ...d, [key]: value } : d)));
  }

  function addDive() {
    if (dives.length < 4) {
      setDives((prev) => [...prev, emptyDive()]);
      setActiveTab(dives.length);
    }
  }

  function removeDive(idx: number) {
    if (dives.length <= 1) return;
    setDives((prev) => prev.filter((_, i) => i !== idx));
    setActiveTab((prev) => Math.min(prev, dives.length - 2));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const diveId = crypto.randomUUID();
      const dateTs = log.date ? Timestamp.fromDate(new Date(log.date + "T12:00:00")) : null;

      const diveEntries = dives.map((d) => {
        const entry: Record<string, unknown> = {};
        if (d.number)          entry.number          = parseInt(d.number);
        if (d.initialPressure) entry.initialPressure = toNum(d.initialPressure);
        if (d.endingPressure)  entry.endingPressure  = toNum(d.endingPressure);
        if (d.workingPressure) entry.workingPressure = toNum(d.workingPressure);
        if (d.gas)             entry.gas             = d.gas;
        if (d.nitrox)          entry.nitrox          = toNum(d.nitrox);
        if (d.tankVolume)      entry.tankVolume      = toNum(d.tankVolume);
        if (d.tcs1)            entry.tcs1            = toNum(d.tcs1);
        if (d.tcs2)            entry.tcs2            = toNum(d.tcs2);
        if (d.weather)         entry.weather         = d.weather;
        if (d.waving)          entry.waving          = d.waving;
        if (d.current)         entry.current         = d.current;
        if (d.visibility)      entry.visibility      = toNum(d.visibility);
        if (d.waterTemp)       entry.waterTemp       = toNum(d.waterTemp);
        if (d.ballast)         entry.ballast         = toNum(d.ballast);
        if (d.suitThickness)   entry.suitThickness   = toNum(d.suitThickness);
        const st = toTimestamp(log.date, d.startTime);
        const et = toTimestamp(log.date, d.endTime);
        if (st) entry.startTime = st;
        if (et) entry.endTime   = et;
        return entry;
      });

      await setDoc(doc(db, "users", userId, "dives", diveId), {
        planning: {},
        log: {
          ...(log.id      ? { id:      parseInt(log.id) } : {}),
          ...(dateTs      ? { date:    dateTs }           : {}),
          ...(log.type    ? { type:    log.type }         : {}),
          ...(log.partner ? { partner: log.partner }      : {}),
          dive: diveEntries,
        },
        file: {
          id: "", fileName: "", fileSizeBytes: 0,
          status: "no_file", uploadedAt: null, processedAt: null,
        },
      });

      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  const d = dives[activeTab];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="flex flex-col w-full max-w-2xl max-h-[90vh] rounded-2xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 shrink-0">
          <h2 className="text-lg font-semibold text-gray-800">Add Dive</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
            aria-label="Close"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">

          {/* Log details */}
          <section>
            <SectionLabel>Log Details</SectionLabel>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Field label="Log ID" type="number" value={log.id} onChange={(v) => updateLog("id", v)} placeholder="1" />
              <Field label="Date" type="date" value={log.date} onChange={(v) => updateLog("date", v)} />
              <SelectField label="Type" value={log.type} options={DIVE_TYPES} onChange={(v) => updateLog("type", v)} />
              <Field label="Partner" value={log.partner} onChange={(v) => updateLog("partner", v)} placeholder="Dive buddy" />
            </div>
          </section>

          {/* Dive entries */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <SectionLabel>Dives</SectionLabel>
              {dives.length < 4 && (
                <button onClick={addDive} className="text-xs font-medium text-sky-700 hover:text-sky-600 transition">
                  + Add Dive
                </button>
              )}
            </div>

            {/* Tabs */}
            <div className="flex flex-wrap gap-1 mb-5">
              {dives.map((_, i) => (
                <div key={i} className="flex items-center">
                  <button
                    onClick={() => setActiveTab(i)}
                    className={[
                      "rounded-l-md px-3 py-1.5 text-xs font-medium transition",
                      activeTab === i ? "bg-sky-700 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200",
                    ].join(" ")}
                  >
                    Dive {i + 1}
                  </button>
                  {dives.length > 1 && (
                    <button
                      onClick={() => removeDive(i)}
                      className={[
                        "rounded-r-md px-1.5 py-1.5 text-xs transition",
                        activeTab === i ? "bg-sky-600 text-sky-100 hover:bg-sky-500" : "bg-gray-100 text-gray-400 hover:bg-red-100 hover:text-red-500",
                      ].join(" ")}
                      title="Remove this dive"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Active dive fields */}
            <div className="space-y-5">

              {/* Basic */}
              <div className="grid grid-cols-3 gap-3">
                <Field label="Dive #" type="number" value={d.number} onChange={(v) => updateDive(activeTab, "number", v)} />
                <Field label="Start Time" type="time" value={d.startTime} onChange={(v) => updateDive(activeTab, "startTime", v)} />
                <Field label="End Time" type="time" value={d.endTime} onChange={(v) => updateDive(activeTab, "endTime", v)} />
              </div>

              {/* Tank */}
              <div>
                <SectionLabel>Tank</SectionLabel>
                <div className="grid grid-cols-3 gap-3">
                  <Field label="Initial Pressure (bar)" type="number" value={d.initialPressure} onChange={(v) => updateDive(activeTab, "initialPressure", v)} />
                  <Field label="Ending Pressure (bar)" type="number" value={d.endingPressure} onChange={(v) => updateDive(activeTab, "endingPressure", v)} />
                  <Field label="Working Pressure (bar)" type="number" value={d.workingPressure} onChange={(v) => updateDive(activeTab, "workingPressure", v)} />
                  <Field label="Gas" value={d.gas} onChange={(v) => updateDive(activeTab, "gas", v)} placeholder="Air" />
                  <Field label="Nitrox O₂ %" type="number" value={d.nitrox} onChange={(v) => updateDive(activeTab, "nitrox", v)} />
                  <Field label="Tank Volume (L)" type="number" value={d.tankVolume} onChange={(v) => updateDive(activeTab, "tankVolume", v)} />
                </div>
              </div>

              {/* Dive Computer */}
              <div>
                <SectionLabel>Dive Computer</SectionLabel>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="TCS 1" type="number" value={d.tcs1} onChange={(v) => updateDive(activeTab, "tcs1", v)} />
                  <Field label="TCS 2" type="number" value={d.tcs2} onChange={(v) => updateDive(activeTab, "tcs2", v)} />
                </div>
              </div>

              {/* Environment */}
              <div>
                <SectionLabel>Environment</SectionLabel>
                <div className="grid grid-cols-3 gap-3">
                  <SelectField label="Weather" value={d.weather} options={WEATHER_OPTIONS} onChange={(v) => updateDive(activeTab, "weather", v)} />
                  <SelectField label="Waving" value={d.waving} options={WAVING_OPTIONS} onChange={(v) => updateDive(activeTab, "waving", v)} />
                  <SelectField label="Current" value={d.current} options={CURRENT_OPTIONS} onChange={(v) => updateDive(activeTab, "current", v)} />
                  <Field label="Visibility (m)" type="number" value={d.visibility} onChange={(v) => updateDive(activeTab, "visibility", v)} />
                  <Field label="Water Temp (°C)" type="number" value={d.waterTemp} onChange={(v) => updateDive(activeTab, "waterTemp", v)} />
                </div>
              </div>

              {/* Equipment */}
              <div>
                <SectionLabel>Equipment</SectionLabel>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Ballast (kg)" type="number" value={d.ballast} onChange={(v) => updateDive(activeTab, "ballast", v)} />
                  <Field label="Suit Thickness (mm)" type="number" value={d.suitThickness} onChange={(v) => updateDive(activeTab, "suitThickness", v)} />
                </div>
              </div>

            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4 shrink-0">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 transition hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-sky-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-600 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save Dive"}
          </button>
        </div>
      </div>
    </div>
  );
}
