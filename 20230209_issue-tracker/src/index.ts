import Fastify from "fastify";
import { fastifyRequestContext } from "@fastify/request-context";

import sequelize from "./db";
import { ApplicationError, ErrorCode, errorHttpCodes } from "./error";
import router from "./router";
import { commitTransaction, rollbackTransaction } from "./transaction";

const fastify = Fastify({
  logger: true,
});

fastify.register(fastifyRequestContext, {
  hook: "preValidation",
  defaultStoreValues: () => ({}),
});

fastify.addHook("preHandler", async (request, reply) => {
  request.requestContext.set("transaction", await sequelize.transaction());
});

fastify.setErrorHandler(async (error, request, reply) => {
  await rollbackTransaction(request);

  console.error(error.message);

  if (error instanceof ApplicationError) {
    console.error(JSON.stringify(error));
    reply.status(errorHttpCodes.get(error.errorCode) ?? 400);
    return {
      message: error.message,
      errorCode: error.errorCode,
      ...error.params,
    };
  } else {
    reply.status(500);
    return {
      errorCode: ErrorCode.InternalError,
      message: "Internal server error",
    };
  }
});

fastify.addHook("preSerialization", async (request, reply) => {
  await commitTransaction(request);
});

router(fastify);

async function start() {
  try {
    await fastify.listen({ host: "0.0.0.0", port: 3000 });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}
start();
