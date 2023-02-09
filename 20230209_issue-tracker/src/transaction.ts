import { FastifyRequest } from "fastify/types/request";
import { Transaction } from "sequelize";

export function getTransaction(request: FastifyRequest): Transaction | undefined {
  return request.requestContext.get("transaction");
}

export async function commitTransaction(request: FastifyRequest) {
  const transaction = getTransaction(request);
  if (transaction != null) {
    request.requestContext.set("transaction", undefined);
    await transaction.commit();
  }
}

export async function rollbackTransaction(request: FastifyRequest) {
  const transaction = getTransaction(request);
  if (transaction != null) {
    request.requestContext.set("transaction", undefined);
    await transaction.rollback();
  }
}
