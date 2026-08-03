// Lightweight heuristic for suggesting the most likely affiliate program for a product URL.
// The user still has to enroll themselves and store their tracking IDs.

export interface NetworkSuggestion {
  network: string;
  name: string;
  signupUrl: string;
  notes: string;
}

export function suggestNetworkForDomain(domain: string): NetworkSuggestion {
  const d = domain.toLowerCase();
  if (d.includes("amazon.")) {
    return {
      network: "amazon-associates",
      name: "Amazon Associates",
      signupUrl: "https://affiliate-program.amazon.com",
      notes: "Append ?tag=YOURTAG-20 to the product URL.",
    };
  }
  if (d.includes("tiktok.com") || d.includes("shop.tiktok") || d.includes("vt.tiktok")) {
    return {
      network: "tiktok-shop",
      name: "TikTok Shop Affiliate",
      signupUrl: "https://affiliate.tiktok.com",
      notes: "Generate a creator link inside TikTok Shop's affiliate center.",
    };
  }
  if (d.includes("aliexpress")) {
    return {
      network: "aliexpress-portals",
      name: "AliExpress Affiliate (Portals)",
      signupUrl: "https://portals.aliexpress.com",
      notes: "Generate a deep link via Portals.",
    };
  }
  if (d.includes("shopee")) {
    return {
      network: "shopee-affiliate",
      name: "Shopee Affiliate",
      signupUrl: "https://affiliate.shopee.com",
      notes: "Use Shopee's affiliate link generator.",
    };
  }
  if (d.includes("etsy.")) {
    return {
      network: "awin-etsy",
      name: "Etsy via Awin",
      signupUrl: "https://www.awin.com",
      notes: "Etsy runs its affiliate program through Awin.",
    };
  }
  if (d.includes("walmart.")) {
    return {
      network: "walmart-impact",
      name: "Walmart Creator (Impact)",
      signupUrl: "https://creator.walmart.com",
      notes: "Apply to Walmart Creator, then generate links in Impact.",
    };
  }
  if (d.includes("target.")) {
    return {
      network: "target-impact",
      name: "Target Partners (Impact)",
      signupUrl: "https://partners.target.com",
      notes: "Approved partners generate links through Impact.",
    };
  }
  if (d.includes("sephora")) {
    return {
      network: "rakuten-sephora",
      name: "Sephora via Rakuten",
      signupUrl: "https://rakutenadvertising.com",
      notes: "Sephora's program runs on Rakuten Advertising.",
    };
  }
  return {
    network: "shareasale-impact",
    name: "ShareASale / Impact / CJ",
    signupUrl: "https://www.shareasale.com",
    notes:
      "Check the brand's footer for an 'Affiliates' link — most run on ShareASale, Impact, or CJ.",
  };
}
