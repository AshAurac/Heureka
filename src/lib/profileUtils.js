/**
 * Parse a subjects value (string or array) into a clean string array.
 * @param {string|string[]} subjects
 * @returns {string[]}
 */
export function parseSubjects(subjects) {
  return Array.isArray(subjects)
    ? subjects
    : String(subjects || "")
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean);
}

/**
 * Normalize task entries for a given list of subjects, filling in defaults
 * where data is missing and migrating legacy top-level taskSheet/criteria.
 * @param {Object} taskEntries
 * @param {string[]} subjectList
 * @param {string} [legacyTaskSheet=""]
 * @param {string} [legacyCriteria=""]
 * @returns {Object}
 */
export function normalizeTaskEntries(taskEntries, subjectList, legacyTaskSheet = "", legacyCriteria = "") {
  const normalized = {};

  subjectList.forEach((subject) => {
    const rawEntry = taskEntries?.[subject] || {};
    const assignments =
      Array.isArray(rawEntry.assignments) && rawEntry.assignments.length > 0
        ? rawEntry.assignments.map((assignment, index) => ({
            name: String(assignment?.name || `Assignment ${index + 1}`).trim() || `Assignment ${index + 1}`,
            taskSheet: String(assignment?.taskSheet || ""),
            criteria: String(assignment?.criteria || ""),
          }))
        : [
            {
              name: "Assignment 1",
              taskSheet: String(legacyTaskSheet || rawEntry?.taskSheet || ""),
              criteria: String(legacyCriteria || rawEntry?.criteria || ""),
            },
          ];

    normalized[subject] = { assignments };
  });

  return normalized;
}

/**
 * Resolve the active subject, its assignments, and the selected assignment
 * from profile data and current UI state.
 * @param {Object|null} profile
 * @param {string} activeSubject
 * @param {string} activeAssignmentName
 * @returns {{ subjects: string[], selectedSubject: string, subjectAssignments: Object[], selectedAssignment: Object|null, selectedTask: Object }}
 */
export function resolveActiveContext(profile, activeSubject, activeAssignmentName) {
  const subjects = parseSubjects(profile?.subjects);
  const selectedSubject = subjects.includes(activeSubject) ? activeSubject : subjects[0] || "";
  const subjectAssignments = profile?.taskEntries?.[selectedSubject]?.assignments || [];
  const selectedAssignment =
    subjectAssignments.find((a) => a.name === activeAssignmentName) || subjectAssignments[0] || null;
  const selectedTask = selectedAssignment || { taskSheet: profile?.taskSheet || "", criteria: profile?.criteria || "" };

  return { subjects, selectedSubject, subjectAssignments, selectedAssignment, selectedTask };
}