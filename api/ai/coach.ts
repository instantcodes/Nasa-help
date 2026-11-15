import { ApiRequest, ApiResponse, handleCoach } from '../../server/geminiService';

export default async function handler(req: ApiRequest, res: ApiResponse) {
  return handleCoach(req, res);
}
