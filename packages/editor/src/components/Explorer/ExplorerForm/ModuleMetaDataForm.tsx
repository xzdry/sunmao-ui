import React from 'react';
import { FormControl, FormLabel, Input, VStack } from '@chakra-ui/react';
import { useFormik } from 'formik';
import { observer } from 'mobx-react-lite';
import { editorStore } from '../../../EditorStore';
import { KeyValueEditor } from '../../KeyValueEditor';

type ModuleMetaDataFormData = {
  name: string;
  version: string;
  stateMap: Record<string, string>;
};

type ModuleMetaDataFormProps = {
  initData: ModuleMetaDataFormData;
};

export const ModuleMetaDataForm: React.FC<ModuleMetaDataFormProps> = observer(
  ({ initData }) => {
    const onSubmit = (value: ModuleMetaDataFormData) => {
      editorStore.appStorage.saveModuleMetaDataInLS(
        { originName: initData.name, originVersion: initData.version },
        value
      );
    };
    const formik = useFormik({
      initialValues: initData,
      onSubmit,
    });
    return (
      <VStack>
        <FormControl isRequired>
          <FormLabel>Module Version</FormLabel>
          <Input
            name="version"
            value={formik.values.version}
            onChange={formik.handleChange}
            onBlur={() => formik.submitForm()}
          />
        </FormControl>
        <FormControl isRequired>
          <FormLabel>Module Name</FormLabel>
          <Input
            name="name"
            value={formik.values.name}
            onChange={formik.handleChange}
            onBlur={() => formik.submitForm()}
          />
        </FormControl>
        <FormControl>
          <FormLabel>Module StateMap</FormLabel>
          <KeyValueEditor
            initValue={formik.values.stateMap}
            onChange={json => {
              formik.setFieldValue('stateMap', json);
              formik.submitForm();
            }}
          />
        </FormControl>
      </VStack>
    );
  }
);
