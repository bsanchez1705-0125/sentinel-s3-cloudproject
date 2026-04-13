// ============================================================
//  auth.js  —  Cognito PKCE Authentication Helper
//  Handles: login redirect, token exchange, session storage,
//           logout, and auth-guarding the dashboard.
// ============================================================

const SentinelAuth = (() => {

  const ID_TOKEN_KEY    = "sentinel_id_token";
  const ACCESS_TOKEN_KEY = "sentinel_access_token";
  const EXPIRY_KEY      = "sentinel_token_expiry";
  const VERIFIER_KEY    = "sentinel_pkce_verifier";

  // ---- PKCE helpers ----------------------------------------

  function base64URLEncode(buffer) {
    return btoa(String.fromCharCode(...new Uint8Array(buffer)))
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  }

  async function generateVerifier() {
    const arr = new Uint8Array(32);
    crypto.getRandomValues(arr);
    return base64URLEncode(arr);
  }

  async function generateChallenge(verifier) {
    const data = new TextEncoder().encode(verifier);
    const digest = await crypto.subtle.digest("SHA-256", data);
    return base64URLEncode(digest);
  }

  // ---- Token storage ---------------------------------------

  function saveTokens(idToken, accessToken, expiresIn) {
    sessionStorage.setItem(ID_TOKEN_KEY, idToken);
    sessionStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    sessionStorage.setItem(EXPIRY_KEY, Date.now() + expiresIn * 1000);
  }

  function clearTokens() {
    sessionStorage.removeItem(ID_TOKEN_KEY);
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    sessionStorage.removeItem(EXPIRY_KEY);
    sessionStorage.removeItem(VERIFIER_KEY);
  }

  function getIdToken() {
    const expiry = parseInt(sessionStorage.getItem(EXPIRY_KEY) || "0");
    if (Date.now() > expiry) {
      clearTokens();
      return null;
    }
    return sessionStorage.getItem(ID_TOKEN_KEY);
  }

  function getAccessToken() {
    return sessionStorage.getItem(ACCESS_TOKEN_KEY);
  }

  // ---- Public API ------------------------------------------

  async function login() {
    const verifier   = await generateVerifier();
    const challenge  = await generateChallenge(verifier);
    sessionStorage.setItem(VERIFIER_KEY, verifier);

    const params = new URLSearchParams({
      response_type:         "code",
      client_id:             SENTINEL_CONFIG.userPoolClientId,
      redirect_uri:          SENTINEL_CONFIG.redirectUri,
      scope:                 "openid email profile",
      code_challenge:        challenge,
      code_challenge_method: "S256",
    });

    window.location.href =
      `https://${SENTINEL_CONFIG.cognitoDomain}/login?${params}`;
  }

  async function handleCallback() {
    const params   = new URLSearchParams(window.location.search);
    const code     = params.get("code");
    if (!code) return false;

    const verifier = sessionStorage.getItem(VERIFIER_KEY);
    if (!verifier) return false;

    const body = new URLSearchParams({
      grant_type:    "authorization_code",
      client_id:     SENTINEL_CONFIG.userPoolClientId,
      code,
      redirect_uri:  SENTINEL_CONFIG.redirectUri,
      code_verifier: verifier,
    });

    try {
      const resp = await fetch(
        `https://${SENTINEL_CONFIG.cognitoDomain}/oauth2/token`,
        {
          method:  "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body,
        }
      );

      if (!resp.ok) {
        console.error("Token exchange failed:", await resp.text());
        return false;
      }

      const data = await resp.json();
      saveTokens(data.id_token, data.access_token, data.expires_in);

      // Clean code from URL without reload
      const cleanUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);

      return true;
    } catch (err) {
      console.error("Token exchange error:", err);
      return false;
    }
  }

  function logout() {
    clearTokens();
    const params = new URLSearchParams({
      client_id:  SENTINEL_CONFIG.userPoolClientId,
      logout_uri: SENTINEL_CONFIG.redirectUri,
    });
    window.location.href =
      `https://${SENTINEL_CONFIG.cognitoDomain}/logout?${params}`;
  }

  function isAuthenticated() {
    return !!getIdToken();
  }

  // Parse display name from JWT id_token
  function getUserEmail() {
    const token = getIdToken();
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      return payload.email || payload["cognito:username"] || "Admin";
    } catch {
      return "Admin";
    }
  }

  return {
    login,
    logout,
    handleCallback,
    isAuthenticated,
    getUserEmail,
    getIdToken,
    getAccessToken,
  };
})();
