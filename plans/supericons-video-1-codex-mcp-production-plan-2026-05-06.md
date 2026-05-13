# Supericons Video 1 Production Plan

Date: 2026-05-06

Working title: Stop Asking Your Agent To Guess Icons

Primary goal: create a short launch video showing Supericons MCP helping Codex or another coding agent find and recommend the right icons directly inside the building workflow.

Secondary goal: show that Supericons is more than a catalog. It is a bridge between human icon search, AI-agent retrieval, Motion Lab, and Converter.

## Research Basis

This plan uses:

- Remotion for final video assembly, captions, screen recordings, UI overlays, timing, and export.
- Image-to-video tools such as Kling 3.0 or Seedance 2.0 for cinematic opening and transition shots.
- Screen recording for the real Supericons website and MCP demo. These should stay real, not generated.

Reliable prompt guidance checked:

- Remotion: React-based programmatic video creation and MP4 rendering.
- Kling image-to-video guidance: use clear subject plus movement, and control what motion should happen from the uploaded image.
- Seedance guidance: structure prompts with subject, action/motion, camera, lighting, style, and constraints.
- Community-tested AI video guidance: keep shots simple, define one camera move, and protect important product details.

## Recommended Video Format

Primary format:

- 16:9 landscape
- 1920 x 1080
- 30 fps
- 60-75 seconds

Secondary exports:

- 9:16 vertical crop for Shorts/Reels/TikTok/X mobile
- 1:1 square crop for social preview posts

## Core Concept

Most builders still choose icons the old way:

1. open browser
2. search several icon sites
3. guess the best keyword
4. copy SVG
5. return to the IDE
6. ask the AI agent to wire it in

Supericons changes the workflow:

1. ask the agent for icons by meaning
2. Supericons MCP searches the semantic registry
3. the agent gets icon IDs, reasons, and SVGs
4. the builder can still refine visually on the website
5. Motion Lab and Converter support the next polish steps

## Main Audience

Primary:

- Codex users
- Cursor users
- Claude Code users
- AI-first frontend builders
- indie SaaS builders

Secondary:

- designers
- design engineers
- founders building product demos
- teams creating dashboards and agent UIs

## Video Promise

> Your coding agent can search icons by meaning, recommend a full icon set, and retrieve SVGs without leaving the build.

## Tone

Direct, fast, practical, polished.

Avoid:

- over-explaining MCP
- long setup walkthrough
- generic AI hype
- too many moving visual metaphors

## Visual Style

Brand style:

- dark interface
- Supericons orange accent
- crisp white text
- clean product UI
- subtle icon motion
- minimal cinematic scenes

Motion style:

- fast but readable
- smooth camera moves
- clear screen recording moments
- no distracting effects over the product UI

## Production Pipeline

### Phase 1: Message Lock

Decide the final one-line hook:

Recommended hook:

> Stop asking your agent to guess icons.

Backup hooks:

- Your AI agent can now search icons by meaning.
- Find the right icon without leaving your IDE.
- Semantic icon search for humans and AI agents.

Checklist:

- [ ] Pick final hook.
- [ ] Pick final CTA.
- [ ] Decide whether to mention free setup in the video or only in caption.

Recommended CTA:

> Try Supericons MCP: `npx supericons-mcp`

### Phase 2: Capture Real Product Proof

Required screen recordings:

- [ ] Supericons website homepage or search page.
- [ ] Search for `database`.
- [ ] Search for `AI model`.
- [ ] Search or filter by a tag.
- [ ] Copy SVG from an icon.
- [ ] Codex or MCP-capable agent prompt.
- [ ] MCP result showing recommended icons for an AI dashboard.
- [ ] Optional: Motion Lab preview.
- [ ] Optional: Converter page working.

Recommended MCP demo prompt:

```text
Use Supericons MCP to recommend icons for an AI dashboard sidebar. The slots are model, prompt, dataset, evaluation, deployment, and monitoring. Prefer Lucide outline icons. Show the icon id, library, and short reason for each choice.
```

Recommended browser demo searches:

- `database`
- `AI model`
- `deployment`
- `monitoring`
- `chill`

Capture specs:

