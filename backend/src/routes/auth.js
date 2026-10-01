import { Router } from 'express';
import { z } from 'zod';
import { User } from '../models/User.js';
import { signToken } from '../utils/token.js';
import { asyncHandler, HttpError } from '../middleware/error.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  headline: z.string().optional(),
});

router.post(
  '/register',
  asyncHandler(async (req, res) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) throw new HttpError(400, parsed.error.issues[0].message);
    const { name, email, password, headline } = parsed.data;

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) throw new HttpError(409, 'An account with this email already exists');

    const user = new User({ name, email, role: 'candidate', headline: headline || '' });
    await user.setPassword(password);
    await user.save();

    res.status(201).json({ token: signToken(user), user: user.toSafeJSON() });
  })
);

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) throw new HttpError(400, 'Email and password are required');
    const { email, password } = parsed.data;

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !(await user.verifyPassword(password))) {
      throw new HttpError(401, 'Invalid email or password');
    }
    res.json({ token: signToken(user), user: user.toSafeJSON() });
  })
);

router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ user: req.user.toSafeJSON() });
  })
);

export default router;
