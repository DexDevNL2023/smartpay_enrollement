// =============================================
// COMMANDES DE GESTION DEsS ENROLLEMENTS
// =============================================
// Commande pour remplir l'étape 1 (email et téléphone)
Cypress.Commands.add("fillStep1", (user, accountType) => {
  const urlMap = {
    "individual-payment": "/auth/register/ip",
    "individual-banking": "/auth/register/ib",
    "corporate-payment": "/auth/register/cp",
    "corporate-banking": "/auth/register/cb",
  };
  const urlRequest = {
    "individual-payment":
      "https://proxy-dev.afric.ca/core-client/commands/client/individual/enrollment",
    "individual-banking":
      "https://proxy-dev.afric.ca/core-client/commands/client/individual/enrollment",
    "corporate-payment":
      "https://proxy-dev.afric.ca/core-client/commands/client/corporate/enrollment",
    "corporate-banking":
      "https://proxy-dev.afric.ca/core-client/commands/client/corporate/enrollment",
  };
  const urlAlias = {
    "individual-payment": "initIPEnrollRequest",
    "individual-banking": "initIBEnrollRequest",
    "corporate-payment": "initCPEnrollRequest",
    "corporate-banking": "initCBEnrollRequest",
  };

  cy.intercept("POST", urlRequest[accountType], {
    statusCode: 200,
  }).as(urlAlias[accountType]);

  // Intercepter la requête d'envoi d'OTP
  cy.visit(urlMap[accountType]);

  // Email
  cy.fillInput("email", user.email);

  // Sélecteur indicatif
  // cy.selectDropdownItem(user.countryCodeNumber);
  cy.selectAppSelectOption(user.countryCodeNumber);

  // Téléphone
  cy.fillInput("phone", user.phone);

  // Accepter les conditions
  cy.checkCheckboxByText("acceptTerms");

  // Continuer
  cy.clickButton("continue");
  cy.wait(`@${urlAlias[accountType]}`)
    .its("response.statusCode")
    .should("eq", 200);
});

// Commande pour remplir l'étape 2 (OTP)
Cypress.Commands.add("fillStep2", (otp) => {
  // Intercepter la vérification d'OTP
  cy.intercept(
    "POST",
    "https://proxy-dev.afric.ca/core-client/commands/client/verify-otp",
    {
      statusCode: 200,
    }
  ).as("verifyOtpRequest");

  // saisie OTP
  cy.assertTextVisible("enterCode");
  otp = otp || "211852"; // mock OTP
  cy.putSecureCode(otp);
  cy.clickButton("continue");
  cy.wait("@verifyOtpRequest").its("response.statusCode").should("eq", 200);
});

