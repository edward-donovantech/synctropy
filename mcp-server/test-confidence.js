// Test confidence values to ensure they're in [0, 1]

// Case 1: Pairwise margin with tie (second = 0)
const top = 0.2;
const second = 0;
const confidenceWithZero = top / (top + second || 1);
console.log("Case 1 (top=0.2, second=0):", confidenceWithZero);

// Case 2: Pairwise margin with equal scores
const topEqual = 0.5;
const secondEqual = 0.5;
const confidenceEqual = topEqual / (topEqual + secondEqual);
console.log("Case 2 (top=0.5, second=0.5):", confidenceEqual);

// Case 3: Pairwise margin with clear winner
const topWinner = 0.8;
const secondWinner = 0.1;
const confidenceWinner = topWinner / (topWinner + secondWinner);
console.log("Case 3 (top=0.8, second=0.1):", confidenceWinner);

// Case 4: Lifecycle proportional (standard formula)
const lifecycleTop = 0.5;
const lifecycleTotal = 0.5;
const lifecycleConf = lifecycleTop / lifecycleTotal;
console.log("Case 4 (lifecycle top=0.5, total=0.5):", lifecycleConf);

// Case 5: Average of 2 confidences
const avgConf = (0.8 + 0.5) / 2;
console.log("Case 5 (average of 0.8 and 0.5):", avgConf);

// Case 6: Average when lifecycle is undefined (domainConfidence only)
const confOnlyDomain = 0.7;
console.log("Case 6 (domain only):", confOnlyDomain);

console.log("\nAll values are between 0 and 1:", [confidenceWithZero, confidenceEqual, confidenceWinner, lifecycleConf, avgConf, confOnlyDomain].every(v => v >= 0 && v <= 1));
