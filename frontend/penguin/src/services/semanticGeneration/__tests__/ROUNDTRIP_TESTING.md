# Round-Trip Testing Utility

## Overview

The Round-Trip Testing Utility validates the complete cycle of semantic JSON generation and parsing:

1. **Load** example JSON file
2. **Parse** to state using semantic parsing service (backend)
3. **Generate** back to JSON using semantic generation service (frontend)
4. **Compare** original and generated JSON

This ensures that the semantic generation service is the true inverse of the semantic parsing service.

## Files

- `roundTripTestUtility.ts` - Core utility class with comparison logic
- `roundTrip.test.ts` - Unit tests for the utility
- `ROUNDTRIP_TESTING.md` - This documentation

## Usage

### Basic Usage

```typescript
import { RoundTripTestUtility } from './roundTripTestUtility';

const utility = new RoundTripTestUtility();

// Perform complete round-trip test
const result = await utility.performRoundTrip('/path/to/example.json');

if (result.success) {
  console.log('Round-trip successful!');
  console.log(`Semantic equivalence: ${result.semanticEquivalence}`);
  console.log(`Differences found: ${result.differences.length}`);
} else {
  console.error('Round-trip failed:', result.errors);
}
```

### Step-by-Step Usage

```typescript
// Step 1: Load example JSON
const originalJSON = await utility.loadExampleJSON('/path/to/example.json');

// Step 2: Parse to state
const state = await utility.parseToState(originalJSON);

// Step 3: Generate back to JSON
const generatedJSON = utility.generateFromState(state);

// Step 4: Compare
const { differences, semanticEquivalence } = utility.compareJSON(
  originalJSON,
  generatedJSON,
  {
    numericTolerance: 10,
    ignoreFields: ['context'],
    strictComparison: false,
  }
);
```

## Comparison Options

### `numericTolerance` (default: 10)

Tolerance for numeric value comparisons. Values within this tolerance are considered equal.

```typescript
const { differences } = utility.compareJSON(original, generated, {
  numericTolerance: 5, // Allow ±5 difference
});
```

### `ignoreFields` (default: [])

Array of field paths to ignore during comparison.

```typescript
const { differences } = utility.compareJSON(original, generated, {
  ignoreFields: ['short_description', 'context'],
});
```

### `strictComparison` (default: false)

When true, requires exact string matches. When false, allows semantic similarity.

```typescript
const { differences } = utility.compareJSON(original, generated, {
  strictComparison: true, // Require exact matches
});
```

## Difference Severity Levels

### Critical

Type mismatches or structural differences that indicate fundamental problems.

```typescript
{
  path: 'style_medium',
  original: 'photograph',
  generated: 123, // Wrong type!
  severity: 'critical',
  description: 'Type mismatch: string vs number'
}
```

### Major

Significant semantic differences that change meaning.

```typescript
{
  path: 'lighting.conditions',
  original: 'natural daylight',
  generated: 'dramatic studio lighting', // Very different!
  severity: 'major',
  description: 'String value differs (0% similarity)'
}
```

### Minor

Small wording differences that preserve semantic meaning.

```typescript
{
  path: 'background_setting',
  original: 'white background',
  generated: 'white backdrop', // Similar meaning
  severity: 'minor',
  description: 'String differs but semantically similar (75% match)'
}
```

## Semantic Equivalence

Two JSON objects are considered semantically equivalent when:

- **No critical differences** (type mismatches)
- **≤ 2 major differences** (significant semantic changes)
- **≤ 10 minor differences** (wording variations)

This allows for natural language variations while catching real problems.

## Testing with Example Files

The utility is designed to work with the example JSON files in `backend/examples/`:

```typescript
// Test with 01.json
const result1 = await utility.performRoundTrip('/backend/examples/01.json');

// Test with 02.json
const result2 = await utility.performRoundTrip('/backend/examples/02.json');

// Test with 03.json
const result3 = await utility.performRoundTrip('/backend/examples/03.json');
```

## Integration with Property-Based Testing

The utility can be used with property-based testing frameworks:

```typescript
import fc from 'fast-check';

fc.assert(
  fc.asyncProperty(
    fc.record({
      short_description: fc.string(),
      objects: fc.array(fc.record({ /* ... */ })),
      // ... other fields
    }),
    async (semanticJSON) => {
      const state = await utility.parseToState(semanticJSON);
      const generated = utility.generateFromState(state);
      const { semanticEquivalence } = utility.compareJSON(semanticJSON, generated);
      return semanticEquivalence;
    }
  ),
  { numRuns: 100 }
);
```

## Comparison Algorithm

### String Comparison

1. Normalize strings (trim, lowercase)
2. Split into words (filter out words ≤ 2 chars)
3. Calculate word overlap similarity
4. Classify based on similarity:
   - `> 50%` → Minor difference (semantically similar)
   - `< 20%` → Major difference (semantically different)
   - Between → Minor difference

### Numeric Comparison

1. Calculate absolute difference
2. Compare against tolerance
3. Classify based on difference:
   - Within tolerance → No difference
   - Within 2× tolerance → Minor difference
   - Beyond 2× tolerance → Major difference

### Type Comparison

Any type mismatch is classified as **critical**.

## Error Handling

The utility handles errors gracefully:

```typescript
const result = await utility.performRoundTrip('/invalid/path.json');

if (!result.success) {
  console.error('Errors:', result.errors);
  // result.errors contains detailed error messages
}
```

Common errors:
- Failed to load JSON file
- Failed to parse to state (backend service unavailable)
- Failed to generate from state (validation errors)

## Logging

The utility logs all operations for debugging:

```typescript
const utility = new RoundTripTestUtility(console);

// Logs:
// [RoundTrip] Loading example JSON from: /path/to/file.json
// [RoundTrip] Successfully loaded example JSON
// [RoundTrip] Parsing semantic JSON to state
// [RoundTrip] Successfully parsed to state
// [RoundTrip] Generating semantic JSON from state
// [RoundTrip] Successfully generated semantic JSON
// [RoundTrip] Comparing original and generated JSON
// [RoundTrip] Comparison complete: 3 differences found
// [RoundTrip] Semantic equivalence: true
```

## Best Practices

1. **Use appropriate tolerance** - Set `numericTolerance` based on expected precision
2. **Ignore volatile fields** - Use `ignoreFields` for timestamps or generated IDs
3. **Test with real examples** - Use actual example JSON files from the system
4. **Check semantic equivalence** - Don't require perfect matches, allow natural variations
5. **Review differences** - Examine all differences to understand conversion behavior

## Future Enhancements

- Support for custom comparison functions
- Detailed diff visualization
- Batch testing with multiple files
- Performance metrics (conversion time, memory usage)
- Automatic test generation from example files
