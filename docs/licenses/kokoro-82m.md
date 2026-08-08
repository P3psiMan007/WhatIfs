# Kokoro-82M narration rights evidence

Verified: 2026-08-08
Canonical model: `hexgrad/Kokoro-82M`
Selected voice: `am_michael`

## Publication decision

Kokoro-82M is acceptable for What If Explains commercial/monetized narration based on the upstream publisher's current licensing statements and repository metadata.

## Evidence

1. Official Hugging Face model page:
   - https://huggingface.co/hexgrad/Kokoro-82M
   - Repository/model license is identified as `apache-2.0`.
   - The model card describes the weights as Apache-licensed and says the model can be deployed from production environments to personal projects.
   - The same model card states that Kokoro has been deployed in commercial APIs and welcomes deployment in real use cases.

2. Official upstream training-data statement:
   - https://huggingface.co/hexgrad/Kokoro-82M#training-details
   - Upstream states Kokoro was trained exclusively on permissive/non-copyrighted audio data and IPA phoneme labels.
   - Examples listed upstream include public-domain audio and audio licensed under permissive licenses; CC BY sources used in v1.0 are also disclosed on the card.

3. Official voice documentation:
   - https://huggingface.co/hexgrad/Kokoro-82M/blob/main/VOICES.md
   - `am_michael` is listed as an official American-English male voice.

4. Official voice files directory:
   - https://huggingface.co/hexgrad/Kokoro-82M/tree/main/voices
   - Voice packs, including the published voices documented by upstream, are distributed as files inside the Apache-2.0 model repository rather than through a separate proprietary voice service.

## Guardrails

- Use only upstream `hexgrad/Kokoro-82M` model/voice assets or a pinned package that downloads those upstream assets.
- Do not substitute third-party cloned/custom voices without a separate rights review.
- If upstream licensing or training-data disclosures materially change, re-run this review before future public publishing.
- This evidence covers the project's use of the released model/voice weights; it is not a general legal opinion about unrelated TTS systems.
