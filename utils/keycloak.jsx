import Keycloak from "keycloak-js";

const _kc = new Keycloak({
  realm: "nano",
  url: "https://iam.ideaconsult.net/auth",
  "ssl-required": "external",
  resource: "idea-ui",
  "public-client": true,
  "confidential-port": 0,
  clientId: "idea-ui",
  tokenStore: "localStorage ",
});

export default _kc;
