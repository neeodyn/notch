import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Copy, Eye, Mail, MessageSquare, Share } from "lucide-react";
import { toast } from "sonner";
import BottomSheet from "@/components/notch/BottomSheet";
import SentConfirm from "@/components/notch/share/SentConfirm";
import SharePreviewCard from "@/components/notch/share/SharePreviewCard";
import { composeShareText, defaultShareMessage, mailtoHref, smsHref } from "@/lib/share-message";

const ACTION = "flex min-h-14 items-center gap-3 rounded-2xl bg-card px-4 text-[16px] font-semibold text-foreground transition-colors active:bg-secondary";

/**
 * Send the homeowner link. Native share marks the quote sent once the share
 * sheet completes (a cancel changes nothing). Text, email and copy can't be
 * confirmed, so the painter is asked before the quote is marked sent.
 */
export default function ShareQuoteSheet({ open, onOpenChange, quote, business, total, currency, onMarkSent }) {
  const [url, setUrl] = useState("");
  const [message, setMessage] = useState("");
  const [canShare, setCanShare] = useState(false);
  const [handedOff, setHandedOff] = useState(null);
  const [marking, setMarking] = useState(false);
  const isDraft = quote.status === "draft";
  const subject = `Painting quote from ${business?.name || "your painter"}`;
  const fullText = composeShareText(message, url);

  useEffect(() => {
    if (!open) return;
    setUrl(`${window.location.origin}/q/${quote.public_token}`);
    setMessage(defaultShareMessage({ clientName: quote.client_name, address: quote.address, businessName: business?.name }));
    setCanShare(typeof navigator.share === "function");
    setHandedOff(null);
  }, [open, quote.public_token, quote.client_name, quote.address, business?.name]);

  async function markSent(channel) {
    if (!isDraft || marking) return;
    setMarking(true);
    try {
      const res = await onMarkSent(channel);
      if (!res?.blockedByTrial) toast.success("Quote marked as sent");
      setHandedOff(null);
    } catch (err) {
      toast.error(err?.message || "Couldn't mark the quote as sent");
    } finally {
      setMarking(false);
    }
  }

  async function nativeShare() {
    try {
      await navigator.share({ title: subject, text: message.trim(), url });
    } catch (err) {
      if (err?.name !== "AbortError") toast.error("Couldn't open sharing. Use Text message or Copy link instead.");
      return;
    }
    await markSent("share");
  }

  async function copyLink() {
    const ok = await (navigator.clipboard?.writeText(url).then(() => true, () => false) ?? false);
    if (!ok) return toast("Press and hold the link to copy it");
    toast.success("Link copied");
    if (isDraft) setHandedOff("copy");
  }

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title={isDraft ? "Send quote" : "Share quote again"} description="The homeowner gets a private link to view and accept.">
      <div className="space-y-5">
        <SharePreviewCard quote={quote} businessName={business?.name} total={total} currency={currency} />

        <div>
          <label htmlFor="share-message" className="text-[14px] font-medium text-muted-foreground">Message</label>
          <textarea id="share-message" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} className="mt-1.5 w-full rounded-2xl border border-input bg-background p-3.5 text-[16px] leading-snug" />
          <p className="mt-1 text-[13px] text-muted-foreground">The quote link goes at the end.</p>
        </div>

        <div className="grid gap-2">
          {canShare && (
            <button type="button" onClick={nativeShare} disabled={marking} className="flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-primary text-[17px] font-semibold text-primary-foreground disabled:opacity-60">
              <Share className="h-5 w-5" /> Share…
            </button>
          )}
          <div className="grid grid-cols-2 gap-2">
            <a href={smsHref(quote.client_phone, fullText)} onClick={() => isDraft && setHandedOff("sms")} className={ACTION}>
              <MessageSquare className="h-5 w-5 text-primary" /> Text
            </a>
            <a href={mailtoHref(quote.client_email, subject, fullText)} onClick={() => isDraft && setHandedOff("email")} className={ACTION}>
              <Mail className="h-5 w-5 text-primary" /> Email
            </a>
          </div>
          <div className="flex items-center gap-2 rounded-2xl bg-card p-1.5 pl-4">
            <input readOnly value={url} aria-label="Quote link" onFocus={(e) => e.target.select()} className="min-w-0 flex-1 bg-transparent text-[14px] text-muted-foreground outline-none" />
            <button type="button" onClick={copyLink} className="flex h-11 shrink-0 items-center gap-1.5 rounded-xl bg-background px-3.5 text-[14px] font-semibold text-foreground">
              <Copy className="h-4 w-4" /> Copy
            </button>
          </div>
        </div>

        {handedOff && isDraft && (
          <SentConfirm channel={handedOff} clientName={quote.client_name} marking={marking} onConfirm={() => markSent(handedOff)} onDismiss={() => setHandedOff(null)} />
        )}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <Link to="/q/$token" params={{ token: quote.public_token }} className="flex min-h-11 items-center gap-1.5 text-[15px] font-medium text-primary">
            <Eye className="h-4 w-4" /> See what they'll see
          </Link>
          {isDraft && !handedOff && (
            <button type="button" disabled={marking} onClick={() => markSent("manual")} className="min-h-11 text-[14px] font-medium text-muted-foreground hover:text-foreground">
              Sent it another way
            </button>
          )}
        </div>
      </div>
    </BottomSheet>
  );
}