# EcoTrace AI - Architecture & Optimization Guide

## Overview

This document describes the architecture improvements, patterns, and best practices implemented in EcoTrace AI to achieve high standards in code quality, security, performance, accessibility, and testing.

## Directory Structure

```
src/
├── components/
│   └── ui/                    # Reusable accessible UI components
│       └── AccessibleButton.tsx
├── hooks/                     # Custom React hooks
│   ├── useFetchWithRetry.ts   # Network request with retry logic
│   ├── useAIChat.ts           # AI chat state management
│   ├── useLocalStorage.ts     # Persistent state storage
│   ├── useDebounce.ts         # Input debouncing
│   ├── usePrevious.ts         # Previous value tracking
│   └── index.ts               # Barrel export
├── lib/
│   ├── services/              # Business logic services
│   ├── utils/                 # Utility functions
│   │   ├── performance.utils.ts    # Memoization, caching, batching
│   │   ├── type.guards.ts          # Type validation helpers
│   │   ├── error.handler.ts        # Error classification & handling
│   │   └── a11y.utils.ts           # Accessibility utilities
│   ├── validation/            # Input validation schemas
│   └── types/
│       ├── api.types.ts       # API request/response types
│       └── utility.types.ts    # Generic utility types
├── constants.ts               # Central configuration
├── __tests__/                 # Test files mirror src structure
└── App.tsx
```

## Key Architectural Patterns

### 1. Constants Centralization

All configuration, limits, and constants are defined in `src/constants.ts` for:
- Easy updates
- Single source of truth
- Type-safe configuration

```typescript
// UI limits
export const LIMITS = {
  MAX_MESSAGE_LENGTH: 5000,
  MAX_FILE_SIZE_BYTES: 10 * 1024 * 1024,
};

// API endpoints
export const API = {
  CHAT_ENDPOINT: '/api/chat',
  TIMEOUT_MS: 30000,
  RETRY_ATTEMPTS: 3,
};
```

### 2. Custom Hooks for Reusable Logic

#### useFetchWithRetry
Handles network requests with automatic retry and timeout:
- Exponential backoff (1s, 2s, 4s, up to 16s)
- 30-second request timeout
- Automatic cleanup on unmount
- Type-safe response handling

```typescript
const { state, fetch, isLoading, isError } = useFetchWithRetry<ChatMessage>();
const data = await fetch('/api/chat', { method: 'POST', body: messages });
```

#### useAIChat
Manages chat state with localStorage persistence:
- Message validation before sending
- Automatic persistence
- Error recovery
- Message history management

```typescript
const { messages, sendMessage, clearChat } = useAIChat();
const success = await sendMessage('Hello, AI!');
```

#### useLocalStorage
Type-safe persistent state with cross-tab sync:
- JSON serialization
- Graceful error handling
- Storage event sync

```typescript
const [favorites, setFavorites] = useLocalStorage('favorites', []);
```

### 3. Performance Optimizations

#### Memoization
Cache expensive computations:
```typescript
const calculateImpact = memoize((type, value, unit) => {
  // Expensive calculation
  return value * factor;
}, { maxSize: 200 });
```

#### Request Deduplication
Prevent duplicate API calls:
```typescript
const dedup = new RequestDeduplicator();
const result = await dedup.deduplicate('chat-key', () => fetchChat());
```

#### TTL Caching
Time-based cache expiration:
```typescript
const cache = new TTLCache(5 * 60 * 1000); // 5 minute TTL
cache.set('insights', data);
```

#### Request Batching
Batch multiple requests into one:
```typescript
const batcher = new RequestBatcher();
await batcher.batch('activity', payload, (items) => postBatch(items));
```

### 4. Type Safety

#### Type Guards
Validate runtime types:
```typescript
if (isCarbonActivity(data)) {
  // data is CarbonActivity
}

if (isMessage(msg)) {
  // msg is Message
}
```

#### Discriminated Unions
Better error handling:
```typescript
type ApiResponse<T> = 
  | { success: true; data: T }
  | { success: false; error: string; code: string };

if (response.success) {
  // response.data is available
}
```

#### Async State
Type-safe async operations:
```typescript
type AsyncState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error };
```

### 5. Error Handling

#### Classification
Errors automatically classified:
```typescript
const { code, message, retryable } = classifyError(error);

if (code === 'RATE_LIMITED') {
  // Handle rate limiting
}
```

#### User-Friendly Messages
Consistent error messaging:
```typescript
const message = getUserFriendlyMessage('TIMEOUT');
// "Request timed out. Please try with a shorter message."
```

#### Error Context
Rich error context for debugging:
```typescript
throw new AppError('VALIDATION_ERROR', 'Invalid input', {
  field: 'email',
  received: 'invalid',
});
```

### 6. Accessibility (WCAG 2.1 AA)

#### Keyboard Navigation
```typescript
isKey(event, KEYS.ENTER);
trapFocus(container, event);
focusManagement.focus(element);
```

