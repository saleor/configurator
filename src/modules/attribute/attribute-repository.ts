import { Attribute } from "./types";

export interface AttributeRepository {
  create(attribute: Omit<Attribute, "id">): Promise<Attribute>;
  update(id: string, attribute: Partial<Attribute>): Promise<Attribute>;
  delete(id: string): Promise<void>;
  findAll(): Promise<Attribute[]>;
}
