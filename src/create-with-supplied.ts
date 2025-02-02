// nestjs-hybrid-create-example
// (C) 2025 Mukunda Johnson (mukunda.com)
// Licensed under MIT
import { Inject, Type } from "@nestjs/common";
import { SELF_DECLARED_DEPS_METADATA } from "@nestjs/common/constants";
import { ModuleRef } from "@nestjs/core";

// Provides the `createWithSupplied` function and the `@Supplied(string)` decorator.
// Decorate "supplied" constructor parameters with the `@Supplied(string)` decorator.
// Use `createWithSupplied` to create the instance with additional supplied arguments.
// `SuppliedDepProvider` needs to be registered as a provider.

//////////////////////////////////////////////////////////////////////////////////////////
// This is a metadata key to mark supplied dependencies.
export const SUPPLIED_DEPS = "supplied-deps";

//////////////////////////////////////////////////////////////////////////////////////////
// We use @Inject(SUPPLIED_DEP) to mark supplied dependencies so they are `undefined` at
// the factory step.
export const SUPPLIED_DEP = Symbol("supplied-dep");
export const SuppliedDepProvider = {
   provide: SUPPLIED_DEP,
   useValue: undefined,
};

//////////////////////////////////////////////////////////////////////////////////////////
// @Supplied(string) decorator. The user provides a token to identify the supplied 
// dependency, matching what is passed into createWithSupplied.
export function Supplied(token: string): ParameterDecorator {
   return (target: object, propertyKey: string | symbol, index: number) => {
      // NestJS source does a similar thing, saves the argument index and the token
      // in a list.
      const dependencies = Reflect.getMetadata(SUPPLIED_DEPS, target) || [];
      dependencies.push({ token, index });
      Reflect.defineMetadata(SUPPLIED_DEPS, dependencies, target);

      // Apply the @Inject(SUPPLIED_DEP) decorator.
      Inject(SUPPLIED_DEP)(target, propertyKey, index);
   };
}


//////////////////////////////////////////////////////////////////////////////////////////
// This is similar to moduleRef.create, but it lets you supply additional constructor
// arguments.
//
// Usage: await createWithSupplied(moduleRef, MySecretService, { key: value }).
export async function createWithSupplied<T = any>(
      module: ModuleRef,
      targetClass: Type<T>,
      supplied: Record<string, any>): Promise<T> {
   // List of supplied dependencies in the form [{ token, argument-index }].
   const suppliedDeps = Reflect.getMetadata(SUPPLIED_DEPS, targetClass);

   // What parameter types the target constructor expects in the form [Type, Type, ...].
   const targetParamTypes = Reflect.getMetadata("design:paramtypes", targetClass) || [];

   // NestJS self-declared dependencies from @Inject() decorators. We want to copy this to
   // our factory as well to accept those injections.
   const targetInjectDeps = Reflect.getMetadata(SELF_DECLARED_DEPS_METADATA, targetClass);

   // Create a factory class to accept the container arguments, and then augment them with
   // the supplied arguments.
   const SuppliedFactory = class {
      private constructorArgs: any[];

      // The "supplied" args will be undefined, from the @Inject(SUPPLIED_DEP) decorator.
      constructor(...args: any[]) {
         this.constructorArgs = args;
      }

      // Create and return the desired instance.
      getInstance() {
         // Replace the arguments that are marked as "supplied" with the values from the
         // `supplied` map.
         for (const sup of suppliedDeps) {
            const val = supplied[sup.token];
            if (val === undefined) {
               throw new Error(`Required supplied dependency "${sup.token}" not provided.`);
            }
            this.constructorArgs[sup.index] = val;
         }
         return new targetClass(...this.constructorArgs);
      }
   }

   // Copy the metadata from the target class to our factory class.
   Reflect.defineMetadata("design:paramtypes", targetParamTypes, SuppliedFactory);
   Reflect.defineMetadata(SELF_DECLARED_DEPS_METADATA, targetInjectDeps, SuppliedFactory);

   // Create the factory and then return the final instance with the additional supplied
   // arguments.
   const factory = await module.create(SuppliedFactory);
   return factory.getInstance();
}
