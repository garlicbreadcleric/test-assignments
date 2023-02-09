import { ApplicationError, ErrorCode } from "./error";

export function bodyPropertyNotNull(body: any, property: string) {
  if (body[property] == null) {
    console.error(body, property);
    throw new ApplicationError(
      ErrorCode.BodyPropertyMissing,
      { property },
      `Property ${property} is missing in the request body.`
    );
  }
}
