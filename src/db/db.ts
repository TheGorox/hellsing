import sqlite3 from 'sqlite3'
import { open, Database } from 'sqlite'
import log4js from 'log4js';

import path from 'path';

const logger = log4js.getLogger('db');
logger.level = process.env.LOG_LEVEL || 'info';

const __dirname = import.meta.dirname;


export async function openDatabase(path: string) {
    const db = await open({
        filename: path,
        driver: sqlite3.cached.Database
    });

    return db;
}

let _db: Database;

export async function getDB() {
    if (!_db) {
        _db = await openDatabase(path.join(__dirname, '../../data/db.sql'));
    }
    return _db;
}

export async function initDB() {
    const db = await getDB();
    await db.exec(`
        CREATE TABLE IF NOT EXISTS sessions (
            uid INTEGER PRIMARY KEY,
            session TEXT NOT NULL,
            custom_data TEXT NOT NULL
        );
    `);
    await db.exec(`
        CREATE TABLE IF NOT EXISTS botUsers (
            telegram_id INTEGER PRIMARY KEY,
            bitrix_uid INTEGER,
            bitrix_wh_url TEXT,
            hws_uid INTEGER,
            bot_config TEXT
        );
    `);
}