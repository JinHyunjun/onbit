# Third-party assets

- MediaPipe Tasks Vision (`@mediapipe/tasks-vision`): installed version and license in package-lock.json and node_modules/@mediapipe/tasks-vision. WASM/JS distributions in public/vision/wasm are copied from that package. Preserve its license when redistributing.
- BlazeFace short-range float16 detector: https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite
  Official model reference: https://developers.google.com/edge/mediapipe/solutions/vision/face_detector
  Used to find face regions, not identify people or diagnose personal color.
- Optional Open-Meteo weather data: https://open-meteo.com/ and https://open-meteo.com/en/licence . Show Open-Meteo attribution when enabled. API free access is non-commercial; model code/data licensing and hosted API commercial terms are separate.
