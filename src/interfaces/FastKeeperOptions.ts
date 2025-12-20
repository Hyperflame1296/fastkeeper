// declaration
export interface FastKeeperOptions {
    /**
     * The URL at which the keeper will connect to.  
     * @default 'wss://mppclone.com'
     */
    url?: string
    /**
     * The channels that the keeper will join.
     * @default 'lobby'
     */
    channels?: string[]
    /**
     * Send the `Connected!` message to MPP chat.
     * @default true
     */
    enableChatConnectionMessage?: boolean
    /**
     * Logging options.
     */
    log?: {
        /**
         * Whether to log MPP chat or not.
         * @default true
         */
        chat?: boolean
        /**
         * Whether to log any verbose info or not.
         * @default true
         */
        info?: boolean
        /**
         * Whether to log warnigns or not.
         * @default true
         */
        warn?: boolean
        /**
         * Whether to log errors or not.
         * @default true
         */
        error?: boolean
    },
    /**
     * File options.
     */
    files?: {
        /**
         * The file to get tokens from.
         * @default './tokens.json'
         */
        tokens: string,
        /**
         * The file to store data in.
         * @default './storage.json'
         */
        storage: string
    }
}