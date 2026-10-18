# MongoDB Skill

> **Note**: This project currently uses **MySQL** (`mysql2`). This skill is provided for reference if MongoDB is added in the future, or for features that could benefit from a document store (e.g., activity logs, user sessions, flexible metadata).

Reference guide for **MongoDB** with **Mongoose** or the native **MongoDB Node.js driver**.

---

## When to Consider MongoDB

| Use Case | MySQL | MongoDB |
|---|---|---|
| Relational structured data | ✅ Preferred | — |
| User sessions / ephemeral data | — | ✅ Preferred |
| Activity logs / audit trails | — | ✅ Preferred |
| Flexible schemas / user metadata | — | ✅ Preferred |
| Full-text search (basic) | — | ✅ Atlas Search |
| Complex joins and transactions | ✅ Preferred | Limited |

---

## Connection Setup

### Native Driver (`mongodb` package)
```typescript
// src/lib/mongodb.ts
import { MongoClient, ServerApiVersion } from 'mongodb';

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error('Missing MONGODB_URI environment variable');

const options = {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
};

// Singleton for Next.js (dev HMR creates multiple instances otherwise)
let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === 'development') {
  const globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>;
  };
  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(uri, options);
    globalWithMongo._mongoClientPromise = client.connect();
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

export default clientPromise;

// Helper to get a typed collection
export async function getCollection<T extends Document>(
  db: string,
  collection: string
) {
  const client = await clientPromise;
  return client.db(db).collection<T>(collection);
}
```

### Mongoose (ODM)
```typescript
// src/lib/mongoose.ts
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI!;

declare global {
  var mongoose: { conn: typeof import('mongoose') | null; promise: Promise<typeof import('mongoose')> | null };
}

let cached = global.mongoose ?? { conn: null, promise: null };

export async function connectDB() {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
    });
  }
  cached.conn = await cached.promise;
  return cached.conn;
}
```

---

## Mongoose Schemas

```typescript
// src/lib/models/ActivityLog.ts
import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IActivityLog extends Document {
  userId: number;       // References MySQL users.id
  action: string;
  resource: string;
  resourceId: string;
  metadata: Record<string, unknown>;
  ipAddress: string;
  userAgent: string;
  createdAt: Date;
}

const ActivityLogSchema = new Schema<IActivityLog>(
  {
    userId: { type: Number, required: true, index: true },
    action: { type: String, required: true, enum: ['create', 'read', 'update', 'delete'] },
    resource: { type: String, required: true },
    resourceId: { type: String, required: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
    ipAddress: { type: String, required: true },
    userAgent: { type: String, default: '' },
  },
  {
    timestamps: true,   // Adds createdAt, updatedAt automatically
    versionKey: false,  // Remove __v field
  }
);

// TTL index — auto-delete logs after 90 days
ActivityLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });

export const ActivityLog: Model<IActivityLog> =
  mongoose.models.ActivityLog ?? mongoose.model('ActivityLog', ActivityLogSchema);
```

---

## CRUD Operations (Native Driver)

```typescript
import { ObjectId } from 'mongodb';
import clientPromise from '@/lib/mongodb';

const DB = 'myapp';

// INSERT ONE
export async function createLog(data: CreateLogInput) {
  const client = await clientPromise;
  const result = await client.db(DB).collection('logs').insertOne({
    ...data,
    createdAt: new Date(),
  });
  return result.insertedId;
}

// FIND MANY (with projection — never fetch _all_ fields)
export async function getUserLogs(userId: number, limit = 50) {
  const client = await clientPromise;
  return client
    .db(DB)
    .collection('logs')
    .find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .project({ action: 1, resource: 1, createdAt: 1, _id: 0 }) // Explicit projection
    .toArray();
}

// FIND ONE
export async function getLogById(id: string) {
  const client = await clientPromise;
  return client
    .db(DB)
    .collection('logs')
    .findOne({ _id: new ObjectId(id) });
}

// UPDATE ONE
export async function updateLog(id: string, updates: Partial<Log>) {
  const client = await clientPromise;
  const result = await client
    .db(DB)
    .collection('logs')
    .updateOne(
      { _id: new ObjectId(id) },
      { $set: { ...updates, updatedAt: new Date() } }
    );
  return result.modifiedCount > 0;
}

// DELETE ONE
export async function deleteLog(id: string) {
  const client = await clientPromise;
  const result = await client
    .db(DB)
    .collection('logs')
    .deleteOne({ _id: new ObjectId(id) });
  return result.deletedCount > 0;
}
```

---

## Aggregation Pipeline

```typescript
// Aggregate user activity by action type
export async function getUserActivitySummary(userId: number) {
  const client = await clientPromise;
  return client
    .db(DB)
    .collection('logs')
    .aggregate([
      { $match: { userId } },                    // Filter
      { $group: {
          _id: '$action',                         // Group by action
          count: { $sum: 1 },                     // Count per group
          lastOccurred: { $max: '$createdAt' },   // Latest occurrence
        }
      },
      { $sort: { count: -1 } },                  // Sort by most common
      { $project: {
          action: '$_id',
          count: 1,
          lastOccurred: 1,
          _id: 0,
        }
      },
    ])
    .toArray();
}
```

---

## Indexing

```typescript
// Run once during app initialization or migration
export async function createIndexes() {
  const client = await clientPromise;
  const collection = client.db(DB).collection('logs');
  
  await collection.createIndexes([
    { key: { userId: 1, createdAt: -1 } },         // Compound: user's logs by date
    { key: { createdAt: 1 }, expireAfterSeconds: 7776000 }, // TTL: 90 days
    { key: { resource: 1, resourceId: 1 } },        // Resource lookups
  ]);
}
```

---

## Environment Variables

Add to `.env.local` and `.env.example`:
```bash
# MongoDB (optional — for document store features)
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/myapp?retryWrites=true&w=majority
```

---

## Common Pitfalls

```typescript
// ❌ Don't forget to await clientPromise in every function
const client = clientPromise; // This is a Promise, not a client!

// ✅ Always await
const client = await clientPromise;

// ❌ Creating ObjectId without validation
new ObjectId(untrustedInput); // Throws if invalid

// ✅ Validate first
import { ObjectId } from 'mongodb';
if (!ObjectId.isValid(id)) throw new Error('Invalid ID format');
const objectId = new ObjectId(id);

// ❌ No projection — fetches all fields including large ones
collection.find({ userId }).toArray();

// ✅ Always project to only needed fields
collection.find({ userId }).project({ action: 1, createdAt: 1, _id: 0 }).toArray();
```
