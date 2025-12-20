// declaration
export interface TagList {
    /**
     * The tag used to log `[INFO]` messages to console.
     */
    info: string
    /**
     * The tag used to log `[WARN]` messages to console.
     */
    warn: string
    /**
     * The tag used to log `[ERROR]` messages to console.
     */
    error: string
    /**
     * The tag used to send success messages in MPP.
     */
    success_mpp: string
    /**
     * The tag used to send info messages in MPP.
     */
    info_mpp: string
    /**
     * The tag used to send faliure messages in MPP.
     */
    failure_mpp: string
}