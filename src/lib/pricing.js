export const STARTER_PAINTER_PRICE_BOOK = {
  walls_m2: 18,
  ceiling_m2: 16,
  weatherboards_m2: 28,
  soffits_m2: 24,
  fascia_m: 22,
  skirting_m: 12,
  door_each: 95,
  window_each: 85,
  prep: {
    light: 0.85,
    standard: 1,
    heavy: 1.35,
  },
  coats: {
    1: 0.7,
    2: 1,
    3: 1.35,
  },
  round_to: 10,
};

export const ALL_SURFACES = [
  "walls",
  "ceiling",
  "skirting",
  "weatherboards",
  "soffits",
  "fascia",
];

export const SURFACE_LABELS = {
  walls: "Walls",
  ceiling: "Ceiling",
  skirting: "Skirting",
  weatherboards: "Weatherboards",
  soffits: "Soffits",
  fascia: "Fascia",
};

export const PREP_LABELS = {
  light: "Light prep",
  standard: "Standard prep",
  heavy: "Heavy prep",
};

export const KIND_LABELS = {
  interior: "Interior",
  exterior: "Exterior",
  extra: "Extra",
};

export const STARTER_PRICE_BOOK = STARTER_PAINTER_PRICE_BOOK;

export function roundCents(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

export function roundUpTo(amount, step) {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) return 0;
  const s = Number(step) > 0 ? Number(step) : 1;
  return Math.ceil((n - 1e-9) / s) * s;
}

export function fmtMetric(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  const rounded1 = Math.round(n * 10) / 10;
  return Number.isInteger(rounded1) ? String(rounded1) : rounded1.toFixed(1);
}

/**
 * Interior geometry:
 *   walls_m2 = 2(L + W) * stud * (1 - openings_pct/100)
 *   ceiling_m2 = L * W
 *   skirting_m = 2(L + W)
 * Exterior uses area_m2_spoken.
 */
export function computeAreaMeasurements(item = {}, settings = {}) {
  const defaultStudM =
    Number(settings.default_stud_m ?? settings.defaultStudM) > 0
      ? Number(settings.default_stud_m ?? settings.defaultStudM)
      : 2.4;
  const openingsPctRaw = settings.openings_pct ?? settings.openingsPct;
  const openingsPct =
    openingsPctRaw != null && Number.isFinite(Number(openingsPctRaw))
      ? Number(openingsPctRaw)
      : 10;

  const L = Number(item.length_m);
  const W = Number(item.width_m);
  const hasFloorDims = Number.isFinite(L) && L > 0 && Number.isFinite(W) && W > 0;
  const studUsed =
    Number(item.stud_m) > 0 ? Number(item.stud_m) : defaultStudM;
  const spokenM2 =
    Number(item.area_m2_spoken) > 0 ? roundCents(Number(item.area_m2_spoken)) : 0;

  const perimeterM = hasFloorDims ? roundCents(2 * (L + W)) : 0;
  const isExterior = item.kind === "exterior";

  let wallsM2 = 0;
  if (!isExterior) {
    if (hasFloorDims) {
      wallsM2 = roundCents(perimeterM * studUsed * (1 - openingsPct / 100));
    } else if (spokenM2 > 0) {
      wallsM2 = spokenM2;
    }
  }

  let ceilingM2 = 0;
  if (!isExterior) {
    if (hasFloorDims) {
      ceilingM2 = roundCents(L * W);
    } else if (
      spokenM2 > 0 &&
      Array.isArray(item.surfaces) &&
      item.surfaces.includes("ceiling") &&
      !item.surfaces.includes("walls")
    ) {
      ceilingM2 = spokenM2;
    }
  }

  const skirtingM = !isExterior && hasFloorDims ? perimeterM : 0;
  const exteriorM2 = isExterior ? spokenM2 : 0;
  const fasciaM = hasFloorDims ? perimeterM : spokenM2;

  return {
    hasFloorDims,
    studUsed,
    openingsPct,
    perimeterM,
    wallsM2,
    ceilingM2,
    skirtingM,
    exteriorM2,
    fasciaM,
  };
}

