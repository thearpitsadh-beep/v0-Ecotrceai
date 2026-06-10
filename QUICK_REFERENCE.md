# EcoTrace AI - Quick Reference Guide

## Common Tasks

### Add a New Feature
1. Define types in `src/lib/types/`
2. Add validation in `src/lib/validation/`
3. Create custom hook if needed in `src/hooks/`
4. Build component with accessibility
5. Add tests

### Make an API Call
```typescript
import { useFetchWithRetry } from '../hooks';

const { fetch, isLoading, isError } = useFetchWithRetry<ResponseType>();
const data = await fetch('/api/endpoint', { method: 'POST', body: {...} });
```

### Persist Data
```typescript
import { useLocalStorage } from '../hooks';

const [data, setData, removeData] = useLocalStorage('key', defaultValue);
```

### Handle Errors
```typescript
import { classifyError, getUserFriendlyMessage } from '../lib/utils/error.handler';

try {
  // operation
} catch (error) {
  const { code, message } = classifyError(error);
  const userMsg = getUserFriendlyMessage(code);
}
```

### Validate Types
```typescript
import { isCarbonActivity, isMessage, type guards } from '../lib/utils/type.guards';

if (isCarbonActivity(data)) {
  // data is safely typed as CarbonActivity
}
```

### Create Accessible Button
```typescript
import { AccessibleButton } from '../components/ui/AccessibleButton';

<AccessibleButton
  ariaLabel="Send message"
  variant="primary"
  size="lg"
  loading={isLoading}
>
  Send
</AccessibleButton>
```

### Optimize Calculation
```typescript
import { memoize } from '../lib/utils/performance.utils';

const expensiveFn = memoize((a, b) => complexCalc(a, b));
```

### Cache Data
```typescript
import { TTLCache } from '../lib/utils/performance.utils';

const cache = new TTLCache(5 * 60 * 1000); // 5 mins
cache.set('key', data);
if (cache.has('key')) return cache.get('key');
```

## File Locations

| Need | Location |
|------|----------|
| Constants | `src/constants.ts` |
| Custom Hooks | `src/hooks/` |
| Type Definitions | `src/lib/types/` |
| Validation | `src/lib/validation/` |
| Utilities | `src/lib/utils/` |
| Components | `src/components/` |
| Tests | `src/__tests__/` |

## Key Constants

```typescript
// Message limits
LIMITS.MAX_MESSAGE_LENGTH // 5000 chars
LIMITS.MAX_FILE_SIZE_MB   // 10 MB

// API config
API.CHAT_ENDPOINT         // '/api/chat'
API.TIMEOUT_MS            // 30000 ms
API.RETRY_ATTEMPTS        // 3
API.RETRY_DELAY_MS        // 1000 ms

// Storage keys
STORAGE_KEYS.CHAT_HISTORY
STORAGE_KEYS.USER_PREFERENCES
```

## Type Guards

```typescript
isCarbonActivity(obj)    // CarbonActivity
isMessage(obj)           // Message
isError(obj)             // Error
isStringArray(obj)       // string[]
isNumber(obj)            // number
isPositiveNumber(obj)    // positive number
isNonNegativeNumber(obj) // non-negative number
hasKeys(obj, 'a', 'b')   // has keys
```

## Error Codes

| Code | Description | Retryable |
|------|-------------|-----------|
| NETWORK_ERROR | Connection failed | Yes |
| TIMEOUT | Request timed out | Yes |
| RATE_LIMITED | Too many requests | Yes |
| SERVICE_UNAVAILABLE | Server down | Yes |
| VALIDATION_ERROR | Invalid input | No |
| NOT_FOUND | 404 Not Found | No |
| UNAUTHORIZED | 401 Auth failed | No |
| FORBIDDEN | 403 Access denied | No |
| TOKEN_LIMIT | Conversation too long | No |

## Accessibility

```typescript
// Generate unique IDs
generateId('prefix') // 'prefix-1'

// Keyboard helpers
isKey(event, KEYS.ENTER)
isActivationKey(event)
trapFocus(container, event)

// Focus management
focusManagement.focus(element)
focusManagement.getCurrent()
focusManagement.restoreFocus(previous)

// Screen reader
announce('Message sent!', 'polite')
announce('Error occurred', 'assertive')

// Focus trap in modals
trapFocus(modalRef, event)

// Accessible truncation
const { truncated, hasTooltip } = truncateWithTooltip(text, 50)
```

## Performance Patterns

```typescript
// Memoize expensive function
const memoized = memoize(expensiveFn, { maxSize: 100 })

// Calculate with caching
const impact = calculateImpact('km', 100, 'car')

// Grade assignment with caching
const grade = getGrade(dailyCO2e)

// Deduplicate API calls
const dedup = new RequestDeduplicator()
const result = await dedup.deduplicate('key', fetchFn)

// Cache with TTL
const cache = new TTLCache(5 * 60 * 1000)
cache.set('key', value)

// Batch requests
const batcher = new RequestBatcher()
await batcher.batch('key', item, batchFn)

// Measure performance
const monitor = new PerformanceMonitor()
monitor.mark('start')
// ... operation
monitor.measure('operation', 'start')
```

## Testing

### Run Tests
```bash
npm run test              # Watch mode
npm run test -- --run    # Single run
npm run test:coverage    # With coverage
npm run test:ui          # UI mode
```

### Test Structure
```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('Feature', () => {
  beforeEach(() => {
    // Setup
  });

  afterEach(() => {
    // Cleanup
  });

  it('should do something', () => {
    expect(result).toBe(expected);
  });
});
```

## Deployment Checklist

- [ ] All tests passing
- [ ] Build successful
- [ ] No console errors
- [ ] Accessibility audit passed
- [ ] Performance metrics acceptable
- [ ] Security scan passed
- [ ] Error tracking configured
- [ ] Environment variables set
- [ ] API endpoints verified
- [ ] LocalStorage limits checked

## Debug Tips

```typescript
// Log with context
console.log('[ComponentName] State:', state);

// Type checking
console.log(typeof value); // Check type at runtime

// Guard validation
if (!isCarbonActivity(data)) {
  console.error('Invalid activity:', data);
}

// Error details
try {
  // operation
} catch (error) {
  console.error('Context:', error);
  const { code, message } = classifyError(error);
  console.log('Code:', code, 'Message:', message);
}
```

## Documentation Links

- **ARCHITECTURE.md** - Deep dive architecture guide
- **OPTIMIZATION_COMPLETE.md** - Complete project summary
- **SECURITY_TESTING.md** - Security & testing details
- **CHATBOT_REFACTORING.md** - Chatbot-specific improvements

## Support

For issues or questions:
1. Check ARCHITECTURE.md first
2. Review test examples in `src/__tests__/`
3. Look at existing component implementations
4. Run tests to verify changes

---

**Last Updated:** 2024
**Version:** 1.0
**Status:** Production Ready
