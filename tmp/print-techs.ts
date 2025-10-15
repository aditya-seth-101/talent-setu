#!/usr/bin/env tsx
import { connectMongo, disconnectMongo, getCollection } from '../backend/api/src/services/database.js';

async function main(){
  await connectMongo();
  const coll = getCollection('technologies');
  const items = await coll.find().limit(20).toArray();
  console.log(JSON.stringify(items, null, 2));
  await disconnectMongo();
}

main().catch(err => { console.error(err); process.exit(1); });
