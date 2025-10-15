#!/usr/bin/env tsx
import { connectMongo, disconnectMongo, getCollection } from '../backend/api/src/services/database.js';
import { ObjectId } from 'mongodb';

async function main(){
  await connectMongo();
  const profiles = getCollection('profiles');
  const userId = new ObjectId('68ef82432a485b60b0800c5b');
  const existing = await profiles.findOne({ userId });
  const now = new Date();
  if (existing) {
    console.log('Profile already exists for user');
    await disconnectMongo();
    return;
  }

  const doc = {
    userId,
    displayName: 'Admin User',
    technologies: [],
    learningProgress: { courses: {}, totals: { baseXp: 0, hintPenalty: 0, netXp: 0, completedTopics: 0 }, lastUpdated: now.toISOString() },
    createdAt: now,
    updatedAt: now,
  } as any;

  const res = await profiles.insertOne(doc);
  console.log('Created profile', res.insertedId.toHexString());
  await disconnectMongo();
}

main().catch(err => { console.error(err); process.exit(1); });
