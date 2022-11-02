/**
 * Copyright (C) 2022 voxelhost
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import sqlite from "sqlite3";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS customers (
  discordId TEXT PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS suggestions (
  messageId    TEXT PRIMARY KEY,
  status       TEXT CHECK(status IN ('REJECTED', 'PENDING', 'APPROVED', 'DONE')),
  authorName   TEXT,
  authorAvatar TEXT,
  timestamp    INTEGER,
  content      TEXT
);`;

export class Database {
  db: sqlite.Database;

  constructor(path: string) {
    this.db = new sqlite.Database(path);
    this.exec(SCHEMA);
  }

  async exec(sql: string) {
    return new Promise((resolve, reject) => {
      this.db.exec(sql, error => {
        if (error) {
          reject(error);
        } else {
          resolve(null);
        }
      });
    });
  }

  async run(sql: string, params?: any) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, error => {
        if (error) {
          reject(error);
        } else {
          resolve(null);
        }
      });
    });
  }

  async get(sql: string, params?: any) {
    return new Promise<any>((resolve, reject) => {
      this.db.get(sql, params, (error, row) => {
        if (error) {
          reject(error);
        } else {
          resolve(row);
        }
      });
    });
  }
}
