const DESCRIPTION_OVERRIDES = {
  "pulse": "Scales gently in and out for soft emphasis.",
  "bounce": "Lifts the icon with a quick rebound.",
  "spin": "Rotates the full icon around its center.",
  "shake": "Adds a quick side-to-side alert motion.",
  "float": "Gives the icon a subtle hovering drift.",
  "pop": "Snaps up with a springy overshoot.",
  "magneticIn": "Pulls the icon inward with a magnetic snap.",
  "sparkle": "Adds a glow burst that peaks mid-cycle.",
  "trace": "Reveals the icon with a directional trace.",
  "sweep": "Sweeps across the icon with a lit edge.",
  "typing": "Stages the icon in with stepped reveal timing.",
  "tap": "Presses forward with a quick action glow."
};

export const MOTION_LAB_PRESET_GROUPS = [
  {
    "key": "motion",
    "label": "Motion",
    "items": [
      {
        "preset": "bounce",
        "icon": "arrow_upward",
        "label": "Bounce"
      },
      {
        "preset": "float",
        "icon": "cloud",
        "label": "Float"
      },
      {
        "preset": "shake",
        "icon": "vibration",
        "label": "Shake"
      },
      {
        "preset": "spin",
        "icon": "rotate_right",
        "label": "Spin"
      },
      {
        "preset": "pulse",
        "icon": "radio_button_checked",
        "label": "Pulse"
      },
      {
        "preset": "pop",
        "icon": "open_in_full",
        "label": "Pop"
      },
      {
        "preset": "heartbeat",
        "icon": "favorite",
        "label": "Heartbeat"
      },
      {
        "preset": "rubberband",
        "icon": "straighten",
        "label": "Rubber Band"
      },
      {
        "preset": "jelly",
        "icon": "water_drop",
        "label": "Jelly"
      },
      {
        "preset": "ring",
        "icon": "notifications",
        "label": "Ring"
      },
      {
        "preset": "wobble",
        "icon": "tsunami",
        "label": "Wobble"
      },
      {
        "preset": "magnetic",
        "icon": "attractions",
        "label": "Magnetic"
      },
      {
        "preset": "recoil",
        "icon": "electric_bolt",
        "label": "Recoil"
      },
      {
        "preset": "pendulum",
        "icon": "swap_horiz",
        "label": "Pendulum"
      },
      {
        "preset": "whiplash",
        "icon": "crop_rotate",
        "label": "Whiplash"
      },
      {
        "preset": "tremor",
        "icon": "earthquake",
        "label": "Tremor"
      },
      {
        "preset": "neonglow",
        "icon": "flare",
        "label": "Neon Glow"
      },
      {
        "preset": "breathe",
        "icon": "spa",
        "label": "Breathe"
      },
      {
        "preset": "metronome",
        "icon": "timer",
        "label": "Metronome"
      },
      {
        "preset": "orbit",
        "icon": "motion_photos_on",
        "label": "Orbit"
      },
      {
        "preset": "flicker",
        "icon": "fluorescent",
        "label": "Flicker"
      },
      {
        "preset": "squish",
        "icon": "compress",
        "label": "Squish"
      },
      {
        "preset": "glide",
        "icon": "air",
        "label": "Glide"
      },
      {
        "preset": "radar",
        "icon": "radar",
        "label": "Radar"
      },
      {
        "preset": "beacon",
        "icon": "wifi_tethering",
        "label": "Beacon"
      }
    ]
  },
  {
    "key": "entrances",
    "label": "Entrances",
    "items": [
      {
        "preset": "magneticIn",
        "icon": "attractions",
        "label": "Magnetic In"
      },
      {
        "preset": "fadeIn",
        "icon": "gradient",
        "label": "Fade In"
      },
      {
        "preset": "scaleUp",
        "icon": "zoom_in",
        "label": "Scale Up"
      },
      {
        "preset": "slideUp",
        "icon": "arrow_upward",
        "label": "Slide Up"
      },
      {
        "preset": "springLand",
        "icon": "downloading",
        "label": "Spring Land"
      },
      {
        "preset": "slingshot",
        "icon": "swipe_right_alt",
        "label": "Slingshot"
      },
      {
        "preset": "glitchOn",
        "icon": "flash_on",
        "label": "Glitch On"
      },
      {
        "preset": "unfold",
        "icon": "unfold_more",
        "label": "Unfold"
      },
      {
        "preset": "warpIn",
        "icon": "blur_on",
        "label": "Warp In"
      },
      {
        "preset": "slideRight",
        "icon": "arrow_forward",
        "label": "Slide Right"
      },
      {
        "preset": "slideDown",
        "icon": "arrow_downward",
        "label": "Slide Down"
      },
      {
        "preset": "flipIn",
        "icon": "flip",
        "label": "Flip In"
      },
      {
        "preset": "telegram",
        "icon": "send",
        "label": "Telegram"
      },
      {
        "preset": "bloom",
        "icon": "filter_vintage",
        "label": "Bloom"
      },
      {
        "preset": "shockwave",
        "icon": "radio_button_checked",
        "label": "Shockwave"
      }
    ]
  },
  {
    "key": "exits",
    "label": "Exits",
    "items": [
      {
        "preset": "fadeOut",
        "icon": "gradient",
        "label": "Fade Out"
      },
      {
        "preset": "scaleDown",
        "icon": "zoom_out",
        "label": "Scale Down"
      },
      {
        "preset": "slideOut",
        "icon": "arrow_upward",
        "label": "Slide Out"
      },
      {
        "preset": "vortex",
        "icon": "cyclone",
        "label": "Vortex"
      },
      {
        "preset": "glitchOff",
        "icon": "flash_off",
        "label": "Glitch Off"
      },
      {
        "preset": "dissolve",
        "icon": "blur_on",
        "label": "Dissolve"
      },
      {
        "preset": "popOut",
        "icon": "close_fullscreen",
        "label": "Pop Out"
      },
      {
        "preset": "slideLeft",
        "icon": "arrow_back",
        "label": "Slide Left"
      },
      {
        "preset": "sinkDown",
        "icon": "download",
        "label": "Sink Down"
      },
      {
        "preset": "flipOut",
        "icon": "flip",
        "label": "Flip Out"
      },
      {
        "preset": "implode",
        "icon": "compress",
        "label": "Implode"
      },
      {
        "preset": "puffOut",
        "icon": "cloud_queue",
        "label": "Puff Out"
      },
      {
        "preset": "launchOut",
        "icon": "rocket_launch",
        "label": "Launch Out"
      },
      {
        "preset": "shrinkSpin",
        "icon": "autorenew",
        "label": "Shrink Spin"
      },
      {
        "preset": "blinkOut",
        "icon": "flash_off",
        "label": "Blink Out"
      }
    ]
  },
  {
    "key": "saved",
    "label": "Special",
    "items": [
      {
        "preset": "sparkle",
        "icon": "auto_awesome",
        "label": "Sparkle"
      },
      {
        "preset": "swing",
        "icon": "sync_alt",
        "label": "Swing"
      },
      {
        "preset": "jitter",
        "icon": "electric_bolt",
        "label": "Jitter"
      },
      {
        "preset": "chase",
        "icon": "track_changes",
        "label": "Chase"
      },
      {
        "preset": "stream",
        "icon": "view_stream",
        "label": "Stream"
      },
      {
        "preset": "trace",
        "icon": "draw",
        "label": "Trace"
      },
      {
        "preset": "flow",
        "icon": "schema",
        "label": "Flow"
      },
      {
        "preset": "converge",
        "icon": "center_focus_strong",
        "label": "Converge"
      },
      {
        "preset": "cube",
        "icon": "view_in_ar",
        "label": "Cube"
      },
      {
        "preset": "typing",
        "icon": "keyboard",
        "label": "Typing"
      },
      {
        "preset": "reason",
        "icon": "account_tree",
        "label": "Reason"
      },
      {
        "preset": "sweep",
        "icon": "pie_chart",
        "label": "Sweep"
      },
      {
        "preset": "scatter",
        "icon": "scatter_plot",
        "label": "Scatter"
      },
      {
        "preset": "crest",
        "icon": "equalizer",
        "label": "Crest"
      },
      {
        "preset": "tap",
        "icon": "contactless",
        "label": "Tap"
      },
      {
        "preset": "shuffle",
        "icon": "shuffle",
        "label": "Shuffle"
      },
      {
        "preset": "infinity",
        "icon": "all_inclusive",
        "label": "Infinity"
      },
      {
        "preset": "spatial",
        "icon": "motion_photos_on",
        "label": "Spatial"
      },
      {
        "preset": "pageFlip",
        "icon": "flip",
        "label": "Page Flip"
      },
      {
        "preset": "bookOpen",
        "icon": "auto_stories",
        "label": "Book Open"
      },
      {
        "preset": "domino",
        "icon": "splitscreen",
        "label": "Domino"
      },
      {
        "preset": "supernova",
        "icon": "flare",
        "label": "Supernova"
      },
      {
        "preset": "blackHole",
        "icon": "blur_circular",
        "label": "Black Hole"
      },
      {
        "preset": "fingerprint",
        "icon": "fingerprint",
        "label": "Fingerprint"
      },
      {
        "preset": "badgeTap",
        "icon": "badge",
        "label": "Badge Tap"
      }
    ]
  }
];

