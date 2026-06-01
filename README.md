# 🎯 Precision Auto-Clicker Chrome Extension

A Chrome Extension (Manifest V3) designed to auto-click webpage buttons or elements at a user-defined schedule with millisecond-level precision. This extension bypasses browser resource-throttling delays using a tiered hybrid scheduling system combined with a brief CPU spin-lock.

---

## 🚀 Purpose & Features
Modern browsers (Chrome, Edge, Safari) aggressively throttle timers (`setTimeout`, `setInterval`) on inactive, hidden, or even active pages to save CPU cycles and battery. For time-sensitive scenarios (e.g., ticket booking, flash sales, auction bids, or automated testing), a delay of just a few milliseconds can be critical.

This extension provides:
1. **Direct Element Targeting**: Right-click context menu selector allows targeting any DOM element on the page.
2. **Glassmorphic Floating Scheduler Overlay**: An in-page configuration panel to set dates, times, and exact milliseconds.
3. **Pulsing Highlight Indicator**: Distinct green/violet glowing outline indicating which element is targeted.
4. **Millisecond Accuracy**: A proprietary timing engine that guarantees click execution down to the exact millisecond.
5. **Full Event Sequence Simulation**: Emulates native user interactions (`pointerdown`, `mousedown`, `pointerup`, `mouseup`, `click`) to trigger event handlers in modern frameworks (React, Vue, Angular, etc.).

---

## 🛠️ Technical Architecture & Intricacies

### 1. High-Precision Hybrid Timer Loop
Standard JavaScript timers are notoriously imprecise due to the single-threaded nature of the event loop. If the thread is busy rendering or running garbage collection, a `setTimeout` can fire tens of milliseconds late.

To guarantee sub-millisecond precision, the extension implements a **multi-tiered scheduler**:

```
[Start Schedule]
       │
       ▼
┌──────────────────────────────┐
│  Remaining Time > 1000ms?    ├─► YES ─► Sleep using setTimeout(..., 300)
└──────────────┬───────────────┘
               │ NO
               ▼
┌──────────────────────────────┐
│  Remaining Time > 100ms?     ├─► YES ─► Sleep using setTimeout(..., 30)
└──────────────┬───────────────┘
               │ NO
               ▼
┌──────────────────────────────┐
│  Remaining Time > 10ms?      ├─► YES ─► Sleep using setTimeout(..., 1)
└──────────────┬───────────────┘
               │ NO (Time is critical, <= 10ms remaining)
               ▼
┌────────────────────────────────────────────────────────┐
│ Enter Synchronous CPU Spin-lock                        │
│ while (Date.now() < targetTime) { /* busy wait */ }    │
└──────────────┬─────────────────────────────────────────┘
               │
               ▼
    [Execute Click Sequence]
```

* **Tier 1 (Relaxed Sleep)**: When the target time is far away (>1000ms), it uses long `setTimeout` calls (300ms) to keep CPU usage at 0%.
* **Tier 2 (Approaching Sleep)**: Between 100ms and 1000ms, it checks every 30ms.
* **Tier 3 (Frequent Sleep)**: Between 10ms and 100ms, it checks every 1ms.
* **Tier 4 (CPU Spin-Lock)**: Once the time remaining is $\le 10$ms, it locks the JavaScript main thread with a synchronous `while` loop until the precise target millisecond is reached. This blocks all other browser events, rendering, or GC sweeps from interrupting the thread at the execution boundary.

### 2. Tab Visibility & Throttling
Chrome suspends background workers and severely throttles timers (often to once per minute or once per second) on background tabs. To ensure the timing loop performs accurately:
* **The tab must remain visible and active** as the scheduled time approaches.
* The script utilizes `Date.now()` which maps directly to the computer's system local clock context.

### 3. Mouse Event Cycle Simulation
Many modern frameworks register listeners on pointer/touch actions instead of the simple `click` event. To bypass this, when the timer fires, the script programmatically focus the element and dispatches a sequence of events:
1. `pointerdown` (Pointer is pressed)
2. `mousedown` (Mouse button is pressed)
3. `pointerup` (Pointer is released)
4. `mouseup` (Mouse button is released)
5. `click` (Click action occurs)

---

## 📂 File Structure

* **`manifest.json`**: Manifest V3 registration, defining context menu permissions (`contextMenus`, `activeTab`), background worker, action popup, and content injection rules.
* **`background.js`**: Background service worker that sets up the context menu item and forwards events to the active tab.
* **`content.js`**: Main content script that tracks right-clicked targets, injects the glassmorphic overlay, runs the high-precision hybrid loop, and fires the click simulation.
* **`content.css`**: Styling sheet for the floating UI overlay panel (using glassmorphic backdrop filters and custom dark mode themes).
* **`popup.html` / `popup.js`**: Chrome Action button popup containing user instructions and active scheduling status.
* **`test-clicker.html`**: Interactive local test page showing a live clock (with milliseconds) and click event logging for accuracy verification.

---

## 💻 Installation

1. Open **Google Chrome**.
2. Navigate to `chrome://extensions/`.
3. Enable **Developer mode** (toggle in the top-right corner).
4. Click **Load unpacked** (top-left).
5. Select the folder `precision-autoclicker`.

---

## 🧪 How to Verify Precision

1. Open the [test-clicker.html](test-clicker.html) file in Chrome.
2. Right-click on the **CLICK ME** button.
3. Choose **🎯 Target element for Auto-Click** in the context menu.
4. Set your target local time (e.g. 20 seconds from now) and select a precise millisecond (e.g., `.750` ms).
5. Click **Start Scheduler**. Keep the tab focused.
6. Check the page's event log: the click event will show an exact match with your target timestamp!
