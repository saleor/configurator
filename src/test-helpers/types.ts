// Fetch options type for GraphQL mock
export interface GraphQLFetchOptions {
  method?: string;
  headers?: Record<string, string> | Headers;
  body?: string;
}