- Record at 1920 x 1080 or higher.
- Hide private tabs and local folders.
- Use production website, not localhost.
- Use a clean browser profile if possible.
- Zoom browser to a readable size.
- Keep mouse movements slow and deliberate.

### Phase 3: Create AI Image Frames

These images are for cinematic intro/outro and transitions only. Do not use generated images to fake the product UI.

Recommended image generation dimensions:

- 16:9, 1920 x 1080
- consistent dark background
- orange accent lighting
- clean futuristic but not sci-fi noisy
- no fake readable UI text unless explicitly needed

Use these images as first frames for Kling/Seedance image-to-video.

## Character And Object Details

No human character is required.

Main "character" objects:

1. The builder's workspace
   - a dark desk
   - laptop or monitor
   - code editor glow
   - small orange Supericons mark as a UI accent

2. The agent
   - represented by a subtle glowing cursor, terminal prompt, or assistant panel
   - no robot mascot required

3. The icon stream
   - thin white outline icons
   - orange highlighted chosen icons
   - icons move into place as a clean dashboard sidebar

4. The final UI
   - AI dashboard sidebar
   - six selected icons
   - polished product look

## Storyboard

### Scene 1: Hook

Duration: 0:00-0:06

Purpose: call out the pain.

Visual:

- Cinematic desk or abstract IDE scene.
- Floating generic icons appear and scatter.
- One orange cursor line appears.

On-screen copy:

> Stop asking your agent to guess icons.

Voiceover:

> Your coding agent can build UI. But icon choice is still usually a guess.

Image prompt for first frame:

```text
A cinematic dark workspace for a modern AI coding agent, close-up of a laptop with a clean code editor glow, small white outline icons floating around the screen, one orange cursor highlight, premium software product style, black background, crisp lighting, minimal, high contrast, no readable text, no people, 16:9
```

Kling / Seedance image-to-video prompt:

```text
The floating outline icons drift slowly around the laptop screen, then pause as an orange cursor highlight moves into focus. Camera slowly pushes in toward the screen. Subtle parallax, clean product lighting, smooth motion, no text changes, no extra objects, cinematic software launch video.
```

Negative prompt:

```text
blurry text, extra logos, distorted laptop, messy desk, random words, flickering UI, fast shaky camera, cartoon style
```

### Scene 2: Old Workflow Pain

Duration: 0:06-0:13

Purpose: show the old browser-hopping problem.

Visual:

- Fast Remotion montage with simple cards:
  - "Search icon site"
  - "Guess keyword"
  - "Copy SVG"
  - "Back to IDE"
- Cards slide quickly and stack into visual clutter.

On-screen copy:

> Search. Guess. Copy. Repeat.

Voiceover:

> The old workflow means leaving your IDE, guessing keywords, and copying icons one by one.

Remotion note:

- Build this scene in code with text cards.
- Use frame-based animation with `useCurrentFrame()`.
- Use `<Sequence>` or `<Series>` to time the cards.

### Scene 3: Supericons MCP Enters

Duration: 0:13-0:21

Purpose: show the new workflow.

Visual:

- Real screen recording placeholder: Codex or MCP-capable IDE.
- User prompt appears.
- MCP tool result begins.

Screen recording placeholder:

```text
[SCREEN RECORDING PLACEHOLDER: Codex prompt asking Supericons MCP to recommend icons for AI dashboard sidebar]
```

On-screen copy:

> Ask for icons by meaning.

Voiceover:

> With Supericons MCP, your agent can search icons by meaning.

### Scene 4: Recommendation Result

Duration: 0:21-0:34

Purpose: prove the utility.

Visual:

- Real MCP result recording.
- Highlight results:
  - model → brain-circuit
  - prompt → text-cursor-input
  - dataset → table-columns-split or table-2
  - evaluation → chart-bar
  - deployment → upload-cloud
  - monitoring → line-chart

Screen recording placeholder:

```text
[SCREEN RECORDING PLACEHOLDER: MCP result table showing icon id, library, and reason]
```

On-screen copy:

> Full icon sets, not just one-off search.

Voiceover:

> It can recommend a coherent set for a sidebar, dashboard, settings page, or product feature.

