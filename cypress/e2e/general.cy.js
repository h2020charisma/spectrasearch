const testURLRoot = "http://127.0.0.1:50722/search/";

describe("General site functionality", () => {
  beforeEach(() => {
    cy.visit(testURLRoot);
  });

  it("displays the under development notice", () => {
    cy.get("#root > div > p")
      .should("have.class", "underDev")
      .and("be.visible");
  });

});
