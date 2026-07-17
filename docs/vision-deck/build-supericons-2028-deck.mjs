import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const artifactToolUrl = process.env.ARTIFACT_TOOL_URL;

if (!artifactToolUrl) {
  throw new Error("Set ARTIFACT_TOOL_URL to the local artifact_tool.mjs file URL before building this deck.");
}

const {
  Presentation,
  PresentationFile,
  row,
  column,
  grid,
  layers,
  panel,
  text,
  image,
  shape,
  rule,
  fill,
  hug,
  fixed,
  wrap,
  grow,
  fr,
  auto,
} = await import(artifactToolUrl);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..", "..");
const assetDir = path.join(__dirname, "assets");
const outDir = path.join(rootDir, "output", "vision-deck");
mkdirSync(outDir, { recursive: true });

const W = 1920;
const H = 1080;
const deck = Presentation.create({ slideSize: { width: W, height: H } });

const C = {
  bg: "#080B0E",
  bg2: "#10161B",
  text: "#F4F1E8",
  muted: "#B8C8C0",
  quiet: "#6F7F78",
  jade: "#23D9A4",
  cyan: "#39C7F4",
  amber: "#F2B84B",
  coral: "#FF7669",
  violet: "#9B7BFF",
  ink: "#050607",
};

const font = "Aptos";
const display = "Aptos Display";

function addSlide(node) {
  const slide = deck.slides.add();
  slide.compose(node, {
    frame: { left: 0, top: 0, width: W, height: H },
    baseUnit: 8,
  });
  return slide;
}

function t(value, options = {}) {
  return text(value, {
    height: hug,
    ...options,
    style: {
      fontFamily: options.style?.fontFamily ?? font,
      color: options.style?.color ?? C.text,
      ...options.style,
    },
  });
}

function title(value, width = 980, size = 70) {
  return t(value, {
    name: "slide-title",
    width: wrap(width),
    style: {
      fontFamily: display,
      fontSize: size,
      bold: true,
      color: C.text,
    },
  });
}

function subtitle(value, width = 930) {
  return t(value, {
    name: "slide-subtitle",
    width: wrap(width),
    style: { fontSize: 30, color: C.muted },
  });
}

function eyebrow(value, color = C.jade) {
  return t(value, {
    name: "eyebrow",
    width: wrap(680),
    style: { fontSize: 18, bold: true, color },
  });
}

function footer(value = "Supericons 2028 vision") {
  return t(value, {
    name: "footer",
    width: fill,
    style: { fontSize: 14, color: C.quiet },
  });
}

function bgFill(color = C.bg) {
  return shape({
    name: "background",
    width: fill,
    height: fill,
    fill: color,
    stroke: "transparent",
  });
}

function solidSlide(color, node) {
  return layers({ name: "solid-slide-root", width: fill, height: fill }, [
    bgFill(color),
    node,
  ]);
}

function fullBleedImage(name, filename, opacity = 1) {
  const imagePath = path.join(assetDir, filename);
  const dataUrl = `data:image/png;base64,${readFileSync(imagePath).toString("base64")}`;
  return image({
    name,
    dataUrl,
    width: fill,
    height: fill,
    fit: "cover",
    opacity,
    alt: name,
  });
}

function scrim(opacity = 0.64) {
  return shape({
    name: "readability-scrim",
    width: fill,
    height: fill,
    fill: `rgba(5, 7, 8, ${opacity})`,
    stroke: "transparent",
  });
}

function openStack(children, opts = {}) {
  return column(
    {
      name: opts.name ?? "open-stack",
      width: opts.width ?? fill,
      height: opts.height ?? hug,
      gap: opts.gap ?? 22,
      padding: opts.padding ?? 0,
      columnSpan: opts.columnSpan,
      rowSpan: opts.rowSpan,
    },
    children,
  );
}

