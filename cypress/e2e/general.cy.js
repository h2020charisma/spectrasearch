/* eslint-disable no-undef */
const testURLRoot = "http://127.0.0.1:50722/search/";
const baseURL = Cypress.env("VITE_BaseURL");

import { ann } from "../fixtures/json/ann_params";

function setMainIntercepts() {
  cy.intercept(
    {
      method: "GET",
      url: `${baseURL}/db/query?page=0&pagesize=30`,
    },
    {
      fixture: "json/bk_rcapi_samples_generated.json",
    }
  ).as("getAllSamples");
}

function setMainInterceptsWithParams(pages, hits, ann) {
  cy.intercept(
    {
      method: "GET",
      url: `${baseURL}/db/query?page=${pages ? pages : 0}&pagesize=${
        hits ? hits : 30
      }ann=${ann ? ann : false}`,
    },
    {
      fixture: "json/bk_rcapi_samples_generated.json",
    }
  ).as("getAllSamples");
}

function setMainFreeSearchIntercepts() {
  cy.intercept(
    {
      method: "GET",
      url: `${baseURL}/db/query?q=Neon&page=0&pagesize=30`,
    },
    {
      fixture: "json/bk_rcapi_q.json",
    }
  ).as("getSamplesBySearch");
}

function setSourcesIntercepts() {
  cy.intercept(
    {
      method: "GET",
      url: `${baseURL}/db/query/sources`,
    },
    {
      fixture: "json/bk_rcapi_sources_generated.json",
    }
  ).as("getAllSources");
}

function setDomainIntercepts() {
  cy.intercept(
    {
      method: "GET",
      url: `${baseURL}/db/dataset?domain=Neon&values=True`,
    },
    {
      fixture: "json/bk_rcapi_domain.json",
    }
  ).as("getAllDomains");
}

function setSampleIntercepts() {
  cy.intercept(
    {
      method: "GET",
      url: `${baseURL}/db/query/field?name=publicname_s`,
    },
    {
      fixture: "json/bk_rcapi_publicname_s.json",
    }
  ).as("getAllSamples");
}

function setProviderIntercepts() {
  cy.intercept(
    {
      method: "GET",
      url: `${baseURL}/db/query/field?name=reference_owner_s`,
    },
    {
      fixture: "json/bk_rcapi_reference_owner_s.json",
    }
  ).as("getAllSamples");
}

function setFileUploadIntercepts() {
  cy.intercept({
    method: "POST",
    url: `${baseURL}/db/download?what=knnquery`,
  }).as("postFile");
}

function setDatasetIntercepts() {
  cy.intercept(
    {
      method: "GET",
      url: `${baseURL}/db/query/field?name=reference_s`,
    },
    {
      fixture: "json/bk_rcapi_reference_s.json",
    }
  ).as("getAllSamples");
}

function setInstrumentIntercepts() {
  cy.intercept(
    {
      method: "GET",
      url: `${baseURL}/db/query/field?name=instrument_s`,
    },
    {
      fixture: "json/bk_rcapi_instrument_s.json",
    }
  ).as("getAllSamples");
}

function setWavelenghIntercepts() {
  cy.intercept(
    {
      method: "GET",
      url: `${baseURL}/db/query/field?name=wavelength_s`,
    },
    {
      fixture: "json/bk_rcapi_wavelength_s.json",
    }
  ).as("getAllSamples");
}

function setGenericImageIntercepts() {
  cy.intercept(
    {
      method: "GET",
      url: `${testURLRoot}/blank.png`,
    },
    {
      fixture: "images/blank.png",
    }
  );
}

function setThumbnailImageIntercepts() {
  cy.intercept(
    {
      method: "GET",
      url: /\/db\/download\?what=thumbnail&domain=.*/,
    },
    {
      fixture: "images/blank.png",
    }
  );
}