// Commande pour les étapes du compte de paiement individuel (3-6 étapes au total)
Cypress.Commands.add("fillIndividualPaymentSteps", (individualPayment) => {
  const steps = [
    {
      // Étape 3 - Informations personnelles
      surname: { value: individualPayment.firstName, type: "input" },
      name: { value: individualPayment.lastName, type: "input" },
      gender: { value: individualPayment.gender, type: "dropdown" },
      maritalStatus: {
        value: individualPayment.maritalStatus,
        type: "dropdown",
      },
      language: { value: individualPayment.language, type: "dropdown" },
      profession: { value: individualPayment.profession, type: "input" },
      educationLevel: {
        value: individualPayment.educationLevel,
        type: "dropdown",
      },
    },
    {
      // Étape 4 - Naissance
      dateOfBirth: {
        value: individualPayment.birthDate,
        type: "input",
      },
      placeOfBirth: {
        value: individualPayment.birthPlace,
        type: "input",
      },
      country: {
        value: individualPayment.birthCountry,
        type: "dropdown",
      },
      mother: { value: individualPayment.motherName, type: "input" },
      father: { value: individualPayment.fatherName, type: "input" },
    },
    {
      // Étape 5 - Adresse
      residingCountry: {
        value: individualPayment.residenceCountry,
        type: "dropdown",
      },
      residingRegion: { value: individualPayment.region, type: "dropdown" },
      residingTown: { value: individualPayment.city, type: "dropdown" },
      streetName: { value: individualPayment.street, type: "input" },
      poBox: { value: individualPayment.postalCode, type: "input" },
      buildingNumber: {
        value: individualPayment.buildingNumber,
        type: "input",
      },
      apartmentNumber: {
        value: individualPayment.apartmentNumber,
        type: "input",
      },
    },
    {
      // Étape 6 - Identification
      idType: {
        value: individualPayment.idType,
        type: "dropdown",
      },
      cni: { value: individualPayment.idNumber, type: "input" },
      uniqueIdentificationNumber: {
        value: individualPayment.uniqueId,
        type: "input",
      },
      bankAccountType: {
        value: individualPayment.accountType,
        type: "dropdown",
      },
      invalidityQuestion: {
        value: individualPayment.hasDisability,
        type: "checkbox",
      },
    },
  ];

  steps.forEach((step, index) => {
    cy.log(`Remplissage Étape ${index + 3}`);
    // Intercepter les requêtes d'enrollment individuel
    cy.intercept(
      "POST",
      "https://proxy-dev.afric.ca/core-client/commands/client/individual/enrollment",
      {
        statusCode: 200,
      }
    ).as(`enrollIPRequest${index + 3}`);

    Object.entries(step).forEach(([label, { value, type }]) => {
      switch (type) {
        case "input":
          cy.fillInput(label, value);
          break;

        case "dropdown":
          cy.selectDropdownUniversal(value);
          break;

        case "toggle":
          cy.activateToggleByText(label);
          break;

        case "radio":
          cy.selectRadioByText(label);
          break;

        case "checkbox":
          cy.checkCheckboxByText(label);
          break;

        case "file":
          cy.uploadFile(label, value);
          break;

        case "signature":
          cy.signCanvas(label);
          break;

        case "textVisible":
          cy.assertTextVisible(label);
          break;

        case "secureCode":
          cy.putSecureCode(value);
          break;

        default:
          // fallback générique
          cy.findElement(label).clear().type(value, { force: true });
          break;
      }
    });

    // Continuer
    cy.clickButton("continue");
    cy.wait(`@enrollIPRequest${index + 3}`)
      .its("response.statusCode")
      .should("eq", 200);
  });
});

