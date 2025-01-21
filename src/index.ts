import { graphql } from "gql.tada";
import { graphqlClient } from "./client";

console.log("Hello World");

const getProducts = await graphqlClient.query(
  graphql(`
    query GetProducts {
      products(first: 100) {
        edges {
          node {
            id
            name
          }
        }
      }
    }
  `),
  {}
);

console.log(getProducts.data);
