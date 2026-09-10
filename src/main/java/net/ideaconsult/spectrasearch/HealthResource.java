package net.ideaconsult.spectrasearch;

import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

@Path("/health")
public class HealthResource {
    @GET
    public Response health() {
        return Response.ok("{\"status\":\"UP\"}", MediaType.APPLICATION_JSON_TYPE)
                .header("Cache-Control", "no-store")
                .build();
    }
}
