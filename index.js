"use strict";

import download from "./download.js";
import { open } from "./torrent-parser.js";
import path from "path";

// Get the current directory in ES Module
const __dirname = path.dirname(new URL(import.meta.url).pathname);

const torrentPath = process.argv[2];
if (!torrentPath) {
  console.log("Please provide a .torrent file path");
  process.exit(1);
}

let torrent;
try {
  torrent = open(torrentPath);
  //   console.log("Torrent file loaded:", torrent);
} catch (err) {
  console.error("Error loading torrent file:", err);
  process.exit(1);
}

try {
  download(torrent, path.join(__dirname, "downloaded_file"));
} catch (err) {
  console.error("Error calling download:", err);
}
