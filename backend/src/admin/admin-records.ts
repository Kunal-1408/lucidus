import { ConflictException } from '@nestjs/common';
import type { Model, QueryFilter, Types } from 'mongoose';
import { isDuplicateKey } from './admin-errors.js';

// A stored record as an admin endpoint shows it: its fields plus its id.
export type View<T> = T & { id: string };

export function withId<T>(
  doc: T & { _id: Types.ObjectId; __v?: number },
): View<T> {
  const { _id, __v: _version, ...record } = doc;
  return { id: _id.toHexString(), ...(record as T) };
}

// Inserts a record unless one with the same key is already stored, which
// answers 409 with the message given. The key is checked up front too,
// since the unique index may still be building.
export async function insertUnique<T>(
  model: Model<T>,
  key: QueryFilter<T>,
  record: T,
  duplicateMessage: string,
): Promise<View<T>> {
  if (await model.exists(key)) throw new ConflictException(duplicateMessage);
  try {
    const created = await model.create(record);
    return withId(created.toObject() as T & { _id: Types.ObjectId });
  } catch (err) {
    throw isDuplicateKey(err) ? new ConflictException(duplicateMessage) : err;
  }
}