// Commande pour les étapes du compte bancaire individuel (3-8 étapes)
Cypress.Commands.add("fillIndividualBankingSteps", (individual) => {
  const steps = [
    {
      // Étape 3 - Informations personnelles
      surname: { value: individualPayment.firstName, type: "input" },
      name: { value: individualPayment.lastName, type: "input" },
      gender: { value: individualPayment.gender, type: "dropdown" },
      maritalStatus: {
        value: individualPayment.maritalStatus,
        type: "dropdown",
      },
      language: { value: individualPayment.language, type: "dropdown" },
      profession: { value: individualPayment.profession, type: "input" },
      educationLevel: {
        value: individualPayment.educationLevel,
        type: "dropdown",
      },
    },
    {
      // Étape 4 - Naissance
      dateOfBirth: {
        value: individualPayment.birthDate,
        type: "input",
      },
      placeOfBirth: {
        value: individualPayment.birthPlace,
        type: "input",
      },
      country: {
        value: individualPayment.birthCountry,
        type: "dropdown",
      },
      mother: { value: individualPayment.motherName, type: "input" },
      father: { value: individualPayment.fatherName, type: "input" },
    },
    {
      // Étape 5 - Adresse
      residingCountry: {
        value: individualPayment.residenceCountry,
        type: "dropdown",
      },
      residingRegion: { value: individualPayment.region, type: "dropdown" },
      residingTown: { value: individualPayment.city, type: "dropdown" },
      streetName: { value: individualPayment.street, type: "input" },
      poBox: { value: individualPayment.postalCode, type: "input" },
      buildingNumber: {
        value: individualPayment.buildingNumber,
        type: "input",
      },
      apartmentNumber: {
        value: individualPayment.apartmentNumber,
        type: "input",
      },
    },
    {
      // Étape 6 - Identification
      idType: {
        value: individualPayment.idType,
        type: "dropdown",
      },
      cni: { value: individualPayment.idNumber, type: "input" },
      uniqueIdentificationNumber: {
        value: individualPayment.uniqueId,
        type: "input",
      },
      bankAccountType: {
        value: individualPayment.accountType,
        type: "dropdown",
      },
      invalidityQuestion: {
        value: individualPayment.hasDisability,
        type: "checkbox",
      },
    },
    {
      // Étape 7 - Agence et gestionnaire
      bankInfoAgency: {
        value: individual.agency,
        type: "dropdown",
      },
      managerName: {
        value: individual.accountManager,
        type: "input",
      },
      referenceCode: {
        value: individual.referralCode,
        type: "input",
      },
      howDidYouHearAbout: {
        value: individual.howHeard,
        type: "dropdown",
      },
      otherBankAccount: {
        value: individual.otherBankAccount,
        type: "dropdown",
      },
      otherBankName: {
        value: individual.otherBank,
        type: "input",
      },
    },
    {
      // Étape 8 - Documents obligatoires
      incomeJustification: {
        value: individual.documents.incomeProof,
        type: "file",
      },
      locationMap: {
        value: individual.documents.locationPlan,
        type: "file",
      },
      proofResidence: {
        value: individual.documents.residenceProof,
        type: "file",
      },
      birthCertificateFront: {
        value: individual.documents.birthCertificateFront,
        type: "file",
      },
      birthCertificateBack: {
        value: individual.documents.birthCertificateBack,
        type: "file",
      },
      Signature: {
        value: individualPayment.firstName + " " + individualPayment.lastName,
        type: "signature",
      },
    },
  ];

  steps.forEach((step, index) => {
    cy.log(`Remplissage Étape ${index + 3}`);
    // Intercepter les requêtes d'enrollment individuel
    cy.intercept(
      "POST",
      "https://proxy-dev.afric.ca/core-client/commands/client/individual/enrollment",
      {
        statusCode: 200,
      }
    ).as(`enrollIBRequest${index + 3}`);

    Object.entries(step).forEach(([label, { value, type }]) => {
      switch (type) {
        case "input":
          cy.fillInput(label, value);
          break;

        case "dropdown":
          cy.selectDropdownUniversal(value);
          break;

        case "toggle":
          cy.activateToggleByText(label);
          break;

        case "radio":
          cy.selectRadioByText(label);
          break;

        case "checkbox":
          cy.checkCheckboxByText(label);
          break;

        case "file":
          cy.uploadFile(label, value);
          break;

        case "signature":
          cy.signCanvas(label);
          break;

        case "textVisible":
          cy.assertTextVisible(label);
          break;

        case "secureCode":
          cy.putSecureCode(value);
          break;

        default:
          // fallback générique
          cy.findElement(label).clear().type(value, { force: true });
          break;
      }
    });

    // Continuer
    cy.clickButton("continue");
    cy.wait(`@enrollIBRequest${index + 3}`)
      .its("response.statusCode")
      .should("eq", 200);
  });
});

