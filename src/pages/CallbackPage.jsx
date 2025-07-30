import { useEffect } from "react";
import { useAuth } from "react-oidc-context";

export default function CallbackPage() {
  const auth = useAuth();

  useEffect(() => {
    auth.signinRedirectCallback().then((user) => {
      const returnUrl = user?.state?.returnUrl || "/";
      window.location.replace(returnUrl);
    });
  }, [auth]);

  return <div>Completing login...</div>;
}
