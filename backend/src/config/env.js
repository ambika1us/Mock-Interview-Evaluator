import dotenv from 'dotenv';

dotenv.config();

export const env = {
  port: Number(process.env.PORT || 3001),
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGODB_URI || '',
  jwtSecret: process.env.JWT_SECRET || 'dev-insecure-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

  seedAdminName: process.env.SEED_ADMIN_NAME || 'Admin',
  seedAdminEmail: process.env.SEED_ADMIN_EMAIL || 'admin@example.com',
  seedAdminPassword: process.env.SEED_ADMIN_PASSWORD || 'admin123',

  llm: {
    apiKey: process.env.USER_LLM_API_KEY || '',
    baseUrl: (process.env.USER_LLM_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, ''),
    model: process.env.USER_LLM_MODEL || 'gpt-4o-mini',
  },
};

export const llmEnabled = () => Boolean(env.llm.apiKey);
