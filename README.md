# 0G Gateway

[![Bun CI](https://github.com/longcipher/0g-gateway/actions/workflows/ci.yml/badge.svg)](https://github.com/longcipher/0g-gateway/actions/workflows/ci.yml) [![Docker Push](https://github.com/longcipher/0g-gateway/actions/workflows/docker-build.yml/badge.svg)](https://github.com/longcipher/0g-gateway/pkgs/container/0g-gateway)

0G Gateway is a OpenAI compatible API gateway connecting 0G Serving Broker.

* **Deployed VPS Endpoint**: `http://0g-gateway.longcipher.com:3000/v1`
* **Deployed Phala Cloud Endpoint**: `https://176f7ae0891796d17e505edcb4a9a5177bd59b4b-3000.dstack-prod5.phala.network/v1`

Check the `/health` response to see if the service is running properly.

## Project Description

Directly interfacing with underlying AI infrastructure (like the 0G Serving Broker) often involves complex wallet authentication, gas fee management, and other operations. This significantly increases the barrier to entry for developers and hinders the widespread adoption of AI applications. Existing OpenAI-compatible applications face considerable rework to migrate to decentralized, high-performance 0G Serving Broker services.

0G Gateway aims to create a user-friendly API Gateway, serving as a bridge between existing OpenAI-compatible applications and the 0G Serving Broker. Developers can forward requests to the 0G Serving Broker with a simple configuration, enjoying its high-performance, low-cost AI inference capabilities without modifying existing code.

## Core Features

* OpenAI-Compatible RESTful API: Fully compatible with OpenAI API interfaces, enabling seamless integration without any code modifications to existing applications.

* Zero-Authentication Experience: Simplifies the user authentication process by integrating `@0glabs/0g-serving-broker`, eliminating the need for wallets and gas fees to utilize AI services.

* High-Performance Proxy: Use [Bun](https://bun.sh/) as node runtime and [Hono](https://hono.dev/) as web framework, optimizes the request forwarding process to ensure low latency and high throughput, improving the response speed of AI applications.

* Multi-Runtime: Thanks to using Hono as the web framework, multiple deployment methods are supported, making it easy to deploy to Phala Cloud, Bun, Deno, Node.js, Cloudflare Workers, AWS Lambda, Vercel, and similar services.

* Phala Cloud TEE: Deployment within a secure TEE ensures the service is trusted and verifiable.

## Future Vision

* Integrate more capabilities from the 0G chain.
* Support caching and token optimization strategies to reduce costs.
* Build a vibrant AI service marketplace, facilitating easier transactions between developers and service providers.

## Run

To install dependencies:

```sh
bun install
```

To run:

```sh
bun dev # for dev
bun prod # for prod
```

To test:

```sh
cd openai-chat
uv run openai-chat
```

## Use docker

```sh
docker build -t 0g-gateway .
docker run -p 3000:3000 -e PRIVATE_KEY="<your_private_key>" 0g-gateway
```

## Slide

* <https://gamma.app/docs/0g-Gateway-AI-Infra-for-0g-ivskdv2yrj5e2ae>

## Demo

* <https://youtu.be/t0R2synwlHk>
