package net.ideaconsult.spectrasearch;

import java.io.ByteArrayOutputStream;
import java.nio.ByteBuffer;
import java.nio.charset.CharacterCodingException;
import java.nio.charset.CodingErrorAction;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.regex.Pattern;

import io.quarkus.vertx.web.RouteFilter;
import io.vertx.ext.web.RoutingContext;

public class MalformedPathFilter {
    private static final Pattern DOT_SEGMENT = Pattern.compile("(?:^|/|%2f)(?:\\.|%2e){1,2}(?=$|/|%2f)");

    @RouteFilter(100)
    void rejectMalformedPaths(RoutingContext context) {
        String uri = context.request().uri();
        String rawPath = uri.substring(0, uri.indexOf('?') >= 0 ? uri.indexOf('?') : uri.length())
                .toLowerCase(Locale.ROOT);

        if (hasInvalidEncoding(rawPath) || DOT_SEGMENT.matcher(rawPath).find()
                || rawPath.contains("//") || rawPath.indexOf(';') >= 0 || rawPath.contains("%3b")
                || rawPath.indexOf('\\') >= 0 || rawPath.contains("%5c")
                || rawPath.indexOf('\0') >= 0 || rawPath.contains("%00")) {
            context.response().setStatusCode(404).end();
            return;
        }

        context.next();
    }

    private static boolean hasInvalidEncoding(String rawPath) {
        ByteArrayOutputStream bytes = new ByteArrayOutputStream(rawPath.length());
        for (int index = 0; index < rawPath.length();) {
            char current = rawPath.charAt(index);
            if (current == '%') {
                if (index + 2 >= rawPath.length()
                        || Character.digit(rawPath.charAt(index + 1), 16) < 0
                        || Character.digit(rawPath.charAt(index + 2), 16) < 0) {
                    return true;
                }
                bytes.write(Integer.parseInt(rawPath.substring(index + 1, index + 3), 16));
                index += 3;
                continue;
            }

            int codePoint = rawPath.codePointAt(index);
            bytes.writeBytes(new String(Character.toChars(codePoint)).getBytes(StandardCharsets.UTF_8));
            index += Character.charCount(codePoint);
        }

        try {
            StandardCharsets.UTF_8.newDecoder()
                    .onMalformedInput(CodingErrorAction.REPORT)
                    .onUnmappableCharacter(CodingErrorAction.REPORT)
                    .decode(ByteBuffer.wrap(bytes.toByteArray()));
            return false;
        } catch (CharacterCodingException exception) {
            return true;
        }
    }
}