function chip(label, color = C.jade) {
  return panel(
    {
      name: `chip-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      width: hug,
      height: hug,
      padding: { x: 18, y: 9 },
      fill: "rgba(255,255,255,0.06)",
      stroke: color,
      borderRadius: 999,
    },
    t(label, {
      width: hug,
      style: { fontSize: 17, bold: true, color },
    }),
  );
}

function pillar(label, detail, color) {
  return column(
    {
      name: `pillar-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      width: fill,
      height: hug,
      gap: 12,
    },
    [
      rule({ width: fixed(120), stroke: color, weight: 6 }),
      t(label, {
        width: fill,
        style: { fontSize: 34, bold: true, color: C.text },
      }),
      t(detail, {
        width: fill,
        style: { fontSize: 23, color: C.muted },
      }),
    ],
  );
}

function quoteLine(value, color = C.jade) {
  return row(
    { width: fill, height: hug, gap: 18, align: "center" },
    [
      rule({ width: fixed(82), stroke: color, weight: 5 }),
      t(value, {
        width: fill,
        style: { fontSize: 27, bold: true, color: C.text },
      }),
    ],
  );
}

// 1. Cover
addSlide(
  layers({ name: "cover-root", width: fill, height: fill }, [
    fullBleedImage(
      "human-agent-collaboration",
      "01-cover-human-agent-collaboration.png",
    ),
    scrim(0.54),
    column(
      {
        name: "cover-content",
        width: fill,
        height: fill,
        padding: { x: 104, y: 82 },
        gap: 30,
      },
      [
        eyebrow("SUPERICONS 2028", C.jade),
        title("The icon becomes the agent", 960, 92),
        subtitle(
          "A vision for living visual identities that help humans understand, trust, and guide autonomous AI collaborators.",
          920,
        ),
        row({ width: fill, height: grow(1) }, []),
        footer("Curly Mole Labs - Supericons future vision"),
      ],
    ),
  ]),
);

// 2. Human + agent collaboration model
addSlide(
  solidSlide(
    C.bg,
  grid(
    {
      name: "collaboration-model",
      width: fill,
      height: fill,
      padding: { x: 104, y: 78 },
      columns: [fr(1.02), fr(0.98)],
      rows: [auto, fr(1), auto],
      columnGap: 64,
      rowGap: 34,
    },
    [
      openStack(
        [
          eyebrow("THE 2028 SHIFT", C.cyan),
          title("Humans stop operating every step.", 820, 64),
          subtitle(
            "They set intent, grant authority, shape taste, and intervene when the agent reaches the edge of trust.",
            820,
          ),
        ],
        { name: "title-stack", width: fill, gap: 20, columnSpan: 2 },
      ),
      openStack(
        [
          quoteLine("Human role: taste, goals, consent", C.amber),
          quoteLine("Agent role: planning, action, recall", C.jade),
          quoteLine("Shared layer: visible state and control", C.cyan),
        ],
        { name: "collaboration-lines", gap: 40 },
      ),
      openStack(
        [
          t("The collaboration surface cannot be a silent chat box. It needs small signals that are always present, instantly readable, and emotionally honest.", {
            width: fill,
            style: { fontSize: 34, bold: true, color: C.text },
          }),
          t("That is where icons evolve: from command labels into compact trust instruments.", {
            width: fill,
            style: { fontSize: 25, color: C.muted },
          }),
        ],
        { name: "right-claim", gap: 24 },
      ),
      footer("Source basis: project vision docs in /docs"),
    ],
  )),
);

// 3. What an icon must communicate
addSlide(
  solidSlide(
    C.bg2,
  grid(
    {
      name: "icon-jobs",
      width: fill,
      height: fill,
      padding: { x: 104, y: 78 },
      columns: [fr(1), fr(1), fr(1), fr(1)],
      rows: [auto, fr(1), auto],
      columnGap: 38,
      rowGap: 42,
    },
    [
      openStack(
        [
          eyebrow("A NEW JOB DESCRIPTION", C.jade),
          title("Future icons answer four questions at a glance.", 1320, 62),
        ],
        { columnSpan: 4, gap: 18 },
      ),
      pillar("Who is acting?", "A stable identity, like a face or fingerprint.", C.cyan),
      pillar("What is it doing?", "A live state layer: thinking, acting, blocked, done.", C.jade),
      pillar("How sure is it?", "Confidence shown through fill, edge, and motion.", C.amber),
      pillar("Can it act?", "Authority and risk shown before work leaves your control.", C.coral),
      footer("Static glyphs remain useful; agentic icons add identity, state, confidence, and authority."),
    ],
  )),
);

