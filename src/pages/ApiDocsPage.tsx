import { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { 
  Book, 
  ChevronDown, 
  ChevronRight, 
  Shield, 
  Zap, 
  Webhook, 
  DollarSign,
  Send,
  Copy,
  Check
} from 'lucide-react';
import { toast } from 'sonner';

interface EndpointParam {
  name: string;
  type: string;
  required: boolean;
  description: string;
}

interface EndpointResponse {
  status: number;
  description: string;
  example: Record<string, unknown>;
}

interface Endpoint {
  name: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  description: string;
  auth: 'required' | 'optional' | 'none';
  parameters: EndpointParam[];
  requestBody?: {
    contentType: string;
    example: Record<string, unknown>;
  };
  responses: EndpointResponse[];
}

interface EndpointGroup {
  name: string;
  icon: React.ReactNode;
  description: string;
  baseUrl: string;
  endpoints: Endpoint[];
}

const endpointGroups: EndpointGroup[] = [
  {
    name: 'Budgets',
    icon: <DollarSign className="w-5 h-5" />,
    description: 'Check and manage budget constraints for operations',
    baseUrl: '/functions/v1/budgets-check',
    endpoints: [
      {
        name: 'Check Budget',
        method: 'POST',
        path: '/budgets-check',
        description: 'Check if an operation would exceed the configured budget limits for an organization.',
        auth: 'required',
        parameters: [],
        requestBody: {
          contentType: 'application/json',
          example: {
            org_id: 'uuid',
            budget_type: 'publish_operations',
            amount: 1,
          },
        },
        responses: [
          {
            status: 200,
            description: 'Budget check result',
            example: {
              allowed: true,
              message: 'Budget check passed',
              budget: {
                type: 'publish_operations',
                limit: 1000,
                consumed: 50,
                remaining: 950,
                percentage: 5,
                is_frozen: false,
                reset_at: '2025-02-01T00:00:00Z',
              },
            },
          },
          {
            status: 401,
            description: 'Unauthorized - Missing or invalid token',
            example: { error: 'Unauthorized' },
          },
          {
            status: 400,
            description: 'Bad request - Missing required fields',
            example: { error: 'Missing required fields: org_id, budget_type' },
          },
        ],
      },
    ],
  },
  {
    name: 'Publishing',
    icon: <Send className="w-5 h-5" />,
    description: 'Request product publishing to connected stores',
    baseUrl: '/functions/v1/publish-request',
    endpoints: [
      {
        name: 'Request Publish',
        method: 'POST',
        path: '/publish-request',
        description: 'Request publishing products to specified stores. May require approval for bulk operations or certain platforms.',
        auth: 'required',
        parameters: [],
        requestBody: {
          contentType: 'application/json',
          example: {
            org_id: 'uuid',
            product_ids: ['uuid1', 'uuid2'],
            store_ids: ['uuid1', 'uuid2'],
            action: 'publish',
          },
        },
        responses: [
          {
            status: 200,
            description: 'Jobs enqueued for processing',
            example: {
              status: 'processing',
              jobs_created: 4,
              message: '4 publishing jobs enqueued',
              platform_checks: {
                shopify: { requires_approval: false },
                etsy: { requires_approval: true, reason: 'Manual verification required' },
              },
            },
          },
          {
            status: 202,
            description: 'Approval required before processing',
            example: {
              status: 'pending_approval',
              approval_id: 'uuid',
              message: 'Publishing request requires approval',
              platform_checks: {},
            },
          },
          {
            status: 403,
            description: 'Access denied - Insufficient permissions',
            example: { error: 'Access denied' },
          },
          {
            status: 429,
            description: 'Budget limit reached',
            example: {
              error: 'Budget limit reached',
              details: 'Publishing operations budget is exhausted.',
            },
          },
        ],
      },
    ],
  },
  {
    name: 'Webhooks',
    icon: <Webhook className="w-5 h-5" />,
    description: 'Receive and process webhooks from external platforms',
    baseUrl: '/functions/v1/webhooks-ingest',
    endpoints: [
      {
        name: 'Ingest Webhook',
        method: 'POST',
        path: '/webhooks-ingest',
        description: 'Receives webhooks from external platforms (Shopify, Etsy, Printify, Gumroad). Verifies signatures, stores events, and enqueues processing jobs.',
        auth: 'none',
        parameters: [
          {
            name: 'platform',
            type: 'string',
            required: true,
            description: 'Platform identifier (shopify, etsy, printify, gumroad)',
          },
          {
            name: 'org_id',
            type: 'string',
            required: true,
            description: 'Organization UUID for routing the webhook',
          },
        ],
        requestBody: {
          contentType: 'application/json',
          example: {
            id: 'event_123',
            type: 'order/created',
            data: {
              order_id: '12345',
              total: 99.99,
            },
          },
        },
        responses: [
          {
            status: 200,
            description: 'Webhook received and queued for processing',
            example: {
              success: true,
              event_id: 'event_123',
              is_verified: true,
              webhook_event_id: 'uuid',
            },
          },
          {
            status: 200,
            description: 'Duplicate event (idempotency)',
            example: {
              message: 'Event already processed',
              event_id: 'event_123',
            },
          },
          {
            status: 400,
            description: 'Missing required parameters',
            example: { error: 'Missing platform or org_id parameter' },
          },
        ],
      },
    ],
  },
];

const methodColors: Record<string, string> = {
  GET: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  POST: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  PUT: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  DELETE: 'bg-red-500/20 text-red-400 border-red-500/30',
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-6 w-6 opacity-50 hover:opacity-100"
      onClick={handleCopy}
      aria-label="Copy to clipboard"
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
    </Button>
  );
}

