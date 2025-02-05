"use strict";

import download from "./download.js";
import { open } from "./torrent-parser.js";
import path from "path";

const __dirname = path.dirname(new URL(import.meta.url).pathname);

const torrentPath = process.argv[2];
if (!torrentPath) {
  console.log("Please provide a .torrent file path");
  process.exit(1);
}

let torrent;
try {
  torrent = open(torrentPath);
  console.log("Torrent file loaded");
} catch (err) {
  console.error("Error loading torrent file:", err);
  process.exit(1);
}

const outputPath = path.join(__dirname, "downloaded_file");

try {
  download(torrent, outputPath);
} catch (err) {
  console.error("Error calling download:", err);
}
