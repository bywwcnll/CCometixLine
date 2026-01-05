#!/usr/bin/env node
const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

// 1. Priority: Use ~/.claude/ccline/ccline if exists
const claudePath = path.join(
  os.homedir(),
  '.claude',
  'ccline',
  'ccline'
);

if (fs.existsSync(claudePath)) {
  const result = spawnSync(claudePath, process.argv.slice(2), {
    stdio: 'inherit',
    shell: false
  });
  process.exit(result.status || 0);
}

// 2. Fallback: Use npm package binary
const platform = process.platform;
const arch = process.arch;

// Only support Linux ARM64
if (platform !== 'linux' || (arch !== 'arm64' && arch !== 'aarch64')) {
  console.error(`Error: This package only supports Linux ARM64 architecture`);
  console.error(`Your platform: ${platform}-${arch}`);
  console.error('Please visit https://github.com/Haleclipse/CCometixLine for more information');
  process.exit(1);
}

let platformKey = `linux-${arch}`;

// Detect if static linking is needed based on glibc version
function shouldUseStaticBinary() {
  try {
    const { execSync } = require('child_process');
    const lddOutput = execSync('ldd --version 2>/dev/null || echo ""', {
      encoding: 'utf8',
      timeout: 1000
    });

    // Parse "ldd (GNU libc) 2.35" format
    const match = lddOutput.match(/(?:GNU libc|GLIBC).*?(\d+)\.(\d+)/);
    if (match) {
      const major = parseInt(match[1]);
      const minor = parseInt(match[2]);
      // Use static binary if glibc < 2.35
      return major < 2 || (major === 2 && minor < 35);
    }
  } catch (e) {
    // If detection fails, default to dynamic binary
    return false;
  }

  return false;
}

if (shouldUseStaticBinary()) {
  platformKey = 'linux-arm64-musl';
} else if (arch === 'aarch64') {
  platformKey = 'linux-arm64';
}

const packageMap = {
  'linux-arm64': '@cometix/ccline-linux-arm64',
  'linux-aarch64': '@cometix/ccline-linux-arm64',
  'linux-arm64-musl': '@cometix/ccline-linux-arm64-musl',
  'linux-aarch64-musl': '@cometix/ccline-linux-arm64-musl'
};

const packageName = packageMap[platformKey];
if (!packageName) {
  console.error(`Error: Unsupported platform ${platformKey}`);
  console.error('This package only supports Linux ARM64');
  console.error('Please visit https://github.com/Haleclipse/CCometixLine for more information');
  process.exit(1);
}

const binaryName = 'ccline';
const binaryPath = path.join(__dirname, '..', 'node_modules', packageName, binaryName);

if (!fs.existsSync(binaryPath)) {
  console.error(`Error: Binary not found at ${binaryPath}`);
  console.error('This might indicate a failed installation.');
  console.error('Please try reinstalling: npm install -g @cometix/ccline');
  console.error(`Expected package: ${packageName}`);
  process.exit(1);
}

const result = spawnSync(binaryPath, process.argv.slice(2), {
  stdio: 'inherit',
  shell: false
});

process.exit(result.status || 0);