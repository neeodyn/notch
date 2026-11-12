import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth-middleware";
import {
  calculateQuoteTotals,
  expandTreesToQuoteItems,
  matchPhotosToItems,
  priceSingleItem,
} from "@/lib/pricing";
import {
  applyVoiceEditWithRetry,
  createFollowUpSmsText,
  extractQuoteStructureWithRetry,
  generatePublicToken,
  getTrialDaysLeft,
  isTrialExpired,
  notifyOwnerByEmail,
  saveVersionSnapshot,
  signFileUriIfNeeded,
  transcribeAudioOnServer,
} from "@/lib/quote-engine.server";
import { SAMPLE_BUSINESS, SAMPLE_QUOTE, SAMPLE_QUOTE_TOKEN } from "@/components/sample/sampleQuoteData";

async function getOrInitBusiness(base44, user) {
  const byOwner = await base44.entities.Business.filter(
    { owner_id: user.id },
    { sort: "-created_date", limit: 1 }
  );
  if (byOwner.items?.length > 0) {
    return byOwner.items[0];
  }
  const recent = await base44.entities.Business.filter({}, { sort: "-created_date", limit: 25 });
  const matched = (recent.items || []).find(
    (b) => b.created_by_id === user.id || b.owner_id === user.id
  );
  return matched || null;
}

export const getAppBootstrap = createServerFn({ method: "GET" })
  .middleware([requireUser])
  .handler(async ({ context }) => {
    const base44 = context.getBase44();
    const business = await getOrInitBusiness(base44, context.user);
    const quotesPage = business
      ? await base44.entities.Quote.filter({ business_id: business.id }, { sort: "-created_date", limit: 100 })
      : await base44.entities.Quote.filter({}, { sort: "-created_date", limit: 100 });
    const quotes = (quotesPage.items || []).filter(
      (q) => q.created_by_id === context.user.id || (business && q.business_id === business.id)
    );
    const logoUrl = business?.logo_uri ? await signFileUriIfNeeded(base44, business.logo_uri) : null;

    return {
      user: {
        id: context.user.id,
        email: context.user.email,
        full_name: context.user.full_name || "",
      },
      business: business
        ? {
            ...business,
            logo_url: logoUrl,
            trial_expired: isTrialExpired(business),
            trial_days_left: getTrialDaysLeft(business),
          }
        : null,
      quotes,
    };
  });

const SaveBusinessSchema = z.object({
  name: z.string().min(1).max(140),
  phone: z.string().max(50).optional().default(""),
  email: z.string().max(140).optional().default(""),
  logo_uri: z.string().max(500).optional().nullable(),
  currency: z.string().max(8).optional().default("USD"),
  tax_rate: z.number().min(0).max(50).optional().default(0),
  min_charge: z.number().min(0).max(100000).optional().default(0),
  terms: z.string().max(4000).optional().default(""),
  price_book: z.record(z.string(), z.any()).nullable().optional(),
});

export const saveBusinessProfile = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .inputValidator((input) => SaveBusinessSchema.parse(input))
  .handler(async ({ data, context }) => {
    const base44 = context.getBase44();
    const existing = await getOrInitBusiness(base44, context.user);
    const payload = {
      name: data.name.trim(),
      phone: data.phone || "",
      email: data.email || context.user.email || "",
      logo_uri: data.logo_uri ?? existing?.logo_uri ?? "",
      currency: data.currency || "USD",
      tax_rate: Number(data.tax_rate) || 0,
      min_charge: Number(data.min_charge) || 0,
      terms: data.terms || "",
      price_book: data.price_book === undefined ? existing?.price_book ?? null : data.price_book,
    };

    if (existing) {
      return await base44.entities.Business.update(existing.id, {
        ...payload,
        owner_id: context.user.id,
      });
    }
    return await base44.entities.Business.create({
      ...payload,
      owner_id: context.user.id,
      plan: "trial",
    });
  });

