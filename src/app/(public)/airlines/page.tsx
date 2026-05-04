import { redirect } from "next/navigation";

/**
 * Index page for {@code /airlines}.
 *
 * <p>The real airline pages live at {@code /airlines/[icao]} — an ICAO code is
 * always required. Without one, there is nothing meaningful to show, so we
 * redirect callers (bookmarks, external links, typed URLs) to the global search
 * page where they can pick an airline.
 *
 * <p>This is a server component + 307 redirect — no client bundle, no hydration,
 * fast. Uses {@code redirect()} from {@code next/navigation} which throws a
 * {@code NEXT_REDIRECT} error that Next.js resolves into a 307 Temporary Redirect.
 */
export default function AirlinesIndexPage() {
  redirect("/search?tab=airlines");
}
