import { FastifyInstance } from "fastify/types/instance";

import { createMessage, getMessagesList } from "./db/clientMessage";
import { getTransaction } from "./transaction";
import { validate } from "./validation";

export default function router(fastify: FastifyInstance) {
  fastify.get("/hello", async (request, reply) => {
    return "Hello, world!";
  });

  fastify.post("/message/post", async (request, reply) => {
    const body = validate(request.body, {
      type: "object",
      properties: {
        phone: { type: "string", minLength: 1 },
        message: { type: "string", minLength: 1 },
      },
      required: ["phone", "message"],
      additionalProperties: false,
    });
    const transaction = getTransaction(request)!;
    const message = await createMessage(body, transaction);
    return message.sanitize();
  });

  fastify.get("/message/list", async (request, reply) => {
    const query = validate(request.query, {
      type: "object",
      properties: {
        afterId: { type: "integer" },
        count: { type: "integer" },
      },
      required: [],
      additionalProperties: false,
    });
    const transaction = getTransaction(request)!;
    const messageList = await getMessagesList(query, transaction);

    return {
      total: messageList.total,
      messages: messageList.messages.map((m) => m.sanitize()),
    };
  });
}
