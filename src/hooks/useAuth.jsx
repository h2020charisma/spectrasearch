import { useEffect, useState, useRef } from "react"
import Keycloak from "keycloak-js"

const client = new Keycloak({

    "realm": "nano",
    "url": "https://iam.ideaconsult.net/auth",
    "ssl-required": "external",
    "resource": "idea-ui",
    "public-client": true,
    "confidential-port": 0,
    "clientId": 'nano'

})

// const useAuth = () => {
//     const isRun = useRef(false)
//     const [isLogin, setIsLoging] = useState(false)

//     useEffect(() => {
//         if (isRun.current) return

//         isRun.current = true;
//         client.init({ onLoad: "login-required" }).then((res) => setIsLoging(res))
//     }, [])
//     return isLogin

// }

const doLogin = () => client.init({ onLoad: "login-required" }).then((res) => setIsLoging(res));

export default doLogin;