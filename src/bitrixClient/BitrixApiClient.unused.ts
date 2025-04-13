

/**
 * DISCLAIMER: unused for this moment. saved till the better times
 * you probably need BitrixRestApiClient.ts, watch it instead
 */

import log4js from "log4js";
import WebAuthRepository from "../db/repos/webauth.repository.unused.js";
import { CookieJar } from "tough-cookie";
import { EventEmitter } from "events";
import got, { Got } from "got";

const logger = log4js.getLogger('BitrixApiClient');
logger.level = process.env.LOG_LEVEL || 'info';

// todo: move this class to the separate file when another client is created
class Session extends EventEmitter {
    cookieJar: CookieJar;
    client: Got;
    repository: WebAuthRepository = new WebAuthRepository();
    customData: object = {};

    constructor() {
        super();

        this.cookieJar = new CookieJar();
        this.client = got.extend({
            cookieJar: this.cookieJar
        });
    }

    
    extendClient(options: any) {
        this.client = this.client.extend(options);
    }

    async restoreSession(userId: number): Promise<boolean> {
        const sessData = await this.repository.getSession(userId);
        if (!sessData) {
            
            logger.warn(`No session found for user ${userId}`);
            return false;
        }

        
        const newCookieJar = await CookieJar.deserialize(sessData.session);
        this.cookieJar = newCookieJar;

        this.customData = sessData.customData;

        // this.emit('customDataRestored', this.customData);

        return true
    }

    
    async saveSession(userId: number) {
        const jarJson = await this.cookieJar.serialize();
        await this.repository.saveSession(userId, JSON.stringify(jarJson), this.customData);
    }

    clearCookies(){
        this.cookieJar.removeAllCookiesSync();
    }
}

export default class BitrixApiClient extends EventEmitter {
    session: Session;
    
    repository: WebAuthRepository = new WebAuthRepository();

    private _needSaveSession: boolean = false;

    bitrixId: number

    constructor(bitrixId?: number) {
        super();

        this.session = new Session();
        this.session.extendClient({
            headers: {
                'User-Agent': 'Phone/Android/BitrixMobile/Version=58'
            }
        });
        this.addHooks();

        if (bitrixId) {
            this.bitrixId = bitrixId;
        }
    }

    addHooks(){
        this.session.extendClient({
            hooks: {
                beforeRequest: [
                    options => {
                        // bitrix api doesn't use Accept header, so do we
                        delete options.headers['accept'];
                    }
                ],
                afterResponse: [
                    response => {
                        const bitrixId = response.headers['x-user-id'];
                        if (bitrixId) {
                            
                            this.bitrixId = parseInt(bitrixId);
                            this.emit('userIdUpdated', this.bitrixId);
                            logger.debug(`Bitrix ID updated: ${this.bitrixId}`);
                        }
                    }
                ]
            }
        })
    }

    async init() {
        
        if (this.bitrixId) {
            await this.load();
        } else {
            logger.info(`Not restoring bitrix session for this client, due to lack of bitrixId`);
        }

        this.startSaveInterval();
    }

    triggerNeedSave() {
        this._needSaveSession = true;
    }

    startSaveInterval() {
        
        setInterval(() => {
            if (this._needSaveSession) {
                this._needSaveSession = false;
                this.session.saveSession(this.bitrixId);
                logger.debug(`Session saved for user ${this.bitrixId}`);
            }
        }, 1000);
    }

    async load() {
        if (!this.bitrixId) {
            throw new Error('Bitrix ID is not set');
        }

        
        this.session.restoreSession(this.bitrixId);
    }

    
    async request(url: string, method: string, options: any = {}) {
        // extra function to handle scrf errors (the stupid host returns new token in the response)
        // plus additional things like save trigger/retry after wrong csrf

        method = method.toLowerCase();
        if (!['get', 'post', 'head', 'put'].includes(method)) {
            throw new Error(`Invalid method: ${method}`);
        }

        try {
            const response = await this.session.client.get(url, {
                method,
                ...options
            });

            // this client is not legit, and works solely on reversed api
            // i don't know which types it can/might return, so anywhere it will be ANY
            const json = response.body as any;
            if (json.status === 'error') {
                const error = json.errors[0];
                if (error.code === 'invalid_csrf') {
                    const newToken = error.customData.csrf;
                    this.updateCsrfToken(newToken);

                    throw new Error('CSRF_Updated');
                } else {
                    let errorMsg = error.message;
                    if (json.errors.length > 1) {
                        errorMsg += '\nP.S. it\'s not the only one error; others are not shown';
                    }
                    throw new Error(errorMsg);
                }
            }

            return response;
        } catch (error) {
            
            logger.error(`Error while requesting ${url}: ${error}`);
            throw error;
        }
    }

    
    checkResponseIsJson(response: any) {
        if (response.headers['content-type']?.includes('application/json')) {
            return true;
        }
        return false;
    }

    updateCsrfToken(newToken: string) {
        this.session.customData['csrf'] = newToken;

        this.triggerNeedSave();
    }

    getCsrfToken() {
        return this.session.customData['csrf'];
    }

    updateUserId(userId: number) {
        this.bitrixId = userId;

        this.emit('userIdUpdated', userId);
    }
}

