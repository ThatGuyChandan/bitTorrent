"use strict";

export default class {
  constructor(size) {
    this.requested = new Array(size).fill(false);
    this.received = new Array(size).fill(false);
  }

  addRequested(pieceIndex) {
    this.requested[pieceIndex] = true;
  }

  addReceived(pieceIndex) {
    this.received[pieceIndex] = true;
  }

  needed(pieceIndex) {
    if (this.requested.every((i) => i === true)) {
      // use slice method to return a copy of an array
      this.requested = this.received.slice();
    }
    return !this.requested[pieceIndex];
  }

  isDone() {
    return this.received.every((i) => i === true);
  }
}
