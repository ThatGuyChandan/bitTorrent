"use strict";

import net from "net";
import { Buffer } from "buffer";
import { getPeers } from "./tracker.js";
import {
  buildHandshake,
  buildInterested,
  parse,
  buildRequest,
} from "./message.js";
import Pieces from "./pieces.js";
import Queue from "./queue.js";
import fs from "fs";

export default (torrent, path) => {
  console.log("Downloading started...");

  getPeers(torrent, (peers) => {
    console.log("Found peers:", peers);
    if (!peers.length) {
      console.error("No peers found. Exiting.");
      return;
    }
    const pieces = new Pieces(torrent);
    const file = fs.openSync(path, "w");

    peers.forEach((peer) => {
      console.log(`Attempting to connect to peer: ${peer.ip}:${peer.port}`);
      download(peer, torrent, pieces, file);
    });

    console.log("Download initiated...");
  });
};

async function download(peer, torrent, pieces, file) {
  const socket = new net.Socket();
  socket.on("error", (err) => {
    console.error(`Error with peer ${peer.ip}:${peer.port}:`, err);
    socket.destroy();
  });

  socket.connect(peer.port, peer.ip, () => {
    console.log(`Connected to peer: ${peer.ip}:${peer.port}`);
    socket.write(buildHandshake(torrent));
    console.log("Handshake sent.");
  });

  const queue = new Queue(torrent);
  onWholeMsg(socket, (msg) => msgHandler(msg, socket, pieces, queue, file));
}

function msgHandler(msg, socket, pieces, queue, file) {
  console.log("Message received from peer.");
  if (isHandshake(msg)) {
    console.log("Received handshake");
    socket.write(buildInterested());
    console.log("Interested message sent.");
  } else {
    const m = parse(msg);
    console.log("Parsed message ID:", m.id);
    if (m.id === 0) chokeHandler(socket);
    if (m.id === 1) unchokeHandler(socket, pieces, queue);
    if (m.id === 4) haveHandler(socket, pieces, queue, m.payload);
    if (m.id === 5) bitfieldHandler(socket, pieces, queue, m.payload);
    if (m.id === 7)
      pieceHandler(socket, pieces, queue, torrent, file, m.payload);
  }
}

function chokeHandler(socket) {
  console.log("Peer has choked us, disconnecting...");
  socket.end();
}

function unchokeHandler(socket, pieces, queue) {
  console.log("Peer has unchoked, requesting pieces...");
  queue.choked = false;
  requestPiece(socket, pieces, queue);
}

function haveHandler(socket, pieces, queue, payload) {
  const pieceIndex = payload.readUInt32BE(0);
  console.log(`Peer has piece: ${pieceIndex}`);
  queue.queue(pieceIndex);
  if (queue.length === 0) requestPiece(socket, pieces, queue);
}

function bitfieldHandler(socket, pieces, queue, payload) {
  console.log("Received bitfield");
  const queueEmpty = queue.length === 0;
  payload.forEach((byte, i) => {
    for (let j = 0; j < 8; j++) {
      if (byte % 2) queue.queue(i * 8 + 7 - j);
      byte = Math.floor(byte / 2);
    }
  });
  if (queueEmpty) requestPiece(socket, pieces, queue);
}

function pieceHandler(socket, pieces, queue, torrent, file, pieceResp) {
  console.log("Received piece index:", pieceResp.index);
  pieces.addReceived(pieceResp);

  const offset =
    pieceResp.index * torrent.info["piece length"] + pieceResp.begin;
  console.log(`Writing piece ${pieceResp.index} to file at offset ${offset}`);
  fs.write(file, pieceResp.block, 0, pieceResp.block.length, offset, (err) => {
    if (err) console.error("Error writing to file:", err);
  });

  if (pieces.isDone()) {
    console.log("Download complete!");
    socket.end();
    try {
      fs.closeSync(file);
    } catch (e) {
      console.error("Error closing file:", e);
    }
  } else {
    requestPiece(socket, pieces, queue);
  }
}

function requestPiece(socket, pieces, queue) {
  if (queue.choked) {
    console.log("Cannot request piece, peer is choking.");
    return;
  }

  while (queue.length()) {
    const pieceBlock = queue.deque();
    if (pieces.needed(pieceBlock)) {
      console.log("Requesting piece:", pieceBlock.index);
      socket.write(buildRequest(pieceBlock));
      pieces.addRequested(pieceBlock);
      break;
    }
  }
}

function isHandshake(msg) {
  return (
    msg.length === msg.readUInt8(0) + 49 &&
    msg.toString("utf8", 1) === "BitTorrent protocol"
  );
}

function onWholeMsg(socket, callback) {
  let savedBuf = Buffer.alloc(0);
  let handshake = true;

  socket.on("data", (recvBuf) => {
    console.log("Received data from peer");
    const msgLen = () =>
      handshake ? savedBuf.readUInt8(0) + 49 : savedBuf.readInt32BE(0) + 4;
    savedBuf = Buffer.concat([savedBuf, recvBuf]);

    while (savedBuf.length >= 4 && savedBuf.length >= msgLen()) {
      callback(savedBuf.slice(0, msgLen()));
      savedBuf = savedBuf.slice(msgLen());
      handshake = false;
    }
  });
}
