#!/usr/bin/env node
/**
 * MCP Server generated from OpenAPI spec for pluggy-api v1.0.0
 * Generated on: 2026-05-10T20:44:44.451Z
 */

// Load environment variables from .env file
import dotenv from 'dotenv';
dotenv.config();

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool,
  type CallToolResult,
  type CallToolRequest
} from "@modelcontextprotocol/sdk/types.js";
import { setupWebServer } from "./web-server.js";

import { z, ZodError } from 'zod';
import { jsonSchemaToZod } from 'json-schema-to-zod';
import axios, { type AxiosRequestConfig, type AxiosError } from 'axios';

/**
 * Type definition for JSON objects
 */
type JsonObject = Record<string, any>;

/**
 * Interface for MCP Tool Definition
 */
interface McpToolDefinition {
    name: string;
    description: string;
    inputSchema: any;
    method: string;
    pathTemplate: string;
    executionParameters: { name: string, in: string }[];
    requestBodyContentType?: string;
    securityRequirements: any[];
}

/**
 * Server configuration
 */
export const SERVER_NAME = "pluggy-api";
export const SERVER_VERSION = "1.0.0";
// Base URL for the API, can be set via environment variable or determined from OpenAPI spec
export const API_BASE_URL = process.env.API_BASE_URL || "https://api.pluggy.ai";
console.error("API_BASE_URL is set to:", API_BASE_URL);

/**
 * MCP Server instance
 */
const server = new Server(
    { name: SERVER_NAME, version: SERVER_VERSION },
    { capabilities: { tools: {} } }
);

/**
 * Map of tool definitions by name
 */