// Commande pour les étapes du compte d'entreprise (3-14 étapes au total)
Cypress.Commands.add("fillCorporatePaymentSteps", (corporatePayment) => {
  const steps = [
    {
      // Étape 3 - Informations générales entreprise
      companyName: {
        value: corporatePayment.company.name,
        type: "input",
      },
      acronym: {
        value: corporatePayment.company.acronym,
        type: "input",
      },
      principalActivity: {
        value: corporatePayment.company.mainActivity,
        type: "input",
      },
      taxStatus: {
        value: corporatePayment.company.taxRegime,
        type: "input",
      },
      legalStatus: {
        value: corporatePayment.company.legalStatus,
        type: "input",
      },
    },
    {
      // Étape 4 - Localisation entreprise
      foundedDate: {
        value: corporatePayment.company.creationDate,
        type: "input",
      },
      countryLocation: {
        value: corporatePayment.company.country,
        type: "dropdown",
      },
      region: {
        value: corporatePayment.company.region,
        type: "dropdown",
      },
      residenceTown: {
        value: corporatePayment.company.city,
        type: "dropdown",
      },
      streetName: {
        value: corporatePayment.company.street,
        type: "input",
      },
      poBox: {
        value: corporatePayment.company.postalCode,
        type: "input",
      },
      buildingNumber: {
        value: corporatePayment.company.buildingNumber,
        type: "input",
      },
      apartmentNumber: {
        value: corporatePayment.company.apartmentNumber,
        type: "input",
      },
      contactEmail: {
        value: corporatePayment.company.contactEmail,
        type: "input",
      },
      contactPhoneNumber: {
        value: corporatePayment.company.contactPhone,
        type: "input",
      },
    },
    {
      // Étape 5 - Identifiants et logo
      fiscalCenter: {
        value: corporatePayment.company.taxCenter,
        type: "input",
      },
      registrationRumber: {
        value: corporatePayment.company.registrationNumber,
        type: "input",
      },
      uniqueIdentificationNumber: {
        value: corporatePayment.company.uniqueId,
        type: "input",
      },
      companyLogo: {
        value: corporatePayment.company.logo,
        type: "file",
      },
    },
    {
      // Étape 6 - Type compte et agence
      bankInfoAgency: {
        value: corporatePayment.company.agency,
        type: "dropdown",
      },
      bankAccountType: {
        value: corporatePayment.company.accountType,
        type: "dropdown",
      },
      managerName: {
        value: corporatePayment.company.accountManager,
        type: "input",
      },
      howDidYouHearAbout: {
        value: corporatePayment.company.howHeard,
        type: "dropdown",
      },
      otherBankAccount: {
        value: corporatePayment.company.otherBankAccounts,
        type: "dropdown",
      },
    },
    {
      // Étape 7 - Type d'entreprise et documents
      selectPlaceholder: {
        value: corporatePayment.company.companyType,
        type: "dropdown",
      },
      certificateIncorporation: {
        value: corporatePayment.company.documents?.certInc,
        type: "input",
      },
      articleIncorporation: {
        value: corporatePayment.company.documents?.artInc,
        type: "input",
      },
      proofAddress: {
        value: corporatePayment.company.documents?.proofAddress,
        type: "input",
      },
      uBOInformation: {
        value: corporatePayment.company.documents?.ubo,
        type: "input",
      },
      bankAccountDetails: {
        value: corporatePayment.company.documents?.bankDetails,
        type: "input",
      },
    },
    {
      // Étape 8 - Ajouter représentants légaux
      addRepresentatives: {
        value: true,
        type: "checkbox",
      },
    },
    {
      // Étape 9 - Infos représentant légal - Email, téléphone, rôle
      representativeEmail: {
        value: corporatePayment.legalRepresentative.email,
        type: "input",
      },
      representativePhoneNumber: {
        value: corporatePayment.legalRepresentative.phone,
        type: "input",
      },
      representativeRole: {
        value: corporatePayment.legalRepresentative.roles,
        type: "input",
      },
    },
    {
      // Étape 10 - Infos représentant légal - Nom, prénom, genre, statut marital, langue
      representativeName: {
        value: corporatePayment.legalRepresentative.lastName,
        type: "input",
      },
      representativeFirstName: {
        value: corporatePayment.legalRepresentative.firstName,
        type: "input",
      },
      gender: {
        value: corporatePayment.legalRepresentative.gender,
        type: "dropdown",
      },
      maritalStatus: {
        value: corporatePayment.legalRepresentative.maritalStatus,
        type: "dropdown",
      },
      language: {
        value: corporatePayment.legalRepresentative.language,
        type: "dropdown",
      },
    },
    {
      // Étape 11 - Infos représentant légal - Naissance et profession
      representativeDateBirth: {
        value: corporatePayment.legalRepresentative.birthDate,
        type: "input",
      },
      representativePlaceBirth: {
        value: corporatePayment.legalRepresentative.birthPlace,
        type: "input",
      },
      representativeCountryBirth: {
        value: corporatePayment.legalRepresentative.birthCountry,
        type: "dropdown",
      },
      representativeProfession: {
        value: corporatePayment.legalRepresentative.profession,
        type: "input",
      },
    },
    {
      // Étape 12 - Infos représentant légal - Adresse
      representativeCountryResidence: {
        value: corporatePayment.legalRepresentative.residenceCountry,
        type: "dropdown",
      },
      representativeRegionResidence: {
        value: corporatePayment.legalRepresentative.region,
        type: "dropdown",
      },
      representativeCityResidence: {
        value: corporatePayment.legalRepresentative.city,
        type: "dropdown",
      },
      representativeStreetName: {
        value: corporatePayment.legalRepresentative.street,
        type: "input",
      },
      representativePostalCode: {
        value: corporatePayment.legalRepresentative.postalCode,
        type: "input",
      },
      representativeBuildingNumber: {
        value: corporatePayment.legalRepresentative.buildingNumber,
        type: "input",
      },
      representativeApartmentNumber: {
        value: corporatePayment.legalRepresentative.apartmentNumber,
        type: "input",
      },
    },
    {
      // Étape 13 - Infos représentant légal - Identification
      identificationType: {
        value: corporatePayment.legalRepresentative.idType,
        type: "dropdown",
      },
      identificationNumber: {
        value: corporatePayment.legalRepresentative.idNumber,
        type: "input",
      },
      uniqueIdentificationNumber: {
        value: corporatePayment.legalRepresentative.uniqueId,
        type: "input",
      },
    },
    {
      // Étape 14 - Documents représentant légal
      incomeJustification: {
        value: corporatePayment.legalRepresentative.documents?.incomeProof,
        type: "file",
      },
      locationMap: {
        value: corporatePayment.legalRepresentative.documents?.locationPlan,
        type: "file",
      },
      proofResidence: {
        value: corporatePayment.legalRepresentative.documents?.addressProof,
        type: "file",
      },
      birthCertificateFront: {
        value: corporatePayment.legalRepresentative.documents?.birthCertFront,
        type: "file",
      },
      birthCertificateBack: {
        value: corporatePayment.legalRepresentative.documents?.birthCertBack,
        type: "file",
      },
      Signature: {
        value: corporatePayment.legalRepresentative.documents?.signature,
        type: "signature",
      },
    },
  ];

  steps.forEach((step, index) => {
    cy.log(`Remplissage Étape ${index + 3}`);
    cy.intercept(
      "POST",
      "https://proxy-dev.afric.ca/core-client/commands/client/corporate/enrollment",
      {
        statusCode: 200,
      }
    ).as(`enrollCPRequest${index + 3}`);

    Object.entries(step).forEach(([label, { value, type }]) => {
      switch (type) {
        case "input":
          cy.fillInput(label, value);
          break;

        case "dropdown":
          cy.selectDropdownUniversal(value);
          break;

        case "toggle":
          cy.activateToggleByText(label);
          break;

        case "radio":
          cy.selectRadioByText(label);
          break;

        case "checkbox":
          cy.checkCheckboxByText(label);
          break;

        case "file":
          cy.uploadFile(label, value);
          break;

        case "signature":
          cy.signCanvas(label);
          break;

        case "textVisible":
          cy.assertTextVisible(label);
          break;

        case "secureCode":
          cy.putSecureCode(value);
          break;

        default:
          // fallback générique
          cy.findElement(label).clear().type(value, { force: true });
          break;
      }
    });

    // Continuer
    cy.clickButton("continue");
    cy.wait(`@enrollCPRequest${index + 3}`)
      .its("response.statusCode")
      .should("eq", 200);
  });
});

