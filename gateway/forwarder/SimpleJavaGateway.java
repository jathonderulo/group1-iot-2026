import com.sun.net.httpserver.Headers;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.URI;
import java.net.URISyntaxException;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class SimpleJavaGateway {
    
    private static final int LISTEN_PORT = getEnvInt("LISTEN_PORT", 9090);
    private static final String EC2_HOST = getRequiredEnv("EC2_HOST");
    private static final int EC2_PORT = getEnvInt("EC2_PORT", 8080);
    private static final int THREAD_POOL_SIZE = 10;
    private static final String UPSTREAM_SCHEME = getEnv("UPSTREAM_SCHEME", "http");
    private static final String MAP_INGEST_TO = getEnv("MAP_INGEST_TO", ""); // set empty to disable
    
    public static void main(String[] args) {
        new SimpleJavaGateway().start();
    }
    
    public void start() {
        ExecutorService threadPool = Executors.newFixedThreadPool(THREAD_POOL_SIZE);
        HttpClient httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(5))
                .build();

        try {
            HttpServer server = HttpServer.create(new InetSocketAddress(LISTEN_PORT), 0);
            server.createContext("/", exchange -> handleExchange(exchange, httpClient));
            server.setExecutor(threadPool);
            server.start();

            System.out.println(" Java Gateway running on port " + LISTEN_PORT);
            System.out.println(" Listening on http://0.0.0.0:" + LISTEN_PORT);
            System.out.println(" Forwarding to upstream at " + UPSTREAM_SCHEME + "://" + EC2_HOST + ":" + EC2_PORT);
            if (!MAP_INGEST_TO.isBlank()) {
                System.out.println(" Mapping /ingest -> " + MAP_INGEST_TO);
            }
            System.out.println("-".repeat(60));
        } catch (IOException e) {
            threadPool.shutdown();
            throw new RuntimeException("Failed to start gateway: " + e.getMessage(), e);
        }
    }
    
    private static void handleExchange(HttpExchange exchange, HttpClient httpClient) throws IOException {
        String method = exchange.getRequestMethod();
        URI incomingUri = exchange.getRequestURI();
        String rawPath = incomingUri.getRawPath();
        String rawQuery = incomingUri.getRawQuery();

        String upstreamPath = rawPath;
        if (!MAP_INGEST_TO.isBlank() && "/ingest".equals(rawPath)) {
            upstreamPath = MAP_INGEST_TO;
        }

        URI upstreamUri;
        try {
            upstreamUri = new URI(
                    UPSTREAM_SCHEME,
                    null,
                    EC2_HOST,
                    EC2_PORT,
                    upstreamPath,
                    rawQuery,
                    null
            );
        } catch (URISyntaxException e) {
            sendText(exchange, 500, "Invalid upstream URI: " + e.getMessage());
            return;
        }

        byte[] body = readAllBytes(exchange.getRequestBody());
        System.out.println("[gateway] " + method + " " + rawPath + " -> " + upstreamUri + " bytes=" + body.length);

        HttpRequest.BodyPublisher publisher = body.length == 0
                ? HttpRequest.BodyPublishers.noBody()
                : HttpRequest.BodyPublishers.ofByteArray(body);

        HttpRequest.Builder builder = HttpRequest.newBuilder()
                .uri(upstreamUri)
                .timeout(Duration.ofSeconds(10))
                .method(method, publisher);

        copyRequestHeaders(exchange.getRequestHeaders(), builder);

        HttpResponse<byte[]> upstreamResp;
        try {
            upstreamResp = httpClient.send(builder.build(), HttpResponse.BodyHandlers.ofByteArray());
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            sendText(exchange, 502, "Upstream request interrupted");
            return;
        } catch (IOException e) {
            sendText(exchange, 502, "Upstream request failed: " + e.getMessage());
            return;
        }

        Headers outHeaders = exchange.getResponseHeaders();
        copyResponseHeaders(upstreamResp.headers().map(), outHeaders);

        byte[] respBody = upstreamResp.body() == null ? new byte[0] : upstreamResp.body();
        exchange.sendResponseHeaders(upstreamResp.statusCode(), respBody.length);
        try (OutputStream out = exchange.getResponseBody()) {
            out.write(respBody);
        } finally {
            exchange.close();
        }

        System.out.println("[gateway] <- status=" + upstreamResp.statusCode() + " bytes=" + respBody.length);
    }

    private static void copyRequestHeaders(Headers in, HttpRequest.Builder out) {
        for (Map.Entry<String, List<String>> entry : in.entrySet()) {
            String name = entry.getKey();
            if (name == null) continue;

            String lower = name.toLowerCase();
            if (lower.equals("host") || lower.equals("connection") || lower.equals("content-length") ||
                    lower.equals("transfer-encoding")) {
                continue;
            }

            for (String value : entry.getValue()) {
                if (value != null) {
                    out.header(name, value);
                }
            }
        }
    }

    private static void copyResponseHeaders(Map<String, List<String>> in, Headers out) {
        for (Map.Entry<String, List<String>> entry : in.entrySet()) {
            String name = entry.getKey();
            if (name == null) continue;

            String lower = name.toLowerCase();
            if (lower.equals("connection") || lower.equals("content-length") || lower.equals("transfer-encoding")) {
                continue;
            }

            for (String value : entry.getValue()) {
                if (value != null) {
                    out.add(name, value);
                }
            }
        }
    }

    private static void sendText(HttpExchange exchange, int status, String text) throws IOException {
        byte[] bytes = text.getBytes();
        exchange.getResponseHeaders().set("Content-Type", "text/plain; charset=utf-8");
        exchange.sendResponseHeaders(status, bytes.length);
        try (OutputStream out = exchange.getResponseBody()) {
            out.write(bytes);
        } finally {
            exchange.close();
        }
    }

    private static byte[] readAllBytes(InputStream inputStream) throws IOException {
        return inputStream.readAllBytes();
    }

    private static String getEnv(String key, String defaultValue) {
        String value = System.getenv(key);
        if (value == null || value.isBlank()) {
            return defaultValue;
        }
        return value;
    }

    private static String getRequiredEnv(String key) {
        String value = System.getenv(key);
        if (value == null || value.isBlank()) {
            throw new IllegalStateException("Missing required environment variable: " + key);
        }
        return value;
    }

    private static int getEnvInt(String key, int defaultValue) {
        String value = System.getenv(key);
        if (value == null || value.isBlank()) {
            return defaultValue;
        }
        try {
            return Integer.parseInt(value);
        } catch (NumberFormatException ignored) {
            return defaultValue;
        }
    }
}