### Scene 5: Website Search For Humans

Duration: 0:34-0:44

Purpose: show this is useful beyond MCP.

Visual:

- Real Supericons website screen recording.
- Search `database`, `deployment`, or `chill`.
- Use tag filter.
- Select icon.
- Copy SVG.

Screen recording placeholder:

```text
[SCREEN RECORDING PLACEHOLDER: Supericons website search, tag filter, icon select, copy SVG]
```

On-screen copy:

> Also built for human search.

Voiceover:

> And when you want to browse visually, the same semantic search works in the browser.

### Scene 6: Motion Lab Mention

Duration: 0:44-0:52

Purpose: show Supericons is more than static search.

Visual:

- Quick Motion Lab screen recording or Remotion mock overlay.
- Static icon becomes animated.
- Keep it short.

Screen recording placeholder:

```text
[SCREEN RECORDING PLACEHOLDER: Motion Lab preset preview and animated SVG/CSS export]
```

On-screen copy:

> Add motion when the UI needs polish.

Voiceover:

> For polished moments, Motion Lab turns static icons into animated SVG or CSS workflows.

### Scene 7: Converter Mention

Duration: 0:52-0:59

Purpose: show utility for conventional designers/builders.

Visual:

- Quick Converter screen recording.
- PNG uploaded.
- SVG result appears.

Screen recording placeholder:

```text
[SCREEN RECORDING PLACEHOLDER: Converter PNG to SVG or SVG to PNG workflow]
```

On-screen copy:

> Convert assets without switching tools.

Voiceover:

> Converter helps with SVG and PNG handoff when your workflow is still visual.

### Scene 8: Final CTA

Duration: 0:59-1:10

Purpose: make the action clear.

Visual:

- Cinematic final image/video: icons settle into a clean AI dashboard sidebar.
- Supericons logo and links.

On-screen copy:

```text
Supericons
Semantic icon search for humans and AI agents.

npx supericons-mcp
supericons.dev
```

Voiceover:

> Supericons: semantic icon search for humans and AI agents. Try it in your browser, or connect it to your coding agent.

Image prompt for final frame:

```text
A polished dark AI dashboard interface with a left sidebar containing six clean white outline icons, one orange active state, subtle glowing Supericons orange accent, professional SaaS product UI, minimal, high contrast, no fake readable text, crisp vector-like visual style, 16:9
```

Kling / Seedance image-to-video prompt:

```text
The six sidebar icons gently slide into place one after another, the active icon glows orange, and the camera slowly settles into a clean front-facing dashboard view. Smooth product UI motion, subtle parallax, premium SaaS launch video style, no extra text, no distortion, no random icons.
```

Negative prompt:

```text
unreadable text, malformed icons, messy dashboard, flickering, random symbols, fast camera shake, low contrast, fake brand logos
```

## Full Voiceover Draft

Version A, direct:

```text
Your coding agent can build UI. But icon choice is still usually a guess.

The old workflow means leaving your IDE, guessing keywords, and copying icons one by one.

With Supericons MCP, your agent can search icons by meaning.

Ask for a full sidebar, dashboard, settings page, or feature set.

Supericons returns icon IDs, libraries, reasons, and SVGs.

And when you want to browse visually, the same semantic search works in the browser.

For polished moments, Motion Lab turns static icons into animated SVG or CSS workflows.

Converter helps with SVG and PNG handoff when your workflow is still visual.

Supericons: semantic icon search for humans and AI agents.
```

Version B, shorter:

```text
Stop asking your agent to guess icons.

Supericons MCP lets coding agents search icons by meaning, recommend full icon sets, and retrieve SVGs directly.

Use it for dashboards, sidebars, settings pages, AI products, and developer tools.

Humans can still search visually on supericons.dev.

And when your UI needs polish, Motion Lab and Converter help with animation and asset handoff.

Supericons: icon search for humans and AI agents.
```

## Caption Copy

Short social caption:

```text
Supericons MCP lets AI coding agents search, recommend, and retrieve SVG icons by meaning.

No more guessing icon names.
No more browser hopping.

Try it:
npx supericons-mcp

supericons.dev
```

Long social caption:

```text
Most AI-generated UI still struggles with icon choice.

Supericons gives coding agents a semantic icon search layer:

- search by meaning
- recommend full icon sets
- retrieve SVGs
- filter by library and style
- use Motion Lab for animated icons
- use Converter for SVG/PNG workflows

Built for humans and AI agents.

Website: supericons.dev
MCP: npx supericons-mcp
```

## Remotion Assembly Plan

Use Remotion for final assembly, not for replacing product footage.

Recommended structure:

```text
video/supericons-video-1/
  package.json
  src/
    Root.tsx
    Video1.tsx
    scenes/
      HookScene.tsx
      OldWorkflowScene.tsx
      McpPromptScene.tsx
      McpResultsScene.tsx
      BrowserSearchScene.tsx
      MotionLabScene.tsx
      ConverterScene.tsx
      CtaScene.tsx
    theme.ts
    copy.ts
  public/
    images/
    recordings/
    audio/
```

Composition:

- id: `SupericonsVideo1`
- width: 1920
- height: 1080
- fps: 30
- duration: 70 seconds

Remotion implementation rules:

- Use `<Series>` for scene order.
- Use `<Sequence>` for overlays inside each scene.
- Use `useCurrentFrame()` for animations.
- Use `staticFile()` for local recordings, images, fonts, audio.
- Avoid CSS transitions and CSS animations in rendered video.
- Keep all colors and typography in `theme.ts`.

Recommended scene durations:

```text
HookScene: 6s
OldWorkflowScene: 7s
McpPromptScene: 8s
McpResultsScene: 13s
BrowserSearchScene: 10s
MotionLabScene: 8s
ConverterScene: 7s
CtaScene: 11s
Total: 70s
```

## Screen Recording Shot List

### Recording A: Codex MCP Prompt

File:

```text
public/recordings/codex-mcp-prompt.mp4
```

Action:

- Open Codex or another MCP-capable agent.
- Type or paste the recommended AI dashboard prompt.
- Show tool call beginning.

### Recording B: MCP Results

File:

```text
public/recordings/codex-mcp-results.mp4
```

Action:

- Show result list.
- Scroll only if needed.
- Keep icon IDs visible.

### Recording C: Browser Search

File:

```text
public/recordings/supericons-browser-search.mp4
```

Action:

- Open `https://supericons.dev`.
- Search `database`.
- Search `deployment`.
- Use tag filter.
- Select icon.
- Copy SVG.

### Recording D: Motion Lab

File:

```text
public/recordings/supericons-motion-lab.mp4
```

Action:

- Pick one icon.
- Apply one Motion Lab preset.
- Show export option.

### Recording E: Converter

File:

```text
public/recordings/supericons-converter.mp4
```

Action:

- Upload sample PNG.
- Convert or inspect.
- Show output preview.

## AI Image-To-Video Prompt Template

Use this format for Kling or Seedance:

```text
[Subject/object from the uploaded image].
[Specific action or motion].
[Camera movement].
[Lighting and mood].
[Style and quality].
[Constraints: what must not change].
```

Example:

```text
The floating outline icons drift slowly around the laptop screen. The orange cursor highlight moves into focus. Camera slowly pushes toward the screen. Dark premium software lighting, subtle parallax, smooth motion. Keep the laptop and icons clean, no extra text, no logo changes, no flicker.
```

## Negative Prompt Template

```text
blurry text, random words, malformed icons, extra logos, distorted interface, flickering, fast shaky camera, low contrast, messy composition, cartoon style
```

## Codex Starting Frame Image Prompt Pack

Use Codex image generation to create a still starting frame for each cinematic or hybrid scene. These stills can then be used as the first frame in Kling, Seedance, or another image-to-video tool.

Important rule:

Do not use generated images for factual product UI. Use real screen recordings for Supericons website, MCP results, Motion Lab, and Converter. Generated images are for atmosphere, transitions, and symbolic product storytelling.

Recommended image settings:

- 16:9
- 1920 x 1080
- dark product UI style
- black or near-black background
- orange Supericons accent
- crisp white outline icons
- no fake readable text unless the prompt explicitly asks for it
- no random logos
- no human faces unless intentionally added later

