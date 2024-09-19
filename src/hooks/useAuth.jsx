// // index.js or App.js
// import React, { useEffect, useState } from 'react';
// import ReactDOM from 'react-dom';
// import App from './App';
// import keycloak from './keycloak';

// const Root = () => {
//   const [authenticated, setAuthenticated] = useState(false);

//   useEffect(() => {
//     const initKeycloak = async () => {
//       try {
//         const auth = await keycloak.init({
//           onLoad: 'login-required',
//           checkLoginIframe: false, // Disable iframe-based token refresh
//         });
//         setAuthenticated(auth);

//         if (auth) {
//           // Save initial token to local storage
//           localStorage.setItem('token', keycloak.token);

//           // Set up token auto-refresh
//           setInterval(async () => {
//             try {
//               const refreshed = await keycloak.updateToken(70); // Refresh token if valid for less than 70 seconds
//               if (refreshed) {
//                 console.log('Token refreshed');
//                 localStorage.setItem('token', keycloak.token); // Save new token
//               } else {
//                 console.log('Token is still valid');
//               }
//             } catch (error) {
//               console.error('Failed to refresh token', error);
//             }
//           }, 5 * 60 * 1000); // Check every 5 minutes
//         }
//       } catch (error) {
//         console.error('Keycloak initialization failed', error);
//       }
//     };

//     initKeycloak();
//   }, []);

//   return authenticated ? <App /> : <div>Loading...</div>;
// };

// ReactDOM.render(<Root />, document.getElementById('root'));
