package fr.cobblestar.link;

import net.fabricmc.fabric.api.event.lifecycle.v1.ServerLifecycleEvents;
import net.fabricmc.fabric.api.event.lifecycle.v1.ServerTickEvents;
import net.fabricmc.loader.api.FabricLoader;
import net.minecraft.server.MinecraftServer;
import org.slf4j.Logger;
import java.io.IOException;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.atomic.AtomicBoolean;

final class PurchaseAnnouncementService {
    private final LinkApiClient api;
    private final LinkConfig config;
    private final Logger logger;
    private final AtomicBoolean inFlight = new AtomicBoolean();
    private PurchaseAnnouncementLedger ledger;
    private volatile boolean running;
    private int ticks;
    private long nextAttempt, warningAt;

    PurchaseAnnouncementService(LinkApiClient api, LinkConfig config, Logger logger) {
        this.api = api; this.config = config; this.logger = logger;
    }

    void register() {
        ServerLifecycleEvents.SERVER_STARTED.register(server -> {
            if (!config.isReady() || !server.isOnlineMode()) return;
            try {
                ledger = new PurchaseAnnouncementLedger(FabricLoader.getInstance().getConfigDir().resolve("cobblestar-stars-announcements.json"));
                running = true;
                logger.info("Annonces Stars prêtes : paiements réels confirmés uniquement.");
            } catch (IOException exception) {
                logger.error("Journal des annonces Stars illisible : annonces suspendues, crédits conservés. Restaurer le journal sans le supprimer.");
            }
        });
        ServerLifecycleEvents.SERVER_STOPPING.register(server -> running = false);
        ServerTickEvents.END_SERVER_TICK.register(server -> {
            if (++ticks < 100) return;
            ticks = 0;
            // No network polling when nobody can read the announcement; queue stays on the API.
            if (!running || server.getPlayerManager().getPlayerList().isEmpty() || System.currentTimeMillis() < nextAttempt
                    || !inFlight.compareAndSet(false, true)) return;
            CompletableFuture.supplyAsync(() -> api.claimAnnouncement(config.serverId))
                .whenComplete((result, error) -> {
                    if (!running) { inFlight.set(false); return; }
                    server.execute(() -> receive(server, result, error));
                });
        });
    }

    private void receive(MinecraftServer server, LinkApiClient.AnnouncementResult result, Throwable error) {
        if (!running || error != null || result == null || !result.success()) {
            warn(); inFlight.set(false); return;
        }
        PurchaseAnnouncement announcement = result.announcement();
        if (announcement == null || server.getPlayerManager().getPlayerList().isEmpty()) { inFlight.set(false); return; }
        try {
            if (!ledger.contains(announcement.id())) {
                // Persist before broadcasting so an acknowledgement loss cannot repeat chat.
                // A crash in this tiny gap can suppress a notice; Stars remain credited independently.
                ledger.mark(announcement.id(), System.currentTimeMillis());
                server.getPlayerManager().broadcast(PurchaseAnnouncementMessage.build(announcement.minecraftUsername(), announcement.stars()), false);
                logger.info("Annonce Stars affichée pour la commande {}.", announcement.id());
            }
        } catch (IOException exception) {
            warn(); inFlight.set(false); return;
        }
        CompletableFuture.supplyAsync(() -> api.completeAnnouncement(config.serverId, announcement))
            .whenComplete((completed, failure) -> {
                if (!running) { inFlight.set(false); return; }
                server.execute(() -> {
                    if (failure != null || !Boolean.TRUE.equals(completed)) warn();
                    inFlight.set(false);
                });
            });
    }

    private void warn() {
        nextAttempt = System.currentTimeMillis() + 60_000;
        if (System.currentTimeMillis() < warningAt) return;
        warningAt = nextAttempt;
        logger.warn("Annonces Stars : synchronisation indisponible, nouvelle tentative dans une minute. Aucun crédit n'est rejoué.");
    }
}
