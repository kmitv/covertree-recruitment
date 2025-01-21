import { ApolloServer } from "apollo-server";
import { typeDefs } from "./models/schema";
import { resolvers } from "./controllers/resolvers";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const server = new ApolloServer({ typeDefs, resolvers });

  const { url } = await server.listen({ port: process.env.PORT || 4000 });
  console.log(`Server is running at ${url}`);
}

startServer().catch(err => {
  console.error("Error starting server:", err);
});
