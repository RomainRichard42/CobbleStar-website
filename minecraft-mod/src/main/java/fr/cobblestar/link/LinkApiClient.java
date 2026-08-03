package fr.cobblestar.link;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

final class LinkApiClient {
    record Result(boolean success, String message) {}

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
        String body = "{\"code\":\"" + code + "\",\"uuid\":\"" + uuid + "\",\"username\":\"" + username + "\"}";
        HttpRequest request = HttpRequest.newBuilder(URI.create(config.apiUrl))
            .timeout(timeout)
            .header("Accept", "application/json")
            .header("Content-Type", "application/json")
            .header("Authorization", "Bearer " + config.serverKey)
            .POST(HttpRequest.BodyPublishers.ofString(body))
            .build();
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
}
