import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  // Ohne Session-Cookie gibt es nichts aufzufrischen — spart den Auth-Roundtrip
  // für alle anonymen Besucher (lokales Spiel, Login-Seiten).
  const hasAuthCookie = request.cookies.getAll().some(({ name }) => name.startsWith("sb-") && name.includes("-auth-token"));
  if (!hasAuthCookie) return supabaseResponse;

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
            supabaseResponse = NextResponse.next({ request });
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            );
          }
        }
      }
    );

    // Just touch the session — refreshes if needed.
    await supabase.auth.getUser();
  } catch {
    // Supabase nicht erreichbar → Seite trotzdem ausliefern statt 500.
  }

  return supabaseResponse;
}
