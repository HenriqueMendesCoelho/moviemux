import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const policy = readFileSync('pnpm-workspace.yaml', 'utf8');
const lockfile = readFileSync('pnpm-lock.yaml', 'utf8');
const dockerfile = readFileSync('Dockerfile', 'utf8');

describe('reviewed dependency install lifecycle policy', () => {
  it('approves only the reviewed vue-demi version pinned by the lockfile', () => {
    expect(policy).toContain("  'vue-demi@0.14.10': true");
    expect(lockfile).toContain('vue-demi@0.14.10:');
    expect(policy).not.toMatch(/^\s+['"]?vue-demi['"]?:\s*true/m);
  });

  it('keeps frozen installs and strict script checks instead of bypassing them', () => {
    expect(dockerfile).toContain('RUN pnpm install --frozen-lockfile');
    expect(dockerfile).not.toContain('--ignore-scripts');
    expect(policy).not.toMatch(/strictDepBuilds:\s*false|dangerouslyAllowAllBuilds:\s*true/);
  });
});
