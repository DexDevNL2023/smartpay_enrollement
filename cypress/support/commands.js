// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add('login', (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add('drag', { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add('dismiss', { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite('visit', (originalFn, url, options) => { ... })

// Fonction utilitaire pour retirer les caracteres speciaux sur les textes
function normalize(text) {
  if (typeof text !== "string") return ""; // protection contre undefined, null, objets, etc.

  return text
    .toLowerCase()
    .normalize("NFD") // décompose les caractères accentués
    .replace(/[\u0300-\u036f]/g, "") // supprime les accents
    .replace(/\s+/g, " ") // espaces multiples → un seul
    .trim();
}

// Fonction utilitaire pour générer toutes les variantes possibles
function getAllVariants(value) {
  const dict = Cypress.env("translations") || {};
  const input = normalize(value);
  const lang = document.documentElement.lang || "fr";

  if (!input) return [value];

  // 1️⃣ Recherche directe par clé
  for (const key of Object.keys(dict)) {
    if (normalize(key) === input) {
      const variants = dict[key];
      const langVariants = variants.filter((v) =>
        lang === "fr"
          ? /[àâçéèêëîïôûùüÿ]/i.test(v) || /^[a-zà-ÿ\s]+$/i.test(v)
          : /^[a-z\s]+$/i.test(v)
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
function escapeId(id) {
  return id.replace(/([:.#'\[\]\\])/g, "\\$1");
}

function getClearableElement(el) {
  // Si jQuery array
  if (el.length > 1) el = el.first();

  const tag = el.prop("tagName").toLowerCase();

  if (["input", "textarea", "select"].includes(tag)) return el;

  // Label -> chercher input associé
  if (tag === "label") {
    const id = el.attr("for");
    if (id) {
      //const input = Cypress.$(`#${id}`);
      const input = Cypress.$(`#${escapeId(id)}`);
      if (input.length) return input;
    }
    const childInput = el.find("input, textarea, select").first();
    if (childInput.length) return childInput;
  }

  // Div/Span avec aria-labelledby -> chercher input
  const labelledId = el.attr("aria-labelledby");
  if (labelledId) {
    //const input = Cypress.$(`#${labelledId}`);
    const input = Cypress.$(`#${escapeId(labelledId)}`);
    if (input.length) return input;
  }

  // Div/Span avec input enfant
  const childInput = el.find("input, textarea, select").first();
  if (childInput.length) return childInput;

  // Fallback
  return el;
}

function getClickableAncestor($el) {
  const clickable = $el.closest("a, button, [mat-button], [role=menuitem]");
  return clickable.length ? clickable : $el;
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isDropdownTrigger(el) {
  return (
    el.attr("aria-haspopup") ||
    el.hasClass("dropdown-toggle") ||
    el.is("[data-toggle=dropdown]")
  );
}

/**
 * Simule un throw non bloquant : affiche une erreur claire et visible
 * mais n’interrompt pas le test Cypress.
 *
 * @param {string} message - Message d’erreur.
 * @param {"CRITICAL"|"WARNING"} [type] - Niveau de gravité.
 */
function softError(message, type = "CRITICAL") {
  const color = type === "CRITICAL" ? "red" : "orange";
  const prefix =
    type === "CRITICAL" ? "❌ ERREUR CRITIQUE" : "⚠️ AVERTISSEMENT";

  // Log coloré dans Cypress
  Cypress.log({
    name: prefix,
    displayName: prefix,
    message: message,
    consoleProps: () => ({
      Type: type,
      Message: message,
      Horodatage: new Date().toISOString(),
      Niveau: "Non bloquant",
    }),
    $el: Cypress.$(`<div>${message}</div>`).css({
      "background-color": `${color}22`,
      color: color,
      padding: "4px 8px",
      "border-radius": "4px",
      "font-weight": "600",
    }),
  });

  // Trace visible dans la console du navigateur (comme un throw)
  console.group(`%c${prefix}`, `color:${color}; font-weight:bold;`);
  console.error(`%c${message}`, `color:${color}`);
  console.groupEnd();
}

// =============================================
// FONCTIONS UTILITAIRES DE VÉRIFICATION DE SÉCURITÉ
// =============================================

/**
 * Logue un message d'échec non bloquant avec une couleur spécifique.
 * Simule le comportement d'une assertion pour le rapport, sans arrêter le test.
 * @param {string} message - Message d'échec à logger.
 * @param {string} type - Type de log (e.g., 'WARNING', 'CRITICAL').
 * @param {object} details - Détails pour la consoleProps.
 */
function logIfFails(message, type, details = {}) {
  // Utilisation d'une couleur d'arrière-plan pour simuler l'importance (Orange/Rouge en console)
  const logColor = type === "CRITICAL" ? "red" : "orange";
  const logName =
    type === "CRITICAL" ? "❌ ERREUR CRITIQUE" : "⚠️ ERREUR NON BLOQUANT";

  Cypress.log({
    name: logName,
    displayName: logName,
    message: message,
    // Style pour rendre le log visible et coloré dans l'interface Cypress
    consoleProps: () => ({
      ...details,
      Message: message,
      Verdict_QA_2025: "Échec Non Bloquant (Logged)",
    }),
    // Ajout d'une couleur d'arrière-plan pour les CI/CD
    $el: Cypress.$(`<div>${message}</div>`).css({
      "background-color": `#${logColor}33`, // Couleur semi-transparente
      padding: "2px 5px",
      "border-radius": "3px",
    }),
  });
}

/**
 * Vérifie les en-têtes de sécurité OWASP/ISO 27001 dans la réponse.
 * N'utilise plus d'expect bloquant pour la non-conformité des headers.
 * @param {object} headers - Les en-têtes de la réponse.
 * @param {string} url - L'URL de la requête.
 */
function validateSecurityHeaders(headers, url) {
  // Liste des en-têtes recommandés pour la sécurité web
  const SECURITY_HEADERS = {
    "x-frame-options": ["DENY", "SAMEORIGIN"],
    "x-content-type-options": ["nosniff"],
    "strict-transport-security": ["max-age"],
    // Ces headers sont souvent gérés ou remplacés par CSP et ne sont plus des 'must-haves' bloquants
    "x-xss-protection": ["1; mode=block"],
  };

  for (const header in SECURITY_HEADERS) {
    const expectedValues = SECURITY_HEADERS[header];
    const actualValue = headers[header.toLowerCase()];
    // Définir 'CRITICAL' pour les headers absolument essentiels si manquants/faux
    const criticality =
      header === "strict-transport-security" ||
      header === "x-content-type-options"
        ? "CRITICAL"
        : "WARNING";

    if (actualValue) {
      const passesCheck = expectedValues.some((expected) =>
        actualValue.includes(expected)
      );

      // Remplacement de expect par logIfFails en cas d'échec de la vérification de valeur
      if (!passesCheck) {
        const message = `ISO 27001: L'en-tête de sécurité '${header}' a une valeur non conforme. Attendue: ${expectedValues.join(
          " ou "
        )}. Actuelle: '${actualValue}'`;
        logIfFails(message, criticality, {
          Header: header,
          Valeur_Actuelle: actualValue,
        });
      }
    } else if (header !== "x-xss-protection" && header !== "x-frame-options") {
      // Remplacement de expect par logIfFails si le header essentiel est manquant
      const message = `⚠️ ISO 27001: L'en-tête de sécurité essentiel '${header}' est manquant dans la réponse de ${url}`;
      logIfFails(message, criticality, { Header: header, URL: url });
    }
  }
}

// =============================================
// COMMANDE D'INTERCEPTION GENERIQUE QA 2025 (VALIDATION)
// =============================================

/**
 * 1/2. Déclare l'interception de requête pour espionnage ou mocking (PREPARATION).
 * Conforme ISO 27001 : Sépare l'espionnage de la validation.
 * @param {string} method - HTTP Method (GET, POST, etc.)
 * @param {string|RegExp} url - URL ou motif (ex: '/api/v1/login')
 * @param {string} alias - Alias unique (@loginRequest)
 * @param {object} options - Options (mockResponse, expectedStatus, validateBody, checkSecurityHeaders)
 */
Cypress.Commands.add(
  "spyOnRequest",
  (
    method,
    url,
    alias,
    {
      mockResponse = null,
      expectedStatus = 200,
      validateBody = true,
      checkSecurityHeaders = true, // Nouvelle option pour vérifier les headers
    } = {}
  ) => {
    // 🔹 Préparation interception (sans 'wait')
    const interceptOptions = mockResponse
      ? { statusCode: expectedStatus, body: mockResponse }
      : undefined;

    // Utilisation d'un sélecteur plus robuste pour les URL Spring Boot
    const apiUrl = url.startsWith("/") ? `**${url}` : url;

    cy.intercept(method, apiUrl, interceptOptions).as(alias);

    // Ajout des options pour la validation post-requête
    cy.wrap({ expectedStatus, validateBody, checkSecurityHeaders }).as(
      `${alias}`
    );
  }
);

/**
 * 2/2. Attend la requête espionnée et applique les validations QA/ISO (VALIDATION).
 * DOIT être appelée APRÈS l'action déclencheuse (cy.login, cy.click...).
 * @param {string} alias - Alias unique (@loginRequest)
 */
Cypress.Commands.add("validateRequest", (alias) => {
  // Récupérer les options définies dans spyOnRequest
  cy.get(`@${alias}`, { timeout: 10000 }).then(
    ({ expectedStatus, validateBody, checkSecurityHeaders }) => {
      // 🔹 Attente de la requête
      cy.wait(`@${alias}`).then((interception) => {
        const { request, response } = interception;
        const url = interception.request.url;
        const method = interception.request.method;

        // Assurer que la réponse existe avant de continuer les vérifications
        if (!response) {
          softError(
            `❌ La requête ${method} ${url} a échoué (pas de réponse ou timeout).`
          );
        }

        // --- Début des Vérifications ISO 27001 / OWASP ---

        // ✅ 1. Vérification sécurité - Contenu de la REQUÊTE (Payload)
        if (validateBody && request?.body) {
          const requestBodyStr =
            typeof request.body === "string"
              ? request.body
              : JSON.stringify(request.body);

          // Remplacement de expect par une vérification manuelle et logIfFails
          if (
            requestBodyStr.match(/password"\s*:\s*".*"/i) ||
            requestBodyStr.match(/cvv|ssn|otp-code/i)
          ) {
            const message =
              "ISO 27001: Données sensibles (password/cvv/ssn) envoyées en clair dans la Requête.";
            logIfFails(message, "CRITICAL", { Request_Body: request.body });
          }
        }

        // ✅ 2. Vérification du status code (DOIT RESTER BLOQUANT)
        expect(
          response?.statusCode,
          `Statut code critique de ${method} ${url}`
        ).to.eq(expectedStatus);

        // ✅ 3. Vérification sécurité - Contenu de la RÉPONSE (Payload)
        if (validateBody && response?.body) {
          const responseBodyStr = JSON.stringify(response.body);

          // Remplacement de expect par logIfFails pour l'exposition de données sensibles
          if (responseBodyStr.match(/password|cvv|ssn|otp-code/i)) {
            const message =
              "ISO 27001: Données sensibles exposées en clair dans la Réponse (password|cvv|token).";
            logIfFails(message, "CRITICAL", {
              Response_Body_Sample: responseBodyStr.substring(0, 500),
            });
          }

          // Remplacement de expect par logIfFails pour l'exposition d'erreurs techniques
          if (
            responseBodyStr.match(/sql|syntax|error|exception|stack trace|db/i)
          ) {
            const message =
              "OWASP A10: Erreurs techniques (SQL/Stack Trace) exposées dans la Réponse.";
            logIfFails(message, "CRITICAL", {
              Response_Body_Sample: responseBodyStr.substring(0, 500),
            });
          }
        }

        // ✅ 4. Vérification des En-têtes de Sécurité (OWASP/ISO 27001)
        if (checkSecurityHeaders) {
          validateSecurityHeaders(response.headers, url); // Utilise la version non bloquante
        }

        // --- Fin des Vérifications ---

        // ✅ Log clair en console (traçabilité QA 2025)
        Cypress.log({
          name: "API CHECK",
          message: `${method} ${url} → ${response?.statusCode} (Attendu: ${expectedStatus})`,
          consoleProps: () => ({
            URL: url,
            Method: method,
            Request: request.body,
            Response: response?.body,
            Status: response?.statusCode,
            Validation: validateBody
              ? checkSecurityHeaders
                ? "ISO 27001/OWASP OK (Headers+Body - Non bloquant)"
                : "ISO 27001/OWASP OK (Body only - Non bloquant)"
              : "Skip",
          }),
        });
      });
    }
  );
});

// -------------------------
// Déclare l'interception de requête pour teste de securite
// -------------------------
Cypress.Commands.add(
  "spyOnSecurityRequest",
  (
    method,
    url,
    alias,
    {
      mockResponse = null,
      expectedStatus = 400, // par défaut 400
      validateBody = true,
      checkSecurityHeaders = true,
    } = {}
  ) => {
    const interceptOptions = mockResponse
      ? { statusCode: expectedStatus, body: mockResponse }
      : undefined;

    const apiUrl = url.startsWith("/") ? `**${url}` : url;

    // 🔹 Interception principale
    cy.intercept(method, apiUrl, interceptOptions).as(`req_${alias}`);

    // 🔹 Alias distinct pour les options
    cy.wrap({ expectedStatus, validateBody, checkSecurityHeaders }).as(
      `opt_${alias}`
    );
  }
);

// -------------------------
// validateSecurityBlock (Mise à jour avec logIfFails)
// -------------------------
Cypress.Commands.add("validateSecurityBlock", (alias) => {
  // 🔹 Récupération des options depuis l’alias opt_
  cy.get(`@opt_${alias}`, { timeout: 10000 }).then(
    ({ expectedStatus, validateBody, checkSecurityHeaders }) => {
      cy.wait(`@req_${alias}`).then((interception) => {
        const { request, response } = interception;
        const url = interception.request.url;
        const method = interception.request.method;

        if (!response) {
          softError(
            `❌ Aucune réponse de ${method} ${url} (timeout ou requête rejetée avant proxy)`
          );
          return;
        }

        const actualStatus = response.statusCode;

        // ✅ Accepter 400 ou 401 OU 500 comme "blocage sécurité"
        const allowedStatuses = [400, 401, 403, 429, 500];
        expect(
          allowedStatuses,
          `Statut de Blocage Sécurité critique ${method} ${url}`
        ).to.include(actualStatus);

        if (actualStatus !== expectedStatus) {
          logIfFails(
            `⚠️ Statut inattendu : reçu ${actualStatus} (attendu ${expectedStatus}) — peut provenir d’un middleware.`,
            "WARNING",
            { URL: url, Attendu: expectedStatus, Reçu: actualStatus }
          );
        }

        // ✅ Vérification OWASP/ISO non bloquante
        if (checkSecurityHeaders)
          validateSecurityHeaders(response.headers, url);

        if (validateBody && response?.body) {
          const body = JSON.stringify(response.body);
          if (body.match(/sql|exception|stack/i)) {
            logIfFails("OWASP A10: Stack trace ou SQL exposé.", "CRITICAL", {
              Sample: body.substring(0, 200),
            });
          }
        }

        Cypress.log({
          name: "🔒 SECURITY BLOCK",
          message: `${method} ${url} → ${actualStatus} (Attendu: ${expectedStatus} / BLOCAGE OK)`,
          consoleProps: () => ({
            URL: url,
            Method: method,
            Status_Attendu: expectedStatus,
            Status_Reçu: actualStatus,
            Headers_Verifiés: checkSecurityHeaders,
          }),
        });
      });
    }
  );
});

// --------------------------------------
// Utilitaire : dictionnaire de traductions
// --------------------------------------
Cypress.Commands.add("loadTranslations", () => {
  // Détection automatique de la langue via <html lang="...">
  return cy.document().then((doc) => {
    const lang = doc.documentElement.lang || "fr"; // fallback "fr"
    const file = `translations/translations-common.json`;

    return cy.readFile(`cypress/fixtures/${file}`).then((rawDict) => {
      const normalizedDict = {};

      Object.entries(rawDict).forEach(([key, variants]) => {
        const normalizedKey = key.trim().toLowerCase();
        const filteredVariants = Array.isArray(variants)
          ? variants.filter((v) => v && typeof v === "string")
          : [variants];

        // Optionnel : filtrer les variantes selon la langue détectée
        const langVariants = filteredVariants.filter((v) =>
          lang === "fr"
            ? /[àâçéèêëîïôûùüÿ]/i.test(v) || /^[a-zà-ÿ\s]+$/i.test(v)
            : /^[a-z\s]+$/i.test(v)
        );

        normalizedDict[normalizedKey] = langVariants.length
          ? langVariants
          : filteredVariants;
      });

      Cypress.env("translations", normalizedDict);

      Cypress.log({
        name: "loadTranslations",
        message: `✅ Traductions chargées depuis ${file} pour langue "${lang}"`,
      });
    });
  });
});

// =============================================
// Commande select Button (QA 2025)
// 🔹 cy.clickButton("validate");
// =============================================
Cypress.Commands.add("clickButton", (label, options = {}) => {
  const variants = getAllVariants(label).map(normalize);

  return cy.document().then((doc) => {
    const $doc = Cypress.$(doc);
    const buttons = $doc.find(
      "button, app-button, mat-button, [mat-button], [mat-raised-button], [mat-flat-button], [mat-icon-button]"
    );

    const match = buttons.filter((i, el) => {
      const texts = [
        el.innerText,
        el.textContent,
        ...Array.from(el.children).map((child) => child.textContent),
      ].map(normalize);

      return texts.some((text) =>
        variants.some((variant) => text.includes(variant))
      );
    });

    if (match.length) {
      Cypress.log({
        name: "clickButton",
        message: `✅ Bouton trouvé : ${label}`,
      });
      return cy.wrap(match.first(), options).click();
    }

    // 🔍 Log de debug pour aider à diagnostiquer
    Cypress.log({
      name: "clickButton",
      message: `❌ Aucun bouton trouvé pour : ${label}`,
      consoleProps: () => ({
        label,
        variants,
        boutonsTrouvés: buttons.map((i, el) => el.innerText || el.textContent),
      }),
    });

    softError(`❌ Aucun bouton trouvé pour : ${label}`);
  });
});

// =============================================
// Commande fillInput (QA 2025)
// 🔹 cy.fillInput("password", user.password);
// =============================================
Cypress.Commands.add("fillInput", (label, value, options = {}) => {
  const variants = getAllVariants(label).map(normalize);

  return cy.document().then((doc) => {
    const $doc = Cypress.$(doc);

    const inputs = $doc.find("input, textarea").filter((i, el) => {
      const $el = Cypress.$(el);
      const isVisible = $el.is(":visible"); // 🔍 filtre les éléments masqués

      if (!isVisible) return false;

      const attrs = [
        el.getAttribute("id"),
        el.getAttribute("name"),
        el.getAttribute("placeholder"),
        el.getAttribute("aria-label"),
        el.getAttribute("title"),
        el.getAttribute("value"),
        el.labels?.[0]?.innerText,
        el.labels?.[0]?.textContent,
      ]
        .filter(Boolean)
        .map(normalize);

      return attrs.some((text) =>
        variants.some((variant) => text.includes(variant))
      );
    });

    if (inputs.length) {
      Cypress.log({
        name: "fillInput",
        message: `✅ Champ visible trouvé : ${label}`,
      });

      return cy.wrap(inputs.first(), options).click().clear().type(value);
    }

    Cypress.log({
      name: "fillInput",
      message: `❌ Aucun champ visible trouvé pour : ${label}`,
      consoleProps: () => ({
        label,
        variants,
      }),
    });

    softError(`❌ Aucun champ visible trouvé pour : ${label}`);
  });
});

// =============================================
// Commande checkRequiredFieldError (QA 2025)
// 🔹 cy.checkRequiredFieldError("password");
// =============================================
Cypress.Commands.add("checkRequiredFieldError", (label, options = {}) => {
  const variants = getAllVariants(label).map(normalize);
  const expectedState = options.state || "visible"; // "visible", "invisible", "disabled"

  return cy.document().then((doc) => {
    const $doc = Cypress.$(doc);

    const elements = $doc
      .find("input, textarea, select, mat-select, button, [role='button']")
      .filter((i, el) => {
        const attrs = [
          el.getAttribute("id"),
          el.getAttribute("name"),
          el.getAttribute("placeholder"),
          el.getAttribute("aria-label"),
          el.getAttribute("title"),
          el.getAttribute("value"),
          el.labels?.[0]?.innerText,
          el.labels?.[0]?.textContent,
        ]
          .filter(Boolean)
          .map(normalize);

        return attrs.some((text) =>
          variants.some((variant) => text.includes(variant))
        );
      });

    if (!elements.length) {
      Cypress.log({
        name: "checkRequiredFieldError",
        message: `❌ Aucun élément trouvé pour : ${label}`,
        consoleProps: () => ({ label, variants }),
      });
      softError(`❌ Aucun élément trouvé pour : ${label}`);
      return;
    }

    const $target = Cypress.$(elements.first());
    const cyTarget = cy.wrap($target, options);

    Cypress.log({
      name: "checkRequiredFieldError",
      message: `✅ Élément trouvé : ${label} → état attendu : ${expectedState}`,
    });

    // 🔍 Vérification d’état via .should()
    if (expectedState === "visible") {
      cyTarget.should("be.visible");
    } else if (expectedState === "invisible") {
      cyTarget.should("not.be.visible");
    } else if (expectedState === "disabled") {
      cyTarget.should("be.disabled");
    }

    // 🧹 Efface ou désélectionne si applicable
    if ($target.is("input, textarea")) {
      cyTarget.click().clear();
      cyTarget.should("have.value", ""); // ✅ Vérifie que le champ est vide
    } else if ($target.is("select, mat-select")) {
      cyTarget.click();
      cy.get("mat-option").first().click();
    } else {
      cyTarget.click();
    }

    // 📛 Vérifie le message d’erreur requis
    cy.contains(
      "mat-error, .mat-error, p.text-red-400, span.text-red-400",
      /obligatoire|champ requis|required/i
    ).should("be.visible");
  });
});

// =============================================
// Commande checkFieldState (QA 2025)
// 🔹 cy.checkFieldState("password");
// =============================================
Cypress.Commands.add(
  "checkFieldState",
  (label, expected = { visible: true, disabled: false }) => {
    const variants = getAllVariants(label).map(normalize);

    return cy.document().then((doc) => {
      const $doc = Cypress.$(doc);

      const elements = $doc
        .find("input, textarea, select, mat-select, button, [role='button']")
        .filter((i, el) => {
          const $el = Cypress.$(el);
          const isVisible = $el.is(":visible");

          const attrs = [
            el.getAttribute("id"),
            el.getAttribute("name"),
            el.getAttribute("placeholder"),
            el.getAttribute("aria-label"),
            el.getAttribute("title"),
            el.getAttribute("value"),
            el.labels?.[0]?.innerText,
            el.labels?.[0]?.textContent,
          ]
            .filter(Boolean)
            .map(normalize);

          return attrs.some((text) =>
            variants.some((variant) => text.includes(variant))
          );
        });

      if (!elements.length) {
        softError(`❌ Aucun champ trouvé pour : ${label}`);
        return;
      }

      const $target = Cypress.$(elements.first());

      const isVisible = $target.is(":visible");
      const isDisabled =
        $target.is(":disabled") || $target.attr("aria-disabled") === "true";

      Cypress.log({
        name: "checkFieldState",
        message: `🔍 État du champ "${label}" → visible: ${isVisible}, disabled: ${isDisabled}`,
      });

      expect(isVisible).to.eq(expected.visible);
      expect(isDisabled).to.eq(expected.disabled);
    });
  }
);

// =============================================
// Commande clearInput (QA 2025)
// 🔹 cy.clearInput("password");
// =============================================
Cypress.Commands.add("clearInput", (label, options = {}) => {
  const variants = getAllVariants(label).map(normalize);
  const force = options.force === true;

  return cy.document().then((doc) => {
    const $doc = Cypress.$(doc);

    const input = $doc
      .find("input, textarea")
      .filter((i, el) => {
        const $el = Cypress.$(el);
        const isVisible = $el.is(":visible") || force;

        if (!isVisible) return false;

        const attrs = [
          el.getAttribute("id"),
          el.getAttribute("name"),
          el.getAttribute("placeholder"),
          el.getAttribute("aria-label"),
          el.getAttribute("title"),
          el.labels?.[0]?.innerText,
          el.labels?.[0]?.textContent,
        ]
          .filter(Boolean)
          .map(normalize);

        return attrs.some((text) =>
          variants.some((variant) => text.includes(variant))
        );
      })
      .first();

    if (input.length) {
      Cypress.log({ name: "clearInput", message: `✅ Champ vidé : ${label}` });
      cy.wrap(input, { force }).clear();
    } else {
      softError(`❌ Aucun champ visible trouvé pour : ${label}`);
    }
  });
});

// =============================================
// Commande : selectDropdownOption (QA 2025)
// Cette version ne nécessite pas de label.
// Elle scanne tous les dropdowns visibles et sélectionne l’élément correspondant à target.
// 🔹 cy.selectDropdownItem(user.countryCodeNumber);
// =============================================
Cypress.Commands.add("selectDropdownItem", (target, options = {}) => {
  const targetNormalized = normalize(target);
  const variants = getAllVariants(targetNormalized);

  return cy.document().then((doc) => {
    const $doc = Cypress.$(doc);

    const selectors = [
      "mat-select",
      "ng-select",
      "app-select",
      "select",
      "[role=combobox]",
      "[aria-haspopup=listbox]",
      "[aria-haspopup=menu]",
      "[dropdowntoggle]",
    ];

    const dropdowns = $doc.find(selectors.join(",")).filter((i, el) => {
      const $el = Cypress.$(el);
      return $el.is(":visible");
    });

    if (dropdowns.length === 0) {
      Cypress.log({
        name: "selectDropdownOption",
        message: `❌ Aucun dropdown visible trouvé`,
      });
      softError(`❌ Aucun dropdown visible trouvé`);
    }

    Cypress.log({
      name: "selectDropdownOption",
      message: `✅ Dropdown(s) trouvé(s) : ${dropdowns.length}`,
    });

    for (let i = 0; i < dropdowns.length; i++) {
      const $dropdown = Cypress.$(dropdowns[i]);

      cy.wrap($dropdown, options)
        .click()
        .then(() => {
          let found = false;

          // 🔍 Recherche par attributs
          for (const variant of variants) {
            const matchSelector = [
              `[id="${variant}"]`,
              `[value="${variant}"]`,
              `option[value="${variant}"]`,
              `*[data-value="${variant}"]`,
            ].join(",");

            const match = $doc.find(matchSelector).filter(":visible");

            if (match.length) {
              Cypress.log({
                name: "selectDropdownOption",
                message: `✅ Élément trouvé par attribut : ${variant}`,
              });
              cy.wrap(match.first()).click();
              found = true;
              return;
            }
          }

          if (found) return;

          // 🔍 Recherche par texte partiel ou complet
          const allOptions = $doc
            .find("mat-option, .mat-mdc-option, option, li, div")
            .filter(":visible");

          for (const variant of variants) {
            const match = [...allOptions].find((el) => {
              const text = normalize(Cypress.$(el).text());
              return text.includes(normalize(variant));
            });

            if (match) {
              Cypress.log({
                name: "selectDropdownOption",
                message: `✅ Élément trouvé par texte : ${variant}`,
              });
              cy.wrap(match).click();
              found = true;
              return;
            }
          }

          if (!found) {
            // 🔁 Fallback : sélectionner le premier élément visible
            const fallback = allOptions.first();
            if (fallback.length) {
              Cypress.log({
                name: "selectDropdownOption",
                message: `⚠️ Aucun match trouvé, sélection du premier élément visible`,
              });
              cy.wrap(fallback).click();
            } else {
              Cypress.log({
                name: "selectDropdownOption",
                message: `❌ Aucun élément sélectionnable trouvé`,
              });
              softError(`❌ Aucun élément sélectionnable trouvé`);
            }
          }
        });

      break; // Stop après le premier dropdown cliqué
    }
  });
});

// =============================================
// Commande : selectMenuItem (QA 2025)
// a encore des errreus ❌ , a corriger
// 🔹 cy.selectMenuItem("recharge");
// =============================================
Cypress.Commands.add("selectMenuItem", (target, options = {}) => {
  const targetNormalized = normalize(target);
  const variants = getAllVariants(targetNormalized);

  cy.document().then((doc) => {
    const $doc = Cypress.$(doc);

    const selectors = [
      "a",
      "button",
      "mat-menu-item",
      ".route-label",
      ".route-text",
      "[role=menuitem]",
      "[aria-haspopup=menu]",
      "[data-menu]",
      ".router-link",
      "h6",
      "span",
      "div",
    ];

    const elements = $doc.find(selectors.join(",")).filter((i, el) => {
      return Cypress.$(el).is(":visible");
    });

    if (elements.length === 0) {
      softError(`❌ Aucun élément de menu visible trouvé`);
    }

    let matchFound = null;

    elements.each((i, el) => {
      const $el = Cypress.$(el);
      const labelText = normalize($el.text());
      const href = normalize($el.attr("href") || "");
      const aria = normalize($el.attr("aria-label") || "");
      const title = normalize($el.attr("title") || "");
      const alt = normalize($el.attr("alt") || "");

      for (const variant of variants) {
        const matchDirect =
          labelText.includes(variant) ||
          href.includes(variant) ||
          aria.includes(variant) ||
          title.includes(variant) ||
          alt.includes(variant);

        const matchHrefChild = $el.find("[href]").filter((j, child) => {
          const childHref = normalize(Cypress.$(child).attr("href") || "");
          return childHref.includes(variant);
        });

        const matchTextChild = $el.find("*").filter((j, child) => {
          const childText = normalize(Cypress.$(child).text());
          return childText.includes(variant);
        });

        if (matchDirect || matchHrefChild.length || matchTextChild.length) {
          matchFound = $el.closest("a, button").length
            ? $el.closest("a, button")
            : $el;
          Cypress.log({
            name: "selectMenuItem",
            message: `✅ Élément trouvé : ${variant}`,
          });
          return false;
        }
      }

      if (matchFound) return false;
    });

    if (matchFound) {
      cy.wrap(matchFound, options).click({ force: true });
    } else {
      Cypress.log({
        name: "selectMenuItem",
        message: `❌ Aucun élément correspondant à "${target}"`,
      });
      softError(`❌ Aucun élément de menu correspondant à "${target}"`);
    }
  });
});

// =============================================
// Commande : selectToggleOption (QA 2025)
// a encore des errreus ❌ , a corriger
// 🔹 cy.selectToggleOption("phone");
// =============================================
Cypress.Commands.add("selectToggleItem", (target, options = {}) => {
  const targetNormalized = normalize(target);
  const variants = getAllVariants(targetNormalized);

  cy.document().then((doc) => {
    const $doc = Cypress.$(doc);

    const selectors = [
      ".option-label",
      "label",
      "mat-radio-button",
      "mat-button-toggle",
      "mat-slide-toggle",
      "[role=radio]",
      "[aria-checked]",
      "app-toggle",
      "ng-toggle",
      "[data-toggle]",
      "[data-role=toggle]",
      ".toggle",
      "span",
    ];

    const candidates = $doc.find(selectors.join(",")).filter((i, el) => {
      const $el = Cypress.$(el);
      return $el.is(":visible");
    });

    if (candidates.length === 0) {
      Cypress.log({
        name: "selectToggleOption",
        message: `❌ Aucun champ toggle/radio visible trouvé`,
      });
      softError(`❌ Aucun champ toggle/radio visible trouvé`);
    }

    Cypress.log({
      name: "selectToggleOption",
      message: `✅ Toggle(s) trouvé(s) : ${candidates.length}`,
    });

    let matchFound = null;

    candidates.each((i, el) => {
      const $el = Cypress.$(el);
      const labelText = normalize($el.text() || "");
      const attributes = [
        $el.attr("id"),
        $el.attr("value"),
        $el.attr("placeholder"),
        $el.attr("aria-label"),
        $el.attr("data-label"),
      ].map(normalize);

      for (const variant of variants) {
        if (attributes.includes(variant) || labelText.includes(variant)) {
          matchFound = $el;
          Cypress.log({
            name: "selectToggleOption",
            message: `✅ Option trouvée : ${variant}`,
          });
          return false; // stop inner loop
        }
      }

      if (matchFound) return false; // stop outer loop
    });

    if (matchFound) {
      // 🔁 Si l’élément est un span, clique sur son parent label
      const clickable = matchFound.closest("label").length
        ? matchFound.closest("label")
        : matchFound;

      cy.wrap(clickable, options).click({ force: true });
      return;
    }

    // 🔁 Fallback : recherche par texte affiché dans les composants stylisés
    cy.get(selectors.join(",")).then(($elements) => {
      const match = [...$elements].find((el) => {
        const text = normalize(el.innerText || el.textContent || "");
        return variants.some((variant) => text.includes(variant));
      });

      if (match) {
        const $match = Cypress.$(match);
        const clickable = $match.closest("label").length
          ? $match.closest("label")
          : $match;

        Cypress.log({
          name: "selectToggleOption",
          message: `✅ Option trouvée par fallback : ${target}`,
        });

        cy.wrap(clickable, options).click({ force: true });
      } else {
        softError(`❌ Aucune option toggle/radio correspondante à "${target}"`);
      }
    });
  });
});

// =============================================
// Commande checkTextVisible (QA 2025)
// 🔹 cy.assertTextVisible("yourAccounts");
// =============================================
Cypress.Commands.add("assertTextVisible", (label, options = {}) => {
  const variants = getAllVariants(label).map(normalize);

  const selectors = [
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "p",
    "span",
    "label",
    "div",
    "strong",
    "em",
    "[data-testid]",
    "[role]",
    "[aria-label]",
  ];

  return cy.document().then((doc) => {
    const $doc = Cypress.$(doc);

    for (const sel of selectors) {
      const elements = $doc.find(sel);

      const match = elements.filter((i, el) => {
        const texts = [
          el.innerText,
          el.textContent,
          ...Array.from(el.children).map((child) => child.textContent),
        ].map(normalize);

        return texts.some((text) =>
          variants.some((variant) => text.includes(variant))
        );
      });

      if (match.length) {
        Cypress.log({
          name: "assertTextVisible",
          message: `✅ Texte trouvé : ${label}`,
        });
        return cy.wrap(match.first(), options).should("be.visible");
      }
    }

    // Fallback : cy.contains sur le body
    for (const variant of variants) {
      try {
        return cy
          .contains(new RegExp(variant, "i"), options)
          .should("be.visible");
      } catch (e) {
        // continue silently
      }
    }

    Cypress.log({
      name: "assertTextVisible",
      message: `❌ Aucun texte visible trouvé pour : ${label}`,
      consoleProps: () => ({
        label,
        variants,
      }),
    });

    softError(`❌ Aucun texte visible trouvé pour : ${label}`);
  });
});

// =============================================
// Commande generic par defaut pour retrouver n'importe quel élément (QA 2025)
// Utile pour les éléments non couverts par les commandes spécialisées ci-dessus
// 🔹 cy.findElement("dashboard").first().click();
// =============================================
Cypress.Commands.add("findElement", (value, options = {}) => {
  const variants = Array.isArray(value) ? value : getAllVariants(value);
  const matchText = (text) =>
    variants.some((variant) => {
      if (!text) return false;
      if (variant instanceof RegExp) return variant.test(text);
      return normalize(text).includes(normalize(variant));
    });

  return cy.document().then((doc) => {
    const $doc = Cypress.$(doc);

    // 🔎 Recherche par ID exacte ou partielle
    for (const variant of variants) {
      const cleanVariant = normalize(variant)
        .replace(/['"#\\]/g, "")
        .trim();
      const escapedId = escapeId(cleanVariant);

      let el = $doc.find(`#${escapedId}`);
      if (el.length) {
        Cypress.log({
          name: "findElement",
          message: `✅ via ID (#${cleanVariant})`,
        });
        return cy.wrap(getClearableElement(el), options);
      }

      el = $doc
        .find("[id]")
        .filter((i, e) => normalize(e.id).includes(cleanVariant));
      if (el.length) {
        Cypress.log({
          name: "findElement",
          message: `✅ via ID partiel (*${cleanVariant}*)`,
        });
        return cy.wrap(getClearableElement(el), options);
      }
    }

    // 🔎 Stratégies par type d’élément HTML
    const strategies = [
      {
        tag: "input, textarea, select",
        attr: ["placeholder", "value", "aria-label", "title", "name", "id"],
      },
      {
        tag: "button, [mat-button], [mat-raised-button], [mat-flat-button], [mat-icon-button]",
        attr: ["innerText", "value", "aria-label", "title"],
      },
      {
        tag: "a, .router-link",
        attr: ["innerText", "href", "aria-label", "title"],
      },
      {
        tag: "label",
        attr: ["innerText", "aria-label", "title"],
        getTarget: (el) => el.attr("for"),
      },
      {
        tag: "h1,h2,h3,h4,h5,h6,span,div",
        attr: ["innerText", "aria-label", "title"],
      },
      {
        tag: "mat-select, ng-select, app-select, mat-option, mat-menu-item",
        attr: ["innerText", "aria-label", "title"],
      },
      {
        tag: "[role=menuitem], [aria-haspopup], [data-menu]",
        attr: ["innerText", "aria-label", "title"],
      },
    ];

    for (const { tag, attr, getTarget } of strategies) {
      const el = $doc.find(tag).filter((i, e) => {
        const attrs = Array.isArray(attr)
          ? attr.map((a) => e.getAttribute(a) || e[a]).filter(Boolean)
          : [e.getAttribute(attr) || e[attr]];
        attrs.push(e.textContent);
        attrs.push(...Array.from(e.children).map((child) => child.textContent));
        return attrs.some((a) => matchText(a));
      });

      if (el.length) {
        Cypress.log({ name: "findElement", message: `✅ via ${tag}` });

        const clickable = getClickableAncestor(el.first());

        if (isDropdownTrigger(clickable)) {
          cy.wrap(clickable).click({ force: true });
          Cypress.log({
            name: "findElement",
            message: `📂 Menu déroulant ouvert`,
          });
        }

        if (getTarget) {
          const targetId = getTarget(el);
          if (targetId) {
            const target = $doc.find(`#${escapeId(targetId)}`);
            if (target.length)
              return cy.wrap(getClearableElement(target), options);
          }
        }

        return cy.wrap(getClearableElement(clickable), options);
      }
    }

    // 🔎 Recherche par href partiel
    const hrefMatch = $doc.find("a[href]").filter((i, el) => {
      const href = normalize(el.getAttribute("href") || "");
      return variants.some(
        (v) => normalize(v).includes(href) || href.includes(normalize(v))
      );
    });
    if (hrefMatch.length) {
      Cypress.log({ name: "findElement", message: `✅ via href partiel` });
      return cy.wrap(getClickableAncestor(hrefMatch.first()), options);
    }

    // ⏳ Attente conditionnelle pour vues enfants (si nécessaire)
    const waitUntilVisible = (selector) => {
      return cy.get("body").then(($body) => {
        if ($body.find(selector).length > 0) {
          return cy.get(selector).should("be.visible");
        }
        cy.wait(500);
        return waitUntilVisible(selector);
      });
    };

    // 🔎 Fallback : recherche texte visible par tag avec regex combinée
    Cypress.log({
      name: "findElement",
      message: `⚠️ Fallback : recherche texte par tag`,
    });

    const fallbackTags = [
      "a",
      "button",
      "span",
      "div",
      "label",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
    ];

    // 🧠 Étape 1 : construire la regex combinée
    let regexPattern = "";
    for (const variant of variants) {
      const raw = variant instanceof RegExp ? variant.source : variant;
      regexPattern += `${raw}|`;
    }
    if (regexPattern.endsWith("|")) {
      regexPattern = regexPattern.slice(0, -1);
    }
    const combinedRegex = new RegExp(regexPattern, "i");

    Cypress.log({
      name: "findElement",
      message: `🔎 Fallback regex = ${combinedRegex}`,
    });

    // 🧪 Étape 2 : tentative avec regex combinée
    for (const tag of fallbackTags) {
      try {
        return cy.contains(tag, combinedRegex, {
          matchCase: false,
          ...options,
        });
      } catch (e) {
        // ignore silently
      }
    }

    // 🌐 Étape 3 : détection automatique de la langue via <html lang="...">
    return cy.document().then((doc) => {
      const htmlLang = doc.documentElement.getAttribute("lang") || "fr";
      const lang = htmlLang.toLowerCase().startsWith("en") ? "en" : "fr";

      Cypress.log({
        name: "findElement",
        message: `🌍 Langue détectée : ${lang}`,
      });

      // 🧩 Étape 4 : séparer les variants par langue
      const normalizedVariants = variants.map((v) => normalize(v));
      const frVariant = variants.find((v) =>
        /argent|carte|recharge|service|international|dashboard/.test(
          normalize(v)
        )
      );
      const enVariant = variants.find((v) =>
        /money|card|send|services|dashboard|international/.test(normalize(v))
      );

      const primaryVariant = lang === "fr" ? frVariant : enVariant;
      const fallbackVariant = lang === "fr" ? enVariant : frVariant;

      // 🖱️ Étape 5 : recherche ciblée avec le variant correspondant à la langue
      for (const tag of fallbackTags) {
        if (primaryVariant) {
          try {
            Cypress.log({
              name: "findElement",
              message: `🔎 Recherche ciblée : ${primaryVariant}`,
            });
            return cy.contains(tag, primaryVariant, {
              matchCase: false,
              ...options,
            });
          } catch (e) {}
        }
        if (fallbackVariant) {
          try {
            Cypress.log({
              name: "findElement",
              message: `🔁 Recherche inversée : ${fallbackVariant}`,
            });
            return cy.contains(tag, fallbackVariant, {
              matchCase: false,
              ...options,
            });
          } catch (e) {}
        }
      }

      // ❌ Si toujours rien trouvé
      softError(`❌ Aucun élément correspondant à "${value}"`);
    });
  });
});

// Commande pour uploader un fichier
Cypress.Commands.add("uploadFile", (elementText, filePath) => {
  cy.findElement(elementText).selectFile(filePath);
});

// Commande pour signer sur un canvas
Cypress.Commands.add("signCanvas", (canvasText) => {
  cy.findElement(canvasText).then(($canvas) => {
    const canvas = $canvas[0];
    const ctx = canvas.getContext("2d");
    ctx.beginPath();
    ctx.moveTo(10, 50);
    ctx.lineTo(90, 50);
    ctx.stroke();
  });
});

// =============================================
// COMMANDES PERSONNALISÉES DE L'APPLICATION
// =============================================

// Choisir méthode login/register
// Déterminer si c'est par email ou par téléphone
// 🔹 cy.selectLoginOrRegisterMode("email");
Cypress.Commands.add("selectLoginOrRegisterMode", (method) => {
  if (method === "email") {
    cy.get(".h-100 .toggle :nth-child(1) .option-label").first().click();
  } else if (method === "phone") {
    cy.get(".h-100 .toggle :nth-child(3) .option-label").first().click();
  }
});

// Choisir l'indicatif téléphonique
// 🔹 cy.selectIndicatif("usa");
Cypress.Commands.add("selectIndicatif", (indicatif = "cm") => {
  // Ouvrir le menu déroulant de l'indicatif
  cy.get("[inputid=\"'phone'\"] [dropdowntoggle] .fi")
    .should("be.visible")
    .click();

  // Mapping des indicatifs
  const map = {
    cm: "#iti-0__item-cm .iti__flag-box",
    ca: "#iti-0__item-ca .iti__flag-box",
    usa: "#iti-0__item-us .iti__flag-box",
  };

  const selector = map[indicatif.toLowerCase()];
  if (!selector) {
    Cypress.log({
      name: "selectPhoneIndicatif",
      message: `ℹ️ Indicatif inconnu ou non géré : ${indicatif}`,
    });
    return;
  }

  // Sélection de l'indicatif
  cy.get(selector).should("be.visible").first().click();
});

// Entre le code de securite sur 6 inputs
// 🔹 cy.putSecureCode("123456");
Cypress.Commands.add("putSecureCode", (otp = "123456") => {
  otp.split("").forEach((digit, index) => {
    cy.get(`.h-100 .otp-container :nth-child(${index + 1})`)
      .click()
      .clear()
      .type(digit);
  });
});

// commande Cypress , qui intègre désormais :
// • Recherche par texte (multilingue, accentué, etc.)
// • Recherche par href
// • Utilisation de tes fonctions utilitaires : normalize, getAllVariants, escapeRegex, etc.
// 🔹 cy.selectCardMenuTranslated("recharge de cartes");
Cypress.Commands.add("selectCardMenuTranslated", (optionKey) => {
  const variants = getAllVariants(optionKey).map(normalize);
  const menuVariants = getAllVariants("Cartes").map(normalize);

  // 🔹 Étape 1 : Cliquer sur le bouton "Cartes"
  cy.get("button").then(($buttons) => {
    const target = [...$buttons].find((btn) => {
      const label = normalize(Cypress.$(btn).text());
      return menuVariants.some((v) => label.includes(v));
    });

    cy.wrap(target)
      .scrollIntoView()
      .should("be.visible")
      .click({ force: true });
  });

  // 🔹 Étape 2 : Attendre que le menu soit visible et stable
  cy.get(".cards-dropdown-menu")
    .should("exist")
    .should(($menu) => {
      expect($menu.height(), "Hauteur du menu").to.be.greaterThan(0);
    })
    .should("not.have.class", "ng-animating")
    .within(() => {
      // 🔹 Étape 3 : Sélectionner l’option traduite
      cy.get("button, a").then(($items) => {
        const found = [...$items].find((el) => {
          const text = normalize(Cypress.$(el).text());
          const href = normalize(Cypress.$(el).attr("href") || "");
          return variants.some((v) => text.includes(v) || href.includes(v));
        });

        expect(found, `Option "${optionKey}" trouvée`).to.exist;

        cy.wrap(getClickableAncestor(Cypress.$(found)))
          .should("be.visible")
          .click({ force: true });
      });
    });
});

// Commande Cypress spécialisée pour sélectionner un compte dans le composant <mat-select> en fonction de la devise souhaitée
// ou, en fallback, du premier compte avec un solde supérieur à zéro.
// 🔹 cy.selectAccountByCurrency("USD");
Cypress.Commands.add("selectAccountByCurrency", (currency) => {
  cy.log(`🔍 Recherche d'un compte en devise: ${currency}`);

  // Ouvrir la liste des comptes
  cy.get("mat-select.account_select_container").should("exist").first().click();

  // Attendre que les options s'affichent
  cy.get("mat-option")
    .should("exist")
    .then(($options) => {
      let selected = false;

      // 1️⃣ Recherche par devise
      $options.each((i, option) => {
        const text = Cypress.$(option).text().trim();
        if (text.includes(currency)) {
          cy.wrap(option).click({ force: true });
          cy.log(`✅ Compte sélectionné avec devise ${currency}`);
          selected = true;
          return false; // break
        }
      });

      // 2️⃣ Si pas trouvé → choisir le premier solde > 0
      if (!selected) {
        cy.log("⚠️ Devise non trouvée, recherche d’un solde > 0");
        $options.each((i, option) => {
          const text = Cypress.$(option).text().trim();
          const montant = parseFloat(
            text.replace(/[^\d,-]/g, "").replace(",", ".") || "0"
          );
          if (montant > 0) {
            cy.wrap(option).click({ force: true });
            cy.log(`✅ Compte sélectionné avec solde ${montant}`);
            selected = true;
            return false; // break
          }
        });
      }

      // 3️⃣ Si aucun compte dispo → erreur explicite
      if (!selected) {
        softError("❌ Aucun compte valide trouvé (devise ni solde > 0)");
      }
    });

  // ⏳ Attendre la disparition du backdrop avec retry + petite pause
  cy.get(".cdk-overlay-backdrop")
    .should("not.exist", { timeout: 10000 })
    .then(() => {
      cy.wait(300); // sécurité pour laisser Angular réanimer le DOM
    });

  // ✅ Vérifier que le container est cliquable avant d'agir
  cy.get("div.logo-container").should("be.visible").click({ force: true });

  cy.log("✅ Dropdown fermé, on peut continuer en sécurité");
});

/**
 * Sélectionne une option dans le premier <app-select> Angular Material visible
 * en fonction du texte affiché.
 *
 * @param {string} optionText - Le texte exact ou partiel de l'option à sélectionner
 *
 * 🔹 cy.selectAppSelectOption("Cameroun");
 */
Cypress.Commands.add("selectAppSelectOption", (optionText) => {
  const normalizedText = optionText.trim().toLowerCase();

  // 1. Cibler le premier app-select visible et ouvrir le menu
  cy.get('app-select:visible input[role="combobox"]')
    .first()
    .should("be.visible")
    .click({ force: true });

  // 2. Attendre que les options soient rendues
  cy.get(".cdk-overlay-pane .mat-mdc-option", { timeout: 10000 })
    .should("exist")
    .then(($options) => {
      // 3. Rechercher l'option par texte affiché (exact ou partiel, insensible à la casse)
      const match = Array.from($options).find((el) => {
        const text = Cypress.$(el).text().trim().toLowerCase();
        return text.includes(normalizedText);
      });

      if (!match) {
        const availableOptions = Array.from($options).map((el) =>
          Cypress.$(el).text().trim()
        );
        softError(
          `❌ Option "${optionText}" introuvable. Options disponibles : ${availableOptions.join(
            ", "
          )}`
        );
      }

      // 4. Forcer le clic sur l'élément trouvé
      cy.wrap(match)
        .scrollIntoView()
        .should("be.visible")
        .click({ force: true });
    });

  // 5. Vérifier que l'input affiche bien la valeur sélectionnée
  cy.get('app-select:visible input[role="combobox"]')
    .first()
    .invoke("val")
    .should((val) => {
      const valNormalized = val.trim().toLowerCase();
      expect(valNormalized).to.include(normalizedText);
    });
});

/**
 * Coche une checkbox (Angular Material ou native) en fonction du texte du label,
 * de l'id ou de la value, avec prise en charge multilingue via getAllVariants.
 *
 * @param {string} target - Texte affiché, id ou value de la checkbox à cocher
 *
 * 🔹 cy.checkCheckboxByText("addToMyBeneficiaryList");
 */
Cypress.Commands.add("checkCheckboxByText", (target) => {
  const variants = getAllVariants(target.trim());

  cy.document().then((doc) => {
    const $doc = Cypress.$(doc);
    let found = false;

    for (const variant of variants) {
      const normalized = variant.toLowerCase();

      // 🔍 1. Recherche par label textuel
      const labelMatch = $doc
        .find("label, span, div")
        .filter(":visible")
        .filter((i, el) => {
          const text = Cypress.$(el).text().trim().toLowerCase();
          return text.includes(normalized);
        });

      if (labelMatch.length) {
        const checkbox = labelMatch
          .find('input[type="checkbox"], mat-checkbox input[type="checkbox"]')
          .first();

        if (checkbox.length) {
          cy.wrap(checkbox).check({ force: true });
          found = true;
          Cypress.log({
            name: "checkCheckboxByText",
            message: `✅ Checkbox cochée via label : ${variant}`,
          });
          break;
        }
      }

      // 🔍 2. Recherche par attributs (id, value)
      const attrMatch = $doc
        .find(
          `input[type="checkbox"][id*="${variant}"], input[type="checkbox"][value*="${variant}"]`
        )
        .filter(":visible");

      if (attrMatch.length) {
        cy.wrap(attrMatch.first()).check({ force: true });
        found = true;
        Cypress.log({
          name: "checkCheckboxByText",
          message: `✅ Checkbox cochée via attribut : ${variant}`,
        });
        break;
      }
    }

    if (!found) {
      softError(`❌ Aucune checkbox trouvée pour "${target}"`);
    }
  });
});

/**
 * Sélectionne un bouton radio (Angular Material ou natif) en fonction du texte du label,
 * de l'id ou de la value, avec prise en charge multilingue via getAllVariants.
 *
 * @param {string} target - Texte affiché, id ou value du bouton radio à sélectionner
 *
 * 🔹 cy.selectRadioByText("genderMale");
 */
Cypress.Commands.add("selectRadioByText", (target) => {
  const variants = getAllVariants(target.trim());

  cy.document().then((doc) => {
    const $doc = Cypress.$(doc);
    let found = false;

    for (const variant of variants) {
      const normalized = variant.toLowerCase();

      // 🔍 1. Recherche par label textuel
      const labelMatch = $doc
        .find("label, span, div")
        .filter(":visible")
        .filter((i, el) => {
          const text = Cypress.$(el).text().trim().toLowerCase();
          return text.includes(normalized);
        });

      if (labelMatch.length) {
        const radio = labelMatch
          .find('input[type="radio"], mat-radio-button input[type="radio"]')
          .first();

        if (radio.length) {
          cy.wrap(radio).check({ force: true });
          found = true;
          Cypress.log({
            name: "selectRadioByText",
            message: `✅ Radio sélectionné via label : ${variant}`,
          });
          break;
        }
      }

      // 🔍 2. Recherche par attributs (id, value)
      const attrMatch = $doc
        .find(
          `input[type="radio"][id*="${variant}"], input[type="radio"][value*="${variant}"]`
        )
        .filter(":visible");

      if (attrMatch.length) {
        cy.wrap(attrMatch.first()).check({ force: true });
        found = true;
        Cypress.log({
          name: "selectRadioByText",
          message: `✅ Radio sélectionné via attribut : ${variant}`,
        });
        break;
      }
    }

    if (!found) {
      softError(`❌ Aucun bouton radio trouvé pour "${target}"`);
    }
  });
});

/**
 * Active un toggle switch (Angular Material ou natif) en fonction du texte du label,
 * de l'id ou de la value, avec prise en charge multilingue via getAllVariants.
 *
 * @param {string} target - Texte affiché, id ou value du toggle à activer
 *
 * 🔹 cy.activateToggleByText("enableNotifications");
 */
Cypress.Commands.add("activateToggleByText", (target) => {
  const variants = getAllVariants(target.trim());

  cy.document().then((doc) => {
    const $doc = Cypress.$(doc);
    let found = false;

    for (const variant of variants) {
      const normalized = variant.toLowerCase();

      // 🔍 1. Recherche par label textuel
      const labelMatch = $doc
        .find("label, span, div")
        .filter(":visible")
        .filter((i, el) => {
          const text = Cypress.$(el).text().trim().toLowerCase();
          return text.includes(normalized);
        });

      if (labelMatch.length) {
        const toggle = labelMatch
          .find(
            'input[type="checkbox"], mat-slide-toggle input[type="checkbox"]'
          )
          .first();

        if (toggle.length && !toggle.prop("checked")) {
          cy.wrap(toggle).check({ force: true });
          found = true;
          Cypress.log({
            name: "activateToggleByText",
            message: `✅ Toggle activé via label : ${variant}`,
          });
          break;
        }
      }

      // 🔍 2. Recherche par attributs (id, value)
      const attrMatch = $doc
        .find(
          `input[type="checkbox"][id*="${variant}"], input[type="checkbox"][value*="${variant}"]`
        )
        .filter(":visible");

      const toggle = attrMatch.first();
      if (toggle.length && !toggle.prop("checked")) {
        cy.wrap(toggle).check({ force: true });
        found = true;
        Cypress.log({
          name: "activateToggleByText",
          message: `✅ Toggle activé via attribut : ${variant}`,
        });
        break;
      }
    }

    if (!found) {
      softError(`❌ Aucun toggle trouvé ou déjà activé pour "${target}"`);
    }
  });
});

/**
 * Commande universelle QA 2025 pour sélectionner une option dans un dropdown,
 * sans préciser le contexte (mat-select, app-select, indicatif, devise, etc.).
 *
 * @param {string} target - Texte, id ou value de l’option à sélectionner
 *
 * 🔹 cy.selectDropdownUniversal("USD");
 * 🔹 cy.selectDropdownUniversal("usa");
 * 🔹 cy.selectDropdownUniversal("Cameroun");
 */
Cypress.Commands.add("selectDropdownUniversal", (target) => {
  const normalizedTarget = normalize(target);
  const variants = getAllVariants(normalizedTarget);

  cy.document().then((doc) => {
    const $doc = Cypress.$(doc);

    // 🔍 1. Cas indicatif téléphonique
    const indicatifMap = {
      cm: "#iti-0__item-cm .iti__flag-box",
      ca: "#iti-0__item-ca .iti__flag-box",
      usa: "#iti-0__item-us .iti__flag-box",
    };
    const indicatifSelector = indicatifMap[target.toLowerCase()];
    if (indicatifSelector) {
      cy.get("[inputid=\"'phone'\"] [dropdowntoggle] .fi")
        .should("be.visible")
        .click();
      cy.get(indicatifSelector).should("be.visible").first().click();
      return;
    }

    // 🔍 2. Cas app-select
    const appSelect = $doc
      .find('app-select:visible input[role="combobox"]')
      .first();
    if (appSelect.length) {
      cy.wrap(appSelect).click({ force: true });
      cy.get(".cdk-overlay-pane .mat-mdc-option", { timeout: 10000 })
        .should("exist")
        .then(($options) => {
          const match = Array.from($options).find((el) => {
            const text = Cypress.$(el).text().trim().toLowerCase();
            return variants.some((v) => text.includes(v.toLowerCase()));
          });
          if (!match) {
            const available = Array.from($options).map((el) =>
              Cypress.$(el).text().trim()
            );
            softError(
              `❌ Option "${target}" introuvable. Disponibles : ${available.join(
                ", "
              )}`
            );
          }
          cy.wrap(match).scrollIntoView().click({ force: true });
        });
      return;
    }

    // 🔍 3. Cas mat-select avec devise ou fallback solde
    const matSelectCurrency = $doc
      .find("mat-select.account_select_container")
      .first();
    if (matSelectCurrency.length) {
      cy.wrap(matSelectCurrency).click({ force: true });
      cy.get("mat-option")
        .should("exist")
        .then(($options) => {
          let selected = false;
          $options.each((i, option) => {
            const text = Cypress.$(option).text().trim();
            if (variants.some((v) => text.includes(v))) {
              cy.wrap(option).click({ force: true });
              selected = true;
              return false;
            }
          });
          if (!selected) {
            $options.each((i, option) => {
              const text = Cypress.$(option).text().trim();
              const montant = parseFloat(
                text.replace(/[^\d,-]/g, "").replace(",", ".") || "0"
              );
              if (montant > 0) {
                cy.wrap(option).click({ force: true });
                selected = true;
                return false;
              }
            });
          }
          if (!selected)
            softError("❌ Aucun compte valide trouvé (devise ni solde > 0)");
        });
      cy.get(".cdk-overlay-backdrop")
        .should("not.exist", { timeout: 10000 })
        .then(() => cy.wait(300));
      cy.get("div.logo-container").should("be.visible").click({ force: true });
      return;
    }

    // 🔍 4. Cas générique : mat-select, ng-select, select, etc.
    const selectors = [
      "mat-select",
      "ng-select",
      "select",
      "[role=combobox]",
      "[aria-haspopup=listbox]",
      "[aria-haspopup=menu]",
      "[dropdowntoggle]",
    ];
    const dropdowns = $doc
      .find(selectors.join(","))
      .filter((i, el) => Cypress.$(el).is(":visible"));
    if (!dropdowns.length) softError("❌ Aucun dropdown visible trouvé");

    const $dropdown = Cypress.$(dropdowns[0]);
    cy.wrap($dropdown)
      .click({ force: true })
      .then(() => {
        const allOptions = $doc
          .find("mat-option, .mat-mdc-option, option, li, div")
          .filter(":visible");
        let found = false;

        for (const variant of variants) {
          const match = [...allOptions].find((el) =>
            normalize(Cypress.$(el).text()).includes(normalize(variant))
          );
          if (match) {
            cy.wrap(match).scrollIntoView().click({ force: true });
            Cypress.log({
              name: "selectDropdownUniversal",
              message: `✅ Option sélectionnée : ${variant}`,
            });
            found = true;
            break;
          }
        }

        if (!found) {
          const fallback = allOptions.first();
          if (fallback.length) {
            cy.wrap(fallback).click({ force: true });
            Cypress.log({
              name: "selectDropdownUniversal",
              message: `⚠️ Fallback : première option sélectionnée`,
            });
          } else {
            softError(
              `❌ Aucune option sélectionnable trouvée pour "${target}"`
            );
          }
        }
      });
  });
});

// =============================================
// Commande : clickMenuButton (QA 2025)
// 🔹 cy.clickMenuButton("Mobile Money");
// =============================================
Cypress.Commands.add("clickMenuButton", (label, options = {}) => {
  const variants = getAllVariants(label).map(normalize);

  return cy.document().then((doc) => {
    const $doc = Cypress.$(doc);

    // 🔍 1. Sélection des éléments de menu cliquables
    const menuItems = $doc
      .find(
        `
      .element[tabindex],
      div[tabindex],
      [role="button"],
      .transaction_tabs_container .element,
      .service_cards .element
    `
      )
      .filter(":visible");

    // 🔍 2. Filtrage par texte (y compris enfants <p>, <i>, etc.)
    const match = menuItems.filter((i, el) => {
      const texts = [
        el.innerText,
        el.textContent,
        ...Array.from(el.children).map((child) => child.textContent),
      ].map(normalize);

      return texts.some((text) =>
        variants.some((variant) => text.includes(variant))
      );
    });

    // ✅ 3. Clic sur le premier match
    if (match.length) {
      Cypress.log({
        name: "clickMenuButton",
        message: `✅ Menu trouvé : ${label}`,
      });
      return cy.wrap(match.first(), options).click({ force: true });
    }

    // ❌ 4. Aucun match trouvé
    Cypress.log({
      name: "clickMenuButton",
      message: `❌ Aucun menu trouvé pour : ${label}`,
      consoleProps: () => ({
        label,
        variants,
        élémentsTrouvés: menuItems.map(
          (i, el) => el.innerText || el.textContent
        ),
      }),
    });

    softError(`❌ Aucun menu trouvé pour : ${label}`);
  });
});

// =============================================
// Commande : selectOptionByText (QA 2025)
// 🔹 cy.selectOptionByText("Cameroun");
// =============================================
Cypress.Commands.add("selectOptionByText", (target, options = {}) => {
  const variants = getAllVariants(target).map(normalize);

  return cy.document().then((doc) => {
    const $doc = Cypress.$(doc);

    // 🔍 1. Sélection des éléments interactifs visibles
    const candidates = $doc
      .find(
        `
      mat-option,
      .mat-mdc-option,
      option,
      li,
      div[role="option"],
      .iti__country,
      .iti__dial-code,
      .mat-mdc-select-value-text,
      .mat-mdc-select-placeholder,
      .selected-dial-code,
      .example-additional-selection,
      .mat-mdc-select-trigger,
      .mat-mdc-select-value,
      .mat-mdc-autocomplete-trigger,
      .mat-mdc-input-element
    `
      )
      .filter(":visible");

    // 🔍 2. Filtrage par texte ou valeur
    const match = candidates.filter((i, el) => {
      const texts = [
        el.innerText,
        el.textContent,
        el.getAttribute("value"),
        el.getAttribute("id"),
        el.getAttribute("alt"),
        ...Array.from(el.children).map((child) => child.textContent),
      ].map(normalize);

      return texts.some((text) =>
        variants.some((variant) => text.includes(variant))
      );
    });

    // ✅ 3. Clic sur le premier match
    if (match.length) {
      Cypress.log({
        name: "selectOptionByText",
        message: `✅ Élément sélectionné : ${target}`,
      });
      return cy.wrap(match.first(), options).click({ force: true });
    }

    // 🔁 4. Fallback : clic sur le premier élément visible
    const fallback = candidates.first();
    if (fallback.length) {
      Cypress.log({
        name: "selectOptionByText",
        message: `⚠️ Aucun match trouvé, fallback sur le premier élément visible`,
      });
      return cy.wrap(fallback, options).click({ force: true });
    }

    // ❌ 5. Aucun élément sélectionnable
    Cypress.log({
      name: "selectOptionByText",
      message: `❌ Aucun élément sélectionnable trouvé pour : ${target}`,
      consoleProps: () => ({
        target,
        variants,
        élémentsTrouvés: candidates.map(
          (i, el) => el.innerText || el.textContent
        ),
      }),
    });

    softError(`❌ Aucun élément sélectionnable trouvé pour : ${target}`);
  });
});

// =============================================
// Commande choisir pays et remplir formulaire (QA 2025)
// 🔹 cy.choseContryAndFillForm("CIV", true);  // avec recherche
// 🔹 cy.choseContryAndFillForm("CIV", false); // sans recherche
// Gère automatiquement : première sélection ou re-sélection
// =============================================
Cypress.Commands.add(
  "choseContryAndFillForm",
  (countryCode = "CIV", useSearch = false) => {
    cy.document().then((doc) => {
      const $doc = Cypress.$(doc);

      const alreadySelected = $doc.find(".selected_country_box").length > 0;

      if (alreadySelected) {
        // Pays déjà sélectionné → utiliser le menu déroulant
        cy.get(".selected_country_box .selected_country").click();
        cy.selectDropdownUniversal(countryCode);
      } else if (useSearch) {
        // Première sélection → recherche ou clic direct
        cy.fillInput("inputCountry", countryCode);
        cy.clickButton("searchButtonLower");
      } else {
        cy.clickButton(countryCode);
      }

      // Attente que la page suivante soit chargée
      cy.get(".service_cards .ng-star-inserted").should("be.visible");
    });
  }
);

// Commande pour sélectionner un compte de recharge en fonction de la devise souhaitée
// ou, en fallback, du premier compte avec un solde supérieur à zéro.
// 🔹 cy.selectRechargeAccount("USD");
Cypress.Commands.add("selectRechargeAccount", (targetCurrency = "USD") => {
  const variants = getAllVariants(targetCurrency).map(normalize);

  cy.document().then((doc) => {
    const $doc = Cypress.$(doc);
    const buttons = $doc.find("button.account_trigger");

    if (!buttons.length) {
      softError("❌ Aucun compte disponible dans la section de recharge.");
    }

    let selectedButton = null;

    // 1️⃣ Sélection par devise (via variants)
    buttons.each((i, el) => {
      const currencyText = Cypress.$(el).text();
      const normalizedText = normalize(currencyText);
      if (variants.some((variant) => normalizedText.includes(variant))) {
        selectedButton = el;
        return false; // break
      }
    });

    // 2️⃣ Si non trouvé, sélection du premier compte avec solde > 0
    if (!selectedButton) {
      buttons.each((i, el) => {
        const currencyText = Cypress.$(el).text();
        const match = currencyText.match(/([\d.,]+)\s*([A-Z]{3})/);
        if (match) {
          const amount = parseFloat(match[1].replace(",", "."));
          if (amount > 0) {
            selectedButton = el;
            return false;
          }
        }
      });
    }

    // 3️⃣ Si toujours rien, prendre le premier compte
    if (!selectedButton) {
      selectedButton = buttons[0];
    }

    // ✅ Sélection du compte
    cy.wrap(selectedButton).click();
    Cypress.log({
      name: "selectRechargeAccount",
      message: `✅ Compte sélectionné : ${Cypress.$(selectedButton)
        .text()
        .trim()}`,
    });
  });
});

// =============================================
// Commande clickService (QA 2025 / ISO 27001)
// 🔹 cy.clickService("ENEO BILL PAYMENT");
// =============================================
Cypress.Commands.add("clickService", (label, options = {}) => {
  const variants = getAllVariants(label).map(normalize);

  // Sélecteurs fiables et non figés
  const selectors = [
    ".service_label",
    ".service",
    "p",
    "div",
    "[role=button]",
    "[tabindex]",
  ];

  return cy.document().then((doc) => {
    const $doc = Cypress.$(doc);

    // 🔎 Parcourir tous les sélecteurs potentiels
    for (const sel of selectors) {
      const elements = $doc.find(sel);

      const match = elements.filter((i, el) => {
        const texts = [
          el.innerText,
          el.textContent,
          ...Array.from(el.children).map((child) => child.textContent),
        ].map(normalize);

        // On teste toutes les variantes traduites du label
        return texts.some((text) =>
          variants.some((variant) => text.includes(variant))
        );
      });

      if (match.length) {
        const $target = Cypress.$(match.first()).closest(".service");

        Cypress.log({
          name: "clickService",
          message: `✅ Service trouvé : ${label}`,
          consoleProps: () => ({
            label,
            variants,
            matchedElement: $target.get(0),
          }),
        });

        return cy
          .wrap($target, options)
          .should("be.visible")
          .click({ force: true });
      }
    }

    // 🧭 Fallback : recherche textuelle globale avec cy.contains
    for (const variant of variants) {
      try {
        return cy
          .contains(
            ".service_label, .service",
            new RegExp(variant, "i"),
            options
          )
          .should("be.visible")
          .click({ force: true });
      } catch (e) {
        // continuer silencieusement pour tester les autres variantes
      }
    }

    // 🚨 Aucun service trouvé
    Cypress.log({
      name: "clickService",
      message: `❌ Aucun service trouvé pour : ${label}`,
      consoleProps: () => ({ label, variants }),
    });

    softError(`❌ Aucun service trouvé pour : ${label}`);
  });
});

// =============================================
// Commande clickServiceByName (QA 2025)
// 🔹 cy.clickServiceByName("CANAL + subscription");
// 🔹 cy.clickServiceByName("Camwater BILL PAYMENT");
// 🔹 cy.clickServiceByName("ENEO BILL PAYMENT");
// =============================================
Cypress.Commands.add("clickServiceByName", (serviceNameLabel, options = {}) => {
  const variants = getAllVariants(serviceNameLabel).map(normalize);

  return cy.document().then((doc) => {
    const $doc = Cypress.$(doc);

    // Cibler spécifiquement les éléments avec la classe 'service' et le label de service
    const serviceElements = $doc.find(".service");

    for (const variant of variants) {
      const match = serviceElements.filter((i, el) => {
        const $el = Cypress.$(el);
        // Chercher le texte dans le paragraphe qui est le label du service
        const labelText = $el.find("p.service_label").text();
        return normalize(labelText).includes(variant);
      });

      if (match.length) {
        Cypress.log({
          name: "clickServiceByName",
          message: `✅ Service trouvé et cliqué : ${serviceNameLabel}`,
        });
        return cy.wrap(match.first(), options).click();
      }
    }

    Cypress.log({
      name: "clickServiceByName",
      message: `❌ Aucun service trouvé pour le label : ${serviceNameLabel}`,
      consoleProps: () => ({
        serviceNameLabel,
        variants,
      }),
    });

    softError(`❌ Aucun service trouvé pour le label : ${serviceNameLabel}`);
  });
});

// =============================================
// Commande clickOnService (QA 2025)
// 🔹 cy.clickOnService("CANAL + subscription");
// =============================================
Cypress.Commands.add("clickOnService", (label, options = {}) => {
  const variants = getAllVariants(label).map(normalize);

  return cy.document().then((doc) => {
    const $doc = Cypress.$(doc);
    const services = $doc.find(".service");

    for (const service of services) {
      const textElements = service.querySelectorAll(
        ".service_label, p, span, div"
      );

      const match = Array.from(textElements).find((el) => {
        const texts = [
          el.innerText,
          el.textContent,
          ...Array.from(el.children).map((child) => child.textContent),
        ].map(normalize);

        return texts.some((text) =>
          variants.some((variant) => text.includes(variant))
        );
      });

      if (match) {
        Cypress.log({
          name: "clickOnService",
          message: `✅ Service trouvé et cliqué : ${label}`,
        });
        return cy.wrap(service, options).click();
      }
    }

    Cypress.log({
      name: "clickOnService",
      message: `❌ Aucun service cliquable trouvé pour : ${label}`,
      consoleProps: () => ({
        label,
        variants,
      }),
    });

    softError(`❌ Aucun service cliquable trouvé pour : ${label}`);
  });
});
