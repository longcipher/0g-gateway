import { Hono } from "hono";
import { ZeroGOpenAIGateway } from "../gateway";
import { logger } from "../logger";

export function chatCompletionsRouter(gateway: ZeroGOpenAIGateway): Hono {
	const router = new Hono();
	const log = logger.child({ module: "chat-completions-router" });

	// POST /v1/chat/completions - Create a chat completion
	router.post("/completions", async (c) => {
		try {
			const body = await c.req.json();
			log.info({ body }, "Received chat completion request");

			// Validate required fields
			if (!body.model) {
				log.warn("Missing model in request");
				return c.json(
					{
						error: {
							message: "You must provide a model parameter",
							type: "invalid_request_error",
							param: "model",
							code: null,
						},
					},
					{ status: 400 },
				);
			}

			if (
				!body.messages ||
				!Array.isArray(body.messages) ||
				body.messages.length === 0
			) {
				log.warn("Missing or invalid messages in request");
				return c.json(
					{
						error: {
							message: "You must provide a messages parameter",
							type: "invalid_request_error",
							param: "messages",
							code: null,
						},
					},
					{ status: 400 },
				);
			}

			// Process the request
			const result = await gateway.createChatCompletion(
				body.model,
				body.messages,
			);
			log.info({ id: result.id }, "Chat completion successful");

			return c.json(result);
		} catch (error: any) {
			log.error({ error }, "Error processing chat completion request");

			return c.json(
				{
					error: {
						message:
							error.message || "An error occurred during chat completion",
						type: "server_error",
						param: null,
						code: null,
					},
				},
				{ status: 500 },
			);
		}
	});

	return router;
}
