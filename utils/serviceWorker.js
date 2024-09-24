import keycloak from "./keycloak";

const token = keycloak.token

self.addEventListener('fetch', (e) => {
    var url = new URL(e.request.url);
    if (
        url.origin.endsWith(".ideaconsult.net")
        && (e.request.destination === 'image')         
        && isGeneratedImage(url)
        && url.origin.startsWith("https://")
        && (url.origin !== "https://iam.ideaconsult.net")
        && (url.origin !== "https://idp.ideaconsult.net")
        && (e.request.method == "GET") 
        && (e.request.headers["Authorization"] == undefined)) {
        e.respondWith(token.then((value) => {
            var _headers = {};
            var header = "Bearer "+value;
            _headers["Authorization"] = header;
            const newRequest = new Request(e.request, {
                headers : {"Authorization" : header},
                mode: "cors"
            });
            return fetch(newRequest); 

        }) )
    } else {
        return fetch(e.request);
    }    
});
