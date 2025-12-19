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
     * Logging options.
     */
    log?: {
        /**
         * Whether to log the game chat or not.
         * @default 'true'
         */
        chat?: boolean
    }
}