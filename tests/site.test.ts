import assert from "node:assert/strict";
import test from "node:test";
import { resolveSiteUrl } from "../src/lib/site";

test("publicação acompanha o alias Vercel atual e preserva domínio próprio", () => {
  assert.equal(resolveSiteUrl("https://raiz-orcin.vercel.app", "raiz-atlas-bice.vercel.app"), "https://raiz-atlas-bice.vercel.app");
  assert.equal(resolveSiteUrl("https://atlas.example.org", "raiz-atlas-bice.vercel.app"), "https://atlas.example.org");
  assert.equal(resolveSiteUrl(undefined, "raiz-atlas-bice.vercel.app"), "https://raiz-atlas-bice.vercel.app");
  assert.equal(resolveSiteUrl(), "http://localhost:3000");
});
