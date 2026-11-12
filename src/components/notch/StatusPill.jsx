const STATUS_STYLES = {
  draft: "bg-secondary text-muted-foreground",
  sent: "bg-zinc-200/80 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200",
  viewed: "bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300",
  accepted: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-300",
  declined: "bg-red-100 text-red-800 dark:bg-red-950/80 dark:text-red-300",
};

const STATUS_LABELS = {
  draft: "Draft",
  sent: "Sent",
  viewed: "Viewed",
  accepted: "Accepted",
  declined: "Declined",
};

export default function StatusPill({ status = "draft" }) {
  const style = STATUS_STYLES[status] || STATUS_STYLES.draft;
  const label = STATUS_LABELS[status] || "Draft";
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${style}`}>
      {label}
    </span>
  );
}