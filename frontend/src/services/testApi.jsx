import { api } from "./api";

export const testApi = async () => {
  console.log("Testing API connection...");

  // Test 1: Check if API is reachable
  const result = await api.get("songs");
  console.log("API Test Result:", result);

  return result;
};