const toolDefinitionMap: Map<string, McpToolDefinition> = new Map([

  ["auth-create", {
    name: "auth-create",
    description: `Validate clientId and clientSecret and return an API Key`,
    inputSchema: {"type":"object","properties":{"requestBody":{"description":"Authentication parameters required to get access to Pluggy's API","properties":{"clientId":{"type":"string","description":"Client id","format":"uuid"},"clientSecret":{"type":"string","description":"Client secret"}},"type":"object","required":["clientId","clientSecret"]}},"required":["requestBody"]},
    method: "post",
    pathTemplate: "/auth",
    executionParameters: [],
    requestBodyContentType: "application/json",
    securityRequirements: []
  }],
  ["connect-token-create", {
    name: "connect-token-create",
    description: `Creates a connect token`,
    inputSchema: {"type":"object","properties":{"requestBody":{"description":"Create connect token payload","properties":{"itemId":{"type":"string","description":"Item identifier to allow Connect Widget to performan an update on it.","format":"uuid"},"options":{"description":"Item options available to send through connect tokens","properties":{"clientUserId":{"type":"string","description":"Client's external identifier for the user, it can be a ID, UUID or even an email. This is free for clients to use."},"webhookUrl":{"type":"string","description":"Url to be notified of this specific item changes"},"oauthRedirectUri":{"type":"string","description":"Url to redirect the user after the connect flow"},"avoidDuplicates":{"type":"boolean","description":"Avoids creating a new item if there is already one with the same credentials"}},"type":"object"}},"type":"object"}}},
    method: "post",
    pathTemplate: "/connect_token",
    executionParameters: [],
    requestBodyContentType: "application/json",
    securityRequirements: [{"default":[]}]
  }],
  ["connectors-list", {
    name: "connectors-list",
    description: `This endpoint retrieves all available connectors.`,
    inputSchema: {"type":"object","properties":{"countries":{"type":"array","items":{"type":"string","enum":["BR"]},"description":"A list of countries of connectors to filter."},"types":{"type":"array","items":{"type":"string","enum":["PERSONAL_BANK","BUSINESS_BANK","INVESTMENT","INVOICE","TELECOMMUNICATION","OTHER"]},"description":"A list of types of connectors to filter."},"name":{"type":"string","description":"Name alike look up of the connector"},"sandbox":{"type":"boolean","description":"Include sandbox connectors if set to true (default: false)."},"healthDetails":{"type":"boolean","description":"Include health details about latest connections and percentage of errors (connection rate)"},"isOpenFinance":{"type":"boolean","description":"Filter connectors by the `isOpenFinance` attribute. If not sent, it won't filter."},"supportsPaymentInitiation":{"type":"boolean","description":"Filter connectors by the `supportsPaymentInitiation` attribute. If not sent, it won't filter."},"supportsSmartTransfers":{"type":"boolean","description":"Filter connectors by the `supportsSmartTransfers` attribute. If not sent, it won't filter."},"supportsAutomaticPix":{"type":"boolean","description":"Filter connectors by the `supportsAutomaticPix` attribute. If not sent, it won't filter."}}},
    method: "get",
    pathTemplate: "/connectors",
    executionParameters: [{"name":"countries","in":"query"},{"name":"types","in":"query"},{"name":"name","in":"query"},{"name":"sandbox","in":"query"},{"name":"healthDetails","in":"query"},{"name":"isOpenFinance","in":"query"},{"name":"supportsPaymentInitiation","in":"query"},{"name":"supportsSmartTransfers","in":"query"},{"name":"supportsAutomaticPix","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"default":[]}]
  }],
  ["connector-retrieve", {
    name: "connector-retrieve",
    description: `This endpoint retrieves a specific connector.`,
    inputSchema: {"type":"object","properties":{"id":{"type":"number","description":"Connector primary identifier"},"healthDetails":{"type":"boolean","description":"Include health details about latest connections and percentage of errors (connection rate)"}},"required":["id"]},
    method: "get",
    pathTemplate: "/connectors/{id}",
    executionParameters: [{"name":"id","in":"path"},{"name":"healthDetails","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"default":[]}]
  }],
  ["connectors-validate", {
    name: "connectors-validate",
    description: `Validates a connector parameters usign the connector validation`,
    inputSchema: {"type":"object","properties":{"id":{"type":"number","format":"double","description":"Connector's primary identifier"},"requestBody":{"description":"Connector's input credentials in a key-value object.","properties":{},"additionalProperties":{"type":"string"},"type":"object"}},"required":["id","requestBody"]},
    method: "post",
    pathTemplate: "/connectors/{id}/validate",
    executionParameters: [{"name":"id","in":"path"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"default":[]}]
  }],
  ["items-create", {
    name: "items-create",
    description: `Creates a item and syncs all the products with the financial institution, using as credentials the sent parameters.`,
    inputSchema: {"type":"object","properties":{"requestBody":{"description":"Create Item Request","properties":{"connectorId":{"type":"number","description":"Primary identifier of the connector"},"parameters":{"oneOf":[{"type":"object"},{"type":"string"}],"properties":{},"description":"Connector's credentials that are required to execute on a Key-Value object or a string if they are encrypted","additionalProperties":{"type":"string"}},"webhookUrl":{"type":"string","format":"uri","description":"Url to be notified of item changes"},"clientUserId":{"type":"string","description":"Client's external identifier for the user, it can be a ID, UUID or even an email. This is free for clients to use."},"oauthRedirectUri":{"type":"string","format":"uri","description":"Redirect URI required for the Oauth flow"},"products":{"type":"array","items":{"type":"string","enum":["ACCOUNTS","CREDIT_CARDS","TRANSACTIONS","PAYMENT_DATA","INVESTMENTS","INVESTMENTS_TRANSACTIONS","IDENTITY","BROKERAGE_NOTE","MOVE_SECURITY","LOANS"]},"description":"Products to be collected in the connection"},"avoidDuplicates":{"type":"boolean","description":"Avoids creating a new item if there is already one with the same credentials"}},"type":"object","required":["connectorId","parameters"]}},"required":["requestBody"]},
    method: "post",
    pathTemplate: "/items",
    executionParameters: [],
    requestBodyContentType: "application/json",
    securityRequirements: [{"default":[]}]
  }],
  ["items-retrieve", {
    name: "items-retrieve",
    description: `Recovers the item resource by its id`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"uuid","description":"Item primary identifier"}},"required":["id"]},
    method: "get",
    pathTemplate: "/items/{id}",
    executionParameters: [{"name":"id","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"default":[]}]
  }],
  ["items-delete", {
    name: "items-delete",
    description: `Delete the item by its primary identifier`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"uuid","description":"Item primary identifier"}},"required":["id"]},
    method: "delete",
    pathTemplate: "/items/{id}",
    executionParameters: [{"name":"id","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"default":[]}]
  }],
  ["items-update", {
    name: "items-update",
    description: `Triggers new syncronization for the Item, optionally updating the stored credentials.`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"uuid","description":"Item primary identifier"},"requestBody":{"description":"Update item request","properties":{"parameters":{"oneOf":[{"type":"object"},{"type":"string"}],"properties":{},"description":"Parameters to update on the item stored credentials.","additionalProperties":{"type":"string"}},"clientUserId":{"type":"string","description":"Client's external identifier for the user, it can be a ID, UUID or even an email. This is free for clients to use."},"webhookUrl":{"type":"string","format":"uri","description":"Url to be notified of item changes"},"products":{"type":"array","items":{"type":"string","enum":["ACCOUNTS","CREDIT_CARDS","TRANSACTIONS","PAYMENT_DATA","INVESTMENTS","INVESTMENTS_TRANSACTIONS","IDENTITY","BROKERAGE_NOTE","MOVE_SECURITY","LOANS"]},"description":"Products to be collected in the connection"}},"type":"object"}},"required":["id"]},
    method: "patch",
    pathTemplate: "/items/{id}",
    executionParameters: [{"name":"id","in":"path"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"default":[]}]
  }],
  ["items-send-mfa", {
    name: "items-send-mfa",
    description: `When item is Waiting User Input, this method allows to submit multi-factor authentication value`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"uuid","description":"Item primary identifier"},"requestBody":{"type":"object","properties":{},"description":"Request with the MFA value provided by the user, in the format [name]:[value]","additionalProperties":{"type":"string"}}},"required":["id","requestBody"]},
    method: "post",
    pathTemplate: "/items/{id}/mfa",
    executionParameters: [{"name":"id","in":"path"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"default":[]}]
  }],
  ["items-disable-autosync", {
    name: "items-disable-autosync",
    description: `When client disables auto sync, the item will not be updated automatically anymore, until the client force an item update.`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"uuid","description":"Item primary identifier"}},"required":["id"]},
    method: "patch",
    pathTemplate: "/items/{id}/disable-auto-sync",
    executionParameters: [{"name":"id","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"default":[]}]
  }],
  ["consents-list", {
    name: "consents-list",
    description: `Recovers all consents given to the item provided`,
    inputSchema: {"type":"object","properties":{"itemId":{"type":"string","format":"uuid","description":"Item primary identifier"}},"required":["itemId"]},
    method: "get",
    pathTemplate: "/consents",
    executionParameters: [{"name":"itemId","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"default":[]}]
  }],
  ["consent-retrieve", {
    name: "consent-retrieve",
    description: `Recovers the consent resource by it's id`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"uuid","description":"Consent primary identifier"}},"required":["id"]},
    method: "get",
    pathTemplate: "/consents/{id}",
    executionParameters: [{"name":"id","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"default":[]}]
  }],
  ["accounts-list", {
    name: "accounts-list",
    description: `Recovers all accounts collected for the item provided`,
    inputSchema: {"type":"object","properties":{"itemId":{"type":"string","format":"uuid","description":"Item primary identifier"},"type":{"type":"string","enum":["BANK","CREDIT"],"description":"Parameter to filter between bank accounts and credit accounts"}},"required":["itemId"]},
    method: "get",
    pathTemplate: "/accounts",
    executionParameters: [{"name":"itemId","in":"query"},{"name":"type","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"default":[]}]
  }],
  ["accounts-retrieve", {
    name: "accounts-retrieve",
    description: `Recovers the account resource by its id`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","description":"Account primary identifier"}},"required":["id"]},
    method: "get",
    pathTemplate: "/accounts/{id}",
    executionParameters: [{"name":"id","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"default":[]}]
  }],
  ["account-statements-list", {
    name: "account-statements-list",
    description: `Recovers all statements collected for the account provided`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","description":"Account primary identifier"}},"required":["id"]},
    method: "get",
    pathTemplate: "/accounts/{id}/statements",
    executionParameters: [{"name":"id","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"default":[]}]
  }],
  ["account-balance-get", {
    name: "account-balance-get",
    description: `Fetches the real-time balance for the account directly from the financial institution connector, without requiring a full item sync.`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","description":"Account primary identifier"}},"required":["id"]},
    method: "get",
    pathTemplate: "/accounts/{id}/balance",
    executionParameters: [{"name":"id","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"default":[]}]
  }],
  ["transactions-list", {
    name: "transactions-list",
    description: `Recovers all transactions collected for the acount provided`,
    inputSchema: {"type":"object","properties":{"accountId":{"type":"string","format":"uuid","description":"Account primary identifier"},"ids":{"type":"array","items":{"type":"string","format":"uuid"},"description":"Array of transaction identifiers. If defined, 'from' and 'to' parameters will be discarded"},"from":{"type":"string","format":"date-time","description":"Filter greater than date. Format (yyyy-mm-dd)"},"to":{"type":"string","format":"date-time","description":"Filter lower than date. Format (yyyy-mm-dd)"},"pageSize":{"type":"number","format":"double","minimum":1,"maximum":500,"description":"Page size for the paging request, default: 500"},"page":{"type":"number","format":"double","description":"Page number for the paging request, default: 1"},"billId":{"type":"string","format":"uuid","description":"Credit Card Bill's primary identifier, if account is a credit card."},"createdAtFrom":{"type":"string","format":"date-time","description":"Filter greater than createdAt. Format (yyyy-mm-ddThh:mm:ss.000Z)"}},"required":["accountId"]},
    method: "get",
    pathTemplate: "/transactions",
    executionParameters: [{"name":"accountId","in":"query"},{"name":"ids","in":"query"},{"name":"from","in":"query"},{"name":"to","in":"query"},{"name":"pageSize","in":"query"},{"name":"page","in":"query"},{"name":"billId","in":"query"},{"name":"createdAtFrom","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"default":[]}]
  }],
  ["transactions-list-by-cursor", {
    name: "transactions-list-by-cursor",
    description: `Recovers all transactions for the account provided using cursor-based pagination.`,
    inputSchema: {"type":"object","properties":{"accountId":{"type":"string","format":"uuid","description":"Account primary identifier"},"dateFrom":{"type":"string","format":"date-time","description":"Filter transactions with date greater than or equal to the given date. Format (yyyy-mm-dd). Cannot be used together with createdAtFrom."},"createdAtFrom":{"type":"string","format":"date-time","description":"Filter transactions created at or after this date. Format (yyyy-mm-ddThh:mm:ss.000Z)"},"after":{"type":"string","description":"Cursor for the next page of results. Obtained from the 'next' field of a previous response."}},"required":["accountId"]},
    method: "get",
    pathTemplate: "/v2/transactions",
    executionParameters: [{"name":"accountId","in":"query"},{"name":"dateFrom","in":"query"},{"name":"createdAtFrom","in":"query"},{"name":"after","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"default":[]}]
  }],
  ["transactions-retrieve", {
    name: "transactions-retrieve",
    description: `Recovers the transaction resource by it's id`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"uuid","description":"transaction primary identifier"}},"required":["id"]},
    method: "get",
    pathTemplate: "/transactions/{id}",
    executionParameters: [{"name":"id","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"default":[]}]
  }],
  ["transactions-Update", {
    name: "transactions-Update",
    description: `Update the transaction's category by it's id`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"uuid","description":"transaction primary identifier"},"requestBody":{"description":"New category identifier","properties":{"categoryId":{"type":"string","description":"Identifier of the category"}},"type":"object","required":["categoryId"]}},"required":["id","requestBody"]},
    method: "patch",
    pathTemplate: "/transactions/{id}",
    executionParameters: [{"name":"id","in":"path"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"default":[]}]
  }],
  ["investments-list", {
    name: "investments-list",
    description: `Recovers all investments collected for the item provided`,
    inputSchema: {"type":"object","properties":{"itemId":{"type":"string","format":"uuid","description":"Item's primary identifier"},"type":{"type":"string","enum":["COE","EQUITY","ETF","FIXED_INCOME","MUTUAL_FUND","SECURITY","OTHER"],"description":"Investment's type to filter"},"pageSize":{"type":"number","format":"double","description":"Page size for the paging request, default: 500"},"page":{"type":"number","format":"double","description":"Page number for the paging request, default: 1"}},"required":["itemId"]},
    method: "get",
    pathTemplate: "/investments",
    executionParameters: [{"name":"itemId","in":"query"},{"name":"type","in":"query"},{"name":"pageSize","in":"query"},{"name":"page","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"default":[]}]
  }],
  ["investments-retrieve", {
    name: "investments-retrieve",
    description: `Recovers the investment resource by its id`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"uuid","description":"investment primary identifier"}},"required":["id"]},
    method: "get",
    pathTemplate: "/investments/{id}",
    executionParameters: [{"name":"id","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"default":[]}]
  }],
  ["investment-transactions-list", {
    name: "investment-transactions-list",
    description: `Recovers all investment transactions for the investment provided`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"uuid","description":"Investment primary identifier"},"pageSize":{"type":"number","format":"double","description":"Page size for the paging request, default: 500"},"page":{"type":"number","format":"double","description":"Page number for the paging request, default: 1"}},"required":["id"]},
    method: "get",
    pathTemplate: "/investments/{id}/transactions",
    executionParameters: [{"name":"id","in":"path"},{"name":"pageSize","in":"query"},{"name":"page","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"default":[]}]
  }],
  ["identity-find-by-item", {
    name: "identity-find-by-item",
    description: `Recovers identity of an item if available`,
    inputSchema: {"type":"object","properties":{"itemId":{"type":"string","format":"uuid","description":"Item's primary identifier"}},"required":["itemId"]},
    method: "get",
    pathTemplate: "/identity",
    executionParameters: [{"name":"itemId","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"default":[]}]
  }],
  ["identity-retrieve", {
    name: "identity-retrieve",
    description: `Recovers the identity resource by its id`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"uuid","description":"identity primary identifier"}},"required":["id"]},
    method: "get",
    pathTemplate: "/identity/{id}",
    executionParameters: [{"name":"id","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"default":[]}]
  }],
  ["webhooks-list", {
    name: "webhooks-list",
    description: `Retrieves all Webhooks associated with your application`,
    inputSchema: {"type":"object","properties":{}},
    method: "get",
    pathTemplate: "/webhooks",
    executionParameters: [],
    requestBodyContentType: undefined,
    securityRequirements: [{"default":[]}]
  }],
  ["webhooks-create", {
    name: "webhooks-create",
    description: `Creates a webhook attached to the specific event and provides the notification url`,
    inputSchema: {"type":"object","properties":{"requestBody":{"description":"Expects the following webhooks parameters:\nevent: One of the event types that are supported.\nurl: An https url that will receive the POST of the event.\nheaders: optional key-value pairs to send with the POST of the event.","properties":{"url":{"type":"string","description":""},"event":{"enum":["all","item/created","item/updated","item/error","item/deleted","item/waiting_user_input","item/waiting_user_action","item/login_succeeded","connector/status_updated","transactions/created","transactions/updated","transactions/deleted","payment_intent/created","payment_intent/completed","payment_intent/waiting_payer_authorization","payment_intent/error","payment_request/updated","scheduled_payment/created","scheduled_payment/completed","scheduled_payment/error","scheduled_payment/canceled","scheduled_payment/all_completed","scheduled_payment/all_created","boleto/updated","automatic_pix_payment/created","automatic_pix_payment/completed","automatic_pix_payment/error","automatic_pix_payment/canceled","smart_transfer_preauthorization/completed","smart_transfer_preauthorization/error","smart_transfer_payment/completed","smart_transfer_payment/error"],"type":"string","description":""},"headers":{"type":"object","description":"HTTP headers that will be included in the webhook notifications (useful for things like authorization)"}},"type":"object","required":["url","event"]}},"required":["requestBody"]},
    method: "post",
    pathTemplate: "/webhooks",
    executionParameters: [],
    requestBodyContentType: "application/json",
    securityRequirements: [{"default":[]}]
  }],
  ["webhooks-retrieve", {
    name: "webhooks-retrieve",
    description: `Retrieves a specific webhook`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","description":"webhook primary identifier"}},"required":["id"]},
    method: "get",
    pathTemplate: "/webhooks/{id}",
    executionParameters: [{"name":"id","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"default":[]}]
  }],
  ["webhooks-delete", {
    name: "webhooks-delete",
    description: `Deletes a webhook listener by its id`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"uuid","description":"webhook primary identifier"}},"required":["id"]},
    method: "delete",
    pathTemplate: "/webhooks/{id}",
    executionParameters: [{"name":"id","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"default":[]}]
  }],
  ["webhooks-update", {
    name: "webhooks-update",
    description: `Updates a webhook event and/or url listener. Once updated all events that are triggered will replicate the updated logic`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"uuid","description":"webhook primary identifier"},"requestBody":{"description":"Expects the following webhooks parameters:\nevent: One of the event types that are supported.\nurl: An https url that will receive the POST of the event.\nheaders: optional key-value pairs to send with the POST of the event.","properties":{"url":{"type":"string","description":""},"event":{"enum":["all","item/created","item/updated","item/error","item/deleted","item/waiting_user_input","item/waiting_user_action","item/login_succeeded","connector/status_updated","transactions/created","transactions/updated","transactions/deleted","payment_intent/created","payment_intent/completed","payment_intent/waiting_payer_authorization","payment_intent/error","payment_request/updated","scheduled_payment/created","scheduled_payment/completed","scheduled_payment/error","scheduled_payment/canceled","scheduled_payment/all_completed","scheduled_payment/all_created","boleto/updated","automatic_pix_payment/created","automatic_pix_payment/completed","automatic_pix_payment/error","automatic_pix_payment/canceled","smart_transfer_preauthorization/completed","smart_transfer_preauthorization/error","smart_transfer_payment/completed","smart_transfer_payment/error"],"type":"string","description":""},"headers":{"type":"object","description":"HTTP headers that will be included in the webhook notifications (useful for things like authorization)"}},"type":"object","required":["url","event"]}},"required":["id","requestBody"]},
    method: "patch",
    pathTemplate: "/webhooks/{id}",
    executionParameters: [{"name":"id","in":"path"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"default":[]}]
  }],
  ["categories-list", {
    name: "categories-list",
    description: `Recovers all categories active from the data categorization.
Can be filtered by the parentId of the category.`,
    inputSchema: {"type":"object","properties":{"parentId":{"type":"string","description":"Parent's primary identifier"}}},
    method: "get",
    pathTemplate: "/categories",
    executionParameters: [{"name":"parentId","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"default":[]}]
  }],
  ["categories-retrieve", {
    name: "categories-retrieve",
    description: `Recovers the category resource by its id`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","description":"category primary identifier"}},"required":["id"]},
    method: "get",
    pathTemplate: "/categories/{id}",
    executionParameters: [{"name":"id","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"default":[]}]
  }],
  ["client-category-rules-list", {
    name: "client-category-rules-list",
    description: `Recovers category rules`,
    inputSchema: {"type":"object","properties":{}},
    method: "get",
    pathTemplate: "/categories/rules",
    executionParameters: [],
    requestBodyContentType: undefined,
    securityRequirements: [{"default":[]}]
  }],
  ["client-category-rules-create", {
    name: "client-category-rules-create",
    description: `Create a single category rule`,
    inputSchema: {"type":"object","properties":{"requestBody":{"description":"Create client category rule","properties":{"description":{"type":"string","description":"Description of the transaction rule."},"categoryId":{"type":"string","description":"Identifier of the category"},"transactionType":{"type":"string","description":"Transaction type (DEBIT/CREDIT)"},"accountType":{"type":"string","description":"Account type (CHECKING_ACCOUNT/CREDIT_CARD)"},"matchType":{"type":"string","description":"Type of match used to identify the rule (exact/contains/startsWith/endsWith), if not provided, defaults to 'exact'"}},"type":"object","required":["description","categoryId"]}},"required":["requestBody"]},
    method: "post",
    pathTemplate: "/categories/rules",
    executionParameters: [],
    requestBodyContentType: "application/json",
    securityRequirements: [{"default":[]}]
  }],
  ["loans-list", {
    name: "loans-list",
    description: `Recovers all loans collected for the item provided`,
    inputSchema: {"type":"object","properties":{"itemId":{"type":"string","format":"uuid","description":"Item's primary identifier"}},"required":["itemId"]},
    method: "get",
    pathTemplate: "/loans",
    executionParameters: [{"name":"itemId","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"default":[]}]
  }],
  ["loans-retrieve", {
    name: "loans-retrieve",
    description: `Recovers the loan resource by its id`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"uuid","description":"loan primary identifier"}},"required":["id"]},
    method: "get",
    pathTemplate: "/loans/{id}",
    executionParameters: [{"name":"id","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"default":[]}]
  }],
  ["merchants-get-by-cnpj", {
    name: "merchants-get-by-cnpj",
    description: `Retrieves merchant information for a list of CNPJs. Returns an object containing found merchants, valid CNPJs that were not found, and invalid CNPJs.`,
    inputSchema: {"type":"object","properties":{"cnpjs":{"type":"string","description":"Comma-separated list of CNPJs"}}},
    method: "get",
    pathTemplate: "/merchants",
    executionParameters: [{"name":"cnpjs","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"default":[]}]
  }],
  ["bills-list", {
    name: "bills-list",
    description: `Recovers all credit card bills collected for the account provided`,
    inputSchema: {"type":"object","properties":{"accountId":{"type":"string","format":"uuid","description":"Account's primary identifier"}},"required":["accountId"]},
    method: "get",
    pathTemplate: "/bills",
    executionParameters: [{"name":"accountId","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"default":[]}]
  }],
  ["bills-retrieve", {
    name: "bills-retrieve",
    description: `Recovers the bill resource by its id`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"uuid","description":"Bill primary identifier"}},"required":["id"]},
    method: "get",
    pathTemplate: "/bills/{id}",
    executionParameters: [{"name":"id","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"default":[]}]
  }],
  ["payment-customers-list", {
    name: "payment-customers-list",
    description: `Recovers all created payment customers`,
    inputSchema: {"type":"object","properties":{"pageSize":{"type":"number","format":"double","description":"Page size for the paging request, default: 500"},"page":{"type":"number","format":"double","description":"Page number for the paging request, default: 1"},"name":{"type":"string","description":"Filter payment customers by name"},"email":{"type":"string","description":"Filter payment customers by email"},"cpf":{"type":"string","description":"Filter payment customers by CPF"},"cnpj":{"type":"string","description":"Filter payment customers by CNPJ"}}},
    method: "get",
    pathTemplate: "/payments/customers",
    executionParameters: [{"name":"pageSize","in":"query"},{"name":"page","in":"query"},{"name":"name","in":"query"},{"name":"email","in":"query"},{"name":"cpf","in":"query"},{"name":"cnpj","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"default":[]}]
  }],
  ["payment-customer-create", {
    name: "payment-customer-create",
    description: `Create`,
    inputSchema: {"type":"object","properties":{"requestBody":{"description":"Response with information related to a payment customer","properties":{"type":{"enum":["INDIVIDUAL","BUSINESS"],"type":"string","description":"Customer type"},"name":{"type":"string","description":"Customer name"},"email":{"type":"string","description":"Customer email"},"cpf":{"type":"string","description":"Customer CPF"},"cnpj":{"type":"string","description":"Customer CNPJ, if type is `BUSINESS`"},"connectorId":{"type":"number","description":"Default connector id to be used in the Pluggy's payment initiation flow (https://pay.pluggy.ai) by the payer."}},"type":"object","required":["id","type","name"]}},"required":["requestBody"]},
    method: "post",
    pathTemplate: "/payments/customers",
    executionParameters: [],
    requestBodyContentType: "application/json",
    securityRequirements: [{"default":[]}]
  }],
  ["payment-customer-retrieve", {
    name: "payment-customer-retrieve",
    description: `Recovers the payment customer resource by its id`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"uuid","description":"Payment customer primary identifier"}},"required":["id"]},
    method: "get",
    pathTemplate: "/payments/customers/{id}",
    executionParameters: [{"name":"id","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"default":[]}]
  }],
  ["payment-customer-delete", {
    name: "payment-customer-delete",
    description: `Deletes the payment customer resource by its id`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"uuid","description":"Payment customer primary identifier"}},"required":["id"]},
    method: "delete",
    pathTemplate: "/payments/customers/{id}",
    executionParameters: [{"name":"id","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"default":[]}]
  }],
  ["payment-customer-update", {
    name: "payment-customer-update",
    description: `Updates the payment customer resource`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"uuid","description":"Payment customer primary identifier"},"requestBody":{"description":"Response with information related to a payment customer","properties":{"id":{"type":"string","description":"Primary identifier"},"type":{"enum":["INDIVIDUAL","BUSINESS"],"type":"string","description":"Customer type"},"name":{"type":"string","description":"Customer name"},"email":{"type":"string","description":"Customer email"},"cpf":{"type":"string","description":"Customer CPF"},"cnpj":{"type":"string","description":"Customer CNPJ, if type is `BUSINESS`"}},"type":"object","required":["id","type","name"]}},"required":["id","requestBody"]},
    method: "patch",
    pathTemplate: "/payments/customers/{id}",
    executionParameters: [{"name":"id","in":"path"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"default":[]}]
  }],
  ["payment-recipients-list", {
    name: "payment-recipients-list",
    description: `Recovers all created payment recipients`,
    inputSchema: {"type":"object","properties":{"pageSize":{"type":"number","format":"double","description":"Page size for the paging request, default: 500"},"page":{"type":"number","format":"double","description":"Page number for the paging request, default: 1"},"isDefault":{"type":"boolean","description":"Filter connectors by the `isDefault` attribute. If not sent, it won't filter."},"pixKey":{"type":"string","description":"Filter payment recipient by Pix key"},"name":{"type":"string","description":"Filter payment recipient by name"},"taxNumber":{"type":"string","description":"Filter payment recipient by tax number (CPF or CNPJ)"}}},
    method: "get",
    pathTemplate: "/payments/recipients",
    executionParameters: [{"name":"pageSize","in":"query"},{"name":"page","in":"query"},{"name":"isDefault","in":"query"},{"name":"pixKey","in":"query"},{"name":"name","in":"query"},{"name":"taxNumber","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"default":[]}]
  }],
  ["payment-recipient-create", {
    name: "payment-recipient-create",
    description: `Creates the payment recipient resource`,
    inputSchema: {"type":"object","properties":{"requestBody":{"description":"Request with information to create a payment recipient.","properties":{"taxNumber":{"type":"string","description":"Account owner tax number. Can be CPF or CNPJ (only numbers)"},"name":{"type":"string","description":"Account owner name."},"paymentInstitutionId":{"type":"string","format":"uuid","description":"Primary identifier of the institution associated to the payment recipient."},"account":{"allOf":[{"description":"Payment receiver bank account information","properties":{"branch":{"type":"string","description":"Receiver bank account branch (agency)"},"number":{"type":"string","description":"Receiver bank account number"},"type":{"type":"string","description":"Receiver bank account type, could be: 'CHECKING_ACCOUNT', 'SAVINGS_ACCOUNT' or 'GUARANTEED_ACCOUNT'"}},"type":"object","example":{},"required":["branch","number","type"]}],"description":"Recipient's bank account destination."}},"required":["taxNumber","name","paymentInstitutionId","account"],"type":"object"}},"required":["requestBody"]},
    method: "post",
    pathTemplate: "/payments/recipients",
    executionParameters: [],
    requestBodyContentType: "application/json",
    securityRequirements: [{"default":[]}]
  }],
  ["payment-recipient-retrieve", {
    name: "payment-recipient-retrieve",
    description: `Recovers the payment recipient resource by its id`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"uuid","description":"Payment recipient primary identifier"}},"required":["id"]},
    method: "get",
    pathTemplate: "/payments/recipients/{id}",
    executionParameters: [{"name":"id","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"default":[]}]
  }],
  ["payment-recipient-delete", {
    name: "payment-recipient-delete",
    description: `Deletes the payment recipient resource by its id`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"uuid","description":"Payment recipient primary identifier"}},"required":["id"]},
    method: "delete",
    pathTemplate: "/payments/recipients/{id}",
    executionParameters: [{"name":"id","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"default":[]}]
  }],
  ["payment-recipient-update", {
    name: "payment-recipient-update",
    description: `Updates the payment recipient resource`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"uuid","description":"Payment recipient primary identifier"},"requestBody":{"description":"Request with information to update a payment recipient","properties":{"taxNumber":{"type":"string","description":"Account owner tax number. Can be CPF or CNPJ (only numbers)"},"name":{"type":"string","description":"Account owner name."},"paymentInstitutionId":{"type":"string","format":"uuid","description":"Primary identifier of the institution associated to the payment recipient."},"account":{"allOf":[{"description":"Payment receiver bank account information","properties":{"branch":{"type":"string","description":"Receiver bank account branch (agency)"},"number":{"type":"string","description":"Receiver bank account number"},"type":{"type":"string","description":"Receiver bank account type, could be: 'CHECKING_ACCOUNT', 'SAVINGS_ACCOUNT' or 'GUARANTEED_ACCOUNT'"}},"type":"object","example":{},"required":["branch","number","type"]}],"description":"Recipient's bank account destination."}},"type":"object"}},"required":["id","requestBody"]},
    method: "patch",
    pathTemplate: "/payments/recipients/{id}",
    executionParameters: [{"name":"id","in":"path"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"default":[]}]
  }],
  ["payment-recipients-institution-list", {
    name: "payment-recipients-institution-list",
    description: `Recovers all created payment institutions`,
    inputSchema: {"type":"object","properties":{"pageSize":{"type":"number","format":"double","description":"Page size for the paging request, default: 500"},"page":{"type":"number","format":"double","description":"Page number for the paging request, default: 1"},"name":{"type":"string","description":"Filter institutions by name"}}},
    method: "get",
    pathTemplate: "/payments/recipients/institutions",
    executionParameters: [{"name":"pageSize","in":"query"},{"name":"page","in":"query"},{"name":"name","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"default":[]}]
  }],
  ["payment-recipient-institutions-retrieve", {
    name: "payment-recipient-institutions-retrieve",
    description: `Recovers the payment institution resource by its id`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"uuid","description":"Payment institution primary identifier"}},"required":["id"]},
    method: "get",
    pathTemplate: "/payments/recipients/institutions/{id}",
    executionParameters: [{"name":"id","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"default":[]}]
  }],
  ["payment-requests-list", {
    name: "payment-requests-list",
    description: `Recovers all created payment requests`,
    inputSchema: {"type":"object","properties":{"pageSize":{"type":"number","format":"double","description":"Page size for the paging request, default: 500"},"page":{"type":"number","format":"double","description":"Page number for the paging request, default: 1"},"from":{"type":"string","format":"date","description":"Filter payment requests by start date. Returns only requests created **on or after** this date."},"to":{"type":"string","format":"date","description":"Filter payment requests by end date. Returns only requests created **on or before** this date."},"customer":{"type":"string","description":"Filter payment requests with one customer attribute (name, email, CPF or CNPJ)"},"pixKey":{"type":"string","description":"Filter payment requests by Pix Key"},"status":{"type":"string","enum":["CREATED","IN_PROGRESS","COMPLETED","SCHEDULED","WAITING_PAYER_AUTHORIZATION","ERROR","EXPIRED","AUTHORIZED","CANCELED"],"description":"Filter payment requests by status"}}},
    method: "get",
    pathTemplate: "/payments/requests",
    executionParameters: [{"name":"pageSize","in":"query"},{"name":"page","in":"query"},{"name":"from","in":"query"},{"name":"to","in":"query"},{"name":"customer","in":"query"},{"name":"pixKey","in":"query"},{"name":"status","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"default":[]}]
  }],
  ["payment-request-create", {
    name: "payment-request-create",
    description: `Creates the payment request resource`,
    inputSchema: {"type":"object","properties":{"requestBody":{"description":"Request with information to create a payment request","properties":{"amount":{"type":"number","description":"Requested amount"},"description":{"type":"string","description":"Payment description"},"callbackUrls":{"description":"Redirect urls after the payment was completed or ended in error status","properties":{"success":{"type":"string","description":"Url to be redirected after the payment was completed"},"pending":{"type":"string","description":"Url to be redirected when the payment is pending (for example, when it has status WAITING_PAYER_AUTHORIZATION"},"error":{"type":"string","description":"Url to be redirected after the payment ended in error status"}},"type":"object"},"recipientId":{"type":"string","format":"uuid","description":"Payment receiver identifier"},"customerId":{"type":"string","format":"uuid","description":"Customer identifier associated to the payment"},"clientPaymentId":{"type":"string","description":"Your payment identifier"},"schedule":{"oneOf":[{"title":"One time option","description":"Schedule atribute to generate one payment in the future","properties":{"type":{"type":"string","description":"Scheduled type","enum":["SINGLE"],"example":"SINGLE"},"date":{"type":"string","format":"date","example":"2024-06-11"}},"type":"object","required":["type","date"]},{"title":"Daily option","description":"Schedule atribute to generate daily payments","properties":{"type":{"type":"string","description":"Scheduled type","enum":["DAILY"],"example":"DAILY"},"startDate":{"type":"string","format":"date","description":"The start date of the validity of the scheduled payment authorization.","example":"2024-06-11"},"occurrences":{"type":"number","description":"Under the specified schedule frequency, how many payments will be scheduled to occur.","format":"integer","minimum":3,"example":3,"maximum":59}},"type":"object","required":["type","startDate","quantity"]},{"title":"Weekly option","description":"Schedule atribute to generate weekly payments","properties":{"type":{"type":"string","description":"Scheduled type","enum":["WEEKLY"],"example":"WEEKLY"},"startDate":{"type":"string","format":"date","description":"The start date of the validity of the scheduled payment authorization.","example":"2024-06-11"},"dayOfWeek":{"type":"string","description":"Day of the week on which each payment will occur. For instance, if set to 'MONDAY', the first payment will occur on the first monday after the startDate (or the same day, if it is already monday), and every monday after that.","enum":["MONDAY","TUESDAY","WEDNESDAY","THURDSAY","FRIDAY","SATURDAY","SUNDAY"],"example":"MONDAY"},"occurrences":{"type":"number","description":"Under the specified schedule frequency, how many payments will be scheduled to occur.","format":"integer","minimum":3,"example":3,"maximum":59}},"type":"object","required":["type","startDate","dayOfWeek","quantity"]},{"title":"Monthly option","description":"Schedule atribute to generate monthly payments","properties":{"type":{"type":"string","description":"Scheduled type","enum":["MONTHLY"],"example":"MONTHLY"},"startDate":{"type":"string","format":"date","example":"2024-06-11"},"dayOfMonth":{"type":"number","description":"Day of the month on which each payment will occur. For example, if '10', the first payment will occur on the next 10th day of the month after the start date, or the same day if it is already 10th, and every 10th day after that.","minimum":1,"maximum":30,"example":3},"occurrences":{"type":"number","description":"Under the specified schedule frequency, how many payments will be scheduled to occur.","format":"integer","minimum":3,"maximum":23,"example":3}},"type":"object","required":["type","startDate","dayOfMonth","quantity"]},{"title":"Customized option","description":"Schedule atribute to generate custom payments in the future","properties":{"type":{"description":"Scheduled type","enum":["CUSTOM"],"example":"CUSTOM"},"dates":{"type":"array","items":{"type":"string","format":"date","example":"2024-06-11"}},"additionalInformation":{"type":"string","description":"Additional information about the custom schedule"}},"type":"object","required":["type","dates"]}],"type":["string","null"],"default":null,"discriminator":{"propertyName":"type","mapping":{"DAILY":"#/components/schemas/DAILY","WEEKLY":"#/components/schemas/WEEKLY","MONTHLY":"#/components/schemas/MONTHLY","CUSTOM":"#/components/schemas/CUSTOM"}}},"isSandbox":{"type":"boolean","description":"Indicates if this payment request should be created in sandbox mode. Default: false.","default":false}},"type":"object","required":["amount"]}},"required":["requestBody"]},
    method: "post",
    pathTemplate: "/payments/requests",
    executionParameters: [],
    requestBodyContentType: "application/json",
    securityRequirements: [{"default":[]}]
  }],
  ["payment-request-create-automatic-pix", {
    name: "payment-request-create-automatic-pix",
    description: `Creates a payment request where the payment is made using automatic PIX. Once consent is granted by the user, payments can be scheduled according to the rules defined in the request.`,
    inputSchema: {"type":"object","properties":{"requestBody":{"description":"Automatic PIX data","type":"object","properties":{"fixedAmount":{"type":"number","description":"Fixed charge amount; if filled in, it represents consent for payments of fixed amounts, not subject to change during the validity of the consent. If it's sent, minimumVariableAmount and maximumVariableAmount cannot be provided."},"minimumVariableAmount":{"type":"number","description":"Minimum amount allowed per charge; if filled in, it represents consent for payments of variable amounts. If it's sent, fixedAmount cannot be provided."},"maximumVariableAmount":{"type":"number","description":"Maximum amount allowed per charge; if filled in, it represents consent for payments of variable amounts. If it's sent, fixedAmount cannot be provided."},"description":{"type":"string","description":"Description for the automatic pix authorization"},"startDate":{"type":"string","format":"date","description":"Represents the expected date for the first occurrence of a payment associated with the recurrence. Date format must be YYYY-MM-DD (for example: 2025-06-16)"},"expiresAt":{"type":"string","format":"date","description":"Expiration date for the automatic pix authorization. The date must be in UTC and the format must follow the following pattern: YYYY-MM-DDTHH:MM:SSZ (for example: 2025-06-16T03:00:00Z)."},"isRetryAccepted":{"type":"boolean","description":"Indicates whether the receiving customer is allowed to make payment attempts, according to the rules established in the Pix arrangement."},"firstPayment":{"description":"Definitions for the first payment. It is considered as the user's enrollment payment for the service.","type":"object","properties":{"date":{"type":"string","format":"date-time","description":"Defines the target settlement date of the first payment. If not provided, it will be settled immediately. Date format must be YYYY-MM-DD (for example: 2025-06-16)"},"description":{"type":"string","description":"Description for the first payment. If not provided, the description will be the same as the description of the payment request"},"amount":{"type":"number","description":"Amount for the first payment."}},"required":["amount"]},"interval":{"type":"string","enum":["WEEKLY","MONTHLY","QUARTERLY","SEMESTER","YEARLY"],"description":"Defines the permitted frequency for carrying out transactions."},"automaticRetriesConfiguration":{"description":"“Configuration for automatic retries. If provided, the scheduled payments associated with this consent will only be retried on the days specified in the array after the original payment date. This does not apply to the first payment, only for scheduled payments.","type":"object","properties":{"retryDays":{"type":"array","items":{"type":"number","enum":[1,2,3,4,5,6,7]}}},"required":["retryDays"]},"schedulerConfiguration":{"description":"Configuration for automatic scheduling of payments. When enabled, the system will schedule payments according to the consent interval and start date.","type":"object","properties":{"enabled":{"type":"boolean","description":"When true, payments are automatically scheduled by the system."},"description":{"type":"string","maxLength":140,"description":"Optional description for the scheduled payment. Overrides the payment request description when set."},"valueForVariableAmount":{"type":"number","minimum":0.01,"description":"Required when the consent has variable amounts (minimumVariableAmount/maximumVariableAmount). Default amount to use when scheduling the payment."}},"required":["enabled"]},"callbackUrls":{"description":"Redirect urls after the payment was completed or ended in error status","properties":{"success":{"type":"string","description":"Url to be redirected after the payment was completed"},"pending":{"type":"string","description":"Url to be redirected when the payment is pending (for example, when it has status WAITING_PAYER_AUTHORIZATION"},"error":{"type":"string","description":"Url to be redirected after the payment ended in error status"}},"type":"object"},"recipientId":{"type":"string","description":"Primary identifier of the payment recipient"},"clientPaymentId":{"type":"string","description":"Client payment identifier"},"customerId":{"type":"string","description":"Primary identifier of the customer"}},"required":["startDate","interval","recipientId"]}},"required":["requestBody"]},
    method: "post",
    pathTemplate: "/payments/requests/automatic-pix",
    executionParameters: [],
    requestBodyContentType: "application/json",
    securityRequirements: [{"default":[]}]
  }],
  ["payment-request-create-automatic-pix-schedule", {
    name: "payment-request-create-automatic-pix-schedule",
    description: `Schedules an Automatic PIX payment`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"uuid","description":"Payment request primary identifier"},"requestBody":{"description":"Request to schedule an Automatic PIX payment","type":"object","properties":{"amount":{"type":"number","description":"Transaction value"},"description":{"type":"string","description":"Transaction description"},"date":{"type":"string","format":"date","description":"The payment date, which must fall between D+2 and D+10. Date format must be YYYY-MM-DD (for example: 2025-06-16)"},"clientPaymentId":{"type":"string","description":"External identifier for the payment"},"recipientId":{"type":"string","format":"uuid","description":"Payment recipient identifier. It should be sent if you want to use a different recipient from the one consented in the payment request (it must have the same tax number as the consented recipient)."}},"required":["amount","date"]}},"required":["id","requestBody"]},
    method: "post",
    pathTemplate: "/payments/requests/{id}/automatic-pix/schedule",
    executionParameters: [{"name":"id","in":"path"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"default":[]}]
  }],
  ["payment-request-get-automatic-pix-schedules", {
    name: "payment-request-get-automatic-pix-schedules",
    description: `Lists all Automatic PIX payments from a payment request`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"uuid","description":"Payment request primary identifier"}},"required":["id"]},
    method: "get",
    pathTemplate: "/payments/requests/{id}/automatic-pix/schedules",
    executionParameters: [{"name":"id","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"default":[]}]
  }],
  ["payment-request-get-automatic-pix-schedule", {
    name: "payment-request-get-automatic-pix-schedule",
    description: `Recovers an automatic PIX scheduled payment by id`,
    inputSchema: {"type":"object","properties":{"requestId":{"type":"string","format":"uuid","description":"Payment request primary identifier"},"paymentId":{"type":"string","format":"uuid","description":"Automatic PIX scheduled payment primary identifier"}},"required":["requestId","paymentId"]},
    method: "get",
    pathTemplate: "/payments/requests/{requestId}/automatic-pix/schedules/{paymentId}",
    executionParameters: [{"name":"requestId","in":"path"},{"name":"paymentId","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"default":[]}]
  }],
  ["payment-request-cancel-automatic-pix-consent", {
    name: "payment-request-cancel-automatic-pix-consent",
    description: `Cancels an automatic PIX consent`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"uuid","description":"Payment request primary identifier"}},"required":["id"]},
    method: "post",
    pathTemplate: "/payments/requests/{id}/automatic-pix/cancel",
    executionParameters: [{"name":"id","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"default":[]}]
  }],
  ["cancel-automatic-pix-schedule", {
    name: "cancel-automatic-pix-schedule",
    description: `Cancels an Automatic PIX schedule.`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"uuid","description":"Payment request primary identifier"},"scheduleId":{"type":"string","format":"uuid","description":"Automatic PIX schedule primary identifier"}},"required":["id","scheduleId"]},
    method: "post",
    pathTemplate: "/payments/requests/{id}/automatic-pix/schedules/{scheduleId}/cancel",
    executionParameters: [{"name":"id","in":"path"},{"name":"scheduleId","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"default":[]}]
  }],
  ["retry-automatic-pix-schedule", {
    name: "retry-automatic-pix-schedule",
    description: `Retries an Automatic PIX schedule, only if the authorization accepts retries. The system allows up to 3 retry attempts. Requests must be submitted by 10pm on the day before the scheduled payment date.`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"uuid","description":"Payment request primary identifier"},"scheduleId":{"type":"string","format":"uuid","description":"Automatic PIX schedule primary identifier"},"requestBody":{"description":"Request to retry an automatic PIX payment","type":"object","properties":{"date":{"type":"string","format":"date","description":"The date to retry the payment within a 7-day window. Date format must be YYYY-MM-DD (for example: 2025-06-16)"}},"required":["date"]}},"required":["id","scheduleId","requestBody"]},
    method: "post",
    pathTemplate: "/payments/requests/{id}/automatic-pix/schedules/{scheduleId}/retry",
    executionParameters: [{"name":"id","in":"path"},{"name":"scheduleId","in":"path"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"default":[]}]
  }],
  ["payment-request-create-pix-qr", {
    name: "payment-request-create-pix-qr",
    description: `Creates the PIX QR payment request resource`,
    inputSchema: {"type":"object","properties":{"requestBody":{"description":"Request with information to create a PIX QR payment request","properties":{"pixQrCode":{"type":"string","description":"Pix QR code"},"callbackUrls":{"description":"Redirect urls after the payment was completed or ended in error status","properties":{"success":{"type":"string","description":"Url to be redirected after the payment was completed"},"pending":{"type":"string","description":"Url to be redirected when the payment is pending (for example, when it has status WAITING_PAYER_AUTHORIZATION"},"error":{"type":"string","description":"Url to be redirected after the payment ended in error status"}},"type":"object"},"customerId":{"type":"string","format":"uuid","description":"Customer identifier associated to the payment"},"isSandbox":{"type":"boolean","description":"Indicates if this payment request should be created in sandbox mode. Default: false.","default":false}},"type":"object","required":["pixQrCode"]}},"required":["requestBody"]},
    method: "post",
    pathTemplate: "/payments/requests/pix-qr",
    executionParameters: [],
    requestBodyContentType: "application/json",
    securityRequirements: [{"default":[]}]
  }],
  ["payment-request-retrieve", {
    name: "payment-request-retrieve",
    description: `Recovers the payment request resource by its id`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"uuid","description":"Payment request primary identifier"}},"required":["id"]},
    method: "get",
    pathTemplate: "/payments/requests/{id}",
    executionParameters: [{"name":"id","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"default":[]}]
  }],
  ["payment-request-delete", {
    name: "payment-request-delete",
    description: `Deletes the payment request resource by its id`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"uuid","description":"Payment request primary identifier"}},"required":["id"]},
    method: "delete",
    pathTemplate: "/payments/requests/{id}",
    executionParameters: [{"name":"id","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"default":[]}]
  }],
  ["payment-request-update", {
    name: "payment-request-update",
    description: `Updates the payment request resource`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"uuid","description":"Payment request primary identifier"},"requestBody":{"description":"Request with information to update a payment request","properties":{"amount":{"type":"number","description":"Requested amount"},"description":{"type":"string","description":"Payment description"},"callbackUrls":{"description":"Redirect urls after the payment was completed or ended in error status","properties":{"success":{"type":"string","description":"Url to be redirected after the payment was completed"},"pending":{"type":"string","description":"Url to be redirected when the payment is pending (for example, when it has status WAITING_PAYER_AUTHORIZATION"},"error":{"type":"string","description":"Url to be redirected after the payment ended in error status"}},"type":"object"},"recipientId":{"type":"string","format":"uuid","description":"Payment receiver identifier"},"customerId":{"type":"string","format":"uuid","description":"Customer identifier associated to the payment"},"clientPaymentId":{"type":"string","description":"Your payment identifier"},"isSandbox":{"type":"boolean","description":"Indicates if this payment request should be updated as sandbox. Default: false.","default":false}},"type":"object"}},"required":["id","requestBody"]},
    method: "patch",
    pathTemplate: "/payments/requests/{id}",
    executionParameters: [{"name":"id","in":"path"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"default":[]}]
  }],
  ["payment-schedules-list", {
    name: "payment-schedules-list",
    description: `Recovers all scheduled payments from a payment request`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"uuid","description":"Payment request primary identifier"}},"required":["id"]},
    method: "get",
    pathTemplate: "/payments/requests/{id}/schedules",
    executionParameters: [{"name":"id","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"default":[]}]
  }],
  ["payment-schedules-cancel", {
    name: "payment-schedules-cancel",
    description: `Cancel Payment Schedule Authorization`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"uuid","description":"Payment request primary identifier"}},"required":["id"]},
    method: "post",
    pathTemplate: "/payments/requests/{id}/schedules/cancel",
    executionParameters: [{"name":"id","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"default":[]}]
  }],
  ["payment-schedules-cancel-specific", {
    name: "payment-schedules-cancel-specific",
    description: `Cancel Payment Schedule`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"uuid","description":"Payment request primary identifier"},"scheduleId":{"type":"string","format":"uuid","description":"Payment schedule primary identifier"}},"required":["id","scheduleId"]},
    method: "post",
    pathTemplate: "/payments/requests/{id}/schedules/{scheduleId}/cancel",
    executionParameters: [{"name":"id","in":"path"},{"name":"scheduleId","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"default":[]}]
  }],
  ["payment-intents-list", {
    name: "payment-intents-list",
    description: `Recovers all created payment intents for the payment request provided`,
    inputSchema: {"type":"object","properties":{"paymentRequestId":{"type":"string","format":"uuid","description":"Payment request primary identifier"}},"required":["paymentRequestId"]},
    method: "get",
    pathTemplate: "/payments/intents",
    executionParameters: [{"name":"paymentRequestId","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"default":[]}]
  }],
  ["payment-intent-create", {
    name: "payment-intent-create",
    description: `Creates the payment intent resource`,
    inputSchema: {"type":"object","properties":{"requestBody":{"description":"Request with information to create a payment intent","properties":{"paymentRequestId":{"type":"string","description":"Primary identifier of the payment request associated to the payment intent"},"parameters":{"description":"Credentials neccesary to create a payment intent","properties":{"cpf":{"type":"string","description":"CPF of the payer"},"cnpj":{"type":"string","description":"CNPJ of the payer"},"name":{"type":"string","description":"Name of the payer. Only required for automatic pix payment requests."}},"type":"object","required":["cpf"]},"connectorId":{"type":"number","description":"Primary identifier of the connector associated to the payment intent"},"paymentMethod":{"type":"string","enum":["PIS"],"description":"Payment method can be PIS (Payment Initiation) or PIX (PIX QR flow)."},"isDynamicPix":{"type":"boolean","description":"Only for PIX paymentMethod. If true, the generated PIX QR code is dynamic and one-use. This requires the customerId to be present, and the customer must have CPF/CNPJ"}},"type":"object"}},"required":["requestBody"]},
    method: "post",
    pathTemplate: "/payments/intents",
    executionParameters: [],
    requestBodyContentType: "application/json",
    securityRequirements: [{"default":[]}]
  }],
  ["payment-intent-retrieve", {
    name: "payment-intent-retrieve",
    description: `Recovers the payment intent resource by its id`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"uuid","description":"Payment intent primary identifier"}},"required":["id"]},
    method: "get",
    pathTemplate: "/payments/intents/{id}",
    executionParameters: [{"name":"id","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"default":[]}]
  }],
  ["smart-tranfers-preauthorizations-list", {
    name: "smart-tranfers-preauthorizations-list",
    description: `Recovers all created preauthorizations`,
    inputSchema: {"type":"object","properties":{"pageSize":{"type":"number","format":"double","description":"Page size for the paging request, default: 500"},"page":{"type":"number","format":"double","description":"Page number for the paging request, default: 1"}}},
    method: "get",
    pathTemplate: "/smart-transfers/preauthorizations",
    executionParameters: [{"name":"pageSize","in":"query"},{"name":"page","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"default":[]}]
  }],
  ["smart-transfer-preauthorization-create", {
    name: "smart-transfer-preauthorization-create",
    description: `Creates the smart transfer preauthorization resource`,
    inputSchema: {"type":"object","properties":{"requestBody":{"description":"Create smart transfer preauthorization request data","properties":{"connectorId":{"type":"number","description":"Primary identifier of the connector"},"parameters":{"description":"Credentials neccesary to create a smart transfer preauthorization","properties":{"cpf":{"type":"string","description":"CPF of the payer"},"cnpj":{"type":"string","description":"CNPJ of the payer"}},"type":"object","example":{"cpf":"416.799.495-00","cnpj":"41.679.495/0001-00"},"required":["cpf"]},"recipientIds":{"type":"array","items":{"type":"string","description":"Primary identifier of the payment recipient"}},"callbackUrls":{"description":"Redirect urls after the preauthorization flow was completed or ended in error status","properties":{"success":{"type":"string","description":"Url to be redirected after the preauthorization was completed"},"error":{"type":"string","description":"Url to be redirected after the preauthorization ended in error status"}},"type":"object","example":{}},"clientPreauthorizationId":{"type":"string","description":"Client preauthorization identifier"},"configuration":{"description":"Smart transfer preauthorization configuration","properties":{"totalAllowedAmount":{"type":"number","description":"Maximum amount to be reached by the sum of all transactions that use the consent authorized by the customer."},"transactionLimit":{"type":"number","description":"Maximum amount for each payment transaction associated with this consent."},"periodicLimits":{"description":"Transactional limits per period as determined by the paying user.","properties":{"day":{"description":"Daily transactional limit.","properties":{"quantityLimit":{"type":"number","description":"Maximum number of transactions allowed to occur in the period."},"transactionLimit":{"type":"number","description":"Maximum amount to be transacted in the period."}}},"week":{"description":"Weekly transactional limit.","properties":{"quantityLimit":{"type":"number","description":"Maximum number of transactions allowed to occur in the period."},"transactionLimit":{"type":"number","description":"Maximum amount to be transacted in the period."}}},"month":{"description":"Monthly transactional limit.","properties":{"quantityLimit":{"type":"number","description":"Maximum number of transactions allowed to occur in the period."},"transactionLimit":{"type":"number","description":"Maximum amount to be transacted in the period."}}},"year":{"description":"Yearly transactional limit.","properties":{"quantityLimit":{"type":"number","description":"Maximum number of transactions allowed to occur in the period."},"transactionLimit":{"type":"number","description":"Maximum amount to be transacted in the period."}}}}}},"type":"object"}},"required":["connectorId","parameters","recipientIds"]}},"required":["requestBody"]},
    method: "post",
    pathTemplate: "/smart-transfers/preauthorizations",
    executionParameters: [],
    requestBodyContentType: "application/json",
    securityRequirements: [{"default":[]}]
  }],
  ["smart-transfer-preauthorization-retrieve", {
    name: "smart-transfer-preauthorization-retrieve",
    description: `Recovers the smart transfer preauthorization resource by its id`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"uuid","description":"Preauthorization primary identifier"}},"required":["id"]},
    method: "get",
    pathTemplate: "/smart-transfers/preauthorizations/{id}",
    executionParameters: [{"name":"id","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"default":[]}]
  }],
  ["smart-transfer-preauthorization-payments-list", {
    name: "smart-transfer-preauthorization-payments-list",
    description: `Recovers all payments for a specific preauthorization, ordered by date descending`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"uuid","description":"Preauthorization primary identifier"},"from":{"type":"string","format":"date","description":"Filter payments created from this date"},"to":{"type":"string","format":"date","description":"Filter payments created until this date"},"pageSize":{"type":"number","format":"double","description":"Page size for the paging request, default: 500"},"page":{"type":"number","format":"double","description":"Page number for the paging request, default: 1"}},"required":["id"]},
    method: "get",
    pathTemplate: "/smart-transfers/preauthorizations/{id}/payments",
    executionParameters: [{"name":"id","in":"path"},{"name":"from","in":"query"},{"name":"to","in":"query"},{"name":"pageSize","in":"query"},{"name":"page","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"default":[]}]
  }],
  ["smart-transfer-payment-create", {
    name: "smart-transfer-payment-create",
    description: `Creates the smart transfer payment resource`,
    inputSchema: {"type":"object","properties":{"requestBody":{"description":"Create smart transfer payment request data","properties":{"preauthorizationId":{"type":"string","description":"Primary identifier of the preauthorization"},"recipientId":{"type":"string","description":"Primary identifier of the paymen recipient"},"amount":{"type":"number","description":"Payment amount"},"description":{"type":"string","description":"Payment description"},"clientPaymentId":{"type":"string","description":"Client payment identifier"}},"required":["preauthorizationId","recipientId","amount"]}},"required":["requestBody"]},
    method: "post",
    pathTemplate: "/smart-transfers/payments",
    executionParameters: [],
    requestBodyContentType: "application/json",
    securityRequirements: [{"default":[]}]
  }],
  ["smart-transfer-paymentretrieve", {
    name: "smart-transfer-paymentretrieve",
    description: `Recovers the smart transfer payment resource by its id`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"uuid","description":"Payment primary identifier"}},"required":["id"]},
    method: "get",
    pathTemplate: "/smart-transfers/payments/{id}",
    executionParameters: [{"name":"id","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"default":[]}]
  }],
  ["boleto-connection-create", {
    name: "boleto-connection-create",
    description: `Connect boleto credentials`,
    inputSchema: {"type":"object","properties":{"requestBody":{"description":"Request with information to create a boleto connection","type":"object","required":["connectorId","credentials"],"properties":{"connectorId":{"type":"number","minimum":1,"description":"Connector identifier. Check out the list of connectors, and if it has the flag 'supportsBoletoManagement' as true, it means it's possible to create a boleto connection with it."},"credentials":{"type":"object","description":"Credentials required for the connection. For Inter, they are clientId, clientSecret, certificate and privateKey, follow: https://docs.pluggy.ai/docs/connect-an-account#inter-pj","additionalProperties":{"type":"string"}}}}},"required":["requestBody"]},
    method: "post",
    pathTemplate: "/boleto-connections",
    executionParameters: [],
    requestBodyContentType: "application/json",
    securityRequirements: [{"default":[]}]
  }],
  ["boleto-connection-create-from-item", {
    name: "boleto-connection-create-from-item",
    description: `Create boleto connection from Item`,
    inputSchema: {"type":"object","properties":{"requestBody":{"description":"Request with information to create a boleto connection from an Item","type":"object","required":["itemId"],"properties":{"itemId":{"type":"string","format":"uuid","description":"Item ID"}}}},"required":["requestBody"]},
    method: "post",
    pathTemplate: "/boleto-connections/from-item",
    executionParameters: [],
    requestBodyContentType: "application/json",
    securityRequirements: [{"default":[]}]
  }],
  ["boleto-create", {
    name: "boleto-create",
    description: `Issue Boleto`,
    inputSchema: {"type":"object","properties":{"requestBody":{"description":"Request with information to create a boleto","type":"object","properties":{"boletoConnectionId":{"type":"string","format":"uuid","description":"Primary identifier of the boleto connection"},"boleto":{"type":"object","properties":{"seuNumero":{"type":"string","maxLength":10,"description":"Your identifier for this boleto"},"amount":{"type":"number","minimum":2.5,"description":"Boleto amount"},"dueDate":{"type":"string","format":"date-time","description":"Due date for the boleto. Must be today or in the future."},"payer":{"type":"object","properties":{"taxNumber":{"type":"string","description":"Payer tax number (CPF/CNPJ)"},"name":{"type":"string","description":"Payer name"},"addressStreet":{"type":"string","description":"Payer street address"},"addressCity":{"type":"string","description":"Payer city"},"addressState":{"type":"string","description":"Payer state"},"addressZipCode":{"type":"string","description":"Payer ZIP code"}},"required":["taxNumber","name","addressState","addressZipCode"]},"fine":{"type":"object","description":"Fine information for late payment","properties":{"value":{"type":"number","minimum":0,"description":"Fine value"},"type":{"type":"string","enum":["PERCENTAGE","FIXED"],"description":"Type of fine calculation"}},"required":["value","type"]},"interest":{"type":"object","description":"Interest information for late payment","properties":{"value":{"type":"number","minimum":0,"description":"Interest value"},"type":{"type":"string","enum":["PERCENTAGE"],"description":"Type of interest calculation"}},"required":["value","type"]}},"required":["seuNumero","amount","dueDate","payer"]}},"required":["boletoConnectionId","boleto"]}},"required":["requestBody"]},
    method: "post",
    pathTemplate: "/boletos",
    executionParameters: [],
    requestBodyContentType: "application/json",
    securityRequirements: [{"default":[]}]
  }],
  ["boleto-cancel", {
    name: "boleto-cancel",
    description: `Cancel Boleto`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"uuid","description":"Boleto primary identifier"}},"required":["id"]},
    method: "post",
    pathTemplate: "/boletos/{id}/cancel",
    executionParameters: [{"name":"id","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"default":[]}]
  }],
  ["boleto-get", {
    name: "boleto-get",
    description: `Get Boleto`,
    inputSchema: {"type":"object","properties":{"id":{"type":"string","format":"uuid","description":"Boleto primary identifier"}},"required":["id"]},
    method: "get",
    pathTemplate: "/boletos/{id}",
    executionParameters: [{"name":"id","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"default":[]}]
  }],
]);

