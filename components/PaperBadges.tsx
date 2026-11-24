import type { Membership } from "@/lib/types";
import { RELATIONSHIP_LABELS } from "@/lib/types";

interface PaperBadgesProps {
  memberships: Membership[];
  className?: string;
}

const BADGE_CLASS: Record<Membership, string> = {
  reference: "badge badge-reference",
  citing: "badge badge-citing",
  recommended: "badge badge-recommended",
};

export function PaperBadges({ memberships, className }: PaperBadgesProps) {
  if (memberships.length === 0) return null;
  return (
    <span className={`paper-badges${className ? ` ${className}` : ""}`}>
      {memberships.map((membership) => (
        <span key={membership} className={BADGE_CLASS[membership]}>
          {RELATIONSHIP_LABELS[membership]}
        </span>
      ))}
    </span>
  );
}

export function MembershipDot({ membership }: { membership: Membership }) {
  return (
    <span
      className={`color-dot dot-${membership}`}
      aria-hidden="true"
    />
  );
}
