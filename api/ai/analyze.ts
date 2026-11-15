import { ApiRequest, ApiResponse, handleAnalyze } from '../../server/geminiService';

export default async function handler(req: ApiRequest, res: ApiResponse) {
  return handleAnalyze(req, res);
}
