import { defineManifest } from "@crxjs/vite-plugin";
import pkg from "./package.json";

export default defineManifest({
  manifest_version: 3,
  name: "Tower of Babel - Learn while browsing",
  version: pkg.version,
  icons: {
    48: "public/logo.png",
  },
  action: {
    default_icon: {
      48: "public/logo.png",
    },
    default_popup: "src/popup/index.html",
  },
  permissions: [
    "sidePanel",
    "contentSettings",
    "storage",
    "activeTab",
    "audioCapture",
  ],
  background: {
    service_worker: "src/background/service-worker.ts",
    type: "module",
  },
  content_scripts: [
    {
      js: ["src/content/main.tsx"],
      matches: ["https://*/*"],
    },
  ],
  side_panel: {
    default_path: "src/sidepanel/index.html",
  },
  web_accessible_resources: [
    {
      resources: [
        "public/Logo.png",
        "src/permission/index.html",
        "src/permission/requestPermission.ts",
      ],
      matches: ["<all_urls>"],
    },
  ],
});
