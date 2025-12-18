import { FastKeeper } from './dist/index.js'
let keeper = new FastKeeper('wss://mppclone.com', 'fastkeeper')
keeper.init()
keeper.start()