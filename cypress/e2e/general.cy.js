const testURLRoot = "http://127.0.0.1:50722/search/";

// https://api-dev.ramanchada.ideaconsult.net/db/query?q=*&img=thumbnail&query_type=text&q_reference=*&q_provider=*&q_instrument=*&q_wavelength=*&page=0&pagesize=10

function setIntercepts() {
  cy.intercept(
    {
      method: "GET",
      url: "/db/query",
      hostname: "api-dev.ramanchada.ideaconsult.net",
    },
    {
      fixture: "json/bk_rcapi_samples_generated.json",
    }
  ).as("getAllTemplates");
}

describe("General site functionality", () => {
  beforeEach(() => {
    setIntercepts();
    cy.visit(testURLRoot);
  });

  it("displays the under development notice", () => {
    cy.get("#root > p").should("have.class", "underDev").and("be.visible");
  });
});
