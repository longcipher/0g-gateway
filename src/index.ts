import { Hono } from "hono";
import { logger as pinoLogger } from "./logger";
import { config } from "./config";
import { ZeroGOpenAIGateway } from "./gateway";
import { chatCompletionsRouter } from "./routes/chat-completions";
import { modelsRouter } from "./routes/models";

// Create Hono application instance
const app = new Hono();
const logger = pinoLogger.child({ module: "server" });

// Initialize gateway
let gateway;

// Immediately invoked async function for initialization
(async () => {
  try {
    logger.info("Initializing 0G OpenAI Gateway...");
    
    gateway = await ZeroGOpenAIGateway.initialize({
      privateKey: config.privateKey,
      rpcUrl: config.rpcUrl,
      initialBalance: config.initialBalance,
      providerAddress: config.providerAddress,
      maxRetries: config.maxRetries,
    });
    
    logger.info("0G OpenAI Gateway initialized successfully");
    
    // Set up routes
    app.route("/v1/chat", chatCompletionsRouter(gateway));
    app.route("/v1", modelsRouter(gateway));
    
    // Health check endpoint
    app.get("/health", (c) => c.json({ status: "ok" }));
    
    // Log route information
    app.routes.forEach((route) => {
      logger.info(`Route: ${route.method} ${route.path}`);
    });
    
    logger.info("All routes registered successfully");
  } catch (error) {
    logger.error({ error }, "Failed to initialize server");
    process.exit(1);
  }
})();

// Export application with server configuration for Bun
export default {
  port: config.port,
  hostname: "0.0.0.0", // Listen on all available network interfaces
  fetch: app.fetch.bind(app)
};