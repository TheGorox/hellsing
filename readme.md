# Hellsing ![alucard](https://i.imgur.com/8tsLrI1.png)
## About this project
**Hellsing** is a Telegram bot for mirroring bitrix messages notifications.
## How to install
To run this project, you will need `node` executable (you can get it [here](https://nodejs.org/)). 
*Note: mininum Node version is 20, cause some newest node features were used* 
After installing `node`, clone this rep:
```bash
git clone https://github.com/TheGorox/hellsing
```
cd into it and install node modules:
```bash
cd hellsing
npm install
``` 
## Configuring
Configuring is very simple, just create a `.env` file (bot won't work without it or either providing env into the process) or copy `.env.example`, then rename it to the `.env` 
```
TELEGRAM_BOT_TOKEN=0000000000:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
ADMIN_ID=000000000
LOG_LEVEL=debug
```
There are three (and mandatory) .env values you have to set. Admin id is a telegram id of yours, to send error reports if something goes wrong
## Running
run it with `node --import @swc-node/register/esm-register --no-warnings src/index.ts` or `pm2 start ecosystem.config.cjs` if you're using pm2