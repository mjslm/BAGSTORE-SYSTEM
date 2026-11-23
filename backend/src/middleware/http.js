import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { getUser } from '../services/identity.js';
import { invalid, HttpError } from '../utils/http.js';

export function requestId(req, res, next) {
  req.id = randomUUID();
  res.setHeader('X-Request-Id', req.id);
  next();
}

export function validate(schema, value) {
  const result = schema.safeParse(value);
  if (!result.success) {
    const details = Object.fromEntries(result.error.issues.map((issue) => [issue.path.join('.') || 'form', issue.message]));
    throw invalid('VALIDATION', 'Check the indicated fields.', details);
  }
  return result.data;
}

export function authMiddleware(db, secret) {
  return async (req, res, next) => {
    const token = req.get('authorization')?.match(/^Bearer ([^ ]+)$/i)?.[1];
    const rejected = () => new HttpError(401, 'UNAUTHENTICATED', 'Sign in to continue.');
    if (!token) throw rejected();
    let claims;
    try { claims = jwt.verify(token, secret, { algorithms: ['HS256'], issuer: 'carry-and-co', audience: 'carry-store' }); } catch { throw rejected(); }
    req.user = await getUser(db, claims.sub);
    if (!req.user) throw rejected();
    next();
  };
}

export function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') throw new HttpError(403, 'FORBIDDEN', 'Administrator access is required.');
  next();
}

export function session(user, secret) {
  return { user, token: jwt.sign({}, secret, { subject: user.id, algorithm: 'HS256', issuer: 'carry-and-co', audience: 'carry-store', expiresIn: '1h' }) };
}

export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  let { status = 500, code, message, details } = error;
  if (error.type === 'entity.parse.failed') [status, code, message] = [400, 'MALFORMED_JSON', 'The request body must be valid JSON.'];
  if (error.type === 'entity.too.large') [status, code, message] = [413, 'REQUEST_TOO_LARGE', 'The request body is too large.'];
  if (error.code === '23505') {
    [status, code, message] = error.constraint === 'users_email_key'
      ? [409, 'EMAIL_IN_USE', 'An account already uses this email.']
      : [409, 'DUPLICATE', 'A record with these details already exists.'];
  }
  if (status >= 500 && !(error instanceof HttpError)) {
    console.error('Request failed', req.id, error.code || error.name);
    [status, code, message, details] = [500, 'SERVER_ERROR', 'Something went wrong. Try again shortly.', undefined];
  }
  res.status(status).json({ success: false, error: { code: code || 'REQUEST_FAILED', message, details }, requestId: req.id });
}
