import React, { useEffect, useState } from 'react';
import { useKeycloak } from '@react-keycloak/web';

const App = () => {
  const { keycloak } = useKeycloak();
  const [token, setToken] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    if (keycloak && keycloak.authenticated) {
      setIsAuthenticated(true);
      setToken(keycloak.token);

      const intervalId = setInterval(() => {
        if (keycloak.isTokenExpired(30)) {
          keycloak.updateToken(30).then((refreshed) => {
            if (refreshed) {
              console.log('Token automatically refreshed');
              setToken(keycloak.token); // Update token state
            } else {
              console.warn('Token still valid, no need to refresh');
            }
          }).catch((error) => {
            console.error('Failed to refresh token', error);
          });
        }
      }, 60000); // Check every 60 seconds

      return () => clearInterval(intervalId); // Cleanup on unmount
    }
  }, [keycloak]);

  return (
    <div>
      <h1>ReactKeycloakProvider Token Management</h1>
      {isAuthenticated ? (
        <div>
          <p>Authenticated! Token is available.</p>
          <pre>{token}</pre>
        </div>
      ) : (
        <p>Not authenticated</p>
      )}
    </div>
  );
};

export default App;
