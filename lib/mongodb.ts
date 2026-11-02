import { MongoClient, type Db } from "mongodb";

if (!process.env.MONGODB_URI) {
  throw new Error("Please add MONGODB_URI to .env.local");
}

const uri = process.env.MONGODB_URI;

let clientPromise: Promise<MongoClient> | null = null;

function getClient() {
  if (!clientPromise) {
    clientPromise = MongoClient.connect(uri).catch((error) => {
      clientPromise = null;
      throw error;
    });
  }
  return clientPromise;
}

// LYKA_DB_NAME picks the database (previews use their own, e.g. "thelyka_preview", with the same MONGODB_URI).
// Without it, the database named in MONGODB_URI is used, as before.
function configuredDbName() {
  const name = (process.env.LYKA_DB_NAME ?? "").trim();
  return name || undefined;
}

export async function connectToDatabase(): Promise<{ client: MongoClient; db: Db }> {
  const client = await getClient();
  return { client, db: client.db(configuredDbName()) };
}

// The database named in MONGODB_URI itself = the live site's data. Only the preview copy tool reads it directly.
export async function connectToUriDatabase(): Promise<{ client: MongoClient; db: Db }> {
  const client = await getClient();
  return { client, db: client.db() };
}

export async function databaseNames() {
  const client = await getClient();
  return { current: client.db(configuredDbName()).databaseName, uri: client.db().databaseName };
}
