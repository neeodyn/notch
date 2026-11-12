import { useEffect, useState } from "react";
import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, LogOut, Moon, Sun, Upload } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Image } from "@/components/ui/image";
import PriceBookEditor from "@/components/notch/PriceBookEditor";
import { getAppBootstrap, saveBusinessProfile } from "@/lib/server-fns";

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
  const [name, setName] = useState(business?.name || "My Tree Service");
  const [phone, setPhone] = useState(business?.phone || "");
  const [email, setEmail] = useState(business?.email || user?.email || "");
  const [currency, setCurrency] = useState(business?.currency || "USD");
  const [taxRate, setTaxRate] = useState(business?.tax_rate ?? 0);
  const [minCharge, setMinCharge] = useState(business?.min_charge ?? 0);
  const [terms, setTerms] = useState(business?.terms || "");
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
      const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({ file_uri });
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
          name: name.trim() || "My Tree Service",
          phone: phone.trim(),
          email: email.trim(),
          logo_uri: logoUri || null,
          currency: currency || "USD",
          tax_rate: Math.max(0, Number(taxRate) || 0),
          min_charge: Math.max(0, Number(minCharge) || 0),
          terms: terms.trim(),
          price_book: priceBook,
        },
      });
      await router.invalidate();
      toast.success("Settings saved");
    } catch (err) {
      toast.error(err?.message || "Could not save settings");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-background pb-28 text-foreground">
      <header className="mx-auto flex max-w-2xl items-center justify-between px-4 pt-5 sm:px-5">
        <Link
          to="/app"
          className="flex min-h-[44px] items-center gap-1.5 rounded-xl px-2 text-[16px] font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Quotes</span>
        </Link>

        <button
          type="button"
          onClick={toggleDark}
          className="flex min-h-[44px] items-center gap-2 rounded-xl border border-border bg-card px-3.5 text-[14px] font-medium text-foreground"
        >
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          <span>{dark ? "Light mode" : "Dark mode"}</span>
        </button>
      </header>

      <form onSubmit={handleSave} className="mx-auto mt-3 max-w-2xl space-y-6 px-4 sm:px-5">
        <h1 className="large-title text-foreground">Settings</h1>

        {/* Plan & Trial Card */}
        <section className="rounded-[18px] border border-border bg-card p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[13px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">Plan</p>
              <p className="mt-0.5 text-[18px] font-bold text-foreground">
                {business?.plan === "active"
                  ? "Notch Active"
                  : business?.trial_expired
                  ? "7-day trial ended"
                  : `Free trial · ${business?.trial_days_left ?? 7} days left`}
              </p>
            </div>
            <span className="rounded-full bg-accent px-3 py-1 text-[13px] font-semibold text-accent-foreground">
              {business?.plan === "active" ? "Active" : "Trial"}
            </span>
          </div>
          <p className="mt-2 text-[14px] text-muted-foreground">
            {business?.plan === "active"
              ? "Unlimited quotes and homeowner links enabled."
              : "Your 7-day clock starts on your first sent quote. Existing homeowner quote pages never expire."}
          </p>
        </section>

        {/* Company Details */}
        <section className="space-y-4 rounded-[18px] border border-border bg-card p-4 sm:p-5">
          <h2 className="text-[18px] font-semibold text-foreground">Business profile</h2>

          <div className="flex items-center gap-4">
            {logoPreview ? (
              <Image src={logoPreview} alt="Logo" className="h-14 w-14 rounded-2xl border border-border object-cover" />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-[12px] font-semibold text-muted-foreground">
                Logo
              </div>
            )}
            <label className="flex min-h-[44px] cursor-pointer items-center gap-2 rounded-xl bg-secondary px-4 text-[14px] font-semibold text-foreground">
              <Upload className="h-4 w-4" />
              <span>Change logo</span>
              <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="text-[14px] font-medium text-muted-foreground">Company name</span>
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
                className="mt-1 h-12 w-full rounded-xl border border-input bg-background px-3.5 text-[16px]"
              />
            </label>
            <label className="block">
              <span className="text-[14px] font-medium text-muted-foreground">Notification email</span>
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
                <option value="USD">USD ($)</option>
                <option value="CAD">CAD ($)</option>
                <option value="AUD">AUD ($)</option>
                <option value="NZD">NZD ($)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </label>
            <label className="block">
              <span className="text-[14px] font-medium text-muted-foreground">Tax rate (%)</span>
              <input
                type="number"
                min="0"
                max="30"
                step="0.05"
                value={taxRate}
                onChange={(e) => setTaxRate(e.target.value)}
                className="tabular-money mt-1 h-12 w-full rounded-xl border border-input bg-background px-3.5 text-[16px]"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-[14px] font-medium text-muted-foreground">Minimum job charge ($)</span>
              <input
                type="number"
                min="0"
                step="25"
                value={minCharge}
                onChange={(e) => setMinCharge(e.target.value)}
                className="tabular-money mt-1 h-12 w-full rounded-xl border border-input bg-background px-3.5 text-[16px]"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-[14px] font-medium text-muted-foreground">Proposal terms</span>
              <textarea
                rows={3}
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                className="mt-1 w-full rounded-xl border border-input bg-background p-3 text-[15px]"
              />
            </label>
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

        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/90 backdrop-blur-md safe-bottom">
          <div className="mx-auto max-w-2xl px-4 pt-3 sm:px-5">
            <button
              type="submit"
              disabled={saving}
              className="flex h-14 w-full items-center justify-center rounded-2xl bg-primary text-[17px] font-semibold text-primary-foreground disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save settings"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}