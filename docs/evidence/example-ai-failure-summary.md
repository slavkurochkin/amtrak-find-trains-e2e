# ❌ 1 failing test(s)

> Paste this file into an AI assistant (or point it at it) and ask: "Explain why each test failed and propose a fix. The app under test is amtrak.com/home; page objects live in src/, specs in tests/."

## 1. zz-demo-failure.spec.ts › DEMO deliberate failure: request destination mismatch

- **Spec:** `tests/zz-demo-failure.spec.ts:7`  •  **Project:** chromium-desktop  •  **Retry:** 0  •  **Status:** failed  •  **Duration:** 6.4s

**Error**
```
Error: outbound destination station

expect(received).toBe(expected) // Object.is equality

Expected: "BOS"
Received: "WAS"
```
**Code frame**
```ts
at ../src/utils/SearchRequestSpy.ts:96

  94 |   const [outbound, inbound] = journeyRequest.journeyLegRequests;
  95 |   expect(outbound.origin.code, 'outbound origin station').toBe(criteria.from.code);
> 96 |   expect(outbound.destination.code, 'outbound destination station').toBe(criteria.to.code);
     |                                                                     ^
  97 |   expect(outbound.origin.schedule.departureDateTime, 'outbound date').toBe(toApiFormat(criteria.departDate));
  98 |
  99 |   if (isRoundTrip) {
```
**Last steps**
```
✓ Open /home (BasePage.ts:21)
✓ Fill search form: One-Way NYP -> WAS (FareFinderForm.ts:89)
✓ Click FIND TRAINS (FareFinderForm.ts:125)
✓ FIND TRAINS should send a search request (SearchRequestSpy.ts:64)
  ✓ FIND TRAINS should send a search request
✓ trip type (SearchRequestSpy.ts:91)
✓ number of legs (SearchRequestSpy.ts:92)
✓ outbound origin station (SearchRequestSpy.ts:95)
✗ outbound destination station (SearchRequestSpy.ts:96)
```
<details><summary><b>Page accessibility snapshot at failure</b></summary>

