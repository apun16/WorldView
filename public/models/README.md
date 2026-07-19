# Walk guide avatars

Rigged humanoid `.glb` models for the guide. **Nothing here is required** — the
walk starts with a procedural figure built from primitives and swaps a real
avatar in the moment one loads, the same way photospheres upgrade the sky.

```
public/models/guides/female.glb          the avatar bodies
public/models/guides/male.glb
public/models/animations/idle.glb        one clip per file
public/models/animations/walk.glb
public/models/animations/talk.glb
```

Which file is used comes from the guide's `gender`, which `src/lib/agents.ts`
already assigns deterministically per country.

## Getting the avatars

1. Go to [readyplayer.me](https://readyplayer.me) and create a full-body avatar.
2. Download the `.glb` (or take the URL and append `.glb`).
3. Save as `public/models/guides/female.glb` and `male.glb`.

Ready Player Me avatars are ~1.7m tall, Y-up, and face +Z — which is what the
walk expects. If a model faces away from you, flip `MODEL_FACING_OFFSET` to
`Math.PI` in `src/components/walk/gltf-guide.ts`.

## Getting the animations

Ready Player Me publish a free animation library, and any Mixamo clip retargeted
to the RPM skeleton works too. Clips can also be bundled inside the avatar `.glb`
itself, in which case the separate animation files are not needed.

The loader matches clips by name, case-insensitively:

| File | Matched by | Used for |
|---|---|---|
| `idle.glb` | `idle`, `stand` | standing, listening |
| `walk.glb` | `walk`, `locomotion` | moving between path points |
| `talk.glb` | `talk`, `speak`, `gesture`, `point` | speaking and gesturing |

If a file contains exactly one clip, that clip is used regardless of its name.

## Why an avatar without animations is rejected

If avatars load but no clips are found, the walk **keeps the procedural guide**
and logs a note. A T-posing humanoid standing motionless in a photosphere looks
more broken than a moving primitive one, so this is deliberate.
