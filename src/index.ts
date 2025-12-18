// import: classes
import { Client } from 'mpp-client-net'
import EventEmitter from 'node:events'

// import: local classes
import { StorageStream } from './classes/StorageStream.js'

// import: local interfaces
import { Command } from './interfaces/Command.js'
import { TagList } from './interfaces/TagList.js'

// import: constants
import fs from 'node:fs'
import color from 'cli-color'

// code
export class FastKeeper extends EventEmitter {
    version: string = 'v0.1.0-alpha.rev0'
    initialized: boolean = false
    client: Client
    tokens: Record<string, string>
    url: string
    channel: string
    storage: StorageStream
    commandPrefix: string = '='
    hasDroppedCrown: boolean = false
    chownInterval: NodeJS.Timeout
    tags: TagList = {
        info: `[${color.cyanBright('INFO')}] » `,
		warn: `[${color.yellowBright('WARN')}] » `,
		error: `[${color.redBright('ERROR')}] » `,
		success_mpp: `✅ » `,
		info_mpp: `🟦 » `,
		failure_mpp: `🟥 » `
    }
    commands: Command[] = [
        {
            name: 'help',
            desc: 'Shows all commands.',
            aliases: ['h', '?'],
            syntax: `${this.commandPrefix}help [command]`,
            func: (args, msg) => {
                let c = args[1], d = args[2]
                if (!c) {
                    this.send(msg.id, this.tags.success_mpp + `Commands: ${this.commands.map(cmd => `\`${this.commandPrefix}${cmd.name}\``).join(', ')}`)
                } else {
                    let command = this.commands.find(cmd => cmd.name === c.toLowerCase().replace(this.commandPrefix, '') || cmd.aliases?.includes(c.toLowerCase().replace(this.commandPrefix, '')))
                    if (!command) 
                        return this.send(msg.id, this.tags.failure_mpp + `There isn\'t a command named \`\`\`${this.commandPrefix + c.replace(this.commandPrefix, '')}\`\`\`.`)

                    if (!d) {
                        this.send(msg.id, [
                            this.tags.success_mpp + `\`${this.commandPrefix + command.name}\` - *${command.desc ?? 'This command doesn\'t have a description.'}*`,
                            `Syntax: \`${command.syntax}\``,
                            `Aliases: ${command.aliases.map(al => `\`${this.commandPrefix}${al}\``).join(', ')}`
                        ])
                    } else {
                        let subcommand = command.subcommands.find(cmd => cmd.name === d)
                        if (!subcommand) 
                            return this.send(msg.id, this.tags.failure_mpp + `There isn\'t a subcommand for \`\`\`${this.commandPrefix + command.name}\`\`\` named \`\`\`${d}\`\`\`.`)

                        this.send(msg.id, [
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
            func: () => {
                this.send([
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
            func: (_, msg) => {
                this.client.once('t', t => { 
					let ping = Date.now() - t.e
					this.send(msg.id, this.tags.success_mpp + `Pong! \`[${ping}ms]\``)
				}); 
				this.client.sendPing()
            }
        },
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
                    func: (args, msg) => {
                        let _id = args[1]?.replace('@', '')
                        if (!this.client.isOwner())
                            return this.send(msg.id, this.tags.failure_mpp + 'The bot doesn\'t currently have the crown.')

                        if (!_id) {
                            this.client.chown(msg.p._id)
                            this.send(msg.id, this.tags.success_mpp + `You have been granted room ownership!`)
                            this.hasDroppedCrown = false
                        } else {
                            if (!this.client.ppl[_id])
                                return this.send(msg.id, this.tags.failure_mpp + `There is no user in this room with an \`_id\` of \`${_id}\`.`)
                            this.client.chown(_id)
                            this.send(msg.id, this.tags.success_mpp + `Room ownership has been given to \`\`\`${this.client.findParticipantById(_id).name}\`\`\`!`)
                            this.hasDroppedCrown = false
                        }
                    }
                },
                {
                    name: 'drop',
                    desc: 'Drop the crown.',
                    syntax: `${this.commandPrefix}crown drop`,
                    func: () => {
                        if (!this.client.isOwner())
                            return this.send(this.tags.failure_mpp + 'The bot doesn\'t currently have the crown.')
                        this.client.chown()
                        this.send(this.tags.success_mpp + 'The crown has been dropped!')
                        this.hasDroppedCrown = true
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
            func: (args, msg) => {
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
                    this.send(this.tags.success_mpp + `\`\`\`${str}\`\`\``)
                } catch (err) {
                    this.send(this.tags.failure_mpp + `\`\`\`${err}\`\`\``)
                }
            }
        }
    ]
    constructor(url: string, channel?: string) {
        // allow for EventEmitter methods
        super()

        // throw if this url can't be parsed
        if (!URL.canParse(url))
            throw new Error(`Invalid URL '${url}\'!`)

        // set the current url to the passed url
        this.url = url

        // set the bot's channel to the passed channel
        this.channel = channel ?? 'lobby'
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
            this.tokens = JSON.parse(fs.readFileSync('./tokens.json', 'utf-8'))
            this.storage = new StorageStream('./storage.json')
            this.client = new Client(url.href, this.tokens[url.href])

            // make sure the db is fully defined
            if (!this.storage.has('roomPermissions')) this.storage.set('roomPermissions', {})
            if (!this.storage.has('globalAdmins'   )) this.storage.set('globalAdmins'   , [])
            if (!this.storage.has('roomBans'       )) this.storage.set('roomBans'       , {})
            
            // add channel & listeners
            this.setChannel(this.channel)
            this.client.on('hi', () => {
                this.chownInterval = setInterval((() => {
                    if (
                         this.client.channel && 
                         this.client.channel.crown && 
                        !this.client.channel.crown.participantId &&
                        !this.hasDroppedCrown &&
                        Date.now() - this.client.channel.crown.time >= 14800
                    ) {
                        this.client.chown(this.client.participantId)
                    }
                }).bind(this), 5)
                this.userSet({
                    name: `FastKeeper [ ${this.commandPrefix}help ]`,
                    color: '#777777'
                })
                this.client.sendChat(this.tags.success_mpp + 'Connected!')
                console.log(this.tags.info + `Connected!`)
            })
            this.client.on('disconnect', () => {
                this.chownInterval.close()
            })
            this.client.on('ch', msg => {
                if (msg.ch.crown && msg.ch.crown.participantId)
                    this.hasDroppedCrown = false
            })
            this.client.on('a', msg => {
                console.log(`${msg.p.name}: ${msg.a}`)
                this.handleMessage(msg)
            })
            console.log(this.tags.info + `Initialized!`)
        } catch (err) {
            console.log(this.tags.error + `${err.stack}`)
        }
    }
    setChannel(ch: string, _id?: string) {
        try {
            this.channel = ch
            if (_id && !this.storage.get('roomPermissions')[ch]) {
                this.storage.current.roomPermissions[ch] = { [_id]: 2 }
                this.storage.update()
            }
            if (this.client)
                this.client.setChannel(ch)
        } catch (err) {
            this.send(this.tags.failure_mpp + `AHH! - \`\`\`${err.message}\`\`\``)
            console.log(this.tags.error + `${err.stack}`)
        }
    }
    userSet(set: { name: string, color: string }) {
        try {
            if (!this.client?.isConnected())
                return false
            this.client.sendArray([
                {
                    m: 'userset',
                    set: {
                        name: set.name,
                        color: set.color
                    }
                }
            ])
            return true
        } catch (err) {
            this.send(this.tags.failure_mpp + `AHH! - \`\`\`${err.message}\`\`\``)
            console.log(this.tags.error + `${err.stack}`)
        }
    }
    send(...args: (string | string[])[]) {
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
				if (this.client.isConnected() && !this.client.isConnecting())
                	this.client.sendArray(arr)
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
                if (this.client.isConnected() && !this.client.isConnecting())
                	this.client.sendArray(arr)
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
    handleMessage(msg: any) {
        try {
            if (!msg)
                return false
            if (msg.p._id === this.client.participantId)
                return false
            let message = msg.a.trim()
            let args = message.split(' ').map(a => a.trim())
            if (args[0].startsWith(this.commandPrefix) && args[0] !== this.commandPrefix) {
                let command = this.commands.find(cmd => cmd.name === args[0].toLowerCase().replace(this.commandPrefix, '') || cmd.aliases?.includes(args[0].toLowerCase().replace(this.commandPrefix, '')))
                if (!command) {
                    this.send(this.tags.failure_mpp + `There isn\'t a command named \`\`\`${args[0]}\`\`\`.`)
                    return false
                }
                if (
                    (
                        'permissionLevel' in command && 
                        (this.storage.get('roomPermissions')[this.channel]?.[msg.p._id] ?? 0) < command.permissionLevel
                    ) ||
                    (
                        command.requiresAdmin &&
                        !this.storage.get('globalAdmins').includes(msg.p._id)
                    )
                ) {
                    this.send(this.giveNoPermissionMessage())
                    return false
                } else {
                    if (!command.subcommands) {
                        command.func(args, msg)
                    } else {
                        if (!args[1]) {
                            this.send([
                                this.tags.failure_mpp + `What do you want to do?`,
                                `Type \`${this.commandPrefix}help ${command.name}\` for more information.`
                            ])
                            return false
                        }
                        let subcommand = command.subcommands.find(cmd => cmd.name === args[1])
                        if (!subcommand) {
                            this.send(this.tags.failure_mpp + `There isn\'t a subcommand for \`\`\`${this.commandPrefix + command.name}\`\`\` named \`\`\`${args[1]}\`\`\`.`)
                            return false
                        }
                        if (
                            (
                                'permissionLevel' in subcommand && 
                                (this.storage.get('roomPermissions')[this.channel]?.[msg.p._id] ?? 0) < subcommand.permissionLevel
                            ) ||
                            (
                                subcommand.requiresAdmin &&
                                !this.storage.get('globalAdmins').includes(msg.p._id)
                            )
                        ) {
                            this.send(this.tags.failure_mpp + this.giveNoPermissionMessage())
                            return false
                        } else {
                            subcommand.func(args.slice(1), msg)
                        }
                    }
                }
            }
            return true
        } catch (err) {
            this.send(this.tags.failure_mpp + `AHH! - \`\`\`${err.message}\`\`\``)
            console.log(this.tags.error + `${err.stack}`)
        }
    }
    start() {
        this.client.start()
    }
}