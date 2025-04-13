import BitrixApiClient from "../../BitrixApiClient.unused.js";
import log4js from "log4js";

const logger = log4js.getLogger('API/Auth');
logger.level = process.env.LOG_LEVEL || 'info';


export function logIn(login: string, password: string, apiInstance: BitrixApiClient){
    let csrfUpdated = false;
    try {
        apiInstance.request('https://auth2.bitrix24.net/socservauth.php?gen_ap=1&checkauth=Y', 'POST')

    } catch (error) {
        
        // this is intended behaviour, now we should request again
        if(error.message === 'CSRF_Updated'){
            csrfUpdated = true;
        }
    }

    if(!csrfUpdated){
        throw new Error('Login failed: csrf token not updated');
    }
}

// this request is essential to login: gets cookies from the server and "starts conversation"

async function getNetworkRequest(apiInstance: BitrixApiClient){
    await apiInstance.request('https://lb.bitrix24.net/mobile/get-network/', 'POST', {
        form: {
            app_id: 'com.bitrix24.android',
            locale: 'ru'
        }
    })
}

// this is not necessary, but i will replicate as many apis as possible
// this particular one is checkink is login(without pass) correct
async function checkLoginRequest(login: string, apiInstance: BitrixApiClient){
    
    const form = {
        login,
        SITE_ID: 'XX',
    }
    if(apiInstance.session.customData['csrf']){
        form['session'] = apiInstance.session.customData['csrf'];
    }else{
        logger.debug('No csrf token, most likely will need to try one more time');
    }

    await apiInstance.request('https://auth2.bitrix24.net/bitrix/services/main/ajax.php?action=b24network.authorize.checkLogin&platform=android&user_lang=ru', 'POST', {
        form: {
            login,
            SITE_ID: 's1',
        }
    });
}

// authorization consists of some weird and 
// nonsense requests, ig we should just do them
async function checkAuthRequest(login: string, password: string, apiInstance: BitrixApiClient){
    const logpassBase64 = Buffer.from(`${login}:${password}`).toString('base64');
    // usually, it has "X-User-Id" header containing bitrix user id. 
    // I have added a handler for this in the BitrixApiClient, to update correspondingly
    const resp = await apiInstance.request('https://auth2.bitrix24.net/socservauth.php?gen_ap=1&checkauth=Y', 'POST', {
        headers: {
            'Authorization': `Basic ${logpassBase64}`
        }  
    });
    
    const jsonBody = resp.body as any;
    if(jsonBody.error){
        throw new Error(`Login failed: "${jsonBody.error_description}"`);
    }

    if(jsonBody.result !== true){
        
        logger.error(`Login failed: unexpected response body: ${JSON.stringify(jsonBody)}`);
        
        throw new Error(`Login failed: no errors or result=true, what's going on?`);
    }
}



function ensureLogOut(apiInstance: BitrixApiClient){
    apiInstance.session.clearCookies();
    apiInstance.triggerNeedSave();
}