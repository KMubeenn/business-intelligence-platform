export const DATA_QUALITY_REVIEW_PROMPT = `
Inspect the following extracted dataset for anomalies.
Check for:
- Duplicate fields
- Inconsistent values in a column
- Summary rows (Totals) accidentally included as data rows
- Missing primary dimensions

Return a JSON object:
{
  "confidenceScore": 0.90,
  "warnings": ["Row 14 appears to be a Subtotal"],
  "suggestedCorrections": []
}
Do not include any explanations. Output ONLY valid JSON.
`;
