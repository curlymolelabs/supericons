import process from "node:process";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  StdioClientTransport,
  getDefaultEnvironment
} from "@modelcontextprotocol/sdk/client/stdio.js";
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { Type } from "typebox";

const SUPERICONS_MCP_PACKAGE = "@supericons/mcp@0.4.9";
const LOCALES = [
  "zh-Hans",
  "zh-Hant",
  "ja",
  "ko",
  "es",
  "de",
  "pt",
  "ar",
  "hi",
  "vi",
  "th"
];
const LIBRARIES = [
  "lucide",
  "tabler",
  "phosphor",
  "heroicons",
  "bootstrap",
  "iconoir",
  "ionicons",
  "material",
  "simpleicons",
  "mingcute"
];
const MOTION_PRESETS = [
  "pulse",
  "bounce",
  "spin",
  "trace",
  "typing"
];

let clientPromise;
let transport;

function npxCommand() {
  return process.platform === "win32" ? "npx.cmd" : "npx";
}

function childEnv() {
  const env = getDefaultEnvironment();
  for (const key of ["SUPERICONS_API_KEY"]) {
    if (process.env[key]) {
      env[key] = process.env[key];
    }
  }
  return env;
}

async function getClient() {
  if (!clientPromise) {
    clientPromise = (async () => {
      transport = new StdioClientTransport({
        command: npxCommand(),
        args: ["-y", SUPERICONS_MCP_PACKAGE],
        env: childEnv(),
        stderr: "pipe"
      });

      const client = new Client(
        {
          name: "openclaw-supericons",
          version: "0.4.9"
        },
        {
          capabilities: {}
        }
      );

      await client.connect(transport);
      return client;
    })().catch((error) => {
      clientPromise = undefined;
      transport = undefined;
      throw error;
    });
  }

  return clientPromise;
}

async function callSupericons(toolName, params) {
  try {
    const client = await getClient();
    const result = await client.callTool({
      name: toolName,
      arguments: params ?? {}
    });

    if (Array.isArray(result.content)) {
      return {
        content: result.content,
        isError: Boolean(result.isError)
      };
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2)
        }
      ],
      isError: Boolean(result.isError)
    };
  } catch (error) {
    clientPromise = undefined;
    await transport?.close?.().catch(() => {});
    transport = undefined;

    return {
      isError: true,
      content: [
        {
          type: "text",
          text: `Supericons MCP call failed: ${error instanceof Error ? error.message : String(error)}`
        }
      ]
    };
  }
}

function proxyTool({ name, mcpName, description, parameters }) {
  return {
    name,
    description,
    parameters,
    async execute(_id, params) {
      return callSupericons(mcpName, params);
    }
  };
}

const locale = Type.Optional(Type.Union(LOCALES.map((value) => Type.Literal(value))));
const library = Type.Optional(Type.Union(LIBRARIES.map((value) => Type.Literal(value))));
const style = Type.Optional(Type.Union([
  Type.Literal("any"),
  Type.Literal("outline"),
  Type.Literal("solid")
]));
const responseMode = Type.Optional(Type.Union([
  Type.Literal("plan"),
  Type.Literal("assets"),
  Type.Literal("full")
]));
const motionPreset = Type.Union(MOTION_PRESETS.map((value) => Type.Literal(value)));
const trigger = Type.Optional(Type.Union([
  Type.Literal("loop"),
  Type.Literal("hover"),
  Type.Literal("click")
]));

