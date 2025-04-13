# ![Hellsing](https://i.imgur.com/8tsLrI1.png) Hellsing  

## About the Project  
**Hellsing** is a Telegram bot designed to mirror Bitrix message notifications.  

## Installation  
To run this project, you will need the `node` executable (available [here](https://nodejs.org/)).  

**Note:** The minimum required Node.js version is **20**, as the project utilizes newer Node.js features.  

After installing Node.js, clone this repository:  
```bash
git clone https://github.com/TheGorox/hellsing
```  

Navigate into the project directory and install dependencies:  
```bash
cd hellsing  
npm install  
```  

## Configuration  
Configuration is straightforward. Create a `.env` file (the bot will not function without it) or copy the provided example:  

1. Duplicate `.env.example` and rename it to `.env`.  
2. Configure the following mandatory environment variables:  

```env
TELEGRAM_BOT_TOKEN=0000000000:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA  
ADMIN_ID=000000000  
LOG_LEVEL=debug  
```  

- `TELEGRAM_BOT_TOKEN`: Your Telegram bot token.  
- `ADMIN_ID`: Your Telegram user ID (for receiving error reports).  
- `LOG_LEVEL`: Logging verbosity (e.g., `debug`, `info`).  

## Running the Bot  
Start the bot using:  
```bash
node --import @swc-node/register/esm-register --no-warnings src/index.ts
```  

Alternatively, if using PM2:  
```bash
pm2 start ecosystem.config.cjs
```  