/**
 * Security schemes from the OpenAPI spec
 */
const securitySchemes =   {
    "default": {
      "type": "apiKey",
      "name": "X-API-KEY",
      "in": "header"
    }
  };


server.setRequestHandler(ListToolsRequestSchema, async () => {
  const toolsForClient: Tool[] = Array.from(toolDefinitionMap.values()).map(def => ({
    name: def.name,
    description: def.description,
    inputSchema: def.inputSchema
  }));
  return { tools: toolsForClient };
});


server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest): Promise<CallToolResult> => {
  const { name: toolName, arguments: toolArgs } = request.params;
  const toolDefinition = toolDefinitionMap.get(toolName);
  if (!toolDefinition) {
    console.error(`Error: Unknown tool requested: ${toolName}`);
    return { content: [{ type: "text", text: `Error: Unknown tool requested: ${toolName}` }] };
  }
  return await executeApiTool(toolName, toolDefinition, toolArgs ?? {}, securitySchemes);
});



/**
 * Type definition for cached OAuth tokens
 */
interface TokenCacheEntry {
    token: string;
    expiresAt: number;
}

/**
 * Declare global __oauthTokenCache property for TypeScript
 */
declare global {
    var __oauthTokenCache: Record<string, TokenCacheEntry> | undefined;
}

