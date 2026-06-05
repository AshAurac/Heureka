import { describe, expect, it } from 'vitest';
import { SOCRATIC_MASTER_PROMPT } from './prompts';

describe('SOCRATIC_MASTER_PROMPT', () => {
  it('is a non-empty string', () => {
    expect(typeof SOCRATIC_MASTER_PROMPT).toBe('string');
    expect(SOCRATIC_MASTER_PROMPT.length).toBeGreaterThan(0);
  });

  it('contains the NO-ANSWER RULE', () => {
    expect(SOCRATIC_MASTER_PROMPT).toContain('NO-ANSWER RULE');
  });

  it('contains the BREAKTHROUGH MOMENTS section', () => {
    expect(SOCRATIC_MASTER_PROMPT).toContain('BREAKTHROUGH MOMENTS');
  });

  it('contains the COACH TONE placeholder', () => {
    expect(SOCRATIC_MASTER_PROMPT).toContain('{COACH_MODE}');
  });

  it('contains all three response tier descriptions', () => {
    expect(SOCRATIC_MASTER_PROMPT).toContain('Tier 1');
    expect(SOCRATIC_MASTER_PROMPT).toContain('Tier 2');
    expect(SOCRATIC_MASTER_PROMPT).toContain('Tier 3');
  });

  it('contains CONTEXT RULES', () => {
    expect(SOCRATIC_MASTER_PROMPT).toContain('CONTEXT RULES');
  });

  it('does not contain a concrete coach mode instruction (that should be injected at runtime)', () => {
    // The placeholder should be present; concrete mode text should not
    expect(SOCRATIC_MASTER_PROMPT).not.toMatch(/encouraging.*humourous.*reflective/i);
  });
});