export const STARTER_PRICE_BOOK = {
  remove: { small: 450, medium: 1100, large: 2200, xl: 3600 },
  trim: { small: 250, medium: 550, large: 950, xl: 1450 },
  crown_reduce: { small: 325, medium: 700, large: 1250, xl: 1900 },
  deadwood: { small: 225, medium: 475, large: 825, xl: 1250 },
  stump_grind: { small: 125, medium: 225, large: 350, xl: 500 },
  haul_pct: 15,
  hazard_pct: {
    near_structure: 20,
    over_fence: 10,
    leaning: 10,
    dead_or_decayed: 10,
    no_truck_access: 25,
  },
  round_to: 25,
};

export const WORK_LABELS = {
  remove: "Removal",
  trim: "Trim & prune",
  crown_reduce: "Crown reduction",
  deadwood: "Deadwood cleaning",
  stump_grind: "Stump grinding",
};

export const SIZE_LABELS = {
  small: "Small (<30 ft)",
  medium: "Medium (30–60 ft)",
  large: "Large (60–80 ft)",
  xl: "XL (>80 ft)",
};

export const HAZARD_LABELS = {
  near_structure: "Near roof / structure",
  over_fence: "Over fence",
  leaning: "Heavy lean",
  dead_or_decayed: "Dead or decayed",
  no_truck_access: "No bucket / truck access",
  power_lines: "Power lines",
};

export function inferSizeClass(heightFt, explicitSize) {
  const valid = ["small", "medium", "large", "xl"];
  if (valid.includes(explicitSize)) return explicitSize;
  const h = Number(heightFt);
  if (!Number.isFinite(h) || h <= 0) return "medium";
  if (h < 30) return "small";
  if (h <= 60) return "medium";
  if (h <= 80) return "large";
  return "xl";
}

export function roundCents(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

export function roundUpTo(amount, step) {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) return 0;
  const s = Number(step) > 0 ? Number(step) : 1;
  return Math.ceil(n / s) * s;
}

/**
 * Pure price-book formula:
 * base[work][size] * (1 + sum(hazard_pct)/100)
 *   + (stump == 'grind' ? stump_grind[size] : 0)
 *   + (haul ? base * haul_pct/100 : 0)
 * rounded UP to round_to.
 */
export function computePriceBookFigure(item, priceBook) {
  if (!priceBook || typeof priceBook !== "object") return null;
  const work = item.work || "trim";
  const size = inferSizeClass(item.height_ft, item.size_class);
  const workTable = priceBook[work];
  if (!workTable || typeof workTable !== "object") return null;

  const base = Number(workTable[size]);
  if (!Number.isFinite(base) || base <= 0) return null;

  const hazards = Array.isArray(item.hazards) ? item.hazards : [];
  const hazardTable = priceBook.hazard_pct || {};
  const hazardPctSum = hazards.reduce((acc, h) => acc + (Number(hazardTable[h]) || 0), 0);

  const isDedicatedStumpLine = work === "stump_grind" || item.is_stump_line;
  const stumpAdd =
    !isDedicatedStumpLine && item.stump === "grind"
      ? Number(priceBook.stump_grind?.[size]) || 0
      : 0;

  const haulAdd =
    !isDedicatedStumpLine && item.haul
      ? base * ((Number(priceBook.haul_pct) || 0) / 100)
      : 0;

  const raw = base * (1 + hazardPctSum / 100) + stumpAdd + haulAdd;
  return roundUpTo(raw, priceBook.round_to ?? 25);
}

/**
 * Prices a single item with priority:
 * owner override -> spoken_price -> price book -> null ('none', "Needs your price").
 * Power lines with no spoken/owner price -> 'none'.
 * Flags spoken_price < 0.5x or > 2x price-book figure.
 */