describe("General site functionality", () => {
  beforeEach(() => {
    cy.visit(testURLRoot);
    setMainIntercepts();
    setGenericImageIntercepts();
    setThumbnailImageIntercepts();
  });

  it("displays the under development notice", () => {
    cy.get("#root > div > p")
      .should("have.class", "underDev")
      .and("be.visible");
  });

  it("opens and closes the sources modal window", () => {
    setSourcesIntercepts();
    cy.get('[data-cy="sources-btn"]').click();
    cy.get(".sourceName").should("be.visible");
    cy.get('[data-cy="ok-btn"]').click();
  });

  it("opens and closes the Preview modal window", () => {
    setDomainIntercepts();
    cy.get('[data-cy="preview-btn"]').first().click();
    cy.get(".chart").should("be.visible");
    cy.get(".chart").type("{esc}");
    cy.get(".chart").should("not.exist");
  });

  it("opens Free Search Widget and makes search", () => {
    setMainFreeSearchIntercepts();
    cy.get('[data-cy="free-text-search"]').click();
    cy.get("#projectSearch").type("Neon").type("{enter}");
  });

  it("opens file", () => {
    setFileUploadIntercepts();
    setMainInterceptsWithParams(0, 30, ann);
    cy.get("input[type=file]").selectFile(
      "cypress/fixtures/generic/Cal_785_SEX139.txt",
      {
        force: true,
      }
    );
  });

  it("opens Search by Sample Widget and looks for the sample", () => {
    setSampleIntercepts();
    cy.get('[data-cy="search-by-sample"]').click();
    cy.get('[data-cy="samples"]').should("be.visible");
    cy.get('[data-cy="samples"]').click();
    setMainIntercepts();
    cy.contains("Neon").click();
    cy.get(".metadataInfoValue").should("contain.text", "Neon");
    cy.get('[data-cy="close-badge-btn"]').click();
  });

  it("opens Search by Provider Widget and looks for the provider", () => {
    setProviderIntercepts();
    cy.get('[data-cy="search-by-data-provider"]').click();
    cy.get('[data-cy="providers"]').should("be.visible");
    cy.get('[data-cy="providers"]').click();
    setMainIntercepts();
    cy.contains("RRUFF").click();
    cy.get(".metadataInfoValue").should("contain.text", "RRUFF");
    cy.get('[data-cy="close-badge-btn"]').click();
  });

  it("opens Search by Dataset Widget and looks for the dataset", () => {
    setDatasetIntercepts();
    cy.get('[data-cy="search-by-dataset"]').click();
    cy.get('[data-cy="dataset"]').should("be.visible");
    cy.get('[data-cy="dataset"]').click();
    setMainIntercepts();
    cy.contains("RRUF").click();
    cy.get(".metadataInfoValue").should("contain.text", "RRUF");
    cy.get('[data-cy="close-badge-btn"]').click();
  });

  it("opens Search by Instrument Widget and looks for the instrument", () => {
    setInstrumentIntercepts();
    cy.get('[data-cy="search-by-instrument"]').click();
    cy.get('[data-cy="instruments"]').should("be.visible");
    cy.get('[data-cy="instruments"]').click();
    setMainIntercepts();
    cy.contains("RRUF").click();
    cy.get(".metadataInfoValue").should("contain.text", "RRUF");
    cy.get('[data-cy="close-badge-btn"]').click();
  });

  it("opens Search by Wavelength Widget and looks for the wavelangth", () => {
    setWavelenghIntercepts();
    cy.get('[data-cy="search-by-wavelenth"]').click();
    cy.get('[data-cy="wavelengths"]').should("be.visible");
    cy.get('[data-cy="wavelengths"]').click();
    // setMainIntercepts();
    // cy.contains("RRUF").click();
    // cy.get(".metadataInfoValue").should("contain.text", "RRUF");
    // cy.get('[data-cy="close-badge-btn"]').click();
  });

  it("opens Pages Widget and increase page number", () => {
    setMainInterceptsWithParams(1, 31);
    cy.get('[data-cy="pages"]').click();
    cy.get('[data-cy="Pages-input"]').type("{uparrow}");
    cy.get('[data-cy="Numbers of Hits-input"]').type("{uparrow}");
  });
});
