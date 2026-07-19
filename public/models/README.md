# Walk guide avatars

Rigged humanoid `.glb` models for the guide. **Nothing here is required** — the
walk starts with a procedural figure built from primitives and swaps a real
avatar in the moment one loads, the same way photospheres upgrade the sky.

```
public/models/guides/female.glb        the avatar bodies
public/models/guides/male.glb
public/models/animations/library.glb   one file, all clips
```

Which body is used comes from the guide's `gender`, which `src/lib/agents.ts`
already assigns deterministically per country.

## What is installed

All three come from the [three.js example
assets](https://github.com/mrdoob/three.js/tree/dev/examples/models/gltf), which
is also where their licensing lives — check it before shipping commercially.
The two Mixamo-derived files (Michelle, X Bot) originate from Adobe Mixamo.

| File | Source | Notes |
|---|---|---|
| `guides/male.glb` | `readyplayer.me.glb` | A real Ready Player Me avatar — 19 textures (skin, eyes, teeth, beard). No bundled animations. |
| `guides/female.glb` | `Michelle.glb` | Mixamo character, 4 textures. Ships only a samba dance, so it uses the library too. |
| `animations/library.glb` | `Xbot.glb` | Untextured, never rendered — it is here purely for its clips: idle, walk, run, agree, headShake. |

## How clips reach a body

`src/components/walk/gltf-guide.ts` prefers clips bundled inside an avatar, then
falls back to the shared library, matching by keyword (`idle`, `walk`,
`talk`/`agree`, …).

Two conversions happen on the way in, and both are load-bearing:

**Skeleton retargeting.** Mixamo prefixes every bone with `mixamorig:`; Ready
Player Me uses the identical hierarchy without it. The loader adds or strips
that prefix per track so one clip drives either body.

Watch out: three.js runs node names through
`PropertyBinding.sanitizeNodeName`, which *deletes* the characters reserved by
its property-path syntax — including `:`. So a track arrives named
`mixamorigHips`, never `mixamorig:Hips`. Matching on the colon form silently
drops every track and leaves the avatar T-posing.

**Height normalisation.** Ready Player Me exports at 1:1, Mixamo at 1:100, and a
skinned mesh's raw accessor bounds do not predict its rendered size. The loader
measures the model's bounding box after load, scales it to 1.75 m, and drops its
feet to `y=0`. Any future avatar can be dropped in at any scale.

## Swapping in different avatars

Replace the `.glb` and reload — no code change needed, as long as the rig is
Mixamo-compatible (the near-universal convention for humanoid glTF). If a model
faces away from you, flip `MODEL_FACING_OFFSET` to `Math.PI` in
`gltf-guide.ts`.

For custom avatars, [readyplayer.me](https://readyplayer.me) generates one from
a photo and exports `.glb` directly.

## Why an avatar without animations is rejected

If a body loads but no clip binds to it, the walk **keeps the procedural
guide** and logs a note. A T-posing humanoid sliding through a market looks far
more broken than a moving primitive one, so this is deliberate.