export const MOTION_LAB_PRESETS = {
  pulse: {
    keyframes: [
      { offset: 0,    props: { transform: 'scale(1)', opacity: '1' } },
      { offset: 0.5,  props: { transform: 'scale(1.15)', opacity: '1' } },
      { offset: 1,    props: { transform: 'scale(1)', opacity: '1' } },
    ],
    easing: 'ease-in-out',
    // Which numeric values get scaled by intensity (from 1.15 → scaled)
    intensityTarget: { prop: 'transform', pattern: /scale\(([^)]+)\)/, base: 1, range: 0.15 },
  },
  bounce: {
    keyframes: [
      { offset: 0,    props: { transform: 'translateY(0px)' } },
      { offset: 0.4,  props: { transform: 'translateY(-6px)' } },
      { offset: 0.65, props: { transform: 'translateY(-2px)' } },
      { offset: 0.8,  props: { transform: 'translateY(-4px)' } },
      { offset: 1,    props: { transform: 'translateY(0px)' } },
    ],
    easing: 'ease-out',
  },
  spin: {
    keyframes: [
      { offset: 0, props: { transform: 'rotate(0deg)' } },
      { offset: 1, props: { transform: 'rotate(360deg)' } },
    ],
    easing: 'linear',
  },
  shake: {
    keyframes: [
      { offset: 0,    props: { transform: 'translateX(0px)' } },
      { offset: 0.15, props: { transform: 'translateX(-3px)' } },
      { offset: 0.30, props: { transform: 'translateX(3px)' } },
      { offset: 0.45, props: { transform: 'translateX(-3px)' } },
      { offset: 0.60, props: { transform: 'translateX(3px)' } },
      { offset: 0.75, props: { transform: 'translateX(-2px)' } },
      { offset: 1,    props: { transform: 'translateX(0px)' } },
    ],
    easing: 'ease-out',
  },
  float: {
    keyframes: [
      { offset: 0,   props: { transform: 'translateY(0px)' } },
      { offset: 0.5, props: { transform: 'translateY(-4px)' } },
      { offset: 1,   props: { transform: 'translateY(0px)' } },
    ],
    easing: 'ease-in-out',
  },
  pop: {
    keyframes: [
      { offset: 0,    props: { transform: 'scale(0.85)' } },
      { offset: 0.55, props: { transform: 'scale(1.1)' } },
      { offset: 0.75, props: { transform: 'scale(0.97)' } },
      { offset: 1,    props: { transform: 'scale(1)' } },
    ],
    easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
  magneticIn: {
    keyframes: [
      { offset: 0,    props: { transform: 'translateX(-28px) scale(0.84) rotate(-8deg)', opacity: '0' } },
      { offset: 0.58, props: { transform: 'translateX(5px) scale(1.06) rotate(2deg)', opacity: '1' } },
      { offset: 0.82, props: { transform: 'translateX(-1px) scale(0.985) rotate(-0.5deg)', opacity: '1' } },
      { offset: 1,    props: { transform: 'translateX(0px) scale(1) rotate(0deg)', opacity: '1' } },
    ],
    easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
  },
  // ── Starter customs (Saved quadrant) ──────────────────────────
  sparkle: {
    keyframes: [
      { offset: 0,   props: { filter: 'drop-shadow(0 0 0px transparent)', opacity: '1' } },
      { offset: 0.5, props: { filter: 'drop-shadow(0 0 6px rgba(255,215,0,0.8))', opacity: '0.85' } },
      { offset: 1,   props: { filter: 'drop-shadow(0 0 0px transparent)', opacity: '1' } },
    ],
    easing: 'ease-in-out',
  },
  swing: {
    keyframes: [
      { offset: 0,    props: { transform: 'rotate(0deg)' } },
      { offset: 0.25, props: { transform: 'rotate(15deg)' } },
      { offset: 0.75, props: { transform: 'rotate(-15deg)' } },
      { offset: 1,    props: { transform: 'rotate(0deg)' } },
    ],
    easing: 'ease-in-out',
  },
  jitter: {
    keyframes: [
      { offset: 0,   props: { transform: 'translate(0px, 0px)' } },
      { offset: 0.2, props: { transform: 'translate(2px, -2px)' } },
      { offset: 0.4, props: { transform: 'translate(-2px, 2px)' } },
      { offset: 0.6, props: { transform: 'translate(2px, 2px)' } },
      { offset: 0.8, props: { transform: 'translate(-2px, -2px)' } },
      { offset: 1,   props: { transform: 'translate(0px, 0px)' } },
    ],
    easing: 'linear',
  },
  chase: {
    keyframes: [
      { offset: 0,    props: { transform: 'translate(0px, 0px) scale(1)' } },
      { offset: 0.20, props: { transform: 'translate(6px, -4px) scale(1.06)' } },
      { offset: 0.40, props: { transform: 'translate(10px, 4px) scale(0.97)' } },
      { offset: 0.60, props: { transform: 'translate(-4px, 8px) scale(1.03)' } },
      { offset: 0.80, props: { transform: 'translate(-8px, -3px) scale(0.98)' } },
      { offset: 1,    props: { transform: 'translate(0px, 0px) scale(1)' } },
    ],
    easing: 'linear',
  },
  stream: {
    keyframes: [
      { offset: 0,    props: { transform: 'translateY(-14px)', opacity: '0', filter: 'blur(3px)' } },
      { offset: 0.25, props: { transform: 'translateY(-4px)', opacity: '0.55', filter: 'blur(2px)' } },
      { offset: 0.50, props: { transform: 'translateY(6px)', opacity: '0.9', filter: 'blur(1px)' } },
      { offset: 0.75, props: { transform: 'translateY(0px)', opacity: '1', filter: 'blur(0px)' } },
      { offset: 1,    props: { transform: 'translateY(4px)', opacity: '0.95', filter: 'blur(0px)' } },
    ],
    easing: 'ease-in-out',
  },
  trace: {
    keyframes: [
      { offset: 0,    props: { 'clip-path': 'inset(0 100% 0 0)', opacity: '0.35', filter: 'drop-shadow(0 0 0px transparent)' } },
      { offset: 0.55, props: { 'clip-path': 'inset(0 0% 0 0)', opacity: '1', filter: 'drop-shadow(0 0 6px rgba(255,107,53,0.35))' } },
      { offset: 1,    props: { 'clip-path': 'inset(0 0% 0 0)', opacity: '1', filter: 'drop-shadow(0 0 0px transparent)' } },
    ],
    easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
  },
  flow: {
    keyframes: [
      { offset: 0,    props: { transform: 'translateX(-14px)', opacity: '0.3', filter: 'blur(3px)' } },
      { offset: 0.30, props: { transform: 'translateX(-4px)', opacity: '0.75', filter: 'blur(2px)' } },
      { offset: 0.60, props: { transform: 'translateX(8px)', opacity: '1', filter: 'blur(0px)' } },
      { offset: 1,    props: { transform: 'translateX(0px)', opacity: '1', filter: 'blur(0px)' } },
    ],
    easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
  },
  converge: {
    keyframes: [
      { offset: 0,    props: { transform: 'scale(0.72)', opacity: '0.35', filter: 'blur(6px)' } },
      { offset: 0.45, props: { transform: 'scale(1.12)', opacity: '1', filter: 'blur(0px)' } },
      { offset: 0.70, props: { transform: 'scale(0.98)', opacity: '1', filter: 'blur(0px)' } },
      { offset: 1,    props: { transform: 'scale(1)', opacity: '1', filter: 'blur(0px)' } },
    ],
    easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
  },
  cube: {
    keyframes: [
      { offset: 0,    props: { transform: 'rotate(-18deg) scale(0.82)', opacity: '0.7' } },
      { offset: 0.35, props: { transform: 'rotate(16deg) scale(1.08)', opacity: '1' } },
      { offset: 0.65, props: { transform: 'rotate(-8deg) scale(0.96)', opacity: '1' } },
      { offset: 1,    props: { transform: 'rotate(0deg) scale(1)', opacity: '1' } },
    ],
    easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
  },
  typing: {
    keyframes: [
      { offset: 0,    props: { 'clip-path': 'inset(0 100% 0 0)', opacity: '0.2' } },
      { offset: 0.55, props: { 'clip-path': 'inset(0 28% 0 0)', opacity: '1' } },
      { offset: 0.70, props: { 'clip-path': 'inset(0 0% 0 0)', opacity: '1' } },
      { offset: 0.82, props: { 'clip-path': 'inset(0 0% 0 0)', opacity: '0.45' } },
      { offset: 0.90, props: { 'clip-path': 'inset(0 0% 0 0)', opacity: '1' } },
      { offset: 1,    props: { 'clip-path': 'inset(0 0% 0 0)', opacity: '1' } },
    ],
    easing: 'steps(5, end)',
  },
  reason: {
    keyframes: [
      { offset: 0,    props: { transform: 'translate(-6px, -6px) scale(0.92)', opacity: '0.45' } },
      { offset: 0.25, props: { transform: 'translate(6px, -2px) scale(1)', opacity: '0.85' } },
      { offset: 0.50, props: { transform: 'translate(-2px, 6px) scale(1.06)', opacity: '1' } },
      { offset: 0.75, props: { transform: 'translate(3px, 2px) scale(0.98)', opacity: '1' } },
      { offset: 1,    props: { transform: 'translate(0px, 0px) scale(1)', opacity: '1' } },
    ],
    easing: 'ease-in-out',
  },
  sweep: {
    keyframes: [
      { offset: 0,    props: { 'clip-path': 'inset(0 100% 0 0)', transform: 'translateX(-8px)', opacity: '0.25', filter: 'drop-shadow(0 0 0px transparent)' } },
      { offset: 0.40, props: { 'clip-path': 'inset(0 0% 0 0)', transform: 'translateX(0px)', opacity: '1', filter: 'drop-shadow(0 0 8px rgba(255,107,53,0.28))' } },
      { offset: 0.70, props: { 'clip-path': 'inset(0 0% 0 0)', transform: 'translateX(6px)', opacity: '0.8', filter: 'drop-shadow(0 0 4px rgba(255,107,53,0.18))' } },
      { offset: 1,    props: { 'clip-path': 'inset(0 0% 0 0)', transform: 'translateX(0px)', opacity: '1', filter: 'drop-shadow(0 0 0px transparent)' } },
    ],
    easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
  },
  scatter: {
    keyframes: [
      { offset: 0,    props: { transform: 'translate(0px, 0px) scale(0.88)', opacity: '0.8', filter: 'blur(0px)' } },
      { offset: 0.20, props: { transform: 'translate(-8px, -6px) scale(0.94)', opacity: '0.7', filter: 'blur(3px)' } },
      { offset: 0.40, props: { transform: 'translate(8px, 5px) scale(1.04)', opacity: '1', filter: 'blur(2px)' } },
      { offset: 0.70, props: { transform: 'translate(-5px, 3px) scale(0.98)', opacity: '0.92', filter: 'blur(1px)' } },
      { offset: 1,    props: { transform: 'translate(0px, 0px) scale(1)', opacity: '1', filter: 'blur(0px)' } },
    ],
    easing: 'ease-in-out',
  },
  crest: {
    keyframes: [
      { offset: 0,    props: { transform: 'translateY(0px) scale(0.96)' } },
      { offset: 0.20, props: { transform: 'translateY(-6px) scale(1.06)' } },
      { offset: 0.45, props: { transform: 'translateY(4px) scale(0.97)' } },
      { offset: 0.70, props: { transform: 'translateY(-2px) scale(1.02)' } },
      { offset: 1,    props: { transform: 'translateY(0px) scale(1)' } },
    ],
    easing: 'ease-in-out',
  },
  tap: {
    keyframes: [
      { offset: 0,    props: { transform: 'translateX(0px) rotate(0deg)', filter: 'drop-shadow(0 0 0px transparent)' } },
      { offset: 0.40, props: { transform: 'translateX(12px) rotate(8deg)', filter: 'drop-shadow(0 0 10px rgba(74,222,128,0.35))' } },
      { offset: 0.65, props: { transform: 'translateX(14px) rotate(8deg)', filter: 'drop-shadow(0 0 12px rgba(74,222,128,0.45))' } },
      { offset: 1,    props: { transform: 'translateX(0px) rotate(0deg)', filter: 'drop-shadow(0 0 0px transparent)' } },
    ],
    easing: 'cubic-bezier(0.2, 0.9, 0.2, 1)',
  },
  shuffle: {
    keyframes: [
      { offset: 0,    props: { transform: 'translateX(-10px) rotate(-8deg)', opacity: '0.8' } },
      { offset: 0.35, props: { transform: 'translateX(8px) rotate(6deg)', opacity: '1' } },
      { offset: 0.65, props: { transform: 'translateX(-4px) rotate(-3deg)', opacity: '1' } },
      { offset: 1,    props: { transform: 'translateX(0px) rotate(0deg)', opacity: '1' } },
    ],
    easing: 'ease-in-out',
  },
  infinity: {
    keyframes: [
      { offset: 0,     props: { transform: 'translate(-10px, 0px)' } },
      { offset: 0.125, props: { transform: 'translate(-5px, -8px)' } },
      { offset: 0.25,  props: { transform: 'translate(0px, 0px)' } },
      { offset: 0.375, props: { transform: 'translate(-5px, 8px)' } },
      { offset: 0.5,   props: { transform: 'translate(-10px, 0px)' } },
      { offset: 0.625, props: { transform: 'translate(5px, -8px)' } },
      { offset: 0.75,  props: { transform: 'translate(10px, 0px)' } },
      { offset: 0.875, props: { transform: 'translate(5px, 8px)' } },
      { offset: 1,     props: { transform: 'translate(-10px, 0px)' } },
    ],
    easing: 'linear',
  },
  spatial: {
    keyframes: [
      { offset: 0,    props: { transform: 'scale(0.88) rotate(-12deg)', filter: 'blur(2px)', opacity: '0.8' } },
      { offset: 0.40, props: { transform: 'scale(1.1) rotate(10deg)', filter: 'blur(0px)', opacity: '1' } },
      { offset: 0.70, props: { transform: 'scale(0.96) rotate(-4deg)', filter: 'blur(0px)', opacity: '1' } },
      { offset: 1,    props: { transform: 'scale(1) rotate(0deg)', filter: 'blur(0px)', opacity: '1' } },
    ],
    easing: 'ease-in-out',
  },
  pageFlip: {
    keyframes: [
      { offset: 0,    props: { transform: 'skewY(0deg) scaleX(1)', opacity: '1' } },
      { offset: 0.35, props: { transform: 'skewY(-14deg) scaleX(0.72)', opacity: '0.85' } },
      { offset: 0.60, props: { transform: 'skewY(10deg) scaleX(1.04)', opacity: '1' } },
      { offset: 1,    props: { transform: 'skewY(0deg) scaleX(1)', opacity: '1' } },
    ],
    easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
  },
  bookOpen: {
    keyframes: [
      { offset: 0,    props: { transform: 'translateX(-6px) scaleX(0.72)', opacity: '0.65' } },
      { offset: 0.45, props: { transform: 'translateX(0px) scaleX(1.14)', opacity: '1' } },
      { offset: 0.70, props: { transform: 'translateX(0px) scaleX(0.96)', opacity: '1' } },
      { offset: 1,    props: { transform: 'translateX(0px) scaleX(1)', opacity: '1' } },
    ],
    easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
  },
  domino: {
    keyframes: [
      { offset: 0,    props: { transform: 'rotate(0deg) translateY(0px)' } },
      { offset: 0.18, props: { transform: 'rotate(8deg) translateY(1px)' } },
      { offset: 0.36, props: { transform: 'rotate(-6deg) translateY(0px)' } },
      { offset: 0.54, props: { transform: 'rotate(5deg) translateY(1px)' } },
      { offset: 0.72, props: { transform: 'rotate(-3deg) translateY(0px)' } },
      { offset: 1,    props: { transform: 'rotate(0deg) translateY(0px)' } },
    ],
    easing: 'ease-in-out',
  },
  supernova: {
    keyframes: [
      { offset: 0,    props: { transform: 'scale(0.72)', opacity: '0.3', filter: 'blur(3px) drop-shadow(0 0 0px transparent)' } },
      { offset: 0.35, props: { transform: 'scale(0.92)', opacity: '0.8', filter: 'blur(1px) drop-shadow(0 0 8px rgba(255,107,53,0.45))' } },
      { offset: 0.60, props: { transform: 'scale(1.22)', opacity: '1', filter: 'blur(0px) drop-shadow(0 0 14px rgba(255,107,53,0.55))' } },
      { offset: 0.80, props: { transform: 'scale(0.96)', opacity: '1', filter: 'blur(0px) drop-shadow(0 0 5px rgba(255,107,53,0.22))' } },
      { offset: 1,    props: { transform: 'scale(1)', opacity: '1', filter: 'blur(0px) drop-shadow(0 0 0px transparent)' } },
    ],
    easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
  },
  blackHole: {
    keyframes: [
      { offset: 0,    props: { transform: 'scale(1)', opacity: '1', filter: 'blur(0px)' } },
      { offset: 0.45, props: { transform: 'scale(0.35)', opacity: '0.25', filter: 'blur(2px)' } },
      { offset: 0.65, props: { transform: 'scale(0.18)', opacity: '0.1', filter: 'blur(4px)' } },
      { offset: 0.66, props: { transform: 'scale(1.18)', opacity: '0', filter: 'blur(0px)' } },
      { offset: 0.82, props: { transform: 'scale(0.95)', opacity: '1', filter: 'blur(1px)' } },
      { offset: 1,    props: { transform: 'scale(1)', opacity: '1', filter: 'blur(0px)' } },
    ],
    easing: 'ease-in-out',
  },
  fingerprint: {
    keyframes: [
      { offset: 0,    props: { 'clip-path': 'inset(0 0 100% 0)', opacity: '0.3', filter: 'drop-shadow(0 0 0px rgba(45,212,191,0))' } },
      { offset: 0.50, props: { 'clip-path': 'inset(0 0 20% 0)', opacity: '1', filter: 'drop-shadow(0 0 12px rgba(45,212,191,0.55))' } },
      { offset: 0.75, props: { 'clip-path': 'inset(0 0 0% 0)', opacity: '1', filter: 'drop-shadow(0 0 6px rgba(45,212,191,0.28))' } },
      { offset: 1,    props: { 'clip-path': 'inset(0 0 0% 0)', opacity: '1', filter: 'drop-shadow(0 0 0px rgba(45,212,191,0))' } },
    ],
    easing: 'ease-in-out',
  },
  badgeTap: {
    keyframes: [
      { offset: 0,    props: { transform: 'translateX(0px) rotate(0deg) scale(1)', filter: 'drop-shadow(0 0 0px transparent)' } },
      { offset: 0.25, props: { transform: 'translateX(10px) rotate(6deg) scale(1.02)', filter: 'drop-shadow(0 0 8px rgba(74,222,128,0.3))' } },
      { offset: 0.45, props: { transform: 'translateX(14px) rotate(8deg) scale(1.05)', filter: 'drop-shadow(0 0 12px rgba(74,222,128,0.45))' } },
      { offset: 0.62, props: { transform: 'translateX(8px) rotate(4deg) scale(1.02)', filter: 'drop-shadow(0 0 8px rgba(74,222,128,0.28))' } },
      { offset: 0.78, props: { transform: 'translateX(12px) rotate(7deg) scale(1.04)', filter: 'drop-shadow(0 0 10px rgba(74,222,128,0.4))' } },
      { offset: 1,    props: { transform: 'translateX(0px) rotate(0deg) scale(1)', filter: 'drop-shadow(0 0 0px transparent)' } },
    ],
    easing: 'cubic-bezier(0.2, 0.9, 0.2, 1)',
  },

  // ── New Motion presets (NextGen physics-derived) ───────────────
  heartbeat: {
    keyframes: [
      { offset: 0,    props: { transform: 'scale(1)' } },
      { offset: 0.14, props: { transform: 'scale(1.18)' } },
      { offset: 0.28, props: { transform: 'scale(1)' } },
      { offset: 0.42, props: { transform: 'scale(1.12)' } },
      { offset: 0.56, props: { transform: 'scale(1)' } },
      { offset: 1,    props: { transform: 'scale(1)' } },
    ],
    easing: 'ease-in-out',
  },
  rubberband: {
    keyframes: [
      { offset: 0,   props: { transform: 'scale(1)' } },
      { offset: 0.3, props: { transform: 'scale(1.2)' } },
      { offset: 0.5, props: { transform: 'scale(0.9)' } },
      { offset: 0.7, props: { transform: 'scale(1.05)' } },
      { offset: 1,   props: { transform: 'scale(1)' } },
    ],
    easing: 'cubic-bezier(0.68, -0.55, 0.27, 1.55)',
  },
  jelly: {
    keyframes: [
      { offset: 0,    props: { transform: 'scale(1)' } },
      { offset: 0.15, props: { transform: 'scale(0.92)' } },
      { offset: 0.30, props: { transform: 'scale(1.06)' } },
      { offset: 0.45, props: { transform: 'scale(0.96)' } },
      { offset: 0.60, props: { transform: 'scale(1.02)' } },
      { offset: 0.75, props: { transform: 'scale(0.99)' } },
      { offset: 1,    props: { transform: 'scale(1)' } },
    ],
    easing: 'linear',
  },
  ring: {
    keyframes: [
      { offset: 0,   props: { transform: 'rotate(0deg)' } },
      { offset: 0.1, props: { transform: 'rotate(18deg)' } },
      { offset: 0.2, props: { transform: 'rotate(-15deg)' } },
      { offset: 0.3, props: { transform: 'rotate(12deg)' } },
      { offset: 0.4, props: { transform: 'rotate(-9deg)' } },
      { offset: 0.5, props: { transform: 'rotate(5deg)' } },
      { offset: 0.6, props: { transform: 'rotate(-2deg)' } },
      { offset: 0.7, props: { transform: 'rotate(0deg)' } },
      { offset: 1,   props: { transform: 'rotate(0deg)' } },
    ],
    easing: 'ease-out',
  },
  wobble: {
    keyframes: [
      { offset: 0,    props: { transform: 'rotate(0deg) translateX(0px)' } },
      { offset: 0.15, props: { transform: 'rotate(-6deg) translateX(-3px)' } },
      { offset: 0.30, props: { transform: 'rotate(5deg) translateX(2px)' } },
      { offset: 0.45, props: { transform: 'rotate(-3deg) translateX(-1px)' } },
      { offset: 0.60, props: { transform: 'rotate(2deg) translateX(1px)' } },
      { offset: 0.75, props: { transform: 'rotate(-1deg) translateX(0px)' } },
      { offset: 1,    props: { transform: 'rotate(0deg) translateX(0px)' } },
    ],
    easing: 'ease-in-out',
  },
  magnetic: {
    keyframes: [
      { offset: 0,   props: { transform: 'translate(0px, 0px) scale(1)' } },
      { offset: 0.3, props: { transform: 'translate(3px, -3px) scale(1.08)' } },
      { offset: 0.5, props: { transform: 'translate(4px, -4px) scale(1.12)' } },
      { offset: 0.7, props: { transform: 'translate(1px, -1px) scale(1.03)' } },
      { offset: 1,   props: { transform: 'translate(0px, 0px) scale(1)' } },
    ],
    easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  },
  recoil: {
    keyframes: [
      { offset: 0,    props: { transform: 'scale(1) rotate(0deg)' } },
      { offset: 0.15, props: { transform: 'scale(0.85) rotate(-3deg)' } },
      { offset: 0.40, props: { transform: 'scale(1.2) rotate(2deg)' } },
      { offset: 0.60, props: { transform: 'scale(0.97) rotate(-1deg)' } },
      { offset: 0.80, props: { transform: 'scale(1.03) rotate(0deg)' } },
      { offset: 1,    props: { transform: 'scale(1) rotate(0deg)' } },
    ],
    easing: 'ease-out',
  },
  pendulum: {
    keyframes: [
      { offset: 0,    props: { transform: 'rotate(0deg)' } },
      { offset: 0.25, props: { transform: 'rotate(20deg)' } },
      { offset: 0.5,  props: { transform: 'rotate(0deg)' } },
      { offset: 0.75, props: { transform: 'rotate(-20deg)' } },
      { offset: 1,    props: { transform: 'rotate(0deg)' } },
    ],
    easing: 'ease-in-out',
  },
  whiplash: {
    keyframes: [
      { offset: 0,   props: { transform: 'rotate(0deg)' } },
      { offset: 0.2, props: { transform: 'rotate(-12deg)' } },
      { offset: 0.4, props: { transform: 'rotate(8deg)' } },
      { offset: 0.6, props: { transform: 'rotate(-4deg)' } },
      { offset: 0.8, props: { transform: 'rotate(2deg)' } },
      { offset: 1,   props: { transform: 'rotate(0deg)' } },
    ],
    easing: 'cubic-bezier(0.68, -0.55, 0.27, 1.55)',
  },
  tremor: {
    keyframes: [
      { offset: 0,   props: { transform: 'translate(0px, 0px)' } },
      { offset: 0.1, props: { transform: 'translate(-2px, 1px)' } },
      { offset: 0.2, props: { transform: 'translate(1px, -2px)' } },
      { offset: 0.3, props: { transform: 'translate(-1px, 0px)' } },
      { offset: 0.4, props: { transform: 'translate(2px, 1px)' } },
      { offset: 0.5, props: { transform: 'translate(-1px, -1px)' } },
      { offset: 0.6, props: { transform: 'translate(0px, 2px)' } },
      { offset: 0.7, props: { transform: 'translate(1px, -1px)' } },
      { offset: 0.8, props: { transform: 'translate(-2px, 0px)' } },
      { offset: 0.9, props: { transform: 'translate(1px, 1px)' } },
      { offset: 1,   props: { transform: 'translate(0px, 0px)' } },
    ],
    easing: 'linear',
  },
  neonglow: {
    keyframes: [
      { offset: 0,   props: { filter: 'drop-shadow(0 0 1px rgba(34,211,238,0.6))', opacity: '1' } },
      { offset: 0.5, props: { filter: 'drop-shadow(0 0 8px rgba(34,211,238,0.9)) drop-shadow(0 0 16px rgba(34,211,238,0.4))', opacity: '1' } },
      { offset: 1,   props: { filter: 'drop-shadow(0 0 1px rgba(34,211,238,0.6))', opacity: '1' } },
    ],
    easing: 'ease-in-out',
  },
  breathe: {
    keyframes: [
      { offset: 0,   props: { transform: 'scale(1)', opacity: '1' } },
      { offset: 0.5, props: { transform: 'scale(1.06)', opacity: '0.85' } },
      { offset: 1,   props: { transform: 'scale(1)', opacity: '1' } },
    ],
    easing: 'ease-in-out',
  },
  metronome: {
    keyframes: [
      { offset: 0,    props: { transform: 'rotate(0deg)' } },
      { offset: 0.25, props: { transform: 'rotate(15deg)' } },
      { offset: 0.5,  props: { transform: 'rotate(0deg)' } },
      { offset: 0.75, props: { transform: 'rotate(-15deg)' } },
      { offset: 1,    props: { transform: 'rotate(0deg)' } },
    ],
    easing: 'ease-in-out',
  },

  // ── Entrance presets ──────────────────────────────────────────
  fadeIn: {
    keyframes: [
      { offset: 0, props: { opacity: '0' } },
      { offset: 1, props: { opacity: '1' } },
    ],
    easing: 'ease-in-out',
  },
  scaleUp: {
    keyframes: [
      { offset: 0,   props: { transform: 'scale(0)', opacity: '0' } },
      { offset: 0.6, props: { transform: 'scale(1.05)', opacity: '1' } },
      { offset: 1,   props: { transform: 'scale(1)', opacity: '1' } },
    ],
    easing: 'ease-out',
  },
  slideUp: {
    keyframes: [
      { offset: 0, props: { transform: 'translateY(20px)', opacity: '0' } },
      { offset: 1, props: { transform: 'translateY(0px)', opacity: '1' } },
    ],
    easing: 'ease-out',
  },
  springLand: {
    keyframes: [
      { offset: 0,   props: { transform: 'translateY(-20px) scale(0.8)', opacity: '0' } },
      { offset: 0.5, props: { transform: 'translateY(3px) scale(1.05)', opacity: '1' } },
      { offset: 0.7, props: { transform: 'translateY(-2px) scale(0.98)', opacity: '1' } },
      { offset: 1,   props: { transform: 'translateY(0px) scale(1)', opacity: '1' } },
    ],
    easing: 'cubic-bezier(0.68, -0.55, 0.27, 1.55)',
  },
  slingshot: {
    keyframes: [
      { offset: 0,   props: { transform: 'translateX(-30px) scale(0.7)', opacity: '0' } },
      { offset: 0.4, props: { transform: 'translateX(5px) scale(1.1)', opacity: '1' } },
      { offset: 0.6, props: { transform: 'translateX(-2px) scale(0.98)', opacity: '1' } },
      { offset: 1,   props: { transform: 'translateX(0px) scale(1)', opacity: '1' } },
    ],
    easing: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  },
  glitchOn: {
    keyframes: [
      { offset: 0,    props: { transform: 'translateX(0px)', opacity: '0' } },
      { offset: 0.15, props: { transform: 'translateX(-3px)', opacity: '0.6' } },
      { offset: 0.30, props: { transform: 'translateX(2px)', opacity: '0.3' } },
      { offset: 0.45, props: { transform: 'translateX(-1px)', opacity: '0.8' } },
      { offset: 0.60, props: { transform: 'translateX(1px)', opacity: '0.5' } },
      { offset: 0.75, props: { transform: 'translateX(0px)', opacity: '0.9' } },
      { offset: 1,    props: { transform: 'translateX(0px)', opacity: '1' } },
    ],
    easing: 'linear',
  },
  unfold: {
    keyframes: [
      { offset: 0,   props: { transform: 'scale(1) translateY(10px)', opacity: '0' } },
      { offset: 0.6, props: { transform: 'scale(1) translateY(-2px)', opacity: '1' } },
      { offset: 0.8, props: { transform: 'scale(1) translateY(1px)', opacity: '1' } },
      { offset: 1,   props: { transform: 'scale(1) translateY(0px)', opacity: '1' } },
    ],
    easing: 'ease-out',
  },
  warpIn: {
    keyframes: [
      { offset: 0,   props: { transform: 'scale(3) rotate(15deg)', opacity: '0' } },
      { offset: 0.6, props: { transform: 'scale(0.95) rotate(-2deg)', opacity: '1' } },
      { offset: 0.8, props: { transform: 'scale(1.03) rotate(1deg)', opacity: '1' } },
      { offset: 1,   props: { transform: 'scale(1) rotate(0deg)', opacity: '1' } },
    ],
    easing: 'ease-out',
  },

  // ── Exit presets ──────────────────────────────────────────────
  fadeOut: {
    keyframes: [
      { offset: 0, props: { opacity: '1' } },
      { offset: 1, props: { opacity: '0' } },
    ],
    easing: 'ease-in-out',
  },
  scaleDown: {
    keyframes: [
      { offset: 0, props: { transform: 'scale(1)', opacity: '1' } },
      { offset: 1, props: { transform: 'scale(0)', opacity: '0' } },
    ],
    easing: 'ease-in',
  },
  slideOut: {
    keyframes: [
      { offset: 0, props: { transform: 'translateY(0px)', opacity: '1' } },
      { offset: 1, props: { transform: 'translateY(-20px)', opacity: '0' } },
    ],
    easing: 'ease-in',
  },
  vortex: {
    keyframes: [
      { offset: 0, props: { transform: 'scale(1) rotate(0deg)', opacity: '1' } },
      { offset: 1, props: { transform: 'scale(0) rotate(540deg)', opacity: '0' } },
    ],
    easing: 'ease-in',
  },
  glitchOff: {
    keyframes: [
      { offset: 0,   props: { transform: 'translateX(0px)', opacity: '1' } },
      { offset: 0.2, props: { transform: 'translateX(2px)', opacity: '0.8' } },
      { offset: 0.4, props: { transform: 'translateX(-3px)', opacity: '0.5' } },
      { offset: 0.6, props: { transform: 'translateX(1px)', opacity: '0.3' } },
      { offset: 0.8, props: { transform: 'translateX(-1px)', opacity: '0.15' } },
      { offset: 1,   props: { transform: 'translateX(0px)', opacity: '0' } },
    ],
    easing: 'linear',
  },
  dissolve: {
    keyframes: [
      { offset: 0, props: { transform: 'scale(1)', opacity: '1' } },
      { offset: 1, props: { transform: 'scale(1.3)', opacity: '0' } },
    ],
    easing: 'ease-in',
  },

  // ── Phase 2: Additional Motion presets ─────────────────────────
  orbit: {
    keyframes: [
      { offset: 0,    props: { transform: 'translate(3px, 0px)' } },
      { offset: 0.25, props: { transform: 'translate(0px, 3px)' } },
      { offset: 0.5,  props: { transform: 'translate(-3px, 0px)' } },
      { offset: 0.75, props: { transform: 'translate(0px, -3px)' } },
      { offset: 1,    props: { transform: 'translate(3px, 0px)' } },
    ],
    easing: 'linear',
  },
  flicker: {
    keyframes: [
      { offset: 0,    props: { opacity: '1' } },
      { offset: 0.15, props: { opacity: '0.4' } },
      { offset: 0.3,  props: { opacity: '1' } },
      { offset: 0.5,  props: { opacity: '0.2' } },
      { offset: 0.7,  props: { opacity: '0.8' } },
      { offset: 0.85, props: { opacity: '0.3' } },
      { offset: 1,    props: { opacity: '1' } },
    ],
    easing: 'linear',
  },
  squish: {
    keyframes: [
      { offset: 0,    props: { transform: 'scale(1)' } },
      { offset: 0.25, props: { transform: 'scale(1.15)' } },
      { offset: 0.5,  props: { transform: 'scale(1)' } },
      { offset: 0.75, props: { transform: 'scale(0.85)' } },
      { offset: 1,    props: { transform: 'scale(1)' } },
    ],
    easing: 'ease-in-out',
  },
  glide: {
    keyframes: [
      { offset: 0,    props: { transform: 'translateX(0px) rotate(0deg)' } },
      { offset: 0.25, props: { transform: 'translateX(4px) rotate(2deg)' } },
      { offset: 0.5,  props: { transform: 'translateX(0px) rotate(0deg)' } },
      { offset: 0.75, props: { transform: 'translateX(-4px) rotate(-2deg)' } },
      { offset: 1,    props: { transform: 'translateX(0px) rotate(0deg)' } },
    ],
    easing: 'ease-in-out',
  },
  radar: {
    keyframes: [
      { offset: 0,    props: { transform: 'scale(0.96)', opacity: '0.92', filter: 'drop-shadow(0 0 0px transparent)' } },
      { offset: 0.35, props: { transform: 'scale(1.08)', opacity: '1', filter: 'drop-shadow(0 0 8px rgba(45,212,191,0.45))' } },
      { offset: 0.70, props: { transform: 'scale(1.14)', opacity: '0.78', filter: 'drop-shadow(0 0 14px rgba(45,212,191,0.12))' } },
      { offset: 1,    props: { transform: 'scale(0.96)', opacity: '0.92', filter: 'drop-shadow(0 0 0px transparent)' } },
    ],
    easing: 'ease-in-out',
  },
  beacon: {
    keyframes: [
      { offset: 0,    props: { transform: 'scale(1)', opacity: '1', filter: 'drop-shadow(0 0 0px transparent)' } },
      { offset: 0.12, props: { transform: 'scale(1.06)', opacity: '1', filter: 'drop-shadow(0 0 8px rgba(255,107,53,0.38))' } },
      { offset: 0.22, props: { transform: 'scale(1)', opacity: '0.55', filter: 'drop-shadow(0 0 0px transparent)' } },
      { offset: 0.34, props: { transform: 'scale(1.04)', opacity: '1', filter: 'drop-shadow(0 0 6px rgba(255,107,53,0.32))' } },
      { offset: 0.46, props: { transform: 'scale(1)', opacity: '0.55', filter: 'drop-shadow(0 0 0px transparent)' } },
      { offset: 0.60, props: { transform: 'scale(1.08)', opacity: '1', filter: 'drop-shadow(0 0 10px rgba(255,107,53,0.45))' } },
      { offset: 1,    props: { transform: 'scale(1)', opacity: '1', filter: 'drop-shadow(0 0 0px transparent)' } },
    ],
    easing: 'ease-in-out',
  },

  // ── Phase 2: Additional Entrance presets ──────────────────────
  slideRight: {
    keyframes: [
      { offset: 0, props: { transform: 'translateX(-20px)', opacity: '0' } },
      { offset: 1, props: { transform: 'translateX(0px)', opacity: '1' } },
    ],
    easing: 'ease-out',
  },
  slideDown: {
    keyframes: [
      { offset: 0, props: { transform: 'translateY(-20px)', opacity: '0' } },
      { offset: 1, props: { transform: 'translateY(0px)', opacity: '1' } },
    ],
    easing: 'ease-out',
  },
  flipIn: {
    keyframes: [
      { offset: 0,   props: { transform: 'rotate(90deg)', opacity: '0' } },
      { offset: 0.6, props: { transform: 'rotate(-5deg)', opacity: '1' } },
      { offset: 0.8, props: { transform: 'rotate(2deg)', opacity: '1' } },
      { offset: 1,   props: { transform: 'rotate(0deg)', opacity: '1' } },
    ],
    easing: 'ease-out',
  },
  telegram: {
    keyframes: [
      { offset: 0,   props: { transform: 'translate(-30px, 15px) rotate(-25deg)', opacity: '0' } },
      { offset: 0.5, props: { transform: 'translate(3px, -2px) rotate(3deg)', opacity: '1' } },
      { offset: 0.7, props: { transform: 'translate(-1px, 1px) rotate(-1deg)', opacity: '1' } },
      { offset: 1,   props: { transform: 'translate(0px, 0px) rotate(0deg)', opacity: '1' } },
    ],
    easing: 'ease-out',
  },
  bloom: {
    keyframes: [
      { offset: 0,   props: { transform: 'scale(0) rotate(-90deg)', opacity: '0' } },
      { offset: 0.5, props: { transform: 'scale(1.1) rotate(10deg)', opacity: '1' } },
      { offset: 0.7, props: { transform: 'scale(0.95) rotate(-3deg)', opacity: '1' } },
      { offset: 1,   props: { transform: 'scale(1) rotate(0deg)', opacity: '1' } },
    ],
    easing: 'ease-out',
  },
  shockwave: {
    keyframes: [
      { offset: 0,   props: { transform: 'scale(0.3)', opacity: '0' } },
      { offset: 0.3, props: { transform: 'scale(1.25)', opacity: '1' } },
      { offset: 0.5, props: { transform: 'scale(0.92)', opacity: '1' } },
      { offset: 0.7, props: { transform: 'scale(1.05)', opacity: '1' } },
      { offset: 1,   props: { transform: 'scale(1)', opacity: '1' } },
    ],
    easing: 'ease-out',
  },

  // ── Phase 2: Additional Exit presets ──────────────────────────
  popOut: {
    keyframes: [
      { offset: 0,   props: { transform: 'scale(1)', opacity: '1' } },
      { offset: 0.3, props: { transform: 'scale(1.15)', opacity: '1' } },
      { offset: 1,   props: { transform: 'scale(0)', opacity: '0' } },
    ],
    easing: 'cubic-bezier(0.55, 0.06, 0.68, 0.19)',
  },
  slideLeft: {
    keyframes: [
      { offset: 0, props: { transform: 'translateX(0px)', opacity: '1' } },
      { offset: 1, props: { transform: 'translateX(-20px)', opacity: '0' } },
    ],
    easing: 'ease-in',
  },
  sinkDown: {
    keyframes: [
      { offset: 0,   props: { transform: 'translateY(0px) scale(1)', opacity: '1' } },
      { offset: 0.6, props: { transform: 'translateY(4px) scale(0.9)', opacity: '0.7' } },
      { offset: 1,   props: { transform: 'translateY(15px) scale(0.6)', opacity: '0' } },
    ],
    easing: 'ease-in',
  },
  flipOut: {
    keyframes: [
      { offset: 0,   props: { transform: 'rotate(0deg)', opacity: '1' } },
      { offset: 0.3, props: { transform: 'rotate(-5deg)', opacity: '1' } },
      { offset: 1,   props: { transform: 'rotate(90deg)', opacity: '0' } },
    ],
    easing: 'ease-in',
  },
  implode: {
    keyframes: [
      { offset: 0,   props: { transform: 'scale(1)', opacity: '1' } },
      { offset: 0.3, props: { transform: 'scale(1.1)', opacity: '1' } },
      { offset: 1,   props: { transform: 'scale(0)', opacity: '0' } },
    ],
    easing: 'ease-in',
  },
  puffOut: {
    keyframes: [
      { offset: 0,   props: { transform: 'scale(1)', opacity: '1' } },
      { offset: 0.5, props: { transform: 'scale(1.15)', opacity: '0.6' } },
      { offset: 1,   props: { transform: 'scale(1.5)', opacity: '0' } },
    ],
    easing: 'ease-out',
  },
  launchOut: {
    keyframes: [
      { offset: 0, props: { transform: 'translate(0px, 0px) rotate(0deg)', opacity: '1' } },
      { offset: 1, props: { transform: 'translate(30px, -15px) rotate(25deg)', opacity: '0' } },
    ],
    easing: 'ease-in',
  },
  shrinkSpin: {
    keyframes: [
      { offset: 0, props: { transform: 'scale(1) rotate(0deg)', opacity: '1' } },
      { offset: 1, props: { transform: 'scale(0) rotate(360deg)', opacity: '0' } },
    ],
    easing: 'ease-in',
  },
  blinkOut: {
    keyframes: [
      { offset: 0,    props: { opacity: '1' } },
      { offset: 0.15, props: { opacity: '0.3' } },
      { offset: 0.3,  props: { opacity: '0.8' } },
      { offset: 0.45, props: { opacity: '0.1' } },
      { offset: 0.6,  props: { opacity: '0.6' } },
      { offset: 0.75, props: { opacity: '0.15' } },
      { offset: 1,    props: { opacity: '0' } },
    ],
    easing: 'linear',
  },
};

