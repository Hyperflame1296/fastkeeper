// declaration
export interface Subcommand {
    name: string
    desc?: string
    syntax: string
    permissionLevel?: number
    requiresAdmin?: boolean
    func: (args?: string[], msg?: any) => void
}