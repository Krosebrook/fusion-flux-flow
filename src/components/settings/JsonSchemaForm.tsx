import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Loader2, HelpCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface JsonSchemaProperty {
  type: string;
  title?: string;
  description?: string;
  default?: unknown;
  enum?: string[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?: string;
  help?: string;
}

interface JsonSchema {
  type: string;
  properties?: Record<string, JsonSchemaProperty>;
  required?: string[];
  title?: string;
  description?: string;
}

interface JsonSchemaFormProps {
  schema: JsonSchema;
  defaultValues?: Record<string, unknown>;
  onSubmit: (values: Record<string, unknown>) => Promise<void>;
  isLoading?: boolean;
}

function jsonSchemaToZod(schema: JsonSchema): z.ZodType {
  if (schema.type !== 'object' || !schema.properties) {
    return z.record(z.unknown());
  }

  const shape: Record<string, z.ZodType> = {};

  for (const [key, prop] of Object.entries(schema.properties)) {
    let fieldSchema: z.ZodType;

    switch (prop.type) {
      case 'string':
        let stringSchema = z.string();
        if (prop.minLength) stringSchema = stringSchema.min(prop.minLength, `Must be at least ${prop.minLength} characters`);
        if (prop.maxLength) stringSchema = stringSchema.max(prop.maxLength, `Must be at most ${prop.maxLength} characters`);
        if (prop.pattern) stringSchema = stringSchema.regex(new RegExp(prop.pattern), 'Invalid format');
        if (prop.format === 'email') stringSchema = stringSchema.email('Must be a valid email');
        if (prop.format === 'uri' || prop.format === 'url') stringSchema = stringSchema.url('Must be a valid URL');
        fieldSchema = stringSchema;
        break;
      case 'number':
      case 'integer':
        let numberSchema = z.number({ invalid_type_error: 'Must be a number' });
        if (prop.minimum !== undefined) numberSchema = numberSchema.min(prop.minimum, `Must be at least ${prop.minimum}`);
        if (prop.maximum !== undefined) numberSchema = numberSchema.max(prop.maximum, `Must be at most ${prop.maximum}`);
        fieldSchema = numberSchema;
        break;
      case 'boolean':
        fieldSchema = z.boolean();
        break;
      case 'array':
        fieldSchema = z.array(z.unknown());
        break;
      default:
        fieldSchema = z.unknown();
    }

    if (!schema.required?.includes(key)) {
      fieldSchema = fieldSchema.optional();
    }

    shape[key] = fieldSchema;
  }

  return z.object(shape);
}

function getDefaultValues(schema: JsonSchema, existingValues?: Record<string, unknown>): Record<string, unknown> {
  const defaults: Record<string, unknown> = {};
  
  if (schema.properties) {
    for (const [key, prop] of Object.entries(schema.properties)) {
      if (existingValues?.[key] !== undefined) {
        defaults[key] = existingValues[key];
      } else if (prop.default !== undefined) {
        defaults[key] = prop.default;
      } else {
        switch (prop.type) {
          case 'string':
            defaults[key] = '';
            break;
          case 'number':
          case 'integer':
            defaults[key] = 0;
            break;
          case 'boolean':
            defaults[key] = false;
            break;
          case 'array':
            defaults[key] = [];
            break;
          default:
            defaults[key] = null;
        }
      }
    }
  }

  return defaults;
}

export function JsonSchemaForm({ schema, defaultValues, onSubmit, isLoading }: JsonSchemaFormProps) {
  const zodSchema = jsonSchemaToZod(schema);
  const formDefaults = getDefaultValues(schema, defaultValues);

  const form = useForm({
    resolver: zodResolver(zodSchema),
    defaultValues: formDefaults,
    mode: 'onChange',
  });

  const handleSubmit = async (values: Record<string, unknown>) => {
    await onSubmit(values);
  };

  if (!schema.properties || Object.keys(schema.properties).length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No configuration options available
      </div>
    );
  }

  return (
    <TooltipProvider>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {Object.entries(schema.properties).map(([key, prop]) => (
            <FormField
              key={key}
              control={form.control}
              name={key}
              render={({ field, fieldState }) => (
                <FormItem className={cn(
                  "transition-all duration-200",
                  fieldState.error && "animate-shake"
                )}>
                  <div className="flex items-center gap-2">
                    <FormLabel className={cn(
                      fieldState.error && "text-destructive"
                    )}>
                      {prop.title || key}
                      {schema.required?.includes(key) && (
                        <span className="text-destructive ml-1">*</span>
                      )}
                    </FormLabel>
                    {(prop.help || prop.description) && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help hover:text-foreground transition-colors" />
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-xs">
                          <p className="text-sm">{prop.help || prop.description}</p>
                          {prop.minimum !== undefined && (
                            <p className="text-xs text-muted-foreground mt-1">Min: {prop.minimum}</p>
                          )}
                          {prop.maximum !== undefined && (
                            <p className="text-xs text-muted-foreground">Max: {prop.maximum}</p>
                          )}
                          {prop.pattern && (
                            <p className="text-xs text-muted-foreground">Pattern: {prop.pattern}</p>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                  <FormControl>
                    <div className="relative">
                      {renderFieldInput(prop, field, fieldState.error)}
                      {fieldState.error && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                          <AlertCircle className="h-4 w-4 text-destructive" />
                        </div>
                      )}
                    </div>
                  </FormControl>
                  {prop.description && !prop.help && (
                    <FormDescription>{prop.description}</FormDescription>
                  )}
                  <FormMessage className="flex items-center gap-1 text-sm animate-fade-in" />
                </FormItem>
              )}
            />
          ))}
          <Button type="submit" disabled={isLoading || !form.formState.isValid}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Settings
          </Button>
        </form>
      </Form>
    </TooltipProvider>
  );
}

function renderFieldInput(
  prop: JsonSchemaProperty, 
  field: { value: unknown; onChange: (value: unknown) => void; onBlur: () => void; name: string },
  error?: { message?: string }
) {
  const errorClass = error ? 'border-destructive focus-visible:ring-destructive pr-10' : '';
  
  // Enum (select)
  if (prop.enum && prop.enum.length > 0) {
    return (
      <Select value={String(field.value || '')} onValueChange={field.onChange}>
        <SelectTrigger className={cn(errorClass)}>
          <SelectValue placeholder={`Select ${prop.title || field.name}`} />
        </SelectTrigger>
        <SelectContent>
          {prop.enum.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  // Boolean (switch)
  if (prop.type === 'boolean') {
    return (
      <Switch
        checked={Boolean(field.value)}
        onCheckedChange={field.onChange}
      />
    );
  }

  // Number
  if (prop.type === 'number' || prop.type === 'integer') {
    return (
      <Input
        type="number"
        value={field.value as number}
        onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
        min={prop.minimum}
        max={prop.maximum}
        step={prop.type === 'integer' ? 1 : 'any'}
        className={cn(errorClass)}
      />
    );
  }

  // Textarea for longer strings
  if (prop.format === 'textarea' || (prop.maxLength && prop.maxLength > 200)) {
    return (
      <Textarea
        value={String(field.value || '')}
        onChange={(e) => field.onChange(e.target.value)}
        maxLength={prop.maxLength}
        className={cn(errorClass)}
      />
    );
  }

  // Default: text input
  return (
    <Input
      type={prop.format === 'password' ? 'password' : prop.format === 'email' ? 'email' : 'text'}
      value={String(field.value || '')}
      onChange={(e) => field.onChange(e.target.value)}
      maxLength={prop.maxLength}
      placeholder={prop.default ? String(prop.default) : undefined}
      className={cn(errorClass)}
    />
  );
}
