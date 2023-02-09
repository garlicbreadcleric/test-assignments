import Ajv from "ajv";

import { ApplicationError, ErrorCode } from "./error";

const ajv = new Ajv({ coerceTypes: true, allErrors: true });

export function validate(data: any, schema: any): any {
  const validate = ajv.compile(schema);
  const valid = validate(data);
  if (!valid) {
    throw new ApplicationError(ErrorCode.InvalidRequest, { errors: validate.errors }, "Invalid request");
  }
  return data;
}
