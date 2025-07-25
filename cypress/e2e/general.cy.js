/* eslint-disable no-undef */
const testURLRoot = "http://127.0.0.1:50722/search/";

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

describe("General site functionality", () => {
  beforeEach(() => {
    cy.visit(testURLRoot);
  });

  it("displays the under development notice", () => {
    cy.get("#root > div > p")
      .should("have.class", "underDev")
      .and("be.visible");
  });

  it("opens and closes the sources modal window", () => {
    setSourcesIntercepts();
    cy.get('[data-cy="preferences-btn"]').click();
    cy.get('[id="radix-:r1:"]').should("be.visible");
    cy.get(".selectOptionsSourses").find("*").should("exist");
    cy.get(".sourceItem").first().click();
    cy.get(".sourceItemLabel").should("be.visible");
    cy.get("#cleanProject").click();
    cy.get(".sourceItemLabel").should("not.exist");
    cy.get('[data-cy="ok-btn"]').click();
    cy.get('[id="radix-:r1:"]').should("not.exist");
  });
});
