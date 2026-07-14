import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { avatarColor, initials } from "@/lib/format";
import { cn } from "@/lib/utils";

interface InitialsAvatarProps {
  id: string;
  name: string;
  size?: "sm" | "default" | "lg";
  className?: string;
  /** Overrides the id-derived hash color (e.g. a fixed brand color for the admin demo role). */
  color?: string;
  /** Overrides the derived initials (e.g. a single "A" for the admin demo role). */
  label?: string;
}

export default function InitialsAvatar({
  id,
  name,
  size = "default",
  className,
  color,
  label,
}: InitialsAvatarProps) {
  return (
    <Avatar size={size} className={className}>
      <AvatarFallback
        style={{ background: color ?? avatarColor(id), color: "#fff" }}
        className={cn("font-heading font-semibold")}
      >
        {label ?? initials(name)}
      </AvatarFallback>
    </Avatar>
  );
}
