import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { one } from '../repositories/store.js';
import { conflict, HttpError } from '../utils/http.js';

const dummyHash = bcrypt.hashSync('unavailable account', 10);
const publicFields = 'id, name, email, role';

export async function registerUser(db, input) {
  if (await one(db, 'SELECT id FROM users WHERE email=$1', [input.email])) {
    throw conflict('EMAIL_IN_USE', 'An account already uses this email.');
  }
  const hash = await bcrypt.hash(input.password, 12);
  return one(db, "INSERT INTO users (id,name,email,password_hash,role) VALUES ($1,$2,$3,$4,'customer') RETURNING " + publicFields,
    [randomUUID(), input.name, input.email, hash]);
}

export async function signIn(db, input) {
  const user = await one(db, 'SELECT * FROM users WHERE email=$1', [input.email]);
  const matches = await bcrypt.compare(input.password, user?.password_hash || dummyHash);
  if (!user || !matches || Buffer.byteLength(input.password) > 72) throw new HttpError(401, 'INVALID_LOGIN', 'Email or password is incorrect.');
  const { password_hash, created_at, ...publicUser } = user;
  return publicUser;
}

export function getUser(db, id) {
  return one(db, 'SELECT ' + publicFields + ' FROM users WHERE id=$1', [id]);
}
