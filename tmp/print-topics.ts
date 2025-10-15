#!/usr/bin/env tsx
import { connectMongo, disconnectMongo, getCollection } from '../backend/api/src/services/database.js';

async function main(){
  await connectMongo();
  const coll = getCollection('topics');
  const items = await coll.find().limit(50).toArray();
  console.log(JSON.stringify(items.map(t => ({ _id: t._id.toHexString(), slug: t.slug, title: t.title, courseId: t.courseId?.toHexString(), challengeIds: (t.challengeIds||[]).map(id => id.toHexString()) })), null, 2));
  await disconnectMongo();
}

main().catch(err => { console.error(err); process.exit(1); });
