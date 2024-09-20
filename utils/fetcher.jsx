import keycloak from "./keycloak";

const stored_token = localStorage.getItem("token")

console.log("token", keycloak.token);
console.log("stored_token", stored_token);


const fetcher = (url) => fetch(url, {
    headers: {
      Authorization: `Bearer ${stored_token}`
    }
  }).then((res) => res.json());


  export default fetcher;