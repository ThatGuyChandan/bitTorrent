"use strict";

import fs from "fs";
import bencode from "bencode";
import crypto from "crypto";
import bigInt from "big-integer";

export const open = (filepath) => {
  try {
    console.log(`Reading torrent file: ${filepath}`);
    const data = fs.readFileSync(filepath);
    return bencode.decode(data);
  } catch (error) {
    console.error("Error reading torrent file:", error);
    return null;
  }
};

export const size = (torrent) => {
  if (!torrent || !torrent.info) {
    throw new Error("Invalid torrent structure");
  }

  const totalSize = torrent.info.files
    ? torrent.info.files.reduce((acc, file) => acc + (file.length || 0), 0)
    : torrent.info.length || 0;

  if (totalSize === 0) {
    throw new Error("Torrent size is zero or undefined");
  }

  const sizeBigInt = bigInt(totalSize);
  const sizeBuffer = Buffer.alloc(8);
  const sizeArray = sizeBigInt.toArray(256).value.reverse();
  sizeArray.forEach((byte, index) => {
    sizeBuffer[7 - index] = byte;
  });

  return sizeBuffer;
};

export const infoHash = (torrent) => {
  if (!torrent || !torrent.info) {
    throw new Error("Invalid torrent structure: Missing 'info' key");
  }

  const info = bencode.encode(torrent.info);
  return crypto.createHash("sha1").update(info).digest();
};

export const BLOCK_LEN = 16 * 1024; // 16KB (2^14)

export const pieceLen = (torrent, pieceIndex) => {
  const sizeBuffer = size(torrent); // Returns Buffer
  const totalLength = bigInt(Buffer.from(sizeBuffer).toString("hex"), 16); // Correct conversion
  const pieceLength = torrent.info["piece length"];

  if (!pieceLength) {
    throw new Error("Invalid torrent file: Missing 'piece length'");
  }

  const lastPieceLength = totalLength.mod(pieceLength).toJSNumber();
  const lastPieceIndex = totalLength.divide(pieceLength).toJSNumber();

  return lastPieceIndex === pieceIndex ? lastPieceLength : pieceLength;
};

export const blocksPerPiece = (torrent, pieceIndex) => {
  return Math.ceil(pieceLen(torrent, pieceIndex) / BLOCK_LEN);
};

export const blockLen = (torrent, pieceIndex, blockIndex) => {
  const pieceLength = pieceLen(torrent, pieceIndex);
  const lastBlockLength = pieceLength % BLOCK_LEN;
  const lastBlockIndex = Math.floor(pieceLength / BLOCK_LEN);

  return blockIndex === lastBlockIndex
    ? lastBlockLength || BLOCK_LEN
    : BLOCK_LEN;
};
