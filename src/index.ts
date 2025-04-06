import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { logger as pinoLogger } from "./logger";
import { config } from "./config";
import { ZeroGOpenAIGateway } from "./gateway";
import { chatCompletionsRouter } from "./routes/chat-completions";
import { modelsRouter } from "./routes/models";

const app = new Hono();
const logger = pinoLogger.child({ module: "server" });

async function main() {
  try {
    logger.info("Initializing 0G OpenAI Gateway...");

    // Initialize the 0G OpenAI Gateway
    const gateway = await ZeroGOpenAIGateway.initialize({
      privateKey: config.privateKey,
      rpcUrl: config.rpcUrl,
      initialBalance: config.initialBalance,
    });

    logger.info("0G OpenAI Gateway initialized successfully");

    // Set up routes
    app.route("/v1/chat", chatCompletionsRouter(gateway));
    app.route("/v1", modelsRouter(gateway));

    // Health check endpoint
    app.get("/health", (c) => c.json({ status: "ok" }));

    // Start the server
    const port = config.port;
    serve({
      fetch: app.fetch,
      port,
    });

    logger.info(`Server started on port ${port}`);
  } catch (error) {
    logger.error({ error }, "Failed to initialize server");
    process.exit(1);
  }
}

main();
