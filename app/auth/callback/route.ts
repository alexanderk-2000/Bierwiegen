import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/auth/safe-next";

const OTP_TYPES: EmailOtpType[] = ["signup", "invite", "magiclink", "recovery", "email_change", "email"];

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const next = safeNextPath(searchParams.get("next"));
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  // Supabase/der OAuth-Anbieter meldet Fehler als Query-Parameter zurück.
  let errorCode = searchParams.get("error_code") ?? searchParams.get("error");

  if (!errorCode && (code || tokenHash)) {
    try {
      const supabase = await getSupabaseServerClient();
      const { error } = code
        ? await supabase.auth.exchangeCodeForSession(code)
        : type && OTP_TYPES.includes(type)
        ? await supabase.auth.verifyOtp({ token_hash: tokenHash!, type })
        : { error: { code: "auth_callback_failed" } };
      if (!error) {
        // Recovery-Links landen immer auf der Seite zum Passwort-Setzen.
        const target = type === "recovery" ? "/update-password" : next;
        return NextResponse.redirect(`${origin}${target}`);
      }
      errorCode = error.code ?? "auth_callback_failed";
    } catch {
      errorCode = "auth_callback_failed";
    }
  }

  const params = new URLSearchParams({ error: errorCode ?? "auth_callback_failed" });
  if (next !== "/") params.set("next", next);
  return NextResponse.redirect(`${origin}/login?${params.toString()}`);
}