/**
 * Pure painter price-book formula:
 * price = sum(m2 * rate * prep * coats) + skirting * rate + doors * rate + windows * rate
 * rounded UP to round_to.
 */
export function computePriceBookFigure(item, priceBook, settings = {}) {
  if (!priceBook || typeof priceBook !== "object") return null;

  const surfaces = Array.isArray(item.surfaces) ? item.surfaces : [];
  const doors = Math.max(0, Math.floor(Number(item.doors) || 0));
  const windows = Math.max(0, Math.floor(Number(item.windows) || 0));

  if (surfaces.length === 0 && doors === 0 && windows === 0) return null;

  const prepKey = ["light", "standard", "heavy"].includes(item.prep)
    ? item.prep
    : "standard";
  const prepMult =
    Number(priceBook.prep?.[prepKey]) > 0 ? Number(priceBook.prep[prepKey]) : 1;

  const coatsKey = String(item.coats || 2);
  const coatsMult =
    Number(priceBook.coats?.[coatsKey]) > 0 ? Number(priceBook.coats[coatsKey]) : 1;

  const meas = computeAreaMeasurements(item, settings);

  let raw = 0;
  let pricedAny = false;

  for (const surf of surfaces) {
    if (surf === "walls") {
      const rate = Number(priceBook.walls_m2) || 0;
      if (rate <= 0 || meas.wallsM2 <= 0) return null;
      raw += meas.wallsM2 * rate * prepMult * coatsMult;
      pricedAny = true;
    } else if (surf === "ceiling") {
      const rate = Number(priceBook.ceiling_m2) || 0;
      if (rate <= 0 || meas.ceilingM2 <= 0) return null;
      raw += meas.ceilingM2 * rate * prepMult * coatsMult;
      pricedAny = true;
    } else if (surf === "skirting") {
      const rate = Number(priceBook.skirting_m) || 0;
      if (rate <= 0 || meas.skirtingM <= 0) return null;
      raw += meas.skirtingM * rate;
      pricedAny = true;
    } else if (surf === "weatherboards") {
      const rate = Number(priceBook.weatherboards_m2) || 0;
      if (rate <= 0 || meas.exteriorM2 <= 0) return null;
      raw += meas.exteriorM2 * rate * prepMult * coatsMult;
      pricedAny = true;
    } else if (surf === "soffits") {
      const rate = Number(priceBook.soffits_m2) || 0;
      const m2 = meas.exteriorM2 || Number(item.area_m2_spoken) || 0;
      if (rate <= 0 || m2 <= 0) return null;
      raw += m2 * rate * prepMult * coatsMult;
      pricedAny = true;
    } else if (surf === "fascia") {
      const rate = Number(priceBook.fascia_m) || 0;
      if (rate <= 0 || meas.fasciaM <= 0) return null;
      raw += meas.fasciaM * rate * prepMult * coatsMult;
      pricedAny = true;
    }
  }

  if (doors > 0) {
    const dRate = Number(priceBook.door_each) || 0;
    if (dRate <= 0 && surfaces.length === 0) return null;
    if (dRate > 0) {
      raw += doors * dRate;
      pricedAny = true;
    }
  }

  if (windows > 0) {
    const wRate = Number(priceBook.window_each) || 0;
    if (wRate <= 0 && surfaces.length === 0 && doors === 0) return null;
    if (wRate > 0) {
      raw += windows * wRate;
      pricedAny = true;
    }
  }

  if (!pricedAny || raw <= 0) return null;
  return roundUpTo(raw, priceBook.round_to ?? 10);
}

/**
 * Priority: owner -> spoken_price -> price book -> null ('none', "Needs your price").
 * Flags spoken_price < 0.5x or > 2x price-book figure.
 */
