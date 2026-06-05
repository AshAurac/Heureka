import { describe, expect, it } from 'vitest';
import { parseSubjects, normalizeTaskEntries, resolveActiveContext } from './profileUtils';

describe('parseSubjects', () => {
  it('returns an array as-is', () => {
    expect(parseSubjects(['English', 'Math'])).toEqual(['English', 'Math']);
  });

  it('splits a newline-separated string', () => {
    expect(parseSubjects('English\nMath\nHistory')).toEqual(['English', 'Math', 'History']);
  });

  it('trims whitespace from each subject', () => {
    expect(parseSubjects('  English  \n  Math  ')).toEqual(['English', 'Math']);
  });

  it('filters empty lines', () => {
    expect(parseSubjects('English\n\nMath\n')).toEqual(['English', 'Math']);
  });

  it('handles null/undefined gracefully', () => {
    expect(parseSubjects(null)).toEqual([]);
    expect(parseSubjects(undefined)).toEqual([]);
  });
});

describe('normalizeTaskEntries', () => {
  it('creates one entry per subject with a default assignment', () => {
    const result = normalizeTaskEntries({}, ['English', 'Math']);
    expect(result).toHaveProperty('English');
    expect(result).toHaveProperty('Math');
    expect(result.English.assignments).toHaveLength(1);
    expect(result.English.assignments[0].name).toBe('Assignment 1');
  });

  it('migrates legacy taskSheet and criteria to the default assignment', () => {
    const result = normalizeTaskEntries({}, ['English'], 'Write an essay', 'Clear thesis');
    expect(result.English.assignments[0].taskSheet).toBe('Write an essay');
    expect(result.English.assignments[0].criteria).toBe('Clear thesis');
  });

  it('preserves existing assignments', () => {
    const existing = {
      English: {
        assignments: [
          { name: 'PIA 1', taskSheet: 'Task A', criteria: 'Criteria A' },
        ],
      },
    };
    const result = normalizeTaskEntries(existing, ['English']);
    expect(result.English.assignments).toHaveLength(1);
    expect(result.English.assignments[0].name).toBe('PIA 1');
  });

  it('fills in missing fields for existing assignments', () => {
    const existing = {
      English: {
        assignments: [{ name: 'PIA 1' }],
      },
    };
    const result = normalizeTaskEntries(existing, ['English']);
    expect(result.English.assignments[0].taskSheet).toBe('');
    expect(result.English.assignments[0].criteria).toBe('');
  });
});

describe('resolveActiveContext', () => {
  const profile = {
    subjects: ['English', 'Math'],
    taskEntries: {
      English: {
        assignments: [
          { name: 'PIA 1', taskSheet: 'Write an essay', criteria: 'Clear thesis' },
          { name: 'PIA 2', taskSheet: 'Write a report', criteria: 'Data analysis' },
        ],
      },
    },
    taskSheet: 'Default task',
    criteria: 'Default criteria',
  };

  it('resolves subjects from a string array', () => {
    const result = resolveActiveContext(profile, '', '');
    expect(result.subjects).toEqual(['English', 'Math']);
  });

  it('resolves the active subject', () => {
    const result = resolveActiveContext(profile, 'Math', '');
    expect(result.selectedSubject).toBe('Math');
  });

  it('falls back to the first subject when activeSubject is not in the list', () => {
    const result = resolveActiveContext(profile, 'History', '');
    expect(result.selectedSubject).toBe('English');
  });

  it('resolves the selected assignment by name', () => {
    const result = resolveActiveContext(profile, 'English', 'PIA 2');
    expect(result.selectedAssignment?.name).toBe('PIA 2');
  });

  it('falls back to the first assignment when name not found', () => {
    const result = resolveActiveContext(profile, 'English', 'Unknown');
    expect(result.selectedAssignment?.name).toBe('PIA 1');
  });

  it('returns legacy taskSheet/criteria when no assignment is selected', () => {
    const result = resolveActiveContext(profile, 'Math', '');
    expect(result.selectedTask.taskSheet).toBe('Default task');
    expect(result.selectedTask.criteria).toBe('Default criteria');
  });

  it('handles null profile gracefully', () => {
    const result = resolveActiveContext(null, '', '');
    expect(result.subjects).toEqual([]);
    expect(result.selectedSubject).toBe('');
    expect(result.subjectAssignments).toEqual([]);
    expect(result.selectedAssignment).toBeNull();
  });
});