/**
 * Acquires an OAuth2 token using client credentials flow
 * 
 * @param schemeName Name of the security scheme
 * @param scheme OAuth2 security scheme
 * @returns Acquired token or null if unable to acquire
 */
async function acquireOAuth2Token(schemeName: string, scheme: any): Promise<string | null | undefined> {
    try {
        // Check if we have the necessary credentials
        const clientId = process.env[`OAUTH_CLIENT_ID_SCHEMENAME`];
        const clientSecret = process.env[`OAUTH_CLIENT_SECRET_SCHEMENAME`];
        const scopes = process.env[`OAUTH_SCOPES_SCHEMENAME`];
        
        if (!clientId || !clientSecret) {
            console.error(`Missing client credentials for OAuth2 scheme '${schemeName}'`);
            return null;
        }
        
        // Initialize token cache if needed
        if (typeof global.__oauthTokenCache === 'undefined') {
            global.__oauthTokenCache = {};
        }
        
        // Check if we have a cached token
        const cacheKey = `${schemeName}_${clientId}`;
        const cachedToken = global.__oauthTokenCache[cacheKey];
        const now = Date.now();
        
        if (cachedToken && cachedToken.expiresAt > now) {
            console.error(`Using cached OAuth2 token for '${schemeName}' (expires in ${Math.floor((cachedToken.expiresAt - now) / 1000)} seconds)`);
            return cachedToken.token;
        }
        
        // Determine token URL based on flow type
        let tokenUrl = '';
        if (scheme.flows?.clientCredentials?.tokenUrl) {
            tokenUrl = scheme.flows.clientCredentials.tokenUrl;
            console.error(`Using client credentials flow for '${schemeName}'`);
        } else if (scheme.flows?.password?.tokenUrl) {
            tokenUrl = scheme.flows.password.tokenUrl;
            console.error(`Using password flow for '${schemeName}'`);
        } else {
            console.error(`No supported OAuth2 flow found for '${schemeName}'`);
            return null;
        }
        
        // Prepare the token request
        let formData = new URLSearchParams();
        formData.append('grant_type', 'client_credentials');
        
        // Add scopes if specified
        if (scopes) {
            formData.append('scope', scopes);
        }
        
        console.error(`Requesting OAuth2 token from ${tokenUrl}`);
        
        // Make the token request
        const response = await axios({
            method: 'POST',
            url: tokenUrl,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
            },
            data: formData.toString()
        });
        
        // Process the response
        if (response.data?.access_token) {
            const token = response.data.access_token;
            const expiresIn = response.data.expires_in || 3600; // Default to 1 hour
            
            // Cache the token
            global.__oauthTokenCache[cacheKey] = {
                token,
                expiresAt: now + (expiresIn * 1000) - 60000 // Expire 1 minute early
            };
            
            console.error(`Successfully acquired OAuth2 token for '${schemeName}' (expires in ${expiresIn} seconds)`);
            return token;
        } else {
            console.error(`Failed to acquire OAuth2 token for '${schemeName}': No access_token in response`);
            return null;
        }
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`Error acquiring OAuth2 token for '${schemeName}':`, errorMessage);
        return null;
    }
}


