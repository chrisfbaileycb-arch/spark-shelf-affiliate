import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listProductsTool from "./tools/list-products";
import getProductTool from "./tools/get-product";
import ingestProductTool from "./tools/ingest-product";
import listVideosTool from "./tools/list-videos";
import getVideoTool from "./tools/get-video";
import listPersonasTool from "./tools/list-personas";
import generateScriptTool from "./tools/generate-script";
import createVideoDraftTool from "./tools/create-video-draft";
import listAffiliateProgramsTool from "./tools/list-affiliate-programs";
import createAffiliateProgramTool from "./tools/create-affiliate-program";
import createAffiliateLinkTool from "./tools/create-affiliate-link";
import checkCreditBalanceTool from "./tools/check-credit-balance";

const projectRef = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "project-ref-unset";

export default defineMcp({
  name: "influencer-echo",
  title: "Influencer Echo",
  version: "0.1.0",
  instructions:
    "Tools for ReelRipper / Influencer Echo: ingest affiliate products, generate influencer scripts, create video drafts, manage personas, build tracked affiliate short links, and check rendering credits. All tools act on behalf of the signed-in user.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    listProductsTool,
    getProductTool,
    ingestProductTool,
    listVideosTool,
    getVideoTool,
    listPersonasTool,
    generateScriptTool,
    createVideoDraftTool,
    listAffiliateProgramsTool,
    createAffiliateProgramTool,
    createAffiliateLinkTool,
    checkCreditBalanceTool,
  ],
});
