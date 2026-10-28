/** Inline script: on iPhone, leave the website and open the Jual Digital app. */
export const iosAuthHandoffScript = `
(function () {
  try {
    var ua = navigator.userAgent || "";
    if (!/iPhone|iPad|iPod/i.test(ua)) return;
    var path = location.pathname || "/";
    var hash = new URLSearchParams((location.hash || "").replace(/^#/, ""));
    var query = new URLSearchParams(location.search || "");
    var type = (hash.get("type") || query.get("type") || "").toLowerCase();
    var confirmType = type === "signup" || type === "email" || type === "invite" || type === "email_change";
    var confirmedPath = path === "/auth/confirmed" || path === "/auth/confirmed/";
    var appReturn = path === "/auth/app-return" || path === "/auth/app-return/";
    if (appReturn) {
      location.replace("jualdigital://auth/callback" + location.search + location.hash);
      return;
    }
    if (confirmedPath || confirmType) {
      location.replace("jualdigital://auth/confirmed");
      setTimeout(function () {
        if (document.getElementById("jd-app-handoff")) return;
        var link = document.createElement("a");
        link.id = "jd-app-handoff";
        link.href = "jualdigital://auth/confirmed";
        link.textContent = "Email terkonfirmasi. Buka aplikasi Jual Digital";
        link.style.cssText = "position:fixed;left:16px;right:16px;bottom:24px;z-index:99999;background:#111;color:#fff;padding:14px 16px;border-radius:12px;text-align:center;font-family:-apple-system,sans-serif;font-size:16px;text-decoration:none;";
        document.body.appendChild(link);
      }, 700);
      return;
    }
    // Supabase falls back to the site root when a redirect URL is not allow-listed.
    // Implicit Google tokens on that root should close the in-app browser, not open the website.
    if ((path === "/" || path === "") && hash.get("access_token")) {
      location.replace("jualdigital://auth/callback" + location.search + location.hash);
    }
  } catch (e) {}
})();
`

export function mobileHandoffDocument(kind: "confirmed" | "oauth"): string {
  const script =
    kind === "oauth"
      ? `location.replace("jualdigital://auth/callback" + location.search + location.hash);`
      : iosAuthHandoffScript

  const title = kind === "oauth" ? "Masuk dengan Google" : "Email terkonfirmasi"
  const body =
    kind === "oauth"
      ? `<p>Membuka aplikasi Jual Digital…</p>
         <p><a href="jualdigital://auth/callback">Buka aplikasi</a></p>`
      : `<h1>Email terkonfirmasi</h1>
         <p>Silakan masuk di aplikasi Jual Digital.</p>
         <p><a id="open-app" href="jualdigital://auth/confirmed">Buka aplikasi Jual Digital</a></p>
         <p><a href="/login">Masuk di situs web</a></p>`

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; margin: 0; background: #fff; color: #111; }
    main { max-width: 28rem; margin: 0 auto; padding: 48px 24px; text-align: center; }
    a { color: #111; }
    #open-app, main a[href^="jualdigital"] { display: inline-block; margin: 12px 0; padding: 14px 18px; background: #111; color: #fff; border-radius: 12px; text-decoration: none; }
  </style>
</head>
<body>
  <main>${body}</main>
  <script>${script}</script>
</body>
</html>`
}