export const createDraftQuote = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .handler(async ({ context }) => {
    const base44 = context.getBase44();
    let business = await getOrInitBusiness(base44, context.user);
    if (!business) {
      const fallbackName = context.user.full_name
        ? `${context.user.full_name.split(" ")[0]}'s Tree Service`
        : "My Tree Service";
      business = await base44.entities.Business.create({
        owner_id: context.user.id,
        name: fallbackName,
        phone: "",
        email: context.user.email || "",
        currency: "USD",
        tax_rate: 0,
        min_charge: 0,
        terms: "Payment due upon completion. Please clear vehicles from driveway prior to crew arrival.",
        price_book: null,
        plan: "trial",
      });
    }

    const quote = await base44.entities.Quote.create({
      business_id: business.id,
      client_name: "",
      client_phone: "",
      client_email: "",
      address: "",
      status: "draft",
      deposit_pct: 0,
      notes: "",
      unclear: [],
      public_token: generatePublicToken(),
      subtotal: 0,
      tax_amount: 0,
      total: 0,
      deposit_amount: 0,
      selected_optional_ids: [],
    });

    await base44.entities.QuoteEvent.create({
      quote_id: quote.id,
      type: "created",
      meta: {},
    });

    return { quote, business };
  });

const GetQuoteSchema = z.object({ quoteId: z.string().min(1).max(120) });

export const getQuoteWorkspace = createServerFn({ method: "GET" })
  .middleware([requireUser])
  .inputValidator((input) => GetQuoteSchema.parse(input))
  .handler(async ({ data, context }) => {
    const base44 = context.getBase44();
    const quote = await base44.entities.Quote.get(data.quoteId).catch((err) => {
      if (err?.status === 404) return null;
      throw err;
    });
    if (!quote) return null;

    const business = await getOrInitBusiness(base44, context.user);
    const [itemsPage, photosPage, versionsPage] = await Promise.all([
      base44.entities.QuoteItem.filter({ quote_id: quote.id }, { sort: "tree_number", limit: 100 }),
      base44.entities.Photo.filter({ quote_id: quote.id }, { sort: "taken_at_s", limit: 100 }),
      base44.entities.QuoteVersion.filter({ quote_id: quote.id }, { sort: "-created_date", limit: 5 }),
    ]);

    const rawPhotos = photosPage.items || [];
    const signedPhotos = await Promise.all(
      rawPhotos.map(async (p) => ({
        ...p,
        url: await signFileUriIfNeeded(base44, p.file_uri),
      }))
    );

    return {
      quote,
      items: itemsPage.items || [],
      photos: signedPhotos,
      canUndo: (versionsPage.items || []).length > 0,
      latestVersionId: versionsPage.items?.[0]?.id || null,
      business: business
        ? {
            ...business,
            trial_expired: isTrialExpired(business),
            trial_days_left: getTrialDaysLeft(business),
          }
        : null,
    };
  });

const TranscribeStepSchema = z.object({
  quoteId: z.string().min(1).max(120),
  fileUri: z.string().max(500).optional().default(""),
  durationS: z.number().min(0).max(3600).optional().default(20),
  manualTranscript: z.string().max(10000).optional().default(""),
  kind: z.enum(["capture", "edit"]).optional().default("capture"),
});

export const transcribeCaptureFn = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .inputValidator((input) => TranscribeStepSchema.parse(input))
  .handler(async ({ data, context }) => {
    const base44 = context.getBase44();
    const quote = await base44.entities.Quote.get(data.quoteId);
    if (!quote) throw new Error("Quote not found.");

    const { recording, transcript, segments } = await transcribeAudioOnServer({
      base44,
      userId: context.user.id,
      quoteId: quote.id,
      kind: data.kind,
      fileUri: data.fileUri,
      durationS: data.durationS,
      manualTranscript: data.manualTranscript,
    });

    return {
      recordingId: recording.id,
      transcript,
      segments,
    };
  });

const FillCaptureSchema = z.object({
  quoteId: z.string().min(1).max(120),
  recordingId: z.string().max(120).optional(),
  segments: z.array(
    z.object({
      id: z.number(),
      start: z.number(),
      end: z.number(),
      text: z.string(),
    })
  ),
  photos: z
    .array(
      z.object({
        file_uri: z.string().min(1).max(500),
        taken_at_s: z.number().min(0),
      })
    )
    .default([]),
});

