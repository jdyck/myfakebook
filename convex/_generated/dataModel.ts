export type Id<TableName extends string> = string & {
  readonly __tableName: TableName;
};

export type Doc<TableName extends string> = TableName extends "scores"
  ? {
      _id: Id<"scores">;
      _creationTime: number;
      ownerId: string;
      title: string;
      abc: string;
      updatedAt: number;
    }
  : never;