### Starting Frame 1: Hook

Purpose: open with the pain that AI agents still guess icons.

Image prompt:

```text
Create a cinematic 16:9 starting frame for a software product launch video. A dark modern developer workspace with a laptop showing an abstract code editor glow, many small white outline icons floating around the screen as if the agent is trying to choose, one orange cursor highlight in the center, premium SaaS visual style, high contrast, clean composition, subtle depth, black background, orange accent lighting, no readable text, no brand logos, no people.
```

Image-to-video prompt:

```text
The floating white outline icons drift slowly around the laptop screen. The orange cursor highlight moves into focus and the camera gently pushes toward the screen. Smooth premium software launch motion, subtle parallax, dark high-contrast lighting, no new text, no extra logos, no flicker.
```

### Starting Frame 2: Old Workflow Friction

Purpose: show browser-hopping and scattered icon choices.

Image prompt:

```text
Create a 16:9 starting frame showing the frustration of icon hunting. A dark desktop workspace with several overlapping browser windows represented as clean abstract panels, each panel contains simple white outline icon grids, scattered search bars without readable words, one small orange warning-style accent showing friction, premium minimal product design, high contrast, neat but slightly cluttered, no readable text, no logos, no people.
```

Image-to-video prompt:

```text
The overlapping browser panels slide slightly out of alignment as if the workflow is becoming messy. A few white outline icons drift between panels. The orange accent pulses once. Camera stays mostly locked with a tiny handheld-style tension, but keep the movement smooth and professional.
```

### Starting Frame 3: Ask The Agent

Purpose: bridge into MCP prompt.

Image prompt:

```text
Create a 16:9 starting frame of a clean AI coding agent interface in dark mode. A large empty prompt box is centered, with a subtle orange glowing cursor at the start of the prompt line. Around it are faint white outline icons for database, chart, upload, brain, table, and line chart. Premium developer tool aesthetic, black background, orange Supericons accent, no fake readable text, no brand logos, no human characters.
```

Image-to-video prompt:

```text
The orange cursor blinks once, then a soft orange glow travels from the prompt box toward the surrounding icons. The icons gently organize into a neat row. Camera slowly pushes in, clean dark UI style, no readable generated text, no distortion.
```

### Starting Frame 4: MCP Result As Meaning Map

Purpose: visualize the agent getting structured icon recommendations.

Image prompt:

```text
Create a 16:9 starting frame showing a semantic icon recommendation map. Six clean cards are arranged in a grid on a dark background. Each card has one white outline icon and a small orange accent line, representing model, prompt, dataset, evaluation, deployment, and monitoring, but do not include readable labels. The cards feel like an AI tool result, precise and organized, premium SaaS visual style, crisp vector-like icons, no fake readable text, no logos.
```

Image-to-video prompt:

```text
The six icon cards appear one by one in a smooth sequence, each card receiving a small orange highlight as it locks into place. Camera remains steady with slight depth movement. Keep all icons clean, no random text, no extra cards.
```

### Starting Frame 5: Human Browser Search

Purpose: signal that humans can still browse visually.

Image prompt:

```text
Create a 16:9 starting frame of a beautiful dark icon search interface inspired by a modern web app. A large search bar sits near the top, a neat grid of white outline icons below, one selected icon has a soft orange hover highlight, and a slim customization panel appears on the right. This is a generic symbolic frame, not an exact product screenshot. Premium UI, clean spacing, black background, orange accent, no readable text, no fake logos.
```

Image-to-video prompt:

```text
The search bar glows softly, the icon grid slides upward a little, and one icon receives a subtle orange hover highlight. The camera gently settles into the interface. No generated words, no distorted icons, no flicker.
```

### Starting Frame 6: Motion Lab

Purpose: show static icon becoming motion.

Image prompt:

```text
Create a 16:9 starting frame for an icon animation tool. A single large white outline icon sits in the center on a dark background, surrounded by faint circular motion guides and small orange timeline dots. The scene suggests Motion Lab turning a static icon into an animated UI moment. Premium design tool aesthetic, crisp, minimal, orange accent, no readable text, no logos.
```

Image-to-video prompt:

