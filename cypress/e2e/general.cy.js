/* eslint-disable no-undef */
const testURLRoot = "http://127.0.0.1:50722/search/";

function setMainIntercepts() {
  cy.intercept(
    {
      method: "GET",
      url: "http://localhost:8000/db/query?page=0&pagesize=30",
    },
    {
      fixture: "json/bk_rcapi_samples_generated.json",
    }
  ).as("getAllSamples");
}

function setSourcesIntercepts() {
  cy.intercept(
    {
      method: "GET",
      url: "http://localhost:8000/db/query/sources",
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
      url: "http://localhost:8000/db/dataset?domain=Neon&values=True",
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
      url: "http://localhost:8000/db/query/field?name=publicname_s",
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
      url: "http://localhost:8000/db/query/field?name=reference_owner_s",
    },
    {
      fixture: "json/bk_rcapi_reference_owner_s.json",
    }
  ).as("getAllSamples");
}

describe("General site functionality", () => {
  beforeEach(() => {
    cy.visit(testURLRoot);
    setMainIntercepts();
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
    cy.get(".sourceName").click();
    cy.get(".sourceNameLabel").should("contain.text", "charisma");
    cy.get('[data-cy="ok-btn"]').click();
    // setMainIntercepts();
  });

  it("opens and closes the Preview modal window", () => {
    setDomainIntercepts();
    cy.get('[data-cy="preview-btn"]').first().click();
    cy.get(".chart").should("be.visible");
    cy.get(".chart").type("{esc}");
    cy.get(".chart").should("not.exist");
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
});