export function priceSingleItem(item, priceBook, settings = {}) {
  const kind = ["interior", "exterior", "extra"].includes(item.kind)
    ? item.kind
    : "interior";
  const prep = ["light", "standard", "heavy"].includes(item.prep)
    ? item.prep
    : "standard";
  const coats = Number(item.coats) > 0 ? Math.round(Number(item.coats)) : 2;
  const surfaces = Array.isArray(item.surfaces)
    ? item.surfaces.filter((s) => ALL_SURFACES.includes(s))
    : [];

  const normalized = {
    ...item,
    kind,
    prep,
    coats,
    surfaces,
    doors: Math.max(0, Math.floor(Number(item.doors) || 0)),
    windows: Math.max(0, Math.floor(Number(item.windows) || 0)),
  };

  const pbEstimate = computePriceBookFigure(normalized, priceBook, settings);
  const needsOwnerPrice = Boolean(item.needs_owner_price);

  const hasOwnerManual =
    item.price_source === "owner" &&
    item.price != null &&
    Number.isFinite(Number(item.price));
  const hasSpoken =
    item.spoken_price != null &&
    Number.isFinite(Number(item.spoken_price)) &&
    Number(item.spoken_price) >= 0;

  let price = null;
  let price_source = "none";

  if (hasOwnerManual) {
    price = roundCents(Number(item.price));
    price_source = "owner";
  } else if (hasSpoken) {
    price = roundCents(Number(item.spoken_price));
    price_source = "spoken";
  } else if (!needsOwnerPrice && pbEstimate != null) {
    price = pbEstimate;
    price_source = "price_book";
  } else {
    price = null;
    price_source = "none";
  }

  let flagged = false;
  if (price_source === "spoken" && pbEstimate != null && pbEstimate > 0) {
    flagged = price < 0.5 * pbEstimate || price > 2 * pbEstimate;
  }

  return {
    ...normalized,
    price,
    price_book_estimate: pbEstimate,
    price_source,
    flagged,
  };
}

function buildDefaultDescription(areaName, surfaces, coats, prep, colour) {
  const surfList =
    surfaces.length > 0
      ? surfaces.map((s) => SURFACE_LABELS[s]?.toLowerCase() || s).join(", ")
      : "surfaces";
  const prepPhrase =
    prep === "heavy"
      ? "full surface preparation, filling and sanding, followed by "
      : prep === "light"
      ? "light surface wash and sand, followed by "
      : "standard preparation and ";
  const colourPart = colour ? ` in ${colour}` : "";
  return `Prepare with ${prepPhrase}${coats} ${coats === 1 ? "coat" : "coats"} to ${areaName.toLowerCase()} ${surfList}${colourPart}.`;
}

/**
 * Expands extracted areas into QuoteItem drafts.
 * Supports optional_surfaces (e.g. "walls only, ceiling optional") by splitting
 * optional surfaces into a separate optional QuoteItem sharing the same area_number.
 */
