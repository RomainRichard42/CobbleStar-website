package fr.cobblestar.link;

import com.mojang.brigadier.arguments.StringArgumentType;
import com.mojang.brigadier.arguments.IntegerArgumentType;
import net.fabricmc.api.ModInitializer;
import net.fabricmc.fabric.api.command.v2.CommandRegistrationCallback;
import net.minecraft.command.argument.EntityArgumentType;
import net.minecraft.server.command.ServerCommandSource;
import net.minecraft.server.network.ServerPlayerEntity;
import net.minecraft.text.Text;
import net.minecraft.util.Formatting;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Locale;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.regex.Pattern;

import static net.minecraft.server.command.CommandManager.argument;
import static net.minecraft.server.command.CommandManager.literal;

public final class CobbleStarLinkMod implements ModInitializer {
    public static final String MOD_ID = "cobblestar_link";
    private static final Logger LOGGER = LoggerFactory.getLogger(MOD_ID);
    private static final Pattern CODE = Pattern.compile("^CS-[A-HJ-NP-Z2-9]{5}-[A-HJ-NP-Z2-9]{5}$");
    private LinkConfig config;
    private LinkApiClient api;

    @Override
    public void onInitialize() {
        config = LinkConfig.load();
        api = new LinkApiClient(config);
        if (!config.isReady()) {
            LOGGER.warn("CobbleStar Link attend une clé dans config/cobblestar-link.json");
        }

        new RewardDeliveryService(api, config, LOGGER).register();

        CommandRegistrationCallback.EVENT.register((dispatcher, registryAccess, environment) -> {
            dispatcher.register(literal("link")
                .then(argument("code", StringArgumentType.word())
                    .executes(context -> link(
                        context.getSource().getPlayerOrThrow(),
                        StringArgumentType.getString(context, "code")
                )))
            );
            dispatcher.register(literal("stars")
                .executes(context -> balance(context.getSource().getPlayerOrThrow()))
                .then(literal("balance")
                    .executes(context -> balance(context.getSource().getPlayerOrThrow())))
                .then(literal("give")
                    .requires(source -> source.hasPermissionLevel(4))
                    .then(argument("player", EntityArgumentType.player())
                        .then(argument("amount", IntegerArgumentType.integer(1, 1_000_000))
                            .executes(context -> giveStars(
                                context.getSource(),
                                EntityArgumentType.getPlayer(context, "player"),
                                IntegerArgumentType.getInteger(context, "amount")
                            )))))
            );
        });
    }

    private int link(ServerPlayerEntity player, String suppliedCode) {
        String code = suppliedCode.trim().toUpperCase(Locale.ROOT);
        if (!CODE.matcher(code).matches()) {
            player.sendMessage(Text.literal("Code invalide. Format attendu : /link CS-XXXXX-XXXXX").formatted(Formatting.RED), false);
            return 0;
        }
        if (!config.isReady()) {
            player.sendMessage(Text.literal("La liaison n'est pas encore configurée. Préviens un administrateur.").formatted(Formatting.RED), false);
            return 0;
        }

        player.sendMessage(Text.literal("Vérification de ton code CobbleStar…").formatted(Formatting.AQUA), false);
        CompletableFuture.supplyAsync(() -> api.confirm(code, player.getUuidAsString(), player.getGameProfile().getName()))
            .whenComplete((result, error) -> player.getServer().execute(() -> {
                if (error != null) {
                    LOGGER.error("Échec inattendu de la liaison pour {}", player.getUuid(), error);
                    player.sendMessage(Text.literal("La liaison a échoué. Réessaie dans un instant.").formatted(Formatting.RED), false);
                    return;
                }
                player.sendMessage(Text.literal(result.message()).formatted(result.success() ? Formatting.GREEN : Formatting.RED), false);
            }));
        return 1;
    }

    private int balance(ServerPlayerEntity player) {
        if (!config.isReady()) {
            player.sendMessage(Text.literal("Le service Stars n'est pas encore configuré.").formatted(Formatting.RED), false);
            return 0;
        }
        player.sendMessage(Text.literal("Lecture de ton solde CobbleStar…").formatted(Formatting.AQUA), false);
        CompletableFuture.supplyAsync(() -> api.balance(player.getUuidAsString()))
            .whenComplete((result, error) -> player.getServer().execute(() -> {
                if (error != null) {
                    LOGGER.error("Échec de lecture du solde pour {}", player.getUuid(), error);
                    player.sendMessage(Text.literal("Impossible de lire ton solde.").formatted(Formatting.RED), false);
                    return;
                }
                player.sendMessage(Text.literal(result.success()
                    ? "Solde CobbleStar : " + result.balance() + " Stars"
                    : result.message()).formatted(result.success() ? Formatting.YELLOW : Formatting.RED), false);
            }));
        return 1;
    }

    private int giveStars(ServerCommandSource source, ServerPlayerEntity target, int amount) {
        if (!config.isReady()) {
            source.sendError(Text.literal("Le service Stars n'est pas encore configuré."));
            return 0;
        }
        String requestId = UUID.randomUUID().toString();
        source.sendFeedback(() -> Text.literal("Crédit de " + amount + " Stars pour " + target.getGameProfile().getName() + "…").formatted(Formatting.AQUA), false);
        CompletableFuture.supplyAsync(() -> api.giveStars(target.getUuidAsString(), amount, requestId))
            .whenComplete((result, error) -> source.getServer().execute(() -> {
                if (error != null) {
                    LOGGER.error("Échec du crédit Stars pour {}", target.getUuid(), error);
                    source.sendError(Text.literal("Le crédit a échoué."));
                    return;
                }
                if (!result.success()) {
                    source.sendError(Text.literal(result.message()));
                    return;
                }
                source.sendFeedback(() -> Text.literal(target.getGameProfile().getName() + " possède maintenant " + result.balance() + " Stars.").formatted(Formatting.GREEN), true);
                ServerPlayerEntity currentTarget = source.getServer().getPlayerManager().getPlayer(target.getUuid());
                if (currentTarget != null) currentTarget.sendMessage(Text.literal("Un administrateur vient de créditer " + amount + " Stars. Nouveau solde : " + result.balance() + ".").formatted(Formatting.YELLOW), false);
            }));
        return 1;
    }
}
