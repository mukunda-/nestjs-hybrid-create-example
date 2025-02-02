// nestjs-hybrid-create-example
// (C) 2025 Mukunda Johnson (mukunda.com)
// Licensed under MIT
import "reflect-metadata";
import { INestApplication, Injectable, Scope } from "@nestjs/common";
import { ModuleRef } from "@nestjs/core";
import { Test } from "@nestjs/testing";
import { createWithSupplied, Supplied, SuppliedDepProvider } from "./create-with-supplied";

// Normally objects are fully constructed from the DI container. This example shows how to
// pass additional constructor arguments during creation.
//
// The basic workflow is:
// 1. Decorate parameters in the target class that are to be manually "supplied".
// 2. Define a factory to accept the constructor arguments for the class. The factory
//    mirrors the target class's Reflect metadata.
// 3. Instantiate the factory from the container.
// 4. Pass the supplied arguments to the factory.
// 5. Instantiate the target class.
//

//////////////////////////////////////////////////////////////////////////////////////////
// Dummy service for testing DI injection alongside supplied injection.
@Injectable()
class FooService {
   async foo() {
      return "Foo";
   }
}

//////////////////////////////////////////////////////////////////////////////////////////
// Our test class, the constructor arguments combine a NestJS injected service, and a
// manually "supplied" argument.
//
// It only really makes sense for these to be TRANSIENT (REQUEST too, maybe), given that
// otherwise you would probably supply the additional argument at the time of registration
// in a factory.
@Injectable({scope: Scope.TRANSIENT})
class MySecretService {
   constructor(
      // This argument is injected by the container.
      private readonly fooService: FooService,

      // This additional argument is supplied by the creator.
      @Supplied("secret") private readonly secret: string,
   ) {
      expect(this.secret).toBe("hygge");
   }

   // Return data for test constructs.
   async doSomething() {
      const foo = await this.fooService.foo();
      return `${foo} ${this.secret}`;
   }
}

//////////////////////////////////////////////////////////////////////////////////////////
describe("Hybrid Create Example", () => {
   let app: INestApplication;
   let moduleRef: ModuleRef;

   ///////////////////////////////////////////////////////////////////////////////////////
   // Set up our testing environment that mimics the full NestJS lifecycle.
   beforeAll(async () => {
      const module = await Test.createTestingModule({
         providers: [
            FooService,

            // This supplies a dummy value to @Supplied parameters during initial
            // object creation.
            SuppliedDepProvider,
         ],
      }).compile();
      
      app = module.createNestApplication();
      await app.init();

      // --- Fetch container references here for later use ---
      moduleRef = await module.get(ModuleRef);
   });

   ///////////////////////////////////////////////////////////////////////////////////////
   test("create object with additional supplied constructor arguments", async () => {
      // MySecretService is created with a service from the container, plus the given
      // secret.
      const object = await createWithSupplied(moduleRef, MySecretService, {
         secret: "hygge",
      });

      // Make sure that it was injected properly.
      const result = object.doSomething();
      expect(result).resolves.toBe("Foo hygge");
   });

   ///////////////////////////////////////////////////////////////////////////////////////
   afterAll(async () => {
      // Clean up.
      await app.close();
   });
});
