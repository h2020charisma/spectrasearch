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
      url: "http://localhost:8000/db/dataset?domain=%24FGFXL%5B_ps6M4wq%2C5jX_Fm%3EBC%3A8TocXe&values=True",
    },
    {
      fixture: "json/bk_rcapi_domain.json",
    }
  ).as("getAllSources");
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

  // it("opens and closes the sources modal window", () => {
  //   setSourcesIntercepts();
  //   cy.get('[data-cy="sources-btn"]').click();
  //   cy.get('[id="radix-:r1:"]').should("be.visible");
  //   cy.get(".selectOptionsSourses").find("*").should("exist");
  //   cy.get(".sourceItem").first().click();
  //   cy.get(".sourceItemLabel").should("be.visible");
  //   cy.get("#cleanProject").click();
  //   cy.get(".sourceItemLabel").should("not.exist");
  //   cy.get('[data-cy="ok-btn"]').click();
  //   cy.get('[id="radix-:r1:"]').should("not.exist");
  // });

  it("opens and closes the Preview modal window", () => {
    setDomainIntercepts();
    cy.get('[data-cy="preview-btn"]').first().click();
    cy.get(".chart").should("be.visible");
    cy.get(".chart").type("{esc}");
    cy.get(".chart").should("not.exist");
  });
});
