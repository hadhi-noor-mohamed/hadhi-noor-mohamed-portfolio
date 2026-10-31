import { defineConfig } from 'vitest/config';

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://postgres@localhost:5432/portfolio_test?schema=public';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    globals: true,
    hookTimeout: 60000,
    testTimeout: 60000,
    fileParallelism: false,
    pool: 'forks',
    poolOptions: {
      forks: { singleFork: true },
    },
    globalSetup: ['tests/globalSetup.ts'],
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: TEST_DATABASE_URL,
      SESSION_SECRET: 'test-secret-test-secret-test-secret-1234',
      STORAGE_DRIVER: 'local',
      LOCAL_STORAGE_DIR: '.test-storage',
      APP_ORIGIN: 'http://localhost:5173',
      OWNER_EMAIL: 'owner@test.local',
      OWNER_NAME: 'Test Owner',
      OWNER_PASSWORD: 'TestOwnerPass!2345',
    },
  },
});