```text
The central white outline icon gently pulses, the orange timeline dots move from left to right, and the motion guide lines rotate very subtly. Smooth clean UI animation, no extra symbols, no text, no distortion.
```

### Starting Frame 7: Converter

Purpose: show format handoff from PNG to SVG or SVG to PNG.

Image prompt:

```text
Create a 16:9 starting frame for an asset converter workflow. On the left, a soft square bitmap-style icon tile; on the right, a crisp white outline vector icon; between them, a clean orange arrow made of small dots. Dark product UI background, premium workflow tool style, subtle grid, high contrast, no readable text, no logos, no people.
```

Image-to-video prompt:

```text
The orange dotted arrow flows from the bitmap tile to the vector icon. The left tile becomes slightly sharper while the right vector icon glows softly. Camera remains steady, clean product motion, no text, no extra logos, no flicker.
```

### Starting Frame 8: Final Supericons Workflow

Purpose: show the product as a complete workflow.

Image prompt:

```text
Create a polished 16:9 final frame for a Supericons launch video. A dark AI dashboard interface fills the screen, with a left sidebar containing six clean white outline icons and one orange active state. In the center, a subtle flow connects icon search, MCP, Motion Lab, and Converter as four abstract product nodes, but without readable text. Premium SaaS launch aesthetic, black background, orange accent glow, crisp vector-like details, no fake brand logos, no malformed UI.
```

Image-to-video prompt:

```text
The six sidebar icons slide into place, the active icon glows orange, and four abstract workflow nodes connect with thin orange lines. Camera slowly settles into a centered final composition. Smooth premium SaaS motion, clean icons, no generated words, no random symbols.
```

## Asset Checklist

- [ ] Supericons logo SVG.
- [ ] Website screen recordings.
- [ ] MCP screen recordings.
- [ ] Motion Lab screen recording.
- [ ] Converter screen recording.
- [ ] AI-generated intro image.
- [ ] AI-generated outro image.
- [ ] Image-to-video intro clip.
- [ ] Image-to-video outro clip.
- [ ] Voiceover audio.
- [ ] Background music.
- [ ] Click or whoosh sound effects.
- [ ] Captions.

## QA Checklist

- [ ] No private keys visible.
- [ ] No local file paths visible.
- [ ] No browser tabs with private information.
- [ ] All text readable on mobile.
- [ ] Supericons spelling is correct, with lowercase `i`.
- [ ] `npx supericons-mcp` visible at the end.
- [ ] Website URL visible at the end.
- [ ] Motion Lab and Converter shown as useful workflow tools, not afterthoughts.
- [ ] Video works without audio because captions are present.
- [ ] Exported 16:9 master is clean.
- [ ] Vertical crop keeps important UI visible.

## Recommended Production Order

1. Record the real product demos first.
2. Generate the intro and outro images.
3. Run image-to-video for intro and outro.
4. Record voiceover.
5. Assemble in Remotion.
6. Add captions.
7. Render 16:9 master.
8. Create vertical crop.
9. Review on desktop and phone.
10. Publish with short caption and setup command.

## Practical Recommendation

Do not make the first video too cinematic.

Use generated video only for the first and last few seconds. The middle must show real product proof:

- real MCP result
- real website search
- real Motion Lab preview
- real Converter workflow

That makes the video credible and useful, not just pretty.

## Practical Remotion Workflow

Remotion is the final editing and assembly tool. Think of it as a programmable video editor built with React.

In this workflow, Remotion does not replace Kling, Seedance, or screen recording. It combines everything:

- generated image-to-video clips
- real product screen recordings
- captions
- voiceover
- music
- logo
- CTA
- transitions
- timing
- final exports

### What Remotion Is Best For

Use Remotion for:

- exact scene timing
- clean text overlays
- captions
- zoom/crop on screen recordings
- callout boxes
- cursor highlights
- animated labels
- combining video clips
- rendering 16:9 and 9:16 versions

Do not use Remotion for:

- generating cinematic footage
- replacing real product demos
- faking MCP results

### Remotion Workflow Step By Step

#### Step 1: Create a video project

Use a separate folder so the website code stays untouched.