```yaml
- generic [ref=e1]:
  - generic:
    - link "skip to content" [ref=e2] [cursor=pointer]:
      - /url: "#page-content-section"
      - text: skip to Content
    - link "skip to Navigation" [ref=e3] [cursor=pointer]:
      - /url: "#primary-nav"
    - link "skip to Footer" [ref=e4] [cursor=pointer]:
      - /url: "#footer-nav"
  - generic [ref=e7]:
    - generic [ref=e10]:
      - generic:
        - generic:
          - generic:
            - generic:
              - generic:
                - article
      - banner [ref=e11]:
        - navigation [ref=e16]:
          - generic [ref=e18]:
            - link [ref=e21] [cursor=pointer]:
              - /url: /home
              - img "Amtrak logo" [ref=e22]
            - generic [ref=e23]:
              - tablist [ref=e24]:
                - tab "BOOK" [ref=e25] [cursor=pointer]
                - tab "TRAIN STATUS" [ref=e26] [cursor=pointer]
                - tab "MY TRIP" [ref=e27] [cursor=pointer]
                - text: "* * *"
                - tab "PLAN" [ref=e28] [cursor=pointer]
                - text: 
                - tab "SCHEDULES" [ref=e29] [cursor=pointer]
                - tab "DEALS" [ref=e30] [cursor=pointer]
              - tablist [ref=e31]:
                - tab "Guest Rewards" [ref=e32] [cursor=pointer]
                - generic [ref=e34]:
                  - button "Close" [ref=e36] [cursor=pointer]
                  - paragraph [ref=e39]:
                    - text: Would you like to
                    - link "Sign In" [ref=e40] [cursor=pointer]:
                      - /url: "#"
                    - text: or
                    - link "Join" [ref=e41] [cursor=pointer]:
                      - /url: "#"
                    - text: "?"
                - tab "English" [ref=e42] [cursor=pointer]
                - tab "Need Help?" [ref=e43] [cursor=pointer]
    - main [ref=e44]:
      - generic [ref=e45]:
        - generic [ref=e52]:
          - tablist [ref=e54]:
            - generic [ref=e55]:
              - button "Trip Type:One-Way" [ref=e59] [cursor=pointer]:
                - generic [ref=e60]: One-Way
              - link "Rail Passes" [ref=e61] [cursor=pointer]
              - link "Auto Train" [ref=e62] [cursor=pointer]:
                - /url: /auto-train-experience
          - alert [ref=e66]:
            - generic [ref=e68]:
              - img "alert" [ref=e70]
              - generic [ref=e71]: We've experienced an unknown error. Try again later or call us at 1-800-USA-RAIL.
          - generic [ref=e73]:
            - generic [ref=e74]:
              - generic [ref=e78]:
                - generic [ref=e79]: Use Points
                - switch "Use Points" [ref=e81]:
                  - generic [ref=e82] [cursor=pointer]: "off"
              - generic [ref=e86]:
                - generic [ref=e88]:
                  - generic "From 'Edit Required'" [ref=e90]:
                    - generic "New York, NY From" [ref=e91] [cursor=pointer]:
                      - generic [ref=e92]: From
                      - generic [ref=e93]:
                        - generic [ref=e94]: NYP
                        - generic [ref=e95]:
                          - generic [ref=e96]: New York, NY
                          - generic [ref=e98]: Moynihan Train Hall at Penn Sta.
                  - button "Switch departure and arrival stations." [ref=e101] [cursor=pointer]
                  - generic "To 'Edit Required'" [ref=e104]:
                    - generic "Washington, DC To" [ref=e105] [cursor=pointer]:
                      - generic [ref=e106]: To
                      - generic [ref=e107]:
                        - generic [ref=e108]: WAS
                        - generic [ref=e109]:
                          - generic [ref=e110]: Washington, DC
                          - generic [ref=e112]: Union Station
                - generic [ref=e116]:
                  - generic [ref=e118]:
                    - generic [ref=e119]: Depart Date
                    - generic [ref=e120]: "Format: MM/DD/YYYY"
                    - textbox "Depart Date" [ref=e121]:
                      - /placeholder: ""
                      - text: 11/16/2026
                    - generic [ref=e122]: Depart Date
                  - button "Return Date" [ref=e126] [cursor=pointer]
              - generic [ref=e127]:
                - generic [ref=e128]:
                  - button "1 Traveler Add travelers and discounts" [ref=e134] [cursor=pointer]:
                    - generic [aria-hidden] [ref=e135]: "1"
                    - generic [aria-hidden] [ref=e136]: Traveler
                  - generic [ref=e137]:
                    - generic [ref=e138] [cursor=pointer]:
                      - checkbox "Passenger with Disability or Assistance Needed?" [ref=e139]
                      - text: Passenger with Disability or Assistance Needed?
                    - group [ref=e142]:
                      - button [ref=e144] [cursor=pointer]:
                        - img "More information about accessible travel requests." [ref=e145]
                - generic [ref=e146]:
                  - button "Add Coupon" [ref=e151] [cursor=pointer]
                  - button "Add Trip" [ref=e154] [cursor=pointer]
                  - button "Advanced Search" [ref=e160] [cursor=pointer]
            - generic [ref=e162]:
              - button "FIND TRAINS" [active] [ref=e163] [cursor=pointer]
              - button [aria-hidden] [ref=e164] [cursor=pointer]
              - button [aria-hidden] [ref=e165] [cursor=pointer]
              - button [aria-hidden] [ref=e166] [cursor=pointer]
              - button [aria-hidden] [ref=e167] [cursor=pointer]
        - generic [ref=e174]:
          - heading "Book Flex Fares & Travel With Ease" [level=1] [ref=e175]
          - paragraph [ref=e176]: Fully refundable and no cancellation fees before departure.
… (230 more lines in ../../../../../.../test-results/zz-demo-failure-DEMO-delib-01867-equest-destination-mismatch-chromium-desktop/error-context.md)
```
</details>

**Artifacts** (open a trace with `npx playwright show-trace <path>`)
  - screenshot: `test-results/zz-demo-failure-DEMO-delib-01867-equest-destination-mismatch-chromium-desktop/test-failed-1.png`
  - video: `test-results/zz-demo-failure-DEMO-delib-01867-equest-destination-mismatch-chromium-desktop/video.webm`
  - error-context: `test-results/zz-demo-failure-DEMO-delib-01867-equest-destination-mismatch-chromium-desktop/error-context.md`
  - trace: `test-results/zz-demo-failure-DEMO-delib-01867-equest-destination-mismatch-chromium-desktop/trace.zip`
