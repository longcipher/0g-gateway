# 0G Gateway

0G Gateway is a OpenAI compatible API gateway connecting 0G Serving Broker.

**Deployed Gateway Endpoint**: `http://0g-gateway.longcipher.com:3000/v1`

## Project Description

Directly interfacing with underlying AI infrastructure (like the 0G Serving Broker) often involves complex wallet authentication, gas fee management, and other operations. This significantly increases the barrier to entry for developers and hinders the widespread adoption of AI applications. Existing OpenAI-compatible applications face considerable rework to migrate to decentralized, high-performance 0G Serving Broker services.

0G Gateway aims to create a user-friendly API Gateway, serving as a bridge between existing OpenAI-compatible applications and the 0G Serving Broker. Developers can forward requests to the 0G Serving Broker with a simple configuration, enjoying its high-performance, low-cost AI inference capabilities without modifying existing code.

## Core Features

* OpenAI-Compatible RESTful API: Fully compatible with OpenAI API interfaces, enabling seamless integration without any code modifications to existing applications.

* Zero-Authentication Experience: Simplifies the user authentication process by integrating `@0glabs/0g-serving-broker`, eliminating the need for wallets and gas fees to utilize AI services.

* High-Performance Proxy: Use bun as node runtime, optimizes the request forwarding process to ensure low latency and high throughput, improving the response speed of AI applications.

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
