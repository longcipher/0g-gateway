import { ethers } from "ethers";
import {
	createZGComputeNetworkBroker,
	ZGComputeNetworkBroker,
	ServiceStructOutput,
} from "@0glabs/0g-serving-broker";
import { logger } from "./logger";

export interface ZeroGOpenAIGatewayConfig {
	privateKey: string;
	rpcUrl: string;
	initialBalance: number;
}

export class ZeroGOpenAIGateway {
	private broker: ZGComputeNetworkBroker;
	private serviceCache: Map<string, ServiceStructOutput> = new Map();

	private constructor(broker: ZGComputeNetworkBroker) {
		this.broker = broker;
	}

	/**
	 * Initialize the ZeroGOpenAIGateway
	 */
	public static async initialize(
		config: ZeroGOpenAIGatewayConfig,
	): Promise<ZeroGOpenAIGateway> {
		const log = logger.child({ method: "initialize" });

		try {
			log.info("Initializing provider...");
			const provider = new ethers.JsonRpcProvider(config.rpcUrl);

			log.info("Creating wallet...");
			const wallet = new ethers.Wallet(config.privateKey, provider);

			log.info("Initializing broker...");
			const broker = await createZGComputeNetworkBroker(wallet);

			log.info("Setting up ledger...");
			try {
				await broker.ledger.addLedger(config.initialBalance);
			} catch (error) {
				log.warn({ error }, "Ledger may already exist, continuing...");
			}

			log.info("Gateway initialized successfully");
			return new ZeroGOpenAIGateway(broker);
		} catch (error) {
			log.error({ error }, "Failed to initialize gateway");
			throw error;
		}
	}

	/**
	 * Get available models from the 0G network
	 */
	public async getModels(): Promise<Array<{ id: string; provider: string }>> {
		const log = logger.child({ method: "getModels" });

		try {
			log.info("Fetching available services...");
			const services = await this.broker.inference.listService();

			const models: Array<{ id: string; provider: string }> = [];

			for (const service of services) {
				try {
					// Cache the service for later use
					this.serviceCache.set(
						`${service.provider}:${service.model}`,
						service,
					);

					models.push({
						id: service.model,
						provider: service.provider,
					});

					log.info(
						{ provider: service.provider, model: service.model },
						"Added model",
					);
				} catch (error) {
					log.warn(
						{ error, provider: service.provider },
						"Failed to process service",
					);
				}
			}

			return models;
		} catch (error) {
			log.error({ error }, "Failed to get models");
			throw error;
		}
	}

	/**
	 * Create a chat completion using the 0G network
	 */
	public async createChatCompletion(
		model: string,
		messages: Array<{ role: string; content: string }>,
	): Promise<{
		id: string;
		object: string;
		created: number;
		model: string;
		choices: Array<{
			index: number;
			message: { role: string; content: string };
			finish_reason: string;
		}>;
		usage: {
			prompt_tokens: number;
			completion_tokens: number;
			total_tokens: number;
		};
	}> {
		const log = logger.child({ method: "createChatCompletion", model });

		try {
			log.info({ model }, "Finding provider for model...");

			// Find the provider for the requested model
			let providerAddress: string | null = null;
			let serviceInfo: ServiceStructOutput | null = null;

			// First, check if we have the model in our cache
			for (const [key, service] of this.serviceCache.entries()) {
				if (service.model === model) {
					providerAddress = service.provider;
					serviceInfo = service;
					break;
				}
			}

			// If we don't have the model in our cache, fetch all services and check
			if (!providerAddress || !serviceInfo) {
				log.info("Model not found in cache, fetching all services...");
				await this.getModels();

				for (const [key, service] of this.serviceCache.entries()) {
					if (service.model === model) {
						providerAddress = service.provider;
						serviceInfo = service;
						break;
					}
				}
			}

			if (!providerAddress || !serviceInfo) {
				throw new Error(`Model ${model} not found`);
			}

			// Get service metadata
			log.info({ providerAddress }, "Getting service metadata...");
			const { endpoint, model: serviceModel } =
				await this.broker.inference.getServiceMetadata(providerAddress);

			// Prepare the content from messages
			const content = messages
				.map((msg) => `${msg.role}: ${msg.content}`)
				.join("\n");

			log.info({ providerAddress }, "Preparing request headers...");
			const headers = await this.broker.inference.getRequestHeaders(
				providerAddress,
				content,
			);

			// Import OpenAI dynamically to avoid circular dependencies
			const { default: OpenAI } = await import("openai");

			log.info("Sending request to provider...");
			const openai = new OpenAI({
				baseURL: endpoint,
				apiKey: "",
			});

			let completion;
			try {
				completion = await openai.chat.completions.create(
					{
						messages,
						model: serviceModel,
					},
					{
						headers: {
							...headers,
						},
					},
				);
			} catch (error: any) {
				log.warn({ error }, "Error during completion request");

				// 检查是否需要结算费用
				if (error.error && typeof error.error === "string") {
					const regex = /(?<=expected\s)([0-9.]+)/;
					const match = error.error.match(regex);

					if (match) {
						const feeToPay: number = Number(match[1]);
						log.info({ feeToPay }, "Need to settle fee");

						try {
							await this.broker.inference.settleFee(providerAddress, feeToPay);
							log.info("Fee settled successfully");

							// 重试请求
							completion = await openai.chat.completions.create(
								{
									messages,
									model: serviceModel,
								},
								{
									headers: {
										...headers,
									},
								},
							);
						} catch (settleError) {
							log.error({ settleError }, "Failed to settle fee");
							throw settleError;
						}
					} else {
						throw error;
					}
				} else {
					throw error;
				}
			}

			if (!completion || !completion.choices) {
				throw new Error("No valid completion received");
			}

			const receivedContent = completion.choices[0].message.content;
			const chatID = completion.id;

			if (!receivedContent) {
				throw new Error("No content received.");
			}

			log.info({ chatID }, "Processing response...");
			const isValid = await this.broker.inference.processResponse(
				providerAddress,
				receivedContent,
				chatID,
			);

			if (!isValid) {
				log.warn({ chatID }, "Response validation failed");
			}

			// Return the response in OpenAI-compatible format
			return {
				id: chatID,
				object: "chat.completion",
				created: Math.floor(Date.now() / 1000),
				model,
				choices: [
					{
						index: 0,
						message: {
							role: "assistant",
							content: receivedContent,
						},
						finish_reason: "stop",
					},
				],
				usage: {
					prompt_tokens: 0, // We don't have this information
					completion_tokens: 0, // We don't have this information
					total_tokens: 0, // We don't have this information
				},
			};
		} catch (error) {
			log.error({ error }, "Failed to create chat completion");
			throw error;
		}
	}
}
