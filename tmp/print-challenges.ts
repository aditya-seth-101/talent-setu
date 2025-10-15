#!/usr/bin/env tsx
import { connectMongo, disconnectMongo, getCollection } from '../backend/api/src/services/database.js';

async function main(){
  await connectMongo();
  const coll = getCollection('challenges');
  const items = await coll.find().limit(50).toArray();
  console.log(JSON.stringify(items.map(c => ({ _id: c._id.toHexString(), topicId: c.topicId?.toHexString(), prompt: c.prompt })), null, 2));
  await disconnectMongo();
}

main().catch(err => { console.error(err); process.exit(1); });
