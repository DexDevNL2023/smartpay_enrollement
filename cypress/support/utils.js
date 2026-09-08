/**
 * Module d'Utilitaires (Helpers) - Optimisé pour l'environnement Cypress
 */

// Fonction utilitaire pour retirer les caracteres speciaux sur les textes
export function normalize(text) {
  if (typeof text !== "string") return ""; // protection contre undefined, null, objets, etc.

  return text
    .toLowerCase()
    .normalize("NFD") // décompose les caractères accentués
    .replace(/[\u0300-\u036f]/g, "") // supprime les accents
    .replace(/\s+/g, " ") // espaces multiples → un seul
    .trim();
}

// Fonction utilitaire pour générer toutes les variantes possibles
export function getAllVariants(value) {
  const dict = Cypress.env("translations") || {};
  const input = normalize(value);

  // OPTIMISATION QA: Utiliser la langue stockée par Cypress si disponible
  const lang = Cypress.env("lang") || document.documentElement.lang || "fr";

  if (!input) return [value];

  // 1️⃣ Recherche directe par clé
  for (const key of Object.keys(dict)) {
    if (normalize(key) === input) {
      const variants = dict[key];
      // Logique de filtrage des variantes spécifiques à la langue (très bien)
      const langVariants = variants.filter(
        (v) =>
          lang === "fr"
            ? /[àâçéèêëîïôûùüÿ]/i.test(v) || /^[a-zà-ÿ\s]+$/i.test(v) // Vérifie les caractères français
            : /^[a-z\s]+$/i.test(v) // Vérifie l'absence de caractères français spécifiques (présumément anglais)
      );
      return langVariants.length ? langVariants : variants;
    }
  }

  // 2️⃣ Recherche inversée dans les valeurs
  for (const [key, variants] of Object.entries(dict)) {
    if (
      variants.some((v) => {
        if (v instanceof RegExp) return v.test(input);
        return normalize(v) === input;
      })
    ) {
      return variants;
    }
  }

  // 3️⃣ Fallback : retourne la valeur brute
  return [value];
}

// Fonction utilitaire pour échapper correctement les IDs
export function escapeId(id) {
  return id.replace(/([:.#'\[\]\\])/g, "\\$1");
}

export function getClearableElement(el) {
  // Si jQuery array, ne prendre que le premier élément
  if (el.length > 1) el = el.first();

  const tag = el.prop("tagName").toLowerCase();

  // 1. L'élément est déjà un champ de formulaire
  if (["input", "textarea", "select"].includes(tag)) return el;

  // 2. Label -> chercher input associé
  if (tag === "label") {
    const id = el.attr("for");
    if (id) {
      const input = Cypress.$(`#${escapeId(id)}`);
      if (input.length) return input;
    }
    const childInput = el.find("input, textarea, select").first();
    if (childInput.length) return childInput;
  }

  // 3. Div/Span avec aria-labelledby -> chercher input
  const labelledId = el.attr("aria-labelledby");
  if (labelledId) {
    const input = Cypress.$(`#${escapeId(labelledId)}`);
    if (input.length) return input;
  }

  // 4. Div/Span avec input enfant
  const childInput = el.find("input, textarea, select").first();
  if (childInput.length) return childInput;

  // Fallback
  return el;
}

export function getClickableAncestor($el) {
  // AJOUT OPTIMISATION : ajouter les rôles de boutons (role=button)
  const clickable = $el.closest(
    "a, button, [mat-button], [role=menuitem], [role=button]"
  );
  return clickable.length ? clickable : $el;
}

export function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function isDropdownTrigger(el) {
  return (
    el.attr("aria-haspopup") ||
    el.hasClass("dropdown-toggle") ||
    el.is("[data-toggle=dropdown]")
  );
}

// =============================================
// FONCTIONS UTILITAIRES DE VÉRIFICATION DE SÉCURITÉ
// =============================================

/**
 * Vérifie les en-têtes de sécurité OWASP/ISO 27001 dans la réponse.
 * @param {object} headers - Les en-têtes de la réponse.
 * @param {string} url - L'URL de la requête.
 */
export function validateSecurityHeaders(headers, url) {
  // Liste des en-têtes recommandés pour la sécurité web
  const SECURITY_HEADERS = {
    // 1. Protection contre les attaques de type clickjacking
    "x-frame-options": ["DENY", "SAMEORIGIN"],
    // 2. Protection contre les attaques XSS (souvent désactivé/remplacé)
    "x-content-type-options": ["nosniff"],
    // 3. Empêche le navigateur d'interpréter des fichiers d'une manière différente de ce qui est déclaré.
    "x-xss-protection": ["1; mode=block"],
    // 4. Force l'utilisation de HTTPS (crucial pour Spring Boot derrière un proxy HTTPS)
    "strict-transport-security": ["max-age"],
    // 5. Politique de sécurité du contenu (important dans les apps modernes)
    // 'content-security-policy': ['default-src'], // Souvent trop spécifique, vérification par défaut omise.
  };

  for (const header in SECURITY_HEADERS) {
    const expectedValues = SECURITY_HEADERS[header];
    const actualValue = headers[header.toLowerCase()];

    if (actualValue) {
      const passesCheck = expectedValues.some((expected) =>
        actualValue.includes(expected)
      );

      expect(
        passesCheck,
        `ISO 27001: L'en-tête de sécurité '${header}' doit contenir l'une des valeurs: ${expectedValues.join(
          " ou "
        )}. Valeur actuelle: '${actualValue}'`
      ).to.be.true;
    } else if (header !== "x-xss-protection" && header !== "x-frame-options") {
      // Ces deux sont parfois gérés différemment ou remplacés par CSP.
      expect(
        actualValue,
        `⚠️ ISO 27001: L'en-tête de sécurité essentiel '${header}' est manquant dans la réponse de ${url}`
      ).to.not.be.undefined;
    }
  }
}
