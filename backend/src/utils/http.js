export class HttpError extends Error {
  constructor(status, code, message, details) {
    super(message);
    Object.assign(this, { status, code, details });
  }
}
export function requireValue(value, message = 'This item could not be found.') {
  if (!value) throw new HttpError(404, 'NOT_FOUND', message);
  return value;
}
export function conflict(code, message, details) {
  return new HttpError(409, code, message, details);
}
export function invalid(code, message, details) {
  return new HttpError(422, code, message, details);
}
