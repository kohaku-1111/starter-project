import axios, { AxiosInstance } from 'axios';
import dotenv from 'dotenv';

dotenv.config();

export class N8nClient {
  private client: AxiosInstance;
  private baseURL: string;

  constructor() {
    this.baseURL = process.env.N8N_INSTANCE_URL || '';
    const apiKey = process.env.N8N_API_KEY || '';

    if (!this.baseURL || !apiKey) {
      throw new Error('N8N_INSTANCE_URL and N8N_API_KEY must be set in .env file');
    }

    this.client = axios.create({
      baseURL: `${this.baseURL}/api/v1`,
      headers: {
        'X-N8N-API-KEY': apiKey,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * ワークフローの一覧を取得
   */
  async getWorkflows() {
    const response = await this.client.get('/workflows');
    return response.data;
  }

  /**
   * ワークフローを作成
   */
  async createWorkflow(workflow: any) {
    const response = await this.client.post('/workflows', workflow);
    return response.data;
  }

  /**
   * ワークフローを更新
   */
  async updateWorkflow(id: string, workflow: any) {
    const response = await this.client.patch(`/workflows/${id}`, workflow);
    return response.data;
  }

  /**
   * ワークフローを実行
   */
  async executeWorkflow(id: string) {
    const response = await this.client.post(`/workflows/${id}/execute`);
    return response.data;
  }

  /**
   * ワークフローを取得
   */
  async getWorkflow(id: string) {
    const response = await this.client.get(`/workflows/${id}`);
    return response.data;
  }

  /**
   * ワークフローを削除
   */
  async deleteWorkflow(id: string) {
    const response = await this.client.delete(`/workflows/${id}`);
    return response.data;
  }

  /**
   * 実行履歴を取得
   */
  async getExecutions(workflowId?: string) {
    const params = workflowId ? { workflowId } : {};
    const response = await this.client.get('/executions', { params });
    return response.data;
  }
}