export const fillQuoteFromCaptureFn = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .inputValidator((input) => FillCaptureSchema.parse(input))
  .handler(async ({ data, context }) => {
    const base44 = context.getBase44();
    const quote = await base44.entities.Quote.get(data.quoteId);
    const business = await getOrInitBusiness(base44, context.user);
    const priceBook = business?.price_book || null;

    const extracted = await extractQuoteStructureWithRetry({
      base44,
      userId: context.user.id,
      segments: data.segments,
      photoTimes: data.photos.map((p) => p.taken_at_s),
    });

    // Clear any prior draft items/photos on re-capture
    await base44.entities.QuoteItem.deleteMany({ quote_id: quote.id });
    await base44.entities.Photo.deleteMany({ quote_id: quote.id });

    const itemDrafts = expandTreesToQuoteItems(extracted.trees || [], priceBook);
    const createdItems = [];
    for (const draft of itemDrafts) {
      const created = await base44.entities.QuoteItem.create({
        ...draft,
        quote_id: quote.id,
      });
      createdItems.push(created);
    }

    const matchedPhotoDrafts = matchPhotosToItems(data.photos, createdItems, data.segments);
    const createdPhotos = [];
    for (const p of matchedPhotoDrafts) {
      const savedPhoto = await base44.entities.Photo.create({
        quote_id: quote.id,
        item_id: p.item_id || "",
        tree_number: p.tree_number || 1,
        file_uri: p.file_uri,
        taken_at_s: p.taken_at_s,
        pin_x: 0.5,
        pin_y: 0.38,
      });
      createdPhotos.push(savedPhoto);
    }

    const depositPct = extracted.deposit_pct != null ? Number(extracted.deposit_pct) : quote.deposit_pct || 0;
    const totals = calculateQuoteTotals({
      items: createdItems,
      tickedOptionalIds: [],
      minCharge: business?.min_charge || 0,
      taxRate: business?.tax_rate || 0,
      depositPct,
    });

    const updatedQuote = await base44.entities.Quote.update(quote.id, {
      client_name: extracted.client?.name || quote.client_name || "",
      client_phone: extracted.client?.phone || quote.client_phone || "",
      client_email: extracted.client?.email || quote.client_email || "",
      address: extracted.client?.address || quote.address || "",
      deposit_pct: depositPct,
      notes: extracted.notes || quote.notes || "",
      unclear: extracted.unclear || [],
      subtotal: totals.subtotal,
      tax_amount: totals.taxAmount,
      total: totals.total,
      deposit_amount: totals.depositAmount,
    });

    if (data.recordingId) {
      await base44.entities.Recording.update(data.recordingId, { status: "processed" });
    }

    await saveVersionSnapshot(base44, quote.id, "initial_capture");
    await base44.entities.QuoteEvent.create({
      quote_id: quote.id,
      type: "captured",
      meta: { treeCount: createdItems.filter((i) => !i.is_stump_line).length, photoCount: createdPhotos.length },
    });

    return { quoteId: updatedQuote.id };
  });

const UpdateQuoteMetaSchema = z.object({
  quoteId: z.string().min(1).max(120),
  patch: z.object({
    client_name: z.string().max(160).optional(),
    client_phone: z.string().max(60).optional(),
    client_email: z.string().max(160).optional(),
    address: z.string().max(300).optional(),
    deposit_pct: z.number().min(0).max(100).optional(),
    notes: z.string().max(4000).optional(),
    unclear: z.array(z.string().max(300)).optional(),
  }),
});

export const updateQuoteDetailsFn = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .inputValidator((input) => UpdateQuoteMetaSchema.parse(input))
  .handler(async ({ data, context }) => {
    const base44 = context.getBase44();
    const quote = await base44.entities.Quote.get(data.quoteId);
    const business = await getOrInitBusiness(base44, context.user);
    await saveVersionSnapshot(base44, quote.id, "manual_edit");

    const itemsPage = await base44.entities.QuoteItem.filter({ quote_id: quote.id }, { sort: "tree_number", limit: 100 });
    const depositPct = data.patch.deposit_pct ?? quote.deposit_pct ?? 0;
    const totals = calculateQuoteTotals({
      items: itemsPage.items || [],
      tickedOptionalIds: quote.selected_optional_ids || [],
      minCharge: business?.min_charge || 0,
      taxRate: business?.tax_rate || 0,
      depositPct,
    });

    return await base44.entities.Quote.update(quote.id, {
      ...data.patch,
      subtotal: totals.subtotal,
      tax_amount: totals.taxAmount,
      total: totals.total,
      deposit_amount: totals.depositAmount,
    });
  });

