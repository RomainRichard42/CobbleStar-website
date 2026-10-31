package fr.cobblestar.link;

/** Typed data only: API responses never contain commands or formatted chat. */
record PurchaseAnnouncement(String id, String minecraftUuid, String minecraftUsername, int stars, String leaseToken) {
    PurchaseAnnouncement {
        if (id == null || !id.matches("[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}")
                || minecraftUuid == null || !minecraftUuid.matches("[a-f0-9]{32}")
                || minecraftUsername != null && !minecraftUsername.matches("[A-Za-z0-9_]{1,16}")
                || stars < 1 || stars > 1_000_000
                || leaseToken == null || !leaseToken.matches("[A-Za-z0-9_-]{32}")) {
            throw new IllegalArgumentException("Invalid purchase announcement");
        }
    }
}
