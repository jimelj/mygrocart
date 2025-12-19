// src/__tests__/smoke.test.ts
// Simple smoke test to verify Jest is configured correctly

describe('Jest Infrastructure', () => {
  it('should run basic tests', () => {
    expect(true).toBe(true);
  });

  it('should perform basic arithmetic', () => {
    expect(2 + 2).toBe(4);
  });

  it('should handle async operations', async () => {
    const result = await Promise.resolve('success');
    expect(result).toBe('success');
  });
});