// 4. Three-layer anatomy
addSlide(
  layers({ name: "anatomy-root", width: fill, height: fill }, [
    fullBleedImage("agentic-icon-anatomy", "02-agentic-icon-anatomy.png"),
    scrim(0.36),
    grid(
      {
        name: "anatomy-copy",
        width: fill,
        height: fill,
        padding: { x: 104, y: 72 },
        columns: [fr(1.06), fr(0.94)],
        rows: [auto, fr(1), auto],
        columnGap: 48,
        rowGap: 24,
      },
      [
        openStack(
          [
            eyebrow("THE LIVING ICON STACK", C.cyan),
            title("Identity, state, interaction.", 870, 66),
          ],
          { columnSpan: 2, gap: 16 },
        ),
        row({ width: fill, height: fill }, []),
        openStack(
          [
            chip("identity layer", C.cyan),
            chip("state layer", C.jade),
            chip("interaction layer", C.amber),
            t("The base form stays recognizable. The living skin tells you what the agent is doing. The top layer opens into generated UI when human attention arrives.", {
              width: fill,
              style: { fontSize: 27, bold: true, color: C.text },
            }),
          ],
          { name: "anatomy-points", gap: 18 },
        ),
        row({ width: fill, height: hug }, []),
      ],
    ),
  ]),
);

// 5. Trust gradient
addSlide(
  solidSlide(
    C.bg,
  grid(
    {
      name: "trust-gradient",
      width: fill,
      height: fill,
      padding: { x: 104, y: 78 },
      columns: [fr(1), fr(1), fr(1), fr(1)],
      rows: [auto, fr(1), auto],
      columnGap: 34,
      rowGap: 46,
    },
    [
      openStack(
        [
          eyebrow("TRUST IS VISIBLE", C.amber),
          title("A relationship should change the icon.", 1240, 62),
          subtitle(
            "A new agent should look tentative. A proven deputy should look stable, detailed, and allowed to move.",
            1220,
          ),
        ],
        { columnSpan: 4, gap: 17 },
      ),
      pillar("Stranger", "Faded form. No satellites. Asks before acting.", C.quiet),
      pillar("Acquaintance", "Outlined form. Limited tools. Confirms risky steps.", C.cyan),
      pillar("Colleague", "Filled form. Known strengths. Acts inside guardrails.", C.jade),
      pillar("Deputy", "Glowing form. Delegates safely. Reports by exception.", C.amber),
      footer("Visual richness becomes earned trust, not decoration."),
    ],
  )),
);

// 6. Multi-agent canvas
addSlide(
  layers({ name: "multi-agent-root", width: fill, height: fill }, [
    fullBleedImage("multi-agent-constellation", "03-multi-agent-constellation.png"),
    scrim(0.34),
    column(
      {
        name: "multi-agent-copy",
        width: fill,
        height: fill,
        padding: { x: 104, y: 74 },
        gap: 22,
      },
      [
        eyebrow("THE MULTI-AGENT CANVAS", C.violet),
        title("Your digital workforce becomes a constellation.", 1040, 66),
        subtitle(
          "Proximity means collaboration. Orbit means tool use. Splitting means delegation. Isolation means a solo thread of work.",
          980,
        ),
        row({ width: fill, height: grow(1) }, []),
        row(
          { name: "canvas-chips", width: fill, height: hug, gap: 16 },
          [
            chip("proximity = collaboration", C.jade),
            chip("orbit = active tools", C.cyan),
            chip("split = delegation", C.amber),
          ],
        ),
        footer(),
      ],
    ),
  ]),
);

