const PACKAGE_SPEC = '@supericons/mcp@latest';

function jsonConfig(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export const MCP_CLIENT_CONFIGS = Object.freeze([
  Object.freeze({
    id: 'claude-code',
    label: 'Claude Code',
    format: 'json',
    location: '.mcp.json in your project',
    sourceUrl: 'https://docs.anthropic.com/en/docs/claude-code/mcp',
    code: jsonConfig({
      mcpServers: {
        supericons: {
          command: 'npx',
          args: ['-y', PACKAGE_SPEC],
        },
      },
    }),
  }),
  Object.freeze({
    id: 'codex',
    label: 'Codex',
    format: 'toml',
    location: '~/.codex/config.toml',
    sourceUrl: 'https://developers.openai.com/codex/mcp/',
    code: `[mcp_servers.supericons]
command = "npx"
args = ["-y", "${PACKAGE_SPEC}"]
`,
  }),
  Object.freeze({
    id: 'cursor',
    label: 'Cursor',
    format: 'json',
    location: '~/.cursor/mcp.json',
    sourceUrl: 'https://docs.cursor.com/context/model-context-protocol',
    code: jsonConfig({
      mcpServers: {
        supericons: {
          command: 'npx',
          args: ['-y', PACKAGE_SPEC],
        },
      },
    }),
  }),
  Object.freeze({
    id: 'opencode',
    label: 'OpenCode',
    format: 'json',
    location: 'Project: opencode.json or opencode.jsonc. Global: ~/.config/opencode/opencode.json or opencode.jsonc',
    sourceUrl: 'https://opencode.ai/docs/mcp-servers/',
    code: jsonConfig({
      mcp: {
        supericons: {
          type: 'local',
          command: ['npx', '-y', PACKAGE_SPEC],
          enabled: true,
        },
      },
    }),
  }),
  Object.freeze({
    id: 'cline',
    label: 'Cline',
    format: 'json',
    location: '~/.cline/data/settings/cline_mcp_settings.json',
    sourceUrl: 'https://docs.cline.bot/getting-started/config',
    code: jsonConfig({
      mcpServers: {
        supericons: {
          type: 'stdio',
          command: 'npx',
          args: ['-y', PACKAGE_SPEC],
          disabled: false,
        },
      },
    }),
  }),
  Object.freeze({
    id: 'github-copilot',
    label: 'GitHub Copilot CLI',
    format: 'json',
    location: '~/.copilot/mcp-config.json',
    sourceUrl: 'https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-mcp-servers',
    code: jsonConfig({
      mcpServers: {
        supericons: {
          type: 'local',
          command: 'npx',
          args: ['-y', PACKAGE_SPEC],
          tools: ['*'],
        },
      },
    }),
  }),
  Object.freeze({
    id: 'windsurf',
    label: 'Windsurf',
    format: 'json',
    location: '~/.codeium/windsurf/mcp_config.json',
    sourceUrl: 'https://docs.windsurf.com/windsurf/cascade/mcp',
    code: jsonConfig({
      mcpServers: {
        supericons: {
          command: 'npx',
          args: ['-y', PACKAGE_SPEC],
        },
      },
    }),
  }),
]);

export function getMcpClientConfig(id) {
  return MCP_CLIENT_CONFIGS.find((entry) => entry.id === id) || MCP_CLIENT_CONFIGS[0];
}

export function assertMcpClientConfig(config) {
  if (!config || typeof config !== 'object') throw new TypeError('MCP client config is required.');
  if (!config.id || !config.label || !config.location || !config.code) {
    throw new TypeError('MCP client config is incomplete.');
  }
  if (!config.code.includes(PACKAGE_SPEC)) {
    throw new TypeError(`${config.id}: MCP config must use ${PACKAGE_SPEC}.`);
  }
  if (config.code.includes('SUPERICONS_API_KEY')) {
    throw new TypeError(`${config.id}: free MCP setup must not require an API key.`);
  }

  if (config.format === 'json') {
    JSON.parse(config.code);
    return true;
  }

  if (config.format === 'toml') {
    if (!config.code.includes('[mcp_servers.supericons]')) {
      throw new TypeError(`${config.id}: Codex config is missing the Supericons server table.`);
    }
    if (!/^command = "npx"$/m.test(config.code)) {
      throw new TypeError(`${config.id}: Codex config is missing the npx command.`);
    }
    if (!/^args = \["-y", "@supericons\/mcp@latest"\]$/m.test(config.code)) {
      throw new TypeError(`${config.id}: Codex config is missing the current package arguments.`);
    }
    return true;
  }

  throw new TypeError(`${config.id}: unsupported config format.`);
}
