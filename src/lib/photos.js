/**
 * Photos in the order they were snapped, numbered from 1.
 * Capture photos are saved in snap order and later uploads after them, so
 * created_date is the snap order; taken_at_s breaks ties within one save.
 */
export function orderPhotosBySnap(photos = []) {
  return [...(photos || [])]
    .sort((a, b) => {
      const createdA = String(a.created_date || "");
      const createdB = String(b.created_date || "");
      if (createdA !== createdB) return createdA < createdB ? -1 : 1;
      return (Number(a.taken_at_s) || 0) - (Number(b.taken_at_s) || 0);
    })
    .map((photo, idx) => ({ ...photo, snap_number: idx + 1 }));
}

/** One move target per area: its main item, or its first item when the area only has optional parts. */
export function listPhotoTargets(items = []) {
  const byArea = new Map();
  for (const item of items || []) {
    const current = byArea.get(item.area_number);
    if (!current || (current.is_optional_split && !item.is_optional_split)) {
      byArea.set(item.area_number, item);
    }
  }
  return [...byArea.values()]
    .sort((a, b) => (Number(a.area_number) || 0) - (Number(b.area_number) || 0))
    .map((item) => ({
      itemId: item.id,
      areaNumber: item.area_number,
      name: item.name || `Area ${item.area_number}`,
    }));
}

/** The area a photo sits in: its item, else the area with its number (item ids change on undo). */
export function resolvePhotoTarget(photo, targets = []) {
  return (
    targets.find((t) => t.itemId === photo.item_id) ||
    targets.find((t) => Number(t.areaNumber) === Number(photo.area_number)) ||
    null
  );
}