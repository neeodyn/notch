import { useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { Image } from "@/components/ui/image";
import AppDock from "@/components/notch/AppDock";
import AppTopBar from "@/components/notch/AppTopBar";
import PriceBookEditor from "@/components/notch/PriceBookEditor";
import { getAppBootstrap, saveBusinessProfile } from "@/lib/server-fns";
import { DEFAULT_PAINTING_TERMS } from "@/lib/legal";

export const Route = createFileRoute("/_authed/app/setup")({
  head: () => ({ meta: [{ title: "Business setup — Notch" }] }),
  loader: () => getAppBootstrap(),
  component: SetupScreen,
});

const STUD_PRESETS = [2.4, 2.7, 3.0, 3.2];

function SetupScreen() {
  const { user, business } = Route.useLoaderData();
  const navigate = useNavigate();
  const runSaveBusiness = useServerFn(saveBusinessProfile);

  const [name, setName] = useState(business?.name || "");
  const [phone, setPhone] = useState(business?.phone || "");
  const [email, setEmail] = useState(business?.email || user?.email || "");
  const [gstNumber, setGstNumber] = useState(business?.gst_number || "");
  const [pricesIncludeGst, setPricesIncludeGst] = useState(
    Boolean(business?.prices_include_gst)
  );
  const [defaultStudM, setDefaultStudM] = useState(business?.default_stud_m ?? 2.4);
  const [logoUri, setLogoUri] = useState(business?.logo_uri || "");
  const [logoPreview, setLogoPreview] = useState(business?.logo_url || "");
  const [priceBook, setPriceBook] = useState(business?.price_book || null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleLogoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
      const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({
        file_uri,
      });
      setLogoUri(file_uri);
      setLogoPreview(signed_url);
      toast.success("Logo uploaded");
    } catch (err) {
      toast.error(err?.message || "Could not upload logo");
    } finally {
      setUploadingLogo(false);
    }
  }

  async function handleSubmit(skipBook = false) {
    const cleanName = name.trim() || "My Painting & Decorating";
    setSaving(true);
    try {
      await runSaveBusiness({
        data: {
          name: cleanName,
          phone: phone.trim(),
          email: email.trim(),
          logo_uri: logoUri || null,
          currency: business?.currency || "NZD",
          gst_number: gstNumber.trim(),
          gst_rate: business?.gst_rate ?? 0.15,
          prices_include_gst: pricesIncludeGst,
          default_stud_m: Number(defaultStudM) || 2.4,
          openings_pct: business?.openings_pct ?? 10,
          min_charge: business?.min_charge || 0,
          terms: business?.terms || DEFAULT_PAINTING_TERMS,
          price_book: skipBook ? null : priceBook,
        },
      });
      toast.success("Business setup saved");
      await navigate({ to: "/app" });
    } catch (err) {
      toast.error(err?.message || "Could not save setup");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-dvh bg-background pb-32 text-foreground">
      <AppTopBar
        title="Setup"
        actions={
          <button
            type="button"
            disabled={saving}
            onClick={() => handleSubmit(true)}
            className="flex min-h-11 items-center rounded-xl px-2.5 text-[14px] font-semibold text-primary disabled:opacity-50"
          >
            Skip price book
          </button>
        }
      />

      <main className="mx-auto mt-4 max-w-2xl space-y-6 px-4 sm:px-5">
        <p className="text-[16px] leading-snug text-muted-foreground">
          Your painting business details, shown on every homeowner quote. Everything here can be
          skipped or changed later.
        </p>

        {/* Company & GST Card */}
        <section className="apple-surface space-y-4 rounded-[20px] border border-border bg-card p-5">
          <div className="flex items-center gap-4">
            {logoPreview ? (
              <Image
                src={logoPreview}
                alt="Company logo"
                className="h-16 w-16 rounded-2xl border border-border object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary text-[13px] font-semibold text-muted-foreground">
                Logo
              </div>
            )}
            <label className="flex min-h-[44px] cursor-pointer items-center gap-2 rounded-xl bg-secondary px-4 text-[15px] font-semibold text-foreground">
              <Upload className="h-4 w-4" />
              <span>{uploadingLogo ? "Uploading…" : "Upload logo"}</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoChange}
              />
            </label>
          </div>

          <label className="block">
            <span className="text-[14px] font-medium text-muted-foreground">
              Business name
            </span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Kauri Coast Painters"
              className="mt-1 h-12 w-full rounded-xl border border-input bg-background px-3.5 text-[17px]"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-[14px] font-medium text-muted-foreground">
                Mobile / callback phone
              </span>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="021 555 0198"
                className="mt-1 h-12 w-full rounded-xl border border-input bg-background px-3.5 text-[17px]"
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
                className="tabular-money mt-1 h-12 w-full rounded-xl border border-input bg-background px-3.5 text-[17px]"
              />
            </label>
          </div>

          <label className="block">
            <span className="text-[14px] font-medium text-muted-foreground">
              Notification email
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="quotes@kauricoastpainters.co.nz"
              className="mt-1 h-12 w-full rounded-xl border border-input bg-background px-3.5 text-[17px]"
            />
          </label>
        </section>

        {/* GST Mode & Default Stud Height */}
        <section className="apple-surface space-y-4 rounded-[20px] border border-border bg-card p-5">
          <label className="flex min-h-[48px] cursor-pointer items-center justify-between gap-4">
            <div>
              <span className="block text-[16px] font-semibold text-foreground">
                My spoken &amp; rate-card prices include GST
              </span>
              <span className="text-[13px] text-muted-foreground">
                {pricesIncludeGst
                  ? "15% GST is extracted inside your line totals"
                  : "15% GST is added on top of your room prices (standard trade mode)"}
              </span>
            </div>
            <input
              type="checkbox"
              checked={pricesIncludeGst}
              onChange={(e) => setPricesIncludeGst(e.target.checked)}
              className="h-6 w-6 shrink-0 accent-[hsl(var(--primary))]"
            />
          </label>

          <div className="border-t border-border pt-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <span className="block text-[16px] font-semibold text-foreground">
                  Default stud height (m)
                </span>
                <span className="text-[13px] text-muted-foreground">
                  Used for wall m² when stud height is not spoken
                </span>
              </div>
              <input
                type="number"
                min="1.8"
                max="6"
                step="0.1"
                value={defaultStudM}
                onChange={(e) => setDefaultStudM(e.target.value)}
                className="tabular-money h-12 w-24 rounded-xl border border-input bg-background px-3 text-right text-[18px] font-bold"
              />
            </div>

            <div className="mt-2.5 flex flex-wrap gap-2">
              {STUD_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setDefaultStudM(preset)}
                  className={`min-h-[38px] rounded-xl px-3.5 text-[13px] font-semibold ${
                    Number(defaultStudM) === preset
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {preset.toFixed(1)} m {preset === 2.4 ? "(Standard)" : preset >= 3 ? "(Villa)" : ""}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Optional Painter Price Book */}
        <PriceBookEditor value={priceBook} onChange={setPriceBook} />

        <p className="text-center text-[13px] leading-snug text-muted-foreground">
          By continuing you agree to the Notch{" "}
          <Link to="/terms" target="_blank" className="text-primary hover:underline">Terms of Use</Link> and{" "}
          <Link to="/privacy" target="_blank" className="text-primary hover:underline">Privacy Policy</Link>.
        </p>
      </main>

      <AppDock>
        <button
          type="button"
          disabled={saving}
          onClick={() => handleSubmit(false)}
          className="flex h-14 w-full items-center justify-center rounded-2xl bg-primary text-[17px] font-semibold text-primary-foreground disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save and go to quotes"}
        </button>
      </AppDock>
    </div>
  );
}