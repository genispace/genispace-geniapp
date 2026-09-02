import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button, Alert, AlertDescription } from '@genispace/shared-ui';
import { CheckCircle2, AlertTriangle, Brain, Check, X } from 'lucide-react';
import { ProposalStepConfig, ActionButton, MetadataField, AlertConfig } from '../types';
import { ProposalRendererFactory } from '../renderers/ProposalRendererFactory';
import { getIconComponent } from '@/lib/utils/icon';
import { useMobileFlowLayout } from '@/components/mobileFlowLayoutContext';
import { toast } from '@genispace/shared-ui';
import { useTranslation } from 'react-i18next';

interface ProposalStepProps {
  config: ProposalStepConfig;
  proposal: any | null;
  formData: Record<string, any>;
  onFormDataChange: (data: Record<string, any>) => void;
  onAction: (actionId: string, data: any) => void | Promise<void>;
  isEditing: boolean;
  onEditModeChange: (editing: boolean) => void;
  icon?: string;
  title: string;
  description: string;
  customRenderers?: {
    [rendererId: string]: React.ComponentType<any>;
  };
  actionStatus?: Record<string, 'idle' | 'loading' | 'success' | 'error'>;
}

export const ProposalStep: React.FC<ProposalStepProps> = ({
  config,
  proposal,
  formData,
  onFormDataChange,
  onAction,
  isEditing,
  onEditModeChange,
  icon = 'Brain',
  title,
  description,
  customRenderers,
  actionStatus = {}
}) => {
  const { t } = useTranslation('common');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  // Narrow-flow flag (real mobile / studio phone frame) — md: viewport variants
  // resolve desktop inside the phone frame, so they can't drive this decision.
  const isMobileFlow = useMobileFlowLayout();

  const IconComponent = getIconComponent(icon, 5);

  const handleAction = async (action: ActionButton) => {
    if (action.confirmMessage) {
      if (!confirm(action.confirmMessage)) {
        return;
      }
    }

    try {
      await onAction(action.id, {
        proposal,
        formData,
        action: action.action
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Action failed',
        description: error?.message || 'An error occurred'
      });
    }
  };

  const handleSaveEdit = () => {

    const errors: Record<string, string> = {};
    if (config.rendererConfig.form?.schema) {
      const schema = config.rendererConfig.form.schema;
      if (schema.required) {
        schema.required.forEach(field => {
          if (formData[field] === undefined || formData[field] === null || formData[field] === '') {
            errors[field] = 'This field is required';
          }
        });
      }
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast({
        variant: 'destructive',
        title: 'Validation failed',
        description: 'Please fill in all required fields'
      });
      return;
    }

    onEditModeChange(false);
    toast({
      variant: 'default',
      title: 'Changes saved',
      description: 'Proposal has been updated'
    });
  };

  const renderMetadata = () => {
    if (!config.metadata || !proposal) return null;

    return (
      <div className="space-y-2">
        {config.metadata.map((field: MetadataField) => {
          const value = field.valuePath
            ? field.valuePath.split('.').reduce((obj: any, key: string) => obj?.[key], proposal)
            : proposal[field.key];

          if (value === undefined || value === null || value === '') {
            return null;
          }

          const IconComponent = field.icon ? getIconComponent(field.icon, 4) : null;

          let formattedValue = value;
          if (field.format === 'percentage' && typeof value === 'number') {
            formattedValue = `${value}%`;
          } else if (field.format === 'currency' && typeof value === 'number') {
            formattedValue = new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD'
            }).format(value);
          } else if (field.format === 'date' && value) {
            formattedValue = new Date(value).toLocaleDateString();
          }

          return (
            <div key={field.key} className="flex items-center gap-2 text-sm">
              {IconComponent && (
                <span className="text-green-600 dark:text-green-400 flex-shrink-0">
                  {IconComponent}
                </span>
              )}
              <span className="text-gray-700 dark:text-gray-300">
                {field.label}: <span className="font-medium text-gray-900 dark:text-gray-100">
                  {String(formattedValue)}
                </span>
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  const renderAlerts = () => {
    if (!config.alerts) return null;

    return (
      <div className="space-y-2">
        {config.alerts.map((alert: AlertConfig, index: number) => {
          const alertIcons = {
            warning: AlertTriangle,
            info: Brain,
            success: CheckCircle2,
            error: AlertTriangle
          };

          const alertStyles = {
            warning: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200',
            info: 'bg-primary/10 dark:bg-primary/15 border-primary/25 dark:border-primary/30 text-foreground',
            success: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200',
            error: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
          };

          const renderIcon = () => {
            if (alert.icon) {

              return getIconComponent(alert.icon, 4);
            } else {

              const IconComponent = alertIcons[alert.type];
              return IconComponent ? <IconComponent className="w-4 h-4 flex-shrink-0" /> : null;
            }
          };

          return (
            <Alert key={index} className={`${alertStyles[alert.type]} flex items-start gap-2`}>
              <div className="flex-shrink-0 mt-0.5">
                {renderIcon()}
              </div>
              <AlertDescription className="text-sm flex-1">
                {alert.message}
              </AlertDescription>
            </Alert>
          );
        })}
      </div>
    );
  };

  const renderActions = () => {
    if (!config.actions || config.actions.length === 0) return null;

    return (
      <div className="space-y-2">
        {config.actions.map((action: ActionButton) => {
          const isDisabled = typeof action.disabled === 'function'
            ? action.disabled(proposal)
            : action.disabled || false;

          const isLoading = actionStatus[action.id] === 'loading';
          const ActionIcon = action.icon ? getIconComponent(action.icon, 4) : null;

          let onClick: () => void | Promise<void> = () => handleAction(action);
          if (action.action === 'edit' && !isEditing) {
            onClick = () => {
              onEditModeChange(true);
            };
          } else if (action.action === 'cancel' && isEditing) {
            onClick = () => {
              onEditModeChange(false);
              setFormErrors({});
            };
          }

          const buttonVariant = action.variant === 'primary' ? 'default' : action.variant;

          return (
            <Button
              key={action.id}
              variant={buttonVariant}
              onClick={onClick}
              disabled={isDisabled || isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 mr-2 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  {ActionIcon && <span className="mr-2">{ActionIcon}</span>}
                  {action.label}
                </>
              )}
            </Button>
          );
        })}
      </div>
    );
  };

  return (
    <Card className="flex h-full min-h-0 flex-col overflow-hidden">
      <CardHeader className="flex-shrink-0">
        <CardTitle className="flex items-center gap-2">
          {IconComponent}
          {title}
        </CardTitle>
        <CardDescription>
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto custom-scrollbar space-y-4 min-h-0">
        {isEditing && config.editable ? (

          <>
            <ProposalRendererFactory
              config={
                config.editMode === 'form' && config.rendererConfig.form
                  ? {
                      ...config.rendererConfig,
                      type: 'form' as const
                    }
                  : config.rendererConfig
              }
              data={formData || proposal}
              formData={formData || proposal}
              onFormDataChange={onFormDataChange}
              formErrors={formErrors}
              customRenderers={customRenderers}
            />
            <div className="flex gap-2">
              <Button
                onClick={handleSaveEdit}
                className="flex-1"
              >
                <Check className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  onEditModeChange(false);
                  setFormErrors({});
                }}
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            </div>
          </>
        ) : proposal ? (

          <>
            {config.rendererConfig.type === 'table' && proposal.entries && Array.isArray(proposal.entries) && proposal.entries.length > 0 && (
              <ProposalRendererFactory
                config={config.rendererConfig}
                data={proposal}
                customRenderers={customRenderers}
              />
            )}

            {config.rendererConfig.form && (
              <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border">
                <h4 className="text-sm font-semibold mb-4">Invoice Information</h4>
                <div className="space-y-4">
                  <div className={isMobileFlow ? 'grid grid-cols-1 gap-4' : 'grid grid-cols-1 md:grid-cols-2 gap-4'}>
                    {config.rendererConfig.form.schema?.properties && Object.entries(config.rendererConfig.form.schema.properties).map(([key, fieldSchema]: [string, any]) => {
                      const value = proposal?.[key];

                      if (fieldSchema.type === 'array' || Array.isArray(value)) {
                        return null;
                      }

                      if (value === null || value === undefined || value === '' || 
                          (typeof value === 'string' && value.toUpperCase() === 'UNKNOWN')) {
                        return null;
                      }

                      let displayValue = value;
                      if (fieldSchema.format === 'date' && value) {
                        displayValue = new Date(value).toLocaleDateString();
                      } else if (fieldSchema.type === 'number' && typeof value === 'number') {

                        if (key === 'totalAmount' || key === 'taxAmount' || key === 'amountWithoutTax') {
                          const currency = proposal?.currency || 'EUR';
                          displayValue = new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: currency,
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          }).format(value);
                        } else if (key === 'taxRate') {
                          displayValue = `${value}%`;
                        } else {
                          displayValue = value.toLocaleString();
                        }
                      }

                      return (
                        <div key={key} className="space-y-1">
                          <label className="text-xs text-gray-600 dark:text-gray-400">
                            {fieldSchema.title || key}
                          </label>
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {displayValue}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {proposal?.items && Array.isArray(proposal.items) && proposal.items.length > 0 && (
                    <div className="mt-4">
                      <label className="text-xs text-gray-600 dark:text-gray-400 mb-2 block">
                        {config.rendererConfig.form.schema?.properties?.items?.title || 'Invoice Items'}
                      </label>
                      <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full border-collapse border border-gray-300 dark:border-gray-600 text-sm">
                          <thead>
                            <tr className="bg-gray-100 dark:bg-gray-700">
                              <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300">
                                Description
                              </th>
                              <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-right text-xs font-medium text-gray-700 dark:text-gray-300">
                                Quantity
                              </th>
                              <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-right text-xs font-medium text-gray-700 dark:text-gray-300">
                                Unit Price
                              </th>
                              <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-right text-xs font-medium text-gray-700 dark:text-gray-300">
                                VAT Rate
                              </th>
                              <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-right text-xs font-medium text-gray-700 dark:text-gray-300">
                                VAT Amount
                              </th>
                              <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-right text-xs font-medium text-gray-700 dark:text-gray-300">
                                Amount
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {proposal.items.map((item: any, index: number) => {
                              const currency = proposal?.currency || 'EUR';
                              return (
                                <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                  <td className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-gray-900 dark:text-gray-100">
                                    {item.description || '-'}
                                  </td>
                                  <td className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-right text-gray-900 dark:text-gray-100">
                                    {item.quantity ?? '-'}
                                  </td>
                                  <td className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-right text-gray-900 dark:text-gray-100">
                                    {item.unitPrice !== undefined && item.unitPrice !== null
                                      ? new Intl.NumberFormat('en-US', {
                                          style: 'currency',
                                          currency: currency,
                                          minimumFractionDigits: 2,
                                          maximumFractionDigits: 2
                                        }).format(item.unitPrice)
                                      : '-'}
                                  </td>
                                  <td className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-right text-gray-900 dark:text-gray-100">
                                    {item.vatRate !== undefined && item.vatRate !== null ? `${item.vatRate}%` : '-'}
                                  </td>
                                  <td className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-right text-gray-900 dark:text-gray-100">
                                    {item.vatAmount !== undefined && item.vatAmount !== null
                                      ? new Intl.NumberFormat('en-US', {
                                          style: 'currency',
                                          currency: currency,
                                          minimumFractionDigits: 2,
                                          maximumFractionDigits: 2
                                        }).format(item.vatAmount)
                                      : '-'}
                                  </td>
                                  <td className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-right font-medium text-gray-900 dark:text-gray-100">
                                    {item.amount !== undefined && item.amount !== null
                                      ? new Intl.NumberFormat('en-US', {
                                          style: 'currency',
                                          currency: currency,
                                          minimumFractionDigits: 2,
                                          maximumFractionDigits: 2
                                        }).format(item.amount)
                                      : '-'}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {renderMetadata()}
            {renderAlerts()}
            {renderActions()}
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-center text-gray-500">
            <p className="text-sm">{t('workflow.complete_previous_steps', 'Please complete previous steps')}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
