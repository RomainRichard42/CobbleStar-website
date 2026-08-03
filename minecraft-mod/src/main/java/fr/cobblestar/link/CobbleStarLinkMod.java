package fr.cobblestar.link;

import com.mojang.brigadier.arguments.StringArgumentType;
import net.fabricmc.api.ModInitializer;
import net.fabricmc.fabric.api.command.v2.CommandRegistrationCallback;
import net.minecraft.server.network.ServerPlayerEntity;
import net.minecraft.text.Text;
import net.minecraft.util.Formatting;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Locale;
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

        CommandRegistrationCallback.EVENT.register((dispatcher, registryAccess, environment) ->
            dispatcher.register(literal("link")
                .then(argument("code", StringArgumentType.word())
                    .executes(context -> link(
                        context.getSource().getPlayerOrThrow(),
                        StringArgumentType.getString(context, "code")
                    )))
            )
        );
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
}
