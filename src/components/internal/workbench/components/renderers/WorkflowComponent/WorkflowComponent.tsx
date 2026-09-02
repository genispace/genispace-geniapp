import React, { useState, useCallback, useEffect } from 'react';
import { toast } from '@genispace/shared-ui';
import apiClient from '@/lib/api/apiClient';
import { getConfig } from '@/lib/config';
import { WorkflowComponentProps, WorkflowState } from './types';
import { Grid24FillCellProvider, useGrid24FillCell } from '@/components/grid24CellContext';
import { useMobileFlowLayout } from '@/components/mobileFlowLayoutContext';
import { UploadStep } from './steps/UploadStep';
import { ProposalStep } from './steps/ProposalStep';
import { ResultStep } from './steps/ResultStep';
import { useTranslation } from 'react-i18next';

/**
 * Pull the structured record out of a task run's per-node `outputs`. The agent
 * (parse) node's value nests the record under wrapper keys — e.g.
 * `{ result: { status, details: { data: [ {record} ] } } }` — so we dig through
 * the common wrappers (`result`/`details`/`data`/`output`/`record`), taking the
 * first element of any array, and return the first plain record object found.
 * Agent/parse nodes are tried first.
 */
function extractPipelineRecord(outputs: unknown): Record<string, unknown> | null {
  if (!outputs || typeof outputs !== 'object') return null;
  const WRAPPERS = ['result', 'details', 'data', 'output', 'record'];
  const dig = (v: unknown, depth = 0): Record<string, unknown> | null => {
    if (depth > 8 || v == null) return null;
    let cur: any = v;
    if (typeof cur === 'string') {
      try { cur = JSON.parse(cur); } catch { return null; }
    }
    if (Array.isArray(cur)) return cur.length ? dig(cur[0], depth + 1) : null;
    if (typeof cur !== 'object') return null;
    for (const key of WRAPPERS) {
      if (cur[key] != null) return dig(cur[key], depth + 1);
    }
    return Object.keys(cur).length > 0 ? (cur as Record<string, unknown>) : null;
  };
  const entries = Object.entries(outputs as Record<string, unknown>);
  const preferred = entries.filter(([id]) => /pars|agent|extract|candidate/i.test(id));
  for (const [, val] of [...preferred, ...entries]) {
    const rec = dig(val);
    if (rec) return rec;
  }
  return null;
}