export function expandAreasToQuoteItems(areas = [], priceBook = null, settings = {}) {
  const result = [];
  let previousArea = null;

  (areas || []).forEach((rawArea, idx) => {
    const areaNumber =
      Number(rawArea.area_number) > 0 ? Number(rawArea.area_number) : idx + 1;
    const inherited = rawArea.same_as_previous && previousArea ? previousArea : null;

    const kind = ["interior", "exterior", "extra"].includes(rawArea.kind)
      ? rawArea.kind
      : inherited?.kind || "interior";

    const rawSurfaces =
      Array.isArray(rawArea.surfaces) && rawArea.surfaces.length > 0
        ? rawArea.surfaces.filter((s) => ALL_SURFACES.includes(s))
        : inherited?.surfaces || (kind === "exterior" ? ["weatherboards"] : ["walls"]);

    const optionalSurfaces = Array.isArray(rawArea.optional_surfaces)
      ? rawArea.optional_surfaces.filter((s) => ALL_SURFACES.includes(s))
      : [];

    const mainSurfaces = rawSurfaces.filter((s) => !optionalSurfaces.includes(s));
    const coats =
      Number(rawArea.coats) > 0
        ? Math.round(Number(rawArea.coats))
        : inherited?.coats || 2;
    const prep = ["light", "standard", "heavy"].includes(rawArea.prep)
      ? rawArea.prep
      : inherited?.prep || "standard";
    const name = rawArea.name?.trim() || `Area ${areaNumber}`;
    const colour = rawArea.colour?.trim() || inherited?.colour || "";

    const baseSurfacesToUse =
      mainSurfaces.length > 0 ? mainSurfaces : optionalSurfaces.length > 0 ? [] : rawSurfaces;

    if (baseSurfacesToUse.length > 0 || optionalSurfaces.length === 0) {
      const mainItem = priceSingleItem(
        {
          area_number: areaNumber,
          name,
          kind,
          length_m: rawArea.length_m != null ? Number(rawArea.length_m) : null,
          width_m: rawArea.width_m != null ? Number(rawArea.width_m) : null,
          stud_m: rawArea.stud_m != null ? Number(rawArea.stud_m) : null,
          area_m2_spoken:
            rawArea.area_m2_spoken != null ? Number(rawArea.area_m2_spoken) : null,
          surfaces: baseSurfacesToUse,
          doors: rawArea.doors ?? 0,
          windows: rawArea.windows ?? 0,
          coats,
          prep,
          prep_notes: rawArea.prep_notes || "",
          colour,
          spoken_price:
            rawArea.spoken_price != null ? Number(rawArea.spoken_price) : null,
          optional: Boolean(rawArea.optional),
          is_optional_split: false,
          needs_owner_price: Boolean(rawArea.needs_owner_price),
          customer_description:
            rawArea.customer_description ||
            buildDefaultDescription(name, baseSurfacesToUse, coats, prep, colour),
          start_segment:
            rawArea.start_segment != null ? Number(rawArea.start_segment) : null,
        },
        priceBook,
        settings
      );
      result.push(mainItem);
      previousArea = mainItem;
    }

    if (optionalSurfaces.length > 0) {
      const optLabel = optionalSurfaces
        .map((s) => SURFACE_LABELS[s] || s)
        .join(" & ");
      const optItem = priceSingleItem(
        {
          area_number: areaNumber,
          name: `${name} — ${optLabel}`,
          kind,
          length_m: rawArea.length_m != null ? Number(rawArea.length_m) : null,
          width_m: rawArea.width_m != null ? Number(rawArea.width_m) : null,
          stud_m: rawArea.stud_m != null ? Number(rawArea.stud_m) : null,
          area_m2_spoken:
            rawArea.optional_area_m2_spoken != null
              ? Number(rawArea.optional_area_m2_spoken)
              : null,
          surfaces: optionalSurfaces,
          doors: 0,
          windows: 0,
          coats,
          prep,
          prep_notes: "",
          colour,
          spoken_price:
            rawArea.optional_spoken_price != null
              ? Number(rawArea.optional_spoken_price)
              : mainSurfaces.length === 0 && rawArea.spoken_price != null
              ? Number(rawArea.spoken_price)
              : null,
          optional: true,
          is_optional_split: true,
          needs_owner_price: false,
          customer_description: buildDefaultDescription(
            name,
            optionalSurfaces,
            coats,
            prep,
            colour
          ),
          start_segment:
            rawArea.start_segment != null ? Number(rawArea.start_segment) : null,
        },
        priceBook,
        settings
      );
      result.push(optItem);
    }
  });

  return result;
}



/**
 * Totals show Excl. GST, a GST 15% line, and Incl. GST.
 * Supports both GST-exclusive item prices (default) and GST-inclusive item prices.
 */
