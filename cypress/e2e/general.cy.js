/* eslint-disable no-undef */
const testURLRoot = "http://127.0.0.1:50722/search/";

function setMainIntercepts() {
  cy.intercept(
    {
      method: "GET",
      url: "http://127.0.0.1:8000/db/query?page=0&pagesize=30",
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
      url: "http://127.0.0.1:8000/db/query/sources",
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
      url: "http://127.0.0.1:8000/db/dataset?domain=%2FRRUF%2FAnatase__R060277-3__Raman__514__0__ccw__Raman_Data_Processed__14960.nxs%23%2FR060277%20Anatase_RRUF-4c1d6889-f9f1-5657-a80d-5738b50c4f9f%2FPROCESSED%2FR060277%20Anatase_1&values=True",
    },
    {
      fixture: "json/bk_rcapi_domain.json",
    }
  ).as("getAllSources");
}

describe("General site functionality", () => {
  beforeEach(() => {
    setMainIntercepts();
    cy.visit(testURLRoot);
  });

  it("displays the under development notice", () => {
    cy.get("#root > div > p")
      .should("have.class", "underDev")
      .and("be.visible");
  });

  it("opens and closes the sources modal window", () => {
    setSourcesIntercepts();
    cy.get('[data-cy="sources-btn"]').click();
    cy.get('[id="radix-:r1:"]').should("be.visible");
    cy.get(".selectOptionsSourses").find("*").should("exist");
    cy.get(".sourceItem").first().click();
    cy.get(".sourceItemLabel").should("be.visible");
    cy.get("#cleanProject").click();
    cy.get(".sourceItemLabel").should("not.exist");
    cy.get('[data-cy="ok-btn"]').click();
    cy.get('[id="radix-:r1:"]').should("not.exist");
  });

  it("opens and closes the domain modal window", () => {
    setDomainIntercepts();
    cy.get('[data-cy="preview-btn"]').first().click();
    // cy.get('[id="radix-:r1:"]').should("be.visible");
    // cy.get(".selectOptionsDomain").find("*").should("exist");
    // cy.get(".domainItem").first().click();
    // cy.get(".domainItemLabel").should("be.visible");
    // cy.get("#cleanProject").click();
    // cy.get(".domainItemLabel").should("not.exist");
    // cy.get('[data-cy="ok-btn"]').click();
    // cy.get('[id="radix-:r1:"]').should("not.exist");
  });
});
