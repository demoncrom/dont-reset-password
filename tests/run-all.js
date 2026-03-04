/**
 * Test runner — executes all test files using Node.js built-in test runner.
 */

const { execSync } = require('child_process');
const path = require('path');

const testFiles = [
  'domain.test.js',
  'rules-schema.test.js',
  'cache.test.js',
  'api.test.js',
  'i18n.test.js',
];

const testsDir = __dirname;
let hasFailure = false;

for (const file of testFiles) {
  const filePath = path.join(testsDir, file);
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Running: ${file}`);
  console.log('='.repeat(60));

  try {
    execSync(`node --test "${filePath}"`, {
      stdio: 'inherit',
      cwd: testsDir,
    });
  } catch (err) {
    hasFailure = true;
    console.error(`FAILED: ${file}`);
  }
}

console.log(`\n${'='.repeat(60)}`);
if (hasFailure) {
  console.error('Some tests FAILED.');
  process.exit(1);
} else {
  console.log('All tests passed!');
}
