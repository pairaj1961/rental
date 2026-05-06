'use client';

import { useState, useEffect } from 'react';
import { Settings, Save, RefreshCw, Percent, Building2 } from 'lucide-react';

interface RentalSettings {
  depositRate:   number;
  lateFeePerDay: number;
  taxRate:       number;
  currency:      string;
  companyName:   string;
  updatedAt:     string | null;
}

const DEFAULTS: RentalSettings = {
  depositRate:   20,
  lateFeePerDay: 500,
  taxRate:       7,
  currency:      'THB',
  companyName:   '',
  updatedAt:     null,
};

function FieldGroup({
  label, hint, children,
}: {
  label: string; hint?: string; children: React.ReactNode;
}) {
  return (
    <div
      className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-6 py-4 border-b last:border-0"
      style={{ borderColor: '#f0f0f0' }}
    >
      <div className="sm:w-56 shrink-0">
        <p className="text-sm font-semibold" style={{ color: '#323338' }}>{label}</p>
        {hint && <p className="text-xs mt-0.5" style={{ color: '#676879' }}>{hint}</p>}
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function NumberInput({
  value, onChange, min = 0, max, step = 0.1, suffix,
}: {
  value: number; onChange: (v: number) => void;
  min?: number; max?: number; step?: number; suffix?: string;
}) {
  return (
    <div className="relative inline-flex items-center">
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="text-sm rounded-lg pr-10 pl-3 outline-none transition-all"
        style={{ height: 36, width: 130, border: '1px solid #e6e9ef' }}
        onFocus={(e) => (e.target.style.borderColor = '#00897b')}
        onBlur={(e) => (e.target.style.borderColor = '#e6e9ef')}
      />
      {suffix && (
        <span className="absolute right-3 text-xs font-medium pointer-events-none"
          style={{ color: '#676879' }}>
          {suffix}
        </span>
      )}
    </div>
  );
}

function TextInput({
  value, onChange, placeholder,
}: {
  value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="text-sm rounded-lg px-3 outline-none transition-all w-full max-w-sm"
      style={{ height: 36, border: '1px solid #e6e9ef' }}
      onFocus={(e) => (e.target.style.borderColor = '#00897b')}
      onBlur={(e) => (e.target.style.borderColor = '#e6e9ef')}
    />
  );
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<RentalSettings>(DEFAULTS);
  const [draft,    setDraft]    = useState<RentalSettings>(DEFAULTS);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/settings', { credentials: 'include' })
      .then((r) => r.json())
      .then((json) => {
        if (json.data) {
          const s: RentalSettings = {
            depositRate:   json.data.depositRate   ?? 20,
            lateFeePerDay: json.data.lateFeePerDay ?? 500,
            taxRate:       json.data.taxRate       ?? 7,
            currency:      json.data.currency      ?? 'THB',
            companyName:   json.data.companyName   ?? '',
            updatedAt:     json.data.updatedAt     ?? null,
          };
          setSettings(s);
          setDraft(s);
        }
      })
      .catch(() => setError('Failed to load settings'))
      .finally(() => setLoading(false));
  }, []);

  const isDirty = JSON.stringify(draft) !== JSON.stringify(settings);

  function resetDraft() {
    setDraft({ ...settings });
    setError(null);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          depositRate:   draft.depositRate,
          lateFeePerDay: draft.lateFeePerDay,
          taxRate:       draft.taxRate,
          currency:      draft.currency,
          companyName:   draft.companyName || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed to save');

      const updated: RentalSettings = {
        depositRate:   json.data.depositRate,
        lateFeePerDay: json.data.lateFeePerDay,
        taxRate:       json.data.taxRate,
        currency:      json.data.currency,
        companyName:   json.data.companyName ?? '',
        updatedAt:     json.data.updatedAt,
      };
      setSettings(updated);
      setDraft(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const upd = <K extends keyof RentalSettings>(k: K, v: RentalSettings[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  if (loading) {
    return (
      <div className="p-6 max-w-2xl">
        <div className="skeleton h-8 w-40 mb-6 rounded" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-20 mb-4 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl">

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: '#e0f2f1' }}>
            <Settings size={20} style={{ color: '#00897b' }} />
          </div>
          <div>
            <h1 className="page-title">Settings</h1>
            <p className="page-subtitle">Rental system configuration</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isDirty && (
            <button
              onClick={resetDraft}
              className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border transition-colors hover:bg-gray-50"
              style={{ borderColor: '#e6e9ef', color: '#676879' }}
            >
              <RefreshCw size={14} />
              Reset
            </button>
          )}
          <button
            onClick={save}
            disabled={saving || !isDirty}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg transition-all"
            style={{
              backgroundColor: isDirty ? '#00897b' : '#e6e9ef',
              color:           isDirty ? '#fff'     : '#aaa',
              cursor:          isDirty ? 'pointer'  : 'not-allowed',
            }}
          >
            {saving
              ? <><RefreshCw size={14} className="animate-spin" /> Saving…</>
              : <><Save size={14} /> Save Changes</>
            }
          </button>
        </div>
      </div>

      {/* Toast */}
      {saved && (
        <div className="mb-4 px-4 py-3 rounded-lg text-sm font-medium"
          style={{ backgroundColor: '#e0f8ef', color: '#00875a' }}>
          ✓ Settings saved successfully
        </div>
      )}
      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg text-sm font-medium"
          style={{ backgroundColor: '#fce4ec', color: '#c62828' }}>
          {error}
        </div>
      )}

      {/* ── Financial Settings ───────────────────────────────────── */}
      <div className="card p-5 mb-5">
        <div className="flex items-center gap-2 mb-1">
          <Percent size={16} style={{ color: '#00897b' }} />
          <h2 className="text-sm font-bold" style={{ color: '#323338' }}>Financial Settings</h2>
        </div>
        <p className="text-xs mb-5" style={{ color: '#676879' }}>
          These values are used when creating contracts and generating invoices.
        </p>

        <FieldGroup
          label="Deposit Rate"
          hint="Default deposit as % of total contract value"
        >
          <div className="flex items-center gap-3">
            <NumberInput
              value={draft.depositRate}
              onChange={(v) => upd('depositRate', v)}
              min={0} max={100} step={0.5} suffix="%"
            />
            <span className="text-xs" style={{ color: '#676879' }}>
              ฿100,000 contract → ฿{(1000 * draft.depositRate).toLocaleString()} deposit
            </span>
          </div>
        </FieldGroup>

        <FieldGroup
          label="Tax Rate (VAT)"
          hint="Applied to all rental invoices"
        >
          <div className="flex items-center gap-3">
            <NumberInput
              value={draft.taxRate}
              onChange={(v) => upd('taxRate', v)}
              min={0} max={50} step={0.5} suffix="%"
            />
            <span className="text-xs" style={{ color: '#676879' }}>
              Thailand standard VAT: 7%
            </span>
          </div>
        </FieldGroup>

        <FieldGroup
          label="Late Fee / Day"
          hint="Daily penalty for overdue returns"
        >
          <div className="flex items-center gap-3">
            <NumberInput
              value={draft.lateFeePerDay}
              onChange={(v) => upd('lateFeePerDay', v)}
              min={0} step={50} suffix="฿"
            />
            <span className="text-xs" style={{ color: '#676879' }}>
              Per day after return date
            </span>
          </div>
        </FieldGroup>

        <FieldGroup
          label="Currency"
          hint="Displayed on invoices and reports"
        >
          <select
            value={draft.currency}
            onChange={(e) => upd('currency', e.target.value)}
            className="text-sm rounded-lg px-3 outline-none"
            style={{ height: 36, border: '1px solid #e6e9ef' }}
          >
            <option value="THB">THB — Thai Baht (฿)</option>
            <option value="USD">USD — US Dollar ($)</option>
            <option value="SGD">SGD — Singapore Dollar (S$)</option>
            <option value="EUR">EUR — Euro (€)</option>
          </select>
        </FieldGroup>
      </div>

      {/* ── Company Information ──────────────────────────────────── */}
      <div className="card p-5 mb-5">
        <div className="flex items-center gap-2 mb-1">
          <Building2 size={16} style={{ color: '#00897b' }} />
          <h2 className="text-sm font-bold" style={{ color: '#323338' }}>Company Information</h2>
        </div>
        <p className="text-xs mb-5" style={{ color: '#676879' }}>
          Displayed on PDF documents and reports.
        </p>

        <FieldGroup
          label="Company Name"
          hint="Shown on invoices, delivery notes"
        >
          <TextInput
            value={draft.companyName}
            onChange={(v) => upd('companyName', v)}
            placeholder="e.g. Tools Act Co., Ltd."
          />
        </FieldGroup>
      </div>

      {/* ── Info panel ───────────────────────────────────────────── */}
      <div className="card p-5">
        <p className="text-xs font-semibold uppercase tracking-wide mb-4" style={{ color: '#676879' }}>
          Current Values
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { label: 'Deposit Rate', value: `${settings.depositRate}%` },
            { label: 'VAT Rate',     value: `${settings.taxRate}%` },
            { label: 'Late Fee',     value: `฿${settings.lateFeePerDay.toLocaleString()}/day` },
            { label: 'Currency',     value: settings.currency },
            {
              label: 'Last Updated',
              value: settings.updatedAt
                ? new Date(settings.updatedAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
                : 'Never',
            },
            { label: 'Company', value: settings.companyName || '—' },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-lg p-3" style={{ backgroundColor: '#fafafa' }}>
              <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: '#676879' }}>
                {label}
              </p>
              <p className="text-sm font-bold truncate" style={{ color: '#323338' }} title={value}>
                {value}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