/**
 * Executes an API tool with the provided arguments
 * 
 * @param toolName Name of the tool to execute
 * @param definition Tool definition
 * @param toolArgs Arguments provided by the user
 * @param allSecuritySchemes Security schemes from the OpenAPI spec
 * @returns Call tool result
 */
async function executeApiTool(
    toolName: string,
    definition: McpToolDefinition,
    toolArgs: JsonObject,
    allSecuritySchemes: Record<string, any>
): Promise<CallToolResult> {
  try {
    // Validate arguments against the input schema
    let validatedArgs: JsonObject;
    try {
        const zodSchema = getZodSchemaFromJsonSchema(definition.inputSchema, toolName);
        const argsToParse = (typeof toolArgs === 'object' && toolArgs !== null) ? toolArgs : {};
        validatedArgs = zodSchema.parse(argsToParse);
    } catch (error: unknown) {
        if (error instanceof ZodError) {
            const validationErrorMessage = `Invalid arguments for tool '${toolName}': ${error.errors.map(e => `${e.path.join('.')} (${e.code}): ${e.message}`).join(', ')}`;
            return { content: [{ type: 'text', text: validationErrorMessage }] };
        } else {
             const errorMessage = error instanceof Error ? error.message : String(error);
             return { content: [{ type: 'text', text: `Internal error during validation setup: ${errorMessage}` }] };
        }
    }

    // Prepare URL, query parameters, headers, and request body
    let urlPath = definition.pathTemplate;
    const queryParams: Record<string, any> = {};
    const headers: Record<string, string> = { 'Accept': 'application/json' };
    let requestBodyData: any = undefined;

    // Apply parameters to the URL path, query, or headers
    definition.executionParameters.forEach((param) => {
        const value = validatedArgs[param.name];
        if (typeof value !== 'undefined' && value !== null) {
            if (param.in === 'path') {
                urlPath = urlPath.replace(`{${param.name}}`, encodeURIComponent(String(value)));
            }
            else if (param.in === 'query') {
                queryParams[param.name] = value;
            }
            else if (param.in === 'header') {
                headers[param.name.toLowerCase()] = String(value);
            }
        }
    });

    // Ensure all path parameters are resolved
    if (urlPath.includes('{')) {
        throw new Error(`Failed to resolve path parameters: ${urlPath}`);
    }
    
    // Construct the full URL
    const requestUrl = API_BASE_URL ? `${API_BASE_URL}${urlPath}` : urlPath;

    // Handle request body if needed
    if (definition.requestBodyContentType && typeof validatedArgs['requestBody'] !== 'undefined') {
        requestBodyData = validatedArgs['requestBody'];
        headers['content-type'] = definition.requestBodyContentType;
    }


    // Apply security requirements if available
    // Security requirements use OR between array items and AND within each object
    const appliedSecurity = definition.securityRequirements?.find(req => {
        // Try each security requirement (combined with OR)
        return Object.entries(req).every(([schemeName, scopesArray]) => {
            const scheme = allSecuritySchemes[schemeName];
            if (!scheme) return false;
            
            // API Key security (header, query, cookie)
            if (scheme.type === 'apiKey') {
                return !!process.env[`API_KEY_${schemeName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`];
            }
            
            // HTTP security (basic, bearer)
            if (scheme.type === 'http') {
                if (scheme.scheme?.toLowerCase() === 'bearer') {
                    return !!process.env[`BEARER_TOKEN_${schemeName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`];
                }
                else if (scheme.scheme?.toLowerCase() === 'basic') {
                    return !!process.env[`BASIC_USERNAME_${schemeName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`] && 
                           !!process.env[`BASIC_PASSWORD_${schemeName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`];
                }
            }
            
            // OAuth2 security
            if (scheme.type === 'oauth2') {
                // Check for pre-existing token
                if (process.env[`OAUTH_TOKEN_${schemeName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`]) {
                    return true;
                }
                
                // Check for client credentials for auto-acquisition
                if (process.env[`OAUTH_CLIENT_ID_${schemeName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`] &&
                    process.env[`OAUTH_CLIENT_SECRET_${schemeName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`]) {
                    // Verify we have a supported flow
                    if (scheme.flows?.clientCredentials || scheme.flows?.password) {
                        return true;
                    }
                }
                
                return false;
            }
            
            // OpenID Connect
            if (scheme.type === 'openIdConnect') {
                return !!process.env[`OPENID_TOKEN_${schemeName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`];
            }
            
            return false;
        });
    });

    // If we found matching security scheme(s), apply them
    if (appliedSecurity) {
        // Apply each security scheme from this requirement (combined with AND)
        for (const [schemeName, scopesArray] of Object.entries(appliedSecurity)) {
            const scheme = allSecuritySchemes[schemeName];
            
            // API Key security
            if (scheme?.type === 'apiKey') {
                const apiKey = process.env[`API_KEY_${schemeName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`];
                if (apiKey) {
                    if (scheme.in === 'header') {
                        headers[scheme.name.toLowerCase()] = apiKey;
                        console.error(`Applied API key '${schemeName}' in header '${scheme.name}'`);
                    }
                    else if (scheme.in === 'query') {
                        queryParams[scheme.name] = apiKey;
                        console.error(`Applied API key '${schemeName}' in query parameter '${scheme.name}'`);
                    }
                    else if (scheme.in === 'cookie') {
                        // Add the cookie, preserving other cookies if they exist
                        headers['cookie'] = `${scheme.name}=${apiKey}${headers['cookie'] ? `; ${headers['cookie']}` : ''}`;
                        console.error(`Applied API key '${schemeName}' in cookie '${scheme.name}'`);
                    }
                }
            } 
            // HTTP security (Bearer or Basic)
            else if (scheme?.type === 'http') {
                if (scheme.scheme?.toLowerCase() === 'bearer') {
                    const token = process.env[`BEARER_TOKEN_${schemeName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`];
                    if (token) {
                        headers['authorization'] = `Bearer ${token}`;
                        console.error(`Applied Bearer token for '${schemeName}'`);
                    }
                } 
                else if (scheme.scheme?.toLowerCase() === 'basic') {
                    const username = process.env[`BASIC_USERNAME_${schemeName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`];
                    const password = process.env[`BASIC_PASSWORD_${schemeName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`];
                    if (username && password) {
                        headers['authorization'] = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
                        console.error(`Applied Basic authentication for '${schemeName}'`);
                    }
                }
            }
            // OAuth2 security
            else if (scheme?.type === 'oauth2') {
                // First try to use a pre-provided token
                let token = process.env[`OAUTH_TOKEN_${schemeName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`];
                
                // If no token but we have client credentials, try to acquire a token
                if (!token && (scheme.flows?.clientCredentials || scheme.flows?.password)) {
                    console.error(`Attempting to acquire OAuth token for '${schemeName}'`);
                    token = (await acquireOAuth2Token(schemeName, scheme)) ?? '';
                }
                
                // Apply token if available
                if (token) {
                    headers['authorization'] = `Bearer ${token}`;
                    console.error(`Applied OAuth2 token for '${schemeName}'`);
                    
                    // List the scopes that were requested, if any
                    const scopes = scopesArray as string[];
                    if (scopes && scopes.length > 0) {
                        console.error(`Requested scopes: ${scopes.join(', ')}`);
                    }
                }
            }
            // OpenID Connect
            else if (scheme?.type === 'openIdConnect') {
                const token = process.env[`OPENID_TOKEN_${schemeName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`];
                if (token) {
                    headers['authorization'] = `Bearer ${token}`;
                    console.error(`Applied OpenID Connect token for '${schemeName}'`);
                    
                    // List the scopes that were requested, if any
                    const scopes = scopesArray as string[];
                    if (scopes && scopes.length > 0) {
                        console.error(`Requested scopes: ${scopes.join(', ')}`);
                    }
                }
            }
        }
    } 
    // Log warning if security is required but not available
    else if (definition.securityRequirements?.length > 0) {
        // First generate a more readable representation of the security requirements
        const securityRequirementsString = definition.securityRequirements
            .map(req => {
                const parts = Object.entries(req)
                    .map(([name, scopesArray]) => {
                        const scopes = scopesArray as string[];
                        if (scopes.length === 0) return name;
                        return `${name} (scopes: ${scopes.join(', ')})`;
                    })
                    .join(' AND ');
                return `[${parts}]`;
            })
            .join(' OR ');
            
        console.warn(`Tool '${toolName}' requires security: ${securityRequirementsString}, but no suitable credentials found.`);
    }
    

    // Prepare the axios request configuration
    const config: AxiosRequestConfig = {
      method: definition.method.toUpperCase(), 
      url: requestUrl, 
      params: queryParams, 
      headers: headers,
      ...(requestBodyData !== undefined && { data: requestBodyData }),
    };

    // Log request info to stderr (doesn't affect MCP output)
    console.error(`Executing tool "${toolName}": ${config.method} ${config.url}`);
    
    // Execute the request
    const response = await axios(config);

    // Process and format the response
    let responseText = '';
    const contentType = response.headers['content-type']?.toString().toLowerCase() || '';
    
    // Handle JSON responses
    if (contentType.includes('application/json') && typeof response.data === 'object' && response.data !== null) {
         try { 
             responseText = JSON.stringify(response.data, null, 2); 
         } catch (e) { 
             responseText = "[Stringify Error]"; 
         }
    } 
    // Handle string responses
    else if (typeof response.data === 'string') { 
         responseText = response.data; 
    }
    // Handle other response types
    else if (response.data !== undefined && response.data !== null) { 
         responseText = String(response.data); 
    }
    // Handle empty responses
    else { 
         responseText = `(Status: ${response.status} - No body content)`; 
    }
    
    // Return formatted response
    return { 
        content: [ 
            { 
                type: "text", 
                text: `API Response (Status: ${response.status}):\n${responseText}` 
            } 
        ], 
    };

  } catch (error: unknown) {
    // Handle errors during execution
    let errorMessage: string;
    
    // Format Axios errors specially
    if (axios.isAxiosError(error)) { 
        errorMessage = formatApiError(error); 
    }
    // Handle standard errors
    else if (error instanceof Error) { 
        errorMessage = error.message; 
    }
    // Handle unexpected error types
    else { 
        errorMessage = 'Unexpected error: ' + String(error); 
    }
    
    // Log error to stderr
    console.error(`Error during execution of tool '${toolName}':`, errorMessage);
    
    // Return error message to client
    return { content: [{ type: "text", text: errorMessage }] };
  }
}


