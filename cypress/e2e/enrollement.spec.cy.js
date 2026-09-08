/// <reference types="cypress" />

// =============================================
// 🔹 SMARTPAY - Cypress Test Automation
// Plan d’Action – Tests & Validation SmartPay
// Auteur : Victor Dexter Nlang – Test & Validation Lead
// Date : 03/09/2025
// =============================================

// -------------------------
// Hooks globaux
// -------------------------
before(function () {
  // Nettoyage
  cy.clearCookies();
  cy.clearLocalStorage();
});

beforeEach(function () {
  // Charger dictionnaires automatiquement selon la langue avant tests
  cy.loadTranslations();

  // Charger jeux de données
  cy.fixture("enrollements.json").then((users) => {
    cy.wrap(users.individualPayment).as("individualPaymentUser");
    cy.wrap(users.individualBanking).as("individualBankingUser");
    cy.wrap(users.corporatePayment).as("corporatePaymentUser");
    cy.wrap(users.corporateBanking).as("corporateBankingUser");
  });

  // Visiter la page d'accueil avant chaque test
  cy.visit("/auth/login");
});

afterEach(function () {
  // Capture d'écran en cas d'échec seulement
  if (this.currentTest.state === "failed") {
    cy.screenshot();
  }

  // Nettoyage complet
  cy.clearCookies();
  cy.clearLocalStorage();
  cy.window().then((win) => {
    win.sessionStorage.clear();
  });
});

after(function () {
  cy.clearCookies();
  cy.clearLocalStorage();
  cy.log("✅ Tous les tests terminés (SmartPay)");
});

// =============================================
// 2. Création de compte (Microservice Comptes)
// =============================================
describe("Enrollement", function () {
  // =============================================
  // TESTS D'ENROLLMENT - COMPTE DE PAIEMENT INDIVIDUEL (7 étapes)
  // =============================================
  context("Enrollment - Compte de Paiement Individuel", function () {
    it("T01 - Inscription complète compte de paiement individuel", function () {
      cy.get("@individualPaymentUser").then((individual) => {
        // Étape 1: Email et téléphone
        cy.fillStep1(individual, "individual-payment");

        // Étape 2: OTP
        cy.fillStep2(individual.otp);

        // Étape 3-6: Informations personnelles
        cy.fillIndividualPaymentSteps(individual);

        // Intercepter la finalisation d'enrollment
        cy.spyOnRequest(
          "POST",
          "https://proxy-dev.afric.ca/core-client/commands/client/individual/enrollment",
          "finalIPEnrollRequest",
          { expectedStatus: 200 }
        );

        // Étape 7: Création du mot de passe
        cy.createPassword(individual);

        // Ceci attend la requête et effectue les vérifications QA/ISO.
        cy.validateRequest("finalIPEnrollRequest");
        cy.url().should("include", "/dashboard");
      });
    });
  });

  // =============================================
  // TESTS D'ENROLLMENT - COMPTE DE PAIEMENT ENTREPRISE (15 étapes)
  // =============================================
  context("Enrollment - Compte de Paiement Entreprise", function () {
    it("T02 - Inscription complète compte de paiement entreprise", function () {
      cy.get("@corporatePaymentUser").then((company) => {
        // Étape 1: Email et téléphone
        cy.fillStep1(company, "corporate-payment");

        // Étape 2: OTP
        cy.fillStep2(company.otp);

        // Étape 3-14: Informations de l'entreprise et représentant légal
        cy.fillCorporatePaymentSteps(company);

        // Intercepter la finalisation d'enrollment
        cy.spyOnRequest(
          "POST",
          "https://proxy-dev.afric.ca/core-client/commands/client/corporate/enrollment",
          "finalCPEnrollRequest",
          { expectedStatus: 200 }
        );

        // Étape 15: Création du mot de passe
        cy.createPassword(company);

        // Ceci attend la requête et effectue les vérifications QA/ISO.
        cy.validateRequest("finalCPEnrollRequest");
        cy.url().should("include", "/dashboard");
      });
    });
  });

  // =============================================
  // TESTS D'ENROLLMENT - COMPTE BANCAIRE INDIVIDUEL (9 étapes)
  // =============================================
  context("Enrollment - Compte Bancaire Individuel", function () {
    it("T03 - Inscription complète compte bancaire individuel", function () {
      cy.get("@individualBankingUser").then((individual) => {
        // Étape 1: Email et téléphone
        cy.fillStep1(individual, "individual-banking");

        // Étape 2: OTP
        cy.fillStep2(individual.otp);

        // Étape 3-8: Informations personnelles et documents
        cy.fillIndividualBankingSteps(individual);

        // Intercepter la finalisation d'enrollment
        cy.spyOnRequest(
          "POST",
          "https://proxy-dev.afric.ca/core-client/commands/client/individual/enrollment",
          "finalIBEnrollRequest",
          { expectedStatus: 200 }
        );

        // Étape 9: Création du mot de passe
        cy.createPassword(individual);

        // Ceci attend la requête et effectue les vérifications QA/ISO.
        cy.validateRequest("finalIBEnrollRequest");
        cy.url().should("include", "/dashboard");
      });
    });
  });

  // =============================================
  // TESTS D'ENROLLMENT - COMPTE BANCAIRE ENTREPRISE (15 étapes)
  // =============================================
  context("Enrollment - Compte Bancaire Entreprise", function () {
    it("T04 - Inscription complète compte bancaire entreprise", function () {
      cy.get("@corporateBankingUser").then((company) => {
        // Étape 1: Email et téléphone
        cy.fillStep1(company, "corporate-banking");

        // Étape 2: OTP
        cy.fillStep2(company.otp);

        // Étape 3-14: Informations de l'entreprise, représentant légal et documents
        cy.fillCorporateBankingSteps(company);

        // Intercepter la finalisation d'enrollment
        cy.spyOnRequest(
          "POST",
          "https://proxy-dev.afric.ca/core-client/commands/client/corporate/enrollment",
          "finalCBEnrollRequest",
          { expectedStatus: 200 }
        );

        // Étape 15: Création du mot de passe
        cy.createPassword(company);

        // Ceci attend la requête et effectue les vérifications QA/ISO.
        cy.validateRequest("finalCBEnrollRequest");
        cy.url().should("include", "/dashboard");
      });
    });
  });
});

// =============================================
