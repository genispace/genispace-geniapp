import apiClient from '../api/apiClient';
import { ApiResponse } from '../types/api';

export interface AgentSession {
  sessionId: string;
  agentId: string;
  userId: string;
  spaceId: string;
  title?: string;
  status: 'ACTIVE' | 'COMPLETED' | 'FAILED';
  createdAt: string;
  updatedAt?: string;
  metadata?: Record<string, any>;
}

export interface CreateSessionRequest {
  title?: string;
  metadata?: Record<string, any>;
  sessionType?: 'chat' | 'test' | 'task' | 'assistant';
}

export interface CreateSessionResponse {
  sessionId: string;
  agentId: string;
  userId: string;
  spaceId: string;
  title?: string;
  status: string;
  createdAt: string;
}

export class AgentService {
  private static instance: AgentService;
  private readonly basePath = '/agents';

  private constructor() {}

  public static getInstance(): AgentService {
    if (!AgentService.instance) {
      AgentService.instance = new AgentService();
    }
    return AgentService.instance;
  }

  async createSession(
    agentId: string, 
    options: CreateSessionRequest = {}
  ): Promise<ApiResponse<CreateSessionResponse>> {
    try {

      if (agentId === 'assistant') {
        const response = await apiClient.post<CreateSessionResponse>(
          `${this.basePath}/sessions`,
          {
            sessionType: 'assistant',
            ...options
          }
        );
        return response;
      }

      const response = await apiClient.post<CreateSessionResponse>(
        `${this.basePath}/sessions`,
        {
          userAgentId: agentId,
          ...options
        }
      );
      return response;
    } catch (error) {
      console.error('创建Agent会话失败:', error);
      throw error;
    }
  }

  async getUserSessions(options: {
    agentId?: string;
    status?: 'ACTIVE' | 'COMPLETED' | 'FAILED';
    page?: number;
    limit?: number;
  } = {}): Promise<ApiResponse<{
    data: AgentSession[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }>> {
    try {
      const queryParams = new URLSearchParams();
      if (options.agentId) queryParams.append('agentId', options.agentId);
      if (options.status) queryParams.append('status', options.status);
      if (options.page) queryParams.append('page', options.page.toString());
      if (options.limit) queryParams.append('limit', options.limit.toString());

      const response = await apiClient.get<{
        data: AgentSession[];
        pagination: {
          page: number;
          limit: number;
          total: number;
          pages: number;
        };
      }>(`${this.basePath}/sessions?${queryParams.toString()}`);

      return response;
    } catch (error) {
      console.error('获取Agent会话列表失败:', error);
      throw error;
    }
  }

  async getSessionById(sessionId: string): Promise<ApiResponse<AgentSession>> {
    try {
      const response = await apiClient.get<AgentSession>(
        `${this.basePath}/sessions/${sessionId}`
      );
      return response;
    } catch (error) {
      console.error('获取会话详情失败:', error);
      throw error;
    }
  }

  async updateSession(
    sessionId: string,
    updateData: {
      title?: string;
      metadata?: Record<string, any>;
      status?: 'ACTIVE' | 'COMPLETED' | 'FAILED';
    }
  ): Promise<ApiResponse<AgentSession>> {
    try {
      const response = await apiClient.patch<AgentSession>(
        `${this.basePath}/sessions/${sessionId}`,
        updateData
      );
      return response;
    } catch (error) {
      console.error('更新Agent会话失败:', error);
      throw error;
    }
  }

  async deleteSession(sessionId: string): Promise<ApiResponse<{ message: string }>> {
    try {
      const response = await apiClient.delete<{ message: string }>(
        `${this.basePath}/sessions/${sessionId}`
      );
      return response;
    } catch (error) {
      console.error('删除会话失败:', error);
      throw error;
    }
  }

  async getSessionMessages(
    sessionId: string,
    options: {
      page?: number;
      limit?: number;
    } = {}
  ): Promise<ApiResponse<{
    data: any[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }>> {
    try {
      const queryParams = new URLSearchParams();
      if (options.page) queryParams.append('page', options.page.toString());
      if (options.limit) queryParams.append('limit', options.limit.toString());

      const response = await apiClient.get<{
        data: any[];
        pagination: {
          page: number;
          limit: number;
          total: number;
          pages: number;
        };
      }>(`${this.basePath}/sessions/${sessionId}/messages?${queryParams.toString()}`);

      return response;
    } catch (error) {
      console.error('获取会话消息失败:', error);
      throw error;
    }
  }

  async getSessionStats(options: {
    agentId?: string;
    dateRange?: string;
  } = {}): Promise<ApiResponse<any>> {
    try {
      const queryParams = new URLSearchParams();
      if (options.agentId) queryParams.append('agentId', options.agentId);
      if (options.dateRange) queryParams.append('dateRange', options.dateRange);

      const response = await apiClient.get<any>(
        `${this.basePath}/sessions/stats?${queryParams.toString()}`
      );
      return response;
    } catch (error) {
      console.error('获取会话统计失败:', error);
      throw error;
    }
  }

  async executeAgent(
    agentId: string,
    requestData: any,
    agentType: 'chat' | 'task' = 'chat',
    stream: boolean = false
  ): Promise<ApiResponse<any>> {
    try {

      const endpoint = agentType === 'task' ? 
        `${this.basePath}/${agentId}/execute` : 
        `${this.basePath}/${agentId}/chat`;

      const payload = {
        ...requestData,
        stream
      };

      const response = await apiClient.post<any>(endpoint, payload);
      return response;
    } catch (error) {
      console.error('智能体执行失败:', error);
      throw error;
    }
  }

  async getAgent(agentId: string): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.get<any>(`${this.basePath}/${agentId}`);
      return response;
    } catch (error) {
      console.error('获取智能体配置失败:', error);
      throw error;
    }
  }
}

export const agentService = AgentService.getInstance();

export default agentService;