export const WorkflowComponent: React.FC<WorkflowComponentProps> = ({
  agentId,
  parseTaskId,
  saveTaskId,
  fileInput,
  saveInput,
  className = '',
  steps,
  transforms,
  onStepComplete,
  onWorkflowComplete,
  onError,
  onAction,
  useMockData = false,
  mockData,
  customRenderers,
  layout
}) => {
  const { t } = useTranslation('common');
  const fillCell = useGrid24FillCell();
  const isMobileFlow = useMobileFlowLayout();

  const mergedTransforms = transforms;

  // Run a task and poll its run to completion; returns the finished execution.
  const runTaskAndPoll = useCallback(async (taskId: string, params: Record<string, Record<string, unknown>>) => {
    const execRes = await apiClient.post<any>(`/tasks/${taskId}/execute`, params);
    const executionId = execRes.data?.id || execRes.data?.executionId || execRes.data?.execution?.id;
    if (!executionId) throw new Error('Failed to start the task run');
    const terminal = new Set(['COMPLETED', 'FAILED', 'CANCELED', 'TIMEOUT']);
    let execution: any = null;
    for (let i = 0; i < 180; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      const statusRes = await apiClient.get<any>(`/tasks/runs/${executionId}`);
      execution = statusRes.data ?? statusRes;
      if (execution && terminal.has(execution.status)) break;
    }
    if (!execution || execution.status !== 'COMPLETED') {
      throw new Error(execution?.error || `Task ${execution?.status || 'run'} did not complete`);
    }
    return execution;
  }, []);

  const [state, setState] = useState<WorkflowState>({
    currentStep: 0,
    stepData: {},
    uploadedFile: null,
    isProcessing: false,
    error: null,
    isEditing: false,
    actionStatus: {}
  });

  const handleFileSelect = useCallback((file: File) => {
    setState(prev => ({
      ...prev,
      uploadedFile: file
    }));
  }, []);

  const handleFileRemove = useCallback(() => {
    setState(prev => ({
      ...prev,
      uploadedFile: null,
      stepData: {},
      isEditing: false
    }));
  }, []);

  const handleUpload = useCallback(async (file: File) => {
    if (!agentId && !parseTaskId && !useMockData) {
      toast({
        variant: 'destructive',
        title: 'Pipeline not configured',
        description: 'Please configure a task or agent, or use mock data'
      });
      return;
    }

    setState(prev => ({ ...prev, isProcessing: true, error: null }));

    try {
      let uploadData: any;

      if (useMockData && mockData?.upload) {

        await new Promise(resolve => setTimeout(resolve, 1500));
        uploadData = mockData.upload;
      } else if (parseTaskId) {
        // Parse phase: upload the file to storage, then run the parse task
        // (document-reader → agent) and poll for the structured record. This
        // does NOT save — the record is saved only after the user confirms.
        toast({ variant: 'default', title: 'Uploading file...', description: 'Please wait while we upload your file' });

        const formData = new FormData();
        formData.append('file', file);
        const uploadRes = await apiClient.post<any>('/storage/files/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        const uploaded = uploadRes.data?.data ?? uploadRes.data ?? {};
        const fileId = uploaded.id || uploaded.fileId;
        const fileUrl = uploaded.publicUrl || uploaded.url ||
          `${getConfig().API_BASE_URL}/storage/files/${fileId}/content`;
        if (!fileUrl) throw new Error('Failed to get file URL after upload');

        // Build node-keyed task inputs from the fileInput mapping.
        const params: Record<string, Record<string, unknown>> = {};
        if (fileInput?.urlNode && fileInput?.urlPort) {
          params[fileInput.urlNode] = { [fileInput.urlPort]: { url: fileUrl, filename: file.name } };
        }
        if (fileInput?.metaNode && fileInput?.metaPort) {
          params[fileInput.metaNode] = { [fileInput.metaPort]: { id: fileId, name: file.name, folderId: null } };
        }

        toast({ variant: 'default', title: 'Parsing...', description: 'The AI is reading the document (this can take a moment)' });

        const execution = await runTaskAndPoll(parseTaskId, params);

        // Extract the parsed record from the workflow node outputs for review.
        uploadData = extractPipelineRecord(execution.outputs);
        if (!uploadData) throw new Error('No structured data returned from the pipeline');
      } else if (agentId) {

        toast({
          variant: 'default',
          title: 'Uploading file...',
          description: 'Please wait while we upload your file'
        });

        const formData = new FormData();
        formData.append('file', file);

        const uploadResponse = await apiClient.post<{
          data?: {
            id: string;
            publicUrl?: string;
            url?: string;
          };
          publicUrl?: string;
          fileId?: string;
        }>('/storage/files/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });

        const fileUrl = uploadResponse.data?.data?.publicUrl || 
                       uploadResponse.data?.publicUrl ||
                       uploadResponse.data?.data?.url ||
                       `${getConfig().API_BASE_URL}/storage/files/${uploadResponse.data?.data?.id || uploadResponse.data?.fileId}/content`;

        if (!fileUrl) {
          throw new Error('Failed to get file URL after upload');
        }

        toast({
          variant: 'default',
          title: 'File uploaded',
          description: 'Calling AI agent for recognition...'
        });

        const executeResponse = await apiClient.post<any>(
          `/agents/${agentId}/execute`,
          {
            inputs: {
              images: fileUrl
            },
            settings: {
              temperature: 0.7,
              maxTokens: 2000
            },
            stream: false
          }
        );

        // 1. { response: { data: {...} } }
        // 2. { response: "json string" }
        // 3. { data: {...} }
        const responseData = executeResponse.data;
        let content: any = null;

        if (responseData?.response?.data) {
          content = responseData.response.data;
        } 

        else if (responseData?.response) {
          content = responseData.response;
        }

        else if (responseData?.data) {
          content = responseData.data;
        }

        else {
          content = responseData;
        }

        if (typeof content === 'string') {
          try {
            content = JSON.parse(content);
          } catch (e) {

            console.warn('Response content is not JSON:', content);
          }
        }

        if (content && typeof content === 'object' && 'data' in content && !Array.isArray(content)) {
          uploadData = content.data;
        } else {
          uploadData = content;
        }

        if (!uploadData) {
          throw new Error('No data returned from agent');
        }
      }

      if (uploadData) {

        let proposal: any = null;

        if (mergedTransforms?.transformStepData) {

          try {
            proposal = mergedTransforms.transformStepData('upload', uploadData, { file });

            if (!proposal) {
              console.warn('transformStepData returned null/undefined, using uploadData');
              proposal = uploadData;
            }
          } catch (error) {
            console.error('Error in transformStepData:', error);

            proposal = uploadData;
          }
        } else if (useMockData && mockData?.proposal) {

          proposal = mockData.proposal;
        } else if (parseTaskId && uploadData && typeof uploadData === 'object' && !Array.isArray(uploadData) && !('entries' in uploadData)) {
          // Parsed record → a Field/Value review table for Step 2, while keeping
          // the raw record available for the save phase.
          const entries = Object.entries(uploadData as Record<string, unknown>)
            .filter(([, v]) => v != null && v !== '')
            .map(([field, value]) => ({
              field,
              value: typeof value === 'object' ? JSON.stringify(value) : String(value),
            }));
          proposal = { entries, record: uploadData };
        } else {

          proposal = uploadData;
        }

        setState(prev => ({
          ...prev,
          stepData: {
            ...prev.stepData,
            upload: uploadData,
            proposal: proposal,

            formData: uploadData
          },
          isProcessing: false
        }));

        onStepComplete?.('upload', uploadData);

        toast({
          variant: 'default',
          title: 'Recognition successful',
          description: 'Successfully extracted structured data'
        });
      }
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(error?.message || 'Unknown error');
      setState(prev => ({
        ...prev,
        isProcessing: false,
        error: err
      }));

      onError?.(err, 'upload');

      toast({
        variant: 'destructive',
        title: 'Recognition failed',
        description: error?.response?.data?.message || error?.message || 'An error occurred'
      });
    }
  }, [agentId, parseTaskId, fileInput, runTaskAndPoll, useMockData, mockData, mergedTransforms, onStepComplete, onError]);

  useEffect(() => {
    if (state.uploadedFile && useMockData && mockData?.upload && !state.stepData.upload && !state.isProcessing) {
      handleUpload(state.uploadedFile);
    }
  }, [state.uploadedFile, useMockData, mockData, state.stepData.upload, state.isProcessing, handleUpload]);

  const handleAction = useCallback(async (actionId: string, actionData: any) => {
    const action = actionData.action;

    setState(prev => ({
      ...prev,
      actionStatus: { ...prev.actionStatus, [actionId]: 'loading' }
    }));

    try {
      if (action === 'approve') {

        const proposal = state.stepData.proposal;
        const uploadData = state.stepData.upload;

        // Save phase: on confirm, run the save task with the reviewed record so
        // it is written to the dataset (vector store) only after human approval.
        if (saveTaskId && saveInput?.recordNode && saveInput?.recordPort) {
          const record = (proposal && typeof proposal === 'object' && 'record' in proposal
            ? (proposal as any).record
            : uploadData) as unknown;
          if (record) {
            toast({ variant: 'default', title: 'Saving...', description: 'Saving to the candidate library' });
            // The dataset-insert node requires `data` to be a non-empty ARRAY of
            // rows (each row is embedded + inserted), so wrap the single record.
            const saveExec = await runTaskAndPoll(saveTaskId, {
              [saveInput.recordNode]: { [saveInput.recordPort]: [record] },
            });
            // The run can report COMPLETED even if the insert node itself failed,
            // so surface a node-level failure rather than claiming success.
            const nodeResult = saveExec?.outputs?.[saveInput.recordNode];
            if (nodeResult && typeof nodeResult === 'object' && nodeResult.success === false) {
              throw new Error(nodeResult.error || 'Saving to the dataset failed');
            }
          }
        }

        let payload = mockData?.result;
        if (!payload && mergedTransforms?.prepareStepOutput) {
          payload = mergedTransforms.prepareStepOutput('proposal', proposal, { 
            uploadData,
            action: 'approve' 
          });
        } else if (!payload) {
          payload = {
            proposal,
            uploadData,
            action: 'approve'
          };
        }

        setState(prev => ({
          ...prev,
          stepData: {
            ...prev.stepData,
            result: payload
          },
          actionStatus: { ...prev.actionStatus, [actionId]: 'success' }
        }));

        onWorkflowComplete?.(payload);

        toast({
          variant: 'default',
          title: saveTaskId ? 'Saved to candidate library' : 'Approved',
          description: saveTaskId
            ? 'The candidate record was saved to the knowledge base (vector dataset)'
            : 'The proposal has been approved'
        });
      } else if (action === 'edit') {

        setState(prev => ({
          ...prev,
          isEditing: true,
          actionStatus: { ...prev.actionStatus, [actionId]: 'idle' }
        }));
      } else if (action === 'reject') {

        setState(prev => ({
          ...prev,
          stepData: {
            ...prev.stepData,
            proposal: null
          },
          isEditing: false,
          actionStatus: { ...prev.actionStatus, [actionId]: 'idle' }
        }));

        toast({
          variant: 'default',
          title: 'Proposal rejected',
          description: 'The proposal has been rejected'
        });
      }

      if (onAction) {
        await onAction(actionId, actionData);
      }
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        actionStatus: { ...prev.actionStatus, [actionId]: 'error' }
      }));

      toast({
        variant: 'destructive',
        title: 'Action failed',
        description: error?.message || 'An error occurred'
      });
    }
  }, [state.stepData, mergedTransforms, mockData, onAction, onWorkflowComplete, saveTaskId, saveInput, runTaskAndPoll]);

  const handleFormDataChange = useCallback((data: Record<string, any>) => {

    setState(prev => {
      let updatedProposal = data;

      if (mergedTransforms?.transformStepData) {
        updatedProposal = mergedTransforms.transformStepData('proposal', data, { 
          currentProposal: prev.stepData.proposal,
          uploadData: prev.stepData.upload
        });
      }

      return {
        ...prev,
        stepData: {
          ...prev.stepData,
          formData: data,

          proposal: updatedProposal
        }
      };
    });
  }, [mergedTransforms]);

  const handleEditModeChange = useCallback((editing: boolean) => {
    setState(prev => {

      if (editing && !prev.stepData.formData && prev.stepData.upload) {
        return {
          ...prev,
          isEditing: editing,
          stepData: {
            ...prev.stepData,
            formData: prev.stepData.upload
          }
        };
      }
      return {
        ...prev,
        isEditing: editing
      };
    });
  }, []);

  const renderStep = (step: typeof steps[0]) => {
    switch (step.component) {
      case 'upload': {
        const uploadStep = steps.find(s => s.component === 'upload');
        if (!uploadStep?.config?.upload) return null;

        const uploadConfig = {
          ...uploadStep.config.upload,
          onUpload: (file: File) => handleUpload(file),
          buttonText: uploadStep.config.upload.buttonText || (
            useMockData
              ? t('workflow.start_recognition', 'Start recognition')
              : t('workflow.upload_and_recognize', 'Upload & recognize')
          )
        };

        return (
          <UploadStep
            key={step.id}
            config={uploadConfig}
            onFileSelect={handleFileSelect}
            onRemove={handleFileRemove}
            uploadedFile={state.uploadedFile}
            isProcessing={state.isProcessing}
            icon={step.icon}
            title={step.title}
            description={step.description}
          />
        );
      }

      case 'proposal': {
        const proposalStep = steps.find(s => s.component === 'proposal');
        if (!proposalStep?.config?.proposal) return null;

        return (
          <ProposalStep
            key={step.id}
            config={proposalStep.config.proposal}
            proposal={state.stepData.proposal}
            formData={state.stepData.formData || state.stepData.upload}
            onFormDataChange={handleFormDataChange}
            onAction={handleAction}
            isEditing={state.isEditing || false}
            onEditModeChange={handleEditModeChange}
            icon={step.icon}
            title={step.title}
            description={step.description}
            customRenderers={customRenderers}
            actionStatus={state.actionStatus}
          />
        );
      }

      case 'result': {
        const resultStep = steps.find(s => s.component === 'result');
        if (!resultStep?.config?.result) return null;

        const resultStatus = state.stepData.result ? 'success' : 'idle';

        return (
          <ResultStep
            key={step.id}
            config={resultStep.config.result}
            data={state.stepData.result}
            status={resultStatus}
            icon={step.icon}
            title={step.title}
            description={step.description}
          />
        );
      }

      case 'custom': {
        const customStep = steps.find(s => s.id === step.id);
        if (!customStep?.config?.custom) return null;

        const CustomComponent = customRenderers?.[customStep.config.custom.componentId];
        if (!CustomComponent) {
          return (
            <div key={step.id} className="text-red-500">
              Custom component "{customStep.config.custom.componentId}" not found
            </div>
          );
        }

        return (
          <CustomComponent
            key={step.id}
            data={state.stepData[step.id]}
            {...customStep.config.custom.props}
          />
        );
      }

      default:
        return null;
    }
  };

  // Narrow flow (real mobile / phone frame): one step per row — configured
  // columns are desktop intent and would squeeze three step cards into 390px.
  // The fill-cell stretch is dropped too: stacked steps take natural height.
  const columns = isMobileFlow ? 1 : layout?.columns || 3;
  const gap = layout?.gap || 'gap-4';

  return (
    <div className={`grid grid-cols-${columns} ${gap} items-stretch${fillCell && !isMobileFlow ? ' h-full min-h-0 overflow-hidden' : ''} ${className}`}>
      {/*
        WorkflowComponent owns the height imposed by the outer Grid24 cell.
        Do not leak that ownership to nested renderers (notably the proposal
        TableRenderer), otherwise they create a second full-height scroller
        and trap wheel input before the step actions can be reached.
      */}
      <Grid24FillCellProvider value={false}>
        {steps.map((step) => renderStep(step))}
      </Grid24FillCellProvider>
    </div>
  );
};

export default WorkflowComponent;
