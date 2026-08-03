package fr.cobblestar.link;

import net.fabricmc.fabric.api.event.lifecycle.v1.ServerTickEvents;
import net.fabricmc.fabric.api.networking.v1.ServerPlayConnectionEvents;
import net.minecraft.item.Item;
import net.minecraft.item.ItemStack;
import net.minecraft.registry.Registries;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.network.ServerPlayerEntity;
import net.minecraft.text.Text;
import net.minecraft.util.Formatting;
import net.minecraft.util.Identifier;
import org.slf4j.Logger;

import java.util.Set;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;

final class RewardDeliveryService {
    private static final int POLL_INTERVAL_TICKS = 100;
    private static final int MAX_ITEM_COUNT = 64;

    private final LinkApiClient api;
    private final LinkConfig config;
    private final Logger logger;
    private final Set<UUID> inFlight = ConcurrentHashMap.newKeySet();
    private int ticks;

    RewardDeliveryService(LinkApiClient api, LinkConfig config, Logger logger) {
        this.api = api;
        this.config = config;
        this.logger = logger;
    }

    void register() {
        ServerPlayConnectionEvents.JOIN.register((handler, sender, server) -> claimNext(server, handler.getPlayer()));
        ServerTickEvents.END_SERVER_TICK.register(server -> {
            ticks++;
            if (ticks < POLL_INTERVAL_TICKS) return;
            ticks = 0;
            for (ServerPlayerEntity player : server.getPlayerManager().getPlayerList()) claimNext(server, player);
        });
    }

    private void claimNext(MinecraftServer server, ServerPlayerEntity player) {
        if (!config.isReady() || !inFlight.add(player.getUuid())) return;
        UUID playerId = player.getUuid();
        CompletableFuture.supplyAsync(() -> api.claimReward(playerId.toString()))
            .whenComplete((result, error) -> server.execute(() -> {
                if (error != null || result == null || !result.success()) {
                    if (error != null) logger.warn("Impossible de consulter les livraisons de {}", playerId, error);
                    inFlight.remove(playerId);
                    return;
                }
                if (result.reward() == null) {
                    inFlight.remove(playerId);
                    return;
                }
                ServerPlayerEntity currentPlayer = server.getPlayerManager().getPlayer(playerId);
                if (currentPlayer == null) {
                    // Le bail expirera et sera repris lors de la prochaine connexion.
                    inFlight.remove(playerId);
                    return;
                }
                deliver(server, currentPlayer, result.reward());
            }));
    }

    private void deliver(MinecraftServer server, ServerPlayerEntity player, LinkApiClient.Reward reward) {
        Identifier itemIdentifier = Identifier.tryParse(reward.itemId());
        Item item = itemIdentifier == null ? null : Registries.ITEM.getOrEmpty(itemIdentifier).orElse(null);
        if (item == null || reward.itemCount() < 1 || reward.itemCount() > MAX_ITEM_COUNT) {
            logger.error("Livraison {} rejetée : objet {} x{} invalide", reward.id(), reward.itemId(), reward.itemCount());
            finishAsync(server, player.getUuid(), reward, false, "Objet ou quantité invalide");
            return;
        }

        int remaining = reward.itemCount();
        while (remaining > 0) {
            int quantity = Math.min(remaining, item.getMaxCount());
            ItemStack stack = new ItemStack(item, quantity);
            player.getInventory().insertStack(stack);
            if (!stack.isEmpty()) player.dropItem(stack, false);
            remaining -= quantity;
        }
        player.sendMessage(Text.literal("Achat CobbleStar reçu : " + reward.itemCount() + " × " + reward.itemId()).formatted(Formatting.GREEN), false);
        finishAsync(server, player.getUuid(), reward, true, null);
    }

    private void finishAsync(MinecraftServer server, UUID playerId, LinkApiClient.Reward reward, boolean delivered, String error) {
        CompletableFuture.supplyAsync(() -> delivered
                ? api.completeReward(playerId.toString(), reward)
                : api.failReward(playerId.toString(), reward, error))
            .whenComplete((confirmed, failure) -> server.execute(() -> {
                if (failure != null || !Boolean.TRUE.equals(confirmed)) {
                    logger.error("L'API n'a pas confirmé la livraison {}. Vérification administrateur requise.", reward.id(), failure);
                }
                inFlight.remove(playerId);
            }));
    }
}
