"use strict";

import fs from "fs";
import bencode from "bencode";
import crypto from "crypto";
import bigInt from "big-integer";

export const open = (filepath) => {
  return bencode.decode(fs.readFileSync(filepath));
};

export const size = (torrent) => {
  const size = torrent.info.files
    ? torrent.info.files.map((file) => file.length).reduce((a, b) => a + b)
    : torrent.info.length;

  // Convert the size to an 8-byte buffer using bigInt
  const sizeBigInt = bigInt(size);
  const sizeBuffer = Buffer.alloc(8);
  sizeBigInt
    .toArray(256) // Convert bigInt to a byte array
    .value.reverse() // Reverse the byte array to match little-endian format
    .forEach((byte, index) => {
      sizeBuffer[7 - index] = byte; // Fill the buffer from the end
    });

  return sizeBuffer;
};

export const infoHash = (torrent) => {
  const info = bencode.encode(torrent.info);
  return crypto.createHash("sha1").update(info).digest();
};
