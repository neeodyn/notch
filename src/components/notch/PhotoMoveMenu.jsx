import { ArrowRightLeft, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const TONES = {
  overlay: "bg-black/65 text-white backdrop-blur-md hover:bg-black/80",
  plain: "bg-secondary text-foreground hover:bg-secondary/70",
};

export default function PhotoMoveMenu({ photo, targets = [], currentItemId, onMove, tone = "plain" }) {
  const hasOtherArea = targets.some((t) => t.itemId !== currentItemId);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={!hasOtherArea}
          aria-label={`Move photo ${photo.snap_number} to another area`}
          className={`flex min-h-[36px] items-center gap-1.5 rounded-xl px-3 text-[12px] font-semibold transition-colors disabled:opacity-50 ${TONES[tone]}`}
        >
          <ArrowRightLeft className="h-3.5 w-3.5" />
          <span>Move to…</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 rounded-2xl p-1.5">
        <DropdownMenuLabel className="text-[12px] font-medium text-muted-foreground">
          Move photo {photo.snap_number} to
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {targets.map((target) => {
          const isCurrent = target.itemId === currentItemId;
          return (
            <DropdownMenuItem
              key={target.itemId}
              disabled={isCurrent}
              onSelect={() => onMove(photo, target)}
              className="min-h-[44px] gap-3 rounded-xl text-[15px]"
            >
              <span className="tabular-money flex h-6 min-w-[24px] items-center justify-center rounded-full bg-secondary px-1.5 text-[12px] font-semibold">
                {target.areaNumber}
              </span>
              <span className="flex-1 truncate">{target.name}</span>
              {isCurrent && <Check className="h-4 w-4 text-primary" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}