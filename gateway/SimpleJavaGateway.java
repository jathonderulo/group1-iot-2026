import java.io.*;
import java.net.*;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class SimpleJavaGateway {
    
    private static final int LISTEN_PORT = getEnvInt("LISTEN_PORT", 9090);
    private static final String EC2_HOST = getRequiredEnv("EC2_HOST");
    private static final int EC2_PORT = getEnvInt("EC2_PORT", 8080);
    private static final int THREAD_POOL_SIZE = 10;
    
    public static void main(String[] args) {
        new SimpleJavaGateway().start();
    }
    
    public void start() {
        ExecutorService threadPool = Executors.newFixedThreadPool(THREAD_POOL_SIZE);
        
        try (ServerSocket serverSocket = new ServerSocket(LISTEN_PORT)) {
            System.out.println(" Java Gateway running on port " + LISTEN_PORT);
            System.out.println(" Listening for curl requests on http://localhost:" + LISTEN_PORT);
            System.out.println(" Forwarding to EC2 at " + EC2_HOST + ":" + EC2_PORT);
            System.out.println("\n Open a new terminal and try:");
            System.out.println("   curl http://localhost:" + LISTEN_PORT + "/");
            System.out.println("   curl http://localhost:" + LISTEN_PORT + "/api");
            System.out.println("   curl http://localhost:" + LISTEN_PORT + "/db");
            System.out.println("-".repeat(50));
            
            while (true) {
                Socket clientSocket = serverSocket.accept();
                System.out.println("\n Connection from " + clientSocket.getInetAddress());
                
                // Handle each client in a thread pool thread
                threadPool.execute(new GatewayHandler(clientSocket));
            }
            
        } catch (IOException e) {
            System.err.println(" Server error: " + e.getMessage());
        } finally {
            threadPool.shutdown();
        }
    }
    
    private static class GatewayHandler implements Runnable {
        private final Socket clientSocket;
        
        public GatewayHandler(Socket clientSocket) {
            this.clientSocket = clientSocket;
        }
        
        @Override
        public void run() {
            Socket ec2Socket = null;
            
            try {
                // Set timeout on client socket
                clientSocket.setSoTimeout(5000); // 5 second timeout
                
                InputStream clientIn = clientSocket.getInputStream();
                OutputStream clientOut = clientSocket.getOutputStream();
                
                // Connect to EC2
                ec2Socket = new Socket(EC2_HOST, EC2_PORT);
                ec2Socket.setSoTimeout(5000); // 5 second timeout on EC2 socket
                
                InputStream ec2In = ec2Socket.getInputStream();
                OutputStream ec2Out = ec2Socket.getOutputStream();
                
                // Read the request from client
                byte[] request = readAllBytes(clientIn);
                String requestStr = new String(request).split("\r\n")[0];
                System.out.println(" Request: " + requestStr);
                
                // Forward to EC2
                System.out.println(" Forwarding to EC2...");
                ec2Out.write(request);
                ec2Out.flush();
                
                // Read response from EC2
                byte[] response = readAllBytes(ec2In);
                System.out.println(" Received " + response.length + " bytes from EC2");
                
                // Forward back to client
                clientOut.write(response);
                clientOut.flush();
                System.out.println(" Response forwarded to client");
                
            } catch (SocketTimeoutException e) {
                System.err.println(" Timeout: " + e.getMessage());
            } catch (IOException e) {
                System.err.println(" Error handling request: " + e.getMessage());
            } finally {
                try {
                    if (ec2Socket != null) ec2Socket.close();
                    clientSocket.close();
                } catch (IOException e) {
                    // Ignore close errors
                }
            }
        }
        
        private byte[] readAllBytes(InputStream inputStream) throws IOException {
            ByteArrayOutputStream buffer = new ByteArrayOutputStream();
            byte[] data = new byte[8192];
            int bytesRead;
            
            try {
                while ((bytesRead = inputStream.read(data)) != -1) {
                    buffer.write(data, 0, bytesRead);
                    
                    // If there's nothing left available, break
                    if (inputStream.available() == 0) {
                        break;
                    }
                }
            } catch (SocketTimeoutException e) {
                // Timeout is fine - we've read what we can
                System.out.println(" Read timeout - continuing with data received");
            }
            
            return buffer.toByteArray();
        }
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
