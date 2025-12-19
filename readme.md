# FastKeeper
An MPP roomkeeper!
- Made by [TensiveYT](https://youtube.com/@Hyperflamee8)

## IMPORTANT!
Before you run the bot, you *need* a bot token! Otherwise, you *will* get sitebanned!
So, in the directory of FastKeeper, create a `tokens.json`, and add this:
```json
{
    "wss://mppclone.com/": "<your bot token here>"
}
```

## Usage
In the command line, navigate to the directory of FastKeeper.

Then, run the following commands to build the bot:
```bash
npm i
npx tsc
```

Then, make a JS file with the following contents:
```js
import { FastKeeper } from './dist/index.js'
let keeper = new FastKeeper({
    url: 'wss://mppclone.com',
    channels: ['lobby', 'myRoom']
})
keeper.init()
keeper.start()
```
...and run it using `node file.js`.