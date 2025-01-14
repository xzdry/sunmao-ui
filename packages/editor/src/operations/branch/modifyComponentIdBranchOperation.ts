import { ApplicationComponent } from '@sunmao-ui/core';
import { BaseBranchOperation } from '../type';
import {
  ModifyComponentIdLeafOperation,
  UpdateSelectComponentLeafOperation,
} from '../leaf';

export type ModifyComponentIdBranchOperationContext = {
  componentId: string;
  newId: string;
};

export class ModifyComponentIdBranchOperation extends BaseBranchOperation<ModifyComponentIdBranchOperationContext> {
  do(prev: ApplicationComponent[]): ApplicationComponent[] {
    this.operationStack.insert(new ModifyComponentIdLeafOperation(this.context));

    // update selectid
    this.operationStack.insert(
      new UpdateSelectComponentLeafOperation({
        // TODO:  need a way to get selectedComponent.id here
        // componentId: ApplicationComponent[]Instance.selectedComponent?.id,
        componentId: '',
        newId: this.context.newId,
      })
    );

    return this.operationStack.reduce((prev, node) => {
      prev = node.do(prev);
      return prev;
    }, prev);
  }
}
