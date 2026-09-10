package net.ideaconsult.spectrasearch;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.io.IOException;
import java.io.InputStream;

import org.junit.jupiter.api.Test;

class RuntimeConfigTest {
    private final ClassLoader classLoader = Thread.currentThread().getContextClassLoader();

    @Test
    void loadsAnAlternatePackagedProfileWithoutChangingItsBytes() throws IOException {
        byte[] expected;
        try (InputStream input = classLoader.getResourceAsStream("META-INF/resources/configs/plastic.json")) {
            expected = input.readAllBytes();
        }

        assertArrayEquals(expected, RuntimeConfig.loadProfile("plastic.json", classLoader));
    }

    @Test
    void rejectsInvalidAndMissingProfileNames() {
        assertThrows(IllegalStateException.class,
                () -> RuntimeConfig.loadProfile("../spectra.json", classLoader));
        assertThrows(IllegalStateException.class,
                () -> RuntimeConfig.loadProfile("missing.json", classLoader));
        assertThrows(IllegalStateException.class,
                () -> RuntimeConfig.loadProfile("spectra", classLoader));
    }
}
