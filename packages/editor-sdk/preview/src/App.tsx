import React, { useState } from 'react';
import reactLogo from './assets/react.svg';
import viteLogo from '/vite.svg';
import { CodeEditor } from '../../src/components/codeEditor/codeEditor';

function App() {
  const [value, setValue] = useState();

  return (
    <>
      <div>xzdry editor</div>
      <CodeEditor
        value={value}
        onChange={state => {
          console.log('onChange', state);
          // setValue(state);
        }}
        exposingData={{ a: 1, b: 2 }}
      />
    </>
  );
}

export default App;
