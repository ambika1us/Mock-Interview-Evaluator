import { Router } from 'express';
import { Category } from '../models/Category.js';
import { asyncHandler } from '../middleware/error.js';

const router = Router();

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const categories = await Category.find({ active: true }).sort({ name: 1 }).lean();
    res.json({ categories });
  })
);

export default router;
