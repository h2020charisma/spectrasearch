package net.ideaconsult.spectrasearch;

import jakarta.inject.Inject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.core.HttpHeaders;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

@Path("/config.json")
public class RuntimeConfigResource {
    private final RuntimeConfig runtimeConfig;

    @Inject
    RuntimeConfigResource(RuntimeConfig runtimeConfig) {
        this.runtimeConfig = runtimeConfig;
    }

    @GET
    public Response config() {
        return Response.ok(runtimeConfig.content(), MediaType.APPLICATION_JSON_TYPE)
                .header(HttpHeaders.CACHE_CONTROL, "no-store")
                .build();
    }
}
