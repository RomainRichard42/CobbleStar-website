package fr.cobblestar.link;

import com.google.gson.Gson;
import com.google.gson.JsonParser;
import java.io.IOException;
import java.nio.file.AtomicMoveNotSupportedException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.HashMap;
import java.util.Map;

/** Persist before display: retries/restarts may acknowledge, but never repeat a saved message. */
final class PurchaseAnnouncementLedger {
    private static final long RETENTION_MS = 8 * 86_400_000L; // API only leases the preceding seven days.
    private final Path file;
    private final Map<String, Long> displayed = new HashMap<>();

    PurchaseAnnouncementLedger(Path file) throws IOException {
        this.file = file;
        if (!Files.exists(file)) return;
        if (Files.size(file) > 2_000_000) throw new IOException("Announcement journal exceeds limit");
        try (var reader = Files.newBufferedReader(file)) {
            var root = JsonParser.parseReader(reader).getAsJsonObject();
            if (root.size() > 20_000) throw new IOException("Announcement journal exceeds limit");
            for (var entry : root.entrySet()) {
                if (!entry.getKey().matches("[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}")) throw new IOException("Invalid announcement journal");
                long timestamp = entry.getValue().getAsLong();
                if (timestamp < 0) throw new IOException("Invalid announcement journal");
                displayed.put(entry.getKey(), timestamp);
            }
        } catch (RuntimeException exception) {
            throw new IOException("Invalid announcement journal", exception);
        }
    }

    boolean contains(String id) { return displayed.containsKey(id); }

    void mark(String id, long now) throws IOException {
        if (displayed.containsKey(id)) return;
        Map<String, Long> next = new HashMap<>(displayed);
        next.entrySet().removeIf(entry -> entry.getValue() < now - RETENTION_MS);
        if (next.size() >= 20_000) throw new IOException("Announcement journal full");
        next.put(id, now);
        Files.createDirectories(file.getParent());
        Path temporary = Files.createTempFile(file.getParent(), "stars-announcements-", ".tmp");
        try {
            Files.writeString(temporary, new Gson().toJson(next));
            try { Files.move(temporary, file, StandardCopyOption.ATOMIC_MOVE, StandardCopyOption.REPLACE_EXISTING); }
            catch (AtomicMoveNotSupportedException exception) { Files.move(temporary, file, StandardCopyOption.REPLACE_EXISTING); }
            displayed.clear(); displayed.putAll(next);
        } finally { Files.deleteIfExists(temporary); }
    }
}
