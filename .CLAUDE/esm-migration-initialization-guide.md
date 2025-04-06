# ESM Migration Guide: Common Pitfalls and Best Practices

## Key Mistakes to Avoid

1. **Misinterpreting Dynamic Imports**
   - **Mistake**: Assuming dynamic imports (`import()`) are used only for circular dependencies
   - **Reality**: They often control initialization order, especially for configuration systems

2. **Initialization Order Blindness**
   - **Mistake**: Converting dynamic imports to static imports without considering bootstrap sequence
   - **Consequence**: Module initialization occurs before application is ready, causing runtime errors

3. **Oversimplified Testing**
   - **Mistake**: Making batch changes without validating each module's behavior
   - **Result**: Subtle initialization issues appear only in specific runtime conditions

## Correct Approach

1. **Analyze Before Converting**
   - Determine if dynamic imports control initialization order
   - Check for configuration systems that must be enabled before use
   - Identify singletons created at import time

2. **Apply Lazy Initialization Pattern**
   ```typescript
   // Before conversion: Verify if code follows this pattern
   const module = await import('./module.js');
   module.doSomething();
   
   // After conversion: Use lazy initialization
   // 1. Keep static import
   import { moduleInterface } from './module.js';
   // 2. Ensure module initializes on first use, not at import time
   ```

3. **Implement Deferred Singletons**
   - Add initialization guards to constructors
   - Include initialization check in all public methods
   - Preserve the public API to avoid breaking changes

## Testing Strategy

1. Test application startup sequence specifically
2. Verify configuration systems initialize correctly
3. Test modules with complex dependencies individually

---

This approach maintains the benefits of static imports (improved tooling, explicit dependencies) while properly handling initialization order requirements in ESM environments.
