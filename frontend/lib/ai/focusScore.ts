/**
 * Focus score aggregator
 * 
 * Combines individual metrics (eye contact, face presence, head position) 
 * into a composite focus score (0-100).
 * 
 * Different weighting strategies can be applied based on the use case.
 */

/**
 * Calculate composite focus score from individual metrics
 * @param eyeContactScore - Score for eye contact (0-100)
 * @param facePresenceScore - Score for face presence (0-100)
 * @param headPositionScore - Score for head position (0-100)
 * @param weights - Optional weights for each component (should sum to 1.0)
 * @returns number - Composite focus score (0-100)
 */
export function calculateFocusScore(
  eyeContactScore: number,
  facePresenceScore: number,
  headPositionScore: number,
  weights: {
    eyeContact?: number;
    facePresence?: number;
    headPosition?: number;
  } = {}
): number {
  // Default weights (equal weighting)
  const wEyeContact = weights.eyeContact ?? 0.33;
  const wFacePresence = weights.facePresence ?? 0.33;
  const wHeadPosition = weights.headPosition ?? 0.34; // Adjust to sum to 1.0
  
  // Ensure weights sum to 1.0 (normalize if needed)
  const totalWeight = wEyeContact + wFacePresence + wHeadPosition;
  const normalizedWeights = {
    eyeContact: wEyeContact / totalWeight,
    facePresence: wFacePresence / totalWeight,
    headPosition: wHeadPosition / totalWeight,
  };
  
  // Calculate weighted average
  const focusScore = 
    eyeContactScore * normalizedWeights.eyeContact +
    facePresenceScore * normalizedWeights.facePresence +
    headPositionScore * normalizedWeights.headPosition;
  
  // Clamp to 0-100 range
  return Math.max(0, Math.min(100, Math.round(focusScore)));
}

/**
 * Alternative weighting strategy that emphasizes face presence more heavily
 * (since if no face is detected, other scores are meaningless)
 */
export function calculateFocusScoreWeighted(
  eyeContactScore: number,
  facePresenceScore: number,
  headPositionScore: number
): number {
  // If face presence is low, overall focus should be low
  // Otherwise, combine eye contact and head position
  
  // Face presence acts as a gatekeeper
  const facePresenceFactor = facePresenceScore / 100; // 0.0 to 1.0
  
  // Calculate average of eye contact and head position
  const avgOtherScores = (eyeContactScore + headPositionScore) / 2;
  
  // Combine: focus score is face presence factor times the average of other scores
  // This ensures if face presence is 0, focus score is 0 regardless of other scores
  const focusScore = facePresenceFactor * avgOtherScores;
  
  return Math.round(Math.max(0, Math.min(100, focusScore)));
}

/**
 * Calculate focus score with temporal smoothing
 * Helps reduce jitter in the score from frame to frame
 */
export class FocusScoreSmoother {
  private scores: number[];
  private readonly windowSize: number;
  
  constructor(windowSize: number = 5) {
    this.scores = [];
    this.windowSize = windowSize;
  }
  
  /**
   * Add a new score and get the smoothed average
   * @param score - New focus score (0-100)
   * @returns number - Smoothed focus score
   */
  update(score: number): number {
    this.scores.push(score);
    
    // Keep only the last windowSize scores
    if (this.scores.length > this.windowSize) {
      this.scores.shift();
    }
    
    // Calculate average
    const sum = this.scores.reduce((acc, val) => acc + val, 0);
    return Math.round(sum / this.scores.length);
  }
  
  /**
   * Reset the smoother
   */
  reset(): void {
    this.scores = [];
  }
}

export default {
  calculateFocusScore,
  calculateFocusScoreWeighted,
  FocusScoreSmoother,
};