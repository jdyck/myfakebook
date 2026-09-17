// This lightweight placeholder keeps the local app type-safe before the first
// `npx convex dev` run. Convex replaces the _generated directory with the
// deployment-specific bindings when a project is configured.

type FunctionArgs = {
  id?: string;
  title?: string;
  abc?: string;
  updatedAt?: number;
  [key: string]: unknown;
};

type ConvexContext = {
  auth: {
    getUserIdentity: () => Promise<{ subject: string } | null>;
  };
  db: {
    query: (table: string) => {
      withIndex: (
        name: string,
        callback: (query: { eq: (field: string, value: unknown) => unknown }) => unknown,
      ) => {
        order: (direction: "asc" | "desc") => {
          take: (count: number) => Promise<unknown[]>;
        };
      };
    };
    get: (id: unknown) => Promise<unknown>;
    patch: (id: unknown, value: Record<string, unknown>) => Promise<void>;
    insert: (table: string, value: Record<string, unknown>) => Promise<string>;
  };
};

type FunctionDefinition = {
  args?: Record<string, unknown>;
  handler: (ctx: ConvexContext, args: FunctionArgs) => unknown;
};

export const query = <Definition extends FunctionDefinition>(definition: Definition) => definition;
export const mutation = <Definition extends FunctionDefinition>(definition: Definition) => definition;
