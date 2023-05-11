const DYNAMIC_SEGMENT_REGEX = /{{([\s\S]*?)}}/;

export function isDynamicSegment(segment: string): boolean {
    return DYNAMIC_SEGMENT_REGEX.test(segment);
}

export function getDynamicStringSegments(input: string): string[] {
    const segments = [];
    let position = 0;
    let start = input.indexOf('{{');
    while (start >= 0) {
        let i = start + 2;
        while (i < input.length && input[i] === '{') i++;
        let end = input.indexOf('}}', i);
        if (end < 0) {
            break;
        }
        const nextStart = input.indexOf('{{', end + 2);
        const maxIndex = nextStart >= 0 ? nextStart : input.length;
        const maxStartOffset = i - start - 2;
        let sum = i - start;
        let minValue = Number.MAX_VALUE;
        let minOffset = Number.MAX_VALUE;
        for (; i < maxIndex; i++) {
            switch (input[i]) {
                case '{':
                    sum++;
                    break;
                case '}':
                    sum--;
                    if (input[i - 1] === '}') {
                        const offset = Math.min(Math.max(sum, 0), maxStartOffset);
                        const value = Math.abs(sum - offset);
                        if (value < minValue || (value === minValue && offset < minOffset)) {
                            minValue = value;
                            minOffset = offset;
                            end = i + 1;
                        }
                    }
                    break;
            }
        }
        segments.push(
            input.slice(position, start + minOffset),
            input.slice(start + minOffset, end)
        );
        position = end;
        start = nextStart;
    }
    segments.push(input.slice(position));
    return segments.filter(t => t);
}

const globalVarNames = new Set<PropertyKey>(["window", "globalThis", "self", "global"]);
const functionBlacklist = new Set<PropertyKey>([
    "top",
    "parent",
    "document",
    "location",
    "chrome",
    "fetch",
    "XMLHttpRequest",
    "importScripts",
    "Navigator",
    "MutationObserver",
]);

const expressionBlacklist = new Set<PropertyKey>([
    ...Array.from(functionBlacklist.values()),
    "setTimeout",
    "setInterval",
    "setImmediate",
]);

function proxySandbox(context: any, methods?: any, options?: any) {
    const { disableLimit = false, scope = "expression", onSetGlobalVars } = options || {};

    const isProtectedVar = (key: PropertyKey) => {
        return key in context || key in (methods || {}) || globalVarNames.has(key);
    };

    const cache = {};
    const blacklist = scope === "function" ? functionBlacklist : expressionBlacklist;

    if (scope === "function" || !mockWindow || disableLimit !== currentDisableLimit) {
        mockWindow = createMockWindow(mockWindow, blacklist, onSetGlobalVars, disableLimit);
    }
    currentDisableLimit = disableLimit;

    return new Proxy(mockWindow, {
        has(target, p) {
            // proxy all variables
            return true;
        },
        get(target, p, receiver) {
            if (p === Symbol.unscopables) {
                return undefined;
            }

            if (p === "toJSON") {
                return target;
            }

            if (globalVarNames.has(p)) {
                return target;
            }

            if (p in context) {
                if (p in cache) {
                    return Reflect.get(cache, p);
                }
                let value = Reflect.get(context, p, receiver);
                if (typeof value === "object" && value !== null) {
                    if (methods && p in methods) {
                        value = Object.assign({}, value, Reflect.get(methods, p));
                    }
                    Object.freeze(value);
                    Object.values(value).forEach(Object.freeze);
                }
                Reflect.set(cache, p, value);
                return value;
            }

            if (disableLimit) {
                return getPropertyFromNativeWindow(p);
            }

            return Reflect.get(target, p, receiver);
        },

        set(target, p, value, receiver) {
            if (isProtectedVar(p)) {
                throw new Error(p.toString() + " can't be modified");
            }
            return Reflect.set(target, p, value, receiver);
        },

        defineProperty(target, p, attributes) {
            if (isProtectedVar(p)) {
                throw new Error("can't define property:" + p.toString());
            }
            return Reflect.defineProperty(target, p, attributes);
        },

        deleteProperty(target, p) {
            if (isProtectedVar(p)) {
                throw new Error("can't delete property:" + p.toString());
            }
            return Reflect.deleteProperty(target, p);
        },

        setPrototypeOf(target, v) {
            throw new Error("can't invoke setPrototypeOf");
        },
    });
}


export function evalScript(script: string, context: any, methods?: any) {
    return evalFunc(`return (${script}\n);`, context, methods);
}

export function evalFunc(
    functionBody: string,
    context: any,
    methods?: any,
    options?: any,
    isAsync?: boolean
) {
    const code = `with(this){
      return (${isAsync ? "async " : ""}function() {
        'use strict';
        ${functionBody};
      }).call(this);
    }`;

    // eslint-disable-next-line no-new-func
    const vm = new Function(code);
    const sandbox = proxySandbox(context, methods, options);
    const result = vm.call(sandbox);
    return result;
}