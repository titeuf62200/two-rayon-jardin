(() => {
  const SUPABASE_URL = "https://oieknzurxeaiqjyzswqy.supabase.co";
  const SUPABASE_KEY = "sb_publishable_aJBhD7OSkfMwMNGwZGii7A_-IfI0MO5";
  const FIRST_LOGIN_URL = `${SUPABASE_URL}/functions/v1/organizeo-first-login`;
  let sb = null;
  let profile = null;
  let authRoot = null;

  const $ = (sel, root = document) => root.querySelector(sel);
  const esc = (v = "") => String(v).replace(/[&<>\"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'\"':"&quot;"}[c]));
  const initials = (name = "") => String(name).trim().split(/\s+/).filter(Boolean).slice(0,2).map(x => x[0]?.toUpperCase()).join("") || "?";

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();

  async function init() {
    authRoot = buildAuthScreen();
    document.documentElement.classList.add("two-auth-lock");

    if (!window.supabase?.createClient) {
      showLoginError("Le service d’identification n’a pas pu être chargé. Vérifie la connexion Internet puis réessaie.");
      return;
    }

    sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: "two-rayon-jardin-auth"
      }
    });

    bindLogin();

    const { data } = await sb.auth.getSession();
    if (data?.session) await acceptSession(data.session);

    sb.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT") {
        profile = null;
        $("#two-user-chip")?.remove();
        showAuth();
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
        <span class="two-auth-pill">Espace sécurisé</span>
        <h1>Identifiez-vous</h1>
        <p>Connectez-vous avec votre adresse e-mail et votre mot de passe pour accéder à l’application.</p>
        <form id="two-login-form">
          <label class="two-auth-field"><span>Adresse e-mail</span><input id="two-login-email" type="email" autocomplete="username" inputmode="email" required placeholder="prenom.nom@exemple.fr"></label>
          <label class="two-auth-field"><span>Mot de passe</span><input id="two-login-password" type="password" autocomplete="current-password" required minlength="8" placeholder="••••••••"></label>
          <button class="two-auth-submit" id="two-login-submit" type="submit">Se connecter à TWO</button>
        </form>
        <div class="two-auth-error" id="two-auth-error" role="alert"></div>
        <div class="two-auth-foot">Les nouveaux accès collaborateurs sont créés par un organisateur.</div>
      </section>`;
    document.body.appendChild(root);
    return root;
  }

  function bindLogin() {
    $("#two-login-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = $("#two-login-submit");
      const email = $("#two-login-email").value.trim().toLowerCase();
      const password = $("#two-login-password").value;
      clearLoginError();
      setBusy(btn, true, "Connexion…");

      const { data, error } = await sb.auth.signInWithPassword({ email, password });
      if (error || !data?.session) {
        setBusy(btn, false, "Se connecter à TWO");
        showLoginError("Adresse e-mail ou mot de passe incorrect.");
        return;
      }

      const ok = await acceptSession(data.session);
      setBusy(btn, false, "Se connecter à TWO");
      if (ok) $("#two-login-form")?.reset();
    });
  }

  async function acceptSession(session) {
    const uid = session?.user?.id;
    if (!uid) return false;

    const { data, error } = await sb
      .from("collaborateurs")
      .select("id,nom,email,role,actif,auth_user_id,user_id,user_key")
      .eq("auth_user_id", uid)
      .eq("actif", true)
      .maybeSingle();

    if (error || !data) {
      showLoginError("Ce compte n’est pas autorisé à accéder à TWO. Demande à un organisateur de vérifier ton accès.");
      await sb.auth.signOut();
      showAuth();
      return false;
    }

    profile = data;
    hideAuth();
    injectUserChip();
    return true;
  }

  function showAuth() {
    document.documentElement.classList.add("two-auth-lock");
    if (authRoot) authRoot.style.display = "grid";
  }

  function hideAuth() {
    if (authRoot) authRoot.style.display = "none";
    document.documentElement.classList.remove("two-auth-lock");
  }

  function clearLoginError() {
    const box = $("#two-auth-error");
    if (!box) return;
    box.textContent = "";
    box.classList.remove("show");
  }

  function showLoginError(message) {
    const box = $("#two-auth-error");
    if (!box) return;
    box.textContent = message;
    box.classList.add("show");
  }

  function injectUserChip() {
    $("#two-user-chip")?.remove();
    const topbar = $(".topbar");
    if (!topbar || !profile) return;

    const button = document.createElement("button");
    button.id = "two-user-chip";
    button.className = "two-user-chip";
    button.type = "button";
    button.innerHTML = `<span class="two-user-avatar">${esc(initials(profile.nom))}</span><span class="two-user-copy"><b>${esc(profile.nom)}</b><small>${profile.role === "organisateur" ? "Organisateur" : "Collaborateur"}</small></span>`;
    button.addEventListener("click", openAccountModal);
    topbar.appendChild(button);
  }

  function openAccountModal() {
    if (!profile) return;
    const modal = modalShell("Mon accès TWO", "Compte connecté et droits associés.");
    const card = $(".two-auth-modal-card", modal);
    card.insertAdjacentHTML("beforeend", `
      <div class="two-account-row"><small>COLLABORATEUR</small><b>${esc(profile.nom)}</b></div>
      <div class="two-account-row"><small>E-MAIL</small><b>${esc(profile.email || "—")}</b></div>
      <div class="two-account-row"><small>RÔLE</small><b>${profile.role === "organisateur" ? "Organisateur" : "Collaborateur"}</b></div>
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
    const modal = modalShell("Embarquer un collaborateur", "Crée son accès TWO avec son e-mail et un mot de passe initial.");
    const card = $(".two-auth-modal-card", modal);
    card.insertAdjacentHTML("beforeend", `
      <form id="two-collab-form">
        <label class="two-auth-field"><span>Nom / prénom</span><input id="two-collab-name" type="text" required minlength="2" autocomplete="off" placeholder="Ex. Jean Dupont"></label>
        <label class="two-auth-field"><span>Adresse e-mail</span><input id="two-collab-email" type="email" required inputmode="email" autocomplete="off" placeholder="prenom.nom@exemple.fr"></label>
        <label class="two-auth-field"><span>Mot de passe initial</span><input id="two-collab-password" type="password" required minlength="8" autocomplete="new-password" placeholder="8 caractères minimum"></label>
        <label class="two-auth-field"><span>E-mail de récupération</span><input id="two-collab-recovery" type="email" inputmode="email" autocomplete="off" placeholder="Facultatif — l’e-mail du collaborateur sera utilisé"></label>
        <button class="two-auth-submit" id="two-collab-submit" type="submit">Créer l’accès collaborateur</button>
      </form>
      <div class="two-auth-error" id="two-collab-error" role="alert"></div>
      <div class="two-auth-success" id="two-collab-success"></div>`);
    document.body.appendChild(modal);

    $("#two-collab-form", modal).addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = $("#two-collab-submit", modal);
      const err = $("#two-collab-error", modal);
      const ok = $("#two-collab-success", modal);
      err.classList.remove("show");
      ok.classList.remove("show");

      const nom = $("#two-collab-name", modal).value.trim();
      const email = $("#two-collab-email", modal).value.trim().toLowerCase();
      const password = $("#two-collab-password", modal).value;
      const recovery = $("#two-collab-recovery", modal).value.trim().toLowerCase() || email;

      if (password.length < 8) return modalError(err, "Le mot de passe doit contenir au moins 8 caractères.");
      setBusy(btn, true, "Création…");

      try {
        await onboardCollaborator({ nom, email, password, recovery });
        ok.textContent = `Accès créé pour ${nom}. Le collaborateur peut maintenant se connecter à TWO avec ${email}.`;
        ok.classList.add("show");
        $("#two-collab-form", modal).reset();
      } catch (error) {
        modalError(err, humanError(error));
      } finally {
        setBusy(btn, false, "Créer l’accès collaborateur");
      }
    });
  }

  async function onboardCollaborator({ nom, email, password, recovery }) {
    const { data: existing, error: findError } = await sb
      .from("collaborateurs")
      .select("id,email,auth_user_id,user_id")
      .ilike("email", email)
      .maybeSingle();
    if (findError) throw findError;
    if (existing?.auth_user_id || existing?.user_id) throw new Error("Ce collaborateur possède déjà un compte.");

    let rowId = existing?.id || null;
    if (existing) {
      const { error } = await sb
        .from("collaborateurs")
        .update({ nom, email, role: "collaborateur", actif: true, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
      if (error) throw error;
    } else {
      const { data: maxRow, error: maxError } = await sb
        .from("collaborateurs")
        .select("id")
        .order("id", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (maxError) throw maxError;
      rowId = Number(maxRow?.id || 0) + 1;
      const { error } = await sb.from("collaborateurs").insert({
        id: rowId,
        nom,
        email,
        role: "collaborateur",
        actif: true,
        recevoir_emails: true,
        user_key: email.split("@")[0]
      });
      if (error) throw error;
    }

    const response = await fetch(FIRST_LOGIN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_KEY
      },
      body: JSON.stringify({ email, password, recovery_email: recovery })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result?.ok) {
      if (!existing && rowId) {
        await sb.from("collaborateurs").delete().eq("id", rowId).is("auth_user_id", null);
      }
      throw new Error(result?.error || "Impossible de créer le compte collaborateur.");
    }
  }

  function modalShell(title, subtitle) {
    const modal = document.createElement("div");
    modal.className = "two-auth-modal";
    modal.innerHTML = `<section class="two-auth-modal-card"><div class="two-auth-modal-head"><div><h2>${esc(title)}</h2><p>${esc(subtitle)}</p></div><button class="two-auth-close" type="button" aria-label="Fermer">×</button></div></section>`;
    $(".two-auth-close", modal).addEventListener("click", () => modal.remove());
    modal.addEventListener("click", e => { if (e.target === modal) modal.remove(); });
    return modal;
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
    if (/duplicate|unique/i.test(message)) return "Cette adresse e-mail est déjà utilisée.";
    if (/not authorized|permission|row-level|policy/i.test(message)) return "Ton compte n’a pas les droits organisateur nécessaires.";
    return message;
  }
})();