// 7. Supericons product evolution
addSlide(
  layers({ name: "supericons-forge-root", width: fill, height: fill }, [
    fullBleedImage("supericons-agent-registry-forge", "04-supericons-agent-registry-forge.png"),
    scrim(0.42),
    grid(
      {
        name: "forge-copy",
        width: fill,
        height: fill,
        padding: { x: 104, y: 74 },
        columns: [fr(1), fr(1)],
        rows: [auto, fr(1), auto],
        columnGap: 52,
        rowGap: 28,
      },
      [
        openStack(
          [
            eyebrow("HOW SUPERICONS EVOLVES", C.jade),
            title("From icon library to agent identity layer.", 1120, 66),
          ],
          { columnSpan: 2, gap: 16 },
        ),
        row({ width: fill, height: fill }, []),
        openStack(
          [
            quoteLine("Semantic registry: agents ask for meaning, not filenames.", C.cyan),
            quoteLine("Motion grammar: every animation carries state.", C.jade),
            quoteLine("Trust packs: authority, risk, handoff, and audit signals.", C.amber),
            quoteLine("Machine surface: metadata agents can reason about.", C.violet),
          ],
          { name: "evolution-lines", gap: 26 },
        ),
        row({ width: fill, height: hug }, []),
      ],
    ),
  ]),
);

// 8. Ambient future
addSlide(
  layers({ name: "ambient-root", width: fill, height: fill }, [
    fullBleedImage("ambient-agent-icons", "05-ambient-agent-icons.png"),
    scrim(0.33),
    column(
      {
        name: "ambient-copy",
        width: fill,
        height: fill,
        padding: { x: 104, y: 74 },
        gap: 24,
      },
      [
        eyebrow("THE END STATE", C.jade),
        title("One identity, many surfaces.", 1120, 58),
        subtitle(
          "The same agent appears as a rich icon on a canvas, a simple watch mark, an AR badge, a car status light, or a room glow.",
          980,
        ),
        row({ width: fill, height: grow(1) }, []),
        t("Supericons wins by defining the genome: the rules that let icons adapt without losing who they are.", {
          name: "closing-line",
          width: wrap(1120),
          style: { fontSize: 34, bold: true, color: C.text },
        }),
        footer("Vision deck · May 2026"),
      ],
    ),
  ]),
);

const pptxPath = path.join(outDir, "supericons-2028-agentic-icons-vision.pptx");
const pptxBlob = await PresentationFile.exportPptx(deck);
await pptxBlob.save(pptxPath);

const previewDir = path.join(outDir, "previews");
mkdirSync(previewDir, { recursive: true });

const imported = await PresentationFile.importPptx(readFileSync(pptxPath));
const previewPaths = [];
const layoutPaths = [];

async function saveExportedBlob(blob, destination) {
  if (typeof blob.save === "function") {
    await blob.save(destination);
    return;
  }
  const bytes = new Uint8Array(await blob.arrayBuffer());
  writeFileSync(destination, bytes);
}

for (let i = 0; i < imported.slides.count; i += 1) {
  const slide = imported.slides.getItem(i);
  const index = String(i + 1).padStart(2, "0");
  const previewPath = path.join(previewDir, `slide-${index}.png`);
  const layoutPath = path.join(previewDir, `slide-${index}.layout.json`);
  const pngBlob = await slide.export({ format: "png" });
  await saveExportedBlob(pngBlob, previewPath);
  const layout = await slide.export({ format: "layout" });
  writeFileSync(layoutPath, JSON.stringify(layout, null, 2), "utf8");
  previewPaths.push(previewPath);
  layoutPaths.push(layoutPath);
}

console.log(
  JSON.stringify(
    {
      pptxPath,
      slideCount: imported.slides.count,
      previewDir,
      previewPaths,
      layoutPaths,
    },
    null,
    2,
  ),
);