export function priceSingleItem(item, priceBook) {
  const size_class = inferSizeClass(item.height_ft, item.size_class);
  const normalized = { ...item, size_class };
  const pbEstimate = computePriceBookFigure(normalized, priceBook);
  const hasPowerLines = Array.isArray(item.hazards) && item.hazards.includes("power_lines");
  const needsOwnerPrice = Boolean(item.needs_owner_price || hasPowerLines);

  const hasOwnerManual = item.price_source === "owner" && item.price != null && Number.isFinite(Number(item.price));
  const hasSpoken = item.spoken_price != null && Number.isFinite(Number(item.spoken_price)) && Number(item.spoken_price) >= 0;

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

/**
 * Expands extracted trees into QuoteItem objects, splitting `stump === 'optional'`
 * into a separate optional line priced by stump_spoken_price or price book.
 */
export function expandTreesToQuoteItems(trees, priceBook) {
  const result = [];
  (trees || []).forEach((tree, idx) => {
    const treeNumber = Number(tree.tree_number) > 0 ? Number(tree.tree_number) : idx + 1;
    const size_class = inferSizeClass(tree.height_ft, tree.size_class);
    const work = ["remove", "trim", "crown_reduce", "deadwood", "stump_grind"].includes(tree.work)
      ? tree.work
      : "trim";
    const stumpRaw = ["grind", "optional", "leave"].includes(tree.stump) ? tree.stump : "leave";
    const isStumpOptional = stumpRaw === "optional" && work !== "stump_grind";

    const mainItem = priceSingleItem(
      {
        tree_number: treeNumber,
        label: tree.label || (tree.species ? `${tree.species}` : `Tree ${treeNumber}`),
        species: tree.species || "",
        height_ft: tree.height_ft != null ? Number(tree.height_ft) : null,
        size_class,
        work,
        hazards: Array.isArray(tree.hazards) ? tree.hazards : [],
        stump: isStumpOptional ? "leave" : stumpRaw,
        haul: tree.haul !== undefined ? Boolean(tree.haul) : true,
        optional: Boolean(tree.optional),
        is_stump_line: false,
        needs_owner_price: Boolean(tree.needs_owner_price),
        spoken_price: tree.spoken_price != null ? Number(tree.spoken_price) : null,
        customer_description:
          tree.customer_description ||
          `${WORK_LABELS[work] || "Tree work"} on ${tree.species || `Tree ${treeNumber}`}${tree.haul !== false ? ", including brush haul-away" : ""}.`,
        start_segment: tree.start_segment != null ? Number(tree.start_segment) : null,
      },
      priceBook
    );
    result.push(mainItem);

    if (isStumpOptional) {
      const stumpSpoken =
        tree.stump_spoken_price != null && Number.isFinite(Number(tree.stump_spoken_price))
          ? Number(tree.stump_spoken_price)
          : null;
      const stumpLine = priceSingleItem(
        {
          tree_number: treeNumber,
          label: `${mainItem.label} — Stump grinding`,
          species: mainItem.species,
          height_ft: mainItem.height_ft,
          size_class,
          work: "stump_grind",
          hazards: [],
          stump: "grind",
          haul: false,
          optional: true,
          is_stump_line: true,
          needs_owner_price: false,
          spoken_price: stumpSpoken,
          customer_description: `Grind the ${mainItem.species || `Tree ${treeNumber}`} stump below grade and level wood grindings.`,
          start_segment: mainItem.start_segment,
        },
        priceBook
      );
      result.push(stumpLine);
    }
  });
  return result;
}

/**
 * Total = non-optional items + optional items the homeowner ticks,
 * then min_charge, then tax. Deposit = deposit_pct of total.
 */
export function calculateQuoteTotals({
  items = [],
  tickedOptionalIds = [],
  minCharge = 0,
  taxRate = 0,
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
  const subtotal = minChargeApplied ? roundCents(min) : rawSubtotal;
  const minChargeDelta = minChargeApplied ? roundCents(min - rawSubtotal) : 0;

  const taxAmount = roundCents(subtotal * ((Number(taxRate) || 0) / 100));
  const total = roundCents(subtotal + taxAmount);
  const depositAmount = roundCents(total * ((Number(depositPct) || 0) / 100));

  return {
    baseItemsSum: roundCents(baseItemsSum),
    optionalSum: roundCents(optionalSum),
    rawSubtotal,
    minChargeApplied,
    minChargeDelta,
    subtotal,
    taxAmount,
    total,
    depositAmount,
    unpricedCount,
  };
}

/**
 * Matches each photo to the main tree whose segment time span contains `taken_at_s`.
 * Fallback: photos assigned to trees in order.
 */
export function matchPhotosToItems(photos = [], items = [], segments = []) {
  const mainItems = items
    .filter((it) => !it.is_stump_line)
    .sort((a, b) => (a.tree_number || 0) - (b.tree_number || 0));

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
        tree_number: target.tree_number,
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
      tree_number: matched.tree_number,
    };
  });
}

export function formatMoney(amount, currency = "USD") {
  if (amount == null || !Number.isFinite(Number(amount))) return "Needs your price";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
      minimumFractionDigits: Number(amount) % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(Number(amount));
  } catch {
    return `$${Number(amount).toFixed(0)}`;
  }
}