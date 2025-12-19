// import: local interfaces
import { Subcommand } from './Subcommand.js'

// import: classes
import { Client } from 'mpp-client-net'

// declaration
export interface Command {
    name: string
    desc: string
    syntax: string
    aliases?: string[]
    subcommands?: Subcommand[]
    permissionLevel?: number
    requiresAdmin?: boolean
    func?: (client: Client, args?: string[], msg?: any) => void
}