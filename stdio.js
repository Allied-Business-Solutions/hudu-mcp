#!/usr/bin/env node
/**
 * Hudu MCP Server
 * Built from the Hudu REST API (Swagger 2.0)
 *
 * Required environment variables:
 *   HUDU_API_KEY   – Your Hudu API key (Admin → API Keys)
 *   HUDU_BASE_URL  – Your Hudu instance API base, e.g. https://your-instance.huducloud.com/api/v1
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { readFileSync } from "fs";

const API_KEY = process.env.HUDU_API_KEY;
const BASE_URL = (process.env.HUDU_BASE_URL || "").replace(/\/$/, "");

if (!API_KEY) { console.error("HUDU_API_KEY is required"); process.exit(1); }
if (!BASE_URL) { console.error("HUDU_BASE_URL is required"); process.exit(1); }

// ---------------------------------------------------------------------------
// HTTP helper
// ---------------------------------------------------------------------------
async function api(method, path, body = null, params = null) {
  const url = new URL(BASE_URL + path);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
    }
  }
  const opts = {
    method,
    headers: { "x-api-key": API_KEY, "Content-Type": "application/json", "Accept": "application/json" },
  };
  if (body !== null) opts.body = JSON.stringify(body);
  const res = await fetch(url.toString(), opts);
  if (res.status === 204) return { success: true };
  const text = await res.text();
  if (!text) return { success: true };
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${JSON.stringify(data)}`);
  return data;
}

// Multipart form-data helper (for photo uploads)
async function apiForm(method, path, formFields) {
  const url = new URL(BASE_URL + path);
  const form = new FormData();
  for (const [k, v] of Object.entries(formFields)) {
    if (v === undefined || v === null) continue;
    if (k === "file" || k === "photo") {
      const data = readFileSync(v);
      const filename = v.split(/[/\\]/).pop();
      form.append(k, new Blob([data]), filename);
    } else {
      form.append(k, String(v));
    }
  }
  const res = await fetch(url.toString(), {
    method,
    headers: { "x-api-key": API_KEY, "Accept": "application/json" },
    body: form,
  });
  if (res.status === 204) return { success: true };
  const text = await res.text();
  if (!text) return { success: true };
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${JSON.stringify(data)}`);
  return data;
}

// ---------------------------------------------------------------------------
// Tool definitions
// ---------------------------------------------------------------------------
const TOOLS = [

  // ── API Info ───────────────────────────────────────────────────────────────
  {
    name: "get_api_info",
    description: "Retrieve Hudu instance version and date.",
    inputSchema: { type: "object", properties: {} },
  },

  // ── Activity Logs ──────────────────────────────────────────────────────────
  {
    name: "list_activity_logs",
    description: "Retrieve a list of activity logs with optional filtering.",
    inputSchema: {
      type: "object",
      properties: {
        page: { type: "number", description: "Page number" },
        page_size: { type: "number", description: "Results per page" },
        user_id: { type: "number", description: "Filter by user ID" },
        user_email: { type: "string", description: "Filter by user email" },
        resource_id: { type: "number", description: "Filter by resource ID (use with resource_type)" },
        resource_type: { type: "string", description: "Filter by resource type (Asset, AssetPassword, Company, Article, etc.)" },
        action_message: { type: "string", description: "Filter by action performed" },
        start_date: { type: "string", description: "Filter logs from date (ISO 8601)" },
      },
    },
  },
  {
    name: "delete_activity_logs",
    description: "Delete activity logs from a specific datetime. Set delete_unassigned_logs=true to only delete logs with no user.",
    inputSchema: {
      type: "object",
      required: ["datetime"],
      properties: {
        datetime: { type: "string", description: "Delete logs from this datetime (ISO 8601)" },
        delete_unassigned_logs: { type: "boolean", description: "If true, only delete logs where user_id is null" },
      },
    },
  },

  // ── Articles ───────────────────────────────────────────────────────────────
  {
    name: "list_articles",
    description: "Get a list of Knowledge Base Articles.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string" },
        company_id: { type: "integer" },
        page: { type: "integer" },
        page_size: { type: "integer" },
        draft: { type: "boolean" },
        enable_sharing: { type: "boolean" },
        slug: { type: "string" },
        search: { type: "string" },
        updated_at: { type: "string", description: "ISO 8601 range or exact time" },
      },
    },
  },
  {
    name: "create_article",
    description: "Create a Knowledge Base Article.",
    inputSchema: {
      type: "object",
      required: ["name"],
      properties: {
        name: { type: "string" },
        content: { type: "string", description: "HTML content" },
        enable_sharing: { type: "boolean" },
        folder_id: { type: "integer" },
        company_id: { type: "integer", description: "Omit for global KB articles" },
      },
    },
  },
  {
    name: "get_article",
    description: "Get a single Knowledge Base Article by ID.",
    inputSchema: { type: "object", required: ["id"], properties: { id: { type: "integer" } } },
  },
  {
    name: "update_article",
    description: "Update a Knowledge Base Article.",
    inputSchema: {
      type: "object",
      required: ["id"],
      properties: {
        id: { type: "integer" },
        name: { type: "string" },
        content: { type: "string" },
        enable_sharing: { type: "boolean" },
        folder_id: { type: "integer" },
        company_id: { type: "integer" },
      },
    },
  },
  {
    name: "delete_article",
    description: "Delete a Knowledge Base Article by ID.",
    inputSchema: { type: "object", required: ["id"], properties: { id: { type: "integer" } } },
  },
  {
    name: "archive_article",
    description: "Archive a Knowledge Base Article by ID.",
    inputSchema: { type: "object", required: ["id"], properties: { id: { type: "integer" } } },
  },
  {
    name: "unarchive_article",
    description: "Unarchive a Knowledge Base Article by ID.",
    inputSchema: { type: "object", required: ["id"], properties: { id: { type: "integer" } } },
  },

  // ── Asset Layouts ──────────────────────────────────────────────────────────
  {
    name: "list_asset_layouts",
    description: "Get a list of Asset Layouts.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string" },
        page: { type: "number" },
        slug: { type: "string" },
        active: { type: "boolean" },
        updated_at: { type: "string" },
      },
    },
  },
  {
    name: "get_asset_layout",
    description: "Get a single Asset Layout by ID.",
    inputSchema: { type: "object", required: ["id"], properties: { id: { type: "integer" } } },
  },
  {
    name: "create_asset_layout",
    description: "Create a new Asset Layout.",
    inputSchema: {
      type: "object",
      required: ["name", "icon", "color", "icon_color"],
      properties: {
        name: { type: "string" },
        icon: { type: "string", description: "FontAwesome class, e.g. fas fa-laptop" },
        color: { type: "string", description: "Hex background color, e.g. #000000" },
        icon_color: { type: "string", description: "Hex icon color" },
        include_passwords: { type: "boolean" },
        include_photos: { type: "boolean" },
        include_comments: { type: "boolean" },
        include_files: { type: "boolean" },
        password_types: { type: "string" },
        fields: { type: "array", description: "Array of field objects with label, field_type, required, show_in_list, position" },
      },
    },
  },
  {
    name: "update_asset_layout",
    description: "Update an Asset Layout including its fields. Include field id to update existing fields.",
    inputSchema: {
      type: "object",
      required: ["id"],
      properties: {
        id: { type: "integer" },
        name: { type: "string" },
        icon: { type: "string" },
        color: { type: "string" },
        icon_color: { type: "string" },
        active: { type: "boolean" },
        include_passwords: { type: "boolean" },
        include_photos: { type: "boolean" },
        include_comments: { type: "boolean" },
        include_files: { type: "boolean" },
        fields: { type: "array" },
      },
    },
  },

  // ── Asset Passwords ────────────────────────────────────────────────────────
  {
    name: "list_asset_passwords",
    description: "Get a list of Passwords.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string" },
        company_id: { type: "integer" },
        archived: { type: "boolean" },
        page: { type: "integer" },
        page_size: { type: "integer" },
        slug: { type: "string" },
        search: { type: "string" },
        updated_at: { type: "string" },
      },
    },
  },
  {
    name: "create_asset_password",
    description: "Create a new Password entry.",
    inputSchema: {
      type: "object",
      required: ["name", "company_id"],
      properties: {
        name: { type: "string" },
        company_id: { type: "integer" },
        password: { type: "string" },
        username: { type: "string" },
        url: { type: "string" },
        description: { type: "string" },
        password_type: { type: "string" },
        otp_secret: { type: "string" },
        in_portal: { type: "boolean" },
        password_folder_id: { type: "integer" },
        passwordable_type: { type: "string" },
        passwordable_id: { type: "integer" },
      },
    },
  },
  {
    name: "get_asset_password",
    description: "Get a single Password by ID.",
    inputSchema: { type: "object", required: ["id"], properties: { id: { type: "integer" } } },
  },
  {
    name: "update_asset_password",
    description: "Update an existing Password entry.",
    inputSchema: {
      type: "object",
      required: ["id"],
      properties: {
        id: { type: "integer" },
        name: { type: "string" },
        company_id: { type: "integer" },
        password: { type: "string" },
        username: { type: "string" },
        url: { type: "string" },
        description: { type: "string" },
        password_type: { type: "string" },
        otp_secret: { type: "string" },
        in_portal: { type: "boolean" },
        password_folder_id: { type: "integer" },
        passwordable_type: { type: "string" },
        passwordable_id: { type: "integer" },
      },
    },
  },
  {
    name: "delete_asset_password",
    description: "Delete a Password by ID.",
    inputSchema: { type: "object", required: ["id"], properties: { id: { type: "integer" } } },
  },
  {
    name: "archive_asset_password",
    description: "Archive a Password by ID.",
    inputSchema: { type: "object", required: ["id"], properties: { id: { type: "integer" } } },
  },
  {
    name: "unarchive_asset_password",
    description: "Unarchive a Password by ID.",
    inputSchema: { type: "object", required: ["id"], properties: { id: { type: "integer" } } },
  },

  // ── Assets ─────────────────────────────────────────────────────────────────
  {
    name: "list_assets",
    description: "Retrieve a list of assets across all companies or filtered by company.",
    inputSchema: {
      type: "object",
      properties: {
        company_id: { type: "number" },
        id: { type: "number" },
        name: { type: "string" },
        primary_serial: { type: "string" },
        asset_layout_id: { type: "number" },
        page: { type: "number" },
        archived: { type: "boolean" },
        page_size: { type: "number" },
        slug: { type: "string" },
        search: { type: "string" },
        updated_at: { type: "string" },
      },
    },
  },
  {
    name: "list_company_assets",
    description: "Get a list of Assets specific to a Company.",
    inputSchema: {
      type: "object",
      required: ["company_id"],
      properties: {
        company_id: { type: "number" },
        page: { type: "number" },
        archived: { type: "boolean" },
        page_size: { type: "number" },
      },
    },
  },
  {
    name: "create_asset",
    description: "Create an Asset under a specific company. Use custom_fields array for custom field values.",
    inputSchema: {
      type: "object",
      required: ["company_id", "name", "asset_layout_id"],
      properties: {
        company_id: { type: "number" },
        name: { type: "string" },
        asset_layout_id: { type: "number" },
        primary_serial: { type: "string" },
        primary_mail: { type: "string" },
        primary_model: { type: "string" },
        primary_manufacturer: { type: "string" },
        custom_fields: { type: "array", description: "Array of {field_label: value} objects" },
      },
    },
  },
  {
    name: "get_asset",
    description: "Get a single Asset by company_id and asset id.",
    inputSchema: {
      type: "object",
      required: ["company_id", "id"],
      properties: {
        company_id: { type: "number" },
        id: { type: "number" },
      },
    },
  },
  {
    name: "update_asset",
    description: "Update an existing Asset.",
    inputSchema: {
      type: "object",
      required: ["company_id", "id"],
      properties: {
        company_id: { type: "number" },
        id: { type: "number" },
        name: { type: "string" },
        primary_serial: { type: "string" },
        primary_mail: { type: "string" },
        primary_model: { type: "string" },
        primary_manufacturer: { type: "string" },
        custom_fields: { type: "array" },
      },
    },
  },
  {
    name: "delete_asset",
    description: "Delete an Asset.",
    inputSchema: {
      type: "object",
      required: ["company_id", "id"],
      properties: { company_id: { type: "number" }, id: { type: "number" } },
    },
  },
  {
    name: "archive_asset",
    description: "Archive an Asset.",
    inputSchema: {
      type: "object",
      required: ["company_id", "id"],
      properties: { company_id: { type: "number" }, id: { type: "number" } },
    },
  },
  {
    name: "unarchive_asset",
    description: "Unarchive an Asset.",
    inputSchema: {
      type: "object",
      required: ["company_id", "id"],
      properties: { company_id: { type: "number" }, id: { type: "number" } },
    },
  },
  {
    name: "move_asset_layout",
    description: "Move an Asset to a different Asset Layout, preserving matching field values.",
    inputSchema: {
      type: "object",
      required: ["company_id", "id", "asset_layout_id"],
      properties: {
        company_id: { type: "integer" },
        id: { type: "integer" },
        asset_layout_id: { type: "integer", description: "ID of the target asset layout" },
      },
    },
  },

  // ── Cards ──────────────────────────────────────────────────────────────────
  {
    name: "lookup_cards",
    description: "Look up Hudu records by external integration details.",
    inputSchema: {
      type: "object",
      required: ["integration_slug"],
      properties: {
        integration_slug: { type: "string" },
        integration_id: { type: "string" },
        integration_identifier: { type: "string" },
      },
    },
  },

  // ── Companies ──────────────────────────────────────────────────────────────
  {
    name: "list_companies",
    description: "Retrieve a list of companies.",
    inputSchema: {
      type: "object",
      properties: {
        page: { type: "number" },
        page_size: { type: "number" },
        name: { type: "string" },
        phone_number: { type: "string" },
        website: { type: "string" },
        city: { type: "string" },
        state: { type: "string" },
        id_number: { type: "string" },
        slug: { type: "string" },
        search: { type: "string" },
        id_in_integration: { type: "string" },
        updated_at: { type: "string" },
      },
    },
  },
  {
    name: "create_company",
    description: "Create a new company.",
    inputSchema: {
      type: "object",
      required: ["name"],
      properties: {
        name: { type: "string" },
        nickname: { type: "string" },
        company_type: { type: "string" },
        address_line_1: { type: "string" },
        address_line_2: { type: "string" },
        city: { type: "string" },
        state: { type: "string" },
        zip: { type: "string" },
        country_name: { type: "string" },
        phone_number: { type: "string" },
        fax_number: { type: "string" },
        website: { type: "string" },
        id_number: { type: "string" },
        parent_company_id: { type: "number" },
        notes: { type: "string" },
      },
    },
  },
  {
    name: "get_company",
    description: "Get a specific company by ID.",
    inputSchema: { type: "object", required: ["id"], properties: { id: { type: "number" } } },
  },
  {
    name: "update_company",
    description: "Update a specific company by ID.",
    inputSchema: {
      type: "object",
      required: ["id"],
      properties: {
        id: { type: "number" },
        name: { type: "string" },
        nickname: { type: "string" },
        company_type: { type: "string" },
        address_line_1: { type: "string" },
        address_line_2: { type: "string" },
        city: { type: "string" },
        state: { type: "string" },
        zip: { type: "string" },
        country_name: { type: "string" },
        phone_number: { type: "string" },
        fax_number: { type: "string" },
        website: { type: "string" },
        id_number: { type: "string" },
        parent_company_id: { type: "number" },
        notes: { type: "string" },
      },
    },
  },
  {
    name: "delete_company",
    description: "Delete a company by ID.",
    inputSchema: { type: "object", required: ["id"], properties: { id: { type: "number" } } },
  },
  {
    name: "archive_company",
    description: "Archive a company by ID.",
    inputSchema: { type: "object", required: ["id"], properties: { id: { type: "number" } } },
  },
  {
    name: "unarchive_company",
    description: "Unarchive a company by ID.",
    inputSchema: { type: "object", required: ["id"], properties: { id: { type: "number" } } },
  },

  // ── Expirations ────────────────────────────────────────────────────────────
  {
    name: "list_expirations",
    description: "Retrieve expirations for the account (domains, SSL certs, warranties, asset fields, etc.).",
    inputSchema: {
      type: "object",
      properties: {
        page: { type: "integer" },
        page_size: { type: "integer" },
        company_id: { type: "integer" },
        expiration_type: { type: "string", description: "undeclared, domain, ssl_certificate, warranty, asset_field, article_expiration" },
        resource_id: { type: "integer" },
        resource_type: { type: "string" },
        archived: { type: "boolean" },
      },
    },
  },
  {
    name: "update_expiration",
    description: "Update an expiration's archived status.",
    inputSchema: {
      type: "object",
      required: ["id"],
      properties: {
        id: { type: "integer" },
        archived: { type: "boolean" },
      },
    },
  },
  {
    name: "delete_expiration",
    description: "Permanently delete an expiration by ID.",
    inputSchema: { type: "object", required: ["id"], properties: { id: { type: "integer" } } },
  },

  // ── Exports ────────────────────────────────────────────────────────────────
  {
    name: "list_exports",
    description: "Get available exports from the last 24 hours.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "create_export",
    description: "Initiate a PDF or CSV export of a company.",
    inputSchema: {
      type: "object",
      required: ["format", "company_id", "include_passwords", "include_websites"],
      properties: {
        format: { type: "string", enum: ["pdf", "csv"] },
        company_id: { type: "integer" },
        include_passwords: { type: "boolean" },
        include_websites: { type: "boolean" },
        include_articles: { type: "boolean" },
        include_archived_articles: { type: "boolean" },
        include_archived_passwords: { type: "boolean" },
        include_archived_websites: { type: "boolean" },
        include_archived_assets: { type: "boolean" },
        asset_layout_ids: { type: "array", items: { type: "integer" } },
      },
    },
  },
  {
    name: "get_export",
    description: "Get export metadata by ID.",
    inputSchema: {
      type: "object",
      required: ["id"],
      properties: {
        id: { type: "integer" },
        download: { type: "boolean", description: "Set true to get download URL" },
      },
    },
  },

  // ── Flag Types ─────────────────────────────────────────────────────────────
  {
    name: "list_flag_types",
    description: "Get a list of Flag Types.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string" },
        color: { type: "string" },
        slug: { type: "string" },
        page: { type: "integer" },
        page_size: { type: "integer" },
      },
    },
  },
  {
    name: "create_flag_type",
    description: "Create a new Flag Type.",
    inputSchema: {
      type: "object",
      required: ["name", "color"],
      properties: {
        name: { type: "string" },
        color: { type: "string", enum: ["Red", "Blue", "Green", "Yellow", "Purple", "Orange", "LightPink", "LightBlue", "LightGreen", "LightPurple", "LightOrange", "LightYellow", "White", "Grey"] },
      },
    },
  },
  {
    name: "get_flag_type",
    description: "Get a specific Flag Type by ID.",
    inputSchema: { type: "object", required: ["id"], properties: { id: { type: "integer" } } },
  },
  {
    name: "update_flag_type",
    description: "Update a Flag Type by ID.",
    inputSchema: {
      type: "object",
      required: ["id"],
      properties: {
        id: { type: "integer" },
        name: { type: "string" },
        color: { type: "string", enum: ["Red", "Blue", "Green", "Yellow", "Purple", "Orange", "LightPink", "LightBlue", "LightGreen", "LightPurple", "LightOrange", "LightYellow", "White", "Grey"] },
      },
    },
  },
  {
    name: "delete_flag_type",
    description: "Delete a Flag Type by ID.",
    inputSchema: { type: "object", required: ["id"], properties: { id: { type: "integer" } } },
  },

  // ── Flags ──────────────────────────────────────────────────────────────────
  {
    name: "list_flags",
    description: "Get a list of Flags.",
    inputSchema: {
      type: "object",
      properties: {
        flag_type_id: { type: "integer" },
        flagable_type: { type: "string", description: "Asset, Website, Article, AssetPassword, Company, Procedure, RackStorage, Network, IpAddress, Vlan, VlanZone" },
        flagable_id: { type: "integer" },
        description: { type: "string" },
        page: { type: "integer" },
        page_size: { type: "integer" },
      },
    },
  },
  {
    name: "create_flag",
    description: "Create a Flag on a record.",
    inputSchema: {
      type: "object",
      required: ["flag_type_id", "flagable_type", "flagable_id"],
      properties: {
        flag_type_id: { type: "integer" },
        description: { type: "string" },
        flagable_type: { type: "string", enum: ["Asset", "Website", "Article", "AssetPassword", "Company", "Procedure", "RackStorage", "Network", "IpAddress", "Vlan", "VlanZone"] },
        flagable_id: { type: "integer" },
      },
    },
  },
  {
    name: "get_flag",
    description: "Get a specific Flag by ID.",
    inputSchema: { type: "object", required: ["id"], properties: { id: { type: "integer" } } },
  },
  {
    name: "update_flag",
    description: "Update a Flag.",
    inputSchema: {
      type: "object",
      required: ["id"],
      properties: {
        id: { type: "integer" },
        flag_type_id: { type: "integer" },
        description: { type: "string" },
        flagable_type: { type: "string" },
        flagable_id: { type: "integer" },
      },
    },
  },
  {
    name: "delete_flag",
    description: "Delete a Flag by ID.",
    inputSchema: { type: "object", required: ["id"], properties: { id: { type: "integer" } } },
  },

  // ── Folders ────────────────────────────────────────────────────────────────
  {
    name: "list_folders",
    description: "Retrieve a list of KB article folders.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string" },
        company_id: { type: "integer" },
        in_company: { type: "boolean" },
        page: { type: "integer" },
        page_size: { type: "integer" },
      },
    },
  },
  {
    name: "create_folder",
    description: "Create a KB article folder.",
    inputSchema: {
      type: "object",
      required: ["name"],
      properties: {
        name: { type: "string" },
        icon: { type: "string" },
        description: { type: "string" },
        parent_folder_id: { type: "integer" },
        company_id: { type: "integer" },
      },
    },
  },
  {
    name: "get_folder",
    description: "Get a folder by ID.",
    inputSchema: { type: "object", required: ["id"], properties: { id: { type: "integer" } } },
  },
  {
    name: "update_folder",
    description: "Update a folder.",
    inputSchema: {
      type: "object",
      required: ["id"],
      properties: {
        id: { type: "integer" },
        name: { type: "string" },
        icon: { type: "string" },
        description: { type: "string" },
        parent_folder_id: { type: "integer" },
        company_id: { type: "integer" },
      },
    },
  },
  {
    name: "delete_folder",
    description: "Delete a folder by ID.",
    inputSchema: { type: "object", required: ["id"], properties: { id: { type: "integer" } } },
  },

  // ── Groups ─────────────────────────────────────────────────────────────────
  {
    name: "list_groups",
    description: "Retrieve a list of groups (member lists exclude admins/super admins).",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string" },
        default: { type: "boolean" },
        search: { type: "string" },
        page: { type: "integer" },
        page_size: { type: "integer" },
      },
    },
  },
  {
    name: "get_group",
    description: "Retrieve a group by ID.",
    inputSchema: { type: "object", required: ["id"], properties: { id: { type: "integer" } } },
  },

  // ── IP Addresses ───────────────────────────────────────────────────────────
  {
    name: "list_ip_addresses",
    description: "Get a list of IP addresses.",
    inputSchema: {
      type: "object",
      properties: {
        network_id: { type: "integer" },
        address: { type: "string" },
        status: { type: "string" },
        fqdn: { type: "string" },
        asset_id: { type: "integer" },
        company_id: { type: "integer" },
        created_at: { type: "string" },
        updated_at: { type: "string" },
      },
    },
  },
  {
    name: "create_ip_address",
    description: "Create a new IP address record.",
    inputSchema: {
      type: "object",
      required: ["address", "company_id"],
      properties: {
        address: { type: "string" },
        status: { type: "string", enum: ["unassigned", "assigned", "reserved", "deprecated", "dhcp", "slaac"] },
        fqdn: { type: "string" },
        description: { type: "string" },
        notes: { type: "string" },
        asset_id: { type: "integer" },
        network_id: { type: "integer" },
        company_id: { type: "integer" },
        skip_dns_validation: { type: "boolean" },
      },
    },
  },
  {
    name: "get_ip_address",
    description: "Get a single IP address by ID.",
    inputSchema: { type: "object", required: ["id"], properties: { id: { type: "integer" } } },
  },
  {
    name: "update_ip_address",
    description: "Update an existing IP address.",
    inputSchema: {
      type: "object",
      required: ["id"],
      properties: {
        id: { type: "integer" },
        address: { type: "string" },
        status: { type: "string", enum: ["unassigned", "assigned", "reserved", "deprecated", "dhcp", "slaac"] },
        fqdn: { type: "string" },
        description: { type: "string" },
        notes: { type: "string" },
        asset_id: { type: "integer" },
        network_id: { type: "integer" },
        company_id: { type: "integer" },
        skip_dns_validation: { type: "boolean" },
      },
    },
  },
  {
    name: "delete_ip_address",
    description: "Delete an IP address by ID.",
    inputSchema: { type: "object", required: ["id"], properties: { id: { type: "integer" } } },
  },

  // ── Lists ──────────────────────────────────────────────────────────────────
  {
    name: "list_lists",
    description: "Get a list of selectable Lists used in asset fields.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search by name (partial match)" },
        name: { type: "string", description: "Exact name match" },
      },
    },
  },
  {
    name: "create_list",
    description: "Create a new selectable List.",
    inputSchema: {
      type: "object",
      required: ["name"],
      properties: {
        name: { type: "string" },
        list_items_attributes: { type: "array", description: "Array of {name: string} objects", items: { type: "object" } },
      },
    },
  },
  {
    name: "get_list",
    description: "Get a specific List by ID.",
    inputSchema: { type: "object", required: ["id"], properties: { id: { type: "integer" } } },
  },
  {
    name: "update_list",
    description: "Update a List. Include item id to update existing items; set _destroy: true to remove items.",
    inputSchema: {
      type: "object",
      required: ["id"],
      properties: {
        id: { type: "integer" },
        name: { type: "string" },
        list_items_attributes: { type: "array", items: { type: "object" } },
      },
    },
  },
  {
    name: "delete_list",
    description: "Delete a List by ID.",
    inputSchema: { type: "object", required: ["id"], properties: { id: { type: "integer" } } },
  },

  // ── Magic Dash ─────────────────────────────────────────────────────────────
  {
    name: "list_magic_dash",
    description: "Retrieve a list of Magic Dash Items.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string" },
        company_id: { type: "integer" },
        page: { type: "integer" },
        page_size: { type: "integer" },
      },
    },
  },
  {
    name: "upsert_magic_dash",
    description: "Create or update a Magic Dash Item (matched by title + company_name).",
    inputSchema: {
      type: "object",
      required: ["title", "company_name", "message"],
      properties: {
        title: { type: "string" },
        company_name: { type: "string" },
        message: { type: "string" },
        icon: { type: "string" },
        image_url: { type: "string" },
        content_link: { type: "string" },
        content: { type: "string", description: "HTML content" },
        shade: { type: "string", description: "Color shade: success, danger, etc." },
      },
    },
  },
  {
    name: "delete_magic_dash",
    description: "Delete a Magic Dash Item by title and company_name.",
    inputSchema: {
      type: "object",
      required: ["title", "company_name"],
      properties: {
        title: { type: "string" },
        company_name: { type: "string" },
      },
    },
  },
  {
    name: "delete_magic_dash_by_id",
    description: "Delete a Magic Dash Item by ID.",
    inputSchema: { type: "object", required: ["id"], properties: { id: { type: "number" } } },
  },
  {
    name: "update_magic_dash_positions",
    description: "Reorder multiple Magic Dash Items for a company by updating their positions.",
    inputSchema: {
      type: "object",
      required: ["company_id", "positions"],
      properties: {
        company_id: { type: "integer", description: "The company whose Magic Dash Items are being reordered" },
        positions: {
          type: "array",
          minItems: 2,
          description: "Array of {id, position} objects — must include at least 2 items",
          items: {
            type: "object",
            required: ["id", "position"],
            properties: {
              id: { type: "integer", description: "Magic Dash Item ID" },
              position: { type: "integer", minimum: 1, description: "New position (starting at 1)" },
            },
          },
        },
      },
    },
  },

  // ── Matchers ───────────────────────────────────────────────────────────────
  {
    name: "list_matchers",
    description: "List integration matchers (company mappings) for a specific integration.",
    inputSchema: {
      type: "object",
      required: ["integration_id"],
      properties: {
        integration_id: { type: "integer" },
        matched: { type: "boolean" },
        sync_id: { type: "integer" },
        identifier: { type: "string" },
        company_id: { type: "integer" },
        page: { type: "integer" },
        page_size: { type: "integer" },
      },
    },
  },
  {
    name: "update_matcher",
    description: "Update an integration matcher.",
    inputSchema: {
      type: "object",
      required: ["id"],
      properties: {
        id: { type: "integer" },
        company_id: { type: "integer" },
        potential_company_id: { type: "integer" },
        sync_id: { type: "string" },
        identifier: { type: "string" },
      },
    },
  },
  {
    name: "delete_matcher",
    description: "Delete an integration matcher by ID.",
    inputSchema: { type: "object", required: ["id"], properties: { id: { type: "integer" } } },
  },

  // ── Networks ───────────────────────────────────────────────────────────────
  {
    name: "list_networks",
    description: "Get a list of networks.",
    inputSchema: {
      type: "object",
      properties: {
        company_id: { type: "integer" },
        slug: { type: "string" },
        name: { type: "string" },
        network_type: { type: "integer" },
        address: { type: "string" },
        location_id: { type: "integer" },
        archived: { type: "boolean" },
        created_at: { type: "string" },
        updated_at: { type: "string" },
      },
    },
  },
  {
    name: "create_network",
    description: "Create a new network.",
    inputSchema: {
      type: "object",
      required: ["name", "address", "company_id"],
      properties: {
        name: { type: "string" },
        address: { type: "string", description: "CIDR notation, e.g. 192.168.1.0/24" },
        company_id: { type: "integer" },
        description: { type: "string" },
        network_type: { type: "integer" },
        location_id: { type: "integer" },
        vlan_id: { type: "integer" },
        archived: { type: "boolean" },
      },
    },
  },
  {
    name: "get_network",
    description: "Get a single network by ID.",
    inputSchema: { type: "object", required: ["id"], properties: { id: { type: "integer" } } },
  },
  {
    name: "update_network",
    description: "Update an existing network.",
    inputSchema: {
      type: "object",
      required: ["id"],
      properties: {
        id: { type: "integer" },
        name: { type: "string" },
        address: { type: "string" },
        description: { type: "string" },
        network_type: { type: "integer" },
        company_id: { type: "integer" },
        location_id: { type: "integer" },
        vlan_id: { type: "integer" },
        archived: { type: "boolean" },
      },
    },
  },
  {
    name: "delete_network",
    description: "Delete a network by ID.",
    inputSchema: { type: "object", required: ["id"], properties: { id: { type: "integer" } } },
  },

  // ── Password Folders ───────────────────────────────────────────────────────
  {
    name: "list_password_folders",
    description: "Retrieve a list of password folders.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string" },
        company_id: { type: "integer" },
        search: { type: "string" },
        page: { type: "integer" },
        page_size: { type: "integer" },
      },
    },
  },
  {
    name: "create_password_folder",
    description: "Create a new password folder.",
    inputSchema: {
      type: "object",
      required: ["name", "security"],
      properties: {
        name: { type: "string" },
        company_id: { type: "integer" },
        description: { type: "string" },
        security: { type: "string", enum: ["all_users", "specific"] },
        allowed_groups: { type: "array", items: { type: "integer" }, description: "Group IDs with access when security=specific" },
      },
    },
  },
  {
    name: "get_password_folder",
    description: "Retrieve a password folder by ID.",
    inputSchema: { type: "object", required: ["id"], properties: { id: { type: "integer" } } },
  },
  {
    name: "update_password_folder",
    description: "Update an existing password folder.",
    inputSchema: {
      type: "object",
      required: ["id"],
      properties: {
        id: { type: "integer" },
        name: { type: "string" },
        company_id: { type: "integer" },
        description: { type: "string" },
        security: { type: "string", enum: ["all_users", "specific"] },
        allowed_groups: { type: "array", items: { type: "integer" } },
      },
    },
  },
  {
    name: "delete_password_folder",
    description: "Delete a password folder by ID.",
    inputSchema: { type: "object", required: ["id"], properties: { id: { type: "integer" } } },
  },

  // ── Procedure Tasks ────────────────────────────────────────────────────────
  {
    name: "list_procedure_tasks",
    description: "Get a list of Procedure Tasks.",
    inputSchema: {
      type: "object",
      properties: {
        procedure_id: { type: "integer" },
        name: { type: "string" },
        company_id: { type: "integer" },
      },
    },
  },
  {
    name: "create_procedure_task",
    description: "Create a new Procedure Task.",
    inputSchema: {
      type: "object",
      required: ["name", "procedure_id"],
      properties: {
        name: { type: "string" },
        description: { type: "string" },
        procedure_id: { type: "integer" },
        position: { type: "integer" },
        user_id: { type: "integer" },
        due_date: { type: "string", description: "YYYY-MM-DD" },
        priority: { type: "string", enum: ["unsure", "low", "normal", "high", "urgent"] },
        assigned_users: { type: "array", items: { type: "integer" } },
      },
    },
  },
  {
    name: "get_procedure_task",
    description: "Get a Procedure Task by ID.",
    inputSchema: { type: "object", required: ["id"], properties: { id: { type: "integer" } } },
  },
  {
    name: "update_procedure_task",
    description: "Update an existing Procedure Task.",
    inputSchema: {
      type: "object",
      required: ["id"],
      properties: {
        id: { type: "integer" },
        name: { type: "string" },
        description: { type: "string" },
        completed: { type: "boolean" },
        procedure_id: { type: "integer" },
        position: { type: "integer" },
        user_id: { type: "integer" },
        due_date: { type: "string" },
        priority: { type: "string", enum: ["unsure", "low", "normal", "high", "urgent"] },
        assigned_users: { type: "array", items: { type: "integer" } },
      },
    },
  },
  {
    name: "delete_procedure_task",
    description: "Delete a Procedure Task by ID.",
    inputSchema: { type: "object", required: ["id"], properties: { id: { type: "integer" } } },
  },

  // ── Procedures ─────────────────────────────────────────────────────────────
  {
    name: "list_procedures",
    description: "Get a list of Procedures (Processes).",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string" },
        company_id: { type: "integer" },
        page: { type: "integer" },
        page_size: { type: "integer" },
        slug: { type: "string" },
        global_template: { type: "string", enum: ["true", "false"] },
        company_template: { type: "integer" },
        parent_procedure_id: { type: "integer" },
      },
    },
  },
  {
    name: "create_procedure",
    description: "Create a new Procedure (Process).",
    inputSchema: {
      type: "object",
      required: ["name"],
      properties: {
        name: { type: "string" },
        description: { type: "string" },
        company_id: { type: "integer", description: "Omit or set null for global template" },
        company_template: { type: "boolean" },
      },
    },
  },
  {
    name: "get_procedure",
    description: "Get a Procedure by ID.",
    inputSchema: { type: "object", required: ["id"], properties: { id: { type: "integer" } } },
  },
  {
    name: "update_procedure",
    description: "Update an existing Procedure.",
    inputSchema: {
      type: "object",
      required: ["id"],
      properties: {
        id: { type: "integer" },
        name: { type: "string" },
        description: { type: "string" },
        company_id: { type: "integer" },
        company_template: { type: "boolean" },
        archived: { type: "boolean" },
      },
    },
  },
  {
    name: "delete_procedure",
    description: "Delete a Procedure by ID.",
    inputSchema: { type: "object", required: ["id"], properties: { id: { type: "integer" } } },
  },
  {
    name: "create_procedure_from_template",
    description: "Create a new Procedure instance from an existing template.",
    inputSchema: {
      type: "object",
      required: ["id"],
      properties: {
        id: { type: "integer", description: "ID of the template procedure" },
        company_id: { type: "integer" },
        name: { type: "string" },
        description: { type: "string" },
      },
    },
  },
  {
    name: "duplicate_procedure",
    description: "Duplicate an existing Procedure.",
    inputSchema: {
      type: "object",
      required: ["id", "company_id"],
      properties: {
        id: { type: "integer" },
        company_id: { type: "integer" },
        name: { type: "string" },
        description: { type: "string" },
      },
    },
  },
  {
    name: "kickoff_procedure",
    description: "Start/kickoff a Procedure from a company process.",
    inputSchema: {
      type: "object",
      required: ["id"],
      properties: {
        id: { type: "integer" },
        asset_id: { type: "integer" },
        name: { type: "string" },
      },
    },
  },

  // ── Rack Storage Items ─────────────────────────────────────────────────────
  {
    name: "list_rack_storage_items",
    description: "Get a list of Rack Storage Items.",
    inputSchema: {
      type: "object",
      properties: {
        rack_storage_role_id: { type: "integer" },
        asset_id: { type: "integer" },
        start_unit: { type: "integer" },
        end_unit: { type: "integer" },
        status: { type: "integer" },
        side: { type: "string" },
        created_at: { type: "string" },
        updated_at: { type: "string" },
      },
    },
  },
  {
    name: "create_rack_storage_item",
    description: "Create a new Rack Storage Item.",
    inputSchema: {
      type: "object",
      required: ["rack_storage_role_id"],
      properties: {
        rack_storage_role_id: { type: "integer" },
        asset_id: { type: "integer" },
        start_unit: { type: "integer" },
        end_unit: { type: "integer" },
        status: { type: "integer" },
        side: { type: "integer" },
        max_wattage: { type: "integer" },
        power_draw: { type: "integer" },
        reserved_message: { type: "string" },
      },
    },
  },
  {
    name: "get_rack_storage_item",
    description: "Get a Rack Storage Item by ID.",
    inputSchema: { type: "object", required: ["id"], properties: { id: { type: "integer" } } },
  },
  {
    name: "update_rack_storage_item",
    description: "Update a Rack Storage Item.",
    inputSchema: {
      type: "object",
      required: ["id"],
      properties: {
        id: { type: "integer" },
        rack_storage_role_id: { type: "integer" },
        asset_id: { type: "integer" },
        start_unit: { type: "integer" },
        end_unit: { type: "integer" },
        status: { type: "integer" },
        side: { type: "integer" },
        max_wattage: { type: "integer" },
        power_draw: { type: "integer" },
        reserved_message: { type: "string" },
      },
    },
  },
  {
    name: "delete_rack_storage_item",
    description: "Delete a Rack Storage Item by ID.",
    inputSchema: { type: "object", required: ["id"], properties: { id: { type: "integer" } } },
  },

  // ── Rack Storages ──────────────────────────────────────────────────────────
  {
    name: "list_rack_storages",
    description: "Get a list of Rack Storages.",
    inputSchema: {
      type: "object",
      properties: {
        company_id: { type: "integer" },
        location_id: { type: "integer" },
        height: { type: "integer" },
        min_width: { type: "integer" },
        max_width: { type: "integer" },
        created_at: { type: "string" },
        updated_at: { type: "string" },
      },
    },
  },
  {
    name: "create_rack_storage",
    description: "Create a new Rack Storage.",
    inputSchema: {
      type: "object",
      required: ["name", "company_id"],
      properties: {
        name: { type: "string" },
        description: { type: "string" },
        company_id: { type: "integer" },
        location_id: { type: "integer" },
        height: { type: "integer" },
        width: { type: "integer" },
        max_wattage: { type: "integer" },
        starting_unit: { type: "integer" },
      },
    },
  },
  {
    name: "get_rack_storage",
    description: "Get a Rack Storage by ID.",
    inputSchema: { type: "object", required: ["id"], properties: { id: { type: "integer" } } },
  },
  {
    name: "update_rack_storage",
    description: "Update a Rack Storage.",
    inputSchema: {
      type: "object",
      required: ["id"],
      properties: {
        id: { type: "integer" },
        name: { type: "string" },
        description: { type: "string" },
        location_id: { type: "integer" },
        height: { type: "integer" },
        width: { type: "integer" },
        max_wattage: { type: "integer" },
        starting_unit: { type: "integer" },
      },
    },
  },
  {
    name: "delete_rack_storage",
    description: "Delete a Rack Storage by ID.",
    inputSchema: { type: "object", required: ["id"], properties: { id: { type: "integer" } } },
  },

  // ── Relations ──────────────────────────────────────────────────────────────
  {
    name: "list_relations",
    description: "Get a list of all relations between entities.",
    inputSchema: {
      type: "object",
      properties: {
        page: { type: "integer" },
        page_size: { type: "integer" },
      },
    },
  },
  {
    name: "create_relation",
    description: "Create a relation between two entities.",
    inputSchema: {
      type: "object",
      required: ["toable_id", "toable_type", "fromable_id", "fromable_type"],
      properties: {
        toable_id: { type: "integer" },
        toable_type: { type: "string", enum: ["Asset", "Website", "Procedure", "AssetPassword", "Company", "Article"] },
        fromable_id: { type: "integer" },
        fromable_type: { type: "string", enum: ["Asset", "Website", "Procedure", "AssetPassword", "Company", "Article"] },
        description: { type: "string" },
        is_inverse: { type: "boolean" },
      },
    },
  },
  {
    name: "delete_relation",
    description: "Delete a Relation by ID.",
    inputSchema: { type: "object", required: ["id"], properties: { id: { type: "integer" } } },
  },

  // ── Uploads ────────────────────────────────────────────────────────────────
  {
    name: "list_uploads",
    description: "Get a list of all file uploads.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "get_upload",
    description: "Get a specific upload by ID.",
    inputSchema: { type: "object", required: ["id"], properties: { id: { type: "integer" } } },
  },
  {
    name: "delete_upload",
    description: "Delete an upload by ID.",
    inputSchema: { type: "object", required: ["id"], properties: { id: { type: "integer" } } },
  },

  // ── Users ──────────────────────────────────────────────────────────────────
  {
    name: "list_users",
    description: "Retrieve a list of users.",
    inputSchema: {
      type: "object",
      properties: {
        first_name: { type: "string" },
        last_name: { type: "string" },
        search: { type: "string" },
        email: { type: "string" },
        security_level: { type: "string", description: "super_admin, admin, spectator, editor, author, portal_member, portal_admin" },
        archived: { type: "boolean" },
        portal_member_company_id: { type: "integer" },
        page: { type: "integer" },
        page_size: { type: "integer" },
      },
    },
  },
  {
    name: "get_user",
    description: "Get a user by ID.",
    inputSchema: { type: "object", required: ["id"], properties: { id: { type: "integer" } } },
  },

  // ── VLAN Zones ─────────────────────────────────────────────────────────────
  {
    name: "list_vlan_zones",
    description: "Get a list of VLAN Zones.",
    inputSchema: {
      type: "object",
      properties: {
        company_id: { type: "integer" },
        name: { type: "string" },
        archived: { type: "boolean" },
        created_at: { type: "string" },
        updated_at: { type: "string" },
      },
    },
  },
  {
    name: "create_vlan_zone",
    description: "Create a new VLAN Zone.",
    inputSchema: {
      type: "object",
      required: ["name", "vlan_id_ranges", "company_id"],
      properties: {
        name: { type: "string" },
        description: { type: "string" },
        vlan_id_ranges: { type: "string", description: "Comma-separated ranges, e.g. '100-500,1000-1500'" },
        company_id: { type: "integer" },
        archived: { type: "boolean" },
      },
    },
  },
  {
    name: "get_vlan_zone",
    description: "Get a VLAN Zone by ID.",
    inputSchema: { type: "object", required: ["id"], properties: { id: { type: "integer" } } },
  },
  {
    name: "update_vlan_zone",
    description: "Update a VLAN Zone.",
    inputSchema: {
      type: "object",
      required: ["id"],
      properties: {
        id: { type: "integer" },
        name: { type: "string" },
        description: { type: "string" },
        vlan_id_ranges: { type: "string" },
        company_id: { type: "integer" },
        archived: { type: "boolean" },
      },
    },
  },
  {
    name: "delete_vlan_zone",
    description: "Delete a VLAN Zone by ID.",
    inputSchema: { type: "object", required: ["id"], properties: { id: { type: "integer" } } },
  },

  // ── VLANs ──────────────────────────────────────────────────────────────────
  {
    name: "list_vlans",
    description: "Get a list of VLANs.",
    inputSchema: {
      type: "object",
      properties: {
        company_id: { type: "integer" },
        vlan_zone_id: { type: "integer" },
        name: { type: "string" },
        vlan_id: { type: "integer" },
        archived: { type: "boolean" },
        created_at: { type: "string" },
        updated_at: { type: "string" },
      },
    },
  },
  {
    name: "create_vlan",
    description: "Create a new VLAN.",
    inputSchema: {
      type: "object",
      required: ["name", "vlan_id", "company_id"],
      properties: {
        name: { type: "string" },
        vlan_id: { type: "integer", description: "Numeric VLAN ID 1-4094" },
        description: { type: "string" },
        notes: { type: "string" },
        company_id: { type: "integer" },
        vlan_zone_id: { type: "integer" },
        status_list_item_id: { type: "integer" },
        role_list_item_id: { type: "integer" },
        archived: { type: "boolean" },
      },
    },
  },
  {
    name: "get_vlan",
    description: "Get a single VLAN by ID.",
    inputSchema: { type: "object", required: ["id"], properties: { id: { type: "integer" } } },
  },
  {
    name: "update_vlan",
    description: "Update a VLAN.",
    inputSchema: {
      type: "object",
      required: ["id"],
      properties: {
        id: { type: "integer" },
        name: { type: "string" },
        vlan_id: { type: "integer" },
        description: { type: "string" },
        notes: { type: "string" },
        company_id: { type: "integer" },
        vlan_zone_id: { type: "integer" },
        status_list_item_id: { type: "integer" },
        role_list_item_id: { type: "integer" },
        archived: { type: "boolean" },
      },
    },
  },
  {
    name: "delete_vlan",
    description: "Delete a VLAN by ID.",
    inputSchema: { type: "object", required: ["id"], properties: { id: { type: "integer" } } },
  },

  // ── Websites ───────────────────────────────────────────────────────────────
  {
    name: "list_websites",
    description: "Get a list of monitored websites.",
    inputSchema: {
      type: "object",
      properties: {
        page: { type: "integer" },
        page_size: { type: "integer" },
        name: { type: "string" },
        slug: { type: "string" },
        search: { type: "string" },
        updated_at: { type: "string" },
      },
    },
  },
  {
    name: "create_website",
    description: "Add a website to monitor.",
    inputSchema: {
      type: "object",
      required: ["company_id", "name"],
      properties: {
        company_id: { type: "integer" },
        name: { type: "string", description: "URL or name of the website" },
        notes: { type: "string" },
        paused: { type: "boolean" },
        disable_dns: { type: "boolean" },
        disable_ssl: { type: "boolean" },
        disable_whois: { type: "boolean" },
      },
    },
  },
  {
    name: "get_website",
    description: "Get a website by ID.",
    inputSchema: { type: "object", required: ["id"], properties: { id: { type: "integer" } } },
  },
  {
    name: "update_website",
    description: "Update a monitored website.",
    inputSchema: {
      type: "object",
      required: ["id"],
      properties: {
        id: { type: "integer" },
        company_id: { type: "integer" },
        name: { type: "string" },
        notes: { type: "string" },
        paused: { type: "boolean" },
        disable_dns: { type: "boolean" },
        disable_ssl: { type: "boolean" },
        disable_whois: { type: "boolean" },
      },
    },
  },
  {
    name: "delete_website",
    description: "Delete a monitored website by ID.",
    inputSchema: { type: "object", required: ["id"], properties: { id: { type: "integer" } } },
  },

  // ── Photos ─────────────────────────────────────────────────────────────────
  {
    name: "list_photos",
    description: "Get a list of Photos with optional filtering.",
    inputSchema: {
      type: "object",
      properties: {
        company_id: { type: "integer" },
        photoable_type: { type: "string", description: "Type of the associated record (e.g. Asset, Company, Article)" },
        photoable_id: { type: "integer", description: "ID of the associated record" },
        folder_id: { type: "integer" },
        archived: { type: "boolean" },
        created_at: { type: "string", description: "ISO 8601 date filter" },
        updated_at: { type: "string", description: "ISO 8601 date filter" },
        page: { type: "integer" },
        page_size: { type: "integer" },
      },
    },
  },
  {
    name: "create_photo",
    description: "Upload a new Photo. Provide the local file path to the image file.",
    inputSchema: {
      type: "object",
      required: ["file_path", "caption"],
      properties: {
        file_path: { type: "string", description: "Absolute local path to the image file to upload" },
        caption: { type: "string", description: "Caption for the photo" },
        company_id: { type: "integer" },
        photoable_type: { type: "string", description: "Type of record to attach to (e.g. Asset, Company, Article)" },
        photoable_id: { type: "integer", description: "ID of the record to attach to" },
        folder_id: { type: "integer" },
        pinned: { type: "boolean" },
      },
    },
  },
  {
    name: "get_photo",
    description: "Get a specific Photo by ID. Set download=true to get a download URL.",
    inputSchema: {
      type: "object",
      required: ["id"],
      properties: {
        id: { type: "integer" },
        download: { type: "boolean" },
      },
    },
  },
  {
    name: "update_photo",
    description: "Update a Photo's metadata by ID.",
    inputSchema: {
      type: "object",
      required: ["id"],
      properties: {
        id: { type: "integer" },
        caption: { type: "string" },
        company_id: { type: "integer" },
        photoable_type: { type: "string" },
        photoable_id: { type: "integer" },
        folder_id: { type: "integer" },
        pinned: { type: "boolean" },
      },
    },
  },
  {
    name: "delete_photo",
    description: "Delete a Photo by ID.",
    inputSchema: { type: "object", required: ["id"], properties: { id: { type: "integer" } } },
  },

  // ── Public Photos ──────────────────────────────────────────────────────────
  {
    name: "list_public_photos",
    description: "Get a list of public photos.",
    inputSchema: {
      type: "object",
      properties: {
        page: { type: "integer" },
        page_size: { type: "integer" },
      },
    },
  },
  {
    name: "create_public_photo",
    description: "Upload a new public photo and attach it to a record. Provide the local file path to the image.",
    inputSchema: {
      type: "object",
      required: ["file_path", "record_type", "record_id"],
      properties: {
        file_path: { type: "string", description: "Absolute local path to the image file to upload" },
        record_type: { type: "string", description: "Type of record to attach to (e.g. Asset, Company)" },
        record_id: { type: "integer", description: "ID of the record to attach to" },
      },
    },
  },
  {
    name: "get_public_photo",
    description: "Get a public photo by ID. Set download=true to get a download URL.",
    inputSchema: {
      type: "object",
      required: ["id"],
      properties: {
        id: { type: "integer" },
        download: { type: "boolean" },
      },
    },
  },
  {
    name: "update_public_photo",
    description: "Update a public photo's record association.",
    inputSchema: {
      type: "object",
      required: ["id", "record_type", "record_id"],
      properties: {
        id: { type: "integer" },
        record_type: { type: "string" },
        record_id: { type: "integer" },
      },
    },
  },

  // ── Navigation Jump ────────────────────────────────────────────────────────
  {
    name: "jump_to_card",
    description: "Get a redirect URL to jump directly to an asset/record matched by integration details.",
    inputSchema: {
      type: "object",
      required: ["integration_type", "integration_slug"],
      properties: {
        integration_type: { type: "string", description: "The integration type identifier" },
        integration_slug: { type: "string", description: "The integration slug" },
        integration_id: { type: "string", description: "The integration-specific record ID" },
        integration_identifier: { type: "string", description: "An alternative integration identifier" },
      },
    },
  },
  {
    name: "jump_to_company",
    description: "Get a redirect URL to jump directly to a company matched by integration details.",
    inputSchema: {
      type: "object",
      required: ["integration_slug"],
      properties: {
        integration_slug: { type: "string", description: "The integration slug used to match the company" },
      },
    },
  },

  // ── S3 Exports ─────────────────────────────────────────────────────────────
  {
    name: "create_s3_export",
    description: "Initiate an S3 export of your Hudu data.",
    inputSchema: { type: "object", properties: {} },
  },
];

// ---------------------------------------------------------------------------
// Tool dispatch
// ---------------------------------------------------------------------------
async function callTool(name, args) {
  switch (name) {

    // API Info
    case "get_api_info": return api("GET", "/api_info");

    // Activity Logs
    case "list_activity_logs": return api("GET", "/activity_logs", null, args);
    case "delete_activity_logs": return api("DELETE", "/activity_logs", null, { datetime: args.datetime, delete_unassigned_logs: args.delete_unassigned_logs });

    // Articles
    case "list_articles": return api("GET", "/articles", null, args);
    case "create_article": return api("POST", "/articles", { article: args });
    case "get_article": return api("GET", `/articles/${args.id}`);
    case "update_article": { const { id, ...body } = args; return api("PUT", `/articles/${id}`, { article: body }); }
    case "delete_article": return api("DELETE", `/articles/${args.id}`);
    case "archive_article": return api("PUT", `/articles/${args.id}/archive`);
    case "unarchive_article": return api("PUT", `/articles/${args.id}/unarchive`);

    // Asset Layouts
    case "list_asset_layouts": return api("GET", "/asset_layouts", null, args);
    case "get_asset_layout": return api("GET", `/asset_layouts/${args.id}`);
    case "create_asset_layout": return api("POST", "/asset_layouts", { asset_layout: args });
    case "update_asset_layout": { const { id, ...body } = args; return api("PUT", `/asset_layouts/${id}`, { asset_layout: body }); }

    // Asset Passwords
    case "list_asset_passwords": return api("GET", "/asset_passwords", null, args);
    case "create_asset_password": return api("POST", "/asset_passwords", { asset_password: args });
    case "get_asset_password": return api("GET", `/asset_passwords/${args.id}`);
    case "update_asset_password": { const { id, ...body } = args; return api("PUT", `/asset_passwords/${id}`, { asset_password: body }); }
    case "delete_asset_password": return api("DELETE", `/asset_passwords/${args.id}`);
    case "archive_asset_password": return api("PUT", `/asset_passwords/${args.id}/archive`);
    case "unarchive_asset_password": return api("PUT", `/asset_passwords/${args.id}/unarchive`);

    // Assets
    case "list_assets": return api("GET", "/assets", null, args);
    case "list_company_assets": { const { company_id, ...params } = args; return api("GET", `/companies/${company_id}/assets`, null, params); }
    case "create_asset": { const { company_id, ...body } = args; return api("POST", `/companies/${company_id}/assets`, body); }
    case "get_asset": return api("GET", `/companies/${args.company_id}/assets/${args.id}`);
    case "update_asset": { const { company_id, id, ...body } = args; return api("PUT", `/companies/${company_id}/assets/${id}`, { asset: body }); }
    case "delete_asset": return api("DELETE", `/companies/${args.company_id}/assets/${args.id}`);
    case "archive_asset": return api("PUT", `/companies/${args.company_id}/assets/${args.id}/archive`);
    case "unarchive_asset": return api("PUT", `/companies/${args.company_id}/assets/${args.id}/unarchive`);
    case "move_asset_layout": return api("PUT", `/companies/${args.company_id}/assets/${args.id}/move_layout`, { asset_layout_id: args.asset_layout_id });

    // Cards
    case "lookup_cards": return api("GET", "/cards/lookup", null, args);

    // Companies
    case "list_companies": return api("GET", "/companies", null, args);
    case "create_company": return api("POST", "/companies", args);
    case "get_company": return api("GET", `/companies/${args.id}`);
    case "update_company": { const { id, ...body } = args; return api("PUT", `/companies/${id}`, body); }
    case "delete_company": return api("DELETE", `/companies/${args.id}`);
    case "archive_company": return api("PUT", `/companies/${args.id}/archive`);
    case "unarchive_company": return api("PUT", `/companies/${args.id}/unarchive`);

    // Expirations
    case "list_expirations": return api("GET", "/expirations", null, args);
    case "update_expiration": { const { id, ...body } = args; return api("PUT", `/expirations/${id}`, { expiration: body }); }
    case "delete_expiration": return api("DELETE", `/expirations/${args.id}`);

    // Exports
    case "list_exports": return api("GET", "/exports");
    case "create_export": return api("POST", "/exports", { export: args });
    case "get_export": { const { id, download } = args; return api("GET", `/exports/${id}`, null, download ? { download: true } : null); }

    // Flag Types
    case "list_flag_types": return api("GET", "/flag_types", null, args);
    case "create_flag_type": return api("POST", "/flag_types", { flag_type: args });
    case "get_flag_type": return api("GET", `/flag_types/${args.id}`);
    case "update_flag_type": { const { id, ...body } = args; return api("PUT", `/flag_types/${id}`, { flag_type: body }); }
    case "delete_flag_type": return api("DELETE", `/flag_types/${args.id}`);

    // Flags
    case "list_flags": return api("GET", "/flags", null, args);
    case "create_flag": return api("POST", "/flags", { flag: args });
    case "get_flag": return api("GET", `/flags/${args.id}`);
    case "update_flag": { const { id, ...body } = args; return api("PUT", `/flags/${id}`, { flag: body }); }
    case "delete_flag": return api("DELETE", `/flags/${args.id}`);

    // Folders
    case "list_folders": return api("GET", "/folders", null, args);
    case "create_folder": return api("POST", "/folders", { folder: args });
    case "get_folder": return api("GET", `/folders/${args.id}`);
    case "update_folder": { const { id, ...body } = args; return api("PUT", `/folders/${id}`, { folder: body }); }
    case "delete_folder": return api("DELETE", `/folders/${args.id}`);

    // Groups
    case "list_groups": return api("GET", "/groups", null, args);
    case "get_group": return api("GET", `/groups/${args.id}`);

    // IP Addresses
    case "list_ip_addresses": return api("GET", "/ip_addresses", null, args);
    case "create_ip_address": return api("POST", "/ip_addresses", args);
    case "get_ip_address": return api("GET", `/ip_addresses/${args.id}`);
    case "update_ip_address": { const { id, ...body } = args; return api("PUT", `/ip_addresses/${id}`, body); }
    case "delete_ip_address": return api("DELETE", `/ip_addresses/${args.id}`);

    // Lists
    case "list_lists": return api("GET", "/lists", null, args);
    case "create_list": return api("POST", "/lists", { list: args });
    case "get_list": return api("GET", `/lists/${args.id}`);
    case "update_list": { const { id, ...body } = args; return api("PUT", `/lists/${id}`, { list: body }); }
    case "delete_list": return api("DELETE", `/lists/${args.id}`);

    // Magic Dash
    case "list_magic_dash": return api("GET", "/magic_dash", null, args);
    case "upsert_magic_dash": return api("POST", "/magic_dash", args);
    case "delete_magic_dash": return api("DELETE", "/magic_dash", null, args);
    case "delete_magic_dash_by_id": return api("DELETE", `/magic_dash/${args.id}`);

    // Matchers
    case "list_matchers": return api("GET", "/matchers", null, args);
    case "update_matcher": { const { id, ...body } = args; return api("PUT", `/matchers/${id}`, { matcher: body }); }
    case "delete_matcher": return api("DELETE", `/matchers/${args.id}`);

    // Networks
    case "list_networks": return api("GET", "/networks", null, args);
    case "create_network": return api("POST", "/networks", { network: args });
    case "get_network": return api("GET", `/networks/${args.id}`);
    case "update_network": { const { id, ...body } = args; return api("PUT", `/networks/${id}`, { network: body }); }
    case "delete_network": return api("DELETE", `/networks/${args.id}`);

    // Password Folders
    case "list_password_folders": return api("GET", "/password_folders", null, args);
    case "create_password_folder": return api("POST", "/password_folders", { password_folder: args });
    case "get_password_folder": return api("GET", `/password_folders/${args.id}`);
    case "update_password_folder": { const { id, ...body } = args; return api("PUT", `/password_folders/${id}`, { password_folder: body }); }
    case "delete_password_folder": return api("DELETE", `/password_folders/${args.id}`);

    // Procedure Tasks
    case "list_procedure_tasks": return api("GET", "/procedure_tasks", null, args);
    case "create_procedure_task": return api("POST", "/procedure_tasks", { procedure_task: args });
    case "get_procedure_task": return api("GET", `/procedure_tasks/${args.id}`);
    case "update_procedure_task": { const { id, ...body } = args; return api("PUT", `/procedure_tasks/${id}`, { procedure_task: body }); }
    case "delete_procedure_task": return api("DELETE", `/procedure_tasks/${args.id}`);

    // Procedures
    case "list_procedures": return api("GET", "/procedures", null, args);
    case "create_procedure": return api("POST", "/procedures", args);
    case "get_procedure": return api("GET", `/procedures/${args.id}`);
    case "update_procedure": { const { id, ...body } = args; return api("PUT", `/procedures/${id}`, body); }
    case "delete_procedure": return api("DELETE", `/procedures/${args.id}`);
    case "create_procedure_from_template": { const { id, ...params } = args; return api("POST", `/procedures/${id}/create_from_template`, null, params); }
    case "duplicate_procedure": { const { id, ...params } = args; return api("POST", `/procedures/${id}/duplicate`, null, params); }
    case "kickoff_procedure": { const { id, ...params } = args; return api("POST", `/procedures/${id}/kickoff`, null, params); }

    // Rack Storage Items
    case "list_rack_storage_items": return api("GET", "/rack_storage_items", null, args);
    case "create_rack_storage_item": return api("POST", "/rack_storage_items", { rack_storage_item: args });
    case "get_rack_storage_item": return api("GET", `/rack_storage_items/${args.id}`);
    case "update_rack_storage_item": { const { id, ...body } = args; return api("PUT", `/rack_storage_items/${id}`, { rack_storage_item: body }); }
    case "delete_rack_storage_item": return api("DELETE", `/rack_storage_items/${args.id}`);

    // Rack Storages
    case "list_rack_storages": return api("GET", "/rack_storages", null, args);
    case "create_rack_storage": return api("POST", "/rack_storages", args);
    case "get_rack_storage": return api("GET", `/rack_storages/${args.id}`);
    case "update_rack_storage": { const { id, ...body } = args; return api("PUT", `/rack_storages/${id}`, body); }
    case "delete_rack_storage": return api("DELETE", `/rack_storages/${args.id}`);

    // Relations
    case "list_relations": return api("GET", "/relations", null, args);
    case "create_relation": return api("POST", "/relations", { relation: args });
    case "delete_relation": return api("DELETE", `/relations/${args.id}`);

    // Uploads
    case "list_uploads": return api("GET", "/uploads");
    case "get_upload": return api("GET", `/uploads/${args.id}`);
    case "delete_upload": return api("DELETE", `/uploads/${args.id}`);

    // Users
    case "list_users": return api("GET", "/users", null, args);
    case "get_user": return api("GET", `/users/${args.id}`);

    // VLAN Zones
    case "list_vlan_zones": return api("GET", "/vlan_zones", null, args);
    case "create_vlan_zone": return api("POST", "/vlan_zones", { vlan_zone: args });
    case "get_vlan_zone": return api("GET", `/vlan_zones/${args.id}`);
    case "update_vlan_zone": { const { id, ...body } = args; return api("PUT", `/vlan_zones/${id}`, { vlan_zone: body }); }
    case "delete_vlan_zone": return api("DELETE", `/vlan_zones/${args.id}`);

    // VLANs
    case "list_vlans": return api("GET", "/vlans", null, args);
    case "create_vlan": return api("POST", "/vlans", { vlan: args });
    case "get_vlan": return api("GET", `/vlans/${args.id}`);
    case "update_vlan": { const { id, ...body } = args; return api("PUT", `/vlans/${id}`, { vlan: body }); }
    case "delete_vlan": return api("DELETE", `/vlans/${args.id}`);

    // Websites
    case "list_websites": return api("GET", "/websites", null, args);
    case "create_website": return api("POST", "/websites", { website: args });
    case "get_website": return api("GET", `/websites/${args.id}`);
    case "update_website": { const { id, ...body } = args; return api("PUT", `/websites/${id}`, { website: body }); }
    case "delete_website": return api("DELETE", `/websites/${args.id}`);

    // Photos
    case "list_photos": return api("GET", "/photos", null, args);
    case "create_photo": {
      const { file_path, ...fields } = args;
      return apiForm("POST", "/photos", { file: file_path, ...fields });
    }
    case "get_photo": { const { id, download } = args; return api("GET", `/photos/${id}`, null, download ? { download: true } : null); }
    case "update_photo": { const { id, ...body } = args; return api("PUT", `/photos/${id}`, { photo: body }); }
    case "delete_photo": return api("DELETE", `/photos/${args.id}`);

    // Public Photos
    case "list_public_photos": return api("GET", "/public_photos", null, args);
    case "create_public_photo": {
      const { file_path, ...fields } = args;
      return apiForm("POST", "/public_photos", { photo: file_path, ...fields });
    }
    case "get_public_photo": { const { id, download } = args; return api("GET", `/public_photos/${id}`, null, download ? { download: true } : null); }
    case "update_public_photo": {
      const { id, ...fields } = args;
      return apiForm("PUT", `/public_photos/${id}`, fields);
    }

    // Navigation Jump
    case "jump_to_card": return api("GET", "/cards/jump", null, args);
    case "jump_to_company": return api("GET", "/companies/jump", null, args);

    // Magic Dash positions
    case "update_magic_dash_positions": return api("PUT", "/magic_dash/update_positions", { company_id: args.company_id, positions: args.positions });

    // S3 Exports
    case "create_s3_export": return api("POST", "/s3_exports");

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// ---------------------------------------------------------------------------
// MCP Server setup
// ---------------------------------------------------------------------------
const server = new Server(
  { name: "hudu-mcp", version: "2.1.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  try {
    const result = await callTool(name, args ?? {});
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  } catch (error) {
    return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
  }
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
const transport = new StdioServerTransport();
await server.connect(transport);
console.error("Hudu MCP Server v2.1.0 running on stdio");
