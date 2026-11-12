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
import { getAppBootstrap, saveBusinessProfile } from "@/lib/server-fns";
import { DEFAULT_PAINTING_TERMS } from "@/lib/legal";

export const Route = createFileRoute("/_authed/app/settings")({
  head: () => ({ meta: [{ title: "Settings — Notch" }] }),
  loader: () => getAppBootstrap(),
  component: SettingsScreen,
});

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
  const [pricesIncludeGst, setPricesIncludeGst] = useState(
    Boolean(business?.prices_include_gst)
  );
  const [defaultStudM, setDefaultStudM] = useState(business?.default_stud_m ?? 2.4);
  const [openingsPct, setOpeningsPct] = useState(business?.openings_pct ?? 10);
  const [minCharge, setMinCharge] = useState(business?.min_charge ?? 0);
  const [terms, setTerms] = useState(business?.terms || "");
  const [billingInterval, setBillingInterval] = useState(
    business?.billing_interval || "monthly"
  );
  const [logoUri, setLogoUri] = useState(business?.logo_uri || "");
  const [logoPreview, setLogoPreview] = useState(business?.logo_url || "");
  const [priceBook, setPriceBook] = useState(business?.price_book || null);
  const [saving, setSaving] = useState(false);

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
    try {
      const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
      const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({
        file_uri,
      });
      setLogoUri(file_uri);
      setLogoPreview(signed_url);
      toast.success("Logo updated");
    } catch (err) {
      toast.error(err?.message || "Could not upload logo");
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await runSave({
        data: {
          name: name.trim() || "My Painting & Decorating",
          phone: phone.trim(),
          email: email.trim(),
          logo_uri: logoUri || null,
          currency: currency || "NZD",
          gst_number: gstNumber.trim(),
          gst_rate: 0.15,
          prices_include_gst: pricesIncludeGst,
          default_stud_m: Math.max(1.8, Number(defaultStudM) || 2.4),
          openings_pct: Math.max(0, Math.min(50, Number(openingsPct) || 0)),
          min_charge: Math.max(0, Number(minCharge) || 0),
          terms: terms.trim(),
          billing_interval: billingInterval,
          price_book: priceBook,
        },
      });
      await router.invalidate({ sync: true });
      toast.success("Settings saved");
    } catch (err) {
      toast.error(err?.message || "Could not save settings");
    } finally {
      setSaving(false);
    }
  }

  const isPaid = business?.plan === "active" || business?.plan === "founding";

  return (
    <div className="min-h-dvh bg-background pb-32 text-foreground">
      <AppTopBar
        title="Settings"
        actions={
          <TopBarIcon
            label={dark ? "Switch to light mode" : "Switch to dark mode"}
            onClick={toggleDark}
          >
            {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </TopBarIcon>
        }
      />

      <form
        onSubmit={handleSave}
        className="mx-auto mt-4 max-w-2xl space-y-6 px-4 sm:px-5"
      >

        {/* Plans & 7-Day Trial Card */}
        <section className="apple-surface space-y-4 rounded-[20px] border border-border bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[0.05em] text-muted-foreground">
                Subscription &amp; trial
              </p>
              <p className="mt-0.5 text-[19px] font-bold text-foreground">
                {business?.plan === "founding"
                  ? "Founding Painter Plan"
                  : business?.plan === "active"
                  ? "Standard Plan"
                  : business?.trial_expired
                  ? "7-day free trial ended"
                  : `Free trial · ${business?.trial_days_left ?? 7} days remaining`}
              </p>
            </div>

            <div className="inline-flex rounded-xl border border-border bg-background p-1">
              <button
                type="button"
                onClick={() => setBillingInterval("monthly")}
                className={`min-h-[36px] rounded-lg px-3 text-[12px] font-semibold ${
                  billingInterval === "monthly"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground"
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setBillingInterval("yearly")}
                className={`min-h-[36px] rounded-lg px-3 text-[12px] font-semibold ${
                  billingInterval === "yearly"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground"
                }`}
              >
                Yearly
              </button>
            </div>
          </div>

          {!isPaid && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border-2 border-primary bg-background p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[15px] font-bold text-foreground">
                    Founding Painter
                  </span>
                  <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-semibold text-accent-foreground">
                    First 20
                  </span>
                </div>
                <p className="tabular-money mt-1.5 text-[26px] font-bold text-foreground">
                  {billingInterval === "yearly" ? "NZ$390/yr" : "NZ$39/mo"}
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-[13px] text-muted-foreground">
                  <Check className="h-3.5 w-3.5 text-primary" />
                  <span>Founding rate locked for life</span>
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-background p-4">
                <span className="text-[15px] font-bold text-foreground">Standard</span>
                <p className="tabular-money mt-1.5 text-[26px] font-bold text-foreground">
                  {billingInterval === "yearly" ? "NZ$490/yr" : "NZ$49/mo"}
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-[13px] text-muted-foreground">
                  <Check className="h-3.5 w-3.5 text-primary" />
                  <span>Unlimited quotes &amp; SMS follow-ups</span>
                </p>
              </div>
            </div>
          )}

          <p className="text-[13px] text-muted-foreground">
            {isPaid
              ? "Unlimited house walks and homeowner quote links active."
              : "7 days free from your first sent quote. Connect Stripe checkout when ready to activate live billing; previously sent homeowner quotes remain open forever."}
          </p>
        </section>

        {/* Business & GST Profile */}
        <section className="apple-surface space-y-4 rounded-[20px] border border-border bg-card p-5">
          <h2 className="text-[18px] font-semibold text-foreground">
            Business &amp; GST details
          </h2>

          <div className="flex items-center gap-4">
            {logoPreview ? (
              <Image
                src={logoPreview}
                alt="Logo"
                className="h-14 w-14 rounded-2xl border border-border object-cover"
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-[12px] font-semibold text-muted-foreground">
                Logo
              </div>
            )}
            <label className="flex min-h-[44px] cursor-pointer items-center gap-2 rounded-xl bg-secondary px-4 text-[14px] font-semibold text-foreground">
              <Upload className="h-4 w-4" />
              <span>Change logo</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoUpload}
              />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="text-[14px] font-medium text-muted-foreground">
                Company name
              </span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 h-12 w-full rounded-xl border border-input bg-background px-3.5 text-[16px]"
              />
            </label>
            <label className="block">
              <span className="text-[14px] font-medium text-muted-foreground">Phone</span>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="021 555 0198"
                className="mt-1 h-12 w-full rounded-xl border border-input bg-background px-3.5 text-[16px]"
              />
            </label>
            <label className="block">
              <span className="text-[14px] font-medium text-muted-foreground">
                GST number (optional)
              </span>
              <input
                type="text"
                value={gstNumber}
                onChange={(e) => setGstNumber(e.target.value)}
                placeholder="128-492-017"
                className="tabular-money mt-1 h-12 w-full rounded-xl border border-input bg-background px-3.5 text-[16px]"
              />
              <span className="mt-1.5 block text-[12px] leading-snug text-muted-foreground">
                Shows on every quote. Only charge GST if you're registered for GST with Inland Revenue.
              </span>
            </label>
            <label className="block">
              <span className="text-[14px] font-medium text-muted-foreground">
                Notification email
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 h-12 w-full rounded-xl border border-input bg-background px-3.5 text-[16px]"
              />
            </label>
            <label className="block">
              <span className="text-[14px] font-medium text-muted-foreground">Currency</span>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="mt-1 h-12 w-full rounded-xl border border-input bg-background px-3.5 text-[16px]"
              >
                <option value="NZD">NZD ($)</option>
                <option value="AUD">AUD ($)</option>
                <option value="USD">USD ($)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </label>
          </div>

          <label className="flex min-h-[48px] cursor-pointer items-center justify-between gap-4 rounded-2xl border border-border bg-background px-4 py-3">
            <div>
              <span className="block text-[15px] font-semibold text-foreground">
                Prices include 15% GST
              </span>
              <span className="text-[13px] text-muted-foreground">
                {pricesIncludeGst
                  ? "Line prices include GST (GST portion shown on summary)"
                  : "Line prices are excl. GST, with 15% GST added at the bottom"}
              </span>
            </div>
            <input
              type="checkbox"
              checked={pricesIncludeGst}
              onChange={(e) => setPricesIncludeGst(e.target.checked)}
              className="h-6 w-6 shrink-0 accent-[hsl(var(--primary))]"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block">
              <span className="text-[13px] font-medium text-muted-foreground">
                Default stud (m)
              </span>
              <input
                type="number"
                min="1.8"
                max="6"
                step="0.1"
                value={defaultStudM}
                onChange={(e) => setDefaultStudM(e.target.value)}
                className="tabular-money mt-1 h-12 w-full rounded-xl border border-input bg-background px-3.5 text-[16px]"
              />
            </label>
            <label className="block">
              <span className="text-[13px] font-medium text-muted-foreground">
                Openings deduction (%)
              </span>
              <input
                type="number"
                min="0"
                max="50"
                step="1"
                value={openingsPct}
                onChange={(e) => setOpeningsPct(e.target.value)}
                className="tabular-money mt-1 h-12 w-full rounded-xl border border-input bg-background px-3.5 text-[16px]"
              />
            </label>
            <label className="block">
              <span className="text-[13px] font-medium text-muted-foreground">
                Min job charge ($)
              </span>
              <input
                type="number"
                min="0"
                step="25"
                value={minCharge}
                onChange={(e) => setMinCharge(e.target.value)}
                className="tabular-money mt-1 h-12 w-full rounded-xl border border-input bg-background px-3.5 text-[16px]"
              />
            </label>
          </div>

          <div>
            <div className="flex items-center justify-between gap-3">
              <label htmlFor="proposal-terms" className="text-[14px] font-medium text-muted-foreground">
                Proposal terms &amp; workmanship notes
              </label>
              {terms.trim() !== DEFAULT_PAINTING_TERMS && (
                <button
                  type="button"
                  onClick={() => setTerms(DEFAULT_PAINTING_TERMS)}
                  className="min-h-[36px] shrink-0 text-[13px] font-medium text-primary hover:underline"
                >
                  Use standard NZ terms
                </button>
              )}
            </div>
            <textarea
              id="proposal-terms"
              rows={8}
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              className="mt-1 w-full rounded-xl border border-input bg-background p-3 text-[15px] leading-relaxed"
            />
            <p className="mt-1.5 text-[12px] leading-snug text-muted-foreground">
              Shown on every quote, with the date issued, a 30-day validity and a note that your client's consumer rights still apply.
            </p>
          </div>
        </section>

        <PriceBookEditor value={priceBook} onChange={setPriceBook} />

        <div className="pt-2">
          <button
            type="button"
            onClick={() => logout("/")}
            className="flex min-h-[44px] items-center gap-2 rounded-xl px-3 text-[15px] font-semibold text-destructive hover:bg-secondary"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign out</span>
          </button>
        </div>

        <AppDock>
          <button
            type="submit"
            disabled={saving}
            className="flex h-14 w-full items-center justify-center rounded-2xl bg-primary text-[17px] font-semibold text-primary-foreground disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save settings"}
          </button>
        </AppDock>
      </form>
    </div>
  );
}