const UpdateQuoteItemSchema = z.object({
  quoteId: z.string().min(1).max(120),
  itemId: z.string().min(1).max(120),
  patch: z.object({
    label: z.string().max(160).optional(),
    species: z.string().max(120).optional(),
    height_ft: z.number().nullable().optional(),
    size_class: z.enum(["small", "medium", "large", "xl"]).optional(),
    work: z.enum(["remove", "trim", "crown_reduce", "deadwood", "stump_grind"]).optional(),
    hazards: z.array(z.string()).optional(),
    stump: z.enum(["grind", "optional", "leave"]).optional(),
    haul: z.boolean().optional(),
    optional: z.boolean().optional(),
    price: z.number().nullable().optional(),
    price_source: z.enum(["spoken", "price_book", "owner", "none"]).optional(),
    customer_description: z.string().max(1000).optional(),
  }),
});

export const updateQuoteItemFn = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .inputValidator((input) => UpdateQuoteItemSchema.parse(input))
  .handler(async ({ data, context }) => {
    const base44 = context.getBase44();
    const quote = await base44.entities.Quote.get(data.quoteId);
    const business = await getOrInitBusiness(base44, context.user);
    await saveVersionSnapshot(base44, quote.id, "manual_item_edit");

    const current = await base44.entities.QuoteItem.get(data.itemId);
    const merged = { ...current, ...data.patch };

    if (data.patch.price !== undefined && data.patch.price !== null) {
      merged.price_source = "owner";
      merged.flagged = false;
    }

    // Handle toggling stump === 'optional' via tap
    if (data.patch.stump === "optional" && !current.is_stump_line) {
      merged.stump = "leave";
      const allItemsPage = await base44.entities.QuoteItem.filter(
        { quote_id: quote.id },
        { sort: "tree_number", limit: 100 }
      );
      const hasStumpLine = (allItemsPage.items || []).some(
        (it) => it.tree_number === current.tree_number && it.is_stump_line
      );
      if (!hasStumpLine) {
        const stumpDraft = priceSingleItem(
          {
            quote_id: quote.id,
            tree_number: current.tree_number,
            label: `${merged.label || `Tree ${current.tree_number}`} — Stump grinding`,
            species: merged.species || "",
            height_ft: merged.height_ft,
            size_class: merged.size_class,
            work: "stump_grind",
            hazards: [],
            stump: "grind",
            haul: false,
            optional: true,
            is_stump_line: true,
            spoken_price: null,
            customer_description: `Grind the ${merged.species || `Tree ${current.tree_number}`} stump below grade and level wood chips.`,
          },
          business?.price_book || null
        );
        await base44.entities.QuoteItem.create(stumpDraft);
      }
    }

    const repriced = priceSingleItem(merged, business?.price_book || null);
    await base44.entities.QuoteItem.update(current.id, {
      label: repriced.label,
      species: repriced.species,
      height_ft: repriced.height_ft,
      size_class: repriced.size_class,
      work: repriced.work,
      hazards: repriced.hazards,
      stump: repriced.stump,
      haul: repriced.haul,
      optional: repriced.optional,
      price: repriced.price,
      price_book_estimate: repriced.price_book_estimate,
      price_source: repriced.price_source,
      flagged: data.patch.price !== undefined ? false : repriced.flagged,
      customer_description: repriced.customer_description,
    });

    const refreshedItems = await base44.entities.QuoteItem.filter(
      { quote_id: quote.id },
      { sort: "tree_number", limit: 100 }
    );
    const totals = calculateQuoteTotals({
      items: refreshedItems.items || [],
      tickedOptionalIds: quote.selected_optional_ids || [],
      minCharge: business?.min_charge || 0,
      taxRate: business?.tax_rate || 0,
      depositPct: quote.deposit_pct || 0,
    });

    await base44.entities.Quote.update(quote.id, {
      subtotal: totals.subtotal,
      tax_amount: totals.taxAmount,
      total: totals.total,
      deposit_amount: totals.depositAmount,
    });

    return { ok: true };
  });

const AddOrDeleteTreeSchema = z.object({
  quoteId: z.string().min(1).max(120),
  itemId: z.string().max(120).optional(),
  action: z.enum(["add", "delete"]),
  photoFileUri: z.string().max(500).optional(),
});