function CodeBlock({ code, language = 'json' }: { code: string; language?: string }) {
  return (
    <div className="relative group">
      <pre className="bg-muted/50 border border-border rounded-lg p-4 overflow-x-auto text-sm">
        <code className={`language-${language}`}>{code}</code>
      </pre>
      <div className="absolute top-2 right-2">
        <CopyButton text={code} />
      </div>
    </div>
  );
}

function EndpointCard({ endpoint, baseUrl }: { endpoint: Endpoint; baseUrl: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
  const fullUrl = `${supabaseUrl}${baseUrl}`;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <div className="flex items-center justify-between p-4 bg-card border border-border rounded-lg cursor-pointer hover:bg-accent/50 transition-colors">
          <div className="flex items-center gap-3">
            <Badge variant="outline" className={methodColors[endpoint.method]}>
              {endpoint.method}
            </Badge>
            <span className="font-mono text-sm text-foreground">{endpoint.path}</span>
            <span className="text-muted-foreground text-sm hidden md:inline">
              — {endpoint.name}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {endpoint.auth === 'required' && (
              <Badge variant="secondary" className="gap-1">
                <Shield className="w-3 h-3" />
                Auth
              </Badge>
            )}
            {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </div>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2 space-y-4 px-4 pb-4">
        <p className="text-muted-foreground">{endpoint.description}</p>

        <Tabs defaultValue="request" className="w-full">
          <TabsList>
            <TabsTrigger value="request">Request</TabsTrigger>
            <TabsTrigger value="response">Response</TabsTrigger>
            <TabsTrigger value="example">cURL Example</TabsTrigger>
          </TabsList>

          <TabsContent value="request" className="space-y-4 mt-4">
            <div>
              <h4 className="text-sm font-medium mb-2">Endpoint URL</h4>
              <CodeBlock code={fullUrl} language="text" />
            </div>

            {endpoint.parameters.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Query Parameters</h4>
                <div className="border border-border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-2 font-medium">Name</th>
                        <th className="text-left p-2 font-medium">Type</th>
                        <th className="text-left p-2 font-medium">Required</th>
                        <th className="text-left p-2 font-medium">Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {endpoint.parameters.map((param) => (
                        <tr key={param.name} className="border-t border-border">
                          <td className="p-2 font-mono text-primary">{param.name}</td>
                          <td className="p-2 text-muted-foreground">{param.type}</td>
                          <td className="p-2">
                            <Badge variant={param.required ? 'default' : 'secondary'}>
                              {param.required ? 'Yes' : 'No'}
                            </Badge>
                          </td>
                          <td className="p-2 text-muted-foreground">{param.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {endpoint.requestBody && (
              <div>
                <h4 className="text-sm font-medium mb-2">Request Body</h4>
                <CodeBlock code={JSON.stringify(endpoint.requestBody.example, null, 2)} />
              </div>
            )}

            {endpoint.auth === 'required' && (
              <div>
                <h4 className="text-sm font-medium mb-2">Authentication</h4>
                <p className="text-muted-foreground text-sm mb-2">
                  Include the access token in the Authorization header:
                </p>
                <CodeBlock code="Authorization: Bearer YOUR_ACCESS_TOKEN" language="text" />
              </div>
            )}
          </TabsContent>

          <TabsContent value="response" className="space-y-4 mt-4">
            {endpoint.responses.map((response, index) => (
              <div key={index}>
                <div className="flex items-center gap-2 mb-2">
                  <Badge
                    variant="outline"
                    className={
                      response.status >= 400
                        ? 'border-red-500/30 text-red-400'
                        : response.status >= 300
                          ? 'border-amber-500/30 text-amber-400'
                          : 'border-emerald-500/30 text-emerald-400'
                    }
                  >
                    {response.status}
                  </Badge>
                  <span className="text-sm text-muted-foreground">{response.description}</span>
                </div>
                <CodeBlock code={JSON.stringify(response.example, null, 2)} />
              </div>
            ))}
          </TabsContent>

          <TabsContent value="example" className="mt-4">
            <CodeBlock
              code={`curl -X ${endpoint.method} "${fullUrl}${
                endpoint.parameters.length > 0
                  ? '?' + endpoint.parameters.map((p) => `${p.name}=VALUE`).join('&')
                  : ''
              }" \\
  -H "Content-Type: application/json" \\${
    endpoint.auth === 'required' ? '\n  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \\' : ''
  }${
    endpoint.requestBody
      ? `
  -d '${JSON.stringify(endpoint.requestBody.example, null, 2)}'`
      : ''
  }`}
              language="bash"
            />
          </TabsContent>
        </Tabs>
      </CollapsibleContent>
    </Collapsible>
  );
}

export default function ApiDocsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="API Documentation"
        description="Complete reference for FlashFusion backend functions and webhooks"
      />

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Book className="w-5 h-5 text-primary" />
            <CardTitle>Getting Started</CardTitle>
          </div>
          <CardDescription>
            FlashFusion uses backend functions to handle operations like budget checking, 
            publishing requests, and webhook ingestion.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="p-4 bg-muted/50 rounded-lg border border-border">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-primary" />
                <h3 className="font-medium">Authentication</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Most endpoints require a valid JWT token from the authentication system. 
                Include it in the <code className="text-primary">Authorization</code> header.
              </p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg border border-border">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-primary" />
                <h3 className="font-medium">Base URL</h3>
              </div>
              <p className="text-sm text-muted-foreground font-mono break-all">
                {import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co'}/functions/v1
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <ScrollArea className="h-[calc(100vh-400px)]">
        <div className="space-y-6 pr-4">
          {endpointGroups.map((group) => (
            <Card key={group.name}>
              <CardHeader>
                <div className="flex items-center gap-2">
                  {group.icon}
                  <CardTitle className="text-lg">{group.name}</CardTitle>
                </div>
                <CardDescription>{group.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {group.endpoints.map((endpoint, index) => (
                  <EndpointCard key={index} endpoint={endpoint} baseUrl={group.baseUrl} />
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
