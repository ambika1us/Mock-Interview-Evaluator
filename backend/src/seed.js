import mongoose from 'mongoose';
import { env } from './config/env.js';
import { User } from './models/User.js';
import { Category } from './models/Category.js';
import { Question } from './models/Question.js';
import { categories, questions } from './data/seedData.js';

export async function ensureAdmin() {
  const email = env.seedAdminEmail.toLowerCase();
  let admin = await User.findOne({ email });
  if (!admin) {
    admin = new User({ name: env.seedAdminName, email, role: 'admin', headline: 'Platform administrator' });
    await admin.setPassword(env.seedAdminPassword);
    await admin.save();
    console.log(`[seed] admin created: ${email}`);
  }
  return admin;
}

export async function seedQuestionBank({ force = false } = {}) {
  const existing = await Category.countDocuments();
  if (existing > 0 && !force) return { seeded: false };

  if (force) {
    console.log('[seed] force mode: keeping existing records, inserting missing ones');
  }

  const categoryMap = new Map();
  for (const c of categories) {
    const doc = await Category.findOneAndUpdate(
      { slug: c.slug },
      { $setOnInsert: c },
      { new: true, upsert: true }
    );
    categoryMap.set(c.name, doc._id);
  }

  const existingTexts = new Set((await Question.find().select('text').lean()).map((q) => q.text));
  const docs = questions
    .filter((q) => !existingTexts.has(q.text))
    .map((q) => ({
      category: categoryMap.get(q.category),
      text: q.text,
      type: q.type,
      difficulty: q.difficulty,
      level: q.level,
      expectedAnswer: q.expectedAnswer,
      keywords: q.keywords,
      language: q.language || '',
      active: true,
    }));

  if (docs.length) await Question.insertMany(docs);
  console.log(`[seed] categories ensured: ${categories.length}, questions inserted: ${docs.length}`);
  return { seeded: true, questions: docs.length };
}

export async function seedIfEmpty() {
  await ensureAdmin();
  return seedQuestionBank({ force: false });
}

async function run() {
  const { connectDb, disconnectDb } = await import('./db/connect.js');
  await connectDb();
  const force = process.argv.includes('--force');
  await ensureAdmin();
  await seedQuestionBank({ force });
  await disconnectDb();
  console.log('[seed] done');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().catch((err) => {
    console.error('[seed] failed:', err);
    process.exit(1);
  });
}
