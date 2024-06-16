export interface SearchQuery extends Record<any, any>{
  filter?: string;
  categories?: number[];
  version?: string;
}