/**
 * Main function to start the server
 */
async function main() {
// Set up Web Server transport
  try {
    await setupWebServer(server, 3000);
  } catch (error) {
    console.error("Error setting up web server:", error);
    process.exit(1);
  }
}

/**
 * Cleanup function for graceful shutdown
 */
async function cleanup() {
    console.error("Shutting down MCP server...");
    process.exit(0);
}

// Register signal handlers
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// Start the server
main().catch((error) => {
  console.error("Fatal error in main execution:", error);
  process.exit(1);
});

/**
 * Formats API errors for better readability
 * 
 * @param error Axios error
 * @returns Formatted error message
 */
function formatApiError(error: AxiosError): string {
    let message = 'API request failed.';
    if (error.response) {
        message = `API Error: Status ${error.response.status} (${error.response.statusText || 'Status text not available'}). `;
        const responseData = error.response.data;
        const MAX_LEN = 200;
        if (typeof responseData === 'string') { 
            message += `Response: ${responseData.substring(0, MAX_LEN)}${responseData.length > MAX_LEN ? '...' : ''}`; 
        }
        else if (responseData) { 
            try { 
                const jsonString = JSON.stringify(responseData); 
                message += `Response: ${jsonString.substring(0, MAX_LEN)}${jsonString.length > MAX_LEN ? '...' : ''}`; 
            } catch { 
                message += 'Response: [Could not serialize data]'; 
            } 
        }
        else { 
            message += 'No response body received.'; 
        }
    } else if (error.request) {
        message = 'API Network Error: No response received from server.';
        if (error.code) message += ` (Code: ${error.code})`;
    } else { 
        message += `API Request Setup Error: ${error.message}`; 
    }
    return message;
}

/**
 * Converts a JSON Schema to a Zod schema for runtime validation
 * 
 * @param jsonSchema JSON Schema
 * @param toolName Tool name for error reporting
 * @returns Zod schema
 */
function getZodSchemaFromJsonSchema(jsonSchema: any, toolName: string): z.ZodTypeAny {
    if (typeof jsonSchema !== 'object' || jsonSchema === null) { 
        return z.object({}).passthrough(); 
    }
    try {
        const zodSchemaString = jsonSchemaToZod(jsonSchema);
        const zodSchema = eval(zodSchemaString);
        if (typeof zodSchema?.parse !== 'function') { 
            throw new Error('Eval did not produce a valid Zod schema.'); 
        }
        return zodSchema as z.ZodTypeAny;
    } catch (err: any) {
        console.error(`Failed to generate/evaluate Zod schema for '${toolName}':`, err);
        return z.object({}).passthrough();
    }
}
