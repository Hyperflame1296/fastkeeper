// import: classes
import { Client } from 'mpp-client-net'
import EventEmitter from 'node:events'

// import: local classes
import { StorageStream } from './StorageStream.js'

// import: local interfaces
import { Command } from '../interfaces/Command.js'
import { TagList } from '../interfaces/TagList.js'
import { FastKeeperOptions } from '../interfaces/FastKeeperOptions.js'

// import: constants
import fs from 'node:fs'
import color from 'cli-color'

// import: local constants
import { util } from '../constants/util.js'

// code
export class FastKeeper extends EventEmitter {
    version: string = 'v0.1.0-alpha.rev0'
    initialized: boolean = false
    clients: Client[] = []
    tokens: Record<string, string> = {}
    url: string = 'wss://mppclone.com'
    channels: string[] = []
    storage: StorageStream
    commandPrefix: string = '='
    hasDroppedCrown: Record<string, boolean> = {}
    chownInterval: NodeJS.Timeout
    options: FastKeeperOptions
    ranks: Record<string, number> = {
        user: 0,
        moderator: 1,
        admin: 2,
        owner: 3,
    }
    tags: TagList = {
        info: `[${color.cyanBright('INFO')}] » `,
		warn: `[${color.yellowBright('WARN')}] » `,
		error: `[${color.redBright('ERROR')}] » `,
		success_mpp: `✅ » `,
		info_mpp: `🟦 » `,
		failure_mpp: `🟥 » `
    }
    mouse: { pos: [ number, number ], speed: [ number, number ] } = { pos: [ 50, 50 ], speed: [ 0, 0 ] }
    intervals = {
        chown: {
            timeout: undefined,
            started: false,
            start(bind?: Object, int: number = 50) {
                if (this.started)
                    return
                this.timeout = setInterval(bind !== undefined ? this.update.bind(bind) : this.update.bind(this), int)
                this.started = true
            },
            stop() {
                if (!this.started)
                    return
                this.timeout.close()
                this.timeout = undefined
            },
            update: () => {
                for (let client of this.clients) {
                    if (!client.isConnected())
                        continue
                    if (
                        client.channel && 
                        client.channel.crown && 
                        !client.channel.crown.participantId &&
                        !this.hasDroppedCrown[client.desiredChannelId] &&
                        Date.now() - client.channel.crown.time >= 14500
                    ) {
                        client.chown(client.participantId)
                    }
                }
            }
        },
        kickban: {
            timeout: undefined,
            started: false,
            start(bind?: Object, int: number = 50) {
                if (this.started)
                    return
                this.timeout = setInterval(bind !== undefined ? this.update.bind(bind) : this.update.bind(this), int)
                this.started = true
            },
            stop() {
                if (!this.started)
                    return
                this.timeout.close()
                this.timeout = undefined
            },
            update: () => {
                for (let client of this.clients) {
                    if (!client.isConnected())
                        continue
                }
            }
        },
        mouse: {
            timeout: undefined,
            started: false,
            start(bind?: Object, int: number = 50) {
                if (this.started)
                    return
                this.timeout = setInterval(bind !== undefined ? this.update.bind(bind) : this.update.bind(this), int)
                this.started = true
            },
            stop() {
                if (!this.started)
                    return
                this.timeout.close()
                this.timeout = undefined
            },
            update: () => {
                this.mouse.speed[0] = 0.25
                this.mouse.pos[0] = util.math.mod(this.mouse.pos[0] + this.mouse.speed[0], 100)
                this.mouse.pos[1] = 50 + Math.sin((Date.now() / 1000) * Math.PI) * 10
                for (let client of this.clients) {
                    if (!client.isConnected())
                        continue
                    client.setCursor(this.mouse.pos[0], this.mouse.pos[1])
                }
            }
        }
    }
    commands: Command[] = [
        {
            name: 'help',
            desc: 'Shows all commands.',
            aliases: ['h', '?'],
            syntax: `${this.commandPrefix}help [command]`,
            func: (client, args, msg) => {
                let c = args[1], d = args[2]
                if (!c) {
                    this.send(client, msg.id, this.tags.success_mpp + `Commands: ${this.commands.map(cmd => `\`${this.commandPrefix}${cmd.name}\``).join(', ')}`)
                } else {
                    let command = this.commands.find(cmd => cmd.name === c.toLowerCase().replace(this.commandPrefix, '') || cmd.aliases?.includes(c.toLowerCase().replace(this.commandPrefix, '')))
                    if (!command) 
                        return this.send(client, msg.id, this.tags.failure_mpp + `There isn\'t a command named \`\`\`${this.commandPrefix + c.replace(this.commandPrefix, '')}\`\`\`.`)

                    if (!d) {
                        this.send(client, msg.id, [
                            this.tags.success_mpp + `\`${this.commandPrefix + command.name}\` - *${command.desc ?? 'This command doesn\'t have a description.'}*`,
                            `Syntax: \`${command.syntax}\``,
                            `Aliases: ${command.aliases.map(al => `\`${this.commandPrefix}${al}\``).join(', ')}`
                        ])
                    } else {
                        let subcommand = command.subcommands.find(cmd => cmd.name === d)
                        if (!subcommand) 
                            return this.send(client, msg.id, this.tags.failure_mpp + `There isn\'t a subcommand for \`\`\`${this.commandPrefix + command.name}\`\`\` named \`\`\`${d}\`\`\`.`)

                        this.send(client, msg.id, [
                            this.tags.success_mpp + `\`${this.commandPrefix + command.name + ` ${subcommand.name}`}\` - *${subcommand.desc ?? 'This subcommand doesn\'t have a description.'}*`,
                            `Syntax: \`${subcommand.syntax}\``
                        ])
                    }
                }
            }
        },
        {
            name: 'about',
            desc: 'Shows information about this bot.',
            aliases: ['a'],
            syntax: `${this.commandPrefix}about`,
            func: client => {
                this.send(client, [
                    `FastKeeper \`${this.version}\``,
                    ` - made by TensiveYT!`
                ])
            }
        },
        {
            name: 'ping',
            desc: 'Pings the client.',
            aliases: ['e'],
            syntax: `${this.commandPrefix}ping`,
            func: (client, _, msg) => {
                client.once('t', t => { 
					let ping = Date.now() - t.e
					this.send(client, msg.id, this.tags.success_mpp + `Pong! \`[${ping}ms]\``)
				}); 
				client.sendPing()
            }
        },
        /*
        {
            name: 'ban',
            desc: 'Ban somebody from the room.',
            aliases: ['b'],
            syntax: `${this.commandPrefix}ban <_id> <length> [reason]`,
            permissionLevel: 2,
            func: (client, args, msg) => {
                if (!client.isOwner())
                    return this.send(client, msg.id, this.tags.failure_mpp + 'FastKeeper doesn\'t currently have the crown.')
                let _id = args[1]
                let len = args[2]
                let rea = args.slice(3).join(' ')
                if (!client.ppl[_id])
                    return this.send(client, msg.id, this.tags.failure_mpp + `There is no user in this room with an \`_id\` of \`${_id}\`.`)
                if (len !== 'forever' && Number.isNaN(Number.parseInt(len)))
                    return this.send(client, msg.id, this.tags.failure_mpp + `\`${len}\` is not a valid number.`)
                let multiplier: number | 'forever' = (() => {
                    if (len.endsWith('ms'))
                        return 1
                    if (len.endsWith('s'))
                        return 1000
                    if (len.endsWith('m'))
                        return 1000 * 60
                    if (len.endsWith('h'))
                        return 1000 * 60 * 60
                    if (len.endsWith('d'))
                        return 1000 * 60 * 60 * 24
                    if (len.endsWith('y'))
                        return 1000 * 60 * 60 * 24 * 365
                    if (len === 'forever')
                        return 'forever'
                    return 1000
                })()
                client.sendArray([{
                    m: 'kickban',
                    _id,
                    ms: multiplier === 'forever' ? 18000000 : Math.min(Number.parseInt(len) * multiplier, 18000000)
                }])
            }
        },*/
        {
            name: 'crown',
            desc: 'Modify FastKeeper\'s room ownership.',
            syntax: `${this.commandPrefix}crown <give | drop> [_id]`,
            permissionLevel: 2,
            aliases: ['chown', 'c', 'o'],
            subcommands: [
                {
                    name: 'give',
                    desc: 'Give the crown to somebody.',
                    syntax: `${this.commandPrefix}crown give <userId>`,
                    func: (client, args, msg) => {
                        let _id = args[1]?.replace('@', '')
                        if (!client.isOwner())
                            return this.send(client, msg.id, this.tags.failure_mpp + 'FastKeeper doesn\'t currently have the crown.')

                        if (!_id) {
                            client.chown(msg.p._id)
                            this.send(client, msg.id, this.tags.success_mpp + `You have been granted room ownership!`)
                            this.hasDroppedCrown[client.desiredChannelId] = false
                        } else {
                            if (!client.ppl[_id])
                                return this.send(client, msg.id, this.tags.failure_mpp + `There is no user in this room with an \`_id\` of \`${_id}\`.`)
                            client.chown(_id)
                            this.send(client, msg.id, this.tags.success_mpp + `Room ownership has been given to \`\`\`${client.findParticipantById(_id).name}\`\`\`!`)
                            this.hasDroppedCrown[client.desiredChannelId] = false
                        }
                    }
                },
                {
                    name: 'drop',
                    desc: 'Drop the crown.',
                    syntax: `${this.commandPrefix}crown drop`,
                    func: client => {
                        if (!client.isOwner())
                            return this.send(client, this.tags.failure_mpp + 'FastKeeper doesn\'t currently have the crown.')
                        client.chown()
                        this.send(client, this.tags.success_mpp + 'The crown has been dropped!')
                        this.hasDroppedCrown[client.desiredChannelId] = true
                    }
                },
            ]
        },
        {
            name: 'rank',
            desc: 'Set or get the rank for a person.',
            syntax: `${this.commandPrefix}rank <get | set> [_id]`,
            aliases: ['r'],
            subcommands: [
                {
                    name: 'set',
                    desc: 'Set somebody\'s rank',
                    syntax: `${this.commandPrefix}rank set <_id> <rank>`,
                    permissionLevel: 2,
                    func: (client, args, msg) => {
                        let _id = args[1]?.replace('@', '')
                        let rank = args[2]
                        let currentRank = this.storage.get('roomPermissions')?.[client.desiredChannelId]?.[_id] ?? 0
                        if (!_id)
                            return this.send(client, msg.id, this.tags.failure_mpp + `Please specify the \`_id\` of the user.`)
                        if (!rank)
                            return this.send(client, msg.id, this.tags.failure_mpp + `Please specify the rank to set this user to.`)
                        if (!client.ppl[_id])
                            return this.send(client, msg.id, this.tags.failure_mpp + `There\'s no user in this room with an \`_id\` of \`${_id}\`.`)
                        if (!(rank in this.ranks))
                            return this.send(client, msg.id, this.tags.failure_mpp + `There\'s no rank named ${rank}.`)
                        if (this.ranks[rank] > currentRank)
                            return this.send(client, msg.id, this.tags.failure_mpp + `You can\'t set anybody to a higher rank than you are.`)
                        if (!this.storage.get('roomPermissions')[client.desiredChannelId])
                            this.storage.current.roomPermissions[client.desiredChannelId] = {}
                        this.storage.current.roomPermissions[client.desiredChannelId][_id] = this.ranks[rank]
                        this.storage.update()
                        this.send(client, msg.id, this.tags.success_mpp + `Set ${util.lang.possessive(client.findParticipantById(_id).name)} rank in the room \`${client.desiredChannelId}\` to \`${rank}\`.`)
                    }
                },
                {
                    name: 'get',
                    desc: 'Get somebody\'s rank.',
                    syntax: `${this.commandPrefix}rank get [_id]`,
                    func: (client, args, msg) => {
                        let _id = args[1]?.replace('@', '')
                        let ranks = Object.keys(this.ranks)
                        let rank = this.storage.get('roomPermissions')?.[client.desiredChannelId]?.[_id ?? msg.p._id] ?? 0
                        if (!_id)
                            this.send(client, msg.id, this.tags.success_mpp + `Your rank in the room \`${client.desiredChannelId}\` is \`${ranks[rank]}\`.`)
                        else
                            this.send(client, msg.id, this.tags.success_mpp + `${util.lang.possessive(client.findParticipantById(_id).name)} rank is \`${ranks[rank]}\`.`)
                    }
                },
                {
                    name: 'ranks',
                    desc: 'See all of the possible ranks. ',
                    syntax: `${this.commandPrefix}rank ranks`,
                    func: (client, _, msg) => {
                        let ranks = Object.keys(this.ranks)
                        this.send(client, msg.id, this.tags.success_mpp + `All possible ranks: ${ranks.map(r => `\`${r}\``).join(', ')}`)
                    }
                },
            ]
        },
        {
            name: 'js',
            desc: 'Evaluate JavaScript code.',
            syntax: `${this.commandPrefix}js <code>`,
            requiresAdmin: true,
            aliases: ['j', 'eval'],
            func: (client, args, msg) => {
                let input = args.slice(1).join(' ')
                try {
                    let res = eval(input)
                    let str = 'unknown type'
                    switch (typeof res) {
                        case 'number':
                        case 'function':
                        case 'symbol':
                            str = res.toString().replaceAll('\n', ' ').replaceAll('\t', ' ')
                            break
                        case 'bigint':
                            str = res.toString() + 'n'
                            break
                        case 'string':
                            str = res.replaceAll('\n', ' ').replaceAll('\t', ' ')
                            break
                        case 'boolean':
                            str = res ? 'true' : 'false'
                            break
                        case 'object':
                            str = JSON.stringify(res).replaceAll('\n', ' ').replaceAll('\t', ' ')
                            break
                        case 'undefined':
                            str = 'undefined'
                            break
                        default:
                            str = 'unknown type'
                            break
                    }
                    this.send(client, this.tags.success_mpp + `\`\`\`${str}\`\`\``)
                } catch (err) {
                    this.send(client, this.tags.failure_mpp + `\`\`\`${err}\`\`\``)
                }
            }
        }
    ]
    constructor(options?: FastKeeperOptions) {
        // allow for EventEmitter methods
        super()

        // update options
        this.options = {
            url: options?.url ?? 'wss://mppclone.com',
            channels: options?.channels ?? ['lobby'],
            enableChatConnectionMessage: options?.enableChatConnectionMessage ?? true,
            log: {
                chat : options?.log?.chat  ?? true,
                info : options?.log?.info  ?? true,
                warn : options?.log?.warn  ?? true,
                error: options?.log?.error ?? true,
            },
            files: {
                tokens: options?.files?.tokens ?? './tokens.json',
                storage: options?.files?.storage  ?? './storage.json'
            }
        }

        // throw if this url can't be parsed
        if (!URL.canParse(this.options.url))
            throw new Error(`Invalid URL '${this.options.url}\'!`)

        // set the current url to the passed url
        this.url = this.options.url

        // set the bot's channel to the passed channel
        this.channels = this.options.channels
    }
    init() {
        try {
            // show a warning if this function is called twice
            if (this.initialized)
                return console.warn('FastKeeper.init() called when the instance is already initialized!')
            
            console.log(this.tags.info + `Initializing...`)

            // url object
            let url = new URL(this.url)

            // assign class values
            this.tokens = JSON.parse(fs.readFileSync(this.options.files.tokens, 'utf-8'))
            this.storage = new StorageStream(this.options.files.storage)
            for (let i = 0; i < this.channels.length; i++)
                this.clients.push(new Client(url.href, this.tokens[url.href]))

            // make sure the db is fully defined
            if (!this.storage.has('roomPermissions')) this.storage.set('roomPermissions', {})
            if (!this.storage.has('globalAdmins'   )) this.storage.set('globalAdmins'   , [])
            if (!this.storage.has('roomBans'       )) this.storage.set('roomBans'       , {})
            
            // add channel & listeners
            for (let i = 0; i < this.clients.length; i++) {
                let client = this.clients[i]
                this.setChannel(client, this.channels[i])
                client.on('hi', () => {
                    this.userSet({
                        name: `FastKeeper [ ${this.commandPrefix}help ]`,
                        color: '#777777'
                    })
                    if (this.options.enableChatConnectionMessage)
                        client.sendChat(this.tags.success_mpp + 'Connected!')
                    console.log(this.tags.info + `Client #${i + 1} connected!`)
                    this.intervals.chown.start(this, 5)
                    this.intervals.mouse.start(this, 50)
                    this.intervals.kickban.start(this, 50)
                })
                client.on('disconnect', () => {
                    console.log(this.tags.info + `Client #${i + 1} disconnected.`)
                    if (this.clients.every(cl => cl === client || (!cl.isConnected() && !cl.channel))) {
                        this.intervals.chown.stop()
                        this.intervals.mouse.stop()
                        this.intervals.kickban.stop()
                        console.log(this.tags.info + `All clients have disconnected.`)
                    }
                    setTimeout(() => {
                        client.connect()
                    }, 250)
                })
                client.on('ch', msg => {
                    if (msg.ch.crown && msg.ch.crown.participantId)
                        this.hasDroppedCrown[client.desiredChannelId] = false
                })
                client.on('a', msg => {
                    if (this.options.log.chat)
                        console.log(`[${color.cyanBright(`channel/${client.desiredChannelId}`)}] - ${color.whiteBright(msg.p.name)}: ${color.whiteBright(msg.a)}`)
                    this.handleMessage(client, msg)
                })
            }
            console.log(this.tags.info + `Initialized!`)
        } catch (err) {
            console.log(this.tags.error + `${err.stack}`)
        }
    }
    setChannel(client: Client, ch: string, _id?: string) {
        try {
            this.channels[this.channels.indexOf(client.desiredChannelId)] = ch
            if (_id && !this.storage.get('roomPermissions')[ch]) {
                this.storage.current.roomPermissions[ch] = { [_id]: 2 }
                this.storage.update()
            }
            client.setChannel(ch)
        } catch (err) {
            console.log(this.tags.error + `${err.stack}`)
            this.send(client, this.tags.failure_mpp + `AHH! - \`\`\`${err.message}\`\`\``)
        }
    }
    userSet(set: { name: string, color: string }) {
        try {
            for (let client of this.clients) {
                if (!client?.isConnected())
                    return false
                client.sendArray([
                    {
                        m: 'userset',
                        set: {
                            name: set.name,
                            color: set.color
                        }
                    }
                ])
            }
            return true
        } catch (err) {
            console.log(this.tags.error + `${err.stack}`)
            for (let client of this.clients)
                this.send(client, this.tags.failure_mpp + `AHH! - \`\`\`${err.message}\`\`\``)
        }
    }
    send(client: Client, ...args: (string | string[])[]) {
        switch (args.length) {
            case 1:
                var msgs: string | string[] = args[0] ?? []
                var arr = []
				if (!msgs || msgs.length == 0)
					return
                switch (typeof msgs) {
                    case 'string':
                        arr.push({
                            m: 'a',
                            message: msgs
                        })
                        break
                    case 'object':
                        if (!Array.isArray(msgs))
                            throw new TypeError(`\`this.send()\` - The message to send can only be of type Array or String. (\`typeof msgs == ${typeof msgs}\`)`)
                        arr.push(
                            ...msgs.map(m => 
                                ({
                                    m: 'a',
                                    message: m
                                })
                            )
                        )
                        break
                    default:
                        throw new TypeError(`Method \`this.send()\` incompatible with type \`${typeof msgs}\``)
                }
				if (client.isConnected() && !client.isConnecting())
                	client.sendArray(arr)
                break
            case 2:
                var r = args[0]
                var msgs: string | string[] = args[1] ?? []
                var arr = []
                switch (typeof msgs) {
                    case 'string':
                        arr.push({
                            m: 'a',
                            message: msgs,
                            reply_to: r
                        })
                        break
                    case 'object':
                        if (!Array.isArray(msgs))
                            throw new TypeError(`\`this.send()\` - The message to send can only be of type Array or String. (\`typeof msgs == ${typeof msgs}\`)`)
                        arr.push(
                            ...msgs.map(m => 
                                ({
                                    m: 'a',
                                    message: m,
                                    reply_to: r
                                })
                            )
                        )
                        break
                    default:
                        throw new TypeError(`\`this.send()\` - Argument [2] incompatible with type \`${typeof msgs}\``)
                }
                if (client.isConnected() && !client.isConnecting())
                	client.sendArray(arr)
                break
            default:
                throw new SyntaxError(`\`this.send()\` - Invalid syntax for \`this.send()\`. (\`args.length !== 1 && args.length !== 2\`)`)
        }
	}
    giveNoPermissionMessage() {
		let arr = [
			this.tags.failure_mpp + 'You don\'t have permission to use this command!',
			this.tags.failure_mpp + 'Uh, no.',
			this.tags.failure_mpp + 'What are you trying to do?...',
			this.tags.failure_mpp + 'Did you know that you don\'t have permission to use this command?',
			this.tags.failure_mpp + 'Here\'s a tutorial on how to run that command: Step 1, you don\'t.',
			this.tags.failure_mpp + 'You shall not pass!',
			this.tags.failure_mpp + 'You don\'t look like an admin!'
		]
		return arr[Math.floor(Math.random() * arr.length)]
	}
    handleMessage(client: Client, msg: any) {
        try {
            if (!msg)
                return false
            if (msg.p._id === client.participantId)
                return false
            let message = msg.a.trim()
            let args = message.split(' ').map(a => a.trim())
            if (args[0].startsWith(this.commandPrefix) && args[0] !== this.commandPrefix) {
                let command = this.commands.find(cmd => cmd.name === args[0].toLowerCase().replace(this.commandPrefix, '') || cmd.aliases?.includes(args[0].toLowerCase().replace(this.commandPrefix, '')))
                if (!command) {
                    this.send(client, this.tags.failure_mpp + `There isn\'t a command named \`\`\`${args[0]}\`\`\`.`)
                    return false
                }
                if (
                    (
                        'permissionLevel' in command && 
                        (this.storage.get('roomPermissions')[client.desiredChannelId]?.[msg.p._id] ?? 0) < command.permissionLevel
                    ) ||
                    (
                        command.requiresAdmin &&
                        !this.storage.get('globalAdmins').includes(msg.p._id)
                    )
                ) {
                    this.send(client, this.giveNoPermissionMessage())
                    return false
                } else {
                    if (!command.subcommands) {
                        command.func(client, args, msg)
                    } else {
                        if (!args[1]) {
                            this.send(client, [
                                this.tags.failure_mpp + `What do you want to do?`,
                                `Type \`${this.commandPrefix}help ${command.name}\` for more information.`
                            ])
                            return false
                        }
                        let subcommand = command.subcommands.find(cmd => cmd.name === args[1])
                        if (!subcommand) {
                            this.send(client, this.tags.failure_mpp + `There isn\'t a subcommand for \`\`\`${this.commandPrefix + command.name}\`\`\` named \`\`\`${args[1]}\`\`\`.`)
                            return false
                        }
                        if (
                            (
                                'permissionLevel' in subcommand && 
                                (this.storage.get('roomPermissions')[client.desiredChannelId]?.[msg.p._id] ?? 0) < subcommand.permissionLevel
                            ) ||
                            (
                                subcommand.requiresAdmin &&
                                !this.storage.get('globalAdmins').includes(msg.p._id)
                            )
                        ) {
                            this.send(client, this.giveNoPermissionMessage())
                            return false
                        } else {
                            subcommand.func(client, args.slice(1), msg)
                        }
                    }
                }
            }
            return true
        } catch (err) {
            console.log(this.tags.error + `${err.stack}`)
            this.send(client, this.tags.failure_mpp + `AHH! - \`\`\`${err.message}\`\`\``)
        }
    }
    start() {
        for (let client of this.clients)
            client.start()
    }
    stop() {
        for (let client of this.clients)
            client.stop()
    }
}