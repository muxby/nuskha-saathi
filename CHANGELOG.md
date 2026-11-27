# Changelog

## 0.4.0

### Fixed

- A reader outage (missing key, rejected key, retired model, timeout) was
  reported to the patient as unclear handwriting. Scan responses now carry
  `vision_status`, and the app shows a service notice instead.
- Phone photos are downsized to 2000 px and re-encoded as JPEG in the browser
  before upload, so large camera files no longer fail on slow networks or
  host request limits.
- Roman Urdu warnings were laid out right-to-left with flipped punctuation.
  Every engine string now takes its direction from its own script.
- The Gemini key is sent in a header and no longer appears in request URLs.
- Uploads time out after 90 seconds with a clear message instead of hanging.

### Added

- Results summary with one stop / ask / clear headline and line counts.
- Day plan: morning, afternoon and night, built only from verified lines.
- Urdu-script dose sentence on each card, and Urdu script for fixed refusals.
- Backend connection status in Settings and above the camera.
- Cabinet: brand suggestions from the formulary, strength chips, clear all,
  and a course calendar on saved medicines.
- Offline app shell (service worker) and an offline / back-online notice.
- `GET /api/v1/diagnostics/vision`, `GET /api/v1/formulary/search`,
  `DELETE /api/v1/cabinet/{patient_id}`.
- Model fallback when the configured Gemini model id is retired.

