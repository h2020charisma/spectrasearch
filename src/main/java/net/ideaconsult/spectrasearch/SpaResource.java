package net.ideaconsult.spectrasearch;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;

import io.quarkus.runtime.Startup;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

@Startup
@ApplicationScoped
@Path("/")
public class SpaResource {
    private final byte[] index = loadIndex();

    @GET
    @Produces(MediaType.TEXT_HTML)
    public Response root() {
        return index();
    }

    @GET
    @Path("{route:(?i:predictions|substance|collection|imports|callback)}")
    @Produces(MediaType.TEXT_HTML)
    public Response exactRoute() {
        return index();
    }

    @GET
    @Path("{viewer:(?i:h5web|nexus-overview)}/{domain}")
    @Produces(MediaType.TEXT_HTML)
    public Response viewerRoute() {
        return index();
    }

    @GET
    @Path("{viewer:(?i:h5web|nexus-overview)}/{domain}/{tail:.*}")
    @Produces(MediaType.TEXT_HTML)
    public Response viewerRouteWithTail() {
        return index();
    }

    @GET
    @Path("{route:(?i:predictions)}/{id}")
    @Produces(MediaType.TEXT_HTML)
    public Response predictionRoute() {
        return index();
    }

    @GET
    @Path("{route:(?i:predictions)}/{id}/{tail:.*}")
    @Produces(MediaType.TEXT_HTML)
    public Response predictionRouteWithTail() {
        return index();
    }

    @GET
    @Path("{route:(?i:hits)}/{hitId}")
    @Produces(MediaType.TEXT_HTML)
    public Response hitRoute() {
        return index();
    }

    @GET
    @Path("{route:(?i:hits)}/{hitId}/{tail:.*}")
    @Produces(MediaType.TEXT_HTML)
    public Response hitRouteWithTail() {
        return index();
    }

    private Response index() {
        return Response.ok(index, MediaType.TEXT_HTML_TYPE)
                .header("Cache-Control", "no-cache")
                .build();
    }

    private static byte[] loadIndex() {
        try (InputStream input = SpaResource.class.getResourceAsStream("/META-INF/resources/index.html")) {
            if (input == null) {
                throw new IllegalStateException("Classpath index.html not found; run the Vite build before Maven");
            }
            return input.readAllBytes();
        } catch (IOException exception) {
            throw new UncheckedIOException("Cannot load classpath index.html", exception);
        }
    }
}
