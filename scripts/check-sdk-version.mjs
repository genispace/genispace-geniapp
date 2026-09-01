import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8'));
const geniappPackage = readJson(path.join(packageRoot, 'package.json'));
const sdkPackagePath = path.join(
  packageRoot,
  'node_modules',
  '@genispace',
  'sdk',
  'package.json',
);

if (!fs.existsSync(sdkPackagePath)) {
  throw new Error(`Published GeniSpace SDK dependency is not installed at ${sdkPackagePath}`);
}

const expectedVersion = geniappPackage.peerDependencies?.['@genispace/sdk'];
const sdkPackage = readJson(sdkPackagePath);

if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(expectedVersion ?? '')) {
  throw new Error(
    `peerDependencies["@genispace/sdk"] must be one exact version; received ${JSON.stringify(expectedVersion)}`,
  );
}

if (sdkPackage.version !== expectedVersion) {
  throw new Error(
    `SDK version mismatch: @genispace/geniapp expects ${expectedVersion}, but the installed package declares ${sdkPackage.version}`,
  );
}

console.log(`SDK version contract verified: @genispace/sdk@${expectedVersion}`);
