import mongoose from 'mongoose';

export const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];
export const QUESTION_TYPES = ['theory', 'programming'];
export const LEVELS = ['Fresher', 'Mid-Level', 'Senior'];

const questionSchema = new mongoose.Schema(
  {
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
    text: { type: String, required: true, trim: true },
    type: { type: String, enum: QUESTION_TYPES, default: 'theory' },
    difficulty: { type: String, enum: DIFFICULTIES, default: 'Easy' },
    level: { type: String, enum: LEVELS, default: 'Fresher' },
    expectedAnswer: { type: String, default: '' },
    keywords: { type: [String], default: [] },
    language: { type: String, default: '' },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

questionSchema.index({ category: 1, type: 1, difficulty: 1, level: 1 });

export const Question = mongoose.model('Question', questionSchema);
