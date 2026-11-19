// US-07: GET /admin/applications?status=… and POST /admin/applications/:userId/approve or /reject (FR-ACC-07).
import type { RequestHandler } from 'express';
import { authOf } from '../middleware/auth.js';
import {
  decideApplication,
  getApplications,
  type Decision,
} from '../../services/admin-approval/approvalService.js';

export const listApplicationsHandler: RequestHandler = async (req, res) => {
  res.json(await getApplications(req.query.status));
};

export function decideHandler(decision: Decision): RequestHandler {
  return async (req, res) => {
    // D-105: a rejection carries {reason, note}.
    res.json(await decideApplication(authOf(res).user.id, String(req.params.userId), decision, req.body));
  };
}