#### Screen Reader Support
```typescript
<AccessibleButton
  ariaLabel="Send message"
  ariaDescribedBy="send-help"
  ariaExpanded={expanded}
/>
```

#### Semantic HTML
- Proper heading hierarchy
- ARIA landmarks
- Focus management
- Color contrast (4.5:1 ratio)

#### AccessibleButton Component
Type-safe accessible button with:
- Full ARIA support
- Loading state
- Focus ring styling
- Icon support

```typescript
<AccessibleButton
  variant="primary"
  size="lg"
  ariaLabel="Send"
  loading={isLoading}
  icon={<SendIcon />}
>
  Send Message
</AccessibleButton>
```

## Testing Strategy

### Unit Tests
- Utility functions (performance, type guards, error handling)
- Hook logic
- Type validations

### Integration Tests
- API endpoints
- Chat flows
- Storage operations

### Accessibility Tests
- ARIA attributes
- Keyboard navigation
- Color contrast

### Performance Tests
- Memoization effectiveness
- Cache hit rates
- Re-render counts

## Performance Metrics

### Code Quality
- **Target**: 96+/100
- TypeScript strict mode enabled
- No `any` types
- Type coverage >98%

### Security
- **Target**: 96+/100
- Input validation on all endpoints
- CSRF protection
- XSS prevention (HTML sanitization)
- Secrets in environment variables

### Testing
- **Target**: 96+/100
- 100+ unit/integration tests
- Accessibility coverage
- Performance regression tests

### Accessibility
- **Target**: 96+/100
- WCAG 2.1 AA compliant
- Full keyboard support
- Screen reader optimized

### Performance (Runtime)
- **Target**: 96+/100
- <1s initial load
- <100ms message send
- <50ms UI updates
- Memoization + caching
- Code splitting with React.lazy

## Migration Guide

### Using Constants
```typescript
// Before
const maxLen = 5000;

// After
import { LIMITS } from '../constants';
const maxLen = LIMITS.MAX_MESSAGE_LENGTH;
```

### Using Custom Hooks
```typescript
// Before
const [messages, setMessages] = useState([]);
useEffect(() => {
  localStorage.setItem('chat', JSON.stringify(messages));
}, [messages]);

// After
const { messages, sendMessage } = useAIChat();
```

### Type Safety
```typescript
// Before
const data: any = response;

// After
if (isMessage(response)) {
  const message: Message = response;
}
```

### Error Handling
```typescript
// Before
catch (error) {
  console.error(error.message);
}

// After
catch (error) {
  const { code, message } = classifyError(error);
  announce(getUserFriendlyMessage(code), 'assertive');
}
```

## Best Practices

### 1. Always Validate Input
```typescript
const validation = validateMessage(content);
if (!validation.valid) {
  return;
}
```

### 2. Use Type Guards
```typescript
if (!isCarbonActivity(data)) {
  throw new AppError('VALIDATION_ERROR', 'Invalid activity');
}
```

### 3. Handle Async Properly
```typescript
const { state, fetch } = useFetchWithRetry<T>();
// Don't forget loading and error states
```

### 4. Memoize Expensive Operations
```typescript
const memoizedImpact = useMemo(
  () => calculateImpact(type, value, unit),
  [type, value, unit]
);
```

### 5. Cache API Responses
```typescript
const cache = new TTLCache(5 * 60 * 1000);
if (cache.has(key)) return cache.get(key);
```

### 6. Make Components Accessible
```typescript
<AccessibleButton ariaLabel="Send" ariaExpanded={expanded}>
  Send Message
</AccessibleButton>
```

## Performance Optimization Checklist

- [ ] Use `useMemo` for expensive calculations
- [ ] Use `useCallback` for event handlers
- [ ] Implement `React.lazy` for code splitting
- [ ] Use memoization for pure functions
- [ ] Cache API responses with TTL
- [ ] Debounce user input
- [ ] Deduplicate concurrent requests
- [ ] Batch API operations
- [ ] Use virtual scrolling for long lists
- [ ] Monitor Core Web Vitals

## Security Checklist

- [ ] Validate all inputs
- [ ] Sanitize HTML content
- [ ] Use HTTPS only
- [ ] Store secrets in environment variables
- [ ] Implement CSRF protection
- [ ] Rate limit API endpoints
- [ ] Secure localStorage access
- [ ] Use secure cookies (httpOnly, sameSite)
- [ ] Validate file uploads
- [ ] Log security events

## Accessibility Checklist

- [ ] All buttons have `aria-label`
- [ ] Links have descriptive text
- [ ] Images have alt text
- [ ] Forms have associated labels
- [ ] Color contrast ≥4.5:1
- [ ] Keyboard navigation works
- [ ] Focus indicators visible
- [ ] ARIA landmarks present
- [ ] Headings hierarchical
- [ ] No automatic content changes on focus

## Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React Hooks Documentation](https://react.dev/reference/react)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Web.dev Performance](https://web.dev/performance/)
