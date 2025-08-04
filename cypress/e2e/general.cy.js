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
});