const tools = [
  proxyTool({
    name: "supericons_search_icons",
    mcpName: "search_icons",
    description: "Search Supericons for SVG icons by meaning, object, action, or UI use.",
    parameters: Type.Object({
      query: Type.String(),
      library,
      limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 50 })),
      locale,
      style
    })
  }),
  proxyTool({
    name: "supericons_get_icon",
    mcpName: "get_icon",
    description: "Get one SVG icon by icon id and library.",
    parameters: Type.Object({
      id: Type.String(),
      library: Type.String(),
      style
    })
  }),
  proxyTool({
    name: "supericons_list_libraries",
    mcpName: "list_libraries",
    description: "List the free icon libraries available in Supericons.",
    parameters: Type.Object({})
  }),
  proxyTool({
    name: "supericons_recommend_icons",
    mcpName: "recommend_icons",
    description: "Recommend icons for UI slots such as navigation, dashboards, and actions.",
    parameters: Type.Object({
      task: Type.String(),
      slots: Type.Array(Type.String(), { minItems: 1 }),
      library,
      limit_per_slot: Type.Optional(Type.Integer({ minimum: 1, maximum: 10 })),
      locale,
      response_mode: responseMode,
      style
    })
  }),
  proxyTool({
    name: "supericons_list_motion_presets",
    mcpName: "list_motion_presets",
    description: "List Motion Lab animation presets available for Supericons icons.",
    parameters: Type.Object({
      locale
    })
  }),
  proxyTool({
    name: "supericons_get_motion_recipe",
    mcpName: "get_motion_recipe",
    description: "Get a human-readable recipe for a Motion Lab icon animation preset.",
    parameters: Type.Object({
      preset: motionPreset,
      trigger,
      duration_ms: Type.Optional(Type.Integer({ minimum: 1 })),
      intensity_percent: Type.Optional(Type.Integer({ minimum: 1, maximum: 200 })),
      locale
    })
  }),
  proxyTool({
    name: "supericons_export_motion_css",
    mcpName: "export_motion_css",
    description: "Export CSS for animating a Supericons icon.",
    parameters: Type.Object({
      id: Type.String(),
      library: Type.String(),
      preset: motionPreset,
      trigger,
      duration_ms: Type.Optional(Type.Integer({ minimum: 1 })),
      intensity_percent: Type.Optional(Type.Integer({ minimum: 1, maximum: 200 })),
      locale
    })
  }),
  proxyTool({
    name: "supericons_export_animated_svg",
    mcpName: "export_animated_svg",
    description: "Export a self-contained animated SVG for a Supericons icon.",
    parameters: Type.Object({
      id: Type.String(),
      library: Type.String(),
      preset: motionPreset,
      trigger,
      duration_ms: Type.Optional(Type.Integer({ minimum: 1 })),
      intensity_percent: Type.Optional(Type.Integer({ minimum: 1, maximum: 200 })),
      color: Type.Optional(Type.String()),
      locale
    })
  }),
  proxyTool({
    name: "supericons_animate_icon",
    mcpName: "animate_icon",
    description: "Export Motion Lab CSS and an animated SVG for one Supericons icon.",
    parameters: Type.Object({
      id: Type.String(),
      library: Type.String(),
      preset: motionPreset,
      trigger,
      duration_ms: Type.Optional(Type.Integer({ minimum: 1 })),
      intensity_percent: Type.Optional(Type.Integer({ minimum: 1, maximum: 200 })),
      color: Type.Optional(Type.String()),
      locale
    })
  }),
  proxyTool({
    name: "supericons_inspect_converter_options",
    mcpName: "inspect_converter_options",
    description: "List Supericons Converter options and recommended starting settings.",
    parameters: Type.Object({
      locale
    })
  }),
  proxyTool({
    name: "supericons_inspect_converter_input",
    mcpName: "inspect_converter_input",
    description: "Inspect a PNG before converting it to SVG.",
    parameters: Type.Object({
      imageBase64: Type.String(),
      mimeType: Type.Optional(Type.Literal("image/png")),
      locale
    })
  }),
  proxyTool({
    name: "supericons_convert_png_to_svg",
    mcpName: "convert_png_to_svg",
    description: "Convert a PNG image payload to SVG.",
    parameters: Type.Object({
      imageBase64: Type.String(),
      colorMode: Type.Optional(Type.Union([
        Type.Literal("color"),
        Type.Literal("mono")
      ])),
      qualityMode: Type.Optional(Type.Union([
        Type.Literal("exact"),
        Type.Literal("compact")
      ])),
      traceClass: Type.Optional(Type.Union([
        Type.Literal("general-color"),
        Type.Literal("flat-logo-color"),
        Type.Literal("tile-icon-color"),
        Type.Literal("tiny-line-icon"),
        Type.Literal("single-color-mark"),
        Type.Literal("mono-mask")
      ])),
      uiMode: Type.Optional(Type.Union([
        Type.Literal("logo"),
        Type.Literal("icon")
      ])),
      locale
    })
  }),
  proxyTool({
    name: "supericons_convert_svg_to_png",
    mcpName: "convert_svg_to_png",
    description: "Render an SVG string to PNG.",
    parameters: Type.Object({
      svg: Type.String(),
      targetWidth: Type.Optional(Type.Integer({ minimum: 1 })),
      background: Type.Optional(Type.String()),
      locale
    })
  })
];

export default definePluginEntry({
  id: "supericons-mcp",
  name: "Supericons MCP",
  description: "Semantic SVG icon search and recommendations for OpenClaw.",
  register(api) {
    for (const tool of tools) {
      api.registerTool(tool);
    }
  }
});
