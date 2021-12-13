import {
  AllComponentsValidatorRule,
  ComponentValidatorRule,
  TraitValidatorRule,
  AllComponentsValidateContext,
  ComponentValidateContext,
  TraitValidateContext,
} from './interfaces';
import { ValidateResult } from './ValidateResult';

export class RepeatIdValidatorRule implements AllComponentsValidatorRule {
  kind: 'allComponents' = 'allComponents';

  validate({ components }: AllComponentsValidateContext): ValidateResult[] {
    const componentIds = new Set<string>();
    const results: ValidateResult[] = [];
    components.forEach(component => {
      if (componentIds.has(component.id)) {
        results.push(
          new ValidateResult('Duplicate component id.', component.id, '', () => {
            component.id = `${component.id}_${Math.floor(Math.random() * 10000)}`;
          })
        );
      } else {
        componentIds.add(component.id);
      }
    });
    return results;
  }
}

export class ParentValidatorRule implements AllComponentsValidatorRule {
  kind: 'allComponents' = 'allComponents';

  validate({ components }: AllComponentsValidateContext): ValidateResult[] {
    const results: ValidateResult[] = [];
    const componentIds = components.map(component => component.id);
    components.forEach(c => {
      const slotTrait = c.traits.find(t => t.type === 'core/v1/slot');
      if (slotTrait) {
        const { id: parentId } = slotTrait.properties.container as any;
        if (!componentIds.includes(parentId)) {
          results.push(
            new ValidateResult(
              `Cannot find parent component: ${parentId}.`,
              c.id,
              slotTrait.type,
              () => {
                slotTrait.properties.container = {
                  id: componentIds[0],
                  slot: 'content',
                };
              }
            )
          );
        }
      }
    });
    return results;
  }
}

export class ComponentPropertyValidatorRule implements ComponentValidatorRule {
  kind: 'component' = 'component';

  validate({ component, registry, ajv }: ComponentValidateContext): ValidateResult[] {
    const results: ValidateResult[] = [];
    const spec = registry.getComponentByType(component.type);
    if (!spec) {
      results.push(
        new ValidateResult(`Cannot find component spec: ${component.type}.`, component.id)
      );
      return results;
    }

    const propertySchema = spec.spec.properties;
    const regExp = new RegExp('.*{{.*}}.*');

    const validate = ajv.compile(propertySchema);
    const valid = validate(component.properties);
    if (!valid) {
      validate.errors!.forEach(error => {
        const readablePath = error.instancePath ? error.instancePath.slice(1).replace("/", '.') : '';
        let errorMsg = `${readablePath} ${error.message}`;
        if (error.keyword === 'type') {
          const { instancePath } = error;
          const path = instancePath.split('/')[1];
          const value = component.properties[path];

          if (typeof value === 'string' && regExp.test(value)) {
            return;
          } else {
            errorMsg = `Property '${error.instancePath.slice(1).replace("/", '.')}' must be ${error.params.type}.`;
          }
        }

        results.push(new ValidateResult(errorMsg || '', component.id));
      });
    }
    return results;
  }
}
export class TraitPropertyValidatorRule implements TraitValidatorRule {
  kind: 'trait' = 'trait';

  validate({ trait, component, registry, ajv }: TraitValidateContext): ValidateResult[] {
    const results: ValidateResult[] = [];
    const spec = registry.getTraitByType(trait.type);
    if (!spec) {
      results.push(
        new ValidateResult(
          `Cannot find trait spec: ${trait.type}.`,
          component.id,
          trait.type,
        )
      );
      return results;
    }

    const propertySchema = spec.spec.properties;
    const regExp = new RegExp('.*{{.*}}.*');

    const validate = ajv.compile(propertySchema);
    const valid = validate(trait.properties);
    if (!valid) {
      validate.errors!.forEach(error => {
        const readablePath = error.instancePath ? error.instancePath.slice(1).replace("/", '.') : '';
        let errorMsg = `${readablePath} ${error.message}`;
        if (error.keyword === 'type') {
          const { instancePath } = error;
          const path = instancePath.split('/')[1];
          const value = trait.properties[path];

          if (typeof value === 'string' && regExp.test(value)) {
            return;
          } else {
            errorMsg = `Property '${readablePath}' must be ${error.params.type}.`;
          }
        }
        results.push(new ValidateResult(errorMsg || '', component.id, trait.type));
      });
    }
    return results;
  }
}

export const rules = [
  new RepeatIdValidatorRule(),
  new ParentValidatorRule(),
  new ComponentPropertyValidatorRule(),
  new TraitPropertyValidatorRule(),
];
