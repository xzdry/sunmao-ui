// import { CompInfo } from 'comps/editorState';
// import _ from 'lodash';
import { CompletionContext } from './codeMirror';

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

export function checkCursorInBinding(
  context: CompletionContext,
  isFunction?: boolean
): boolean {
  if (isFunction) {
    return true;
  }
  const { state, pos } = context;
  const doc = state.sliceDoc(0, pos);
  const segments = getDynamicStringSegments(doc);
  let cumCharCount = 0;
  for (const segment of segments) {
    const start = cumCharCount;
    const dynamicStart = segment.indexOf('{{');
    const dynamicDoesStart = dynamicStart > -1;
    const dynamicStartIdx = dynamicStart + start + 2;

    const dynamicEnd = segment.indexOf('}}');
    const dynamicDoesEnd = dynamicEnd > -1;
    const dynamicEndIdx = dynamicEnd + start;

    if (
      dynamicDoesStart &&
      dynamicStartIdx <= pos &&
      (!dynamicDoesEnd || pos <= dynamicEndIdx)
    ) {
      return true;
    }

    cumCharCount += segment.length;
  }
  return false;
}

// export function transformCompInfoIntoRecord(
//   compInfo: Array<CompInfo>
// ): Record<string, unknown> {
//   return _.fromPairs(compInfo.map(info => [info.name, info.data]));
// }
