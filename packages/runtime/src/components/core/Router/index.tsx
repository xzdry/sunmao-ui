import { Static, Type } from '@sinclair/typebox';
import { createComponent } from '@sunmao-ui/core';
import { ComponentImplementation } from '../../../services/registry';
import { Switch } from './component';

const Router: ComponentImplementation<{
  switchPolicy: Static<typeof SwitchPolicyPropertySchema>;
  nested?: boolean;
}> = ({ slotsMap, switchPolicy, subscribeMethods, mergeState }) => {
  return (
    <Switch
      slotMap={slotsMap}
      switchPolicy={switchPolicy}
      subscribeMethods={subscribeMethods}
      mergeState={mergeState}
    ></Switch>
  );
};

export enum RouteType {
  REDIRECT = 'REDIRECT',
  ROUTE = 'ROUTE',
}

export type SwitchPolicy = Static<typeof SwitchPolicyPropertySchema>;

const SwitchPolicyPropertySchema = Type.Array(
  Type.Object({
    type: Type.Enum(RouteType), // redirect, route
    default: Type.Boolean(), //only the first one with default will be treated as default component;
    path: Type.String(),
    slotId: Type.String(),
    href: Type.Optional(Type.String()), // work for redirect
    strict: Type.Optional(Type.Boolean()),
    exact: Type.Optional(Type.Boolean()),
    sensitive: Type.Optional(Type.Boolean()),
  })
);

const PropsSchema = Type.Object({
  switchPolicy: Type.Array(
    Type.Object({
      type: Type.Enum(RouteType), // redirect, route
      default: Type.Boolean(), //only the first one with default will be treated as default component;
      path: Type.String(),
      slotId: Type.String(),
      href: Type.Optional(Type.String()), // work for redirect
      strict: Type.Optional(Type.Boolean()),
      exact: Type.Optional(Type.Boolean()),
      sensitive: Type.Optional(Type.Boolean()),
    })
  ),
});

export default {
  ...createComponent({
    version: 'core/v1',
    metadata: {
      name: 'router',
      displayName: 'Router',
      description: 'create a router-controlled component',
      isDraggable: true,
      isResizable: true,
      exampleProperties: {
        switchPolicy: [],
      },
      exampleSize: [6, 6],
    },
    spec: {
      properties: PropsSchema,
      state: {},
      methods: [],
      // route slots are dynamic
      slots: [],
      styleSlots: [],
      events: [],
    },
  }),
  impl: Router,
};
