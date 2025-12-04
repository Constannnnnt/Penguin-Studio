# Penguin Studio Design Rationales

## Introduction

When you use Penguin Studio, you write a prompt once, get an image, and from that point on you work directly on the scene. You click on objects, drag them, adjust where the light seems to come from, tweak the camera feel, and then hit “refine”. Under the hood, those small manipulations are turned into structured changes to the scene and a short modification instruction that Bria’s image generation API can understand. Because the original seed is reused, the image stays recognisably the same while responding to your edits.

The project is meant to sit between two interaction extremes. On one side, pure prompting hides everything behind a single text field; any change means rewriting that text and hoping the model interprets it correctly. On the other side, workflow tools such as ComfyUI-style node graphs expose the full pipeline but force you to think in terms of nodes, edges, and parameters rather than “that character” or “this light”. Penguin Studio keeps the backend flexible but makes the scene itself the primary abstraction: a set of objects, a background, lighting, camera, and style that you can manipulate directly.

## System architecture

At a high level, Penguin Studio consists of a web front end, a coordination backend, and two external engines: Bria for generation and SAM3 for segmentation.

The front end is a single-page application with a central canvas showing the current image, overlay masks for each object, and a right-hand panel with scene and object controls. It maintains three kinds of state: the structured scene description obtained from Bria, the SAM3 masks attached to that description, and the list of edits the user has made since the last refinement.

The backend is a Python service that talks to Bria’s v2 `/image/generate` endpoint and to a SAM3 service. On the initial generation, it sends Bria only a free-form text prompt. Bria returns an image URL, a random seed, and a structured prompt JSON that describes the scene: objects and their descriptions, a background setting, lighting, camera parameters, and aesthetic tags. Penguin Studio treats that JSON and the seed as the authoritative state of the scene.

Immediately after generation, the backend calls SAM3 with the rendered image and, for each object, a short text description. SAM3 returns binary masks and confidence scores for each target. The masks are stored and linked back to the corresponding objects. From this point on, the front end can treat each object as “something you can click on and move” rather than just pixels.

Refinement uses the same Bria `/image/generate` endpoint in a different mode. Instead of sending only text, the backend now sends the updated structured prompt JSON, the original seed, and a concise modification prompt summarising what changed (“change lighting to golden hour and move the warrior slightly toward the centre”). Bria regenerates the image based on this combination: the JSON defines the scene, the seed stabilises it, and the modification text tells the model what to adjust.

The same pattern can be extended to a workflow engine instead of a single API: as long as there is a way to pass in a structured scene, a modification request, and a seed, Penguin Studio can sit on top and drive it.

## Prompt builder for segmentation

Bria’s structured prompt is written for humans and the generator; SAM3 needs something much more compact. The object descriptions coming back from Bria are often rich sentences with mood and context baked in. If you feed them directly to SAM3 (“a fierce demon warrior wearing intricate armor with glowing runes”), you frequently get either no meaningful mask or something far too broad.

To bridge that gap, Penguin Studio uses a small prompt builder that distills each object description into one or two short phrases that are tuned for segmentation. For each object, it identifies the head noun and a few visually essential modifiers: colour, size, and one or two distinctive visual properties. From that, it constructs a minimal “core” phrase (“demon warrior”) and a slightly more descriptive variant (“muscular demon warrior with red skin”).

Both variants are tried against SAM3. The system looks at the confidence score and the size of the resulting mask. If the detailed variant produces a poor or tiny mask, it falls back to the simpler one. If both are acceptable, it prefers the more descriptive phrase. This tiered strategy is a pragmatic way to adapt from Bria’s expressive language to SAM3’s more conservative vocabulary without hard-coding category-specific rules.

## Edit tracking and modification prompts

Once an image is on the canvas, Penguin Studio stops thinking in terms of “full prompts” and starts thinking in terms of edits. Every user action is captured as a small record rather than as immediate text.

Dragging an object mask records which object moved, by how much in normalised image coordinates, and generates a short descriptive phrase such as “move the demon slightly toward the right”. Adjusting the lighting widget records the previous and new lighting conditions and direction, and produces phrases like “change lighting to golden hour” or “make the shadows stronger”.

These records all share a common structure: the category (lighting, object, camera, background), the field that changed, the old and new values, and a one-line description. They accumulate as the user interacts; the system does not continuously rewrite the entire scene prompt, it simply collects deltas.

When the user triggers refinement, the backend applies those deltas to the stored structured JSON, updating object positions, lighting fields, and any other affected attributes. It then builds the modification prompt by compressing the individual descriptions. Edits are grouped by category and ordered so that the resulting text reads naturally, for example: “Change lighting to golden hour and make the shadows more dramatic. Move the demon slightly toward the centre and enlarge the sword.”

That single modification prompt, together with the updated JSON and the original seed, becomes the payload for Bria’s refine call. Because the chain of edits is explicit, it is possible to inspect exactly what was changed and how it was phrased, which is useful both for debugging and for giving advanced users visibility into the underlying instructions.

## Interaction design rationale

The interaction model is intentionally straightforward. The canvas always shows the rendered image; when you enter edit mode, each object’s SAM3 mask is drawn as a translucent overlay. Clicking an object selects it, highlights its region, and reveals a small set of relevant controls: position, size, and sometimes emphasis or orientation. You are never asked to think about “object indices” or “layers” explicitly; you just act on what you see.

Lighting is edited through a small stage-like widget: a rectangle representing the frame with a movable light icon. Moving the icon changes both the actual direction parameters we store and a textual summary, such as “soft, diffused light from the upper left”. This keeps the mental model aligned with the visual: the icon is where the light is “coming from”, and the system takes care of turning that into the kind of phrase Bria understands.

Text is always accessible but not mandatory. The structured prompt that came back from Bria is visible if you want to inspect or tweak it. The modification prompt Penguin Studio is about to send on refinement can also be reviewed and edited before submission. The intent is that most users will work primarily by direct manipulation and sliders, while still having the option to drop down into text when a particular nuance matters.

Overall, Penguin Studio assumes that the most natural way to steer generative images is to manipulate scenes rather than strings or graphs. The architectural choices—the way it builds segmentation prompts, tracks edits, and composes modification instructions for Bria—are all there to support that simple idea: you work on the image as a scene, and the system worries about how to talk to the generator.

## What's next?

The most immediate extension is localised editing. We already have object masks; the natural next step is to constrain regeneration to those regions so that a user can, for example, change a character’s outfit or expression without disturbing the rest of the scene. Another direction is to allow users to create their own masks and edit the descritions of these masks so that the scene becomes more editable.

Beyond that, we want to move from independent edits to explicit relationships and create a more agentic workflow. Constraints such as “this character stays in front of that one”, “change lighting to studio for a portrait" should survive across refinements rather than being rediscovered each time. In the longer term, we are interested in carrying character identity and style across multiple images, building an human-agentic workflow to achieve easy and collaborative interfaces for image generation and edition.