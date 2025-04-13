import log4js from 'log4js';
import axios, { AxiosResponse } from 'axios';
import * as cookie from 'cookie';


const logger = log4js.getLogger('Requester');
logger.level = process.env.LOG_LEVEL || 'info';

export type Cookie = Record<string, string | undefined>;


/**
 * Class, actually for creating sessions.
 * Saves cookies and basic headers, updates cookies if the server says so.
 * DOES NOT work for cross-domain queries, because it does not check which cookies belong to which site
 */
export class CookedRequester {
    
    public static defaultHeaders = {
        'accept-encoding': 'gzip, deflate, br, zstd',
        'accept-language': 'ru,en;q=0.9',
        'sec-ch-ua': '"Not A(Brand";v="8", "Chromium";v="132", "YaBrowser";v="25.2", "Yowser";v="2.5"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 YaBrowser/25.2.0.0 Safari/537.36',
    }

    /**
     * The cookie parser does not return the name of the cookie itself in any way, I had to make a wrapper
     * @param cookieStr 
     */
    
    static parseCookie(cookieStr: string): Cookie {
        const parsedCookie = cookie.parse(cookieStr);

        const cookieName = cookieStr.split('=')[0];
        parsedCookie['_NAME'] = cookieName;

        return parsedCookie;
    }

    static stringifyCookies(cookies: Cookie[]) {
        return cookies.map((_cookie) => {
            const key = _cookie['_NAME'] as string;
            const value = _cookie[key] as string;

            return `${key}=${value}`;
        }).join('; ');
    }

    
    static mergeCookies(oldCookies: Cookie[], newCookies: Cookie[]): Cookie[] {
        let updatedCookies: Cookie[] = [...oldCookies];
        for (const newCookie of newCookies) {
            const key = newCookie['_NAME'] as string;
            const isValueEmpty = newCookie[key] === '';

            const existingIdx = updatedCookies.findIndex((cookie) => {
                return cookie['_NAME'] === key;
            });

            if (existingIdx !== -1) {
                // empty value means that server wants us to remove this cookie
                if (isValueEmpty) {
                    updatedCookies.splice(existingIdx, 1);
                    continue;
                }
                updatedCookies[existingIdx] = newCookie;
                
                console.log('update', key)
            } else if (!isValueEmpty) {
                updatedCookies.push(newCookie);
                console.log('push', key)
            }
        }

        console.log({ oldCookies, newCookies, updatedCookies })
        return updatedCookies;
    }

    
    static checkCookieExpired(cookie: Cookie): boolean{
        const expires = cookie['expires'];
        if (!expires) {
            return false;
        }

        
        const expiresDate = new Date(expires);
        const now = new Date();

        return expiresDate < now;
    }

    private baseHeaders: object = {};
    private cookies: Cookie[] = [];

    private checkDomainBase: boolean = false;
    private domainBase: string | undefined;

    constructor(config?: { baseHeaders?: object, checkDomainBase?: boolean, domainBase?: string }) {
        Object.assign(this.baseHeaders, CookedRequester.defaultHeaders);
        if (config?.baseHeaders) {
            Object.assign(this.baseHeaders, config.baseHeaders);
        }

        // are we checking the domain to exclude an accidental cross-domain request
        if (config?.checkDomainBase) {
            this.checkDomainBase = true;
            this.domainBase = config.domainBase
        }
    }

    
    removeExpiredCookies() {
        this.cookies = this.cookies.filter((cookie) => {
            const isExpired = CookedRequester.checkCookieExpired(cookie);
            if (isExpired) {
                
                logger.debug('Cookie expired:', cookie['_NAME']);
            }
            return !isExpired;
        });
    }

    
    async _request(url: string, method: 'GET' | 'POST', config?: { customCookies?: string[], customHeaders?: object }): Promise<AxiosResponse<any, any>> {
        try {
            const urlParsed = new URL(url);
            if (this.checkDomainBase) {
                if (urlParsed.hostname !== this.domainBase) {
                    throw new Error(`Domain mismatch: ${urlParsed.hostname} !== ${this.domainBase}`);
                }
            }

            
            logger.debug(`Request ${method}, on ${urlParsed.pathname}`);

            let cookies = CookedRequester.stringifyCookies(this.cookies);
            if (config?.customCookies) {
                cookies = cookies + '; ' + config.customCookies;
            }

            const requestConfig = {
                url,
                method,
                headers: {
                    ...this.baseHeaders,
                    ...config?.customHeaders,
                    cookie: cookies
                }
            };

            
            logger.debug('Request config:', requestConfig);

            const response = await axios.request(requestConfig);

            const respHeaders = response.headers;
            if (respHeaders?.['set-cookie']) {
                const parsedCookies: Cookie[] = [];
                for (const rawCookie of respHeaders['set-cookie']) {
                    if (rawCookie.startsWith('undefined=;')) {
                        continue;
                    }
                    const parsedCookie = CookedRequester.parseCookie(rawCookie);
                    parsedCookies.push(parsedCookie);
                }

                this.cookies = CookedRequester.mergeCookies(this.cookies, parsedCookies);
            }
            return response;
        
        } catch (error) {
            logger.error('Error in _request:', error);
            throw error;
        }
    }
}

(async () => {
    const cr = new CookedRequester();
    await cr._request('https://google.com/', 'GET');
    await cr._request('https://google.com/', 'GET');
})();
