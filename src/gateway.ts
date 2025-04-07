import {
  type ZGComputeNetworkBroker,
  createZGComputeNetworkBroker,
} from "@0glabs/0g-serving-broker";
import type { ServiceStructOutput } from "@0glabs/0g-serving-broker/lib.commonjs/inference/contract";
import { ethers } from "ethers";
import { logger } from "./logger";

export interface ZeroGOpenAIGatewayConfig {
  privateKey: string;
  rpcUrl: string;
  initialBalance: number;
  providerAddress: string;
  maxRetries: number;
}

export class ZeroGOpenAIGateway {
  private broker: ZGComputeNetworkBroker;
  private providerAddress: string;
  private maxRetries: number;
  private endpoint: string;
  private model: string;

  private constructor(
    broker: ZGComputeNetworkBroker,
    providerAddress: string,
    maxRetries: number,
    endpoint: string,
    model: string,
  ) {
    this.broker = broker;
    this.providerAddress = providerAddress;
    this.maxRetries = maxRetries;
    this.endpoint = endpoint;
    this.model = model;
  }

  /**
   * Initialize the ZeroGOpenAIGateway
   */
  public static async initialize(
    config: ZeroGOpenAIGatewayConfig,
  ): Promise<ZeroGOpenAIGateway> {
    const log = logger.child({ method: "initialize" });

    // Initialize provider and wallet
    const provider = new ethers.JsonRpcProvider(config.rpcUrl);
    const wallet = new ethers.Wallet(config.privateKey, provider);
    // Initialize broker
    const broker = await createZGComputeNetworkBroker(wallet);
    logger.info("Inference Broker initialized");

    // Setup ledger
    try {
      const existingBalance = await broker.ledger.getLedger();
      logger.info(`Using existing ledger with balance: ${existingBalance}`);
    } catch (error) {
      logger.info("No existing ledger found. Creating new ledger...");
      await broker.ledger.addLedger(config.initialBalance);
      logger.info(
        "New account created and funded with initial balance: ${config.initialBalance}",
      );
    }

    // Get service metadata
    logger.info("Getting service metadata...");
    const { endpoint, model } = await broker.inference.getServiceMetadata(
      config.providerAddress,
    );
    logger.info(`Endpoint: ${endpoint}, Model: ${model}`);

    log.info("Gateway initialized successfully");
    return new ZeroGOpenAIGateway(
      broker,
      config.providerAddress,
      config.maxRetries,
      endpoint,
      model,
    );
  }

  /**
   * Get available models from the 0G network
   */
  public getModels(): Array<{ id: string; provider: string }> {
    const models = [{ id: this.model, provider: this.providerAddress }];
    return models;
  }

  /**
   * Create a chat completion using the 0G network
   */
  public async createChatCompletion(
    _model: string,
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
    const log = logger.child({ method: "createChatCompletion" });

    try {
      // Make inference requests with retry logic
      let retryCount = 0;

      const content = messages
        .map((msg) => `${msg.role}: ${msg.content}`)
        .join("\n");

      let result: InferenceResult | undefined;
      while (retryCount < this.maxRetries) {
        try {
          // Get fresh headers for each attempt
          const currentHeaders = await getNewHeaders(
            this.broker,
            this.providerAddress,
            content,
          );
          logger.info("Preparing to call makeInferenceRequest...");
          const startTimeMs = Date.now();
          const startDate = new Date(startTimeMs);
          logger.info(
            `Request start time: ${startDate.toISOString()} (Timestamp: ${startTimeMs})`,
          );
          result = await makeInferenceRequest(
            this.broker,
            this.endpoint,
            currentHeaders,
            content,
            this.model,
          );
          const endTimeMs = Date.now();
          const endDate = new Date(endTimeMs);
          const durationMs = endTimeMs - startTimeMs;
          logger.info(
            `Request end time: ${endDate.toISOString()} (Timestamp: ${endTimeMs})`,
          );
          logger.info(`Request successful, duration: ${durationMs} ms`);
          logger.info(`Attempt ${retryCount + 1} result:`, result);

          // If we have a valid response, break the loop
          if (result?.choices?.[0]?.message?.content) {
            logger.info("Success! Message:", result.choices[0].message.content);
            break;
          }

          // Handle fee settlement error
          if (result.error?.includes("settleFee")) {
            const feeMatch = result.error.match(/expected ([\d.]+) A0GI/);
            if (feeMatch) {
              const expectedFee = Number(feeMatch[1]);
              logger.info(`Settling fee: ${expectedFee}`);
              await this.broker.inference.settleFee(
                this.providerAddress,
                expectedFee,
              );
              logger.info("Fee settled successfully");
            }
          }

          // If we get here, either there was an error or no valid response
          logger.info(`Attempt ${retryCount + 1} failed, retrying...`);
          retryCount++;

          // Add a small delay between retries
          await new Promise((resolve) => setTimeout(resolve, 1000));
        } catch (error) {
          logger.error(`Error on attempt ${retryCount + 1}: ${error}`);
          retryCount++;
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      if (!result?.choices?.[0]?.message?.content) {
        logger.info(
          `Failed to get valid response after ${this.maxRetries} attempts`,
        );
      }

      if (!result || !result.choices) {
        throw new Error("No valid completion received");
      }

      const receivedContent = result?.choices[0]?.message?.content;
      const chatID = result?.id;

      if (!receivedContent) {
        throw new Error("No content received.");
      }

      // log.info({ chatID }, "Processing response...");
      // const isValid = await this.broker.inference.processResponse(
      //   this.providerAddress,
      //   receivedContent,
      //   chatID,
      // );

      // if (!isValid) {
      //   log.warn({ chatID }, "Response validation failed");
      // }

      // Return the response in OpenAI-compatible format
      return {
        id: chatID || "1",
        object: "chat.completion",
        created: Math.floor(Date.now() / 1000),
        model: this.model,
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

// Define interface for inference result
interface InferenceResult {
  choices?: Array<{
    message?: {
      content: string;
    };
  }>;
  error?: string;
  id?: string;
}

/**
 * Makes an inference request to the specified endpoint
 * @param broker - The ZG Compute Broker instance
 * @param endpoint - API endpoint URL
 * @param headers - Request headers
 * @param content - Message content
 * @param model - AI model name
 * @returns The inference result
 */
async function makeInferenceRequest(
  broker: any,
  endpoint: string,
  headers: Record<string, string>,
  content: string,
  model: string,
): Promise<InferenceResult> {
  logger.info(`Making inference request to ${endpoint}`);
  const response = await fetch(`${endpoint}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ messages: [{ role: "system", content }], model }),
  });
  return await response.json();
}

/**
 * Gets fresh request headers for each attempt
 * @param broker - The ZG Compute Broker instance
 * @param providerAddress - Address of the inference provider
 * @param content - Message content
 * @returns Request headers
 */
async function getNewHeaders(
  broker: any,
  providerAddress: string,
  content: string,
): Promise<Record<string, string>> {
  return await broker.inference.getRequestHeaders(providerAddress, content);
}
