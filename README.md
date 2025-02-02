## nestjs-hybrid-create-example

This is a [NestJS](https://nestjs.com/) example demonstrating an uncommon use case of
injecting additional custom dependencies into a transient class instance, useful if you
want to augment transient class instances with additional data that is visible in the
constructor, supplied at runtime dynamically by the creator, so it's a hybrid between
using "new" directly and using the container. Normally you would have to supply the
additional data *after* creation from the container.

This can reduce some boilerplate in some cases, but the approach is far from clean, given
that it is copying internal Reflect metadata, and possibly not supporting all injection
cases. It's certainly not a well-supported operation and could break in the future. This
is merely an interesting exercise of working with the NestJS DI system, and not
recommended for real code.

### Basic usage

See [create-with-supplied.ts](https://github.com/mukunda-/nestjs-hybrid-create-example/blob/main/src/create-with-supplied.ts). The `SuppliedDepProvider` needs to be registered.

Decorate parameters that are to be supplied manually:

```typescript
constructor(
   private readonly otherService: OtherService, // Injected from container
   @Supplied("secret") private readonly secret: string, // Injected from supplied arg
) {}
```

Assign the supplied parameters during creation:

```typescript
const instance = createWithSupplied(moduleRef, MyClass, {
   secret: "my secret value",
});
```

See [hybrid-create-example.spec.ts](https://github.com/mukunda-/nestjs-hybrid-create-example/blob/main/src/hybrid-create-example.spec.ts) for a minimal test case.
