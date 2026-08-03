package fr.cobblestar.link;

import com.google.gson.Gson;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

final class LinkApiClient {
    record Result(boolean success, String message) {}
    record StarsResult(boolean success, long balance, String message) {}
    record Reward(String id, String productId, String itemId, int itemCount, String leaseToken) {}
    record RewardResult(boolean success, Reward reward, String message) {}

    private static final Gson GSON = new Gson();
    private final LinkConfig config;
    private final HttpClient client;
    private final Duration timeout;

    LinkApiClient(LinkConfig config) {
        this.config = config;
        this.timeout = Duration.ofSeconds(Math.max(3, Math.min(config.timeoutSeconds, 30)));
        this.client = HttpClient.newBuilder()
            .connectTimeout(timeout)
            .followRedirects(HttpClient.Redirect.NORMAL)
            .build();
    }

    Result confirm(String code, String uuid, String username) {
        JsonObject body = new JsonObject();
        body.addProperty("code", code);
        body.addProperty("uuid", uuid);
        body.addProperty("username", username);
        HttpRequest request = jsonRequest(config.apiUrl, body).build();
        try {
            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
            return switch (response.statusCode()) {
                case 200 -> new Result(true, "Ton compte CobbleStar est maintenant lié. Bienvenue !");
                case 404 -> new Result(false, "Ce code est invalide ou expiré. Génère-en un nouveau sur le site.");
                case 409 -> new Result(false, "Ce compte Minecraft est déjà lié à un autre compte CobbleStar.");
                case 400 -> new Result(false, "Le format du code n'est pas valide.");
                case 401 -> new Result(false, "La liaison est mal configurée côté serveur. Préviens un administrateur.");
                case 429 -> new Result(false, "Trop de tentatives. Patiente une minute avant de réessayer.");
                default -> new Result(false, "Le service de liaison est indisponible (erreur " + response.statusCode() + ").");
            };
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            return new Result(false, "La demande de liaison a été interrompue.");
        } catch (IOException | IllegalArgumentException exception) {
            return new Result(false, "Impossible de joindre le site CobbleStar. Réessaie dans un instant.");
        }
    }

    StarsResult giveStars(String uuid, int amount, String requestId) {
        JsonObject body = new JsonObject();
        body.addProperty("uuid", uuid);
        body.addProperty("amount", amount);
        body.addProperty("requestId", requestId);
        body.addProperty("reason", "Commande /stars give");
        return starsRequest("/api/internal/stars/give", body, "créditer");
    }

    StarsResult balance(String uuid) {
        HttpRequest request = authorizedRequest(endpoint("/api/internal/stars/balance?uuid=" + uuid)).GET().build();
        try {
            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() == 200) {
                JsonObject json = JsonParser.parseString(response.body()).getAsJsonObject();
                return new StarsResult(true, json.get("balance").getAsLong(), "Solde récupéré.");
            }
            if (response.statusCode() == 404) return new StarsResult(false, 0, "Ce joueur doit d'abord lier son compte avec /link.");
            return new StarsResult(false, 0, "Impossible de lire le solde (erreur " + response.statusCode() + ").");
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            return new StarsResult(false, 0, "Lecture du solde interrompue.");
        } catch (IOException | RuntimeException exception) {
            return new StarsResult(false, 0, "Impossible de joindre l'API CobbleStar.");
        }
    }

    RewardResult claimReward(String uuid) {
        JsonObject body = new JsonObject();
        body.addProperty("uuid", uuid);
        try {
            HttpResponse<String> response = client.send(jsonRequest(endpoint("/api/internal/rewards/claim"), body).build(), HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() == 204) return new RewardResult(true, null, "Aucune livraison.");
            if (response.statusCode() != 200) return new RewardResult(false, null, "Réclamation refusée (erreur " + response.statusCode() + ").");
            JsonObject reward = JsonParser.parseString(response.body()).getAsJsonObject().getAsJsonObject("reward");
            return new RewardResult(true, new Reward(
                reward.get("id").getAsString(),
                reward.get("productId").getAsString(),
                reward.get("itemId").getAsString(),
                reward.get("itemCount").getAsInt(),
                reward.get("leaseToken").getAsString()
            ), "Livraison trouvée.");
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            return new RewardResult(false, null, "Réclamation interrompue.");
        } catch (IOException | RuntimeException exception) {
            return new RewardResult(false, null, "Impossible de joindre l'API de livraison.");
        }
    }

    boolean completeReward(String uuid, Reward reward) {
        return finishReward(uuid, reward, "/complete", null);
    }

    boolean failReward(String uuid, Reward reward, String error) {
        return finishReward(uuid, reward, "/fail", error);
    }

    private StarsResult starsRequest(String path, JsonObject body, String action) {
        for (int attempt = 0; attempt < 3; attempt++) {
            try {
                HttpResponse<String> response = client.send(jsonRequest(endpoint(path), body).build(), HttpResponse.BodyHandlers.ofString());
                if (response.statusCode() == 200) {
                    JsonObject json = JsonParser.parseString(response.body()).getAsJsonObject();
                    return new StarsResult(true, json.get("balance").getAsLong(), "Stars mises à jour.");
                }
                if (response.statusCode() == 404) return new StarsResult(false, 0, "Ce joueur doit d'abord lier son compte avec /link.");
                if (response.statusCode() < 500) return new StarsResult(false, 0, "Impossible de " + action + " les Stars (erreur " + response.statusCode() + ").");
            } catch (InterruptedException exception) {
                Thread.currentThread().interrupt();
                return new StarsResult(false, 0, "Opération interrompue.");
            } catch (IOException | RuntimeException ignored) {
                // La même requestId est réutilisée : une réponse perdue ne double jamais le crédit.
            }
        }
        return new StarsResult(false, 0, "Impossible de joindre l'API CobbleStar.");
    }

    private boolean finishReward(String uuid, Reward reward, String suffix, String error) {
        JsonObject body = new JsonObject();
        body.addProperty("uuid", uuid);
        body.addProperty("leaseToken", reward.leaseToken());
        if (error != null) body.addProperty("error", error);
        for (int attempt = 0; attempt < 3; attempt++) {
            try {
                HttpResponse<String> response = client.send(jsonRequest(endpoint("/api/internal/rewards/" + reward.id() + suffix), body).build(), HttpResponse.BodyHandlers.ofString());
                if (response.statusCode() == 200) return true;
                if (response.statusCode() >= 400 && response.statusCode() < 500) return false;
            } catch (InterruptedException exception) {
                Thread.currentThread().interrupt();
                return false;
            } catch (IOException ignored) {
                // Une coupure très courte est retentée afin d'éviter une seconde livraison.
            }
        }
        return false;
    }

    private String endpoint(String path) {
        String base = config.apiBaseUrl.endsWith("/") ? config.apiBaseUrl.substring(0, config.apiBaseUrl.length() - 1) : config.apiBaseUrl;
        return base + path;
    }

    private HttpRequest.Builder authorizedRequest(String url) {
        return HttpRequest.newBuilder(URI.create(url))
            .timeout(timeout)
            .header("Accept", "application/json")
            .header("Authorization", "Bearer " + config.serverKey);
    }

    private HttpRequest.Builder jsonRequest(String url, JsonObject body) {
        return authorizedRequest(url)
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(GSON.toJson(body)));
    }
}
