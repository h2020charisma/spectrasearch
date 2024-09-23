import keycloak from "./keycloak";

const stored_token = localStorage.getItem("token")

const fetcher = async url => {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${stored_token}`
    }
  })
  if(res.status === 401 || res.status === 403) {
    try {
      await keycloak.updateToken(30);
    } catch (error) {
      console.error('Failed to refresh token:', error);
    }
  }
 
  if (!res.ok) {
    const error = new Error('An error occurred while fetching the data.')
    // Attach extra info to the error object.
    error.info = await res.json()
    error.status = res.status
    throw error
  }
 
  return res.json()
}


  export default fetcher;