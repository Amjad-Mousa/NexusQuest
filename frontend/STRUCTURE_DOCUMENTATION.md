# Frontend Architecture Documentation

## 📁 Project Structure

```
frontend/src/
├── components/
│   ├── common/              # Reusable UI components
│   │   ├── DifficultyBadge.tsx
│   │   ├── LanguageBadge.tsx
│   │   ├── StatusBadge.tsx
│   │   ├── TaskCard.tsx
│   │   ├── QuizCard.tsx
│   │   ├── SearchAndFilter.tsx
│   │   ├── PageHeader.tsx
│   │   └── index.ts
│   ├── profile/             # Profile-specific components
│   ├── teacher/             # Teacher-specific components
│   ├── ui/                  # Base UI components (buttons, etc.)
│   └── [other components]   # Feature-specific components
├── utils/                   # Utility functions (NO UI)
│   ├── styleHelpers.ts      # Styling utilities
│   ├── dateHelpers.ts       # Date/time formatting
│   ├── colorHelpers.ts      # Color mapping
│   ├── arrayHelpers.ts      # Array operations
│   ├── storageHelpers.ts    # LocalStorage utilities
│   └── index.ts             # Central export
├── pages/                   # Page components (compose components)
├── services/                # API calls and business logic
├── hooks/                   # Custom React hooks
└── context/                 # React context providers
```

## 🛠️ Utils Organization

### **styleHelpers.ts** - UI Styling
```typescript
getDifficultyColor(difficulty: string): string
getLanguageColor(language: string): string
getQuizStatusColor(status: string): string
```

### **dateHelpers.ts** - Date/Time Operations
```typescript
formatDateTime(dateStr: string): string
getTimeAgo(date: Date): string
formatDate(dateStr: string): string
```

### **colorHelpers.ts** - Color Mapping
```typescript
getCategoryColor(category: string): string
getDifficultyColorForTutorial(difficulty: string): string
```

### **arrayHelpers.ts** - Array Operations
```typescript
groupBy<T>(array: T[], key: keyof T): Record<string, T[]>
sortByDate<T>(array: T[], descending?: boolean): T[]
```

### **storageHelpers.ts** - LocalStorage Management
```typescript
getUnreadMessages(): Record<string, number>
setUnreadMessages(unreadMap: Record<string, number>): void
incrementUnreadCount(userId: string): void
clearUnreadCount(userId: string): void
```

## 📦 Common Components

### Component Hierarchy
```
Pages (compose) → Common Components (use) → Utils (pure functions)
```

### Available Components

1. **DifficultyBadge** - Displays difficulty with consistent colors
2. **LanguageBadge** - Displays programming language
3. **StatusBadge** - Shows completion status
4. **TaskCard** - Complete task card with all UI
5. **QuizCard** - Complete quiz card with grades/status
6. **SearchAndFilter** - Unified search/filter component
7. **PageHeader** - Consistent page header with back button

## 🎯 Best Practices

### ✅ DO:
- **Extract utility functions** to `utils/` folder
- **Use common components** instead of inline JSX
- **Import from utils index** for cleaner imports: `import { formatDateTime } from '../utils'`
- **Keep pages clean** - they should compose components, not define UI
- **Group related utilities** in appropriate files

### ❌ DON'T:
- **Duplicate helper functions** across files
- **Put UI logic in utils** - utils should be pure functions
- **Create inline components** when a common component exists
- **Mix concerns** - keep styling, date, storage logic separate

## 📝 Import Examples

### Good ✅
```typescript
// Clean imports from utils index
import { formatDateTime, getCategoryColor, incrementUnreadCount } from '../utils';
import { TaskCard, SearchAndFilter } from '../components/common';
```

### Bad ❌
```typescript
// Don't import from individual files
import { formatDateTime } from '../utils/dateHelpers';
import { getCategoryColor } from '../utils/colorHelpers';

// Don't duplicate functions
const formatDateTime = (date) => { /* ... */ }
```

## 🔄 Migration Checklist

When adding new features:

- [ ] Check if utility function already exists in `utils/`
- [ ] Check if common component already exists in `components/common/`
- [ ] If creating new utility, add to appropriate file in `utils/`
- [ ] If creating reusable component, add to `components/common/`
- [ ] Update exports in `utils/index.ts` or `components/common/index.ts`
- [ ] Use TypeScript types for all functions and components
- [ ] Document complex utilities with JSDoc comments

## 📊 Code Quality Metrics

### Zero Redundancy
- ✅ No duplicate helper functions
- ✅ No duplicate color mapping logic
- ✅ No duplicate localStorage operations
- ✅ No duplicate date formatting

### Consistent Patterns
- ✅ All cards use common components
- ✅ All pages use PageHeader
- ✅ All filtering uses SearchAndFilter
- ✅ All utilities properly typed

### Clean Architecture
- ✅ Pages compose components
- ✅ Components use utilities
- ✅ Utilities are pure functions
- ✅ Clear separation of concerns

## 🚀 Performance Benefits

1. **Smaller Bundle Size** - No code duplication
2. **Better Tree Shaking** - Centralized exports
3. **Easier Maintenance** - Single source of truth
4. **Faster Development** - Reusable components
5. **Type Safety** - Consistent TypeScript types

## 📚 Related Documentation

- `COMPONENT_STRUCTURE.md` - Detailed component API docs
- `README.md` - Project setup and overview
- Individual component files - Inline documentation
