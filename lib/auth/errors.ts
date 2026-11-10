// Übersetzt Supabase-Auth-Fehler in verständliche deutsche Meldungen.

type AuthErrorLike = { message?: string; code?: string; status?: number; name?: string } | null | undefined;

const BY_CODE: Record<string, string> = {
  invalid_credentials: "E-Mail oder Passwort stimmt nicht.",
  email_not_confirmed: "Bitte bestätige zuerst deine E-Mail-Adresse – der Link steckt in deinem Postfach.",
  user_already_exists: "Für diese E-Mail gibt es schon einen Account. Logge dich einfach ein.",
  email_exists: "Für diese E-Mail gibt es schon einen Account. Logge dich einfach ein.",
  weak_password: "Das Passwort ist zu schwach. Nimm mindestens 8 Zeichen.",
  same_password: "Das neue Passwort muss sich vom alten unterscheiden.",
  email_address_invalid: "Bitte gib eine gültige E-Mail-Adresse ein.",
  validation_failed: "Bitte prüfe deine Eingaben.",
  over_email_send_rate_limit: "Gerade wurden zu viele E-Mails angefordert. Bitte warte ein paar Minuten.",
  over_request_rate_limit: "Zu viele Versuche. Bitte warte kurz und probier es dann noch einmal.",
  signup_disabled: "Neue Registrierungen sind aktuell deaktiviert.",
  email_provider_disabled: "Login per E-Mail ist aktuell deaktiviert.",
  provider_disabled: "Dieser Login-Anbieter ist nicht aktiviert.",
  otp_expired: "Der Link ist abgelaufen oder wurde schon benutzt. Fordere einfach einen neuen an.",
  otp_disabled: "Login per Magic-Link ist aktuell deaktiviert.",
  session_not_found: "Deine Sitzung ist abgelaufen. Bitte logge dich neu ein.",
  session_expired: "Deine Sitzung ist abgelaufen. Bitte logge dich neu ein.",
  user_banned: "Dieser Account ist gesperrt.",
  flow_state_not_found: "Der Link passt nicht zu diesem Browser. Öffne ihn dort, wo du ihn angefordert hast.",
  flow_state_expired: "Der Link ist abgelaufen. Fordere einfach einen neuen an.",
  bad_code_verifier: "Der Link passt nicht zu diesem Browser. Öffne ihn dort, wo du ihn angefordert hast.",
  access_denied: "Der Login wurde abgebrochen.",
  auth_callback_failed:
    "Der Login-Link ist ungültig oder abgelaufen. Öffne ihn im selben Browser, in dem du ihn angefordert hast – oder fordere einen neuen an."
};

const BY_MESSAGE: Array<[RegExp, string]> = [
  [/invalid login credentials/i, BY_CODE.invalid_credentials],
  [/email not confirmed/i, BY_CODE.email_not_confirmed],
  [/already registered|already been registered/i, BY_CODE.user_already_exists],
  [/password should be at least|weak password/i, BY_CODE.weak_password],
  [/rate limit|too many requests|security purposes/i, BY_CODE.over_request_rate_limit],
  [/unsupported provider|provider is not enabled/i, BY_CODE.provider_disabled],
  [/signups? not allowed|signup is disabled/i, BY_CODE.signup_disabled],
  [/failed to fetch|networkerror|load failed|network request failed/i, "Keine Verbindung zum Server. Prüfe dein Internet und versuch es noch einmal."]
];

const FALLBACK = "Das hat leider nicht geklappt. Bitte versuch es noch einmal.";

export function authErrorMessage(error: AuthErrorLike | string): string {
  if (!error) return FALLBACK;
  if (typeof error === "string") return BY_CODE[error] ?? FALLBACK;
  if (error.code && BY_CODE[error.code]) return BY_CODE[error.code];
  const message = error.message ?? "";
  for (const [pattern, text] of BY_MESSAGE) {
    if (pattern.test(message)) return text;
  }
  if (error.status === 429) return BY_CODE.over_request_rate_limit;
  if (error.name === "AuthRetryableFetchError") return BY_MESSAGE[BY_MESSAGE.length - 1][1];
  return FALLBACK;
}
