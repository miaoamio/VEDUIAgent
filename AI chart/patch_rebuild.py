lines = []
with open('rebuild_simple.py', 'r') as f:
    lines = f.readlines()

# We want to replace the block of loops with our new logic.
# Based on Read output:
# Line 702 (index 701) starts the first loop: "          for (var s = 1; s < count; s++) {"
# Line 801 (index 800) ends the second loop: "          }"
# Line 803 (index 802) is "          // If still no valid S found..."

start_idx = -1
end_idx = -1

for i, line in enumerate(lines):
    if "for (var s = 1; s < count; s++) {" in line and "Relaxed condition" in lines[i+1]:
        start_idx = i
        break

for i in range(start_idx, len(lines)):
    if "if (bestS === -1) {" in line: # This is AFTER the loops
        # But wait, there are two "if (bestS === -1)" checks.
        # One inside the first loop (line 727).
        # One after the loops (line 804).
        pass
    
    # Let's look for the specific comment after the loops
    if "// If still no valid S found (e.g. huge number of points, tiny width)" in lines[i]:
        end_idx = i
        break

if start_idx != -1 and end_idx != -1:
    print(f"Replacing lines {start_idx+1} to {end_idx}")
    
    new_code = """          // Combined Loop Strategy
          var minGap = 12; // Reduced from 16 to allow more labels
          finalIndices = [0, count - 1]; 
          finalMaxLabelW = drawW;
          
          var bestS = -1;
          var bestCount = 0;
          var bestMaxW = 0;
          var bestScore = Infinity; // Lower is better
          
          // Iterate all possible steps
          for (var s = 1; s < count; s++) {
              var numLabels = Math.floor((count - 1) / s) + 1;
              var currentStepX = stepX * s;
              var limitW = (currentStepX - minGap);
              
              // Width Constraints
              if (limitW < 10) continue; // Absolute minimum
              
              if (maxLW > 0) {
                  if (limitW < maxLW * 0.8) continue; 
              } else {
                  if (limitW < 24) continue; // Fallback 24px (approx 3-4 chars)
              }
              
              // Score Calculation (Lower is better)
              // Base score: Distance from target count
              var diff = Math.abs(numLabels - targetCount);
              var score = diff;
              
              // Penalty for non-strict modulo (uneven spacing at end)
              if ((count - 1) % s !== 0) {
                  score += 1.5; // Penalty preference
              }
              
              // Update Best
              if (score < bestScore) {
                  bestScore = score;
                  bestS = s;
                  bestCount = numLabels;
                  bestMaxW = limitW;
              }
          }
          
"""
    # Keep the rest of the file
    new_lines = lines[:start_idx] + [new_code] + lines[end_idx:]
    
    with open('rebuild_simple.py', 'w') as f:
        f.writelines(new_lines)
    print("Success")
else:
    print("Could not find start/end markers")
