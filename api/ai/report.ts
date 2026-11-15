import { ApiRequest, ApiResponse, handleReport } from '../../server/geminiService';

export default async function handler(req: ApiRequest, res: ApiResponse) {
  return handleReport(req, res);
}
