# Torrent Client Project

This is a simple, custom-built torrent client that interacts with the BitTorrent protocol to download files via peer-to-peer (P2P) networking. It connects to a tracker, communicates with peers, and downloads torrent pieces. All this is done using **Node.js** and **UDP** protocol.

## Features

- Fetches peers from a torrent tracker.
- Establishes connections with peers using the BitTorrent handshake.
- Handles basic BitTorrent protocol messages (e.g., choke/unchoke, piece requests).
- Downloads pieces of a torrent and writes them to disk.
- Retries failed connections and handles timeouts for a more stable download.

## Technologies Used

- **Node.js**: The main framework for handling the backend logic.
- **UDP**: Used for communication with the tracker and peers.
- **BitTorrent Protocol**: Implemented the core functionality of BitTorrent's P2P protocol.
- **Filesystem (fs)**: To save the downloaded files to your local machine.

## Getting Started

To run this project locally, follow these steps:

### 1. Clone the repository
First, clone this repo to your local machine:
```bash
git clone https://github.com/yourusername/torrent-client.git
cd torrent-client
```
### 2. Install dependencies
```bash
npm install
```
### 3. Run the program
To start downloading a torrent, use the following command:
```bash
node index.js path_to_your_torrent_file.torrent
```
### Future Improvements
1.Add a web interface for easy interaction (e.g., start/stop downloads, see progress).
2.Implement file prioritization and better error handling for peer connections.
3.Add multiple tracker support to increase the number of available peers.
