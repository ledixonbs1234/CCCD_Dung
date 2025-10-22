# CCCD Chrome Extension - AI Coding Guidelines

## Project Overview
This is a **Chrome Extension** for CCCD (Căn cước công dân) management that integrates with Firebase for real-time data synchronization and vnpost.vn for postal services. The extension uses React + TypeScript with Redux Toolkit for state management.

## Architecture & Entry Points

### Multi-Entry Webpack Build
- **Popup**: `src/popup/index.tsx` - Main extension interface
- **Options**: `src/option/option.tsx` - Extension settings page  
- **Background**: `src/background/background.ts` - Service worker for Chrome APIs
- **Content Script**: `src/contentScript/contentScript.tsx` - Injected into web pages
- **New Tab**: `src/tabs/index.tsx` - Custom new tab override

### Firebase Integration Pattern
Firebase config is hardcoded in popup components with real-time database structure:
```
CCCDAPP/
├── {firebase_key}/
│   ├── message/
│   └── cccdauto
```
Firebase key management allows multiple users/rooms to avoid conflicts.

## State Management

### Redux Store Structure (`src/popup/store.tsx`)
- Single store with `popup` slice
- State includes: `khachHangList`, `selectedKH`, `selectedBG`, `checkOption[]`
- Auto-calculates counts for different status types (Đã chấp nhận, Đang đi thu gom, etc.)

### Chrome Storage Pattern
Use Chrome extension storage APIs, NOT localStorage:
```typescript
// Reading
chrome.storage.local.get([key], callback)
// Writing  
chrome.storage.local.set({[key]: value})
```
See `src/popup/utils/useLocalState.tsx` for the pattern.

## Development Workflow

### Build Commands
```bash
npm run dev     # Development build with watch mode
npm run build   # Production build with watch mode
```

### Key Build Configuration
- **Webpack**: Multi-entry setup in `webpack.common.js`
- **CSS**: TailwindCSS + PostCSS pipeline with Ant Design components
- **TypeScript**: Strict mode enabled with Chrome types
- **Assets**: Static files copied from `src/static/` to `dist/`

## Chrome Extension Specifics

### Manifest V3 Structure
- Service worker background script (not persistent)
- Content script injected on `<all_urls>`
- New tab override functionality
- Permissions: tabs, storage, cookies, notifications, unlimitedStorage

### Message Passing Pattern
Background script handles:
- `onSaveTenKhachHangs` - Save customer names
- `onSaveKhachHangs` - Save customer data
- `BADGE` - Update extension badge
- `onFetchData` - API calls to vnpost.vn

## Data Flow & Integration

### External APIs
- **vnpost.vn**: POST to `/Order/Home/ExportExcellOrderManage` for order data
- **Firebase Realtime DB**: Real-time sync with mobile app counterpart
- **Content Script**: Monitors DOM for "Không tìm khách hàng" text patterns

### Type Definitions (`src/states/states.ts`)
Core types: `DataSnapshotProps`, `BuuGuiProps`, `KhachHangProps`
- Each customer has multiple postal items (`BuuGuis`)
- Status tracking: Đã chấp nhận, Đang đi thu gom, Nhận hàng thành công, Đã phân hướng

## UI Patterns

### Component Structure
- Ant Design for UI components (Button, Input, Space)
- TailwindCSS for custom styling
- React hooks for state management
- Redux Toolkit for global state

### Firebase Key Management UI
Orange warning state when no key configured, green status when active.
Key validation: alphanumeric + underscore/hyphen, max 20 chars.

## Critical Files for Understanding
- `src/popup/popup.tsx` - Main UI and Firebase logic
- `src/background/background.ts` - Chrome API integrations  
- `src/states/states.ts` - Core type definitions
- `webpack.common.js` - Build configuration
- `src/static/manifest.json` - Extension capabilities

## Debugging Notes
- Use Chrome DevTools for popup/options debugging
- Background script logs to extension service worker console
- Content script debugging in target page console
- Firebase data visible in Firebase Realtime Database console
