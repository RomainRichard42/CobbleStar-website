package fr.cobblestar.link;

import com.google.gson.Gson;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Map;
import java.util.UUID;

public final class PurchaseAnnouncementChecks {
    private static void check(boolean condition, String message) { if (!condition) throw new AssertionError(message); }

    public static void main(String[] args) throws Exception {
        String id = UUID.randomUUID().toString(), uuid = "a".repeat(32), token = "b".repeat(32);
        var notice = new PurchaseAnnouncement(id, uuid, "LhShiroe", 1100, token);
        for (String name : new String[]{"§cPirate", "Nom\nAutre", "x".repeat(17)}) {
            try { new PurchaseAnnouncement(id, uuid, name, 1100, token); throw new AssertionError("Accepted injected name"); }
            catch (IllegalArgumentException expected) { }
        }
        try { new PurchaseAnnouncement(id, uuid, "LhShiroe", -1, token); throw new AssertionError("Accepted invalid Stars"); }
        catch (IllegalArgumentException expected) { }

        var directory = Files.createTempDirectory("cobblestar-announcement-check-");
        var file = directory.resolve("journal.json");
        var ledger = new PurchaseAnnouncementLedger(file);
        check(!ledger.contains(id), "Fresh message should be unseen");
        ledger.mark(id, System.currentTimeMillis());
        check(new PurchaseAnnouncementLedger(file).contains(id), "Restart must retain displayed notice");
        String before = Files.readString(file); ledger.mark(id, System.currentTimeMillis());
        check(Files.readString(file).equals(before), "Retry must not rewrite or redisplay saved notice");
        var unwritable = directory.resolve("blocked"); Files.writeString(unwritable, "not a directory");
        var blocked = new PurchaseAnnouncementLedger(unwritable.resolve("journal.json"));
        try { blocked.mark(id, System.currentTimeMillis()); throw new AssertionError("Ignored failed journal persistence"); }
        catch (java.io.IOException expected) { check(!blocked.contains(id), "Failed persistence cannot consume a notice"); }
        Files.writeString(file, "invalid json");
        try { new PurchaseAnnouncementLedger(file); throw new AssertionError("Corrupt journal was silently discarded"); }
        catch (java.io.IOException expected) { check(Files.readString(file).equals("invalid json"), "Corrupt journal must be preserved"); }

        var segments = PurchaseAnnouncementMessage.segments(notice.minecraftUsername(), notice.stars());
        String text = segments.stream().map(PurchaseAnnouncementMessage.Segment::text).collect(java.util.stream.Collectors.joining());
        check(text.equals("✦ COBBLESTAR\nLhShiroe vient de recharger 1 100 Stars !\nMerci de soutenir le serveur ! ♥"), "Unexpected public text");
        check(segments.get(0).bold(), "Brand should be bold");
        check(segments.get(1).color() == 0xB496EF, "Player should be purple");
        check(segments.get(3).color() == 0xF5C469, "Stars should be gold");
        check(segments.get(5).link(), "Footer should open the boutique");
        check(PurchaseAnnouncementMessage.segments("§cInjected", 500).get(1).text().equals("Un dresseur"), "Fallback must not contain formatting injection");
        check(!text.contains("€") && !text.contains(uuid) && !text.contains(token), "Private data leaked");
        if (args.length > 0) {
            var reportSegments = new ArrayList<Map<String, Object>>();
            for (var part : segments) reportSegments.add(Map.of("text", part.text(), "color", String.format("#%06X", part.color()), "bold", part.bold()));
            Path report = Path.of(args[0]); Files.createDirectories(report.getParent()); Files.writeString(report, new Gson().toJson(reportSegments));
        }
        System.out.println("Purchase announcements: validation, durable deduplication, failed writes, corrupt journal, public text and colors passed.");
    }
}
