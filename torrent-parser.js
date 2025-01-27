"use strict";

import fs from "fs";
import bencode from "bencode";
import crypto from "crypto";
import bigInt from "big-integer";

export const open = (filepath) => {
  console.log(`Reading torrent file: ${filepath}`);
  return bencode.decode(fs.readFileSync(filepath));
};

export const size = (torrent) => {
  const size = torrent.info.files
    ? torrent.info.files.map((file) => file.length).reduce((a, b) => a + b)
    : torrent.info.length;

  // Convert the size to an 8-byte buffer using bigInt
  const sizeBigInt = bigInt(size);
  const sizeBuffer = Buffer.alloc(8);
  const sizeArray = sizeBigInt.toArray(256).value.reverse(); // Convert and reverse for little-endian
  sizeArray.forEach((byte, index) => {
    sizeBuffer[7 - index] = byte; // Fill the buffer
  });

  return sizeBuffer;
};

export const infoHash = (torrent) => {
  const info = bencode.encode(torrent.info);
  return crypto.createHash("sha1").update(info).digest();
};

export const BLOCK_LEN = Math.pow(2, 14);

export const pieceLen = (torrent, pieceIndex) => {
  const totalLength = bigInt.fromArray(size(torrent), 256).toJSNumber(); // Convert buffer back to number
  const pieceLength = torrent.info["piece length"];

  const lastPieceLength = totalLength % pieceLength;
  const lastPieceIndex = Math.floor(totalLength / pieceLength);

  return lastPieceIndex === pieceIndex ? lastPieceLength : pieceLength;
};

export const blocksPerPiece = (torrent, pieceIndex) => {
  const pieceLength = pieceLen(torrent, pieceIndex);
  return Math.ceil(pieceLength / BLOCK_LEN);
};

export const blockLen = (torrent, pieceIndex, blockIndex) => {
  const pieceLength = pieceLen(torrent, pieceIndex);

  const lastBlockLength = pieceLength % BLOCK_LEN;
  const lastBlockIndex = Math.floor(pieceLength / BLOCK_LEN);

  return blockIndex === lastBlockIndex ? lastBlockLength : BLOCK_LEN;
};
