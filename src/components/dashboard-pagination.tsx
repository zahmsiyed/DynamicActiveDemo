// Keyset navigation keeps observation pages bounded without hiding older records.
import Link from "next/link";
export function DashboardPagination({
  path,
  nextCursor,
  hasCursor,
}: {
  path: string;
  nextCursor: string | null;
  hasCursor: boolean;
}) {
  return (
    <nav
      aria-label="Observation pages"
      className="flex flex-wrap items-center gap-4"
    >
      <p className="text-sm text-brand-muted">
        Showing up to 100 observations. Observation metrics reflect this page.
      </p>
      {hasCursor && (
        <Link className="underline" href={path}>
          Newest observations
        </Link>
      )}
      {nextCursor && (
        <Link
          className="underline"
          href={`${path}?cursor=${encodeURIComponent(nextCursor)}`}
        >
          Older observations
        </Link>
      )}
    </nav>
  );
}
