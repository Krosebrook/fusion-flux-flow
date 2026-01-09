import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Sparkles, Loader2 } from 'lucide-react';
import type { Json } from '@/integrations/supabase/types';

const SAMPLE_DEFINITIONS = [
  {
    key: 'rate_limiting',
    scope: 'org' as const,
    description: 'Configure API rate limiting thresholds and behavior for your organization',
    default_value: {
      requests_per_minute: 60,
      requests_per_hour: 1000,
      burst_limit: 100,
      enable_throttling: true,
      throttle_delay_ms: 1000,
    },
    schema: {
      type: 'object',
      properties: {
        requests_per_minute: {
          type: 'integer',
          title: 'Requests per Minute',
          description: 'Maximum requests allowed per minute',
          minimum: 1,
          maximum: 1000,
          default: 60,
          help: 'Set a reasonable limit based on your API usage patterns. Higher values may increase costs.',
        },
        requests_per_hour: {
          type: 'integer',
          title: 'Requests per Hour',
          description: 'Maximum requests allowed per hour',
          minimum: 10,
          maximum: 50000,
          default: 1000,
          help: 'Hourly limit provides a broader cap to prevent abuse while allowing bursts.',
        },
        burst_limit: {
          type: 'integer',
          title: 'Burst Limit',
          description: 'Maximum concurrent requests',
          minimum: 1,
          maximum: 500,
          default: 100,
          help: 'Controls how many requests can be processed simultaneously.',
        },
        enable_throttling: {
          type: 'boolean',
          title: 'Enable Throttling',
          description: 'Slow down requests instead of rejecting when limits are approached',
          default: true,
          help: 'When enabled, requests will be delayed rather than rejected when approaching limits.',
        },
        throttle_delay_ms: {
          type: 'integer',
          title: 'Throttle Delay (ms)',
          description: 'Delay in milliseconds when throttling is active',
          minimum: 100,
          maximum: 10000,
          default: 1000,
          help: 'The artificial delay added to requests when throttling kicks in.',
        },
      },
      required: ['requests_per_minute', 'requests_per_hour', 'enable_throttling'],
    },
  },
  {
    key: 'notification_preferences',
    scope: 'org' as const,
    description: 'Configure how and when you receive notifications about important events',
    default_value: {
      email_enabled: true,
      email_address: '',
      slack_enabled: false,
      slack_webhook_url: '',
      notify_on_error: true,
      notify_on_success: false,
      notify_on_warning: true,
      digest_frequency: 'daily',
    },
    schema: {
      type: 'object',
      properties: {
        email_enabled: {
          type: 'boolean',
          title: 'Email Notifications',
          description: 'Receive notifications via email',
          default: true,
          help: 'Enable to receive important alerts and updates in your inbox.',
        },
        email_address: {
          type: 'string',
          title: 'Email Address',
          description: 'Primary email for notifications',
          format: 'email',
          help: 'Enter a valid email address where notifications should be sent.',
        },
        slack_enabled: {
          type: 'boolean',
          title: 'Slack Notifications',
          description: 'Send notifications to Slack',
          default: false,
          help: 'Connect to Slack for real-time notifications in your workspace.',
        },
        slack_webhook_url: {
          type: 'string',
          title: 'Slack Webhook URL',
          description: 'Incoming webhook URL for Slack integration',
          format: 'url',
          help: 'Create an incoming webhook in Slack and paste the URL here.',
        },
        notify_on_error: {
          type: 'boolean',
          title: 'Notify on Errors',
          description: 'Receive notifications when errors occur',
          default: true,
          help: 'Critical: Alerts you immediately when something goes wrong.',
        },
        notify_on_success: {
          type: 'boolean',
          title: 'Notify on Success',
          description: 'Receive notifications for successful operations',
          default: false,
          help: 'Optional: Can be noisy but helpful for tracking important completions.',
        },
        notify_on_warning: {
          type: 'boolean',
          title: 'Notify on Warnings',
          description: 'Receive notifications for warning events',
          default: true,
          help: 'Recommended: Catches issues before they become critical.',
        },
        digest_frequency: {
          type: 'string',
          title: 'Digest Frequency',
          description: 'How often to receive summary digests',
          enum: ['realtime', 'hourly', 'daily', 'weekly'],
          default: 'daily',
          help: 'Choose how often you want to receive summary notifications.',
        },
      },
      required: ['email_enabled', 'notify_on_error'],
    },
  },
  {
    key: 'api_configuration',
    scope: 'store' as const,
    description: 'Configure API settings for store integrations including timeouts and retry behavior',
    default_value: {
      api_version: 'v2',
      timeout_seconds: 30,
      max_retries: 3,
      retry_delay_ms: 1000,
      enable_caching: true,
      cache_ttl_seconds: 300,
      debug_mode: false,
    },
    schema: {
      type: 'object',
      properties: {
        api_version: {
          type: 'string',
          title: 'API Version',
          description: 'Platform API version to use',
          enum: ['v1', 'v2', 'v3', 'latest'],
          default: 'v2',
          help: 'Select the API version compatible with your integration. Newer versions may have breaking changes.',
        },
        timeout_seconds: {
          type: 'integer',
          title: 'Request Timeout (seconds)',
          description: 'Maximum time to wait for API responses',
          minimum: 5,
          maximum: 120,
          default: 30,
          help: 'Increase for slow connections or large data transfers. Too high may cause hanging requests.',
        },
        max_retries: {
          type: 'integer',
          title: 'Max Retries',
          description: 'Number of retry attempts on failure',
          minimum: 0,
          maximum: 10,
          default: 3,
          help: 'Number of times to retry failed requests before giving up.',
        },
        retry_delay_ms: {
          type: 'integer',
          title: 'Retry Delay (ms)',
          description: 'Delay between retry attempts',
          minimum: 100,
          maximum: 30000,
          default: 1000,
          help: 'Wait time before each retry. Uses exponential backoff.',
        },
        enable_caching: {
          type: 'boolean',
          title: 'Enable Response Caching',
          description: 'Cache API responses to improve performance',
          default: true,
          help: 'Caching reduces API calls and speeds up repeated requests.',
        },
        cache_ttl_seconds: {
          type: 'integer',
          title: 'Cache TTL (seconds)',
          description: 'How long to cache responses',
          minimum: 60,
          maximum: 86400,
          default: 300,
          help: 'Time-to-live for cached data. Lower values ensure fresher data but more API calls.',
        },
        debug_mode: {
          type: 'boolean',
          title: 'Debug Mode',
          description: 'Enable verbose logging for troubleshooting',
          default: false,
          help: 'Warning: Enables detailed logging which may impact performance and include sensitive data.',
        },
      },
      required: ['api_version', 'timeout_seconds', 'max_retries'],
    },
  },
  {
    key: 'webhook_settings',
    scope: 'plugin_instance' as const,
    description: 'Configure webhook behavior for this plugin instance',
    default_value: {
      signing_secret: '',
      verify_signatures: true,
      replay_protection_window_minutes: 5,
      allowed_ips: '',
      forward_headers: false,
    },
    schema: {
      type: 'object',
      properties: {
        signing_secret: {
          type: 'string',
          title: 'Signing Secret',
          description: 'Secret key for webhook signature verification',
          format: 'password',
          minLength: 16,
          help: 'A secure random string used to verify incoming webhooks. Keep this secret!',
        },
        verify_signatures: {
          type: 'boolean',
          title: 'Verify Signatures',
          description: 'Require valid signatures on incoming webhooks',
          default: true,
          help: 'Strongly recommended: Prevents unauthorized webhook calls.',
        },
        replay_protection_window_minutes: {
          type: 'integer',
          title: 'Replay Protection Window (minutes)',
          description: 'Time window to accept webhooks',
          minimum: 1,
          maximum: 60,
          default: 5,
          help: 'Webhooks older than this window will be rejected to prevent replay attacks.',
        },
        allowed_ips: {
          type: 'string',
          title: 'Allowed IPs',
          description: 'Comma-separated list of allowed source IPs',
          help: 'Leave empty to allow all IPs. Add specific IPs for additional security.',
        },
        forward_headers: {
          type: 'boolean',
          title: 'Forward Headers',
          description: 'Include original request headers in processing',
          default: false,
          help: 'Enable if your integration requires access to original HTTP headers.',
        },
      },
      required: ['verify_signatures'],
    },
  },
];

