import { Hono } from "hono";
import { ZeroGOpenAIGateway } from "../gateway";
import { logger } from "../logger";

export function modelsRouter(gateway: ZeroGOpenAIGateway): Hono {
	const router = new Hono();
	const log = logger.child({ module: "models-router" });

	// GET /v1/models - List available models
	router.get("/models", async (c) => {
		try {
			log.info("Received models list request");

			const models = await gateway.getModels();
			log.info({ count: models.length }, "Retrieved models");

			return c.json({
				object: "list",
				data: models.map((model) => ({
					id: model.id,
					object: "model",
					created: Math.floor(Date.now() / 1000),
					owned_by: model.provider,
				})),
			});
		} catch (error: any) {
			log.error({ error }, "Error retrieving models");

			return c.json(
				{
					error: {
						message:
							error.message || "An error occurred while retrieving models",
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
