"use strict";

import crypto from "crypto";

let id = null;

export const genId = () => {
  if (!id) {
    id = crypto.randomBytes(20);
    Buffer.from("-EGO001-").copy(id, 0);
  }
  return id;
};
