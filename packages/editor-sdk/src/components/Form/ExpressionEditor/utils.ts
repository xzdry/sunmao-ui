import _ from "lodash";
export enum ENTITY_TYPE {
    ACTION = "ACTION",
    WIDGET = "WIDGET",
    APPSMITH = "APPSMITH",
    JSACTION = "JSACTION",
}
export const DATA_BIND_REGEX = /{{([\s\S]*?)}}/;

export const isDynamicValue = (value: string): boolean =>
    DATA_BIND_REGEX.test(value);

// {{}}{{}}}
export function getDynamicStringSegments(dynamicString: string): string[] {
    let stringSegments = [];
    const indexOfDoubleParanStart = dynamicString.indexOf("{{");
    if (indexOfDoubleParanStart === -1) {
        return [dynamicString];
    }
    // {{}}{{}}}
    const firstString = dynamicString.substring(0, indexOfDoubleParanStart);
    firstString && stringSegments.push(firstString);
    let rest = dynamicString.substring(
        indexOfDoubleParanStart,
        dynamicString.length,
    );
    // {{}}{{}}}
    let sum = 0;
    for (let i = 0; i <= rest.length - 1; i++) {
        const char = rest[i];
        const prevChar = rest[i - 1];

        if (char === "{") {
            sum++;
        } else if (char === "}") {
            sum--;
            if (prevChar === "}" && sum === 0) {
                stringSegments.push(rest.substring(0, i + 1));
                rest = rest.substring(i + 1, rest.length);
                if (rest) {
                    stringSegments = stringSegments.concat(
                        getDynamicStringSegments(rest),
                    );
                    break;
                }
            }
        }
    }
    if (sum !== 0 && dynamicString !== "") {
        return [dynamicString];
    }
    return stringSegments;
}

export function isJSAction(entity: any): entity is any {
    return (
        typeof entity === "object" &&
        "ENTITY_TYPE" in entity &&
        entity.ENTITY_TYPE === ENTITY_TYPE.JSACTION
    );
}
// {{}}{{}}}
export const getDynamicBindings = (
    dynamicString: string,
    entity?: any,
): { stringSegments: string[]; jsSnippets: string[] } => {
    // Protect against bad string parse
    if (!dynamicString || !_.isString(dynamicString)) {
        return { stringSegments: [], jsSnippets: [] };
    }
    const sanitisedString = dynamicString.trim();
    let stringSegments, paths: any;
    if (entity && isJSAction(entity)) {
        stringSegments = [sanitisedString];
        paths = [sanitisedString];
    } else {
        // Get the {{binding}} bound values
        stringSegments = getDynamicStringSegments(sanitisedString);
        // Get the "binding" path values
        paths = stringSegments.map((segment) => {
            const length = segment.length;
            const matches = isDynamicValue(segment);
            if (matches) {
                return segment.substring(2, length - 2);
            }
            return "";
        });
    }
    return { stringSegments: stringSegments, jsSnippets: paths };
};