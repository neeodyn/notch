import { useEffect, useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Check, LogOut, Moon, Sun, Upload } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Image } from "@/components/ui/image";
import AppDock from "@/components/notch/AppDock";
import AppTopBar, { TopBarIcon } from "@/components/notch/AppTopBar";
import PriceBookEditor from "@/components/notch/PriceBookEditor";
import UnsavedChangesDialog from "@/components/notch/UnsavedChangesDialog";
import PlanCard from "@/components/settings/PlanCard";
import SettingsSection from "@/components/settings/SettingsSection";
import TextField from "@/components/settings/TextField";
import { useUnsavedGuard } from "@/hooks/use-unsaved-guard";
import { getAppBootstrap, saveBusinessProfile } from "@/lib/server-fns";
import { DEFAULT_PAINTING_TERMS } from "@/lib/legal";

export const Route = createFileRoute("/_authed/app/settings")({
  head: () => ({ meta: [{ title: "Settings — Notch" }] }),
  loader: () => getAppBootstrap(),
  component: SettingsScreen,
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate({ name, email, defaultStudM }) {
  const errors = {};
  if (!name.trim()) errors.name = "Add your company name. It heads every quote.";
  if (email.trim() && !EMAIL_RE.test(email.trim())) errors.email = "That email address doesn't look right.";
  const stud = Number(defaultStudM);
  if (!(stud >= 1.8 && stud <= 6)) errors.stud = "Use a stud between 1.8 and 6 m.";
  return errors;
}

function SettingsScreen() {
  const { user, business } = Route.useLoaderData();
  const router = useRouter();
  const { logout } = useAuth();
  const runSave = useServerFn(saveBusinessProfile);

  const [dark, setDark] = useState(false);
  const [name, setName] = useState(business?.name || "My Painting & Decorating");
  const [phone, setPhone] = useState(business?.phone || "");
  const [email, setEmail] = useState(business?.email || user?.email || "");
  const [currency, setCurrency] = useState(business?.currency || "NZD");
  const [gstNumber, setGstNumber] = useState(business?.gst_number || "");
  const [pricesIncludeGst, setPricesIncludeGst] = useState(Boolean(business?.prices_include_gst));
  const [defaultStudM, setDefaultStudM] = useState(business?.default_stud_m ?? 2.4);
  const [openingsPct, setOpeningsPct] = useState(business?.openings_pct ?? 10);
  const [minCharge, setMinCharge] = useState(business?.min_charge ?? 0);
  const [terms, setTerms] = useState(business?.terms || "");
  const [billingInterval, setBillingInterval] = useState(business?.billing_interval || "monthly");
  const [logoUri, setLogoUri] = useState(business?.logo_uri || "");
  const [logoPreview, setLogoPreview] = useState(business?.logo_url || "");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [priceBook, setPriceBook] = useState(business?.price_book || null);
  const [saving, setSaving] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  const snapshot = JSON.stringify([name, phone, email, currency, gstNumber, pricesIncludeGst, String(defaultStudM), String(openingsPct), String(minCharge), terms, billingInterval, logoUri, priceBook]);
  const [baseline, setBaseline] = useState(snapshot);
  const dirty = snapshot !== baseline;
  const { blocker } = useUnsavedGuard(dirty);
  const errors = validate({ name, email, defaultStudM });
  const visibleErrors = showErrors ? errors : {};

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggleDark() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    window.localStorage.setItem("notch_theme", next ? "dark" : "light");
  }

  async function handleLogoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
      const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({ file_uri });
      setLogoUri(file_uri);
      setLogoPreview(signed_url);
      toast("New logo ready. Save to keep it.");
    } catch (err) {
      toast.error(err?.message || "Could not upload logo");
    } finally {
      setUploadingLogo(false);
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    if (Object.keys(errors).length > 0) {
      setShowErrors(true);
      toast.error("Check the highlighted fields");
      return;
    }
    setSaving(true);
    try {
      await runSave({
        data: {
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim(),
          logo_uri: logoUri || null,
          currency: currency || "NZD",
          gst_number: gstNumber.trim(),
          gst_rate: 0.15,
          prices_include_gst: pricesIncludeGst,
          default_stud_m: Number(defaultStudM),
          openings_pct: Math.max(0, Math.min(50, Number(openingsPct) || 0)),
          min_charge: Math.max(0, Number(minCharge) || 0),
          terms: terms.trim(),
          billing_interval: billingInterval,
          price_book: priceBook,
        },
      });
      setBaseline(snapshot);
      setShowErrors(false);
      await router.invalidate({ sync: true });
      toast.success("Settings saved");
    } catch (err) {
      toast.error(err?.message || "Could not save settings");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <AppTopBar
        title="Settings"
        actions={
          <TopBarIcon label={dark ? "Switch to light mode" : "Switch to dark mode"} onClick={toggleDark}>
            {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </TopBarIcon>
        }
      />

      <form id="settings-form" onSubmit={handleSave} noValidate className="mx-auto mt-5 w-full max-w-2xl flex-1 space-y-9 px-4 pb-10 sm:px-5">
        <SettingsSection title="Business" description="Shown at the top of every homeowner quote.">
          <div className="flex items-center gap-4">
            {logoPreview ? (
              <Image src={logoPreview} alt="Company logo" className="h-14 w-14 rounded-2xl border border-border object-cover" />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-[12px] font-semibold text-muted-foreground">Logo</div>
            )}
            <label className="flex min-h-[44px] cursor-pointer items-center gap-2 rounded-xl bg-background px-4 text-[14px] font-semibold text-foreground">
              <Upload className="h-4 w-4" />
              <span>{uploadingLogo ? "Uploading…" : "Change logo"}</span>
              <input type="file" accept="image/*" className="sr-only" onChange={handleLogoUpload} />
            </label>
          </div>
          <TextField id="biz-name" label="Company name" value={name} onChange={(e) => setName(e.target.value)} error={visibleErrors.name} autoComplete="organization" />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField id="biz-phone" label="Phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="021 555 0198" autoComplete="tel" />
            <TextField id="biz-email" label="Notification email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} error={visibleErrors.email} hint="Where we tell you a quote was opened or accepted." autoComplete="email" />
          </div>
        </SettingsSection>

        <SettingsSection title="GST & currency">
          <TextField id="biz-gst" label="GST number (optional)" value={gstNumber} onChange={(e) => setGstNumber(e.target.value)} placeholder="128-492-017" inputClassName="tabular-money" hint="Shows on every quote. Only charge GST if you're registered with Inland Revenue." />
          <label className="flex min-h-[48px] cursor-pointer items-center justify-between gap-4 rounded-2xl border border-border bg-background px-4 py-3">
            <span>
              <span className="block text-[15px] font-semibold text-foreground">Prices include 15% GST</span>
              <span className="text-[13px] leading-snug text-muted-foreground">
                {pricesIncludeGst ? "Line prices include GST. The GST portion shows on the summary." : "Line prices are excl. GST, with 15% GST added at the bottom."}
              </span>
            </span>
            <input type="checkbox" checked={pricesIncludeGst} onChange={(e) => setPricesIncludeGst(e.target.checked)} className="h-6 w-6 shrink-0 accent-[hsl(var(--primary))]" />
          </label>
          <div>
            <label htmlFor="biz-currency" className="text-[14px] font-medium text-muted-foreground">Currency</label>
            <select id="biz-currency" value={currency} onChange={(e) => setCurrency(e.target.value)} className="mt-1 h-12 w-full rounded-xl border border-input bg-background px-3.5 text-[16px]">
              <option value="NZD">NZD ($)</option>
              <option value="AUD">AUD ($)</option>
              <option value="USD">USD ($)</option>
              <option value="GBP">GBP (£)</option>
            </select>
          </div>
        </SettingsSection>

        <SettingsSection title="Measuring defaults" description="Used when a measurement isn't spoken on the walk.">
          <div className="grid gap-4 sm:grid-cols-3">
            <TextField id="biz-stud" label="Default stud (m)" type="number" inputMode="decimal" min="1.8" max="6" step="0.1" value={defaultStudM} onChange={(e) => setDefaultStudM(e.target.value)} error={visibleErrors.stud} inputClassName="tabular-money" />
            <TextField id="biz-openings" label="Openings deduction (%)" type="number" inputMode="numeric" min="0" max="50" step="1" value={openingsPct} onChange={(e) => setOpeningsPct(e.target.value)} inputClassName="tabular-money" />
            <TextField id="biz-min" label="Min job charge ($)" type="number" inputMode="numeric" min="0" step="25" value={minCharge} onChange={(e) => setMinCharge(e.target.value)} inputClassName="tabular-money" />
          </div>
        </SettingsSection>

        <SettingsSection title="Price book" description="Optional. Prices rooms from your rates when you don't say a price." bare>
          <PriceBookEditor value={priceBook} onChange={setPriceBook} />
        </SettingsSection>

        <SettingsSection title="Quote terms">
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="proposal-terms" className="text-[14px] font-medium text-muted-foreground">Terms & workmanship notes</label>
            {terms.trim() !== DEFAULT_PAINTING_TERMS && (
              <button type="button" onClick={() => setTerms(DEFAULT_PAINTING_TERMS)} className="min-h-[44px] shrink-0 text-[13px] font-medium text-primary hover:underline">
                Use standard NZ terms
              </button>
            )}
          </div>
          <textarea id="proposal-terms" rows={8} value={terms} onChange={(e) => setTerms(e.target.value)} className="w-full rounded-xl border border-input bg-background p-3 text-[16px] leading-relaxed" />
          <p className="text-[12px] leading-snug text-muted-foreground">
            Shown on every quote, with the date issued, a 30-day validity and a note that your client's consumer rights still apply.
          </p>
        </SettingsSection>

        <SettingsSection title="Plan" bare>
          <PlanCard business={business} billingInterval={billingInterval} onIntervalChange={setBillingInterval} />
        </SettingsSection>

        <button type="button" onClick={() => logout("/")} className="flex min-h-[48px] items-center gap-2 rounded-xl px-3 text-[15px] font-semibold text-destructive hover:bg-secondary">
          <LogOut className="h-4 w-4" />
          <span>Sign out</span>
        </button>
      </form>

      <AppDock>
        <button
          type="submit"
          form="settings-form"
          disabled={saving || !dirty}
          className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-[17px] font-semibold text-primary-foreground transition-opacity disabled:opacity-50"
        >
          {saving ? "Saving…" : dirty ? "Save changes" : (<><Check className="h-5 w-5" /> All changes saved</>)}
        </button>
      </AppDock>

      <UnsavedChangesDialog blocker={blocker} />
    </div>
  );
}