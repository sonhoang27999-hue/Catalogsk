# Viet Chinese Bridge Companion

Build a new project named "SK Translate" — a mobile-first Vietnamese ↔ Simplified Chinese translator prototype for personal use in China.

IMPORTANT ARCHITECTURE:
- Local-first. DO NOT enable or use Supabase, Firebase, authentication, accounts, cloud database, or server-side persistence.
- All user data must be stored locally in the device/browser using IndexedDB/localStorage abstractions, designed so it can later be ported to a native iOS app.
- This first build is a functional PWA-style prototype, not the final native offline translation engine. Clearly separate the translation-engine adapter from UI/local storage so a future on-device Chinese↔Vietnamese model can be plugged in.
- No fake claim that translation is truly offline AI yet. For this prototype, include a local demo dictionary/rule engine and an explicit "Offline demo engine" indicator.

PRODUCT:
1. Home/Translate screen:
   - language direction toggle Việt ↔ 中文
   - large text input
   - prominent microphone button UI
   - Translate button
   - result card with Chinese/Vietnamese translation, Pinyin when Chinese is output, Copy, Speak, Favorite
   - fast one-tap phrase chips
   - status badge: Offline demo
2. Conversation mode:
   - two-sided chat-like translator
   - user can switch speaker language
   - input + translated result + speak/copy
3. History:
   - locally persisted translation history
   - search, favorite, delete
   - show timestamp and direction
4. Favorites:
   - saved phrases
   - categories: Đàm phán giá, Đặt hàng, Nhà máy, Logistics, Giao tiếp
5. SK Dictionary:
   - local custom terminology
   - Vietnamese, Chinese, Pinyin, category, notes
   - seed it with useful automotive/ambient-light terms such as 氛围灯, 灯带, 模具, 批发价, 最小起订量, 保修, 包装, 生产周期
   - add/edit/delete/search
6. China Business Mode:
   - phrase categories: Airport, Taxi, Hotel, Restaurant, Factory, Price negotiation, Ordering, Logistics, Quality inspection
   - tap a phrase to put it into translator and/or speak it
7. Settings:
   - local-only privacy statement
   - text size
   - speech speed
   - auto-speak toggle
   - clear all local data
   - show "Translation engine: Offline demo / future on-device model"
8. Camera/OCR screen as a clearly marked placeholder for phase 2, with polished UI explaining it will support Chinese signs/labels.
9. Responsive mobile UI optimized for iPhone, but also usable desktop.
10. Bottom navigation: Translate, Conversation, Favorites, History, Settings; Dictionary and China Business Mode accessible from Home/cards.

DESIGN:
- Premium, minimal, fast, calm.
- White/near-white background, black typography, restrained red accent inspired by China/Vietnam, no gradients.
- Large touch targets, rounded cards, subtle shadows, excellent spacing.
- Use Vietnamese UI labels with Chinese examples.
- Make the app feel like a dedicated travel/work utility, not a generic dashboard.
- Include a compact "Offline" badge prominently.

FUNCTIONALITY:
- Implement local persistence immediately.
- Implement a deterministic demo translation adapter with a useful phrase/term dictionary and graceful fallback: if no exact local translation exists, show a clear "Chưa có bản dịch offline cho câu này" message rather than pretending AI translated it.
- Web Speech API may be used for speech playback if available, but label it as device/browser speech and gracefully degrade.
- Microphone button can use browser SpeechRecognition if available; otherwise show a friendly unavailable state. Do not send speech to a server.
- Keep all code modular: translation adapter, local storage service, seed data, UI components.
- Add an architecture README in the project explaining how to replace the demo adapter with a real on-device translation/speech model in a future native iOS build.
- Do not add any cloud database or external persistence.

Build the app now with polished production-quality UI and working local persistence.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://viet-chinese-bridge-companion.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/6d4eeb3c-bf2c-45a1-be75-3b03e2f48352).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
