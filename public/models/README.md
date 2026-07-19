# Walk guide avatars

Rigged humanoid `.glb` models for the guide. **Nothing here is required** — the
walk starts with a procedural figure built from primitives and swaps a real
avatar in the moment one loads, the same way photospheres upgrade the sky.

```
public/models/guides/male.glb       currently: three.js "Soldier" (Mixamo-derived)
public/models/guides/female.glb     absent — female guides use the procedural figure
```

Which body is used comes from the guide's `gender`, which `src/lib/agents.ts`
assigns deterministically per country.

## The one rule: an avatar must bring its own animations

`src/components/walk/gltf-guide.ts` only accepts a model whose file contains
**bundled clips including an idle and a walk** (matched by name — `Idle`,
`Walk`, etc.). Missing talk clips borrow the idle; a missing idle or walk
rejects the avatar and the procedural guide stays.

There used to be a shared animation library retargeted across skeletons here.
It is gone deliberately, after three attempts:

1. Renaming `mixamorig`-prefixed tracks — broke on differing root
   orientations (one rig hid a +90° root rotation that its hips' rest pose
   cancelled; overwriting the hips pitched her face-first into the floor) and
   on units (Mixamo rigs are centimetres, Ready Player Me metres — a renamed
   hip track flings the body 100 m up).
2. `SkeletonUtils.retargetClip` — leaked a ×95 scale onto the live hips bone
   (it restores bone positions after sampling, but not scales), stretching the
   avatar into a 35-metre giraffe.
3. Rest-pose-gated transplants — measurement killed it: even two nominally
   Mixamo rigs disagreed by 131° at the shoulders, so "same family" is not a
   real guarantee.

Bundled clips are authored against their own skeleton and cannot fail in any
of these ways. That property is worth more than asset reuse.

## Getting a compatible avatar

[Mixamo](https://www.mixamo.com): pick a character, pick an animation, download
as glTF/FBX **with skin**, and combine multiple clips into one `.glb` (Blender's
glTF export does this — name the actions `Idle`, `Walk`, `Talk`). Any source
works as long as idle+walk ship inside the file.

Scale and facing do not matter: the loader measures the model after load and
normalises it to 1.75 m with feet at y=0, and detects which way it faces from
the ankle→toe direction and rotates it to +Z. (The current Soldier ships facing
−Z — a hardcoded offset would have him walking backwards.)

## Licensing

`male.glb` is the three.js example `Soldier.glb` (Mixamo-derived). Check the
[three.js examples licensing](https://github.com/mrdoob/three.js/tree/dev/examples/models/gltf)
and Adobe Mixamo's terms before shipping commercially.