export function calculateQuoteTotals({
  items = [],
  tickedOptionalIds = [],
  minCharge = 0,
  gstRate = 0.15,
  taxRate,
  pricesIncludeGst = false,
  depositPct = 0,
}) {
  const tickedSet = new Set(tickedOptionalIds || []);
  let baseItemsSum = 0;
  let optionalSum = 0;
  let unpricedCount = 0;
  let activeCount = 0;

  for (const item of items) {
    const isIncluded = !item.optional || tickedSet.has(item.id);
    if (!isIncluded) continue;
    activeCount += 1;
    if (item.price == null || item.price_source === "none") {
      unpricedCount += 1;
      continue;
    }
    const p = Number(item.price) || 0;
    if (item.optional) {
      optionalSum += p;
    } else {
      baseItemsSum += p;
    }
  }

  const rawSubtotal = roundCents(baseItemsSum + optionalSum);
  const min = Number(minCharge) || 0;
  const minChargeApplied = activeCount > 0 && rawSubtotal > 0 && min > rawSubtotal;
  const effectiveLineSum = minChargeApplied ? roundCents(min) : rawSubtotal;
  const minChargeDelta = minChargeApplied ? roundCents(min - rawSubtotal) : 0;

  const rawRate = gstRate !== undefined ? Number(gstRate) : taxRate !== undefined ? Number(taxRate) : 0.15;
  const normGstRate = Number.isFinite(rawRate) && rawRate >= 0 ? (rawRate > 1 ? rawRate / 100 : rawRate) : 0.15;

  let subtotalExclGst = 0;
  let gstAmount = 0;
  let totalInclGst = 0;

  if (pricesIncludeGst) {
    totalInclGst = effectiveLineSum;
    subtotalExclGst = roundCents(totalInclGst / (1 + normGstRate));
    gstAmount = roundCents(totalInclGst - subtotalExclGst);
  } else {
    subtotalExclGst = effectiveLineSum;
    gstAmount = roundCents(subtotalExclGst * normGstRate);
    totalInclGst = roundCents(subtotalExclGst + gstAmount);
  }

  const depositAmount = roundCents(totalInclGst * ((Number(depositPct) || 0) / 100));

  return {
    baseItemsSum: roundCents(baseItemsSum),
    optionalSum: roundCents(optionalSum),
    rawSubtotal,
    minChargeApplied,
    minChargeDelta,
    subtotalExclGst,
    gstRate: normGstRate,
    gstPctLabel: Math.round(normGstRate * 100),
    gstAmount,
    totalInclGst,
    pricesIncludeGst: Boolean(pricesIncludeGst),
    // Backwards-compatible aliases
    subtotal: subtotalExclGst,
    taxAmount: gstAmount,
    total: totalInclGst,
    depositAmount,
    unpricedCount,
  };
}

/**
 * Matches each photo to the primary area whose segment time span contains `taken_at_s`.
 * Fallback: photos assigned to areas in order.
 */
export function matchPhotosToItems(photos = [], items = [], segments = []) {
  const mainItems = items
    .filter((it) => !it.is_optional_split)
    .sort((a, b) => (a.area_number || 0) - (b.area_number || 0));

  if (mainItems.length === 0) return photos;

  const sortedPhotos = [...photos].sort((a, b) => (a.taken_at_s ?? 0) - (b.taken_at_s ?? 0));
  const hasSegmentSpans =
    Array.isArray(segments) &&
    segments.length > 0 &&
    mainItems.some((it) => it.start_segment != null && segments[it.start_segment] != null);

  if (!hasSegmentSpans) {
    return sortedPhotos.map((photo, idx) => {
      const target = mainItems[Math.min(idx, mainItems.length - 1)];
      return {
        ...photo,
        item_id: target.id || null,
        area_number: target.area_number,
      };
    });
  }

  const spans = mainItems.map((item, idx) => {
    const segIdx = item.start_segment ?? 0;
    const startS = idx === 0 ? 0 : Number(segments[segIdx]?.start ?? 0);
    const nextItem = mainItems[idx + 1];
    const nextSegIdx = nextItem?.start_segment;
    const endS =
      nextItem && nextSegIdx != null && segments[nextSegIdx] != null
        ? Number(segments[nextSegIdx].start)
        : Number.POSITIVE_INFINITY;
    return { item, startS, endS };
  });

  return sortedPhotos.map((photo, idx) => {
    const t = Number(photo.taken_at_s);
    let matched = null;
    if (Number.isFinite(t)) {
      matched = spans.find((sp) => t >= sp.startS && t < sp.endS)?.item;
    }
    if (!matched) {
      matched = mainItems[Math.min(idx, mainItems.length - 1)];
    }
    return {
      ...photo,
      item_id: matched.id || null,
      area_number: matched.area_number,
    };
  });
}

