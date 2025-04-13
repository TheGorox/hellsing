// import { Database } from "sqlite";
// import { CookedRequester } from "./CookedRequester.js";
// import log4js from 'log4js';
// import { openDatabase } from "../db/db.js";


// const logger = log4js.getLogger('HWSClient');
// logger.level = process.env.LOG_LEVEL || 'info';

// export class HWSClient {
//     cookedRequester: CookedRequester = new CookedRequester({
//         checkDomainBase: true,
//         domainBase: 'my.hwschool.online',
//         baseHeaders: {
//             'origin': 'https://my.hwschool.online'
//         }
//     });

//     db: Database = openDatabase('/data/db.sqlite')

//     constructor() {

//     }

//     async login() {

//     }
// }