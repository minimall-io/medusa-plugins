import { loadEnv } from '@medusajs/framework/utils'

loadEnv('test', process.cwd())

const config = {
  moduleFileExtensions: ['js', 'ts', 'json'],
  modulePathIgnorePatterns: ['dist/'],
  setupFiles: ['./integration-tests/setup.js'],
  testEnvironment: 'node',
  testMatch: [] as string[],
  transform: {
    '^.+\\.[jt]s$': [
      '@swc/jest',
      {
        jsc: {
          parser: { decorators: true, syntax: 'typescript' },
          target: 'es2021',
        },
      },
    ],
  },
}

if (process.env.TEST_TYPE === 'integration:http') {
  config.testMatch = ['**/integration-tests/http/*.spec.[jt]s']
} else if (process.env.TEST_TYPE === 'integration:modules') {
  config.testMatch = ['**/src/modules/*/__tests__/**/*.[jt]s']
} else if (process.env.TEST_TYPE === 'unit') {
  config.testMatch = ['**/src/**/__tests__/**/*.unit.spec.[jt]s']
}

export default config