// Commande pour les étapes du compte bancaire entreprise (3-14 étapes)
Cypress.Commands.add("fillCorporateBankingSteps", (corporateBanking) => {
  const steps = [
    {
      // Étape 3 - Informations générales entreprise
      companyName: {
        value: corporatePayment.company.name,
        type: "input",
      },
      acronym: {
        value: corporatePayment.company.acronym,
        type: "input",
      },
      principalActivity: {
        value: corporatePayment.company.mainActivity,
        type: "input",
      },
      taxStatus: {
        value: corporatePayment.company.taxRegime,
        type: "input",
      },
      legalStatus: {
        value: corporatePayment.company.legalStatus,
        type: "input",
      },
    },
    {
      // Étape 4 - Localisation entreprise
      foundedDate: {
        value: corporatePayment.company.creationDate,
        type: "input",
      },
      countryLocation: {
        value: corporatePayment.company.country,
        type: "dropdown",
      },
      region: {
        value: corporatePayment.company.region,
        type: "dropdown",
      },
      residenceTown: {
        value: corporatePayment.company.city,
        type: "dropdown",
      },
      streetName: {
        value: corporatePayment.company.street,
        type: "input",
      },
      poBox: {
        value: corporatePayment.company.postalCode,
        type: "input",
      },
      buildingNumber: {
        value: corporatePayment.company.buildingNumber,
        type: "input",
      },
      apartmentNumber: {
        value: corporatePayment.company.apartmentNumber,
        type: "input",
      },
      contactEmail: {
        value: corporatePayment.company.contactEmail,
        type: "input",
      },
      contactPhoneNumber: {
        value: corporatePayment.company.contactPhone,
        type: "input",
      },
    },
    {
      // Étape 5 - Identifiants et logo
      fiscalCenter: {
        value: corporatePayment.company.taxCenter,
        type: "input",
      },
      registrationRumber: {
        value: corporatePayment.company.registrationNumber,
        type: "input",
      },
      uniqueIdentificationNumber: {
        value: corporatePayment.company.uniqueId,
        type: "input",
      },
      companyLogo: {
        value: corporatePayment.company.logo,
        type: "file",
      },
    },
    {
      // Étape 6 - Type compte et agence
      bankInfoAgency: {
        value: corporatePayment.company.agency,
        type: "dropdown",
      },
      bankAccountType: {
        value: corporatePayment.company.accountType,
        type: "dropdown",
      },
      managerName: {
        value: corporatePayment.company.accountManager,
        type: "input",
      },
      howDidYouHearAbout: {
        value: corporatePayment.company.howHeard,
        type: "dropdown",
      },
      otherBankAccount: {
        value: corporatePayment.company.otherBankAccounts,
        type: "dropdown",
      },
    },
    {
      // Étape 7 - Type d'entreprise et documents
      selectPlaceholder: {
        value: corporatePayment.company.companyType,
        type: "dropdown",
      },
      certificateIncorporation: {
        value: corporatePayment.company.documents?.certInc,
        type: "input",
      },
      articleIncorporation: {
        value: corporatePayment.company.documents?.artInc,
        type: "input",
      },
      proofAddress: {
        value: corporatePayment.company.documents?.proofAddress,
        type: "input",
      },
      uBOInformation: {
        value: corporatePayment.company.documents?.ubo,
        type: "input",
      },
      bankAccountDetails: {
        value: corporatePayment.company.documents?.bankDetails,
        type: "input",
      },
    },
    {
      // Étape 8 - Ajouter représentants légaux
      addRepresentatives: {
        value: true,
        type: "checkbox",
      },
    },
    {
      // Étape 9 - Infos représentant légal - Email, téléphone, rôle
      representativeEmail: {
        value: corporatePayment.legalRepresentative.email,
        type: "input",
      },
      representativePhoneNumber: {
        value: corporatePayment.legalRepresentative.phone,
        type: "input",
      },
      representativeRole: {
        value: corporatePayment.legalRepresentative.roles,
        type: "input",
      },
    },
    {
      // Étape 10 - Infos représentant légal - Nom, prénom, genre, statut marital, langue
      representativeName: {
        value: corporatePayment.legalRepresentative.lastName,
        type: "input",
      },
      representativeFirstName: {
        value: corporatePayment.legalRepresentative.firstName,
        type: "input",
      },
      gender: {
        value: corporatePayment.legalRepresentative.gender,
        type: "dropdown",
      },
      maritalStatus: {
        value: corporatePayment.legalRepresentative.maritalStatus,
        type: "dropdown",
      },
      language: {
        value: corporatePayment.legalRepresentative.language,
        type: "dropdown",
      },
    },
    {
      // Étape 11 - Infos représentant légal - Naissance et profession
      representativeDateBirth: {
        value: corporatePayment.legalRepresentative.birthDate,
        type: "input",
      },
      representativePlaceBirth: {
        value: corporatePayment.legalRepresentative.birthPlace,
        type: "input",
      },
      representativeCountryBirth: {
        value: corporatePayment.legalRepresentative.birthCountry,
        type: "dropdown",
      },
      representativeProfession: {
        value: corporatePayment.legalRepresentative.profession,
        type: "input",
      },
    },
    {
      // Étape 12 - Infos représentant légal - Adresse
      representativeCountryResidence: {
        value: corporatePayment.legalRepresentative.residenceCountry,
        type: "dropdown",
      },
      representativeRegionResidence: {
        value: corporatePayment.legalRepresentative.region,
        type: "dropdown",
      },
      representativeCityResidence: {
        value: corporatePayment.legalRepresentative.city,
        type: "dropdown",
      },
      representativeStreetName: {
        value: corporatePayment.legalRepresentative.street,
        type: "input",
      },
      representativePostalCode: {
        value: corporatePayment.legalRepresentative.postalCode,
        type: "input",
      },
      representativeBuildingNumber: {
        value: corporatePayment.legalRepresentative.buildingNumber,
        type: "input",
      },
      representativeApartmentNumber: {
        value: corporatePayment.legalRepresentative.apartmentNumber,
        type: "input",
      },
    },
    {
      // Étape 13 - Infos représentant légal - Identification
      identificationType: {
        value: corporatePayment.legalRepresentative.idType,
        type: "dropdown",
      },
      identificationNumber: {
        value: corporatePayment.legalRepresentative.idNumber,
        type: "input",
      },
      uniqueIdentificationNumber: {
        value: corporatePayment.legalRepresentative.uniqueId,
        type: "input",
      },
    },
    {
      // Étape 14 - Documents représentant légal
      incomeJustification: {
        value: corporatePayment.legalRepresentative.documents?.incomeProof,
        type: "file",
      },
      locationMap: {
        value: corporatePayment.legalRepresentative.documents?.locationPlan,
        type: "file",
      },
      proofResidence: {
        value: corporatePayment.legalRepresentative.documents?.addressProof,
        type: "file",
      },
      birthCertificateFront: {
        value: corporatePayment.legalRepresentative.documents?.birthCertFront,
        type: "file",
      },
      birthCertificateBack: {
        value: corporatePayment.legalRepresentative.documents?.birthCertBack,
        type: "file",
      },
      Signature: {
        value: corporatePayment.legalRepresentative.documents?.signature,
        type: "signature",
      },
    },
  ];

  steps.forEach((step, index) => {
    cy.log(`Remplissage Étape ${index + 3}`);
    cy.intercept(
      "POST",
      "https://proxy-dev.afric.ca/core-client/commands/client/corporate/enrollment",
      {
        statusCode: 200,
      }
    ).as(`enrollCBRequest${index + 3}`);

    Object.entries(step).forEach(([label, { value, type }]) => {
      switch (type) {
        case "input":
          cy.fillInput(label, value);
          break;

        case "dropdown":
          cy.selectDropdownUniversal(value);
          break;

        case "toggle":
          cy.activateToggleByText(label);
          break;

        case "radio":
          cy.selectRadioByText(label);
          break;

        case "checkbox":
          cy.checkCheckboxByText(label);
          break;

        case "file":
          cy.uploadFile(label, value);
          break;

        case "signature":
          cy.signCanvas(label);
          break;

        case "textVisible":
          cy.assertTextVisible(label);
          break;

        case "secureCode":
          cy.putSecureCode(value);
          break;

        default:
          // fallback générique
          cy.findElement(label).clear().type(value, { force: true });
          break;
      }
    });

    // Continuer
    cy.clickButton("continue");
    cy.wait(`@enrollCBRequest${index + 3}`)
      .its("response.statusCode")
      .should("eq", 200);
  });
});

// Commande pour créer le mot de passe (étape finale)
Cypress.Commands.add("createPassword", (user) => {
  cy.fillInput("password", user.password);
  cy.fillInput("confirmPassword", user.password);
  cy.clickButton("continuer");
});

// =============================================
