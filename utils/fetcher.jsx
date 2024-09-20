import keycloak from "./keycloak";

const stored_token = localStorage.getItem("token")


const fetcher = (url) => fetch(url, {
    headers: {
      Authorization: `Bearer ${stored_token}`
    }
  }).then((res) => res.json());


  export default fetcher;