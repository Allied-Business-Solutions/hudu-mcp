import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { api, apiForm } from "./api.js";
import { TOOLS } from "./tools.js";

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  switch (name) {

    // API Info
    case "get_api_info": return api("GET", "/api_info");

    // Activity Logs
    case "list_activity_logs": return api("GET", "/activity_logs", null, args as Record<string, string | number | boolean | undefined | null>);
    case "delete_activity_logs": return api("DELETE", "/activity_logs", null, { datetime: args.datetime as string, delete_unassigned_logs: args.delete_unassigned_logs as boolean | undefined });

    // Articles
    case "list_articles": return api("GET", "/articles", null, args as Record<string, string | number | boolean | undefined | null>);
    case "create_article": return api("POST", "/articles", { article: args });
    case "get_article": return api("GET", `/articles/${args.id}`);
    case "update_article": { const { id, ...body } = args; return api("PUT", `/articles/${id}`, { article: body }); }
    case "delete_article": return api("DELETE", `/articles/${args.id}`);
    case "archive_article": return api("PUT", `/articles/${args.id}/archive`);
    case "unarchive_article": return api("PUT", `/articles/${args.id}/unarchive`);

    // Asset Layouts
    case "list_asset_layouts": return api("GET", "/asset_layouts", null, args as Record<string, string | number | boolean | undefined | null>);
    case "get_asset_layout": return api("GET", `/asset_layouts/${args.id}`);
    case "create_asset_layout": return api("POST", "/asset_layouts", { asset_layout: args });
    case "update_asset_layout": { const { id, ...body } = args; return api("PUT", `/asset_layouts/${id}`, { asset_layout: body }); }

    // Asset Passwords
    case "list_asset_passwords": return api("GET", "/asset_passwords", null, args as Record<string, string | number | boolean | undefined | null>);
    case "create_asset_password": return api("POST", "/asset_passwords", { asset_password: args });
    case "get_asset_password": return api("GET", `/asset_passwords/${args.id}`);
    case "update_asset_password": { const { id, ...body } = args; return api("PUT", `/asset_passwords/${id}`, { asset_password: body }); }
    case "delete_asset_password": return api("DELETE", `/asset_passwords/${args.id}`);
    case "archive_asset_password": return api("PUT", `/asset_passwords/${args.id}/archive`);
    case "unarchive_asset_password": return api("PUT", `/asset_passwords/${args.id}/unarchive`);

    // Assets
    case "list_assets": return api("GET", "/assets", null, args as Record<string, string | number | boolean | undefined | null>);
    case "list_company_assets": { const { company_id, ...params } = args; return api("GET", `/companies/${company_id}/assets`, null, params as Record<string, string | number | boolean | undefined | null>); }
    case "create_asset": { const { company_id, ...body } = args; return api("POST", `/companies/${company_id}/assets`, body); }
    case "get_asset": return api("GET", `/companies/${args.company_id}/assets/${args.id}`);
    case "update_asset": { const { company_id, id, ...body } = args; return api("PUT", `/companies/${company_id}/assets/${id}`, { asset: body }); }
    case "delete_asset": return api("DELETE", `/companies/${args.company_id}/assets/${args.id}`);
    case "archive_asset": return api("PUT", `/companies/${args.company_id}/assets/${args.id}/archive`);
    case "unarchive_asset": return api("PUT", `/companies/${args.company_id}/assets/${args.id}/unarchive`);
    case "move_asset_layout": return api("PUT", `/companies/${args.company_id}/assets/${args.id}/move_layout`, { asset_layout_id: args.asset_layout_id });

    // Cards
    case "lookup_cards": return api("GET", "/cards/lookup", null, args as Record<string, string | number | boolean | undefined | null>);

    // Companies
    case "list_companies": return api("GET", "/companies", null, args as Record<string, string | number | boolean | undefined | null>);
    case "create_company": return api("POST", "/companies", args);
    case "get_company": return api("GET", `/companies/${args.id}`);
    case "update_company": { const { id, ...body } = args; return api("PUT", `/companies/${id}`, body); }
    case "delete_company": return api("DELETE", `/companies/${args.id}`);
    case "archive_company": return api("PUT", `/companies/${args.id}/archive`);
    case "unarchive_company": return api("PUT", `/companies/${args.id}/unarchive`);

    // Expirations
    case "list_expirations": return api("GET", "/expirations", null, args as Record<string, string | number | boolean | undefined | null>);
    case "update_expiration": { const { id, ...body } = args; return api("PUT", `/expirations/${id}`, { expiration: body }); }
    case "delete_expiration": return api("DELETE", `/expirations/${args.id}`);

    // Exports
    case "list_exports": return api("GET", "/exports");
    case "create_export": return api("POST", "/exports", { export: args });
    case "get_export": { const { id, download } = args; return api("GET", `/exports/${id}`, null, download ? { download: true } : null); }

    // Flag Types
    case "list_flag_types": return api("GET", "/flag_types", null, args as Record<string, string | number | boolean | undefined | null>);
    case "create_flag_type": return api("POST", "/flag_types", { flag_type: args });
    case "get_flag_type": return api("GET", `/flag_types/${args.id}`);
    case "update_flag_type": { const { id, ...body } = args; return api("PUT", `/flag_types/${id}`, { flag_type: body }); }
    case "delete_flag_type": return api("DELETE", `/flag_types/${args.id}`);

    // Flags
    case "list_flags": return api("GET", "/flags", null, args as Record<string, string | number | boolean | undefined | null>);
    case "create_flag": return api("POST", "/flags", { flag: args });
    case "get_flag": return api("GET", `/flags/${args.id}`);
    case "update_flag": { const { id, ...body } = args; return api("PUT", `/flags/${id}`, { flag: body }); }
    case "delete_flag": return api("DELETE", `/flags/${args.id}`);

    // Folders
    case "list_folders": return api("GET", "/folders", null, args as Record<string, string | number | boolean | undefined | null>);
    case "create_folder": return api("POST", "/folders", { folder: args });
    case "get_folder": return api("GET", `/folders/${args.id}`);
    case "update_folder": { const { id, ...body } = args; return api("PUT", `/folders/${id}`, { folder: body }); }
    case "delete_folder": return api("DELETE", `/folders/${args.id}`);

    // Groups
    case "list_groups": return api("GET", "/groups", null, args as Record<string, string | number | boolean | undefined | null>);
    case "get_group": return api("GET", `/groups/${args.id}`);

    // IP Addresses
    case "list_ip_addresses": return api("GET", "/ip_addresses", null, args as Record<string, string | number | boolean | undefined | null>);
    case "create_ip_address": return api("POST", "/ip_addresses", args);
    case "get_ip_address": return api("GET", `/ip_addresses/${args.id}`);
    case "update_ip_address": { const { id, ...body } = args; return api("PUT", `/ip_addresses/${id}`, body); }
    case "delete_ip_address": return api("DELETE", `/ip_addresses/${args.id}`);

    // Lists
    case "list_lists": return api("GET", "/lists", null, args as Record<string, string | number | boolean | undefined | null>);
    case "create_list": return api("POST", "/lists", { list: args });
    case "get_list": return api("GET", `/lists/${args.id}`);
    case "update_list": { const { id, ...body } = args; return api("PUT", `/lists/${id}`, { list: body }); }
    case "delete_list": return api("DELETE", `/lists/${args.id}`);

    // Magic Dash
    case "list_magic_dash": return api("GET", "/magic_dash", null, args as Record<string, string | number | boolean | undefined | null>);
    case "upsert_magic_dash": return api("POST", "/magic_dash", args);
    case "delete_magic_dash": return api("DELETE", "/magic_dash", null, args as Record<string, string | number | boolean | undefined | null>);
    case "delete_magic_dash_by_id": return api("DELETE", `/magic_dash/${args.id}`);
    case "update_magic_dash_positions": return api("PUT", "/magic_dash/update_positions", { company_id: args.company_id, positions: args.positions });

    // Matchers
    case "list_matchers": return api("GET", "/matchers", null, args as Record<string, string | number | boolean | undefined | null>);
    case "update_matcher": { const { id, ...body } = args; return api("PUT", `/matchers/${id}`, { matcher: body }); }
    case "delete_matcher": return api("DELETE", `/matchers/${args.id}`);

    // Networks
    case "list_networks": return api("GET", "/networks", null, args as Record<string, string | number | boolean | undefined | null>);
    case "create_network": return api("POST", "/networks", { network: args });
    case "get_network": return api("GET", `/networks/${args.id}`);
    case "update_network": { const { id, ...body } = args; return api("PUT", `/networks/${id}`, { network: body }); }
    case "delete_network": return api("DELETE", `/networks/${args.id}`);

    // Password Folders
    case "list_password_folders": return api("GET", "/password_folders", null, args as Record<string, string | number | boolean | undefined | null>);
    case "create_password_folder": return api("POST", "/password_folders", { password_folder: args });
    case "get_password_folder": return api("GET", `/password_folders/${args.id}`);
    case "update_password_folder": { const { id, ...body } = args; return api("PUT", `/password_folders/${id}`, { password_folder: body }); }
    case "delete_password_folder": return api("DELETE", `/password_folders/${args.id}`);

    // Procedure Tasks
    case "list_procedure_tasks": return api("GET", "/procedure_tasks", null, args as Record<string, string | number | boolean | undefined | null>);
    case "create_procedure_task": return api("POST", "/procedure_tasks", { procedure_task: args });
    case "get_procedure_task": return api("GET", `/procedure_tasks/${args.id}`);
    case "update_procedure_task": { const { id, ...body } = args; return api("PUT", `/procedure_tasks/${id}`, { procedure_task: body }); }
    case "delete_procedure_task": return api("DELETE", `/procedure_tasks/${args.id}`);

    // Procedures
    case "list_procedures": return api("GET", "/procedures", null, args as Record<string, string | number | boolean | undefined | null>);
    case "create_procedure": return api("POST", "/procedures", args);
    case "get_procedure": return api("GET", `/procedures/${args.id}`);
    case "update_procedure": { const { id, ...body } = args; return api("PUT", `/procedures/${id}`, body); }
    case "delete_procedure": return api("DELETE", `/procedures/${args.id}`);
    case "create_procedure_from_template": { const { id, ...params } = args; return api("POST", `/procedures/${id}/create_from_template`, null, params as Record<string, string | number | boolean | undefined | null>); }
    case "duplicate_procedure": { const { id, ...params } = args; return api("POST", `/procedures/${id}/duplicate`, null, params as Record<string, string | number | boolean | undefined | null>); }
    case "kickoff_procedure": { const { id, ...params } = args; return api("POST", `/procedures/${id}/kickoff`, null, params as Record<string, string | number | boolean | undefined | null>); }

    // Rack Storage Items
    case "list_rack_storage_items": return api("GET", "/rack_storage_items", null, args as Record<string, string | number | boolean | undefined | null>);
    case "create_rack_storage_item": return api("POST", "/rack_storage_items", { rack_storage_item: args });
    case "get_rack_storage_item": return api("GET", `/rack_storage_items/${args.id}`);
    case "update_rack_storage_item": { const { id, ...body } = args; return api("PUT", `/rack_storage_items/${id}`, { rack_storage_item: body }); }
    case "delete_rack_storage_item": return api("DELETE", `/rack_storage_items/${args.id}`);

    // Rack Storages
    case "list_rack_storages": return api("GET", "/rack_storages", null, args as Record<string, string | number | boolean | undefined | null>);
    case "create_rack_storage": return api("POST", "/rack_storages", args);
    case "get_rack_storage": return api("GET", `/rack_storages/${args.id}`);
    case "update_rack_storage": { const { id, ...body } = args; return api("PUT", `/rack_storages/${id}`, body); }
    case "delete_rack_storage": return api("DELETE", `/rack_storages/${args.id}`);

    // Relations
    case "list_relations": return api("GET", "/relations", null, args as Record<string, string | number | boolean | undefined | null>);
    case "create_relation": return api("POST", "/relations", { relation: args });
    case "delete_relation": return api("DELETE", `/relations/${args.id}`);

    // Uploads
    case "list_uploads": return api("GET", "/uploads");
    case "get_upload": return api("GET", `/uploads/${args.id}`);
    case "delete_upload": return api("DELETE", `/uploads/${args.id}`);

    // Users
    case "list_users": return api("GET", "/users", null, args as Record<string, string | number | boolean | undefined | null>);
    case "get_user": return api("GET", `/users/${args.id}`);

    // VLAN Zones
    case "list_vlan_zones": return api("GET", "/vlan_zones", null, args as Record<string, string | number | boolean | undefined | null>);
    case "create_vlan_zone": return api("POST", "/vlan_zones", { vlan_zone: args });
    case "get_vlan_zone": return api("GET", `/vlan_zones/${args.id}`);
    case "update_vlan_zone": { const { id, ...body } = args; return api("PUT", `/vlan_zones/${id}`, { vlan_zone: body }); }
    case "delete_vlan_zone": return api("DELETE", `/vlan_zones/${args.id}`);

    // VLANs
    case "list_vlans": return api("GET", "/vlans", null, args as Record<string, string | number | boolean | undefined | null>);
    case "create_vlan": return api("POST", "/vlans", { vlan: args });
    case "get_vlan": return api("GET", `/vlans/${args.id}`);
    case "update_vlan": { const { id, ...body } = args; return api("PUT", `/vlans/${id}`, { vlan: body }); }
    case "delete_vlan": return api("DELETE", `/vlans/${args.id}`);

    // Websites
    case "list_websites": return api("GET", "/websites", null, args as Record<string, string | number | boolean | undefined | null>);
    case "create_website": return api("POST", "/websites", { website: args });
    case "get_website": return api("GET", `/websites/${args.id}`);
    case "update_website": { const { id, ...body } = args; return api("PUT", `/websites/${id}`, { website: body }); }
    case "delete_website": return api("DELETE", `/websites/${args.id}`);

    // Photos
    case "list_photos": return api("GET", "/photos", null, args as Record<string, string | number | boolean | undefined | null>);
    case "create_photo": {
      const { file_path, ...fields } = args;
      return apiForm("POST", "/photos", { file: file_path, ...fields });
    }
    case "get_photo": { const { id, download } = args; return api("GET", `/photos/${id}`, null, download ? { download: true } : null); }
    case "update_photo": { const { id, ...body } = args; return api("PUT", `/photos/${id}`, { photo: body }); }
    case "delete_photo": return api("DELETE", `/photos/${args.id}`);

    // Public Photos
    case "list_public_photos": return api("GET", "/public_photos", null, args as Record<string, string | number | boolean | undefined | null>);
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
    case "jump_to_card": return api("GET", "/cards/jump", null, args as Record<string, string | number | boolean | undefined | null>);
    case "jump_to_company": return api("GET", "/companies/jump", null, args as Record<string, string | number | boolean | undefined | null>);

    // S3 Exports
    case "create_s3_export": return api("POST", "/s3_exports");

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

const server = new Server(
  { name: "hudu-mcp", version: "3.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  try {
    const result = await callTool(name, (args ?? {}) as Record<string, unknown>);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { content: [{ type: "text", text: `Error: ${message}` }], isError: true };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("Hudu MCP Server v3.0.0 running on stdio");
