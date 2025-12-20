// code
export const util = {
    lang: {
        possessive: (str: string): string => {
            return `${str}${str.endsWith('s') ? '\'' : '\'s'}`
        }
    },
    math: {
        mod: (x: number, y: number) => x - y * Math.floor(x / y)
    }
}