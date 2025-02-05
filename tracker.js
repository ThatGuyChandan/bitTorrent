"use strict";
import { TextDecoder } from "util";
import dgram from "dgram";
import { Buffer } from "buffer";
import { URL } from "url";
import crypto from "crypto";
import { infoHash, size } from "./torrent-parser.js";
import { genId } from "./utils.js";

export const getPeers = (torrent, callback) => {
  console.log("Fetching peers...");
  const socket = dgram.createSocket("udp4");

  const trackerUrls = [
    "udp://tracker.opentrackr.org:1337/announce",
    "udp://tracker.openbittorrent.com:80",
    "udp://tracker.coppersurfer.tk:6969",
    "udp://tracker.internetwarriors.net:1337/announce",
    "udp://exodus.desync.com:6969/announce",
    "udp://tracker.leechers-paradise.org:6969/announce",
    "udp://tracker.pirateparty.gr:6969/announce",
  ];

  // Loop through each tracker URL
  let urlIndex = 0;
  const tryNextTracker = () => {
    if (urlIndex >= trackerUrls.length) {
      console.error("No peers found from any tracker.");
      return;
    }

    let url = trackerUrls[urlIndex];
    urlIndex++;

    // Convert Uint8Array to string (URL)
    if (url instanceof Uint8Array) {
      const decoder = new TextDecoder("utf-8");
      url = decoder.decode(url);
    }

    console.log("Torrent Announce URL:", url);

    let parsedUrl;
    try {
      parsedUrl = new URL(url);
      console.log(
        `Parsed URL: ${parsedUrl.hostname}:${parsedUrl.port || 6969}`
      );
    } catch (error) {
      console.error("Error parsing URL:", error);
      tryNextTracker();
      return;
    }

    const host = parsedUrl.hostname;
    const port = parsedUrl.port ? parseInt(parsedUrl.port, 10) : 6969;

    console.log(`Using host: ${host} and port: ${port}`);

    // Send connect request to the current tracker
    console.log("Sending connect request...");
    udpSend(socket, buildConnReq(), { host, port });

    socket.on("message", (response) => {
      console.log("Received raw response:", response.toString("hex")); // Debugging line
      console.log("Received response...");
      if (respType(response) === "connect") {
        const connResp = parseConnResp(response);
        console.log(
          "Connection successful. Connection ID:",
          connResp.connectionId.toString("hex")
        );
        console.log("Sending announce request...");
        const announceReq = buildAnnounceReq(connResp.connectionId, torrent);
        udpSend(socket, announceReq, { host, port });
      } else if (respType(response) === "announce") {
        const announceResp = parseAnnounceResp(response);
        console.log(
          `Leechers: ${announceResp.leechers}, Seeders: ${announceResp.seeders}`
        );
        console.log("Peers found:", announceResp.peers);
        if (announceResp.peers.length > 0) {
          callback(announceResp.peers);
        } else {
          tryNextTracker();
        }
      } else {
        console.error("Unknown response type.");
        tryNextTracker();
      }
    });

    socket.on("error", (err) => {
      console.error("Socket error: ", err);
      tryNextTracker();
    });
  };

  // Start the process
  tryNextTracker();
};

// Function to send UDP messages
function udpSend(socket, message, { host, port }, callback = () => {}) {
  if (port <= 0 || port >= 65536) {
    console.error("Invalid port:", port);
    return;
  }

  console.log(`Sending message to ${host}:${port}`);
  socket.send(message, 0, message.length, port, host, callback);
}

function respType(resp) {
  const action = resp.readUInt32BE(0);
  console.log("Response Action Code:", action);
  if (action === 0) return "connect";
  if (action === 1) return "announce";
}

// Build a proper connection request (64-bit protocol ID)
function buildConnReq() {
  console.log("Building connection request...");
  const buf = Buffer.alloc(16);

  // Proper connection ID for UDP tracker
  buf.writeUInt32BE(0x417, 0); // Magic constant (first part)
  buf.writeUInt32BE(0x27101980, 4); // Magic constant (second part)

  // Action: connect (0)
  buf.writeUInt32BE(0, 8);

  // Generate a random transaction ID
  const transactionId = crypto.randomBytes(4);
  transactionId.copy(buf, 12);

  console.log("Connection request built.");
  return buf;
}

function parseConnResp(resp) {
  console.log("Parsing connection response...");
  return {
    action: resp.readUInt32BE(0),
    transactionId: resp.readUInt32BE(4),
    connectionId: resp.slice(8),
  };
}

function buildAnnounceReq(connId, torrent, port = 6881) {
  console.log("Building announce request...");
  const buf = Buffer.allocUnsafe(98);

  connId.copy(buf, 0);
  buf.writeUInt32BE(1, 8); // Action code for announce

  crypto.randomBytes(4).copy(buf, 12); // Random transaction ID
  infoHash(torrent).copy(buf, 16); // Info hash
  genId().copy(buf, 36); // Peer ID

  Buffer.alloc(8).copy(buf, 56); // Downloaded size
  size(torrent).copy(buf, 64); // Total size of the torrent
  Buffer.alloc(8).copy(buf, 72); // Uploaded size

  buf.writeUInt32BE(0, 80); // Left bytes
  buf.writeUInt32BE(0, 84); // Downloaded bytes

  crypto.randomBytes(4).copy(buf, 88); // Random peer ID
  buf.writeInt32BE(-1, 92); // Event: -1 (none)
  buf.writeUInt16BE(port, 96); // Listening port

  console.log("Announce request built.");
  return buf;
}

function parseAnnounceResp(resp) {
  console.log("Parsing announce response...");
  function group(iterable, groupSize) {
    let groups = [];
    for (let i = 0; i < iterable.length; i += groupSize) {
      groups.push(iterable.slice(i, i + groupSize));
    }
    return groups;
  }

  const peers = group(resp.slice(20), 6).map((address) => {
    return {
      ip: address.slice(0, 4).join("."), // Convert IP from bytes
      port: address.readUInt16BE(4), // Read port
    };
  });

  console.log("Parsed peers:", peers);
  return {
    action: resp.readUInt32BE(0),
    transactionId: resp.readUInt32BE(4),
    leechers: resp.readUInt32BE(8),
    seeders: resp.readUInt32BE(12),
    peers,
  };
}
