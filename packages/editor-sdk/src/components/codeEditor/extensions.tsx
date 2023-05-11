import {
  acceptCompletion,
  autocompletion,
  closeCompletion,
  moveCompletionSelection,
} from '@codemirror/autocomplete';
import {  Prec } from '@codemirror/state';
import { TernServer } from './completion/ternServer';
import {  useCallback, useMemo } from 'react';
import { CodeEditorProps } from './codeEditorTypes';
import {
  Compartment,
  EditorView,
  keymap,
  StateEffect,
} from './codeMirror';
import { CompletionSource } from './completion/completion';

export const libNames = new Set(['uuid', 'numbro', 'Papa']);


const keyMapExtensions = Prec.highest(
  keymap.of([
    // {key: "Ctrl-Space", run: startCompletion},
    { key: 'Escape', run: closeCompletion },
    { key: 'ArrowDown', run: moveCompletionSelection(true) },
    { key: 'Ctrl-n', run: moveCompletionSelection(true) },
    { key: 'ArrowUp', run: moveCompletionSelection(false) },
    { key: 'Ctrl-p', run: moveCompletionSelection(false) },
    { key: 'PageDown', run: moveCompletionSelection(true, 'page') },
    { key: 'PageUp', run: moveCompletionSelection(false, 'page') },
    { key: 'Tab', run: acceptCompletion },
    { key: 'Enter', run: acceptCompletion },
  ])
);



export function useCompletionSources(props: CodeEditorProps) {
  const { language, codeType } = props;

  // javascript syntax auto-completion
  const ternServer = new TernServer();


  const completionSources = useMemo(() => {
    const sources: CompletionSource[] = [];
    if (language === 'css') {
      // sources.push(cssCompletionSource);
    } else {
      //   sources.push(exposingSource);
      if (ternServer) {
        sources.push(ternServer);
      }
    }
    return sources.map(c => {
      c.setIsFunction(codeType === 'Function');
      return c.completionSource;
    });
  }, [language, ternServer, codeType]);
  return completionSources;
}

export function useAutocompletionExtension(props: CodeEditorProps) {
  const completions = useCompletionSources(props);
  return useMemo(
    () => [
      autocompletion({
        override: completions,
        defaultKeymap: false,
        closeOnBlur: false,
        // maxRenderedOptions:100000,
      }),
      keyMapExtensions,
    ],
    [completions]
  );
}

const compartments: Compartment[] = [];

export function useExtensions(props: CodeEditorProps) {
  // cache the frequently changed data into ref, avoiding reconfigure
  const autocompletionExtension = useAutocompletionExtension(props);
  console.log('autocompletionExtension', autocompletionExtension);
  const rawExtensions = useMemo(
    () => [autocompletionExtension],
    [autocompletionExtension]
  );
  const extensions = useMemo(() => {
    // auto build global Compartments
    for (let i = compartments.length; i < rawExtensions.length; ++i) {
      compartments.push(new Compartment());
    }
    return rawExtensions.map((e, i) => compartments[i].of(e));
  }, [rawExtensions]);
  // reconfiguration as a baseline, actually extensions remains unchanged.
  const reconfigure = useCallback(
    (view?: EditorView) => {
      if (view) {
        const effects: StateEffect<unknown>[] = [];
        rawExtensions.forEach((e, i) => {
          if (compartments[i].get(view.state) !== e) {
            effects.push(compartments[i].reconfigure(e));
          }
        });
        if (effects.length > 0) {
          view.dispatch({ effects });
        }
      }
    },
    [rawExtensions]
  );
  return { extensions, reconfigure, isFocus: false };
}
