"use strict";

import { download } from "./download.js";
import { open } from "./torrent-parser.js";

const torrent = open(process.argv[2]);

download(torrent);