```powershell
mkdir video
cd video
npx create-video@latest --yes --blank --no-tailwind supericons-video-1
cd supericons-video-1
```

#### Step 2: Add assets

Put all source files in the Remotion `public` folder.

Recommended structure:

```text
public/
  images/
    scene-01-hook.png
    scene-02-old-workflow.png
    scene-03-agent-prompt.png
    scene-04-recommendation-map.png
    scene-05-human-search.png
    scene-06-motion-lab.png
    scene-07-converter.png
    scene-08-final-workflow.png
  video/
    scene-01-hook-kling.mp4
    scene-02-old-workflow-kling.mp4
    codex-mcp-prompt.mp4
    codex-mcp-results.mp4
    supericons-browser-search.mp4
    supericons-motion-lab.mp4
    supericons-converter.mp4
    scene-08-final-kling.mp4
  audio/
    voiceover.mp3
    music.mp3
```

#### Step 3: Create one composition

Create a composition called:

```text
SupericonsVideo1
```

Recommended settings:

```text
1920 x 1080
30 fps
70 seconds
```

#### Step 4: Build scenes

Create one React component per scene:

```text
HookScene.tsx
OldWorkflowScene.tsx
McpPromptScene.tsx
McpResultsScene.tsx
BrowserSearchScene.tsx
MotionLabScene.tsx
ConverterScene.tsx
CtaScene.tsx
```

Each scene should receive:

- video or image source
- headline
- caption
- optional callout text
- timing

#### Step 5: Sequence scenes

Use Remotion `<Series>` to play scenes one after another.

Example structure:

```tsx
<Series>
  <Series.Sequence durationInFrames={6 * fps}>
    <HookScene />
  </Series.Sequence>
  <Series.Sequence durationInFrames={7 * fps}>
    <OldWorkflowScene />
  </Series.Sequence>
  <Series.Sequence durationInFrames={8 * fps}>
    <McpPromptScene />
  </Series.Sequence>
</Series>
```

#### Step 6: Add overlays

Use Remotion `<Sequence>` inside each scene for:

- headline appearing
- subtitle appearing
- orange highlight boxes
- arrows
- logo
- CTA

Example:

```tsx
<Sequence from={1 * fps} durationInFrames={4 * fps}>
  <Headline>Stop asking your agent to guess icons.</Headline>
</Sequence>
```

#### Step 7: Animate with frame-based logic

Use `useCurrentFrame()` and `interpolate()` for animation.

Use this for:

- fade in
- slide up
- zoom in
- highlight pulse
- callout movement

Avoid CSS transitions because they are unreliable in rendered videos.

#### Step 8: Add voiceover and music

Add voiceover as one full audio track.

Add background music quietly under it.

Recommended volume:

- voiceover: 100%
- music: 8-15%

#### Step 9: Render still frames for checking

Before rendering the full video, render a few still frames:

```powershell
npx remotion still SupericonsVideo1 --frame=30 --scale=0.25
npx remotion still SupericonsVideo1 --frame=600 --scale=0.25
npx remotion still SupericonsVideo1 --frame=1500 --scale=0.25
```

Check:

- text is readable
- screen recording crop is correct
- no overlay blocks important UI
- orange accent is consistent

#### Step 10: Render the video

```powershell
npx remotion render SupericonsVideo1 out/supericons-video-1.mp4
```

#### Step 11: Create vertical version

Create a second composition:

```text
SupericonsVideo1Vertical
```

Recommended settings:

```text
1080 x 1920
30 fps
70 seconds
```

For vertical:

- crop screen recordings around the important UI
- make captions larger
- keep CTA centered
- avoid showing full desktop width when text becomes tiny

## Human Work Needed From Owner

The owner should provide:

- [ ] clean screen recording of Supericons browser search
- [ ] clean screen recording of MCP prompt/result
- [ ] clean screen recording of Motion Lab
- [ ] clean screen recording of Converter
- [ ] final voiceover choice
- [ ] preferred music style
- [ ] approval of generated intro/outro frames

Codex can help with:

- image prompt writing
- still image generation
- Remotion project scaffolding
- scene timing
- captions
- callouts
- render checks
- revisions
