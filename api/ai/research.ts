import { ApiRequest, ApiResponse, handleResearch } from '../../server/geminiService';

export default async function handler(req: ApiRequest, res: ApiResponse) {
  return handleResearch(req, res);
}
