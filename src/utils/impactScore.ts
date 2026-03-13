// Compute impact score for a topic.
//
// impact_score =
//   (expected_marks * probability_of_completion) /
//   total_time_required
//
// total_time_required = study_time + practice_time

export function computeImpactScore(params: {
  expectedMarks: number;
  studyMinutes: number;
  practiceMinutes: number;
  probabilityOfCompletion: number;
}): number {
  const { expectedMarks, studyMinutes, practiceMinutes, probabilityOfCompletion } =
    params;

  const totalTime = Math.max(studyMinutes + practiceMinutes, 1); // avoid division by zero
  const p = Math.min(Math.max(probabilityOfCompletion, 0), 1);

  return (expectedMarks * p) / totalTime;
}

