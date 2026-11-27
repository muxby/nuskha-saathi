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

