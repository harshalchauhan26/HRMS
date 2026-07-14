import { cn } from "@/lib/utils";

interface RatingBarProps {
  percent: number;
  color: string;
  className?: string;
  trackClassName?: string;
}

/** Thin horizontal progress track — used for base-achieved bars and competency head bars. */
export default function RatingBar({
  percent,
  color,
  className,
  trackClassName,
}: RatingBarProps) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-hair", trackClassName, className)}>
      <div
        className="h-full rounded-full transition-[width] duration-500 ease-out"
        style={{ width: `${clamped}%`, background: color }}
      />
    </div>
  );
}
