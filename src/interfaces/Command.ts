// import: local interfaces
import { Subcommand } from './Subcommand.js'

// declaration
export interface Command {
    name: string
    desc: string
    syntax: string
    aliases?: string[]
    subcommands?: Subcommand[]
    permissionLevel?: number
    requiresAdmin?: boolean
    func?: (args?: string[], msg?: any) => void
}