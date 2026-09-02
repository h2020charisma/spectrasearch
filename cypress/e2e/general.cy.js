/* eslint-disable no-undef */
const testURLRoot = "http://127.0.0.1:50722/search/";
const baseURL = (
  Cypress.env("API_BASE_URL") || "https://spectrasearch.test.invalid/"
).replace(/\/$/, "");
const apiHostname = new URL(baseURL).hostname;

if (
  apiHostname !== "localhost" &&
  apiHostname !== "127.0.0.1" &&
  !apiHostname.endsWith(".invalid")
) {
  throw new Error("Cypress API_BASE_URL must use localhost or a .invalid domain");
}

const escapedBaseURL = baseURL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

import { ann } from "../fixtures/json/ann_params";

function setConfigIntercept() {
  cy.intercept("GET", `${testURLRoot}config.json`, {
    body: {
      apiBaseUrl: `${baseURL}/`,
      ambitUrl: "https://apps.ideaconsult.net/nanoreg1/",
      predictionsCore: "vega",
      chemicalsCore: "dsstox",
      subjectField: "dsstox_id_s",
      hsdsUrl: "https://hsds.adma.ai",
      hsdsDomain: "/qubounds",
    },
  }).as("getRuntimeConfig");
}

function setMainIntercepts() {
  cy.intercept(
    {
      method: "GET",
      url: new RegExp(`^${escapedBaseURL}/db/query\\?`),
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
      }&ann=${ann ? ann : false}`,
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

function setFileUploadIntercepts(response = {}) {
  cy.intercept(
    {
      method: "POST",
      url: `${baseURL}/db/download?what=knnquery`,
    },
    {
      statusCode: 200,
      body: {
        cdf: "test-vector",
        imageLink: `${testURLRoot}blank.png`,
        vector_field: "spectrum_p1024",
      },
      ...response,
    }
  ).as("postFile");
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
      url: `${testURLRoot}blank.png`,
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

describe("Search source discovery", () => {
  beforeEach(() => {
    setConfigIntercept();
    setGenericImageIntercepts();
    setThumbnailImageIntercepts();
  });

  it("waits for discovery and includes a source in the first query", () => {
    const queryUrls = [];

    cy.intercept("GET", `${baseURL}/db/query/sources`, {
      fixture: "json/bk_rcapi_sources_generated.json",
      delay: 300,
    }).as("getDelayedSources");
    cy.intercept(
      "GET",
      new RegExp(`^${escapedBaseURL}/db/query\\?`),
      (request) => {
        queryUrls.push(request.url);
        request.reply({ fixture: "json/bk_rcapi_samples_generated.json" });
      }
    ).as("getFirstSearch");

    cy.visit(testURLRoot);
    cy.wait("@getDelayedSources");
    cy.wait("@getFirstSearch").then(({ request }) => {
      const url = new URL(request.url);
      expect(url.searchParams.getAll("data_source")).to.deep.equal([
        "charisma",
      ]);
      expect(queryUrls).to.have.length(1);
    });
  });

  it("shows a discovery failure without making a source-less query", () => {
    let queryCount = 0;

    cy.intercept("GET", `${baseURL}/db/query/sources`, {
      statusCode: 503,
      body: {},
    }).as("getFailedSources");
    cy.intercept("GET", new RegExp(`^${escapedBaseURL}/db/query\\?`), () => {
      queryCount += 1;
    });

    cy.visit(testURLRoot);
    cy.wait("@getFailedSources");
    cy.contains(
      ".ToastTitle",
      "There is a problem connecting to the data backend server."
    ).should("be.visible");
    cy.get(".imagePlaceholderWrap").should("not.exist");
    cy.then(() => {
      expect(queryCount).to.equal(0);
    });
  });
});

describe("General site functionality", () => {
  beforeEach(() => {
    setConfigIntercept();
    setSourcesIntercepts();
    setMainIntercepts();
    setGenericImageIntercepts();
    setThumbnailImageIntercepts();
    cy.visit(testURLRoot);
    cy.wait(["@getRuntimeConfig", "@getAllSources", "@getAllSamples"]);
  });

  it("opens and closes the sources modal window", () => {
    cy.get('[data-cy="sources-btn"]').click();
    cy.get(".DialogHeader").should("be.visible");
    cy.get('[data-cy="ok-btn"]').click();
  });

  // it("opens and closes the Preview modal window", () => {
  //   setDomainIntercepts();
  //   cy.get('[data-cy="preview-btn"]').first().click();
  //   cy.get(".chart").should("be.visible");
  //   cy.get(".chart").type("{esc}");
  //   cy.get(".chart").should("not.exist");
  // });

  it("opens Free Search Widget and makes search", () => {
    setMainFreeSearchIntercepts();
    cy.get('[data-cy="free-text-search"]').click();
    cy.get("#projectSearch").type("Neon").type("{enter}");
  });

  it("uploads, removes, and reselects a file", () => {
    setFileUploadIntercepts();
    setMainInterceptsWithParams(0, 30, ann);
    cy.get("input[type=file]").selectFile(
      "cypress/fixtures/generic/Cal_785_SEX139.txt",
      {
        force: true,
      }
    );
    cy.wait("@postFile");
    cy.get("@postFile.all").should("have.length", 1);
    cy.get(".closeBtn").click();
    cy.get("input[type=file]").should("have.value", "");
    cy.get("input[type=file]").selectFile(
      "cypress/fixtures/generic/Cal_785_SEX139.txt",
      { force: true }
    );
    cy.wait("@postFile");
    cy.get("@postFile.all").should("have.length", 2);
  });

  it("handles a rejected file upload without exposing backend details", () => {
    setFileUploadIntercepts({
      statusCode: 400,
      body: {
        detail:
          'Traceback (most recent call last):\n  File "/internal/server/path.py", line 42\nUnsupportedFileTypeError',
      },
    });
    cy.get("input[type=file]").selectFile(
      "cypress/fixtures/images/blank.png",
      { force: true }
    );
    cy.wait("@postFile");
    cy.get('.notRightFile[role="alert"]').should(
      "have.text",
      "The file couldn't be processed. Its format may not be supported, or its contents may be invalid or damaged. Check the file and try again."
    );
    cy.get("body").should("not.contain.text", "Traceback");
    cy.get("body").should("not.contain.text", "/internal/server/path.py");
    cy.get(".fileNameStr").should("not.exist");
    cy.get(".closeBtn").should("not.exist");
    cy.get(".uploadPlaceholder").should("not.exist");
    cy.get(".searchOptions").should("not.exist");
    cy.get(".imageUploded").should("not.exist");
    cy.get("input[type=file]").should("have.value", "");
    cy.get("@postFile.all").should("have.length", 1);
  });

  // it("opens Search by Data-provider and looks for the domain", () => {
  //   setProviderIntercepts();
  //   cy.get('[data-cy="data-provider"]').click();
  //   // cy.get('[data-cy="domains"]').should("be.visible");
  //   // cy.get('[data-cy="domains"]').click();
  //   // setMainIntercepts();
  //   // cy.contains("Neon").click();
  //   // cy.get(".metadataInfoValue").should("contain.text", "Neon");
  //   // cy.get('[data-cy="close-badge-btn"]').click();
  // });

  // it("opens Search by Sample Widget and looks for the sample", () => {
  //   setSampleIntercepts();
  //   cy.get('[data-cy="search-by-sample"]').click();
  //   cy.get('[data-cy="samples"]').should("be.visible");
  //   cy.get('[data-cy="samples"]').click();
  //   setMainIntercepts();
  //   cy.contains("Neon").click();
  //   cy.get(".metadataInfoValue").should("contain.text", "Neon");
  //   cy.get('[data-cy="close-badge-btn"]').click();
  // });

  // it("opens Search by Provider Widget and looks for the provider", () => {
  //   setProviderIntercepts();
  //   cy.get('[data-cy="search-by-data-provider"]').click();
  //   cy.get('[data-cy="providers"]').should("be.visible");
  //   cy.get('[data-cy="providers"]').click();
  //   setMainIntercepts();
  //   cy.contains("RRUFF").click();
  //   cy.get(".metadataInfoValue").should("contain.text", "RRUFF");
  //   cy.get('[data-cy="close-badge-btn"]').click();
  // });

  // it("opens Search by Dataset Widget and looks for the dataset", () => {
  //   setDatasetIntercepts();
  //   cy.get('[data-cy="search-by-dataset"]').click();
  //   cy.get('[data-cy="dataset"]').should("be.visible");
  //   cy.get('[data-cy="dataset"]').click();
  //   setMainIntercepts();
  //   cy.contains("RRUF").click();
  //   cy.get(".metadataInfoValue").should("contain.text", "RRUF");
  //   cy.get('[data-cy="close-badge-btn"]').click();
  // });

  // it("opens Search by Instrument Widget and looks for the instrument", () => {
  //   setInstrumentIntercepts();
  //   cy.get('[data-cy="search-by-instrument"]').click();
  //   cy.get('[data-cy="instruments"]').should("be.visible");
  //   cy.get('[data-cy="instruments"]').click();
  //   setMainIntercepts();
  //   cy.contains("RRUF").click();
  //   cy.get(".metadataInfoValue").should("contain.text", "RRUF");
  //   cy.get('[data-cy="close-badge-btn"]').click();
  // });

  // it("opens Search by Wavelength Widget and looks for the wavelangth", () => {
  //   setWavelenghIntercepts();
  //   cy.get('[data-cy="search-by-method"]').click();
  //   cy.get('[data-cy="methods"]').should("be.visible");
  //   cy.get('[data-cy="methods"]').click();
  //   // setMainIntercepts();
  //   // cy.contains("RRUF").click();
  //   // cy.get(".metadataInfoValue").should("contain.text", "RRUF");
  //   // cy.get('[data-cy="close-badge-btn"]').click();
  // });

  // it("opens Pages Widget and increase page number", () => {
  //   setMainInterceptsWithParams(1, 31);
  //   cy.get('[data-cy="pages"]').click();
  //   cy.get('[data-cy="Pages-input"]').type("{uparrow}");
  //   cy.get('[data-cy="Numbers of Hits-input"]').type("{uparrow}");
  // });
});
