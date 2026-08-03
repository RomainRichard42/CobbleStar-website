package fr.cobblestar.link;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import net.fabricmc.loader.api.FabricLoader;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

final class LinkConfig {
    private static final Gson GSON = new GsonBuilder().setPrettyPrinting().create();
    private static final String PLACEHOLDER = "CHANGE_ME_WITH_THE_SAME_SECRET_AS_MINECRAFT_SERVER_KEY";

    String apiUrl = "https://api.cobblestar-mc.fr/api/internal/link/confirm";
    String apiBaseUrl = "https://api.cobblestar-mc.fr";
    String serverKey = PLACEHOLDER;
    int timeoutSeconds = 10;

    static LinkConfig load() {
        Path path = FabricLoader.getInstance().getConfigDir().resolve("cobblestar-link.json");
        try {
            if (Files.notExists(path)) {
                LinkConfig created = new LinkConfig();
                Files.createDirectories(path.getParent());
                Files.writeString(path, GSON.toJson(created) + System.lineSeparator(), StandardCharsets.UTF_8);
                return created;
            }
            LinkConfig loaded = GSON.fromJson(Files.readString(path, StandardCharsets.UTF_8), LinkConfig.class);
            return loaded == null ? new LinkConfig() : loaded;
        } catch (IOException exception) {
            throw new IllegalStateException("Impossible de lire " + path, exception);
        }
    }

    boolean isReady() {
        return apiUrl != null && apiUrl.startsWith("https://")
            && apiBaseUrl != null && apiBaseUrl.startsWith("https://")
            && serverKey != null && serverKey.length() >= 32 && !serverKey.equals(PLACEHOLDER)
            && timeoutSeconds >= 3 && timeoutSeconds <= 30;
    }
}
