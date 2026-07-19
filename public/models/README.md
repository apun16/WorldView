# Walk guide avatars

Rigged humanoid `.glb` models for the guide. **Nothing here is required** — the
walk starts with a procedural figure built from primitives and swaps a real
avatar in the moment one loads, the same way photospheres upgrade the sky.

```
public/models/guides/{male,female}.glb            the bodies
public/models/animations/{male,female}/idle.glb   the clips
public/models/animations/{male,female}/walk.glb
public/models/animations/{male,female}/talk.glb
```

Which body is used comes from the guide's `gender`, which `src/lib/agents.ts`
assigns deterministically per country.

## What is installed

Both bodies are Ready Player Me avatars (textured skin, eyes, clothes), and
every clip comes from the official
[Ready Player Me animation library](https://github.com/readyplayerme/animation-library)
— authored for the RPM skeleton, licensed free for personal **and** commercial
use (see their LICENSE.md).

| File | Source |
|---|---|
| `guides/male.glb` | three.js example `readyplayer.me.glb` (an RPM avatar) |
| `guides/female.glb` | animation-library `Feminine_TPose.glb` |
| `animations/male/*` | `M_Standing_Idle_001`, `M_Walk_001`, `M_Talking_Variations_001` |
| `animations/female/*` | `F_Standing_Idle_001`, `F_Walk_002`, `F_Talking_Variations_001` |

## The one rule: exact-name binding, no retargeting

`src/components/walk/gltf-guide.ts` accepts a clip only if it drives the
avatar's **core bones by exact name** (Hips, Spine, Head, both arms, both
legs). Tracks for optional bones a body lacks (fingertip ends, jaw, eyes) are
dropped; a clip authored for a different skeleton binds zero core bones —
their names carry a rig prefix — and is rejected outright, keeping the
procedural guide.

There used to be cross-rig retargeting here. It died of three separate causes
(hidden root rotations that face-planted the avatar, a leaked ×95 bone scale
that stretched her into a 35 m giraffe, and 131° shoulder-convention
disagreements between nominally-identical rigs). Same-skeleton clips cannot
fail in any of those ways; that guarantee is worth more than asset reuse.

## Scale and facing are auto-corrected

The loader measures the model after load, normalises it to 1.75 m with feet at
y=0, and detects facing from the ankle→toe direction, rotating it to +Z. Units
(RPM metres vs Mixamo centimetres) and export orientation cannot break it.

## Swapping in different avatars

Any RPM avatar drops in directly: [readyplayer.me](https://readyplayer.me) →
create → download `.glb` → replace a body file. The clips here bind to every
standard RPM skeleton. Non-RPM bodies must bring their own idle+walk clips
(bundled in the file, or as files in `animations/{gender}/` with matching bone
names) or the procedural guide stays.
