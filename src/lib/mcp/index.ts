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
import listCampaignsTool from "./tools/list-campaigns";
import getCampaignTool from "./tools/get-campaign";
import generateVideoScriptsTool from "./tools/generate-video-scripts";
import listContentWaitingForApprovalTool from "./tools/list-content-waiting-for-approval";
import searchApolloLeadsTool from "./tools/search-apollo-leads";
import qualifyLeadsTool from "./tools/qualify-leads";
import draftOutreachSequenceTool from "./tools/draft-outreach-sequence";
import listPublishingQueueTool from "./tools/list-publishing-queue";
import scheduleShareHandoffTool from "./tools/schedule-share-handoff";

const projectRef = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "project-ref-unset";

export default defineMcp({
  name: "influencer-echo",
  title: "Echo Your Influence",
  version: "0.2.0",
  instructions:
    "Tools for Echo Your Influence: run the unified campaign spine (product brief → strategy → content pack → outbound → publishing), ingest affiliate products, generate influencer scripts and video drafts, manage personas, search and qualify Apollo leads, draft outreach sequences, queue Share-Sheet hand-offs, and build tracked affiliate links. Every tool acts only on the signed-in user's own organization data. Actions that spend credits, call the user's Apollo account, or write to their publishing calendar require an explicit confirm=true after asking the user. Never present a hand-off as published: only a user confirmation marks a post as posted, and no statistics or results may be invented.",
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
    listCampaignsTool,
    getCampaignTool,
    generateVideoScriptsTool,
    listContentWaitingForApprovalTool,
    searchApolloLeadsTool,
    qualifyLeadsTool,
    draftOutreachSequenceTool,
    listPublishingQueueTool,
    scheduleShareHandoffTool,
  ],
});