export function SampleSettingsSeeder() {
  const queryClient = useQueryClient();

  const seedMutation = useMutation({
    mutationFn: async () => {
      for (const def of SAMPLE_DEFINITIONS) {
        // Check if definition already exists
        const { data: existing } = await supabase
          .from('settings_definitions')
          .select('id')
          .eq('key', def.key)
          .single();

        if (!existing) {
          const { error } = await supabase
            .from('settings_definitions')
            .insert({
              key: def.key,
              scope: def.scope,
              description: def.description,
              default_value: def.default_value as Json,
              schema: def.schema as Json,
            });

          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings-definitions'] });
      toast.success('Sample settings created!', {
        description: 'You can now configure rate limiting, notifications, API settings, and webhooks.',
      });
    },
    onError: (error) => {
      toast.error('Failed to create sample settings', { description: error.message });
    },
  });

  return (
    <Card className="border-dashed">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Quick Start
        </CardTitle>
        <CardDescription>
          Add sample settings definitions to explore the dynamic forms feature
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid gap-2 text-sm">
            <p className="text-muted-foreground">This will create the following settings:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li><strong>Rate Limiting</strong> - API throttling configuration (Org scope)</li>
              <li><strong>Notification Preferences</strong> - Email and Slack alerts (Org scope)</li>
              <li><strong>API Configuration</strong> - Timeouts and caching (Store scope)</li>
              <li><strong>Webhook Settings</strong> - Signature verification (Plugin scope)</li>
            </ul>
          </div>
          <Button
            onClick={() => seedMutation.mutate()}
            disabled={seedMutation.isPending}
            className="w-full"
          >
            {seedMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Create Sample Settings
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
