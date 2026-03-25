import { NextResponse } from "next/server";

const LINEAR_API_KEY = process.env.LINEAR_API_KEY || "";
const LINEAR_TEAM_ID = process.env.LINEAR_TEAM_ID || "e560f00e-98cb-41b3-99e1-e07ede804cc3";

// ── Config (matches mission-control-web.py) ──

const MC_CONFIG = {
  orgs: {
    primesight: {
      label: "PrimeSight",
      showNetwork: true,
      pillars: {
        technology: {
          label: "Technology",
          css: "tech",
          projects: ["Prism V1", "Venue OS", "Axiom Platform", "Plexus", "Sentinel"],
        },
        revenue: {
          label: "Revenue",
          css: "rev",
          projects: ["Vector", "Website Rewrite"],
        },
        operations: {
          label: "Operations",
          css: "ops",
          projects: [],
        },
      },
    },
    glasscast: {
      label: "GlassCast",
      showNetwork: false,
      pillars: {
        revenue: {
          label: "Revenue",
          css: "rev",
          projects: ["Menu Board Business"],
        },
        operations: {
          label: "Operations",
          css: "ops",
          projects: ["D2P Dispute", "Firefly/LG Deployment"],
        },
      },
    },
    personal: {
      label: "Personal",
      showNetwork: false,
      pillars: {
        all: {
          label: "Projects",
          css: "personal",
          projects: ["OpenClaw / Muther Infra", "Mission Control", "Screen Pipe Setup", "Canvas App", "SMS Hub"],
        },
      },
    },
  },
  projectGroups: {
    Sentinel: {
      sub: ["Screen Pulse", "Network Ops"],
      names: { "Screen Pulse": "Screen Pulse", "Network Ops": "Network Ops" },
    },
    "Venue OS": {
      sub: ["Video Content Engine", "SMS Hub"],
      names: { "Video Content Engine": "Venue Prism", "SMS Hub": "Portal" },
    },
    "Prism V1": {
      sub: ["Prism V1", "Video Content Engine"],
      names: { "Prism V1": "Advertiser Prism", "Video Content Engine": "Venue Prism" },
    },
  },
};

// ── Linear GraphQL helper ──

async function gql(query: string) {
  const res = await fetch("https://api.linear.app/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: LINEAR_API_KEY,
    },
    body: JSON.stringify({ query }),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Linear API returned ${res.status}`);
  }

  return res.json();
}

// ── Network health (try local MC backend, graceful fallback) ──

async function fetchNetworkHealth() {
  const mcUrl = process.env.MC_URL;
  if (!mcUrl) {
    return { error: "Network monitoring not available", dmas: [], totals: {} };
  }

  try {
    const res = await fetch(`${mcUrl}/api/data`, {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error("MC backend error");
    const data = await res.json();
    return data.network || { error: "No network data", dmas: [], totals: {} };
  } catch {
    return { error: "Network monitoring offline", dmas: [], totals: {} };
  }
}

// ── Main handler ──

export async function GET() {
  if (!LINEAR_API_KEY) {
    return NextResponse.json(
      { error: "LINEAR_API_KEY not configured", mc_down: true },
      { status: 503 }
    );
  }

  try {
    const issuesQuery = `{
      issues(filter: { team: { id: { eq: "${LINEAR_TEAM_ID}" } } }, first: 200, orderBy: updatedAt) {
        nodes {
          identifier title
          state { name type }
          priority priorityLabel
          labels { nodes { name } }
          project { name }
          parent { identifier }
          children { nodes { identifier title state { name type } priority labels { nodes { name } } } }
          dueDate updatedAt
        }
      }
    }`;

    const projectsQuery = `{
      projects(filter: { accessibleTeams: { id: { eq: "${LINEAR_TEAM_ID}" } } }, first: 30) {
        nodes { name state progress targetDate startDate }
      }
    }`;

    // Fetch Linear data + network health in parallel
    const [issuesRes, projectsRes, network] = await Promise.all([
      gql(issuesQuery),
      gql(projectsQuery),
      fetchNetworkHealth(),
    ]);

    const issues = issuesRes?.data?.issues?.nodes || [];
    const projects = projectsRes?.data?.projects?.nodes || [];

    return NextResponse.json({
      issues,
      projects,
      network,
      updated: new Date().toISOString(),
      config: MC_CONFIG,
    });
  } catch (e) {
    console.error("[mc/data] Error:", e);
    return NextResponse.json(
      { error: "Failed to fetch Mission Control data", mc_down: true },
      { status: 503 }
    );
  }
}
