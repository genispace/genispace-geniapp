import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sdkRoot = path.resolve(packageRoot, '..', 'sdk-javascript');

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8'));
const geniappPackage = readJson(path.join(packageRoot, 'package.json'));
const sdkPackagePath = path.join(sdkRoot, 'package.json');

if (!fs.existsSync(sdkPackagePath)) {
  throw new Error(`GeniSpace SDK checkout is required at ${sdkRoot}`);
}

const expectedVersion = geniappPackage.peerDependencies?.genispace;
const sdkPackage = readJson(sdkPackagePath);

if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(expectedVersion ?? '')) {
  throw new Error(
    `peerDependencies.genispace must be one exact version; received ${JSON.stringify(expectedVersion)}`,
  );
}

if (sdkPackage.version !== expectedVersion) {
  throw new Error(
    `SDK version mismatch: @genispace/geniapp expects ${expectedVersion}, but ${sdkPackagePath} declares ${sdkPackage.version}`,
  );
}

console.log(`SDK version contract verified: genispace@${expectedVersion}`);