export const addOrDeleteQuoteItemFn = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .inputValidator((input) => AddOrDeleteTreeSchema.parse(input))
  .handler(async ({ data, context }) => {
    const base44 = context.getBase44();
    const quote = await base44.entities.Quote.get(data.quoteId);
    const business = await getOrInitBusiness(base44, context.user);
    await saveVersionSnapshot(base44, quote.id, "tree_list_change");

    const existingPage = await base44.entities.QuoteItem.filter(
      { quote_id: quote.id },
      { sort: "tree_number", limit: 100 }
    );
    const existing = existingPage.items || [];

    if (data.action === "delete" && data.itemId) {
      await base44.entities.QuoteItem.delete(data.itemId);
    } else if (data.action === "add") {
      const nextNum = existing.reduce((max, it) => Math.max(max, Number(it.tree_number) || 0), 0) + 1;
      const draft = priceSingleItem(
        {
          quote_id: quote.id,
          tree_number: nextNum,
          label: `Tree ${nextNum}`,
          species: "",
          height_ft: 40,
          size_class: "medium",
          work: "trim",
          hazards: [],
          stump: "leave",
          haul: true,
          optional: false,
          is_stump_line: false,
          spoken_price: null,
          customer_description: `Pruning and cleanup on Tree ${nextNum}, including brush haul-away.`,
        },
        business?.price_book || null
      );
      const created = await base44.entities.QuoteItem.create(draft);
      if (data.photoFileUri) {
        await base44.entities.Photo.create({
          quote_id: quote.id,
          item_id: created.id,
          tree_number: nextNum,
          file_uri: data.photoFileUri,
          taken_at_s: 0,
          pin_x: 0.5,
          pin_y: 0.4,
        });
      }
    }

    const afterPage = await base44.entities.QuoteItem.filter(
      { quote_id: quote.id },
      { sort: "tree_number", limit: 100 }
    );
    const totals = calculateQuoteTotals({
      items: afterPage.items || [],
      tickedOptionalIds: quote.selected_optional_ids || [],
      minCharge: business?.min_charge || 0,
      taxRate: business?.tax_rate || 0,
      depositPct: quote.deposit_pct || 0,
    });

    await base44.entities.Quote.update(quote.id, {
      subtotal: totals.subtotal,
      tax_amount: totals.taxAmount,
      total: totals.total,
      deposit_amount: totals.depositAmount,
    });

    return { ok: true };
  });

const UpdatePhotoPinSchema = z.object({
  photoId: z.string().min(1).max(120),
  pin_x: z.number().min(0).max(1),
  pin_y: z.number().min(0).max(1),
});

export const updatePhotoPinFn = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .inputValidator((input) => UpdatePhotoPinSchema.parse(input))
  .handler(async ({ data, context }) => {
    const base44 = context.getBase44();
    return await base44.entities.Photo.update(data.photoId, {
      pin_x: data.pin_x,
      pin_y: data.pin_y,
    });
  });

const AttachPhotoSchema = z.object({
  quoteId: z.string().min(1).max(120),
  itemId: z.string().max(120).optional().default(""),
  treeNumber: z.number().int().min(1),
  fileUri: z.string().min(1).max(500),
});

export const attachTreePhotoFn = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .inputValidator((input) => AttachPhotoSchema.parse(input))
  .handler(async ({ data, context }) => {
    const base44 = context.getBase44();
    return await base44.entities.Photo.create({
      quote_id: data.quoteId,
      item_id: data.itemId || "",
      tree_number: data.treeNumber,
      file_uri: data.fileUri,
      taken_at_s: 0,
      pin_x: 0.5,
      pin_y: 0.4,
    });
  });

const VoiceEditSchema = z.object({
  quoteId: z.string().min(1).max(120),
  fileUri: z.string().max(500).optional().default(""),
  durationS: z.number().min(0).max(600).optional().default(8),
  manualTranscript: z.string().max(2000).optional().default(""),
});

export const voiceEditQuoteFn = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .inputValidator((input) => VoiceEditSchema.parse(input))
  .handler(async ({ data, context }) => {
    const base44 = context.getBase44();
    const quote = await base44.entities.Quote.get(data.quoteId);
    const business = await getOrInitBusiness(base44, context.user);
    const itemsPage = await base44.entities.QuoteItem.filter(
      { quote_id: quote.id },
      { sort: "tree_number", limit: 100 }
    );

    const { transcript } = await transcribeAudioOnServer({
      base44,
      userId: context.user.id,
      quoteId: quote.id,
      kind: "edit",
      fileUri: data.fileUri,
      durationS: data.durationS,
      manualTranscript: data.manualTranscript,
    });

    if (!transcript) {
      throw new Error("Didn't catch any speech. Hold or tap the mic and speak your change.");
    }

    const res = await applyVoiceEditWithRetry({
      base44,
      userId: context.user.id,
      quote,
      items: itemsPage.items || [],
      business,
      editTranscript: transcript,
    });

    return {
      transcript,
      changedFields: res.changedFields,
      versionId: res.versionId,
      unclearAdded: res.unclearAdded,
    };
  });

