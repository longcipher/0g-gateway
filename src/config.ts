import dotenv from "dotenv";
import { config as loadEnv } from "dotenv";
import { join } from "path";

// Load environment variables from .env file
loadEnv();

// Configuration interface
export interface Config {
	privateKey: string;
	rpcUrl: string;
	initialBalance: number;
	port: number;
	logLevel: string;
}

// Load and validate configuration
const config: Config = {
	privateKey: process.env.PRIVATE_KEY || "",
	rpcUrl: process.env.RPC_URL || "https://evmrpc-testnet.0g.ai",
	initialBalance: parseFloat(process.env.INITIAL_BALANCE || "0.01"),
	port: parseInt(process.env.PORT || "3000", 10),
	logLevel: process.env.LOG_LEVEL || "info",
};

// Validate required configuration
if (!config.privateKey) {
	throw new Error("PRIVATE_KEY environment variable is required");
}

export { config };
