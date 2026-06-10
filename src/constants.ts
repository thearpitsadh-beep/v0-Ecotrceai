// UI Configuration
export const UI = {
  SIDEBAR_WIDTH: 'w-72',
  CONTENT_MAX_WIDTH: 'max-w-7xl',
  TOAST_DURATION: 3000,
  ANIMATION_DURATION: 300,
  DEBOUNCE_DELAY: 500,
} as const;

// API Configuration
export const API = {
  CHAT_ENDPOINT: '/api/chat',
  INSIGHTS_ENDPOINT: '/api/insights',
  TIMEOUT_MS: 30000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY_MS: 1000,
  MAX_RETRY_DELAY_MS: 16000,
  RATE_LIMIT_DELAY_MS: 1000,
} as const;

// Validation Limits
export const LIMITS = {
  MAX_MESSAGE_LENGTH: 5000,
  MAX_FILE_SIZE_MB: 10,
  MAX_FILE_SIZE_BYTES: 10 * 1024 * 1024,
  MAX_MESSAGES_IN_CONVERSATION: 100,
  MAX_ACTIVITIES_PER_REQUEST: 10,
  MIN_MESSAGE_LENGTH: 1,
} as const;

// Activity Types
export const ACTIVITY_TYPES = {
  TRANSPORTATION: 'Transportation',
  ENERGY: 'Energy',
  FOOD: 'Food',
  WASTE: 'Waste',
  SHOPPING: 'Shopping',
  OTHER: 'Other',
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Failed to connect. Please check your connection and try again.',
  RATE_LIMITED: 'Too many requests. Please wait a moment and try again.',
  SERVICE_UNAVAILABLE: 'The service is temporarily unavailable. Please try again soon.',
  TIMEOUT: 'Request timed out. Please try with a shorter message.',
  INVALID_INPUT: 'Please provide valid input.',
  FILE_TOO_LARGE: 'File is too large. Maximum size is 10MB.',
  INVALID_FILE_TYPE: 'Unsupported file type.',
  TOKEN_LIMIT: 'Conversation is too long. Please start a new chat.',
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  ACTIVITY_LOGGED: 'Activity logged successfully!',
  DATA_SYNCED: 'Data synced successfully!',
  PROFILE_UPDATED: 'Profile updated successfully!',
} as const;

// Local Storage Keys
export const STORAGE_KEYS = {
  ACTIVITIES: 'eco_activities',
  GREEN_POINTS: 'eco_points',
  STREAK: 'eco_streak',
  LAST_LOG_DATE: 'eco_last_log_date',
  THEME: 'eco_theme',
  USER_PREFERENCES: 'eco_user_preferences',
  CHAT_HISTORY: 'eco_chat_history',
} as const;

// Impact Calculations
export const IMPACT = {
  CAR_DRIVE_PER_KM: 0.21, // kg CO2e per km
  BUS_RIDE_PER_KM: 0.03, // kg CO2e per km
  FLIGHT_PER_KM: 0.255, // kg CO2e per km
  ELECTRICITY_PER_KWH: 0.385, // kg CO2e per kWh
  MEAL_VEGETARIAN: 1.25, // kg CO2e
  MEAL_MEAT: 6.61, // kg CO2e
  SHOPPING_PER_ITEM: 0.5, // kg CO2e
  WASTE_PER_KG: 0.3, // kg CO2e
} as const;

// Themes
export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
  AUTO: 'auto',
} as const;

// Grade Thresholds (kg CO2e per day)
export const GRADE_THRESHOLDS = {
  A: 5,
  B: 10,
  C: 15,
  D: 20,
  F: Infinity,
} as const;

// Date Formats
export const DATE_FORMATS = {
  SHORT: 'MMM dd, yyyy',
  LONG: 'MMMM dd, yyyy HH:mm',
  ISO: 'yyyy-MM-dd',
} as const;