const UndoQuoteSchema = z.object({
  quoteId: z.string().min(1).max(120),
  versionId: z.string().max(120).optional(),
});

export const undoQuoteChangeFn = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .inputValidator((input) => UndoQuoteSchema.parse(input))
  .handler(async ({ data, context }) => {
    const base44 = context.getBase44();
    const versionsPage = await base44.entities.QuoteVersion.filter(
      { quote_id: data.quoteId },
      { sort: "-created_date", limit: 5 }
    );
    const versions = versionsPage.items || [];
    const target = data.versionId ? versions.find((v) => v.id === data.versionId) || versions[0] : versions[0];
    if (!target?.snapshot) {
      throw new Error("Nothing left to undo.");
    }

    const snap = target.snapshot;
    await base44.entities.QuoteItem.deleteMany({ quote_id: data.quoteId });
    for (const item of snap.items || []) {
      await base44.entities.QuoteItem.create({
        ...item,
        quote_id: data.quoteId,
      });
    }

    await base44.entities.Quote.update(data.quoteId, snap.quote);
    await base44.entities.QuoteVersion.delete(target.id);
    await base44.entities.QuoteEvent.create({
      quote_id: data.quoteId,
      type: "undone",
      meta: { restoredVersionId: target.id },
    });

    return { ok: true };
  });

const SendQuoteSchema = z.object({ quoteId: z.string().min(1).max(120) });

export const markQuoteSentFn = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .inputValidator((input) => SendQuoteSchema.parse(input))
  .handler(async ({ data, context }) => {
    const base44 = context.getBase44();
    const quote = await base44.entities.Quote.get(data.quoteId);
    const business = await getOrInitBusiness(base44, context.user);

    if (isTrialExpired(business)) {
      return {
        blockedByTrial: true,
        trialDaysLeft: 0,
      };
    }

    const nowIso = new Date().toISOString();
    if (business && !business.trial_started_at) {
      await base44.entities.Business.update(business.id, {
        trial_started_at: nowIso,
      });
    }

    const nextStatus = quote.status === "accepted" ? "accepted" : "sent";
    const updated = await base44.entities.Quote.update(quote.id, {
      status: nextStatus,
      sent_at: quote.sent_at || nowIso,
    });

    await base44.entities.QuoteEvent.create({
      quote_id: quote.id,
      type: "sent",
      meta: { sent_at: nowIso },
    });

    return {
      blockedByTrial: false,
      publicToken: updated.public_token,
      status: updated.status,
    };
  });

export const generateFollowUpFn = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .inputValidator((input) => SendQuoteSchema.parse(input))
  .handler(async ({ data, context }) => {
    const base44 = context.getBase44();
    const quote = await base44.entities.Quote.get(data.quoteId);
    const business = await getOrInitBusiness(base44, context.user);

    const smsBody = await createFollowUpSmsText({
      base44,
      userId: context.user.id,
      businessName: business?.name || "Our tree crew",
      clientName: quote.client_name,
      address: quote.address,
      total: quote.total,
      currency: business?.currency || "USD",
    });

    await base44.entities.QuoteEvent.create({
      quote_id: quote.id,
      type: "followed_up",
      meta: { smsBody },
    });

    return {
      smsBody,
      clientPhone: quote.client_phone || "",
    };
  });

const PublicTokenSchema = z.object({ token: z.string().min(6).max(120) });

