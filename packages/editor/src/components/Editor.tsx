import { useMemo, useState } from 'react';
import { Application } from '@sunmao-ui/core';
import { GridCallbacks, DIALOG_CONTAINER_ID, initSunmaoUI } from '@sunmao-ui/runtime';
import { Box, Tabs, TabList, Tab, TabPanels, TabPanel, Flex } from '@chakra-ui/react';
import { observer } from 'mobx-react-lite';
import { StructureTree } from './StructureTree';
import { eventBus } from '../eventBus';
import { ComponentList } from './ComponentsList';
import { EditorHeader } from './EditorHeader';
import { KeyboardEventWrapper } from './KeyboardEventWrapper';
import { ComponentWrapper } from './ComponentWrapper';
import { StateEditor, SchemaEditor } from './CodeEditor';
import { Explorer } from './Explorer';
import { editorStore } from '../EditorStore';
import { genOperation } from '../operations';
import { ComponentForm } from './ComponentForm';
import ErrorBoundary from './ErrorBoundary';
import { PreviewModal } from './PreviewModal';
import { WarningArea } from './WarningArea';

type ReturnOfInit = ReturnType<typeof initSunmaoUI>;

type Props = {
  App: ReturnOfInit['App'];
  registry: ReturnOfInit['registry'];
  stateStore: ReturnOfInit['stateManager']['store'];
};

export const Editor: React.FC<Props> = observer(({ App, registry, stateStore }) => {
  const { components, selectedComponentId, modules } = editorStore;

  const [scale, setScale] = useState(100);
  const [preview, setPreview] = useState(false);
  const [codeMode, setCodeMode] = useState(false);
  const [code, setCode] = useState('');

  const gridCallbacks: GridCallbacks = useMemo(() => {
    return {
      // drag an existing component
      onDragStop(id, layout) {
        eventBus.send(
          'operation',
          genOperation('modifyComponentProperty', {
            componentId: id,
            properties: { layout },
          })
        );
      },
      // drag a new component from tool box
      onDrop(id, layout, _, e) {
        const component = e.dataTransfer?.getData('component') || '';
        eventBus.send(
          'operation',
          genOperation('createComponent', {
            componentType: component,
            parentId: id,
            slot: 'content',
            layout,
          })
        );
      },
    };
  }, []);

  const app = useMemo<Application>(() => {
    return {
      version: 'sunmao/v1',
      kind: 'Application',
      metadata: {
        name: 'some App',
      },
      spec: {
        components,
      },
    };
  }, [components]);

  const appComponent = useMemo(() => {
    return (
      <ErrorBoundary>
        <App
          options={app}
          debugEvent={false}
          debugStore={false}
          gridCallbacks={gridCallbacks}
          componentWrapper={ComponentWrapper}
        />
      </ErrorBoundary>
    );
  }, [app, gridCallbacks]);

  const renderMain = () => {
    const appBox = (
      <Box flex="1" background="gray.50" p={1} overflow="hidden">
        <Box
          width="full"
          height="full"
          background="white"
          overflow="auto"
          transform={`scale(${scale / 100})`}
          position="relative"
        >
          <Box id={DIALOG_CONTAINER_ID} width="full" height="full" position="absolute" />
          <Box width="full" overflow="auto">
            {appComponent}
          </Box>
          <WarningArea />
        </Box>
      </Box>
    );

    if (codeMode) {
      return (
        <Flex width="100%" height="100%">
          <Box flex="1">
            <SchemaEditor defaultCode={JSON.stringify(app, null, 2)} onChange={setCode} />
          </Box>
          {appBox}
        </Flex>
      );
    }
    return (
      <>
        <Box width="280px" minWidth="280px" borderRightWidth="1px" borderColor="gray.200">
          <Tabs
            align="center"
            height="100%"
            display="flex"
            flexDirection="column"
            textAlign="left"
            isLazy
          >
            <TabList background="gray.50">
              <Tab>Explorer</Tab>
              <Tab>UI Tree</Tab>
              <Tab>State</Tab>
            </TabList>
            <TabPanels flex="1" overflow="auto">
              <TabPanel>
                <Explorer />
              </TabPanel>
              <TabPanel p={0}>
                <StructureTree
                  components={components}
                  selectedComponentId={selectedComponentId}
                  onSelectComponent={id => editorStore.setSelectedComponentId(id)}
                  registry={registry}
                />
              </TabPanel>
              <TabPanel p={0} height="100%">
                <StateEditor code={JSON.stringify(stateStore, null, 2)} />
              </TabPanel>
            </TabPanels>
          </Tabs>
        </Box>
        {appBox}
        <Box
          width="320px"
          minWidth="320px"
          borderLeftWidth="1px"
          borderColor="gray.200"
          overflow="auto"
        >
          <Tabs
            align="center"
            textAlign="left"
            height="100%"
            display="flex"
            flexDirection="column"
          >
            <TabList background="gray.50">
              <Tab>Inspect</Tab>
              <Tab>Insert</Tab>
            </TabList>
            <TabPanels flex="1" overflow="auto" background="gray.50">
              <TabPanel p={0}>
                <ComponentForm registry={registry} />
              </TabPanel>
              <TabPanel p={0}>
                <ComponentList registry={registry} />
              </TabPanel>
            </TabPanels>
          </Tabs>
        </Box>
      </>
    );
  };

  return (
    <KeyboardEventWrapper
      components={components}
      selectedComponentId={selectedComponentId}
    >
      <Box display="flex" height="100%" width="100%" flexDirection="column">
        <EditorHeader
          scale={scale}
          setScale={setScale}
          onPreview={() => setPreview(true)}
          codeMode={codeMode}
          onCodeMode={v => {
            setCodeMode(v);
            if (!v && code) {
              eventBus.send(
                'operation',
                genOperation('replaceApp', {
                  app: JSON.parse(code).spec.components,
                })
              );
            }
          }}
        />
        <Box display="flex" flex="1" overflow="auto">
          {renderMain()}
        </Box>
      </Box>
      {preview && (
        <PreviewModal onClose={() => setPreview(false)} app={app} modules={modules} />
      )}
    </KeyboardEventWrapper>
  );
});
