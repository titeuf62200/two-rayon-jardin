(() => {
  const SUPABASE_URL = "https://oieknzurxeaiqjyzswqy.supabase.co";
  const SUPABASE_KEY = "sb_publishable_aJBhD7OSkfMwMNGwZGii7A_-IfI0MO5";
  const AUTH_ENDPOINT = `${SUPABASE_URL}/functions/v1/organizeo-first-login`;

  let sb = null;
  let profile = null;
  let authRoot = null;
  let ownerInitialized = null;

  const $ = (sel, root = document) => root.querySelector(sel);
  const esc = (v = "") => String(v).replace(/[&<>\"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'\"':"&quot;"}[c]));
  const initials = (name = "") => String(name).trim().split(/\s+/).filter(Boolean).slice(0,2).map(x => x[0]?.toUpperCase()).join("") || "?";

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();

  async function init() {
    authRoot = buildAuthScreen();
    document.documentElement.classList.add("two-auth-lock");

    if (!window.supabase?.createClient) {
      showError("Le service d’identification n’a pas pu être chargé. Vérifie la connexion Internet puis réessaie.");
      return;
    }

    sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: "two-rayon-jardin-auth-v2"
      }
    });

    bindEvents();

    const { data } = await sb.auth.getSession();
    if (data?.session) {
      const ok = await acceptSession(data.session);
      if (ok) return;
    }

    await refreshEntryMode();

    sb.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT") {
        profile = null;
        $("#two-user-chip")?.remove();
        showAuth();
        await refreshEntryMode();
      }
      if (event === "SIGNED_IN" && session) await acceptSession(session);
    });
  }

  function buildAuthScreen() {
    const root = document.createElement("div");
    root.id = "two-auth-root";
    root.className = "two-auth-screen";
    root.innerHTML = `
      <section class="two-auth-card" aria-label="Identification TWO">
        <div class="two-auth-brand">
          <div class="two-auth-logo">TWO</div>
          <div><b>TWO — Rayon Jardin</b><small>Accès équipe · 2027</small></div>
        </div>
        <span class="two-auth-pill" id="two-auth-pill">Espace sécurisé</span>

        <div id="two-login-pane">
          <h1>Identifiez-vous</h1>
          <p>Connectez-vous avec l’adresse e-mail et le mot de passe de votre profil TWO.</p>
          <form id="two-login-form">
            <label class="two-auth-field"><span>Adresse e-mail</span><input id="two-login-email" type="email" autocomplete="username" inputmode="email" required placeholder="prenom.nom@exemple.fr"></label>
            <label class="two-auth-field"><span>Mot de passe</span><input id="two-login-password" type="password" autocomplete="current-password" required minlength="8" placeholder="••••••••"></label>
            <button class="two-auth-submit" id="two-login-submit" type="submit">Se connecter à TWO</button>
          </form>
        </div>

        <div id="two-setup-pane" class="two-auth-hidden">
          <h1>Crée ton profil</h1>
          <p>Cette inscription n’est disponible qu’une seule fois. Le premier profil validé avec ton code propriétaire devient l’unique administrateur de TWO.</p>
          <form id="two-setup-form">
            <label class="two-auth-field"><span>Code propriétaire</span><input id="two-setup-code" type="text" autocomplete="off" required autocapitalize="characters" placeholder="TWO-XXXX-XXXX"></label>
            <label class="two-auth-field"><span>Nom / prénom</span><input id="two-setup-name" type="text" autocomplete="name" required minlength="2" placeholder="Ton nom"></label>
            <label class="two-auth-field"><span>Adresse e-mail</span><input id="two-setup-email" type="email" autocomplete="email" inputmode="email" required placeholder="ton.adresse@email.fr"></label>
            <label class="two-auth-field"><span>Mot de passe</span><input id="two-setup-password" type="password" autocomplete="new-password" required minlength="8" placeholder="8 caractères minimum"></label>
            <label class="two-auth-field"><span>Confirmer le mot de passe</span><input id="two-setup-confirm" type="password" autocomplete="new-password" required minlength="8" placeholder="Retape le mot de passe"></label>
            <button class="two-auth-submit" id="two-setup-submit" type="submit">Créer mon profil propriétaire</button>
          </form>
        </div>

        <div class="two-auth-error" id="two-auth-error" role="alert"></div>
        <div class="two-auth-success" id="two-auth-success"></div>
        <div class="two-auth-foot" id="two-auth-foot">Vérification de l’accès…</div>
      </section>`;
    document.body.appendChild(root);
    return root;
  }

  function bindEvents() {
    $("#two-login-form")?.addEventListener("submit", handleLogin);
    $("#two-setup-form")?.addEventListener("submit", handleSetup);
  }

  async function callAuth(action, payload = {}, session = null) {
    const headers = {
      "Content-Type": "application/json",
      "apikey": SUPABASE_KEY
    };
    if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
    const response = await fetch(AUTH_ENDPOINT, {
      method: "POST",
      headers,
      body: JSON.stringify({ action, ...payload })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result?.ok) throw new Error(result?.error || "Une erreur est survenue.");
    return result;
  }

  async function refreshEntryMode() {
    clearMessages();
    try {
      const status = await callAuth("two_status");
      ownerInitialized = !!status.initialized;
      if (ownerInitialized) showLoginPane();
      else showSetupPane();
    } catch (error) {
      showLoginPane();
      showError("Impossible de vérifier l’état du profil propriétaire. Réessaie dans un instant.");
    }
  }

  function showLoginPane() {
    $("#two-login-pane")?.classList.remove("two-auth-hidden");
    $("#two-setup-pane")?.classList.add("two-auth-hidden");
    if ($("#two-auth-pill")) $("#two-auth-pill").textContent = "Espace sécurisé";
    if ($("#two-auth-foot")) $("#two-auth-foot").textContent = "Les nouveaux collaborateurs sont créés uniquement par le propriétaire.";
  }

  function showSetupPane() {
    $("#two-login-pane")?.classList.add("two-auth-hidden");
    $("#two-setup-pane")?.classList.remove("two-auth-hidden");
    if ($("#two-auth-pill")) $("#two-auth-pill").textContent = "Première installation";
    if ($("#two-auth-foot")) $("#two-auth-foot").textContent = "Après ta création, cet écran d’inscription et le code propriétaire seront définitivement désactivés.";
  }

  async function handleSetup(e) {
    e.preventDefault();
    clearMessages();

    const btn = $("#two-setup-submit");
    const bootstrap_code = $("#two-setup-code").value.trim().toUpperCase();
    const display_name = $("#two-setup-name").value.trim();
    const email = $("#two-setup-email").value.trim().toLowerCase();
    const password = $("#two-setup-password").value;
    const confirm = $("#two-setup-confirm").value;

    if (password.length < 8) return showError("Le mot de passe doit contenir au moins 8 caractères.");
    if (password !== confirm) return showError("Les deux mots de passe ne sont pas identiques.");

    setBusy(btn, true, "Création du profil…");
    try {
      const result = await callAuth("two_bootstrap_owner", { bootstrap_code, display_name, email, password });
      ownerInitialized = true;

      const loginEmail = result.auth_email || await deriveAuthEmail(email);
      const { data, error } = await sb.auth.signInWithPassword({ email: loginEmail, password });
      if (error || !data?.session) {
        showLoginPane();
        showSuccess("Ton profil propriétaire a bien été créé. Connecte-toi maintenant avec ton adresse e-mail et le mot de passe choisi.");
        $("#two-login-email").value = email;
        return;
      }

      $("#two-setup-form")?.reset();
      await acceptSession(data.session);
    } catch (error) {
      const msg = humanError(error);
      if (/existe déjà|réservé|créé|plus disponible/i.test(msg)) {
        ownerInitialized = true;
        showLoginPane();
      }
      showError(msg);
    } finally {
      setBusy(btn, false, "Créer mon profil propriétaire");
    }
  }

  async function handleLogin(e) {
    e.preventDefault();
    clearMessages();

    const btn = $("#two-login-submit");
    const email = $("#two-login-email").value.trim().toLowerCase();
    const password = $("#two-login-password").value;
    setBusy(btn, true, "Connexion…");

    try {
      const loginEmail = await deriveAuthEmail(email);
      const { data, error } = await sb.auth.signInWithPassword({ email: loginEmail, password });
      if (error || !data?.session) throw new Error("Adresse e-mail ou mot de passe incorrect.");
      const ok = await acceptSession(data.session);
      if (ok) $("#two-login-form")?.reset();
    } catch (error) {
      showError(humanError(error));
    } finally {
      setBusy(btn, false, "Se connecter à TWO");
    }
  }

  async function deriveAuthEmail(email) {
    const bytes = new TextEncoder().encode(String(email || "").trim().toLowerCase());
    const hash = await crypto.subtle.digest("SHA-256", bytes);
    const hex = [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, "0")).join("");
    return `two.${hex.slice(0,40)}@example.com`;
  }

  async function acceptSession(session) {
    if (!session?.access_token) return false;
    try {
      const result = await callAuth("two_profile", {}, session);
      profile = result.profile;
      hideAuth();
      injectUserChip();
      return true;
    } catch (error) {
      await sb.auth.signOut();
      profile = null;
      showAuth();
      showError("Ce compte n’est pas autorisé à accéder à TWO.");
      return false;
    }
  }

  function showAuth() {
    document.documentElement.classList.add("two-auth-lock");
    if (authRoot) authRoot.style.display = "grid";
  }

  function hideAuth() {
    if (authRoot) authRoot.style.display = "none";
    document.documentElement.classList.remove("two-auth-lock");
  }

  function injectUserChip() {
    $("#two-user-chip")?.remove();
    const topbar = $(".topbar");
    if (!topbar || !profile) return;

    const button = document.createElement("button");
    button.id = "two-user-chip";
    button.className = "two-user-chip";
    button.type = "button";
    button.innerHTML = `<span class="two-user-avatar">${esc(initials(profile.display_name))}</span><span class="two-user-copy"><b>${esc(profile.display_name)}</b><small>${profile.role === "organisateur" ? "Propriétaire" : "Collaborateur"}</small></span>`;
    button.addEventListener("click", openAccountModal);
    topbar.appendChild(button);
  }

  function openAccountModal() {
    if (!profile) return;
    const modal = modalShell("Mon accès TWO", "Compte connecté et droits associés.");
    const card = $(".two-auth-modal-card", modal);
    card.insertAdjacentHTML("beforeend", `
      <div class="two-account-row"><small>UTILISATEUR</small><b>${esc(profile.display_name)}</b></div>
      <div class="two-account-row"><small>E-MAIL</small><b>${esc(profile.email || "—")}</b></div>
      <div class="two-account-row"><small>RÔLE</small><b>${profile.role === "organisateur" ? "Propriétaire · administrateur unique" : "Collaborateur"}</b></div>
      <div class="two-auth-actions">
        ${profile.role === "organisateur" ? '<button class="two-auth-action primary" id="two-add-collab" type="button">＋ Embarquer un collaborateur</button>' : ''}
        <button class="two-auth-action danger" id="two-signout" type="button">Se déconnecter</button>
      </div>`);
    document.body.appendChild(modal);

    $("#two-add-collab", modal)?.addEventListener("click", () => {
      modal.remove();
      openCollaboratorModal();
    });
    $("#two-signout", modal)?.addEventListener("click", async () => {
      modal.remove();
      await sb.auth.signOut();
    });
  }

  function openCollaboratorModal() {
    if (profile?.role !== "organisateur") return;
    const modal = modalShell("Embarquer un collaborateur", "Tu es le seul compte autorisé à créer de nouveaux accès.");
    const card = $(".two-auth-modal-card", modal);
    card.insertAdjacentHTML("beforeend", `
      <form id="two-collab-form">
        <label class="two-auth-field"><span>Nom / prénom</span><input id="two-collab-name" type="text" required minlength="2" autocomplete="off" placeholder="Ex. Jean Dupont"></label>
        <label class="two-auth-field"><span>Adresse e-mail</span><input id="two-collab-email" type="email" required inputmode="email" autocomplete="off" placeholder="prenom.nom@exemple.fr"></label>
        <label class="two-auth-field"><span>Mot de passe initial</span><input id="two-collab-password" type="password" required minlength="8" autocomplete="new-password" placeholder="8 caractères minimum"></label>
        <button class="two-auth-submit" id="two-collab-submit" type="submit">Créer l’accès collaborateur</button>
      </form>
      <div class="two-auth-error" id="two-collab-error" role="alert"></div>
      <div class="two-auth-success" id="two-collab-success"></div>`);
    document.body.appendChild(modal);

    $("#two-collab-form", modal).addEventListener("submit", async e => {
      e.preventDefault();
      const btn = $("#two-collab-submit", modal);
      const err = $("#two-collab-error", modal);
      const ok = $("#two-collab-success", modal);
      err.classList.remove("show");
      ok.classList.remove("show");

      const display_name = $("#two-collab-name", modal).value.trim();
      const email = $("#two-collab-email", modal).value.trim().toLowerCase();
      const password = $("#two-collab-password", modal).value;
      if (password.length < 8) return modalError(err, "Le mot de passe doit contenir au moins 8 caractères.");

      setBusy(btn, true, "Création…");
      try {
        const { data } = await sb.auth.getSession();
        if (!data?.session) throw new Error("Ta session a expiré. Reconnecte-toi.");
        await callAuth("two_create_collaborator", { display_name, email, password }, data.session);
        ok.textContent = `Accès créé pour ${display_name}. Cette personne peut maintenant se connecter avec ${email}.`;
        ok.classList.add("show");
        $("#two-collab-form", modal).reset();
      } catch (error) {
        modalError(err, humanError(error));
      } finally {
        setBusy(btn, false, "Créer l’accès collaborateur");
      }
    });
  }

  function modalShell(title, subtitle) {
    const modal = document.createElement("div");
    modal.className = "two-auth-modal";
    modal.innerHTML = `<section class="two-auth-modal-card"><div class="two-auth-modal-head"><div><h2>${esc(title)}</h2><p>${esc(subtitle)}</p></div><button class="two-auth-close" type="button" aria-label="Fermer">×</button></div></section>`;
    $(".two-auth-close", modal).addEventListener("click", () => modal.remove());
    modal.addEventListener("click", e => { if (e.target === modal) modal.remove(); });
    return modal;
  }

  function clearMessages() {
    const err = $("#two-auth-error");
    const ok = $("#two-auth-success");
    if (err) { err.textContent = ""; err.classList.remove("show"); }
    if (ok) { ok.textContent = ""; ok.classList.remove("show"); }
  }

  function showError(message) {
    const box = $("#two-auth-error");
    if (!box) return;
    box.textContent = message;
    box.classList.add("show");
  }

  function showSuccess(message) {
    const box = $("#two-auth-success");
    if (!box) return;
    box.textContent = message;
    box.classList.add("show");
  }

  function setBusy(button, busy, label) {
    if (!button) return;
    button.disabled = !!busy;
    button.textContent = label;
  }

  function modalError(el, message) {
    if (!el) return;
    el.textContent = message;
    el.classList.add("show");
  }

  function humanError(error) {
    const message = String(error?.message || error || "Erreur inconnue");
    if (/already|duplicate|unique/i.test(message)) return "Cette adresse e-mail possède déjà un accès TWO.";
    if (/invalid login|credentials/i.test(message)) return "Adresse e-mail ou mot de passe incorrect.";
    return message;
  }
})();