export const getPublicQuoteByTokenFn = createServerFn({ method: "GET" })
  .inputValidator((input) => PublicTokenSchema.parse(input))
  .handler(async ({ data, context }) => {
    if (data.token === SAMPLE_QUOTE_TOKEN) {
      return {
        isSample: true,
        business: SAMPLE_BUSINESS,
        quote: SAMPLE_QUOTE,
        items: SAMPLE_QUOTE.items,
        photos: SAMPLE_QUOTE.photos,
        isOwnerViewing: false,
      };
    }

    const base44 = context.getBase44();
    const svc = base44.asServiceRole;

    const foundPage = await svc.entities.Quote.filter({ public_token: data.token }, { limit: 1 });
    const quote = foundPage.items?.[0];
    if (!quote) return null;

    let viewerId = null;
    try {
      const me = await base44.auth.me();
      viewerId = me?.id || null;
    } catch {
      viewerId = null;
    }

    const business = quote.business_id
      ? await svc.entities.Business.get(quote.business_id).catch(() => null)
      : null;

    const [itemsPage, photosPage] = await Promise.all([
      svc.entities.QuoteItem.filter({ quote_id: quote.id }, { sort: "tree_number", limit: 100 }),
      svc.entities.Photo.filter({ quote_id: quote.id }, { sort: "taken_at_s", limit: 100 }),
    ]);

    const logoUrl = business?.logo_uri ? await signFileUriIfNeeded(base44, business.logo_uri) : null;
    const signedPhotos = await Promise.all(
      (photosPage.items || []).map(async (p) => ({
        id: p.id,
        item_id: p.item_id,
        tree_number: p.tree_number,
        taken_at_s: p.taken_at_s,
        pin_x: p.pin_x ?? 0.5,
        pin_y: p.pin_y ?? 0.4,
        url: await signFileUriIfNeeded(base44, p.file_uri),
      }))
    );

    return {
      isSample: false,
      isOwnerViewing: Boolean(viewerId && viewerId === quote.created_by_id),
      business: business
        ? {
            name: business.name,
            phone: business.phone || "",
            email: business.email || "",
            logo_url: logoUrl,
            currency: business.currency || "USD",
            tax_rate: business.tax_rate || 0,
            min_charge: business.min_charge || 0,
            terms: business.terms || "",
          }
        : {
            name: "Tree Service Proposal",
            phone: "",
            email: "",
            logo_url: null,
            currency: "USD",
            tax_rate: 0,
            min_charge: 0,
            terms: "",
          },
      quote: {
        id: quote.id,
        public_token: quote.public_token,
        client_name: quote.client_name || "",
        address: quote.address || "",
        status: quote.status,
        deposit_pct: quote.deposit_pct || 0,
        notes: quote.notes || "",
        selected_optional_ids: quote.selected_optional_ids || [],
        total: quote.total || 0,
        accepted_at: quote.accepted_at || null,
        accepted_name: quote.accepted_name || null,
        created_date: quote.created_date,
      },
      items: (itemsPage.items || []).map((it) => ({
        id: it.id,
        tree_number: it.tree_number,
        label: it.label,
        species: it.species,
        height_ft: it.height_ft,
        work: it.work,
        stump: it.stump,
        haul: it.haul,
        optional: Boolean(it.optional),
        is_stump_line: Boolean(it.is_stump_line),
        price: it.price,
        price_source: it.price_source,
        customer_description: it.customer_description,
      })),
      photos: signedPhotos,
    };
  });

export const recordPublicQuoteViewFn = createServerFn({ method: "POST" })
  .inputValidator((input) => PublicTokenSchema.parse(input))
  .handler(async ({ data, context }) => {
    if (data.token === SAMPLE_QUOTE_TOKEN) return { recorded: false };

    const base44 = context.getBase44();
    const svc = base44.asServiceRole;
    const foundPage = await svc.entities.Quote.filter({ public_token: data.token }, { limit: 1 });
    const quote = foundPage.items?.[0];
    if (!quote) return { recorded: false };

    let viewerId = null;
    try {
      const me = await base44.auth.me();
      viewerId = me?.id || null;
    } catch {
      viewerId = null;
    }

    if (viewerId && viewerId === quote.created_by_id) {
      return { recorded: false, reason: "owner" };
    }

    if (!quote.viewed_at) {
      const nowIso = new Date().toISOString();
      const nextStatus = quote.status === "sent" || quote.status === "draft" ? "viewed" : quote.status;
      await svc.entities.Quote.update(quote.id, {
        viewed_at: nowIso,
        status: nextStatus,
      });
      await svc.entities.QuoteEvent.create({
        quote_id: quote.id,
        type: "viewed",
        meta: { viewed_at: nowIso },
      });

      const business = quote.business_id
        ? await svc.entities.Business.get(quote.business_id).catch(() => null)
        : null;
      await notifyOwnerByEmail({
        base44,
        toEmail: business?.email,
        subject: `${quote.client_name || "Homeowner"} opened your quote`,
        heading: `${quote.client_name || "Your client"} just viewed their tree quote`,
        detailLines: [
          `Property: ${quote.address || "Address not listed"}`,
          `Quote total: $${Number(quote.total || 0).toLocaleString("en-US")}`,
        ],
      });
      return { recorded: true };
    }

    return { recorded: false };
  });

