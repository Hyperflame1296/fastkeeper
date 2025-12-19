// code
export const util = {
    lang: {
        possessive: (str: string): string => {
            return `${str}${str.endsWith('s') ? '\'' : '\'s'}`
        }
    }
}