// import: constants
import fs from 'node:fs'

// code
export class StorageStream {
    current: Record<string, any> = {}
    path: string
    constructor(path: string) {
        this.path = path ?? 'storage.json'
        if (!fs.existsSync(this.path)) {
            fs.writeFileSync(this.path, '{}', 'utf-8')
        } else
            this.current = JSON.parse(fs.readFileSync(this.path, 'utf-8'))
    }
    set(key: string, value: any): any {
        this.current[key] = value
        fs.writeFileSync(this.path, JSON.stringify(this.current, null, 4), 'utf-8')
        return this.current[key]
    }
    get(key: string): any {
        return this.current[key]
    }
    has(key: string) {
        return key in this.current
    }
    update() {
        fs.writeFileSync(this.path, JSON.stringify(this.current, null, 4), 'utf-8')
    }
    remove(key: string): boolean {
        if (key in this.current) {
            delete this.current[key]
            fs.writeFileSync(this.path, JSON.stringify(this.current, null, 4), 'utf-8')
            return true
        }
        return false
    }
}