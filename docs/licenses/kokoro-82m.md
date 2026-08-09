# Kokoro-82M narration rights evidence

Verified: 2026-08-09
Canonical model: `hexgrad/Kokoro-82M`
Selected voice: `af_heart`

## Publication decision

Kokoro-82M is acceptable for What If Explains commercial/monetized narration based on the upstream publisher's current licensing statements and repository metadata.

## Evidence

1. Official Hugging Face model page:
   - https://huggingface.co/hexgrad/Kokoro-82M
   - Repository/model license is identified as `apache-2.0`.
   - The model card describes the weights as Apache-licensed and says the model can be deployed from production environments to personal projects.
   - The same model card states Kokoro was trained on permissive/non-copyrighted audio data and is intended for real deployments.

2. Official upstream training-data statement:
   - https://huggingface.co/hexgrad/Kokoro-82M#training-details
   - Upstream states Kokoro was trained exclusively on permissive/non-copyrighted audio data and IPA phoneme labels.
   - Examples listed upstream include public-domain audio and audio licensed under permissive licenses; CC BY sources used in v1.0 are also disclosed on the card.

3. Official voice documentation:
   - https://huggingface.co/hexgrad/Kokoro-82M/blob/main/VOICES.md
   - `af_heart` is listed as an official American-English female voice with overall grade **A**.
   - Upstream lists the voice SHA256 prefix as `0ab5709b`.

4. Official voice file:
   - https://huggingface.co/hexgrad/Kokoro-82M/blob/main/voices/af_heart.pt
   - `af_heart.pt` is distributed directly inside the Apache-2.0 Kokoro repository.
   - Upstream reports SHA256 `0ab5709b8ffab19bfd849cd11d98f75b60af7733253ad0d67b12382a102cb4ff` for the released voice file.

## Guardrails

- Use only upstream `hexgrad/Kokoro-82M` model/voice assets or a pinned package that downloads those upstream assets.
- The approved Episode 1 narrator is exactly `af_heart`; do not substitute another voice without a new creative approval and rights check.
- Do not substitute third-party cloned/custom voices without a separate rights review.
- If upstream licensing or training-data disclosures materially change, re-run this review before future public publishing.
- This evidence covers the project's use of the released model/voice weights; it is not a general legal opinion about unrelated TTS systems.
