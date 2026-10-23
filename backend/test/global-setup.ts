import { MongoBinary } from 'mongodb-memory-server';

// Downloads the MongoDB binary once, before any test file starts. Each e2e
// file starts its own in-memory server, and on a fresh machine (CI) parallel
// workers would all download it at once into the same file.
export default async function setup() {
  await MongoBinary.getPath();
}
