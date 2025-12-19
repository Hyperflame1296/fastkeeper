// import: classes
import { Client } from 'mpp-client-net'

// declaration
export interface Subcommand {
    name: string
    desc?: string
    syntax: string
    permissionLevel?: number
    requiresAdmin?: boolean
    func: (client: Client, args?: string[], msg?: any) => void
}