const GROUP_ORDER_PRESET_IDS = MOTION_LAB_PRESET_GROUPS.flatMap((group) => group.items.map((item) => item.preset));
const UNGROUPED_PRESET_IDS = Object.keys(MOTION_LAB_PRESETS).filter((presetId) => !GROUP_ORDER_PRESET_IDS.includes(presetId));

export const MOTION_LAB_PRESET_IDS = Object.freeze([
  ...GROUP_ORDER_PRESET_IDS,
  ...UNGROUPED_PRESET_IDS,
]);

function humanizePresetId(presetId) {
  return presetId
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

const GROUP_BY_PRESET = Object.freeze(Object.fromEntries(
  MOTION_LAB_PRESET_GROUPS.flatMap((group) => group.items.map((item) => [item.preset, {
    groupKey: group.key,
    groupLabel: group.label,
    icon: item.icon,
    label: item.label,
  }]))
));

export const MOTION_LAB_PRESET_METADATA = Object.freeze(Object.fromEntries(
  MOTION_LAB_PRESET_IDS.map((presetId) => {
    const groupMeta = GROUP_BY_PRESET[presetId] || null;
    const label = groupMeta?.label || humanizePresetId(presetId);
    const group = groupMeta?.groupLabel || 'Motion';
    const groupKey = groupMeta?.groupKey || 'motion';
    return [presetId, {
      id: presetId,
      label,
      group,
      groupKey,
      icon: groupMeta?.icon || 'animation',
      description: DESCRIPTION_OVERRIDES[presetId] || `${label} Motion Lab preset.`,
    }];
  })
));

export function getMotionLabPresetMeta(presetId) {
  return MOTION_LAB_PRESET_METADATA[presetId] || null;
}

export function listMotionLabPresetMeta() {
  return MOTION_LAB_PRESET_IDS.map((presetId) => MOTION_LAB_PRESET_METADATA[presetId]);
}