const PublicAcceptSchema = z.object({
  token: z.string().min(6).max(120),
  action: z.enum(["accept", "decline"]).default("accept"),
  acceptedName: z.string().max(160).optional().default(""),
  agreed: z.boolean().optional().default(false),
  selectedOptionalIds: z.array(z.string().max(120)).default([]),
});

export const respondToPublicQuoteFn = createServerFn({ method: "POST" })
  .inputValidator((input) => PublicAcceptSchema.parse(input))
  .handler(async ({ data, context }) => {
    if (data.token === SAMPLE_QUOTE_TOKEN) {
      return {
        ok: true,
        isSample: true,
        status: data.action === "decline" ? "declined" : "accepted",
        accepted_at: new Date().toISOString(),
        accepted_name: data.acceptedName || "Claire Whitaker",
      };
    }

    const base44 = context.getBase44();
    const svc = base44.asServiceRole;
    const req = getRequest();
    const ip =
      req?.headers?.get("cf-connecting-ip") ||
      req?.headers?.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";
    const userAgent = req?.headers?.get("user-agent") || "unknown";

    const foundPage = await svc.entities.Quote.filter({ public_token: data.token }, { limit: 1 });
    const quote = foundPage.items?.[0];
    if (!quote) throw new Error("Quote not found.");

    const business = quote.business_id
      ? await svc.entities.Business.get(quote.business_id).catch(() => null)
      : null;

    if (data.action === "decline") {
      const nowIso = new Date().toISOString();
      await svc.entities.Quote.update(quote.id, {
        status: "declined",
        declined_at: nowIso,
      });
      await svc.entities.QuoteEvent.create({
        quote_id: quote.id,
        type: "declined",
        meta: { declined_at: nowIso },
      });
      return { ok: true, status: "declined" };
    }

    const cleanName = String(data.acceptedName || "").trim();
    if (cleanName.length < 2 || !data.agreed) {
      throw new Error("Please type your full name and check the agreement box to accept.");
    }

    const itemsPage = await svc.entities.QuoteItem.filter(
      { quote_id: quote.id },
      { sort: "tree_number", limit: 100 }
    );
    const items = itemsPage.items || [];
    const validOptionalIds = data.selectedOptionalIds.filter((id) =>
      items.some((it) => it.id === id && it.optional)
    );

    const totals = calculateQuoteTotals({
      items,
      tickedOptionalIds: validOptionalIds,
      minCharge: business?.min_charge || 0,
      taxRate: business?.tax_rate || 0,
      depositPct: quote.deposit_pct || 0,
    });

    const nowIso = new Date().toISOString();
    await svc.entities.Quote.update(quote.id, {
      status: "accepted",
      selected_optional_ids: validOptionalIds,
      subtotal: totals.subtotal,
      tax_amount: totals.taxAmount,
      total: totals.total,
      deposit_amount: totals.depositAmount,
      accepted_at: nowIso,
      accepted_name: cleanName,
      accepted_ip: ip,
      accepted_user_agent: userAgent.slice(0, 300),
    });

    await svc.entities.QuoteEvent.create({
      quote_id: quote.id,
      type: "accepted",
      meta: { accepted_name: cleanName, total: totals.total, accepted_at: nowIso },
    });

    await notifyOwnerByEmail({
      base44,
      toEmail: business?.email,
      subject: `Quote accepted by ${cleanName} ($${totals.total.toLocaleString("en-US")})`,
      heading: `${cleanName} accepted your tree quote`,
      detailLines: [
        `Property: ${quote.address || "Address on file"}`,
        `Signed total: $${totals.total.toLocaleString("en-US")}`,
        `Signed by: ${cleanName} at ${new Date(nowIso).toLocaleString("en-US", { timeZone: "UTC" })} UTC`,
      ],
    });

    return {
      ok: true,
      status: "accepted",
      accepted_at: nowIso,
      accepted_name: cleanName,
      total: totals.total,
    };
  });