import { ApplicationComponent } from '@sunmao-ui/core';
import { parseType } from '@sunmao-ui/runtime';
import { ComponentModel } from './ComponentModel';
import {
  ComponentId,
  ComponentType,
  IAppModel,
  IComponentModel,
  SlotName,
} from './IAppModel';
import { genComponent } from './utils';

export class AppModel implements IAppModel {
  topComponents: IComponentModel[] = [];
  // modules: IModuleModel[] = [];
  private schema: ApplicationComponent[] = [];
  private componentMap: Record<ComponentId, IComponentModel> = {};
  private componentsCount = 0;

  constructor(components: ApplicationComponent[]) {
    this.schema = components;
    this.componentsCount = components.length;
    this.resolveTree(components);
  }

  get allComponents(): IComponentModel[] {
    const result: IComponentModel[] = [];
    this.traverseTree(c => {
      result.push(c);
    });
    return result;
  }

  // get from componentMap
  get allComponentsWithOrphan(): IComponentModel[] {
    return Object.values(this.componentMap);
  }

  toSchema(): ApplicationComponent[] {
    this.schema = this.allComponents.map(c => {
      return c.toSchema();
    });

    return this.schema;
  }

  appendChild(component: IComponentModel) {
    component.parentId = null;
    component.parentSlot = null;
    component.parent = null;
    this._bindComponentToModel(component);
    if (component._slotTrait) {
      component.removeTrait(component._slotTrait.id);
    }
    this.topComponents.push(component);
  }

  createComponent(type: ComponentType, id?: ComponentId): IComponentModel {
    const component = genComponent(type, id || this.genId(type));
    return new ComponentModel(this, component);
  }

  getComponentById(componentId: ComponentId): IComponentModel | undefined {
    return this.componentMap[componentId];
  }

  removeComponent(componentId: ComponentId) {
    const comp = this.componentMap[componentId];
    delete this.componentMap[componentId];
    if (comp.parentSlot && comp.parent) {
      const children = comp.parent.children[comp.parentSlot];
      comp.parent.children[comp.parentSlot] = children.filter(c => c !== comp);
    } else {
      this.topComponents.splice(this.topComponents.indexOf(comp), 1);
    }
  }

  _bindComponentToModel(component: IComponentModel) {
    this.componentMap[component.id] = component;
    component.appModel = this;
  }

  private genId(type: ComponentType): ComponentId {
    const { name } = parseType(type);
    const newId = `${name}${this.componentsCount++}` as ComponentId;
    if (this.allComponents.some(c => c.id === newId)) {
      return this.genId(type);
    }
    return newId;
  }

  private resolveTree(components: ApplicationComponent[]) {
    const allComponents = components.map(c => {
      if (this.componentMap[c.id as ComponentId]) {
        throw new Error(`Duplicate component id: ${c.id}`);
      } else {
        const comp = new ComponentModel(this, c);
        this.componentMap[c.id as ComponentId] = comp;
        return comp;
      }
    });

    allComponents.forEach(child => {
      if (!child.parentId || !child.parentSlot) {
        this.topComponents.push(child);
        return;
      }
      const parent = this.componentMap[child.parentId];
      if (parent && parent.slots.includes(child.parentSlot)) {
        child.parent = parent;
        if (parent.children[child.parentSlot]) {
          parent.children[child.parentSlot].push(child);
        } else {
          parent.children[child.parentSlot] = [child];
        }
      }
    });
  }

  private traverseTree(cb: (c: IComponentModel) => void) {
    function traverse(root: IComponentModel) {
      cb(root);
      for (const slot in root.children) {
        root.children[slot as SlotName].forEach(child => {
          traverse(child);
        });
      }
    }
    this.topComponents.forEach(parent => {
      traverse(parent);
    });
  }
}