export function formatMoney(amount, currency = "NZD") {
  if (amount == null || !Number.isFinite(Number(amount))) return "Needs your price";
  const cur = currency || "NZD";
  try {
    return new Intl.NumberFormat("en-NZ", {
      style: "currency",
      currency: cur,
      minimumFractionDigits: Number(amount) % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(Number(amount));
  } catch {
    return `$${Number(amount).toFixed(0)}`;
  }
}

/**
 * Formats the single-line painter spec:
 * "Lounge · 5 × 4 m · stud 2.4 · walls 38.9 m², ceiling 20 m² · 2 coats · $870"
 */
export function formatSurfaceMetricsList(item, settings = {}) {
  const meas = computeAreaMeasurements(item, settings);
  const surfaces = Array.isArray(item.surfaces) ? item.surfaces : [];
  const parts = [];

  for (const s of surfaces) {
    if (s === "walls" && meas.wallsM2 > 0) {
      parts.push(`walls ${fmtMetric(meas.wallsM2)} m²`);
    } else if (s === "ceiling" && meas.ceilingM2 > 0) {
      parts.push(`ceiling ${fmtMetric(meas.ceilingM2)} m²`);
    } else if (s === "skirting" && meas.skirtingM > 0) {
      parts.push(`skirting ${fmtMetric(meas.skirtingM)} m`);
    } else if (s === "weatherboards" && meas.exteriorM2 > 0) {
      parts.push(`weatherboards ${fmtMetric(meas.exteriorM2)} m²`);
    } else if (s === "soffits" && (meas.exteriorM2 > 0 || Number(item.area_m2_spoken) > 0)) {
      parts.push(`soffits ${fmtMetric(meas.exteriorM2 || item.area_m2_spoken)} m²`);
    } else if (s === "fascia" && meas.fasciaM > 0) {
      parts.push(`fascia ${fmtMetric(meas.fasciaM)} m`);
    } else {
      parts.push(s);
    }
  }

  if (Number(item.doors) > 0) {
    parts.push(`${item.doors} ${Number(item.doors) === 1 ? "door" : "doors"}`);
  }
  if (Number(item.windows) > 0) {
    parts.push(`${item.windows} ${Number(item.windows) === 1 ? "window" : "windows"}`);
  }

  return parts.join(", ");
}

export function formatAreaSummaryLine(item, settings = {}, currency = "NZD") {
  const segments = [item.name || `Area ${item.area_number || 1}`];

  if (Number(item.length_m) > 0 && Number(item.width_m) > 0) {
    segments.push(`${fmtMetric(item.length_m)} × ${fmtMetric(item.width_m)} m`);
  } else if (Number(item.area_m2_spoken) > 0) {
    segments.push(`${fmtMetric(item.area_m2_spoken)} m²`);
  }

  if (Number(item.stud_m) > 0) {
    segments.push(`stud ${fmtMetric(item.stud_m)}`);
  }

  const surfaceText = formatSurfaceMetricsList(item, settings);
  if (surfaceText) {
    segments.push(surfaceText);
  }

  const coats = Number(item.coats) || 2;
  segments.push(`${coats} ${coats === 1 ? "coat" : "coats"}`);
  segments.push(formatMoney(item.price, currency));

  return segments.join(" · ");
}